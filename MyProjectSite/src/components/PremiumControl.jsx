const PremiumControl = ({ isPremium, onToggle }) => {
    return (
        <div style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            background: isPremium ? 'linear-gradient(135deg, #10b981, #059669)' : 'linear-gradient(135deg, #f59e0b, #d97706)',
            color: '#fff',
            padding: '15px 25px',
            borderRadius: '50px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: '15px',
            cursor: 'pointer',
            zIndex: 200,
            transition: 'all 0.3s ease'
        }} onClick={onToggle}>

            <div style={{ fontSize: '1.5rem' }}>
                {isPremium ? '💎' : '🚫'}
            </div>

            <div>
                <div style={{ fontWeight: 'bold', fontSize: '1rem' }}>
                    {isPremium ? 'Premium Active' : 'Remove Ads'}
                </div>
                {!isPremium && (
                    <div style={{ fontSize: '0.8rem', opacity: 0.9 }}>
                        Only $4.99/mo
                    </div>
                )}
            </div>

        </div>
    );
};

export default PremiumControl;
