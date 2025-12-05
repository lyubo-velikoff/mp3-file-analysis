"use client";

import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
}

export default function ParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const mouseRef = useRef({ x: 0, y: 0 });
  const animationRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const isMobile = () =>
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      ) || window.innerWidth <= 768;

    const getParticleCount = () => (isMobile() ? 50 : 250);

    const createParticle = (): Particle => {
      const mobile = isMobile();
      return {
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * (mobile ? 0.2 : 0.5),
        vy: (Math.random() - 0.5) * (mobile ? 0.2 : 0.5),
        size: mobile ? Math.random() * 2 + 1 : Math.random() * 3 + 2,
        opacity: mobile ? Math.random() * 0.2 + 0.05 : Math.random() * 0.3 + 0.1,
      };
    };

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;

      // Reinitialize particles on resize
      const count = getParticleCount();
      particlesRef.current = [];
      for (let i = 0; i < count; i++) {
        particlesRef.current.push(createParticle());
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const mobile = isMobile();
      const connectionDistance = mobile ? 80 : 120;

      particlesRef.current.forEach((particle, i) => {
        // Mouse interaction (desktop only)
        if (!mobile) {
          const dx = mouseRef.current.x - particle.x;
          const dy = mouseRef.current.y - particle.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < 100) {
            const force = (100 - distance) / 100;
            particle.vx -= (dx / distance) * force * 0.2;
            particle.vy -= (dy / distance) * force * 0.2;
          }
        }

        // Update position
        particle.x += particle.vx;
        particle.y += particle.vy;

        // Damping
        particle.vx *= 0.99;
        particle.vy *= 0.99;

        // Bounce off edges
        if (particle.x <= 0 || particle.x >= canvas.width) {
          particle.vx = -particle.vx * 0.8;
          particle.x = particle.x <= 0 ? 0 : canvas.width;
        }
        if (particle.y <= 0 || particle.y >= canvas.height) {
          particle.vy = -particle.vy * 0.8;
          particle.y = particle.y <= 0 ? 0 : canvas.height;
        }

        // Draw connections (spider web effect)
        for (let j = i + 1; j < particlesRef.current.length; j++) {
          const other = particlesRef.current[j];
          const dx = particle.x - other.x;
          const dy = particle.y - other.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < connectionDistance) {
            const opacity = (1 - distance / connectionDistance) * 0.3;
            ctx.beginPath();
            ctx.moveTo(particle.x, particle.y);
            ctx.lineTo(other.x, other.y);
            ctx.strokeStyle = `rgba(128, 128, 128, ${opacity})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }

        // Draw particle (smaller dots for web effect)
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(128, 128, 128, " + particle.opacity + ")";
        ctx.fill();
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    // Initialize
    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", handleMouseMove);
    animate();

    // Cleanup
    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(animationRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0 pointer-events-none"
    />
  );
}
