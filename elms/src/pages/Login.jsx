import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { login as apiLogin } from '../api.js';

export default function Login({ onSwitch }) {
    const { loginUser } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const data = await apiLogin(email, password);
            loginUser(data.token, data.user);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-bg">
                <div className="bg-orb bg-orb-1"></div>
                <div className="bg-orb bg-orb-2"></div>
                <div className="bg-orb bg-orb-3"></div>
            </div>

            <div className="auth-card">
                <div className="auth-header">
                    <span className="auth-logo">🍃</span>
                    <h1>Welcome Back</h1>
                    <p>Sign in to your ELMS account</p>
                </div>

                {error && <div className="alert alert-error">{error}</div>}

                <form onSubmit={handleSubmit} className="auth-form">
                    <div className="form-group">
                        <label htmlFor="login-email">Email Address</label>
                        <input
                            id="login-email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@company.com"
                            required
                            autoFocus
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="login-password">Password</label>
                        <input
                            id="login-password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    <button id="login-submit" type="submit" className="btn btn-primary btn-full" disabled={loading}>
                        {loading ? <span className="btn-spinner"></span> : 'Sign In'}
                    </button>
                </form>

                <div style={{ margin: '1.25rem 0', display: 'flex', alignItems: 'center', textAlign: 'center', color: '#9ca3af' }}>
                    <div style={{ flex: 1, borderBottom: '1px solid #e5e7eb' }}></div>
                    <span style={{ padding: '0 0.75rem', fontSize: '0.875rem' }}>or</span>
                    <div style={{ flex: 1, borderBottom: '1px solid #e5e7eb' }}></div>
                </div>

                <button
                    id="sso-login-btn"
                    type="button"
                    onClick={() => window.location.href = 'https://localhost:6030/login'}
                    className="btn btn-primary btn-full"
                    style={{
                        background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
                        color: 'white',
                        boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.2), 0 2px 4px -1px rgba(79, 70, 229, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        fontWeight: '500',
                        marginBottom: '1rem'
                    }}
                >
                    🔑 Sign In with SSO
                </button>

                <p className="auth-footer">
                    Don't have an account?{' '}
                    <button className="link-btn" onClick={onSwitch}>
                        Create one
                    </button>
                </p>
            </div>
        </div>
    );
}
