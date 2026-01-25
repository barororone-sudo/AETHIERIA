const AdCard = () => {
    return (
        <div className="slot-card" style={{
            background: '#fffeb3',
            border: '2px solid #eab308',
            justifyContent: 'center',
            cursor: 'pointer'
        }}>
            <div style={{
                position: 'absolute', top: 10, right: 10,
                background: '#eab308', color: '#000',
                fontSize: '0.6rem', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold'
            }}>
                SPONSORED
            </div>

            <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>📢</div>
            <h3 style={{ fontSize: '1.2rem', color: '#ca8a04', marginBottom: '0.5rem' }}>
                Cheap Flights!
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#854d0e', lineHeight: '1.2' }}>
                Save 50% on your next trip. Limited time offer.
            </p>

            <button style={{
                marginTop: '1rem', background: '#ca8a04', color: '#fff',
                border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold'
            }}>
                Click Here
            </button>
        </div>
    );
};

export default AdCard;
