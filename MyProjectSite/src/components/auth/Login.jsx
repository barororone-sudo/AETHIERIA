import { useState } from 'react';
import AuthLayout from './AuthLayout';

const Login = ({ onNavigate, onLogin }) => {
    const handleSubmit = (e) => {
        e.preventDefault();
        onLogin();
    };

    return (
        <AuthLayout
            title="Welcome Back"
            subtitle="Manage your spot and earnings."
        >
            <form onSubmit={handleSubmit} style={{ textAlign: 'left' }}>
                <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '5px', color: '#374151' }}>Email Address</label>
                    <input required type="email" placeholder="you@example.com" style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '1rem' }} />
                </div>

                <div style={{ marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                        <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151' }}>Password</label>
                        <span style={{ fontSize: '0.8rem', color: '#2563eb', cursor: 'pointer' }}>Forgot?</span>
                    </div>
                    <input required type="password" placeholder="••••••••" style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '1rem' }} />
                </div>

                <button className="btn-claim" type="submit" style={{ marginBottom: '1.5rem', boxShadow: 'none' }}>
                    Login
                </button>

                <div style={{ textAlign: 'center', fontSize: '0.9rem', color: '#6b7280' }}>
                    No spot yet? <span onClick={() => onNavigate('register')} style={{ color: '#2563eb', fontWeight: 600, cursor: 'pointer' }}>Claim Spot</span>
                </div>
            </form>
        </AuthLayout>
    );
};

export default Login;
