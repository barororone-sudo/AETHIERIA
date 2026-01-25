import { useState } from 'react';
import AuthLayout from './AuthLayout';

const Register = ({ onNavigate, onRegisterSuccess }) => {
    const [email, setEmail] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        // Simulate API call
        if (email) onRegisterSuccess(email);
    };

    return (
        <AuthLayout
            title="Claim Your Identity"
            subtitle="Join the exclusive grid. Only 100 spots available."
        >
            <form onSubmit={handleSubmit} style={{ textAlign: 'left' }}>
                <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '5px', color: '#374151' }}>Full Name</label>
                    <input required type="text" placeholder="e.g. Elon Musk" style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '1rem' }} />
                </div>

                <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '5px', color: '#374151' }}>Email Address</label>
                    <input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '1rem' }} />
                </div>

                <div style={{ marginBottom: '2rem' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '5px', color: '#374151' }}>Password</label>
                    <input required type="password" placeholder="••••••••" style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '1rem' }} />
                </div>

                <button className="btn-claim" type="submit" style={{ marginBottom: '1.5rem', boxShadow: 'none' }}>
                    Create Account
                </button>

                <div style={{ textAlign: 'center', fontSize: '0.9rem', color: '#6b7280' }}>
                    Already have a spot? <span onClick={() => onNavigate('login')} style={{ color: '#2563eb', fontWeight: 600, cursor: 'pointer' }}>Login</span>
                </div>
            </form>
        </AuthLayout>
    );
};

export default Register;
