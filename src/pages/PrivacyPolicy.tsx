import React from 'react';

const PrivacyPolicy: React.FC = () => {
  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#1a1a1a',
        color: '#e0e0e0',
        fontFamily: "'Cinzel', serif",
        padding: '2rem',
        lineHeight: '1.6',
        maxWidth: '800px',
        margin: '0 auto',
      }}
    >
      <h1
        style={{
          color: '#ff4500',
          textAlign: 'center',
          fontSize: '2.5rem',
          marginBottom: '2rem',
          textShadow: '0 0 10px #ff4500',
        }}
      >
        Privacy Policy
      </h1>
      <p>
        <strong>Effective Date: [Insert Date]</strong>
      </p>
      <p>
        At LustForge AI ("we," "us," or "our"), we respect your privacy. This Privacy Policy explains how we collect, use, and protect information when you use our website (the "Site"), services, AI companions, and Lovense integrations (collectively, the "Services"). By using the Services, you consent to this policy.
      </p>

      <h2
        style={{
          color: '#ff4500',
          borderBottom: '1px solid #8b0000',
          paddingBottom: '0.5rem',
          marginTop: '2rem',
        }}
      >
        1. Information We Collect
      </h2>
      <p>
        <strong>Personal Information:</strong> We collect minimal data, such as email for waitlist signups or account creation. No payment details are stored directly.
      </p>
      <p>
        <strong>Usage Data:</strong> IP address, browser type, and interaction logs (e.g., session timestamps) for security and analytics. Private chats are ephemeral and not stored post-session to protect sensitive adult content.
      </p>
      <p>
        <strong>Lovense Integration:</strong> No toy-specific data (e.g., vibration patterns) is stored; commands are session-only.
      </p>
      <p>We do not collect age verification documents or sensitive personal info beyond what's necessary.</p>

      <h2
        style={{
          color: '#ff4500',
          borderBottom: '1px solid #8b0000',
          paddingBottom: '0.5rem',
          marginTop: '2rem',
        }}
      >
        2. How We Use Information
      </h2>
      <p>
        Data is used to: provide Services (e.g., AI responses), improve functionality, enforce 18+ restrictions, and comply with laws. We do not store private NSFW chats or fantasies long-term. Aggregated, anonymized data may be used for analytics.
      </p>

      <h2
        style={{
          color: '#ff4500',
          borderBottom: '1px solid #8b0000',
          paddingBottom: '0.5rem',
          marginTop: '2rem',
        }}
      >
        3. Sharing Information
      </h2>
      <p>
        We do not sell or share personal data. Sharing occurs only: with service providers (e.g., cloud hosting) under strict agreements, for legal compliance, or if the business is sold (with notice). No third-party marketing.
      </p>

      <h2
        style={{
          color: '#ff4500',
          borderBottom: '1px solid #8b0000',
          paddingBottom: '0.5rem',
          marginTop: '2rem',
        }}
      >
        4. Cookies and Tracking
      </h2>
      <p>
        We use essential cookies for functionality (e.g., age gate localStorage). No tracking cookies for ads. You can manage via browser settings.
      </p>

      <h2
        style={{
          color: '#ff4500',
          borderBottom: '1px solid #8b0000',
          paddingBottom: '0.5rem',
          marginTop: '2rem',
        }}
      >
        5. Data Security
      </h2>
      <p>
        We implement reasonable security (e.g., encryption, access controls) but cannot guarantee absolute security. Report breaches to [insert email].
      </p>

      <h2
        style={{
          color: '#ff4500',
          borderBottom: '1px solid #8b0000',
          paddingBottom: '0.5rem',
          marginTop: '2rem',
        }}
      >
        6. Your Rights
      </h2>
      <p>
        Under applicable laws (e.g., GDPR/CCPA), you may access, correct, delete, or opt-out of data processing. Contact us for requests. For EU users, we are the data controller.
      </p>

      <h2
        style={{
          color: '#ff4500',
          borderBottom: '1px solid #8b0000',
          paddingBottom: '0.5rem',
          marginTop: '2rem',
        }}
      >
        7. Children's Privacy
      </h2>
      <p>
        Services are 18+ only. We do not knowingly collect data from minors.
      </p>

      <h2
        style={{
          color: '#ff4500',
          borderBottom: '1px solid #8b0000',
          paddingBottom: '0.5rem',
          marginTop: '2rem',
        }}
      >
        8. International Transfers
      </h2>
      <p>
        Data may be processed in [Insert Locations, e.g., US/EU]. We ensure adequate protections.
      </p>

      <h2
        style={{
          color: '#ff4500',
          borderBottom: '1px solid #8b0000',
          paddingBottom: '0.5rem',
          marginTop: '2rem',
        }}
      >
        9. Changes to Policy
      </h2>
      <p>
        Updates will be posted here; significant changes notified via Site.
      </p>

      <p style={{ textAlign: 'center', marginTop: '2rem', fontSize: '0.9rem', color: '#ccc' }}>
        For questions, contact [insert email]. See our{' '}
        <a href="/terms-of-service" style={{ color: '#ff1493', textDecoration: 'none' }}>
          Terms of Service
        </a>{' '}
        for more.
      </p>
    </div>
  );
};

export default PrivacyPolicy;
