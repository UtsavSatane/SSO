export default function StatsCard({ icon, label, value, color, delay = 0 }) {
    return (
        <div
            className="stats-card"
            style={{ '--card-accent': color, animationDelay: `${delay}ms` }}
        >
            <div className="stats-icon" style={{ background: `${color}20`, color }}>
                {icon}
            </div>
            <div className="stats-info">
                <p className="stats-value">{value}</p>
                <p className="stats-label">{label}</p>
            </div>
            <div className="stats-glow" style={{ background: color }}></div>
        </div>
    );
}
