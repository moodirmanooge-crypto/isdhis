import { useEffect, useRef } from 'react';

/*
 * "Knowledge Sphere" — a slowly rotating 3D globe of gold particles drawn on canvas.
 * Points near the cursor are pushed outward and threads of light connect neighbours.
 * When scrolled, the sphere unravels into a spiral.
 */
export default function GoldField({ density = 900, radius = 0.36, offsetX = 0.68, className = 'field' }) {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas.getContext('2d');
    let w = 0, h = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);
    let raf, t = 0;
    const mouse = { x: -9999, y: -9999, active: false };
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const N = window.innerWidth < 700 ? Math.floor(density * 0.45) : density;
    const pts = [];
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < N; i++) {
      const y = 1 - (i / (N - 1)) * 2;
      const r = Math.sqrt(1 - y * y);
      const th = golden * i;
      pts.push({ x: Math.cos(th) * r, y, z: Math.sin(th) * r, seed: Math.random(), ox: 0, oy: 0 });
    }

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      w = rect.width; h = rect.height;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const onMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left; mouse.y = e.clientY - rect.top; mouse.active = true;
    };
    const onLeave = () => { mouse.active = false; mouse.x = mouse.y = -9999; };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerleave', onLeave);

    const draw = () => {
      t += reduce ? 0 : 0.0025;
      const scroll = Math.min(window.scrollY / (h || 1), 1.2);
      ctx.clearRect(0, 0, w, h);
      const cx = w < 800 ? w * 0.5 : w * offsetX;
      const cy = h * 0.5;
      const R = Math.min(w, h) * (w < 800 ? 0.42 : radius) * (1 + scroll * 0.6);
      const rotY = t + (mouse.active ? (mouse.x / w - 0.5) * 0.6 : 0);
      const rotX = 0.35 + (mouse.active ? (mouse.y / h - 0.5) * 0.4 : 0);
      const cyR = Math.cos(rotY), syR = Math.sin(rotY), cxR = Math.cos(rotX), sxR = Math.sin(rotX);

      const proj = [];
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        const unravel = scroll * (p.seed - 0.5) * 2.2;
        let x = p.x * Math.cos(unravel) - p.z * Math.sin(unravel);
        let z = p.x * Math.sin(unravel) + p.z * Math.cos(unravel);
        let y = p.y + Math.sin(t * 4 + p.seed * 10) * 0.012;
        // rotate Y
        let x1 = x * cyR - z * syR, z1 = x * syR + z * cyR;
        // rotate X
        let y1 = y * cxR - z1 * sxR, z2 = y * sxR + z1 * cxR;
        const persp = 2.4 / (2.4 + z2);
        let sx = cx + x1 * R * persp, sy = cy + y1 * R * persp;
        // cursor repulsion
        const dx = sx - mouse.x, dy = sy - mouse.y, d2 = dx * dx + dy * dy;
        const rad = 130;
        if (d2 < rad * rad) {
          const d = Math.sqrt(d2) || 1, f = (1 - d / rad) * 38;
          p.ox += ((dx / d) * f - p.ox) * 0.2; p.oy += ((dy / d) * f - p.oy) * 0.2;
        } else { p.ox *= 0.92; p.oy *= 0.92; }
        sx += p.ox; sy += p.oy;
        proj.push({ sx, sy, z: z2, near: d2 < rad * rad * 2.2 });
      }

      // threads near cursor
      ctx.lineWidth = 0.6;
      for (let i = 0; i < proj.length; i += 2) {
        const a = proj[i];
        if (!a.near || a.z > 0.2) continue;
        for (let j = i + 2; j < Math.min(i + 40, proj.length); j += 2) {
          const b = proj[j];
          const dx = a.sx - b.sx, dy = a.sy - b.sy, dd = dx * dx + dy * dy;
          if (dd < 2600) {
            ctx.strokeStyle = `rgba(245,222,138,${0.35 * (1 - dd / 2600)})`;
            ctx.beginPath(); ctx.moveTo(a.sx, a.sy); ctx.lineTo(b.sx, b.sy); ctx.stroke();
          }
        }
      }

      for (let i = 0; i < proj.length; i++) {
        const p = proj[i];
        const depth = (1 - p.z) / 2; // 0 back .. 1 front
        const size = 0.5 + depth * 1.7;
        const alpha = 0.12 + depth * 0.75;
        ctx.fillStyle = p.near ? `rgba(255,240,190,${alpha})` : `rgba(212,175,55,${alpha})`;
        ctx.beginPath(); ctx.arc(p.sx, p.sy, size, 0, Math.PI * 2); ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerleave', onLeave);
    };
  }, [density, radius, offsetX]);

  return <canvas ref={ref} className={className} aria-hidden="true" />;
}
