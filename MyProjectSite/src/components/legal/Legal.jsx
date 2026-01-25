import AuthLayout from './auth/AuthLayout';

const Legal = ({ onNavigate }) => {
    return (
        <div style={{ padding: '4rem 2rem', maxWidth: '800px', margin: '0 auto', fontFamily: 'sans-serif' }}>
            <button onClick={() => onNavigate('home')} style={{ marginBottom: '2rem', cursor: 'pointer', background: 'none', border: 'none', color: '#2563eb', fontWeight: 'bold' }}>← Back to Home</button>

            <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>Legal Notice (Mentions Légales)</h1>

            <div style={{ lineHeight: '1.6' }}>
                <h3>1. Publisher</h3>
                <p>The Service Nexus is published by:</p>
                <p>
                    <strong>Nexus Inc.</strong><br />
                    [Your Address / Siège Social]<br />
                    Contact: support@nexus-project.com
                </p>

                <br />

                <h3>2. Hosting</h3>
                <p>The site is hosted by:</p>
                <p>
                    <strong>Vercel Inc.</strong><br />
                    340 S Lemon Ave #4133<br />
                    Walnut, CA 91789<br />
                    USA
                </p>

                <br />

                <h3>3. Data Privacy</h3>
                <p>We collect email addresses for account management purposes only. Data is stored securely via Supabase. We do not sell your personal data to third parties.</p>
            </div>
        </div>
    );
};

export default Legal;
