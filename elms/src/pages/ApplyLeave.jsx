import { useState, useEffect } from 'react';
import { applyLeave, getLeaveBalance } from '../api.js';

export default function ApplyLeave({ onNavigate }) {
    const [form, setForm] = useState({
        type: '',
        start_date: '',
        end_date: '',
        reason: '',
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);
    const [balance, setBalance] = useState(null);

    useEffect(() => {
        getLeaveBalance()
            .then(setBalance)
            .catch((err) => console.error('Balance error:', err));
    }, []);

    const leaveTypes = [
        { value: 'sick', label: '🤒 Sick Leave', desc: 'For illness or medical appointments' },
        { value: 'casual', label: '☕ Casual Leave', desc: 'For personal matters or short breaks' },
        { value: 'earned', label: '🎯 Earned Leave', desc: 'Pre-planned vacation or time off' },
        { value: 'other', label: '📌 Other', desc: 'Any other type of leave' },
    ];

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
        setError('');
        setSuccess('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!form.type || !form.start_date || !form.end_date || !form.reason) {
            setError('Please fill in all fields.');
            return;
        }

        if (new Date(form.start_date) > new Date(form.end_date)) {
            setError('Start date must be before end date.');
            return;
        }

        setLoading(true);
        try {
            await applyLeave(form);
            setSuccess('🎉 Leave request submitted successfully!');
            setForm({ type: '', start_date: '', end_date: '', reason: '' });
            // Refresh balance
            const newBalance = await getLeaveBalance();
            setBalance(newBalance);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const getDuration = () => {
        if (!form.start_date || !form.end_date) return null;
        const start = new Date(form.start_date);
        const end = new Date(form.end_date);
        if (start > end) return null;
        let count = 0;
        const current = new Date(start);
        while (current <= end) {
            const day = current.getDay();
            if (day !== 0 && day !== 6) count++;
            current.setDate(current.getDate() + 1);
        }
        if (count === 0) return null;
        return `${count} working day${count > 1 ? 's' : ''}`;
    };

    return (
        <div className="page apply-page">
            <header className="page-header">
                <div>
                    <h1 className="page-title">Apply for Leave ✨</h1>
                    <p className="page-subtitle">Fill in the details below to submit your leave request</p>
                </div>
                {balance && (
                    <div className={`balance-indicator ${balance.remaining <= 3 ? 'balance-low' : ''}`}>
                        <span className="balance-number">{balance.remaining}</span>
                        <span className="balance-label">of {balance.total_allowed} days remaining ({balance.year})</span>
                    </div>
                )}
            </header>

            <div className="form-card">
                {error && <div className="alert alert-error">{error}</div>}
                {success && (
                    <div className="alert alert-success">
                        {success}
                        <button className="link-btn" onClick={() => onNavigate('history')} style={{ marginLeft: 12 }}>
                            View History →
                        </button>
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Leave Type</label>
                        <div className="type-grid">
                            {leaveTypes.map((lt) => (
                                <button
                                    key={lt.value}
                                    type="button"
                                    id={`leave-type-${lt.value}`}
                                    className={`type-card ${form.type === lt.value ? 'selected' : ''}`}
                                    onClick={() => setForm({ ...form, type: lt.value })}
                                >
                                    <span className="type-label">{lt.label}</span>
                                    <span className="type-desc">{lt.desc}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="start-date">Start Date</label>
                            <input
                                id="start-date"
                                type="date"
                                name="start_date"
                                value={form.start_date}
                                onChange={handleChange}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="end-date">End Date</label>
                            <input
                                id="end-date"
                                type="date"
                                name="end_date"
                                value={form.end_date}
                                onChange={handleChange}
                                required
                            />
                        </div>
                        {getDuration() && (
                            <div className="duration-badge">
                                📅 {getDuration()}
                            </div>
                        )}
                    </div>

                    <div className="form-group">
                        <label htmlFor="reason">Reason</label>
                        <textarea
                            id="reason"
                            name="reason"
                            value={form.reason}
                            onChange={handleChange}
                            placeholder="Briefly explain why you need this leave..."
                            rows={4}
                            required
                        />
                    </div>

                    <div className="form-actions">
                        <button
                            type="button"
                            className="btn btn-ghost"
                            onClick={() => onNavigate('dashboard')}
                        >
                            Cancel
                        </button>
                        <button
                            id="submit-leave"
                            type="submit"
                            className="btn btn-primary"
                            disabled={loading}
                        >
                            {loading ? <span className="btn-spinner"></span> : '🚀 Submit Request'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
