import { useEffect, useRef, useState } from 'react';
import { clean } from '../lib/utils';

const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ#$%&*+=<>/\\{}[]01⟡✦◆';

/*
 * ScrambleText — cycles through a list of words.
 * Each word "decodes" letter by letter from random glyphs, holds, then dissolves
 * into the next one. Used for the rotating course names in the hero.
 */
export function ScrambleText({ words: rawWords = [], hold = 2200, className = '' }) {
  const words = rawWords.map(clean);
  const [out, setOut] = useState([]);
  const idx = useRef(0);

  useEffect(() => {
    if (!words.length) return;
    let raf, timer, frame = 0, cancelled = false;
    const run = (from, to) => {
      const len = Math.max(from.length, to.length);
      const queue = [];
      for (let i = 0; i < len; i++) {
        const start = Math.floor(Math.random() * 18) + i * 1.2;
        const end = start + Math.floor(Math.random() * 18) + 8;
        queue.push({ from: from[i] || '', to: to[i] || '', start, end, ch: '' });
      }
      frame = 0;
      const tick = () => {
        if (cancelled) return;
        let done = 0;
        const res = queue.map((q) => {
          if (frame >= q.end) { done++; return { c: q.to, g: false }; }
          if (frame >= q.start) {
            if (!q.ch || Math.random() < 0.3) q.ch = GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
            return { c: q.ch, g: true };
          }
          return { c: q.from, g: false };
        });
        setOut(res);
        if (done === queue.length) {
          timer = setTimeout(() => {
            const next = (idx.current + 1) % words.length;
            const cur = words[idx.current];
            idx.current = next;
            run(cur, words[next]);
          }, hold);
        } else {
          frame++;
          raf = requestAnimationFrame(tick);
        }
      };
      tick();
    };
    idx.current = 0;
    run('', words[0]);
    return () => { cancelled = true; cancelAnimationFrame(raf); clearTimeout(timer); };
  }, [words.join('|'), hold]);

  return (
    <span className={`scramble ${className}`} aria-label={words[idx.current]}>
      {out.map((o, i) => (
        <span key={i} className={o.g ? 'g' : ''}>{o.c === ' ' ? ' ' : o.c}</span>
      ))}
    </span>
  );
}

/*
 * BreathText — every letter's font weight responds to cursor distance
 * (uses Fraunces' variable "wght" axis). Letters swell from hairline to bold.
 */
export function BreathText({ text, className = '' }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const spans = [...el.querySelectorAll('span')];
    let raf = 0, mx = -9999, my = -9999, idle = 0, running = false, centers = [], last = [];
    // Measure letter positions only on scroll/resize — never inside the animation loop.
    const measure = () => {
      centers = spans.map((s) => { const r = s.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
    };
    const onMove = (e) => { mx = e.clientX; my = e.clientY; };
    const loop = () => {
      if (!running) return;
      idle += 0.03;
      for (let i = 0; i < spans.length; i++) {
        const c = centers[i] || [0, 0];
        const prox = Math.max(0, 1 - Math.hypot(c[0] - mx, c[1] - my) / 320);
        const wave = (Math.sin(idle - i * 0.45) + 1) / 2;
        const w = Math.round((220 + prox * 680 + wave * 120 * (1 - prox)) / 10) * 10;
        if (last[i] !== w) {
          last[i] = w;
          spans[i].style.fontVariationSettings = `'wght' ${w}, 'opsz' 144`;
          spans[i].style.color = prox > 0.35 ? 'var(--gold-hi)' : '';
        }
      }
      raf = requestAnimationFrame(loop);
    };
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !running) { running = true; measure(); raf = requestAnimationFrame(loop); }
      if (!e.isIntersecting) { running = false; cancelAnimationFrame(raf); }
    });
    io.observe(el);
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('scroll', measure, { passive: true });
    window.addEventListener('resize', measure);
    const t = setTimeout(measure, 1500); // after the intro animation settles
    return () => {
      running = false; cancelAnimationFrame(raf); io.disconnect(); clearTimeout(t);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('scroll', measure);
      window.removeEventListener('resize', measure);
    };
  }, [text]);
  return (
    <span ref={ref} className={`breath ${className}`} aria-label={text}>
      {[...text].map((c, i) => (
        <span key={i} aria-hidden="true">{c === ' ' ? ' ' : c}</span>
      ))}
    </span>
  );
}

/* CountUp — animates a number when it scrolls into view */
export function CountUp({ to = 0, suffix = '', duration = 1600 }) {
  const ref = useRef(null);
  const [v, setV] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const start = performance.now();
      const step = (now) => {
        const p = Math.min((now - start) / duration, 1);
        setV(Math.round(to * (1 - Math.pow(1 - p, 4))));
        if (p < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    });
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [to, duration]);
  return <span ref={ref}>{v.toLocaleString()}{suffix}</span>;
}
