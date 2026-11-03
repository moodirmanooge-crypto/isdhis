import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, AlertTriangle, X } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';

export function LogoMark({ size = 40 }) {
  const { settings } = useSettings();
  if (settings.logoUrl) return <img src={settings.logoUrl} alt={settings.siteName} width={size} height={size} />;
  return <img src="/logo.svg" alt="Isdhis Academy" width={size} height={size} />;
}

export function Brand() {
  const { settings } = useSettings();
  const name = (settings.siteName || 'Isdhis Academy').replace(/academy/i, '').trim() || 'Isdhis';
  return (
    <span className="brand">
      <LogoMark />
      <span>
        {name.toUpperCase()}
        <small>ACADEMY</small>
      </span>
    </span>
  );
}

export function Loader() {
  return (
    <div className="loader">
      <div className="ring" />
    </div>
  );
}

export function Empty({ icon: Icon, title, children }) {
  return (
    <div className="empty">
      {Icon && <Icon size={36} />}
      <h3 style={{ margin: '6px 0', color: 'var(--text)' }}>{title}</h3>
      {children && <div>{children}</div>}
    </div>
  );
}

export function Modal({ open, onClose, title, children, wide, locked }) {
  // locked = an upload is running → clicking outside / Escape must not close and lose it
  const close = () => { if (!locked) onClose?.(); };
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && !locked && onClose?.();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose, locked]);
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="modal-bg" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={close}>
          <motion.div
            className="modal"
            style={wide ? { width: 'min(980px, 100%)' } : undefined}
            initial={{ y: 40, scale: 0.96, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 20, scale: 0.98, opacity: 0 }}
            transition={{ type: 'spring', damping: 26, stiffness: 300 }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="modal-head">
              <h3>{title}</h3>
              <button className="icon-btn" onClick={close} disabled={locked} aria-label="Close"><X size={18} /></button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ---- toasts ---- */
const ToastCtx = createContext(() => {});
export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const push = useCallback((msg, type = 'ok') => {
    const id = Math.random();
    setItems((x) => [...x, { id, msg, type }]);
    setTimeout(() => setItems((x) => x.filter((t) => t.id !== id)), 4200);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toasts">
        <AnimatePresence>
          {items.map((t) => (
            <motion.div key={t.id} className={`toast ${t.type}`} initial={{ x: 80, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 80, opacity: 0 }}>
              {t.type === 'err' ? <AlertTriangle size={18} color="var(--bad)" /> : <CheckCircle2 size={18} color="var(--ok)" />}
              {t.msg}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  );
}
export const useToast = () => useContext(ToastCtx);

/* ---- custom cursor ---- */
export function Cursor() {
  const dot = useRef(null);
  const ring = useRef(null);
  useEffect(() => {
    let x = -100, y = -100, rx = -100, ry = -100, raf;
    const move = (e) => {
      x = e.clientX; y = e.clientY;
      const big = e.target.closest?.('a, button, [data-cursor="big"], .ccard, input, select, textarea');
      ring.current?.classList.toggle('big', !!big);
    };
    const loop = () => {
      rx += (x - rx) * 0.16; ry += (y - ry) * 0.16;
      if (dot.current) dot.current.style.transform = `translate(${x - 3}px, ${y - 3}px)`;
      if (ring.current) {
        const s = ring.current.offsetWidth / 2;
        ring.current.style.transform = `translate(${rx - s}px, ${ry - s}px)`;
      }
      raf = requestAnimationFrame(loop);
    };
    window.addEventListener('pointermove', move);
    loop();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('pointermove', move); };
  }, []);
  return (
    <>
      <div ref={dot} className="cursor-dot" />
      <div ref={ring} className="cursor-ring" />
    </>
  );
}

/* ---- page transition: six gold blinds sweep across ---- */
export function PageCurtain({ k }) {
  return (
    <AnimatePresence mode="wait">
      <motion.div key={k} className="curtain">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <motion.div
            key={i}
            style={{ backgroundPosition: `${i * 20}% 0` }}
            initial={{ scaleY: 1 }}
            animate={{ scaleY: 0, transformOrigin: 'bottom' }}
            transition={{ duration: 0.7, delay: 0.05 * i, ease: [0.76, 0, 0.24, 1] }}
          />
        ))}
      </motion.div>
    </AnimatePresence>
  );
}

export function StatusChip({ status }) {
  return <span className={`chip ${status}`}>{status}</span>;
}

export function Stars({ value = 0, size = 15, onChange }) {
  return (
    <span className="stars">
      {[1, 2, 3, 4, 5].map((n) => (
        <svg
          key={n}
          width={size}
          height={size}
          viewBox="0 0 24 24"
          onClick={onChange ? () => onChange(n) : undefined}
          style={{ cursor: onChange ? 'pointer' : 'default' }}
          fill={n <= Math.round(value) ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth="1.6"
        >
          <path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6L2.5 9.4l6.6-.8L12 2.5z" />
        </svg>
      ))}
    </span>
  );
}
