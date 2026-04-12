import React, { useEffect, useState } from 'react';

interface AgeGateProps {
  onConfirm: () => void;
}

const AgeGate: React.FC&lt;AgeGateProps&gt; = ({ onConfirm }) =&gt; {
  const [showModal, setShowModal] = useState(true);

  useEffect(() =&gt; {
    const hasConfirmedAge = localStorage.getItem('ageConfirmed');
    if (hasConfirmedAge) {
      setShowModal(false);
      onConfirm();
    }
  }, [onConfirm]);

  const handleConfirm = () =&gt; {
    localStorage.setItem('ageConfirmed', 'true');
    setShowModal(false);
    onConfirm();
  };

  const handleDeny = () =&gt; {
    // Redirect to a safe page or close
    window.location.href = 'https://www.google.com'; // Example safe redirect
  };

  if (!showModal) return null;

  return (
    &lt;div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: 'rgba(0, 0, 0, 0.95)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 9999,
      fontFamily: "'Cinzel', serif", // Gothic font
      color: '#e0e0e0',
    }}&gt;
      &lt;div style={{
        textAlign: 'center',
        padding: '2rem',
        maxWidth: '500px',
        background: 'linear-gradient(145deg, #1a1a1a, #2d1b1b)',
        borderRadius: '15px',
        border: '2px solid #8b0000',
        boxShadow: '0 0 30px rgba(139, 0, 0, 0.5)',
      }}&gt;
        &lt;h1 style={{
          fontSize: '4rem',
          marginBottom: '1rem',
          color: '#ff4500',
          textShadow: '0 0 10px #ff4500',
        }}&gt;
          🔥 18+ 🔥
        &lt;/h1&gt;
        &lt;p style={{
          fontSize: '1.2rem',
          lineHeight: '1.6',
          marginBottom: '2rem',
          color: '#ccc',
        }}&gt;
          This site contains adult content, AI companions, and real-time Lovense toy control. You must be 18 or older to enter.
        &lt;/p&gt;
        &lt;div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}&gt;
          &lt;button
            onClick={handleConfirm}
            style={{
              padding: '1rem 2rem',
              fontSize: '1.1rem',
              background: 'linear-gradient(145deg, #228b22, #ff1493)',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              cursor: 'pointer',
              boxShadow: '0 0 20px rgba(255, 20, 147, 0.5)',
              transition: 'all 0.3s ease',
            }}
            onMouseEnter={(e) =&gt; {
              e.currentTarget.style.boxShadow = '0 0 30px rgba(255, 20, 147, 0.8)';
              e.currentTarget.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) =&gt; {
              e.currentTarget.style.boxShadow = '0 0 20px rgba(255, 20, 147, 0.5)';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          &gt;
            I am 18+
          &lt;/button&gt;
          &lt;button
            onClick={handleDeny}
            style={{
              padding: '1rem 2rem',
              fontSize: '1.1rem',
              background: 'linear-gradient(145deg, #333, #555)',
              color: 'white',
              border: '1px solid #666',
              borderRadius: '10px',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
            }}
            onMouseEnter={(e) =&gt; {
              e.currentTarget.style.background = 'linear-gradient(145deg, #555, #777)';
            }}
            onMouseLeave={(e) =&gt; {
              e.currentTarget.style.background = 'linear-gradient(145deg, #333, #555)';
            }}
          &gt;
            I am not 18+
          &lt;/button&gt;
        &lt;/div&gt;
      &lt;/div&gt;
    &lt;/div&gt;
  );
};

export default AgeGate;
