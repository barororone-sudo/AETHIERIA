import { useEffect, useRef } from 'react';

const AdNetworkSlot = () => {
    const adRef = useRef(null);

    useEffect(() => {
        // In a real app, you would push to (window.adsbygoogle = window.adsbygoogle || []).push({}); here
        // For this prototype, we simulate a script load
        if (adRef.current) {
            // console.log("AdScript loaded for slot");
        }
    }, []);

    return (
        <div className="slot-card" style={{
            background: '#f8f9fa',
            border: '1px solid #e9ecef',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 0,
            overflow: 'hidden',
            position: 'relative'
        }} ref={adRef}>

            {/* Dev Placeholder */}
            <div style={{
                width: '100%', height: '100%',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                color: '#adb5bd', fontSize: '0.8rem',
                background: `repeating-linear-gradient(
          45deg,
          #f8f9fa,
          #f8f9fa 10px,
          #e9ecef 10px,
          #e9ecef 20px
        )`
            }}>
                <div style={{ background: '#fff', padding: '5px 10px', borderRadius: '4px', border: '1px solid #dee2e6' }}>
                    <span style={{ fontWeight: 'bold', color: '#495057' }}>Ad Space</span>
                    <div style={{ fontSize: '0.7rem' }}>Google AdSense / Ezoic</div>
                </div>
            </div>

            {/* Label */}
            <div style={{
                position: 'absolute', bottom: 0, right: 0,
                background: '#e9ecef', fontSize: '0.6rem',
                padding: '2px 5px', borderTopLeftRadius: '4px',
                color: '#6c757d'
            }}>
                Advertisement
            </div>

        </div>
    );
};

export default AdNetworkSlot;
