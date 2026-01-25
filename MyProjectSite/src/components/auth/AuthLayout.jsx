const AuthLayout = ({ children, title, subtitle }) => {
    return (
        <div style={{
            minHeight: '100vh',
            width: '100vw',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            padding: '20px'
        }}>
            {/* Background Reuse */}
            <div className="mesh-bg"></div>

            <div style={{
                background: 'rgba(255,255,255,0.9)',
                backdropFilter: 'blur(20px)',
                padding: '3rem',
                borderRadius: '24px',
                width: '100%',
                maxWidth: '450px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
                textAlign: 'center'
            }}>
                <div style={{
                    fontSize: '2rem', fontWeight: 800, letterSpacing: '-1px',
                    marginBottom: '0.5rem', color: '#1f2937'
                }}>
                    NEXUS
                </div>

                <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: '#111' }}>{title}</h2>
                <p style={{ color: '#6b7280', marginBottom: '2rem', fontSize: '0.9rem' }}>
                    {subtitle}
                </p>

                {children}
            </div>
        </div>
    );
};

export default AuthLayout;
