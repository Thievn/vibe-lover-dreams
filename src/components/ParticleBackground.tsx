import { useEffect, useRef } from "react";
type ParticleBackgroundProps = {
  /**
   * When true, fills the nearest positioned ancestor instead of the viewport (avoids a second full-screen canvas).
   */
  contain?: boolean;
};

const ParticleBackground = ({ contain = false }: ParticleBackgroundProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    const particles: { x: number; y: number; vx: number; vy: number; size: number; alpha: number; color: string }[] = [];

    const colors = [
      "hsl(330, 100%, 62%)",
      "hsl(280, 55%, 58%)",
      "hsl(170, 100%, 55%)",
    ];

    const resize = () => {
      if (contain) {
        const el = hostRef.current;
        if (el && el.clientWidth > 0 && el.clientHeight > 0) {
          canvas.width = el.clientWidth;
          canvas.height = el.clientHeight;
        } else {
          canvas.width = Math.max(1, window.innerWidth);
          canvas.height = Math.max(1, window.innerHeight);
        }
      } else {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }
    };

    const createParticle = () => {
      return {
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        size: Math.random() * 2 + 0.5,
        alpha: Math.random() * 0.45 + 0.18,
        color: colors[Math.floor(Math.random() * colors.length)],
      };
    };

    resize();
    const particleCount = contain ? 36 : 60;
    for (let i = 0; i < particleCount; i++) {
      particles.push(createParticle());
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color.replace(")", ` / ${p.alpha})`);
        ctx.fill();
      });
      animationId = requestAnimationFrame(animate);
    };

    animate();
    window.addEventListener("resize", resize);
    let ro: ResizeObserver | undefined;
    if (contain && hostRef.current) {
      ro = new ResizeObserver(() => resize());
      ro.observe(hostRef.current);
    }

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resize);
      ro?.disconnect();
    };
  }, [contain]);

  if (contain) {
    return (
      <div ref={hostRef} className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <canvas ref={canvasRef} className="h-full w-full" style={{ opacity: 0.72 }} />
      </div>
    );
  }

  return <canvas ref={canvasRef} className="pointer-events-none fixed inset-0 z-0" style={{ opacity: 0.72 }} />;
};

export default ParticleBackground;
