import React from 'react';

const EighteenPlusDisclaimer: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">18+ Disclaimer</h1>
      <p className="mb-4">This website contains adult content intended for viewers 18 years of age or older.</p>
      <p className="mb-4">By accessing this site, you confirm that you are at least 18 years old and agree to view such material.</p>
      <p className="mb-4">If you are under 18, please leave this site immediately.</p>
      {/* Add more details as needed */}
    </div>
  );
};

export default EighteenPlusDisclaimer;