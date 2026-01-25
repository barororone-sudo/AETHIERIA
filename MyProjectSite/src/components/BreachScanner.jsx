import { useState, useEffect } from 'react';

const BreachScanner = ({ email }) => {
    const [phase, setPhase] = useState('scannning'); // scanning, analyzing, results
    const [logs, setLogs] = useState([]);
    const [breaches, setBreaches] = useState([
        { source: "LastFM (2012)", data: "Email, Password Hash", risk: "LOW" },
        { source: "LinkedIn (2016)", data: "Email, Job Title", risk: "MEDIUM" },
        { source: "Collection #1 (Dark Web)", data: "Cleartext Password", risk: "CRITICAL" },
        { source: "Bank Identification Data", data: "Partial CC Number", risk: "CRITICAL" },
    ]);

    useEffect(() => {
        const sequence = [
            "Connecting to Tor Network...",
            "Handshake established (Node: 192.x.x.x)...",
            `Querying leaks for: ${email}...`,
            "Searching Pastebin dumps...",
            "Accessing Russian Market API...",
            "WARNING: MATCH FOUND IN DB_77_A...",
            "Decrypting headers..."
        ];

        let i = 0;
        const interval = setInterval(() => {
            if (i < sequence.length) {
                setLogs(prev => [...prev, sequence[i]]);
                i++;
            } else {
                clearInterval(interval);
                setTimeout(() => setPhase('results'), 1000);
            }
        }, 600);

        return () => clearInterval(interval);
    }, [email]);

    if (phase === 'scannning') {
        return (
            <div style={{ maxWidth: '600px', width: '100%', padding: '2rem', background: '#000', border: '1px solid #333', fontFamily: 'var(--font-mono)' }}>
                <div style={{ color: 'var(--terminal-green)', marginBottom: '1rem' }}>
                    SCANNING IN PROGRESS<span className="blink">_</span>
                </div>
                <div style={{ height: '200px', overflowY: 'auto', borderTop: '1px solid #333', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {logs.map((log, idx) => (
                        <div key={idx} style={{
                            color: log.includes("WARNING") ? 'var(--alert-red)' : '#666',
                            fontSize: '0.9rem'
                        }}>
                            &gt; {log}
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div style={{ maxWidth: '800px', width: '100%', padding: '2rem', animation: 'fadeIn 0.5s' }}>
            <div style={{
                background: 'rgba(255, 51, 51, 0.1)', border: '2px solid var(--alert-red)',
                padding: '2rem', textAlign: 'center', marginBottom: '2rem'
            }}>
                <h2 style={{ color: 'var(--alert-red)', fontSize: '2rem', marginBottom: '0.5rem' }}>⚠️ THREATS DETECTED</h2>
                <p>Your digital identity is currently <strong>EXPOSED</strong>.</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {breaches.map((b, idx) => (
                    <div key={idx} style={{
                        background: '#111', padding: '1.5rem', borderLeft: `4px solid ${b.risk === 'CRITICAL' ? 'var(--alert-red)' : 'orange'}`,
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                    }}>
                        <div>
                            <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{b.source}</div>
                            <div style={{ color: '#666', fontSize: '0.9rem' }}>Compromised: {b.data}</div>
                        </div>
                        <div style={{
                            color: b.risk === 'CRITICAL' ? 'var(--alert-red)' : 'orange',
                            fontWeight: 'bold', fontFamily: 'var(--font-mono)'
                        }}>
                            [{b.risk}]
                        </div>
                    </div>
                ))}
            </div>

            <div style={{
                marginTop: '3rem', padding: '2rem', background: '#111',
                border: '1px solid var(--terminal-green)', textAlign: 'center'
            }}>
                <h3 style={{ color: 'var(--terminal-green)', marginBottom: '1rem' }}>RECOMMENDED ACTION: SECURE ACCOUNT</h3>
                <p style={{ color: '#888', marginBottom: '2rem' }}>
                    Generate a removal request and secure your identity with our automated defense tool.
                </p>
                <button className="btn-shield" style={{ width: '100%' }}>
                    ACTIVATE PROTECTION ($9.00/mo)
                </button>
                <div style={{ marginTop: '1rem', color: '#444', fontSize: '0.8rem' }}>
                    Trusted by 2M+ Users • Bank-Level Encryption
                </div>
            </div>
        </div>
    );
};

export default BreachScanner;
