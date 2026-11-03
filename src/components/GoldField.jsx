import { useEffect, useRef } from 'react';

/*
 * "Knowledge Sphere" — a rotating 3D globe of gold particles drawn on canvas.
 * Points near the cursor are pushed away and threads of light connect them.
 * Scrolling unravels the sphere into a spiral.
 *
 * Performance: pauses when off-screen or when the tab is hidden, caps pixel ratio,
 * uses fewer particles on phones / weak devices, and draws in batched paths.
 */
export default function GoldField({ density = 650, radius = 0.36, offsetX = 0.68, className = 'field' }) {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas.getContext('2d', { alpha: true });
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const weak = (navigator.hardwareConcurrency || 4) <= 4 || window.innerWidth < 700;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let w = 0, h = 0, raf = 0, t = 0, visible = true, running = false;
    const mouse = { x: -9999, y: -9999, active: false };

    const N = Math.floor(density * (weak ? 0.45 : 1));
    const pts = [];
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < N; i++) {
      const y = 1 - (i / (N - 1)) * 2;
      const r = Math.sqrt(1 - y * y);
      const th = golden * i;
      pts.push({ x: Math.cos(th) * r, y, z: Math.sin(th) * r, seed: Math.random(), ox: 0, oy: 0 });
    }
    const proj = new Array(N);

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      w = rect.width; h = rect.height;
      canvas.width = Math.max(1, w * dpr); canvas.height = Math.max(1, h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    let rectCache = canvas.getBoundingClientRect();
    const onMove = (e) => {
      mouse.x = e.clientX - rectCache.left; mouse.y = e.clientY - rectCache.top; mouse.active = true;
    };
    const onScroll = () => { rectCache = canvas.getBoundingClientRect(); };
    const onResize = () => { resize(); rectCache = canvas.getBoundingClientRect(); };

    const draw = () => {
      if (!running) return;
      t += reduce ? 0 : 0.0025;
      const scroll = Math.min(window.scrollY / (h || 1), 1.2);
      ctx.clearRect(0, 0, w, h);
      const cx = w < 800 ? w * 0.5 : w * offsetX;
      const cy = h * 0.5;
      const R = Math.min(w, h) * (w < 800 ? 0.42 : radius) * (1 + scroll * 0.6);
      const rotY = t + (mouse.active ? (mouse.x / w - 0.5) * 0.6 : 0);
      const rotX = 0.35 + (mouse.active ? (mouse.y / h - 0.5) * 0.4 : 0);
      const cyR = Math.cos(rotY), syR = Math.sin(rotY), cxR = Math.cos(rotX), sxR = Math.sin(rotX);
      const rad = 130, rad2 = rad * rad;

      for (let i = 0; i < N; i++) {
        const p = pts[i];
        const un = scroll * (p.seed - 0.5) * 2.2;
        const cu = Math.cos(un), su = Math.sin(un);
        const x = p.x * cu - p.z * su, z = p.x * su + p.z * cu;
        const y = p.y + Math.sin(t * 4 + p.seed * 10) * 0.012;
        const x1 = x * cyR - z * syR, z1 = x * syR + z * cyR;
        const y1 = y * cxR - z1 * sxR, z2 = y * sxR + z1 * cxR;
        const persp = 2.4 / (2.4 + z2);
        let sx = cx + x1 * R * persp, sy = cy + y1 * R * persp;
        const dx = sx - mouse.x, dy = sy - mouse.y, d2 = dx * dx + dy * dy;
        if (d2 < rad2) {
          const d = Math.sqrt(d2) || 1, f = (1 - d / rad) * 38;
          p.ox += ((dx / d) * f - p.ox) * 0.2; p.oy += ((dy / d) * f - p.oy) * 0.2;
        } else if (p.ox || p.oy) {
          p.ox *= 0.92; p.oy *= 0.92;
          if (Math.abs(p.ox) < 0.05) p.ox = 0;
          if (Math.abs(p.oy) < 0.05) p.oy = 0;
        }
        proj[i] = { sx: sx + p.ox, sy: sy + p.oy, z: z2, near: d2 < rad2 * 2.2 };
      }

      // threads near the cursor only
      if (mouse.active && !weak) {
        ctx.lineWidth = 0.6;
        ctx.strokeStyle = 'rgba(245,222,138,0.22)';
        ctx.beginPath();
        for (let i = 0; i < N; i += 2) {
          const a = proj[i];
          if (!a.near || a.z > 0.2) continue;
          for (let j = i + 2; j < Math.min(i + 30, N); j += 2) {
            const b = proj[j];
            const dx = a.sx - b.sx, dy = a.sy - b.sy;
            if (dx * dx + dy * dy < 2200) { ctx.moveTo(a.sx, a.sy); ctx.lineTo(b.sx, b.sy); }
          }
        }
        ctx.stroke();
      }

      // particles in 4 depth buckets → 4 fills instead of N
      for (let bucket = 0; bucket < 4; bucket++) {
        const alpha = 0.15 + bucket * 0.22;
        ctx.fillStyle = `rgba(212,175,55,${alpha})`;
        ctx.beginPath();
        for (let i = 0; i < N; i++) {
          const p = proj[i];
          const depth = (1 - p.z) / 2;
          if (Math.min(3, Math.floor(depth * 4)) !== bucket) continue;
          const s = 0.6 + depth * 1.6;
          ctx.rect(p.sx - s / 2, p.sy - s / 2, s, s);
        }
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };

    const start = () => {
      if (running || !visible || document.hidden) return;
      running = true; raf = requestAnimationFrame(draw);
    };
    const stop = () => { running = false; cancelAnimationFrame(raf); };

    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; visible ? start() : stop(); });
    io.observe(canvas);
    const onVis = () => (document.hidden ? stop() : start());

    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('visibilitychange', onVis);
    start();

    return () => {
      stop();
      io.disconnect();
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [density, radius, offsetX]);

  return <canvas ref={ref} className={className} aria-hidden="true" />;
}
