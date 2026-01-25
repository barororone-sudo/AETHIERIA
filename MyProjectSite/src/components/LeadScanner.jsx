import { useState, useEffect } from 'react';

const MOCK_LEADS = [
    { id: 1, company: "Vertex Realty Group", need: "Website Rebrand", budget: "$8,500 - $12,000", urgency: "High" },
    { id: 2, company: "Onyx Capital", need: "SaaS Dashboard", budget: "$15,000+", urgency: "Medium" },
    { id: 3, company: "Dr. A. Sterling", need: "Private Practice SEO", budget: "$4,500/mo", urgency: "High" },
];

const LeadScanner = () => {
    const [scanning, setScanning] = useState(true);
    const [progress, setProgress] = useState(0);
    const [logs, setLogs] = useState([]);

    useEffect(() => {
        if (!scanning) return;

        const phrases = ["Connecting to LinkedIn API...", "Filtering Low Budgets...", "Analyzing Sentiment...", "Verified Payment History...", "3 High-Value Targets Found."];
        let step = 0;

        const interval = setInterval(() => {
            setProgress(p => Math.min(p + 5, 100));
            if (Math.random() > 0.7 && step < phrases.length) {
                setLogs(prev => [...prev, phrases[step]]);
                step++;
            }
        }, 100);

        const timeout = setTimeout(() => {
            setScanning(false);
            clearInterval(interval);
        }, 4000);

        return () => { clearInterval(interval); clearTimeout(timeout); };
    }, []);

    if (scanning) {
        return (
            <div className="luxury-card" style={{ width: '100%', maxWidth: '600px', padding: '3rem', textAlign: 'center' }}>
                <h3 style={{ color: 'var(--accent-gold)', marginBottom: '1rem', letterSpacing: '2px' }}>
                    SCANNING NETWORK...
                </h3>
                <div style={{
                    width: '100%', height: '4px', background: 'rgba(255,255,255,0.1)', marginBottom: '2rem',
                    position: 'relative', overflow: 'hidden'
                }}>
                    <div style={{
                        width: `${progress}%`, height: '100%', background: 'var(--accent-gold)',
                        boxShadow: '0 0 10px var(--accent-gold)', transition: 'width 0.1s linear'
                    }}></div>
                </div>
                <div style={{ height: '100px', overflow: 'hidden', color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: '0.9rem', textAlign: 'left' }}>
                    {logs.map((log, i) => <div key={i}>&gt; {log}</div>)}
                </div>
            </div>
        );
    }

    return (
        <div className="luxury-card" style={{ width: '100%', maxWidth: '800px', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.8rem' }}>3 <span className="text-gold">Premium Opportunities</span> Found</h2>
                <span style={{
                    background: 'rgba(50, 255, 50, 0.1)', color: '#4ade80',
                    padding: '4px 12px', borderRadius: '100px', fontSize: '0.8rem', border: '1px solid rgba(50,255,50,0.2)'
                }}>
                    Live Verified
                </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {MOCK_LEADS.map(lead => (
                    <div key={lead.id} style={{
                        background: 'rgba(255,255,255,0.03)', padding: '1.5rem', borderRadius: '4px',
                        borderLeft: '2px solid var(--accent-gold)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                    }}>
                        <div>
                            <h4 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>{lead.company}</h4>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Needs: {lead.need}</p>
                        </div>

                        <div style={{ textAlign: 'right', minWidth: '150px' }}>
                            <div style={{ color: 'var(--accent-gold)', fontWeight: '700', fontSize: '1.1rem' }}>{lead.budget}</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>Budget</div>
                        </div>

                        {/* THE PAYWALL */}
                        <div style={{ position: 'relative' }}>
                            <button disabled style={{
                                background: '#333', color: '#666', border: 'none',
                                padding: '10px 20px', borderRadius: '4px', cursor: 'not-allowed',
                                filter: 'blur(4px)', userSelect: 'none'
                            }}>
                                CONTACT CEO
                            </button>
                            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
                                🔒
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div style={{ marginTop: '3rem', textAlign: 'center', padding: '2rem', background: 'linear-gradient(to bottom, rgba(212, 175, 55, 0.05), transparent)' }}>
                <p style={{ marginBottom: '1rem', color: 'var(--text-muted)' }}>Unlock full contact details and close these deals today.</p>
                <button className="btn-gold" style={{ width: '100%', maxWidth: '400px' }}>
                    Unlock Access ($49/mo)
                </button>
            </div>
        </div>
    );
};

export default LeadScanner;
