import React from 'react';

const PrivacyPolicy: React.FC = () => {
  return (
    &lt;div
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
    &gt;
      &lt;h1
        style={{
          color: '#ff4500',
          textAlign: 'center',
          fontSize: '2.5rem',
          marginBottom: '2rem',
          textShadow: '0 0 10px #ff4500',
        }}
      &gt;
        Privacy Policy
      &lt;/h1&gt;
      &lt;p&gt;
        &lt;strong&gt;Effective Date: [Insert Date]&lt;/strong&gt;
      &lt;/p&gt;
      &lt;p&gt;
        At LustForge AI ("we," "us," or "our"), we respect your privacy. This Privacy Policy explains how we collect, use, and protect information when you use our website (the "Site"), services, AI companions, and Lovense integrations (collectively, the "Services"). By using the Services, you consent to this policy.
      &lt;/p&gt;

      &lt;h2
        style={{
          color: '#ff4500',
          borderBottom: '1px solid #8b0000',
          paddingBottom: '0.5rem',
          marginTop: '2rem',
        }}
      &gt;
        1. Information We Collect
      &lt;/h2&gt;
      &lt;p&gt;
        &lt;strong&gt;Personal Information:&lt;/strong&gt; We collect minimal data, such as email for waitlist signups or account creation. No payment details are stored directly.
      &lt;/p&gt;
      &lt;p&gt;
        &lt;strong&gt;Usage Data:&lt;/strong&gt; IP address, browser type, and interaction logs (e.g., session timestamps) for security and analytics. Private chats are ephemeral and not stored post-session to protect sensitive adult content.
      &lt;/p&gt;
      &lt;p&gt;
        &lt;strong&gt;Lovense Integration:&lt;/strong&gt; No toy-specific data (e.g., vibration patterns) is stored; commands are session-only.
      &lt;/p&gt;
      &lt;p&gt;We do not collect age verification documents or sensitive personal info beyond what's necessary.&lt;/p&gt;

      &lt;h2
        style={{
          color: '#ff4500',
          borderBottom: '1px solid #8b0000',
          paddingBottom: '0.5rem',
          marginTop: '2rem',
        }}
      &gt;
        2. How We Use Information
      &lt;/h2&gt;
      &lt;p&gt;
        Data is used to: provide Services (e.g., AI responses), improve functionality, enforce 18+ restrictions, and comply with laws. We do not store private NSFW chats or fantasies long-term. Aggregated, anonymized data may be used for analytics.
      &lt;/p&gt;

      &lt;h2
        style={{
          color: '#ff4500',
          borderBottom: '1px solid #8b0000',
          paddingBottom: '0.5rem',
          marginTop: '2rem',
        }}
      &gt;
        3. Sharing Information
      &lt;/h2&gt;
      &lt;p&gt;
        We do not sell or share personal data. Sharing occurs only: with service providers (e.g., cloud hosting) under strict agreements, for legal compliance, or if the business is sold (with notice). No third-party marketing.
      &lt;/p&gt;

      &lt;h2
        style={{
          color: '#ff4500',
          borderBottom: '1px solid #8b0000',
          paddingBottom: '0.5rem',
          marginTop: '2rem',
        }}
      &gt;
        4. Cookies and Tracking
      &lt;/h2&gt;
      &lt;p&gt;
        We use essential cookies for functionality (e.g., age gate localStorage). No tracking cookies for ads. You can manage via browser settings.
      &lt;/p&gt;

      &lt;h2
        style={{
          color: '#ff4500',
          borderBottom: '1px solid #8b0000',
          paddingBottom: '0.5rem',
          marginTop: '2rem',
        }}
      &gt;
        5. Data Security
      &lt;/h2&gt;
      &lt;p&gt;
        We implement reasonable security (e.g., encryption, access controls) but cannot guarantee absolute security. Report breaches to [insert email].
      &lt;/p&gt;

      &lt;h2
        style={{
          color: '#ff4500',
          borderBottom: '1px solid #8b0000',
          paddingBottom: '0.5rem',
          marginTop: '2rem',
        }}
      &gt;
        6. Your Rights
      &lt;/h2&gt;
      &lt;p&gt;
        Under applicable laws (e.g., GDPR/CCPA), you may access, correct, delete, or opt-out of data processing. Contact us for requests. For EU users, we are the data controller.
      &lt;/p&gt;

      &lt;h2
        style={{
          color: '#ff4500',
          borderBottom: '1px solid #8b0000',
          paddingBottom: '0.5rem',
          marginTop: '2rem',
        }}
      &gt;
        7. Children's Privacy
      &lt;/h2&gt;
      &lt;p&gt;
        Services are 18+ only. We do not knowingly collect data from minors.
      &lt;/p&gt;

      &lt;h2
        style={{
          color: '#ff4500',
          borderBottom: '1px solid #8b0000',
          paddingBottom: '0.5rem',
          marginTop: '2rem',
        }}
      &gt;
        8. International Transfers
      &lt;/h2&gt;
      &lt;p&gt;
        Data may be processed in [Insert Locations, e.g., US/EU]. We ensure adequate protections.
      &lt;/p&gt;

      &lt;h2
        style={{
          color: '#ff4500',
          borderBottom: '1px solid #8b0000',
          paddingBottom: '0.5rem',
          marginTop: '2rem',
        }}
      &gt;
        9. Changes to Policy
      &lt;/h2&gt;
      &lt;p&gt;
        Updates will be posted here; significant changes notified via Site.
      &lt;/p&gt;

      &lt;p style={{ textAlign: 'center', marginTop: '2rem', fontSize: '0.9rem', color: '#ccc' }}&gt;
        For questions, contact [insert email]. See our{' '}
        &lt;a href="/terms-of-service" style={{ color: '#ff1493', textDecoration: 'none' }}&gt;
          Terms of Service
        &lt;/a&gt;{' '}
        for more.
      &lt;/p&gt;
    &lt;/div&gt;
  );
};

export default PrivacyPolicy;
