import { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import Sidebar from './components/Sidebar.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Dashboard from './pages/Dashboard.jsx';
import ApplyLeave from './pages/ApplyLeave.jsx';
import LeaveHistory from './pages/LeaveHistory.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import Employees from './pages/Employees.jsx';

function AppContent() {
    const { user, loading } = useAuth();
    const [currentPage, setCurrentPage] = useState('dashboard');

    if (loading) {
        return (
            <div className="loading-screen">
                <div className="loading-spinner"></div>
                <p>Loading ELMS...</p>
            </div>
        );
    }

    if (!user) {
        if (currentPage === 'register') {
            return <Register onSwitch={() => setCurrentPage('login')} />;
        }
        return <Login onSwitch={() => setCurrentPage('register')} />;
    }

    const renderPage = () => {
        switch (currentPage) {
            case 'dashboard':
                return <Dashboard onNavigate={setCurrentPage} />;
            case 'apply':
                return <ApplyLeave onNavigate={setCurrentPage} />;
            case 'history':
                return <LeaveHistory />;
            case 'admin':
                return user.role === 'admin' ? <AdminDashboard /> : <Dashboard onNavigate={setCurrentPage} />;
            case 'employees':
                return user.role === 'admin' ? <Employees /> : <Dashboard onNavigate={setCurrentPage} />;
            default:
                return <Dashboard onNavigate={setCurrentPage} />;
        }
    };

    return (
        <div className="app-layout">
            <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} />
            <main className="main-content">
                {renderPage()}
            </main>
        </div>
    );
}

export default function App() {
    return (
        <AuthProvider>
            <AppContent />
        </AuthProvider>
    );
}
