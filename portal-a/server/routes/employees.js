import { Router } from 'express';
import { queryAll, queryOne } from '../db.js';
import { authenticate, adminOnly } from '../middleware/auth.js';

const router = Router();

// GET /api/employees — list all employees (admin only)
router.get('/', authenticate, adminOnly, (req, res) => {
    try {
        const employees = queryAll(`
      SELECT u.id, u.name, u.email, u.role, u.department, u.avatar_color, u.created_at,
             COUNT(l.id) as total_leaves,
             SUM(CASE WHEN l.status = 'pending' THEN 1 ELSE 0 END) as pending_leaves,
             SUM(CASE WHEN l.status = 'approved' THEN 1 ELSE 0 END) as approved_leaves
      FROM users u
      LEFT JOIN leaves l ON u.id = l.user_id
      GROUP BY u.id
      ORDER BY u.created_at DESC
    `);

        res.json(employees);
    } catch (err) {
        console.error('Get employees error:', err);
        res.status(500).json({ error: 'Failed to fetch employees.' });
    }
});

// GET /api/employees/:id — single employee with leave history (admin only)
router.get('/:id', authenticate, adminOnly, (req, res) => {
    try {
        const employee = queryOne(
            'SELECT id, name, email, role, department, avatar_color, created_at FROM users WHERE id = ?',
            [req.params.id]
        );

        if (!employee) {
            return res.status(404).json({ error: 'Employee not found.' });
        }

        const leaves = queryAll(
            'SELECT * FROM leaves WHERE user_id = ? ORDER BY created_at DESC',
            [req.params.id]
        );

        res.json({ ...employee, leaves });
    } catch (err) {
        console.error('Get employee error:', err);
        res.status(500).json({ error: 'Failed to fetch employee.' });
    }
});

export default router;
