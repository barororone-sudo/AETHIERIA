import { useState, useEffect } from 'react'
import './App.css'
import SocialGrid from './components/SocialGrid'
import PremiumControl from './components/PremiumControl'
import LiveTraffic from './components/LiveTraffic'
import KingSpot from './components/KingSpot'
import { supabase } from './supabaseClient'

// Auth Components
import Login from './components/auth/Login'
import Register from './components/auth/Register'
import Verify from './components/auth/Verify'

// Legal Components
import Terms from './components/legal/Terms'
import Legal from './components/legal/Legal'

function App() {
  const [view, setView] = useState('home'); // home, login, register, verify, terms, legal
  const [isPremium, setIsPremium] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [session, setSession] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) setView('home'); // Redirect to home on login
    });

    return () => subscription.unsubscribe();
  }, []);

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

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // Render Views
  if (view === 'login') return <Login onNavigate={setView} onLogin={handleLogin} />;
  if (view === 'register') return <Register onNavigate={setView} onRegisterSuccess={handleRegisterSuccess} />;
  if (view === 'verify') return <Verify email={userEmail} onVerifySuccess={handleVerifySuccess} />;
  if (view === 'terms') return <Terms onNavigate={setView} />;
  if (view === 'legal') return <Legal onNavigate={setView} />;

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
        <div style={{ display: 'flex', gap: '20px', fontSize: '0.9rem', fontWeight: 600, alignItems: 'center' }}>
          <span>Members</span>
          <span>Advertise</span>

          {!session ? (
            <button
              onClick={() => setView('login')}
              style={{ background: '#1f2937', color: '#fff', border: 'none', padding: '6px 16px', borderRadius: '50px', marginLeft: '10px', cursor: 'pointer' }}
            >
              Login
            </button>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ color: '#2563eb' }}>My Profile</span>
              <button
                onClick={handleLogout}
                style={{ background: 'transparent', color: '#6b7280', border: '1px solid #e5e7eb', padding: '4px 12px', borderRadius: '50px', cursor: 'pointer', fontSize: '0.8rem' }}
              >
                Logout
              </button>
            </div>
          )}

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

      {/* KING OF THE HILL FEATURE */}
      <div style={{ width: '100%', maxWidth: '600px', margin: '0 auto 3rem auto', padding: '0 20px' }}>
        <KingSpot />
      </div>

      <SocialGrid isPremium={isPremium} />

      {/* Footer */}
      <footer style={{ marginTop: 'auto', paddingTop: '4rem', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ fontWeight: 700, fontSize: '1.2rem' }}>NEXUS NETWORK</div>
        <div style={{ color: 'var(--text-sub)', fontSize: '0.9rem', display: 'flex', gap: '20px', justifyContent: 'center' }}>
          <span>© 2026 Nexus Inc.</span>
          <span onClick={() => setView('terms')} style={{ cursor: 'pointer', textDecoration: 'underline' }}>Terms of Use</span>
          <span onClick={() => setView('legal')} style={{ cursor: 'pointer', textDecoration: 'underline' }}>Legal Notice</span>
        </div>
      </footer>

    </div>
  )
}

export default App
