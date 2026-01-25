import { useState, useEffect } from 'react';

const LiveTraffic = () => {
    const [viewers, setViewers] = useState(1420);

    useEffect(() => {
        const interval = setInterval(() => {
            // Fluctuate random amount
            const change = Math.floor(Math.random() * 10) - 4;
            setViewers(v => Math.max(1000, v + change));
        }, 2000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div style={{
            position: 'fixed', bottom: '20px', left: '20px',
            background: '#fff', padding: '10px 15px',
            borderRadius: '50px', boxShadow: '0 5px 15px rgba(0,0,0,0.1)',
            display: 'flex', alignItems: 'center', gap: '8px', zIndex: 100,
            border: '1px solid #e5e7eb', fontSize: '0.9rem', fontWeight: 600
        }}>
            <span style={{
                display: 'inline-block', width: '8px', height: '8px',
                borderRadius: '50%', background: '#22c55e',
                boxShadow: '0 0 10px #22c55e'
            }}></span>
            <span>{viewers.toLocaleString()} Live Visitors</span>
        </div>
    );
};

export default LiveTraffic;
