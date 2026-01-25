import { useState } from 'react';
import AuthLayout from './AuthLayout';
import { supabase } from '../../supabaseClient';

const Verify = ({ email, onVerifySuccess }) => {
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (code.length < 6) return;

        setLoading(true);
        setError(null);

        const { data, error } = await supabase.auth.verifyOtp({
            email,
            token: code,
            type: 'signup'
        });

        setLoading(false);

        if (error) {
            setError(error.message);
        } else {
            onVerifySuccess();
        }
    };

    return (
        <AuthLayout
            title="Verify Email"
            subtitle={`We sent a secure code to ${email || 'your email'}`}
        >
            <form onSubmit={handleSubmit} style={{ textAlign: 'left' }}>
                {error && <div style={{ color: 'red', marginBottom: '1rem', fontSize: '0.9rem', textAlign: 'center' }}>{error}</div>}

                <div style={{ marginBottom: '2rem' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '5px', color: '#374151' }}>Security Code</label>
                    <input
                        required
                        type="text"
                        placeholder="123456"
                        value={code}
                        onChange={e => setCode(e.target.value)}
                        style={{
                            width: '100%', padding: '12px', borderRadius: '8px',
                            border: '1px solid #d1d5db', fontSize: '1.5rem',
                            letterSpacing: '10px', textAlign: 'center', fontFamily: 'monospace'
                        }}
                    />
                </div>

                <button className="btn-claim" type="submit" disabled={loading} style={{ marginBottom: '1.5rem', boxShadow: 'none', opacity: loading ? 0.7 : 1 }}>
                    {loading ? 'Verifying...' : 'Verify Access'}
                </button>

                <div style={{ textAlign: 'center', fontSize: '0.9rem', color: '#6b7280' }}>
                    By verifying, you agree to our Terms.
                </div>
            </form>
        </AuthLayout>
    );
};

export default Verify;
