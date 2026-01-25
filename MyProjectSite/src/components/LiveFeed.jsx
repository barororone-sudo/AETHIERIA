import { useState, useEffect } from 'react';

const MOCK_WALLETS = ["0x882...a9d", "0xWhale...22", "ElonWallet_Proxy", "BlackRock_OTC"];
const MOCK_COINS = ["BTC", "ETH", "SOL", "PEPE", "SHIB"];

const LiveFeed = () => {
    const [txs, setTxs] = useState([]);
    const [whaleAlert, setWhaleAlert] = useState(null);

    useEffect(() => {
        // Initial data
        setTxs([
            { time: "19:10:22", wallet: "0x7a2...b1", action: "BUY", coin: "SOL", amount: "$12,450.00" },
            { time: "19:10:20", wallet: "0x9cc...2a", action: "SELL", coin: "ETH", amount: "$4,200.00" },
            { time: "19:10:15", wallet: "0x11b...00", action: "BUY", coin: "BTC", amount: "$85,000.00" },
        ]);

        const interval = setInterval(() => {
            // Random normal transaction
            const newTx = {
                time: new Date().toLocaleTimeString('en-US', { hour12: false }),
                wallet: "0x" + Math.random().toString(16).substr(2, 6),
                action: Math.random() > 0.5 ? "BUY" : "SELL",
                coin: MOCK_COINS[Math.floor(Math.random() * MOCK_COINS.length)],
                amount: "$" + (Math.random() * 50000).toFixed(2)
            };

            setTxs(prev => [newTx, ...prev.slice(0, 8)]);

            // Random WHALE EVENT (The 'Hook')
            if (Math.random() > 0.8) {
                setWhaleAlert({
                    wallet: MOCK_WALLETS[Math.floor(Math.random() * MOCK_WALLETS.length)],
                    amount: "$" + (Math.random() * 5 + 1).toFixed(1) + "M", // Millions
                    coin: "UNKNOWN" // Hidden
                });
            }

        }, 2000);

        return () => clearInterval(interval);
    }, []);

    return (
        <div style={{ width: '100%', maxWidth: '900px', display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>

            {/* Live Ticker */}
            <div style={{ flex: 1, minWidth: '300px', background: 'var(--bg-panel)', border: '1px solid #334155', borderRadius: '8px' }}>
                <div style={{ padding: '1rem', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between' }}>
                    <h3 style={{ margin: 0 }}>LIVE MARKET FEED</h3>
                    <span className="text-green" style={{ fontSize: '0.8rem' }}>● CONNECTED</span>
                </div>
                <div style={{ padding: '0.5rem' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                        <thead>
                            <tr style={{ color: 'var(--text-muted)', textAlign: 'left' }}>
                                <th style={{ padding: '8px' }}>TIME</th>
                                <th style={{ padding: '8px' }}>WALLET</th>
                                <th style={{ padding: '8px' }}>ACTION</th>
                                <th style={{ padding: '8px' }}>COIN</th>
                                <th style={{ padding: '8px', textAlign: 'right' }}>VALUE</th>
                            </tr>
                        </thead>
                        <tbody>
                            {txs.map((tx, i) => (
                                <tr key={i} className={i === 0 ? "flash" : ""} style={{ borderBottom: '1px solid #1e293b' }}>
                                    <td style={{ padding: '8px', color: '#64748b' }}>{tx.time}</td>
                                    <td style={{ padding: '8px' }}>{tx.wallet}</td>
                                    <td style={{ padding: '8px', color: tx.action === 'BUY' ? 'var(--accent-green)' : 'var(--accent-red)' }}>{tx.action}</td>
                                    <td style={{ padding: '8px' }}>{tx.coin}</td>
                                    <td style={{ padding: '8px', textAlign: 'right' }}>{tx.amount}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Whale Alert Panel */}
            <div style={{ flex: 1, minWidth: '300px' }}>
                {whaleAlert && (
                    <div className="alert-card" style={{ padding: '2rem', textAlign: 'center', animation: 'bounceIn 0.5s' }}>
                        <div style={{ background: 'var(--accent-green)', color: '#000', fontWeight: 'bold', padding: '5px 10px', display: 'inline-block', borderRadius: '4px', marginBottom: '1rem' }}>
                            🚨 WHALE DETECTED
                        </div>
                        <h2 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>
                            BUY {whaleAlert.amount}
                        </h2>
                        <div style={{ marginBottom: '1.5rem', fontSize: '1.2rem', color: '#94a3b8' }}>
                            Wallet: {whaleAlert.wallet}
                        </div>

                        {/* The Paywall Coin */}
                        <div style={{ background: '#000', padding: '1.5rem', borderRadius: '8px', position: 'relative', overflow: 'hidden', marginBottom: '1.5rem' }}>
                            <div style={{ filter: 'blur(10px)', fontSize: '2rem', fontWeight: 'bold' }}>
                                $GX72-TOKEN
                            </div>
                            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)' }}>
                                🔒 HIDDEN
                            </div>
                        </div>

                        <p style={{ fontSize: '0.9rem', color: 'var(--accent-green)', marginBottom: '1rem' }}>
                            Projected Return: +8,000% (24h)
                        </p>

                        <button className="btn-trade" style={{ width: '100%' }}>
                            REVEAL COIN ($49/mo)
                        </button>
                    </div>
                )}

                {!whaleAlert && (
                    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', border: '2px dashed #334155', borderRadius: '8px', minHeight: '300px' }}>
                        Scanning 10,000+ Insider Wallets...
                    </div>
                )}
            </div>

        </div>
    );
};

export default LiveFeed;
