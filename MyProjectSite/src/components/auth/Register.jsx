import { useState } from 'react';
import AuthLayout from './AuthLayout';
import { supabase } from '../../supabaseClient';

const Register = ({ onNavigate, onRegisterSuccess }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName,
                },
            },
        });

        setLoading(false);

        if (error) {
            setError(error.message);
        } else {
            // Supabase defaults to "Check your email for a link". 
            // But if we want to force OTP flow, user needs to enable it in dashboard.
            // For now, we assume standard flow and move them to Verify screen (expecting code or link click).
            onRegisterSuccess(email);
        }
    };

    return (
        <AuthLayout
            title="Claim Your Identity"
            subtitle="Join the exclusive grid. Only 100 spots available."
        >
            <form onSubmit={handleSubmit} style={{ textAlign: 'left' }}>
                {error && <div style={{ color: 'red', marginBottom: '1rem', fontSize: '0.9rem', textAlign: 'center' }}>{error}</div>}

                <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '5px', color: '#374151' }}>Full Name</label>
                    <input required type="text" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="e.g. Elon Musk" style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '1rem' }} />
                </div>

                <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '5px', color: '#374151' }}>Email Address</label>
                    <input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '1rem' }} />
                </div>

                <div style={{ marginBottom: '2rem' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '5px', color: '#374151' }}>Password</label>
                    <input required type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '1rem' }} />
                </div>

                <button className="btn-claim" type="submit" disabled={loading} style={{ marginBottom: '1.5rem', boxShadow: 'none', opacity: loading ? 0.7 : 1 }}>
                    {loading ? 'Creating...' : 'Create Account'}
                </button>

                <div style={{ textAlign: 'center', fontSize: '0.9rem', color: '#6b7280' }}>
                    Already have a spot? <span onClick={() => onNavigate('login')} style={{ color: '#2563eb', fontWeight: 600, cursor: 'pointer' }}>Login</span>
                </div>
            </form>
        </AuthLayout>
    );
};

export default Register;
