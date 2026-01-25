import { useState, useRef, useEffect } from 'react';

const MotionEditor = () => {
    const [image, setImage] = useState(null);
    const [intensity, setIntensity] = useState(30);
    const [speed, setSpeed] = useState(2);
    const [isPlaying, setIsPlaying] = useState(true);

    // Animation Refs
    const requestRef = useRef();
    const seedRef = useRef(0);

    // Handlers
    const handleUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImage(URL.createObjectURL(file));
            setIsPlaying(true);
        }
    };

    const animate = () => {
        if (isPlaying) {
            // We animate the 'baseFrequency' or simply the seed to create jitter/flow
            // A common water effect is animating the turbulence seed or phase
            seedRef.current += speed * 0.002;
            const turbulence = document.getElementById('anim-turbulence');
            if (turbulence) {
                // Adjusting baseFrequency slightly creates a flow effect
                // NOTE: Real fluid requires complex WebGL. For this MVP, we use displacement jitter.
                // We will shift the turbulence seed via baseFrequency for a "heat haze" look.
                const val = 0.01 + Math.sin(seedRef.current) * 0.005;
                turbulence.setAttribute('baseFrequency', `${val} ${val}`);
            }
            requestRef.current = requestAnimationFrame(animate);
        }
    };

    useEffect(() => {
        requestRef.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(requestRef.current);
    }, [isPlaying, speed]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', width: '100%', maxWidth: '1000px' }}>

            {/* Editor Area */}
            <div style={{
                display: 'flex',
                gap: '2rem',
                flexDirection: 'row',
                flexWrap: 'wrap'
            }}>

                {/* Canvas / Preview */}
                <div style={{
                    flex: 2,
                    minWidth: '300px',
                    background: '#111',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    aspectRatio: '16/9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative'
                }}>
                    {!image ? (
                        <label className="btn-upload">
                            <span style={{ fontSize: '2rem', display: 'block', marginBottom: '10px' }}>+</span>
                            Upload Image to Animate
                            <input type="file" onChange={handleUpload} style={{ display: 'none' }} accept="image/*" />
                        </label>
                    ) : (
                        <div style={{ position: 'relative', width: '100%', height: '100%' }}>

                            {/* The SVG Filter definition */}
                            <svg style={{ position: 'absolute', width: 0, height: 0 }}>
                                <filter id="ai-motion">
                                    <feTurbulence
                                        id="anim-turbulence"
                                        type="fractalNoise"
                                        baseFrequency="0.01 0.01"
                                        numOctaves="3"
                                        result="noise"
                                    />
                                    <feDisplacementMap
                                        in="SourceGraphic"
                                        in2="noise"
                                        scale={intensity}
                                        xChannelSelector="R"
                                        yChannelSelector="G"
                                    />
                                </filter>
                            </svg>

                            {/* The Image applying the filter */}
                            <img
                                src={image}
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'contain',
                                    filter: isPlaying ? 'url(#ai-motion)' : 'none'
                                }}
                            />

                            <button
                                onClick={() => setImage(null)}
                                style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(0,0,0,0.5)', border: 'none', color: '#fff', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' }}
                            >
                                Change Image
                            </button>
                        </div>
                    )}
                </div>

                {/* Controls Panel */}
                <div style={{
                    flex: 1,
                    minWidth: '250px',
                    background: 'var(--bg-panel)',
                    padding: '2rem',
                    borderRadius: '12px',
                    display: 'flex',
                    flexDirection: 'column'
                }}>
                    <h3 style={{ marginBottom: '1.5rem', color: 'var(--accent-orange)' }}>AI CONTROLS</h3>

                    <div className="slider-container">
                        <div className="slider-label">
                            <span>Motion Intensity</span>
                            <span>{Math.round(intensity)}%</span>
                        </div>
                        <input
                            type="range"
                            min="0" max="100"
                            value={intensity}
                            onChange={(e) => setIntensity(Number(e.target.value))}
                        />
                    </div>

                    <div className="slider-container">
                        <div className="slider-label">
                            <span>Flow Speed</span>
                            <span>{speed}x</span>
                        </div>
                        <input
                            type="range"
                            min="0" max="10"
                            value={speed}
                            onChange={(e) => setSpeed(Number(e.target.value))}
                        />
                    </div>

                    <div style={{ marginTop: 'auto', paddingTop: '2rem', borderTop: '1px solid #333' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', fontSize: '0.9rem' }}>
                            <span>Export Resolution:</span>
                            <span style={{ color: 'var(--accent-orange)' }}>1080p (Locked)</span>
                        </div>
                        <button className="btn-action" style={{ width: '100%' }}>
                            Export Video ($19)
                        </button>
                    </div>

                </div>
            </div>

        </div>
    );
};

export default MotionEditor;
