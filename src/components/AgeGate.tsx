import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';  // Optional, but available now

interface AgeGateProps {
  onConfirm: () => void;
}

const AgeGate: React.FC<AgeGateProps> = ({ onConfirm }) => {
  const [showModal, setShowModal] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const hasConfirmedAge = localStorage.getItem('ageConfirmed');
    if (hasConfirmedAge === 'true') {
      setShowModal(false);
      onConfirm();
    }
  }, [onConfirm]);

  const handleConfirm = () => {
    localStorage.setItem('ageConfirmed', 'true');
    setShowModal(false);
    onConfirm();
  };

  const handleDeny = () => {
    window.location.href = 'https://en.wikipedia.org/wiki/Main_Page'; // Safe redirect
  };

  if (!showModal) return null;

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-sm flex items-center justify-center z-50 p-4 font-sans">
      {/* Subtle pattern overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(139,0,0,0.1)_1px,transparent_1px)] bg-[size:50px_50px] opacity-30" />
      
      <div className="relative bg-background/90 backdrop-blur-md border border-border/50 rounded-2xl shadow-2xl max-w-md w-full mx-4 p-8 text-center animate-fade-in">
        <h1 className="text-6xl font-bold text-primary mb-6 drop-shadow-lg">
          18+
        </h1>
        <p className="text-foreground/90 text-lg leading-relaxed mb-8">
          This site contains adult content, AI companions, and real-time Lovense toy control. 
          You must be 18 or older to enter.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={handleConfirm}
            className="px-8 py-4 bg-gradient-to-r from-primary to-secondary text-background font-semibold rounded-xl shadow-lg hover:shadow-primary/50 transition-all duration-300 transform hover:scale-105 min-w-[140px]"
          >
            I am 18+
          </button>
          <button
            onClick={handleDeny}
            className="px-8 py-4 bg-muted text-foreground border border-border font-semibold rounded-xl hover:bg-muted/80 transition-all duration-300 min-w-[140px]"
          >
            I am under 18
          </button>
        </div>
        {/* Footer links - now SPA-safe */}
        <p className="text-xs text-muted-foreground mt-6">
          See our{' '}
          <a href="/terms-of-service" className="text-primary hover:underline">Terms</a>,{' '}
          <a href="/privacy-policy" className="text-primary hover:underline">Privacy</a>, and{' '}
          <a href="/18-plus-disclaimer" className="text-primary hover:underline">18+ Disclaimer</a>.
        </p>
      </div>
    </div>
  );
};

export default AgeGate;