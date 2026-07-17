import { Router } from 'express';
import { queryAll, queryOne, runSql } from '../db.js';
import { authenticate, adminOnly } from '../middleware/auth.js';

const router = Router();
const MAX_LEAVES_PER_YEAR = 15;

// Helper: count only weekdays (Mon-Fri) between two dates inclusive
function countWeekdays(startDate, endDate) {
    let count = 0;
    const current = new Date(startDate);
    const end = new Date(endDate);
    while (current <= end) {
        const day = current.getDay(); // 0=Sun, 6=Sat
        if (day !== 0 && day !== 6) {
            count++;
        }
        current.setDate(current.getDate() + 1);
    }
    return count;
}

// Helper: count used weekday leave days for a user in a given year
function getUsedLeaveDays(userId, year) {
    const leaves = queryAll(
        `SELECT start_date, end_date FROM leaves
     WHERE user_id = ? AND status IN ('approved', 'pending')
     AND strftime('%Y', start_date) = ?`,
        [userId, String(year)]
    );
    let total = 0;
    for (const leave of leaves) {
        total += countWeekdays(leave.start_date, leave.end_date);
    }
    return total;
}

// GET /api/leaves — own leaves (employee) or all leaves (admin)
router.get('/', authenticate, (req, res) => {
    try {
        const { status, type } = req.query;
        let conditions = [];
        let params = [];

        if (req.user.role !== 'admin') {
            conditions.push('l.user_id = ?');
            params.push(req.user.id);
        }

        if (status) {
            conditions.push('l.status = ?');
            params.push(status);
        }
        if (type) {
            conditions.push('l.type = ?');
            params.push(type);
        }

        const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

        const query = `
      SELECT l.*, u.name as user_name, u.email as user_email, u.department, u.avatar_color
      FROM leaves l
      JOIN users u ON l.user_id = u.id
      ${whereClause}
      ORDER BY l.created_at DESC
    `;

        const leaves = queryAll(query, params);
        res.json(leaves);
    } catch (err) {
        console.error('Get leaves error:', err);
        res.status(500).json({ error: 'Failed to fetch leaves.' });
    }
});

// GET /api/leaves/balance — get remaining leave balance for current year
router.get('/balance', authenticate, (req, res) => {
    try {
        const year = new Date().getFullYear();
        const userId = req.query.user_id && req.user.role === 'admin'
            ? parseInt(req.query.user_id)
            : req.user.id;
        const used = getUsedLeaveDays(userId, year);
        res.json({
            year,
            total_allowed: MAX_LEAVES_PER_YEAR,
            used,
            remaining: Math.max(0, MAX_LEAVES_PER_YEAR - used),
        });
    } catch (err) {
        console.error('Balance error:', err);
        res.status(500).json({ error: 'Failed to fetch leave balance.' });
    }
});

// GET /api/leaves/stats
router.get('/stats', authenticate, (req, res) => {
    try {
        let whereClause = '';
        let params = [];

        if (req.user.role !== 'admin') {
            whereClause = 'WHERE user_id = ?';
            params = [req.user.id];
        }

        const total = queryOne(`SELECT COUNT(*) as count FROM leaves ${whereClause}`, params);
        const pending = queryOne(`SELECT COUNT(*) as count FROM leaves ${whereClause ? whereClause + ' AND' : 'WHERE'} status = 'pending'`, params);
        const approved = queryOne(`SELECT COUNT(*) as count FROM leaves ${whereClause ? whereClause + ' AND' : 'WHERE'} status = 'approved'`, params);
        const rejected = queryOne(`SELECT COUNT(*) as count FROM leaves ${whereClause ? whereClause + ' AND' : 'WHERE'} status = 'rejected'`, params);

        res.json({
            total: total.count,
            pending: pending.count,
            approved: approved.count,
            rejected: rejected.count,
        });
    } catch (err) {
        console.error('Stats error:', err);
        res.status(500).json({ error: 'Failed to fetch stats.' });
    }
});

// POST /api/leaves — submit a leave request
router.post('/', authenticate, (req, res) => {
    try {
        const { type, start_date, end_date, reason } = req.body;

        if (!type || !start_date || !end_date || !reason) {
            return res.status(400).json({ error: 'All fields are required.' });
        }

        if (new Date(start_date) > new Date(end_date)) {
            return res.status(400).json({ error: 'Start date must be before end date.' });
        }

        // Check leave balance for current year (weekdays only)
        const requestedDays = countWeekdays(start_date, end_date);

        if (requestedDays === 0) {
            return res.status(400).json({ error: 'Selected dates fall entirely on weekends. Please choose weekday dates.' });
        }
        const year = new Date(start_date).getFullYear();
        const used = getUsedLeaveDays(req.user.id, year);
        const remaining = MAX_LEAVES_PER_YEAR - used;

        if (requestedDays > remaining) {
            return res.status(400).json({
                error: `Insufficient leave balance. You have ${remaining} day(s) remaining in ${year}, but requested ${requestedDays} day(s).`
            });
        }

        const result = runSql(
            'INSERT INTO leaves (user_id, type, start_date, end_date, reason) VALUES (?, ?, ?, ?, ?)',
            [req.user.id, type, start_date, end_date, reason]
        );

        const leave = queryOne(`
      SELECT l.*, u.name as user_name, u.email as user_email, u.department, u.avatar_color
      FROM leaves l
      JOIN users u ON l.user_id = u.id
      WHERE l.id = ?
    `, [result.lastInsertRowid]);

        res.status(201).json(leave);
    } catch (err) {
        console.error('Create leave error:', err);
        res.status(500).json({ error: 'Failed to create leave request.' });
    }
});

// PUT /api/leaves/:id — approve/reject (admin only)
router.put('/:id', authenticate, adminOnly, (req, res) => {
    try {
        const { status, admin_remark } = req.body;
        const { id } = req.params;

        if (!status || !['approved', 'rejected'].includes(status)) {
            return res.status(400).json({ error: 'Status must be "approved" or "rejected".' });
        }

        const existing = queryOne('SELECT * FROM leaves WHERE id = ?', [id]);
        if (!existing) {
            return res.status(404).json({ error: 'Leave request not found.' });
        }

        runSql(
            'UPDATE leaves SET status = ?, admin_remark = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [status, admin_remark || '', id]
        );

        const leave = queryOne(`
      SELECT l.*, u.name as user_name, u.email as user_email, u.department, u.avatar_color
      FROM leaves l
      JOIN users u ON l.user_id = u.id
      WHERE l.id = ?
    `, [id]);

        res.json(leave);
    } catch (err) {
        console.error('Update leave error:', err);
        res.status(500).json({ error: 'Failed to update leave request.' });
    }
});

export default router;
