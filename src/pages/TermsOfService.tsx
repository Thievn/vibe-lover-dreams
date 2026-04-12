import React from 'react';

const Terms: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Terms of Service</h1>
      <p className="mb-4">These are the terms of service for Vibe Lover Dreams. Please read them carefully.</p>
      <p className="mb-4">Last updated: [Date]</p>
      {/* Add full terms content here */}
      <section className="mb-6">
        <h2 className="text-2xl font-semibold mb-2">1. Introduction</h2>
        <p className="mb-2">This website provides [description].</p>
      </section>
      {/* More sections as needed */}
    </div>
  );
};

export default Terms;
