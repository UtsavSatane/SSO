import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { getLeaveStats, getLeaves, getLeaveBalance } from '../api.js';
import StatsCard from '../components/StatsCard.jsx';
import LeaveTable from '../components/LeaveTable.jsx';

export default function Dashboard({ onNavigate }) {
    const { user } = useAuth();
    const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 });
    const [balance, setBalance] = useState({ total_allowed: 15, used: 0, remaining: 15, year: new Date().getFullYear() });
    const [recentLeaves, setRecentLeaves] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [statsData, leavesData, balanceData] = await Promise.all([
                getLeaveStats(),
                getLeaves(),
                user.role === 'employee' ? getLeaveBalance() : Promise.resolve(null),
            ]);
            setStats(statsData);
            setRecentLeaves(leavesData.slice(0, 5));
            if (balanceData) setBalance(balanceData);
        } catch (err) {
            console.error('Dashboard load error:', err);
        } finally {
            setLoading(false);
        }
    };

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good Morning';
        if (hour < 17) return 'Good Afternoon';
        return 'Good Evening';
    };

    if (loading) {
        return (
            <div className="page-loading">
                <div className="loading-spinner"></div>
            </div>
        );
    }

    return (
        <div className="page dashboard-page">
            <header className="page-header">
                <div>
                    <h1 className="page-title">
                        {getGreeting()}, <span className="text-gradient">{user.name.split(' ')[0]}</span>! 👋
                    </h1>
                    <p className="page-subtitle">
                        {user.role === 'admin'
                            ? 'Here\'s an overview of all leave activity'
                            : 'Here\'s your leave summary at a glance'}
                    </p>
                </div>
                {user.role === 'employee' && (
                    <button className="btn btn-primary" onClick={() => onNavigate('apply')}>
                        ✨ Apply Leave
                    </button>
                )}
            </header>

            <div className="stats-grid">
                {user.role === 'employee' && (
                    <StatsCard icon="🍃" label={`Balance (${balance.year})`} value={`${balance.remaining}/${balance.total_allowed}`} color="#14b8a6" delay={0} />
                )}
                <StatsCard icon="📊" label="Total Leaves" value={stats.total} color="#6366f1" delay={100} />
                <StatsCard icon="⏳" label="Pending" value={stats.pending} color="#f59e0b" delay={200} />
                <StatsCard icon="✅" label="Approved" value={stats.approved} color="#10b981" delay={300} />
                <StatsCard icon="❌" label="Rejected" value={stats.rejected} color="#ef4444" delay={400} />
            </div>

            <section className="section">
                <div className="section-header">
                    <h2 className="section-title">Recent Requests</h2>
                    <button className="link-btn" onClick={() => onNavigate('history')}>
                        View All →
                    </button>
                </div>
                <LeaveTable
                    leaves={recentLeaves}
                    showUser={user.role === 'admin'}
                />
            </section>
        </div>
    );
}
