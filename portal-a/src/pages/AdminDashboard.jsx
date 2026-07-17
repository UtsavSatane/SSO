import { useState, useEffect } from 'react';
import { getLeaves, updateLeaveStatus } from '../api.js';
import LeaveTable from '../components/LeaveTable.jsx';

export default function AdminDashboard() {
    const [leaves, setLeaves] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(null);
    const [remarkModal, setRemarkModal] = useState(null);
    const [remark, setRemark] = useState('');
    const [filter, setFilter] = useState('pending');

    useEffect(() => {
        loadLeaves();
    }, [filter]);

    const loadLeaves = async () => {
        setLoading(true);
        try {
            const params = filter ? { status: filter } : {};
            const data = await getLeaves(params);
            setLeaves(data);
        } catch (err) {
            console.error('Load leaves error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (leaveId, status) => {
        if (status === 'rejected' && !remarkModal) {
            setRemarkModal({ id: leaveId, status });
            return;
        }
        setActionLoading(leaveId);
        try {
            await updateLeaveStatus(leaveId, status, remark);
            setRemarkModal(null);
            setRemark('');
            await loadLeaves();
        } catch (err) {
            console.error('Action error:', err);
        } finally {
            setActionLoading(null);
        }
    };

    const renderActions = (leave) => {
        if (leave.status !== 'pending') return null;
        return (
            <div className="action-btns">
                <button
                    id={`approve-${leave.id}`}
                    className="btn btn-sm btn-approve"
                    disabled={actionLoading === leave.id}
                    onClick={() => handleAction(leave.id, 'approved')}
                >
                    ✅ Approve
                </button>
                <button
                    id={`reject-${leave.id}`}
                    className="btn btn-sm btn-reject"
                    disabled={actionLoading === leave.id}
                    onClick={() => {
                        setRemarkModal({ id: leave.id, status: 'rejected' });
                    }}
                >
                    ❌ Reject
                </button>
            </div>
        );
    };

    return (
        <div className="page admin-page">
            <header className="page-header">
                <div>
                    <h1 className="page-title">Manage Leaves ✅</h1>
                    <p className="page-subtitle">Review and manage employee leave requests</p>
                </div>
            </header>

            <div className="tab-bar">
                {['pending', 'approved', 'rejected', ''].map((f) => (
                    <button
                        key={f}
                        className={`tab ${filter === f ? 'active' : ''}`}
                        onClick={() => setFilter(f)}
                    >
                        {f === '' ? '📊 All' : f === 'pending' ? '⏳ Pending' : f === 'approved' ? '✅ Approved' : '❌ Rejected'}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="page-loading">
                    <div className="loading-spinner"></div>
                </div>
            ) : (
                <LeaveTable
                    leaves={leaves}
                    showUser={true}
                    actions={renderActions}
                />
            )}

            {/* Remark Modal */}
            {remarkModal && (
                <div className="modal-overlay" onClick={() => setRemarkModal(null)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h3>Add Remark</h3>
                        <p className="modal-desc">Optionally add a reason for rejection:</p>
                        <textarea
                            id="admin-remark"
                            value={remark}
                            onChange={(e) => setRemark(e.target.value)}
                            placeholder="Enter remark (optional)..."
                            rows={3}
                        />
                        <div className="modal-actions">
                            <button className="btn btn-ghost" onClick={() => setRemarkModal(null)}>
                                Cancel
                            </button>
                            <button
                                id="confirm-reject"
                                className="btn btn-reject"
                                onClick={() => handleAction(remarkModal.id, remarkModal.status)}
                            >
                                Confirm Reject
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
