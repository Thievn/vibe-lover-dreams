import React from 'react';

const TermsOfService: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto p-6 bg-background text-foreground min-h-screen">
      <h1 className="text-4xl font-bold mb-8 text-center">Terms of Service</h1>
      <p className="mb-4 text-muted-foreground">Last updated: October 2024</p>
      
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
        <p className="mb-4">Welcome to Vibe Lover Dreams (the "Service"). By accessing or using our website, you agree to be bound by these Terms of Service ("Terms"). If you do not agree, please do not use the Service.</p>
        <p className="mb-4">We provide AI-generated adult content, companions, and interactive features for users 18+ only. All content is fictional and simulated.</p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">2. Eligibility</h2>
        <p className="mb-4">You must be at least 18 years old to use the Service. By using it, you confirm your age and compliance with local laws. We may require age verification.</p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">3. User Conduct</h2>
        <p className="mb-4">You agree not to: (a) upload harmful content, (b) harass others, (c) violate laws, or (d) reverse-engineer our tech. We may terminate accounts for violations.</p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">4. Content Ownership</h2>
        <p className="mb-4">We own all AI-generated content. You retain rights to your inputs but grant us a license to improve the Service. No real persons are depicted.</p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">5. Privacy and Data</h2>
        <p className="mb-4">See our <a href="/privacy-policy" className="text-primary hover:underline">Privacy Policy</a> for details. We do not store sensitive chat logs without consent.</p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">6. Limitation of Liability</h2>
        <p className="mb-4">The Service is provided "as is." We are not liable for damages from use. Fantasy content is not real advice.</p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">7. Changes and Termination</h2>
        <p className="mb-4">We may update these Terms. Continued use implies acceptance. We can terminate access anytime.</p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-4">8. Contact</h2>
        <p>Email: support@vibloverdreams.com for questions.</p>
      </section>

      <p className="text-center text-sm text-muted-foreground mt-8">
        These Terms are governed by [Your Jurisdiction] laws. Consult a lawyer for legal advice.
      </p>
    </div>
  );
};

export default TermsOfService;
