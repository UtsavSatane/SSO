const API_BASE = '/api';

export async function api(endpoint, options = {}) {
    const token = localStorage.getItem('elms_token');

    const config = {
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...options.headers,
        },
        ...options,
    };

    const response = await fetch(`${API_BASE}${endpoint}`, config);
    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || 'Something went wrong');
    }

    return data;
}

export function login(email, password) {
    return api('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
    });
}

export function register(name, email, password, department) {
    return api('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password, department }),
    });
}

export function getMe() {
    return api('/auth/me');
}

export function getLeaves(params = {}) {
    const query = new URLSearchParams(params).toString();
    return api(`/leaves${query ? `?${query}` : ''}`);
}

export function getLeaveStats() {
    return api('/leaves/stats');
}

export function getLeaveBalance() {
    return api('/leaves/balance');
}

export function applyLeave(data) {
    return api('/leaves', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

export function updateLeaveStatus(id, status, admin_remark) {
    return api(`/leaves/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ status, admin_remark }),
    });
}

export function getEmployees() {
    return api('/employees');
}

export function getEmployee(id) {
    return api(`/employees/${id}`);
}
