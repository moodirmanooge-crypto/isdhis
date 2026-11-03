import { useRef } from 'react';
import { motion } from 'framer-motion';
import { clean } from '../lib/utils';

/* Reveal — content rises out of a clipped mask with a blur-to-sharp focus pull */
/*
 * The OUTER element is what the browser watches (never clipped — a clipped element is
 * reported as "not visible" by Chrome on phones, which left whole sections empty).
 * The INNER element does the mask/blur animation, triggered through variants.
 */
const revealInner = {
  hidden: (y) => ({ opacity: 0, y, filter: 'blur(10px)', clipPath: 'inset(-50% -50% 100% -50%)' }),
  show: { opacity: 1, y: 0, filter: 'blur(0px)', clipPath: 'inset(-50% -50% -50% -50%)' },
};
export function Reveal({ children, delay = 0, y = 40, className = '', as = 'div' }) {
  const M = motion[as] || motion.div;
  return (
    <M className={className} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.05 }}>
      <motion.div
        custom={y}
        variants={revealInner}
        transition={{ duration: 1, delay, ease: [0.22, 1, 0.36, 1] }}
        style={{ height: '100%' }}
      >
        {children}
      </motion.div>
    </M>
  );
}

/* SplitWords — headline words slide up one by one from below a mask */
export function SplitWords({ text: raw, delay = 0, className = '' }) {
  const text = clean(raw);
  return (
    <span className={`split-safe ${className}`} aria-label={text}>
      {text.split(/\s+/).map((w, i) => (
        <span key={i} style={{ display: 'inline-block', overflow: 'hidden', verticalAlign: 'top', paddingBottom: '0.08em' }}>
          <motion.span
            aria-hidden="true"
            style={{ display: 'inline-block' }}
            initial={{ y: '110%', rotate: 6 }}
            whileInView={{ y: '0%', rotate: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.9, delay: delay + i * 0.07, ease: [0.22, 1, 0.36, 1] }}
          >
            {w}&nbsp;
          </motion.span>
        </span>
      ))}
    </span>
  );
}

/* Magnetic — element is pulled towards the cursor, with a light spot following it */
export function Magnetic({ children, strength = 0.35, className = 'btn btn-gold', as = 'button', ...props }) {
  const ref = useRef(null);
  const Tag = as;
  const onMove = (e) => {
    const el = ref.current;
    const r = el.getBoundingClientRect();
    const x = e.clientX - r.left - r.width / 2;
    const y = e.clientY - r.top - r.height / 2;
    el.style.transform = `translate(${x * strength}px, ${y * strength}px)`;
    el.style.setProperty('--mx', `${e.clientX - r.left}px`);
    el.style.setProperty('--my', `${e.clientY - r.top}px`);
  };
  const onLeave = () => { if (ref.current) ref.current.style.transform = ''; };
  return (
    <Tag ref={ref} className={className} onPointerMove={onMove} onPointerLeave={onLeave} data-cursor="big" {...props}>
      <span className="shine" />
      {children}
    </Tag>
  );
}
