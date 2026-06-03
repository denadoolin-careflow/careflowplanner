// Lightweight canvas confetti burst — no deps. Renders once and cleans up.
// Designed for caregiver tone: soft sage/blush/cream/plum/gold flakes.

const COLORS = [
  "hsl(150 35% 55%)", // sage
  "hsl(8 70% 70%)",   // blush
  "hsl(40 80% 70%)",  // gold
  "hsl(280 35% 65%)", // plum
  "hsl(35 50% 88%)",  // cream
];

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  size: number; rot: number; vr: number;
  color: string; life: number;
}

export function fireConfetti(opts?: { x?: number; y?: number; count?: number }) {
  if (typeof window === "undefined") return;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

  const dpr = window.devicePixelRatio || 1;
  const w = window.innerWidth;
  const h = window.innerHeight;
  const canvas = document.createElement("canvas");
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.cssText =
    `position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:9999;`;
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  if (!ctx) { canvas.remove(); return; }
  ctx.scale(dpr, dpr);

  const cx = opts?.x ?? w / 2;
  const cy = opts?.y ?? h / 2.4;
  const count = opts?.count ?? 80;
  const parts: Particle[] = Array.from({ length: count }, () => {
    const angle = Math.random() * Math.PI * 2;
    const speed = 3 + Math.random() * 6;
    return {
      x: cx,
      y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 2,
      size: 5 + Math.random() * 5,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.3,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      life: 1,
    };
  });

  let raf = 0;
  const start = performance.now();
  const tick = (now: number) => {
    const t = (now - start) / 1000;
    ctx.clearRect(0, 0, w, h);
    let alive = 0;
    for (const p of parts) {
      p.vy += 0.18; // gravity
      p.vx *= 0.99;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      p.life = Math.max(0, 1 - t / 1.6);
      if (p.life <= 0) continue;
      alive++;
      ctx.save();
      ctx.globalAlpha = p.life;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.66);
      ctx.restore();
    }
    if (alive > 0 && t < 2) {
      raf = requestAnimationFrame(tick);
    } else {
      cancelAnimationFrame(raf);
      canvas.remove();
    }
  };
  raf = requestAnimationFrame(tick);
}