"use client";

import { useEffect, useRef, useState } from "react";

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  baseX: number;
  baseY: number;
  phase: number;
  speed: number;
  color: string;
};

const BRAND_COLORS = [
  "rgba(34, 211, 238, 0.5)",
  "rgba(59, 130, 246, 0.5)",
  "rgba(139, 92, 246, 0.5)",
];

function pickColor(): string {
  return BRAND_COLORS[Math.floor(Math.random() * BRAND_COLORS.length)];
}

function lineColorFor(source: string, dist: number, maxLine: number): string {
  const alpha = 0.08 * (1 - dist / maxLine);
  return source.replace(/0\.5\)$/, `${alpha.toFixed(3)})`);
}

export default function CursorMesh() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    const particles: Particle[] = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const initParticles = () => {
      const count = Math.min(50, Math.floor((canvas.width * canvas.height) / 28000));
      particles.length = 0;
      for (let i = 0; i < count; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        particles.push({
          x,
          y,
          baseX: x,
          baseY: y,
          vx: (Math.random() - 0.5) * 0.25,
          vy: (Math.random() - 0.5) * 0.25,
          radius: Math.random() * 1.8 + 0.6,
          phase: Math.random() * Math.PI * 2,
          speed: Math.random() * 0.6 + 0.2,
          color: pickColor(),
        });
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };

    resize();
    initParticles();
    window.addEventListener("resize", () => {
      resize();
      initParticles();
    });
    window.addEventListener("mousemove", handleMouseMove);

    const animate = (now: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const mouseX = mouseRef.current.x;
      const mouseY = mouseRef.current.y;
      const t = now * 0.001;

      const halo = ctx.createRadialGradient(mouseX, mouseY, 0, mouseX, mouseY, 120);
      halo.addColorStop(0, "rgba(139, 92, 246, 0.10)");
      halo.addColorStop(0.5, "rgba(99, 102, 241, 0.05)");
      halo.addColorStop(1, "rgba(99, 102, 241, 0)");
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(mouseX, mouseY, 120, 0, Math.PI * 2);
      ctx.fill();

      const maxDist = 250;
      const maxLine = 150;
      const viewW = canvas.width;
      const viewH = canvas.height;
      const margin = 100;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        if (p.x < -margin || p.x > viewW + margin || p.y < -margin || p.y > viewH + margin) {
          continue;
        }

        const dx = mouseX - p.x;
        const dy = mouseY - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < maxDist && dist > 0) {
          const force = (maxDist - dist) / maxDist;
          p.vx -= (dx / dist) * force * 0.02;
          p.vy -= (dy / dist) * force * 0.02;
        }

        p.vx += (p.baseX - p.x) * 0.0005;
        p.vy += (p.baseY - p.y) * 0.0005;

        p.vx *= 0.98;
        p.vy *= 0.98;

        const wobbleX = Math.sin(t + p.phase) * p.speed * 0.3;
        const wobbleY = Math.cos(t * 0.8 + p.phase) * p.speed * 0.3;

        p.x += p.vx + wobbleX * 0.15;
        p.y += p.vy + wobbleY * 0.15;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
      }

      for (let i = 0; i < particles.length; i++) {
        const a = particles[i];
        if (a.x < -margin || a.x > viewW + margin || a.y < -margin || a.y > viewH + margin) continue;
        for (let j = i + 1; j < particles.length; j++) {
          const b = particles[j];
          if (b.x < -margin || b.x > viewW + margin || b.y < -margin || b.y > viewH + margin) continue;
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < maxLine) {
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = lineColorFor(a.color, dist, maxLine);
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, [mounted]);

  if (!mounted) return null;

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 h-full w-full"
      style={{ opacity: 0.6 }}
    />
  );
}
