import StatusBadge from './StatusBadge.jsx';

export default function LeaveTable({ leaves, showUser = false, actions = null }) {
    const formatDate = (dateStr) => {
        return new Date(dateStr).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    };

    const getLeaveTypeIcon = (type) => {
        const icons = { sick: '🤒', casual: '☕', earned: '🎯', other: '📌' };
        return icons[type] || '📌';
    };

    const getDuration = (start, end) => {
        const startDate = new Date(start);
        const endDate = new Date(end);
        let count = 0;
        const current = new Date(startDate);
        while (current <= endDate) {
            const day = current.getDay();
            if (day !== 0 && day !== 6) count++;
            current.setDate(current.getDate() + 1);
        }
        return `${count} day${count !== 1 ? 's' : ''}`;
    };

    if (!leaves || leaves.length === 0) {
        return (
            <div className="empty-state">
                <span className="empty-icon">📭</span>
                <p>No leave requests found</p>
            </div>
        );
    }

    return (
        <div className="table-wrapper">
            <table className="leave-table">
                <thead>
                    <tr>
                        {showUser && <th>Employee</th>}
                        <th>Type</th>
                        <th>Duration</th>
                        <th>Dates</th>
                        <th>Reason</th>
                        <th>Status</th>
                        {actions && <th>Actions</th>}
                    </tr>
                </thead>
                <tbody>
                    {leaves.map((leave, i) => (
                        <tr key={leave.id} style={{ animationDelay: `${i * 50}ms` }}>
                            {showUser && (
                                <td>
                                    <div className="user-cell">
                                        <div
                                            className="user-avatar-sm"
                                            style={{ background: leave.avatar_color || '#6366f1' }}
                                        >
                                            {leave.user_name?.[0]?.toUpperCase() || '?'}
                                        </div>
                                        <div>
                                            <p className="cell-name">{leave.user_name}</p>
                                            <p className="cell-dept">{leave.department}</p>
                                        </div>
                                    </div>
                                </td>
                            )}
                            <td>
                                <span className="leave-type">
                                    {getLeaveTypeIcon(leave.type)} {leave.type}
                                </span>
                            </td>
                            <td>{getDuration(leave.start_date, leave.end_date)}</td>
                            <td>
                                <span className="date-range">
                                    {formatDate(leave.start_date)} — {formatDate(leave.end_date)}
                                </span>
                            </td>
                            <td>
                                <p className="reason-text">{leave.reason}</p>
                            </td>
                            <td>
                                <StatusBadge status={leave.status} />
                            </td>
                            {actions && <td>{actions(leave)}</td>}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
