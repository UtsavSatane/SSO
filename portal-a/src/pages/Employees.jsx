import { useState, useEffect } from 'react';
import { getEmployees } from '../api.js';

export default function Employees() {
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        loadEmployees();
    }, []);

    const loadEmployees = async () => {
        try {
            const data = await getEmployees();
            setEmployees(data);
        } catch (err) {
            console.error('Load employees error:', err);
        } finally {
            setLoading(false);
        }
    };

    const filtered = employees.filter(
        (emp) =>
            emp.name.toLowerCase().includes(search.toLowerCase()) ||
            emp.email.toLowerCase().includes(search.toLowerCase()) ||
            emp.department?.toLowerCase().includes(search.toLowerCase())
    );

    const getInitials = (name) =>
        name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);

    if (loading) {
        return (
            <div className="page-loading">
                <div className="loading-spinner"></div>
            </div>
        );
    }

    return (
        <div className="page employees-page">
            <header className="page-header">
                <div>
                    <h1 className="page-title">Employees 👥</h1>
                    <p className="page-subtitle">{employees.length} team members</p>
                </div>
            </header>

            <div className="search-bar">
                <input
                    id="search-employees"
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="🔍 Search by name, email, or department..."
                />
            </div>

            <div className="employee-grid">
                {filtered.map((emp, i) => (
                    <div
                        key={emp.id}
                        className="employee-card"
                        style={{ animationDelay: `${i * 60}ms` }}
                    >
                        <div className="emp-header">
                            <div
                                className="emp-avatar"
                                style={{ background: emp.avatar_color || '#6366f1' }}
                            >
                                {getInitials(emp.name)}
                            </div>
                            <span className={`emp-role-badge ${emp.role === 'admin' ? 'role-admin' : 'role-employee'}`}>
                                {emp.role === 'admin' ? '👑 Admin' : '👤 Employee'}
                            </span>
                        </div>
                        <h3 className="emp-name">{emp.name}</h3>
                        <p className="emp-email">{emp.email}</p>
                        <p className="emp-dept">🏢 {emp.department || 'General'}</p>
                        <div className="emp-stats">
                            <div className="emp-stat">
                                <span className="emp-stat-value">{emp.total_leaves || 0}</span>
                                <span className="emp-stat-label">Total</span>
                            </div>
                            <div className="emp-stat">
                                <span className="emp-stat-value">{emp.pending_leaves || 0}</span>
                                <span className="emp-stat-label">Pending</span>
                            </div>
                            <div className="emp-stat">
                                <span className="emp-stat-value">{emp.approved_leaves || 0}</span>
                                <span className="emp-stat-label">Approved</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {filtered.length === 0 && (
                <div className="empty-state">
                    <span className="empty-icon">🔍</span>
                    <p>No employees found matching "{search}"</p>
                </div>
            )}
        </div>
    );
}
