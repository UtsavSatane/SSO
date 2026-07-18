export default function StatusBadge({ status }) {
    const config = {
        pending: { label: 'Pending', className: 'badge-pending' },
        approved: { label: 'Approved', className: 'badge-approved' },
        rejected: { label: 'Rejected', className: 'badge-rejected' },
    };

    const { label, className } = config[status] || config.pending;

    return <span className={`status-badge ${className}`}>{label}</span>;
}
