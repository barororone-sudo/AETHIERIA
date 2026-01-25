import { useEffect, useRef } from 'react';

const AdNetworkSlot = () => {
    const adRef = useRef(null);

    // INSTRUCTIONS FOR USER:
    // 1. Get your code from Google AdSense or Ezoic.
    // 2. It usually looks like <ins class="adsbygoogle" ...></ins>
    // 3. Uncomment the code inside the 'else' block below for Production.

    const isDev = import.meta.env.DEV; // Detects if running on Localhost

    useEffect(() => {
        if (!isDev) {
            // Push to AdSense (Uncomment this line when you have your script)
            // (window.adsbygoogle = window.adsbygoogle || []).push({});
        }
    }, [isDev]);

    if (!isDev) {
        // PRODUCTION MODE (Your Real Ad)
        return (
            <div className="slot-card" style={{ padding: 0, justifyContent: 'center', background: '#f1f1f1' }}>
                {/* PASTE YOUR AD SCRIPT HERE */}
                {/* Example:
             <ins className="adsbygoogle"
                 style={{ display: 'block' }}
                 data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
                 data-ad-slot="1234567890"
                 data-ad-format="auto"
                 data-full-width-responsive="true">
             </ins>
             */}
                <div style={{ padding: '20px', color: '#888' }}>
                    Ad Loading... (Configure in AdNetworkSlot.jsx)
                </div>
            </div>
        );
    }

    // DEVELOPMENT MODE (Placeholder)
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
