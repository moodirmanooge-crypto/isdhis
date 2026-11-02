import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, Clock, Infinity as Inf } from 'lucide-react';
import { money, effectivePrice, initials } from '../lib/utils';

/*
 * 3D tilt card: tilts toward the cursor, a gold glare follows the pointer,
 * and the body floats forward in Z space.
 */
export default function CourseCard({ course, index = 0 }) {
  const ref = useRef(null);
  const price = effectivePrice(course);
  const hasDiscount = course.accessType !== 'free' && price < Number(course.price || 0);
  const off = hasDiscount ? Math.round((1 - price / Number(course.price)) * 100) : 0;

  const onMove = (e) => {
    const el = ref.current;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    el.style.transform = `rotateY(${(px - 0.5) * 14}deg) rotateX(${(0.5 - py) * 12}deg)`;
    el.style.setProperty('--gx', `${px * 100}%`);
    el.style.setProperty('--gy', `${py * 100}%`);
  };
  const onLeave = () => {
    ref.current.style.transform = '';
  };

  return (
    <motion.div
      className="ccard-wrap"
      initial={{ opacity: 0, y: 60, rotateX: -25 }}
      whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.9, delay: (index % 3) * 0.12, ease: [0.22, 1, 0.36, 1] }}
    >
      <Link to={`/courses/${course.id}`} style={{ display: 'block', height: '100%' }}>
        <article
          ref={ref}
          className="ccard"
          onPointerMove={onMove}
          onPointerLeave={onLeave}
          style={{ transition: 'transform .5s cubic-bezier(.22,1,.36,1), border-color .4s, box-shadow .5s' }}
        >
          <div className="glare" />
          <div className="ccard-thumb">
            {course.category && <span className="tag">{course.category}</span>}
            {off > 0 && <span className="off">-{off}%</span>}
            {course.thumbnail ? (
              <img src={course.thumbnail} alt={course.title} loading="lazy" />
            ) : (
              <div className="ph">{(course.title || 'I')[0]}</div>
            )}
          </div>
          <div className="ccard-body">
            <h3>{course.title}</h3>
            {course.instructor && (
              <div className="inst">
                <span className="avatar">{initials(course.instructor)}</span>
                {course.instructor}
              </div>
            )}
            <p>{course.shortDescription || course.description}</p>
            <div className="ccard-meta">
              <span><BookOpen size={14} /> {course.lessonCount || 0} Lessons</span>
              {course.duration && <span><Clock size={14} /> {course.duration}</span>}
              <span><Inf size={14} /> Lifetime</span>
            </div>
            <div className="ccard-foot">
              <span className="price">
                {price === 0 ? 'Free' : money(price)}
                {hasDiscount && <s>{money(course.price)}</s>}
              </span>
              <span className="btn btn-sm btn-ghost">{price === 0 ? 'Enroll' : 'Buy Course'}</span>
            </div>
          </div>
        </article>
      </Link>
    </motion.div>
  );
}
