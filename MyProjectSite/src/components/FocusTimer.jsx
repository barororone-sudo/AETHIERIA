import { useState, useEffect } from 'react';

const FocusTimer = () => {
    const [minutes, setMinutes] = useState(25);
    const [seconds, setSeconds] = useState(0);
    const [isActive, setIsActive] = useState(false);

    // Progress Ring Calculations
    const radius = 120;
    const circumference = 2 * Math.PI * radius;
    const totalSeconds = 25 * 60;
    const currentSeconds = minutes * 60 + seconds;
    const progress = (currentSeconds / totalSeconds) * circumference;

    useEffect(() => {
        let interval = null;
        if (isActive) {
            interval = setInterval(() => {
                if (seconds === 0) {
                    if (minutes === 0) {
                        setIsActive(false);
                        clearInterval(interval);
                    } else {
                        setMinutes(minutes - 1);
                        setSeconds(59);
                    }
                } else {
                    setSeconds(seconds - 1);
                }
            }, 1000);
        } else {
            clearInterval(interval);
        }
        return () => clearInterval(interval);
    }, [isActive, seconds, minutes]);

    const toggleTimer = () => setIsActive(!isActive);
    const resetTimer = () => {
        setIsActive(false);
        setMinutes(25);
        setSeconds(0);
    };

    return (
        <div className="glass-panel" style={{
            padding: '4rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            marginTop: '2rem',
            maxWidth: '500px',
            width: '100%'
        }}>
            <div style={{ position: 'relative', width: '300px', height: '300px' }}>
                {/* Glow behind timer */}
                <div style={{
                    position: 'absolute',
                    top: '50%', left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '200px', height: '200px',
                    background: 'var(--accent-cyan)',
                    borderRadius: '50%',
                    filter: 'blur(60px)',
                    opacity: isActive ? 0.2 : 0.05,
                    transition: 'opacity 1s ease'
                }}></div>

                <svg width="300" height="300" style={{ transform: 'rotate(-90deg)' }}>
                    <circle
                        r={radius}
                        cx="150"
                        cy="150"
                        fill="transparent"
                        stroke="rgba(255,255,255,0.05)"
                        strokeWidth="8"
                    />
                    <circle
                        r={radius}
                        cx="150"
                        cy="150"
                        fill="transparent"
                        stroke={isActive ? "var(--accent-cyan)" : "var(--text-muted)"}
                        strokeWidth="8"
                        strokeDasharray={circumference}
                        strokeDashoffset={circumference - progress}
                        strokeLinecap="round"
                        style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.5s ease' }}
                    />
                </svg>

                <div style={{
                    position: 'absolute',
                    top: '50%', left: '50%',
                    transform: 'translate(-50%, -50%)',
                    textAlign: 'center'
                }}>
                    <h1 style={{
                        fontSize: '4.5rem',
                        fontWeight: '200',
                        letterSpacing: '-2px',
                        color: 'white'
                    }}>
                        {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
                    </h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', letterSpacing: '2px', textTransform: 'uppercase' }}>
                        {isActive ? 'Flow State' : 'Ready'}
                    </p>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '3rem' }}>
                <button className="btn-primary" onClick={toggleTimer} style={{ minWidth: '120px' }}>
                    {isActive ? 'PAUSE' : 'FOCUS'}
                </button>
                <button
                    className="btn-primary"
                    onClick={resetTimer}
                    style={{
                        background: 'transparent',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: 'var(--text-muted)'
                    }}
                >
                    RESET
                </button>
            </div>
        </div>
    );
};

export default FocusTimer;
