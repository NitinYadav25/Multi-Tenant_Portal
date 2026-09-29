import React, { useEffect, useRef } from 'react';

export const AnimatedBackground = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    let mouseX = -999;
    let mouseY = -999;

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const isReducedMotion = mediaQuery.matches;

    // Scale particles by viewport area (max 80)
    const particleCount = Math.min(80, Math.max(25, Math.floor((width * height) / 20000)));

    let particles = Array.from({ length: particleCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      r: Math.random() * 1.8 + 0.9
    }));

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      const count = Math.min(80, Math.max(25, Math.floor((width * height) / 20000)));
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        r: Math.random() * 1.8 + 0.9
      }));
      if (isReducedMotion) {
        drawFrame();
      }
    };

    const handleMouseMove = (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    };

    const handleMouseLeave = () => {
      mouseX = -999;
      mouseY = -999;
    };

    const drawFrame = () => {
      ctx.clearRect(0, 0, width, height);

      // Check current theme background color
      const isDark =
        document.documentElement.getAttribute('data-theme') === 'dark' ||
        (document.documentElement.getAttribute('data-theme') !== 'light' &&
          window.matchMedia('(prefers-color-scheme: dark)').matches);

      const color = isDark ? '165, 155, 255' : '109, 93, 252';

      // Update and draw particles
      for (const p of particles) {
        if (!isReducedMotion) {
          p.x += p.vx;
          p.y += p.vy;

          if (p.x < 0 || p.x > width) p.vx *= -1;
          if (p.y < 0 || p.y > height) p.vy *= -1;

          // Repel from mouse cursor
          const dx = p.x - mouseX;
          const dy = p.y - mouseY;
          const dist = Math.hypot(dx, dy);
          if (dist < 120 && dist > 0) {
            p.x += (dx / dist) * 1.6;
            p.y += (dy / dist) * 1.6;
          }
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${color}, 0.75)`;
        ctx.fill();
      }

      // Connect nearby particles with subtle faded lines
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const p1 = particles[i];
          const p2 = particles[j];
          const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);

          if (dist < 130) {
            ctx.strokeStyle = `rgba(${color}, ${0.25 * (1 - dist / 130)})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }
      }

      if (!isReducedMotion) {
        animationFrameId = requestAnimationFrame(drawFrame);
      }
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);

    drawFrame();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, []);

  return (
    <>
      <div className="bg" aria-hidden="true">
        <i className="bl b1" />
        <i className="bl b2" />
        <i className="bl b3" />
        <i className="bl b4" />
        <div className="grid" />
      </div>
      <canvas id="fx" ref={canvasRef} aria-hidden="true" />
    </>
  );
};
