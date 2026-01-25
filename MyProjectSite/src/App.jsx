import { useState } from 'react'
import './App.css'
import SocialGrid from './components/SocialGrid'
import PremiumControl from './components/PremiumControl'
import LiveTraffic from './components/LiveTraffic'

// Auth Components
import Login from './components/auth/Login'
import Register from './components/auth/Register'
import Verify from './components/auth/Verify'

function App() {
  const [view, setView] = useState('home'); // home, login, register, verify
  const [isPremium, setIsPremium] = useState(false);
  const [userEmail, setUserEmail] = useState('');

  // Navigation Handlers
  const handleRegisterSuccess = (email) => {
    setUserEmail(email);
    setView('verify');
  };

  const handleVerifySuccess = () => {
    setView('home'); // Logged in!
  };

  const handleLogin = () => {
    setView('home');
  };

  // Render Auth Views
  if (view === 'login') return <Login onNavigate={setView} onLogin={handleLogin} />;
  if (view === 'register') return <Register onNavigate={setView} onRegisterSuccess={handleRegisterSuccess} />;
  if (view === 'verify') return <Verify email={userEmail} onVerifySuccess={handleVerifySuccess} />;

  // Render Main Home View
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      paddingBottom: '4rem'
    }}>
      <div className="mesh-bg"></div>

      <LiveTraffic />

      <PremiumControl
        isPremium={isPremium}
        onToggle={() => setIsPremium(!isPremium)}
      />

      {/* Nav */}
      <nav style={{ width: '100%', padding: '1.5rem 3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontWeight: '800', fontSize: '1.5rem', letterSpacing: '-0.5px', cursor: 'pointer' }} onClick={() => setView('home')}>
          NEXUS
        </div>
        <div style={{ display: 'flex', gap: '20px', fontSize: '0.9rem', fontWeight: 600 }}>
          <span>Members</span>
          <span>Advertise</span>
          <button
            onClick={() => setView('login')}
            style={{ background: '#1f2937', color: '#fff', border: 'none', padding: '6px 16px', borderRadius: '50px', marginLeft: '10px', cursor: 'pointer' }}
          >
            Login
          </button>
        </div>
      </nav>

      {/* Hero */}
      <div style={{ textAlign: 'center', maxWidth: '800px', marginTop: '3rem', padding: '0 1rem', marginBottom: '4rem' }}>
        <div style={{
          background: '#dbeafe', color: '#2563eb', padding: '6px 16px', borderRadius: '50px',
          display: 'inline-block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '1.5rem'
        }}>
          🔥 Trending: 12 New Claims Today
        </div>
        <h1 style={{ fontSize: '3.5rem', lineHeight: '1.1', marginBottom: '1.5rem' }}>
          Be Seen. Be Known. <br />
          <span className="gradient-text">Own The Grid.</span>
        </h1>
        <p style={{
          fontSize: '1.2rem',
          color: 'var(--text-sub)',
          maxWidth: '550px',
          margin: '0 auto'
        }}>
          The exclusive digital billboard for creators, entrepreneurs, and friends.
          Only 100 spots available. Claim yours before it's gone.
        </p>
      </div>

      <SocialGrid isPremium={isPremium} />

      {/* Footer */}
      <footer style={{ marginTop: 'auto', paddingTop: '4rem', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ fontWeight: 700, fontSize: '1.2rem' }}>NEXUS NETWORK</div>
        <div style={{ color: 'var(--text-sub)', fontSize: '0.9rem' }}>
          © 2026 Nexus Inc. • Rules • Privacy
        </div>
      </footer>

    </div>
  )
}

export default App
