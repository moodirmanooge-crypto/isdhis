import { useRef } from 'react';
import { motion } from 'framer-motion';

/* Reveal — content rises out of a clipped mask with a blur-to-sharp focus pull */
export function Reveal({ children, delay = 0, y = 40, className = '', as = 'div' }) {
  const M = motion[as] || motion.div;
  return (
    <M
      className={className}
      initial={{ opacity: 0, y, filter: 'blur(10px)', clipPath: 'inset(0 0 100% 0)' }}
      whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)', clipPath: 'inset(0 0 0% 0)' }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 1, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </M>
  );
}

/* SplitWords — headline words slide up one by one from below a mask */
export function SplitWords({ text, delay = 0, className = '' }) {
  return (
    <span className={className} aria-label={text}>
      {text.split(' ').map((w, i) => (
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
