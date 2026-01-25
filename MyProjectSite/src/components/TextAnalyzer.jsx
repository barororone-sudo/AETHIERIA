import { useState, useEffect } from 'react';

const TextAnalyzer = () => {
    const [text, setText] = useState('');
    const [analyzing, setAnalyzing] = useState(false);
    const [result, setResult] = useState(null);
    const [logs, setLogs] = useState([]);

    const handleAnalyze = () => {
        if (text.length < 5) return;
        setAnalyzing(true);
        setLogs([]);

        // Simulate Analysis Steps
        const steps = [
            "Tokenizing sentences...",
            "Analyzing micro-expressions...",
            "Cross-referencing psychological patterns...",
            "Detecting passive aggression...",
            "Calculating Deception Index..."
        ];

        let i = 0;
        const interval = setInterval(() => {
            setLogs(prev => [...prev, steps[i]]);
            i++;
            if (i >= steps.length) {
                clearInterval(interval);
                setTimeout(() => {
                    setResult({
                        score: Math.floor(Math.random() * 30) + 60, // 60-90% deception usually
                        flags: ["Projection", "Gaslighting", "Avoidance"],
                        intent: "The subject is attempting to shift blame while maintaining plausible deniability."
                    });
                }, 800);
            }
        }, 600);
    };

    if (result) {
        return (
            <div className="msg-card" style={{ padding: '2rem', textAlign: 'center', animation: 'fadeIn 0.5s' }}>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '1rem' }}>
                    Analysis Complete
                </div>

                <div style={{ marginBottom: '2rem' }}>
                    <div style={{ fontSize: '4rem', fontWeight: '800', lineHeight: 1, color: 'var(--accent-pink)' }}>
                        {result.score}%
                    </div>
                    <div style={{ color: 'var(--accent-pink)', fontSize: '1.2rem', fontWeight: 'bold' }}>
                        MANIPULATION DETECTED
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginBottom: '2rem' }}>
                    {result.flags.map(f => (
                        <span key={f} style={{
                            background: 'rgba(244, 114, 182, 0.1)', color: 'var(--accent-pink)',
                            padding: '6px 12px', borderRadius: '100px', fontSize: '0.8rem', fontWeight: '600'
                        }}>
                            ⚠️ {f}
                        </span>
                    ))}
                </div>

                <div style={{ background: '#000', borderRadius: '12px', padding: '1.5rem', marginBottom: '2rem', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ filter: 'blur(6px)', userSelect: 'none', opacity: 0.7, textAlign: 'left' }}>
                        <h4 style={{ color: 'var(--accent-teal)', marginBottom: '0.5rem' }}>HIDDEN INTENT:</h4>
                        <p>{result.intent}</p>
                        <p>Furthermore, the use of conditional phrasing suggests insecurity regarding...</p>
                    </div>
                    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.2)' }}>
                        <span style={{ fontSize: '2rem' }}>🔒</span>
                    </div>
                </div>

                <button className="btn-analyze">
                    Unlock Full Profile ($9)
                </button>
            </div>
        );
    }

    return (
        <div className="msg-card" style={{ padding: '2rem', maxWidth: '600px', width: '100%' }}>
            {!analyzing ? (
                <>
                    <h3 style={{ marginBottom: '1rem' }}>Paste Text / Email</h3>
                    <textarea
                        placeholder="e.g. 'I'm not mad, I just think it's funny that you...'"
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        style={{
                            width: '100%', height: '150px', background: 'rgba(255,255,255,0.05)',
                            border: 'none', borderRadius: '12px', padding: '1rem', color: '#fff',
                            fontFamily: 'var(--font-main)', fontSize: '1rem', marginBottom: '1.5rem',
                            resize: 'none', outline: 'none'
                        }}
                    />
                    <button className="btn-analyze" onClick={handleAnalyze}>
                        Analyze Subtext
                    </button>
                    <div style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        100% Private & Anonymous
                    </div>
                </>
            ) : (
                <div style={{ textAlign: 'left', fontFamily: 'var(--font-code)', minHeight: '300px' }}>
                    <div style={{ color: 'var(--accent-teal)', marginBottom: '1rem' }}>Running SUBTEXT Algorithm v2.1...</div>
                    {logs.map((log, i) => (
                        <div key={i} style={{ marginBottom: '0.5rem', color: '#eee' }}>
                            &gt; {log}
                        </div>
                    ))}
                    <div style={{ marginTop: '1rem' }} className="blink">_</div>
                </div>
            )}
        </div>
    );
};

export default TextAnalyzer;
