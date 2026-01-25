import { useState } from 'react';
import AuthLayout from './AuthLayout';

const Verify = ({ email, onVerifySuccess }) => {
    const [code, setCode] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (code.length >= 4) onVerifySuccess();
    };

    return (
        <AuthLayout
            title="Verify Email"
            subtitle={`We sent a secure code to ${email || 'your email'}`}
        >
            <form onSubmit={handleSubmit} style={{ textAlign: 'left' }}>
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

                <button className="btn-claim" type="submit" style={{ marginBottom: '1.5rem', boxShadow: 'none' }}>
                    Verify Access
                </button>

                <div style={{ textAlign: 'center', fontSize: '0.9rem', color: '#6b7280' }}>
                    Didn't receive it? <span style={{ color: '#2563eb', fontWeight: 600, cursor: 'pointer' }}>Resend</span>
                </div>
            </form>
        </AuthLayout>
    );
};

export default Verify;
