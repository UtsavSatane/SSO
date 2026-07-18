import { useAuth } from '../context/AuthContext.jsx';

const NAV_ITEMS = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊', roles: ['employee', 'admin'] },
    { id: 'apply', label: 'Apply Leave', icon: '📝', roles: ['employee'] },
    { id: 'history', label: 'Leave History', icon: '📋', roles: ['employee', 'admin'] },
    { id: 'admin', label: 'Manage Leaves', icon: '✅', roles: ['admin'] },
    { id: 'employees', label: 'Employees', icon: '👥', roles: ['admin'] },
];

export default function Sidebar({ currentPage, onNavigate }) {
    const { user, logoutUser } = useAuth();

    const filteredNav = NAV_ITEMS.filter((item) => item.roles.includes(user.role));

    const getInitials = (name) => {
        return name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    return (
        <aside className="sidebar">
            <div className="sidebar-header">
                <div className="sidebar-logo">
                    <span className="logo-icon">🍃</span>
                    <span className="logo-text">ELMS</span>
                </div>
                <p className="sidebar-subtitle">Leave Management</p>
            </div>

            <nav className="sidebar-nav">
                {filteredNav.map((item) => (
                    <button
                        key={item.id}
                        id={`nav-${item.id}`}
                        className={`nav-item ${currentPage === item.id ? 'active' : ''}`}
                        onClick={() => onNavigate(item.id)}
                    >
                        <span className="nav-icon">{item.icon}</span>
                        <span className="nav-label">{item.label}</span>
                        {currentPage === item.id && <span className="nav-indicator"></span>}
                    </button>
                ))}
            </nav>

            <div className="sidebar-footer">
                <div className="user-card">
                    <div className="user-avatar" style={{ background: user.avatar_color || '#6366f1' }}>
                        {getInitials(user.name)}
                    </div>
                    <div className="user-info">
                        <p className="user-name">{user.name}</p>
                        <p className="user-role">{user.role === 'admin' ? '👑 Admin' : '👤 Employee'}</p>
                    </div>
                </div>
                <button id="logout-btn" className="logout-btn" onClick={() => { logoutUser(); window.location.href = 'https://localhost:6030/logout'; }}>
                    🚪 Logout
                </button>
            </div>
        </aside>
    );
}
