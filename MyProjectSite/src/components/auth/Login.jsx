import { useState } from 'react';
import AuthLayout from './AuthLayout';
import { supabase } from '../../supabaseClient';

const Login = ({ onNavigate, onLogin }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        setLoading(false);

        if (error) {
            setError(error.message);
        } else {
            onLogin(); // Session updates automatically in App.jsx usually, but we trigger the view change here
        }
    };

    return (
        <AuthLayout
            title="Welcome Back"
            subtitle="Manage your spot and earnings."
        >
            <form onSubmit={handleSubmit} style={{ textAlign: 'left' }}>
                {error && <div style={{ color: 'red', marginBottom: '1rem', fontSize: '0.9rem', textAlign: 'center' }}>{error}</div>}

                <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '5px', color: '#374151' }}>Email Address</label>
                    <input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '1rem' }} />
                </div>

                <div style={{ marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                        <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151' }}>Password</label>
                        <span style={{ fontSize: '0.8rem', color: '#2563eb', cursor: 'pointer' }}>Forgot?</span>
                    </div>
                    <input required type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '1rem' }} />
                </div>

                <button className="btn-claim" type="submit" disabled={loading} style={{ marginBottom: '1.5rem', boxShadow: 'none', opacity: loading ? 0.7 : 1 }}>
                    {loading ? 'Logging in...' : 'Login'}
                </button>

                <div style={{ textAlign: 'center', fontSize: '0.9rem', color: '#6b7280' }}>
                    No spot yet? <span onClick={() => onNavigate('register')} style={{ color: '#2563eb', fontWeight: 600, cursor: 'pointer' }}>Claim Spot</span>
                </div>
            </form>
        </AuthLayout>
    );
};

export default Login;
