import { useState } from 'react';

const CapsuleCreator = () => {
    const [step, setStep] = useState(1); // 1: Date, 2: Content, 3: Seal
    const [year, setYear] = useState(2035);
    const [message, setMessage] = useState('');

    const nextStep = () => setStep(step + 1);

    if (step === 1) {
        return (
            <div className="capsule-card">
                <h2 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Select Unlocking Date</h2>
                <p style={{ color: '#7f8c8d', marginBottom: '2rem' }}>
                    When should this message be revealed?
                </p>

                <div style={{ fontSize: '4rem', fontFamily: 'var(--font-header)', margin: '2rem 0', color: 'var(--accent-gold)' }}>
                    {year}
                </div>

                <input
                    type="range"
                    min="2026" max="2075"
                    value={year}
                    onChange={(e) => setYear(Number(e.target.value))}
                    style={{ width: '100%', marginBottom: '3rem', accentColor: 'var(--text-dark)' }}
                />

                <p style={{ fontSize: '0.9rem', color: '#95a5a6', marginBottom: '2rem' }}>
                    {(year - 2026) > 0 ? `${year - 2026} years from now` : 'Next year'}
                </p>

                <button className="btn-gold-solid" onClick={nextStep}>
                    Confirm Date
                </button>
            </div>
        );
    }

    if (step === 2) {
        return (
            <div className="capsule-card">
                <h2 style={{ fontSize: '1.8rem', marginBottom: '1rem' }}>Compose Legacy</h2>
                <p style={{ color: '#7f8c8d', marginBottom: '2rem' }}>
                    What do you want to say to the future?
                </p>

                <textarea
                    placeholder="Dear future self..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    style={{
                        width: '100%', height: '200px', padding: '1rem',
                        border: '1px solid #ddd', fontFamily: 'var(--font-body)',
                        fontSize: '1.1rem', resize: 'none', marginBottom: '2rem',
                        background: '#fafafa'
                    }}
                />

                <button className="btn-gold-solid" onClick={nextStep} disabled={message.length < 5}>
                    Encrypt & Seal
                </button>
            </div>
        );
    }

    return (
        <div className="capsule-card" style={{ border: '2px solid var(--accent-gold)' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🗝️</div>
            <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Ready to Seal</h2>
            <div style={{ width: '50px', height: '2px', background: 'var(--accent-gold)', margin: '0 auto 1.5rem auto' }}></div>

            <p style={{ marginBottom: '1rem' }}>
                <strong>Recipient:</strong> Unlocked in {year}
            </p>
            <p style={{ marginBottom: '2rem', color: '#7f8c8d', fontSize: '0.9rem' }}>
                This capsule will be cryptographically secured on our eternal servers.
                Identity verification required for unlocking.
            </p>

            <div style={{ background: '#f8f8f8', padding: '1.5rem', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span>Storage (50 Years)</span>
                    <span>$99.00</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                    <span>Total</span>
                    <span>$99.00</span>
                </div>
            </div>

            <button className="btn-gold-solid" style={{ width: '100%' }}>
                Pay & Seal Forever
            </button>
        </div>
    );
};

export default CapsuleCreator;
