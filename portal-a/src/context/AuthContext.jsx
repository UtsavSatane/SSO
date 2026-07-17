import { createContext, useContext, useState, useEffect } from 'react';
import { getMe } from '../api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('elms_token');
        if (token) {
            getMe()
                .then((userData) => setUser(userData))
                .catch(() => {
                    localStorage.removeItem('elms_token');
                    setUser(null);
                })
                .finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, []);

    const loginUser = (token, userData) => {
        localStorage.setItem('elms_token', token);
        setUser(userData);
    };

    const logoutUser = () => {
        localStorage.removeItem('elms_token');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, loading, loginUser, logoutUser }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}