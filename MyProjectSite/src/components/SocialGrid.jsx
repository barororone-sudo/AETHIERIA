import { useState } from 'react';
import AdNetworkSlot from './AdNetworkSlot';

const MOCK_USERS = [
    { id: 1, name: "Sarah K.", role: "Digital Artist", bio: "Creating neon dreams. Commissions open.", img: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah", verified: true },
    { id: 2, name: "NextLevel Agency", role: "Marketing", bio: "We scale brands to $1M.", img: "https://api.dicebear.com/7.x/identicon/svg?seed=Agency", verified: true },
    { id: 3, name: "Alex Code", role: "Dev Freelancer", bio: "React/Node Expert. Hire me.", img: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex", verified: false },
    { id: 4, name: "Crypto King", role: "Investor", bio: "Bitcoin Maxi. Follow my signals.", img: "https://api.dicebear.com/7.x/avataaars/svg?seed=King", verified: true },
    { id: 5, name: "Elena V.", role: "Model / Influencer", bio: "Travel & Lifestyle content.", img: "https://api.dicebear.com/7.x/avataaars/svg?seed=Elena", verified: false },
];

const SocialGrid = ({ isPremium }) => {
    const [selectedSlot, setSelectedSlot] = useState(null);

    const handleClaim = (index) => {
        setSelectedSlot(index);
    };

    const renderGridItems = () => {
        const items = [];
        const totalSlots = 14;

        for (let i = 0; i < totalSlots; i++) {
            // SYSTEM ADS: Use AdNetworkSlot instead of AdCard
            // Injected at index 3, 7, 11 (standard ad grid logic)
            if (!isPremium && (i === 3 || i === 7 || i === 11)) {
                items.push(<AdNetworkSlot key={`ad-${i}`} />);
                continue;
            }

            const user = MOCK_USERS[i] || null;

            if (user) {
                items.push(
                    <div key={i} className="slot-card">
                        <div style={{ position: 'relative' }}>
                            <img src={user.img} alt={user.name} className="avatar" />
                            <div className="status-dot"></div>
                        </div>

                        {/* Header with Verified Check */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', justifyContent: 'center' }}>
                            <h3 style={{ fontSize: '1.1rem', margin: 0 }}>{user.name}</h3>
                            {user.verified && (
                                <div style={{
                                    color: '#fff', background: '#3b82f6',
                                    width: '16px', height: '16px', borderRadius: '50%',
                                    fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                    ✓
                                </div>
                            )}
                        </div>

                        <span style={{ fontSize: '0.8rem', color: 'var(--accent-primary)', fontWeight: 600, marginBottom: '10px' }}>
                            {user.role}
                        </span>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-sub)', marginBottom: 'auto', lineHeight: '1.4' }}>
                            {user.bio}
                        </p>
                        <button className="btn-connect" style={{ marginTop: '1rem' }}>
                            Connect / Message
                        </button>
                    </div>
                );
            } else {
                items.push(
                    <div key={i} className="slot-card slot-empty" onClick={() => handleClaim(i)}>
                        <div style={{ fontSize: '2rem', color: '#cbd5e1', marginBottom: '10px' }}>+</div>
                        <h3 style={{ color: '#94a3b8' }}>Empty Spot</h3>
                        <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                            Be seen here.
                        </p>
                        <div style={{ marginTop: 'auto', fontSize: '0.9rem', color: 'var(--accent-secondary)', fontWeight: 600 }}>
                            $9/mo
                        </div>
                    </div>
                );
            }
        }
        return items;
    };

    return (
        <>
            <div className="social-grid">
                {renderGridItems()}
            </div>

            {/* Claim Modal (Paywall) */}
            {selectedSlot !== null && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    background: 'rgba(0,0,0,0.5)', zIndex: 100,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                    <div style={{
                        background: '#fff', padding: '2rem', borderRadius: '20px',
                        maxWidth: '400px', width: '90%', boxShadow: '0 20px 50px rgba(0,0,0,0.2)',
                        animation: 'popIn 0.3s ease'
                    }}>
                        <h2 style={{ fontSize: '1.8rem', marginBottom: '0.5rem' }}>Claim Spot #{selectedSlot + 1}</h2>
                        <p style={{ color: 'var(--text-sub)', marginBottom: '2rem' }}>
                            Upload your profile and get instant visibility to our 50,000 daily visitors.
                        </p>

                        <div style={{ marginBottom: '1.5rem' }}>
                            <input type="text" placeholder="Your Name / Brand" style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #e5e7eb', marginBottom: '10px' }} />
                            <input type="text" placeholder="Tagline (e.g. Freelance Designer)" style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #e5e7eb' }} />
                        </div>

                        <button className="btn-claim" style={{ marginBottom: '1rem' }}>
                            Rent Spot ($9.99/mo)
                        </button>
                        <button className="btn-connect" style={{ background: '#000', color: '#fff' }}>
                            Buy 'Verified' Spot ($19.99)
                        </button>

                        <button
                            onClick={() => setSelectedSlot(null)}
                            style={{ background: 'transparent', border: 'none', color: '#94a3b8', width: '100%', marginTop: '10px', cursor: 'pointer' }}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </>
    );
};

export default SocialGrid;
