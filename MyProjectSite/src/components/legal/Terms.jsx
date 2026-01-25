import AuthLayout from './auth/AuthLayout';

const Terms = ({ onNavigate }) => {
    return (
        <div style={{ padding: '4rem 2rem', maxWidth: '800px', margin: '0 auto', fontFamily: 'sans-serif' }}>
            <button onClick={() => onNavigate('home')} style={{ marginBottom: '2rem', cursor: 'pointer', background: 'none', border: 'none', color: '#2563eb', fontWeight: 'bold' }}>← Back to Home</button>

            <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>Terms of Use</h1>
            <p style={{ color: '#666', marginBottom: '2rem' }}>Last updated: January 2026</p>

            <div style={{ lineHeight: '1.6' }}>
                <h3>1. Introduction</h3>
                <p>Welcome to Nexus ("we," "our," or "us"). By accessing or using our website, you agree to be bound by these Terms of Use.</p>

                <br />

                <h3>2. Description of Service</h3>
                <p>Nexus is a digital social grid that allows users to rent virtual space to display their profile or advertisement.</p>

                <br />

                <h3>3. User Conduct</h3>
                <p>You are responsible for the content you display in your spot. We prohibit:</p>
                <ul>
                    <li>Illegal content or hate speech.</li>
                    <li>Misleading advertising or scams.</li>
                    <li>Adult content (NSFW).</li>
                </ul>
                <p>We reserve the right to remove any content without refund if it violates these rules.</p>

                <br />

                <h3>4. Payments</h3>
                <p>Payments for spots are processed via Stripe. Subscriptions are billed monthly. You may cancel at any time, but your spot will be released immediately upon cancellation.</p>

                <br />

                <h3>5. Limitation of Liability</h3>
                <p>Nexus is provided "as is". We are not responsible for any losses associated with the use of our service.</p>
            </div>
        </div>
    );
};

export default Terms;
