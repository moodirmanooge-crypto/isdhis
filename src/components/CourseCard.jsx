import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, Clock, Infinity as Inf, Award, Smartphone, ShieldCheck, ArrowRight } from 'lucide-react';
import { money, effectivePrice, initials, clean } from '../lib/utils';

/*
 * Course card.
 *  variant="default" — 3D tilt card for grids
 *  variant="big"     — featured tile in the bento grid
 *  variant="wide"    — horizontal card (used when there are only 1–2 courses, so no empty space)
 * Hover: tilts toward the cursor, gold glare follows, silver light sweeps across,
 * and a gold/silver border traces around the edge.
 */
export default function CourseCard({ course, index = 0, variant = 'default' }) {
  const ref = useRef(null);
  const price = effectivePrice(course);
  const hasDiscount = course.accessType !== 'free' && price < Number(course.price || 0);
  const off = hasDiscount ? Math.round((1 - price / Number(course.price)) * 100) : 0;
  const title = clean(course.title);
  const tilt = variant === 'wide' ? 4 : 12;

  const onMove = (e) => {
    const el = ref.current;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    el.style.transform = `rotateY(${(px - 0.5) * tilt}deg) rotateX(${(0.5 - py) * tilt}deg)`;
    el.style.setProperty('--gx', `${px * 100}%`);
    el.style.setProperty('--gy', `${py * 100}%`);
  };
  const onLeave = () => { ref.current.style.transform = ''; };

  return (
    <motion.div
      className="ccard-wrap"
      style={{ height: '100%' }}
      initial={{ opacity: 0, y: 60, rotateX: -18 }}
      whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.9, delay: (index % 3) * 0.12, ease: [0.22, 1, 0.36, 1] }}
    >
      <Link to={`/courses/${course.id}`} style={{ display: 'block', height: '100%' }}>
        <article
          ref={ref}
          className={`ccard trace sweep ${variant === 'wide' ? 'wide' : ''}`}
          onPointerMove={onMove}
          onPointerLeave={onLeave}
          style={{ transition: 'transform .5s cubic-bezier(.22,1,.36,1), border-color .4s, box-shadow .5s' }}
        >
          <div className="glare" />
          <div className="ccard-thumb">
            {course.category && <span className="tag">{course.category}</span>}
            {off > 0 && <span className="off">-{off}%</span>}
            {course.thumbnail ? <img src={course.thumbnail} alt={title} loading="lazy" /> : <div className="ph">{title[0] || 'I'}</div>}
          </div>
          <div className="ccard-body">
            <h3 className="split-safe">{title}</h3>
            {course.instructor && (
              <div className="inst"><span className="avatar">{initials(course.instructor)}</span>{course.instructor}</div>
            )}
            <p>{course.shortDescription || course.description}</p>
            <div className="ccard-meta">
              <span><BookOpen size={14} /> {course.lessonCount || 0} Lessons</span>
              {course.duration && <span><Clock size={14} /> {course.duration}</span>}
              <span><Inf size={14} /> Lifetime</span>
            </div>
            {variant !== 'default' && (
              <div className="incl">
                <span><Award size={14} /> Certificate</span>
                <span><Smartphone size={14} /> EVC · Zaad · Sahal</span>
                <span><ShieldCheck size={14} /> Secure access</span>
                <span><Inf size={14} /> Learn at your pace</span>
              </div>
            )}
            <div className="ccard-foot">
              <span className="price">
                {price === 0 ? 'Free' : money(price)}
                {hasDiscount && <s>{money(course.price)}</s>}
              </span>
              <span className={`btn btn-sm ${variant === 'default' ? 'btn-ghost' : 'btn-gold'}`}>
                {price === 0 ? 'Enroll' : 'Buy Course'} <ArrowRight size={14} />
              </span>
            </div>
          </div>
        </article>
      </Link>
    </motion.div>
  );
}

/* Lays out any number of courses without leaving holes. */
export function CourseLayout({ courses }) {
  const n = courses.length;
  if (n <= 2) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        {courses.map((c, i) => <CourseCard key={c.id} course={c} index={i} variant="wide" />)}
      </div>
    );
  }
  // featured tile size depends on n % 3 (see .bento.m0/m1/m2) → rows are always complete
  return (
    <div className={`bento m${n % 3}`}>
      {courses.map((c, i) => (
        <div key={c.id} className={i === 0 ? 'b-big' : ''}>
          <CourseCard course={c} index={i} variant={i === 0 ? 'big' : 'default'} />
        </div>
      ))}
    </div>
  );
}
