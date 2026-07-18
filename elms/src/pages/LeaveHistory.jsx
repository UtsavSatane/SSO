import { useState, useEffect } from 'react';
import { getLeaves } from '../api.js';
import LeaveTable from '../components/LeaveTable.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function LeaveHistory() {
    const { user } = useAuth();
    const [leaves, setLeaves] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('');
    const [filterType, setFilterType] = useState('');

    useEffect(() => {
        loadLeaves();
    }, [filterStatus, filterType]);

    const loadLeaves = async () => {
        setLoading(true);
        try {
            const params = {};
            if (filterStatus) params.status = filterStatus;
            if (filterType) params.type = filterType;
            const data = await getLeaves(params);
            setLeaves(data);
        } catch (err) {
            console.error('Load leaves error:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="page history-page">
            <header className="page-header">
                <div>
                    <h1 className="page-title">Leave History 📋</h1>
                    <p className="page-subtitle">
                        {user.role === 'admin' ? 'All employee leave records' : 'View all your past and current leave requests'}
                    </p>
                </div>
            </header>

            <div className="filters-bar">
                <div className="filter-group">
                    <label htmlFor="filter-status">Status</label>
                    <select
                        id="filter-status"
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                    >
                        <option value="">All Status</option>
                        <option value="pending">⏳ Pending</option>
                        <option value="approved">✅ Approved</option>
                        <option value="rejected">❌ Rejected</option>
                    </select>
                </div>

                <div className="filter-group">
                    <label htmlFor="filter-type">Type</label>
                    <select
                        id="filter-type"
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                    >
                        <option value="">All Types</option>
                        <option value="sick">🤒 Sick</option>
                        <option value="casual">☕ Casual</option>
                        <option value="earned">🎯 Earned</option>
                        <option value="other">📌 Other</option>
                    </select>
                </div>

                <div className="filter-count">
                    {leaves.length} request{leaves.length !== 1 ? 's' : ''} found
                </div>
            </div>

            {loading ? (
                <div className="page-loading">
                    <div className="loading-spinner"></div>
                </div>
            ) : (
                <LeaveTable leaves={leaves} showUser={user.role === 'admin'} />
            )}
        </div>
    );
}
