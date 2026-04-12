import React, { useEffect, useState } from 'react';

interface AgeGateProps {
  onConfirm: () => void;
}

const AgeGate: React.FC<AgeGateProps> = ({ onConfirm }) => {
  const [showModal, setShowModal] = useState(true);

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
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(0, 0, 0, 0.98)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999,
        fontFamily: "'Cinzel', serif",
        color: '#e0e0e0',
        overflow: 'hidden',
      }}
    >
      {/* Subtle gothic background pattern */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundImage: 'radial-gradient(circle, rgba(139, 0, 0, 0.1) 1px, transparent 1px)',
          backgroundSize: '50px 50px',
          opacity: 0.3,
        }}
      />
      <div
        style={{
          textAlign: 'center',
          padding: '3rem 2rem',
          maxWidth: '600px',
          background: 'linear-gradient(145deg, #1a1a1a, #2d1b1b)',
          borderRadius: '20px',
          border: '2px solid #8b0000',
          boxShadow: '0 0 40px rgba(139, 0, 0, 0.6), inset 0 0 20px rgba(0, 0, 0, 0.5)',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <h1
          style={{
            fontSize: '5rem',
            marginBottom: '1.5rem',
            color: '#ff4500',
            textShadow: '0 0 15px #ff4500, 0 0 30px #ff4500',
            letterSpacing: '0.1em',
            fontWeight: '700',
          }}
        >
          🔥 18+ 🔥
        </h1>
        <p
          style={{
            fontSize: '1.3rem',
            lineHeight: '1.7',
            marginBottom: '3rem',
            color: '#d0d0d0',
            fontWeight: '400',
          }}
        >
          This site contains adult content, AI companions, and real-time Lovense toy control. You must be 18 or older to enter.
        </p>
        <div
          style={{
            display: 'flex',
            gap: '1.5rem',
            justifyContent: 'center',
            flexWrap: 'wrap',
          }}
        >
          <button
            onClick={handleConfirm}
            style={{
              padding: '1.2rem 3rem',
              fontSize: '1.2rem',
              background: 'linear-gradient(145deg, #228b22, #ff1493)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
              boxShadow: '0 0 25px rgba(255, 20, 147, 0.6)',
              transition: 'all 0.3s ease',
              fontFamily: 'inherit',
              fontWeight: '600',
              letterSpacing: '0.05em',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 0 35px rgba(255, 20, 147, 0.9)';
              e.currentTarget.style.transform = 'scale(1.05) translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '0 0 25px rgba(255, 20, 147, 0.6)';
              e.currentTarget.style.transform = 'scale(1) translateY(0)';
            }}
          >
            I am 18+
          </button>
          <button
            onClick={handleDeny}
            style={{
              padding: '1.2rem 3rem',
              fontSize: '1.2rem',
              background: 'linear-gradient(145deg, #333333, #555555)',
              color: 'white',
              border: '1px solid #666666',
              borderRadius: '12px',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              fontFamily: 'inherit',
              fontWeight: '600',
              letterSpacing: '0.05em',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'linear-gradient(145deg, #555555, #777777)';
              e.currentTarget.style.borderColor = '#888888';
              e.currentTarget.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'linear-gradient(145deg, #333333, #555555)';
              e.currentTarget.style.borderColor = '#666666';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            I am not 18+
          </button>
        </div>
        {/* Small legal links footer */}
        <p style={{ fontSize: '0.8rem', marginTop: '1.5rem', color: '#999' }}>
          See our{' '}
          <a href="/terms-of-service" style={{ color: '#ff1493' }}>Terms of Service</a>,{' '}
          <a href="/privacy-policy" style={{ color: '#ff1493' }}>Privacy Policy</a>, and{' '}
          <a href="/18-plus-disclaimer" style={{ color: '#ff1493' }}>18+ Disclaimer</a>.
        </p>
      </div>
    </div>
  );
};

export default AgeGate;