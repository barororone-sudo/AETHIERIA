import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const KingSpot = () => {
    const [king, setKing] = useState(null);
    const [loading, setLoading] = useState(false);

    // Fetch initial state & Subscribe to Realtime
    useEffect(() => {
        fetchKing();

        const channel = supabase
            .channel('king_spot_changes')
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'king_spot' },
                (payload) => {
                    setKing(payload.new);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const fetchKing = async () => {
        const { data } = await supabase.from('king_spot').select('*').eq('id', 1).single();
        if (data) setKing(data);
    };

    const claimThrone = async () => {
        setLoading(true);
        // In a real app, we'd use the logged-in user's name.
        // For chaos fun, we'll ask for a name or use a random one if not logged in.

        // Get current user if possible
        const { data: { user } } = await supabase.auth.getUser();
        const newName = user?.user_metadata?.full_name || "Anonymous Challenger";

        const { error } = await supabase
            .from('king_spot')
            .update({
                name: newName,
                message: `Claimed at ${new Date().toLocaleTimeString()}`,
                claimed_at: new Date()
            })
            .eq('id', 1);

        if (error) console.error(error);
        setLoading(false);
    };

    return (
        <div style={{
            gridColumn: '1 / -1', // Span full width if inside grid, or we place it above
            marginBottom: '2rem',
            background: 'linear-gradient(135deg, #FFD700, #FDB931)',
            borderRadius: '20px',
            padding: '2px', // Border effect
            boxShadow: '0 0 20px rgba(255, 215, 0, 0.4)',
            animation: 'pulse 2s infinite'
        }}>
            <div style={{
                background: '#fff',
                borderRadius: '18px',
                padding: '2rem',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '10px'
            }}>
                <div style={{ fontSize: '3rem' }}>👑</div>
                <h2 style={{ fontSize: '2rem', color: '#B4690E', margin: 0 }}>King of the Hill</h2>

                {king ? (
                    <>
                        <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>
                            Current Ruler: <span style={{ color: '#000' }}>{king.name}</span>
                        </div>
                        <div style={{ color: '#666', fontSize: '0.9rem' }}>
                            "{king.message}"
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#999' }}>
                            Reigning since: {new Date(king.claimed_at).toLocaleTimeString()}
                        </div>
                    </>
                ) : (
                    <div>The throne is empty...</div>
                )}

                <button
                    onClick={claimThrone}
                    disabled={loading}
                    style={{
                        marginTop: '1rem',
                        background: '#000',
                        color: '#FFD700',
                        border: 'none',
                        padding: '12px 30px',
                        fontSize: '1.2rem',
                        fontWeight: 'bold',
                        borderRadius: '50px',
                        cursor: 'pointer',
                        transition: 'transform 0.1s'
                    }}
                >
                    {loading ? 'Seizing Throne...' : '⚔️ SEIZE THE THRONE'}
                </button>
                <div style={{ fontSize: '0.7rem', color: '#999', marginTop: '5px' }}>
                    Warning: You can be overthrown immediately.
                </div>
            </div>

            <style>{`
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(255, 215, 0, 0.4); }
          70% { box-shadow: 0 0 0 10px rgba(255, 215, 0, 0); }
          100% { box-shadow: 0 0 0 0 rgba(255, 215, 0, 0); }
        }
      `}</style>
        </div>
    );
};

export default KingSpot;
