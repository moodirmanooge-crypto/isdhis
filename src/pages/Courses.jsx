import { useMemo, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { Search, BookOpen, ArrowUpRight } from 'lucide-react';
import { CourseLayout } from '../components/CourseCard';
import { Loader, Empty } from '../components/UI';
import { SplitWords, Reveal } from '../components/Motion';
import { usePublishedCourses, useCategories } from '../lib/hooks';
import { effectivePrice } from '../lib/utils';

export default function Courses() {
  const { courses, loading, error } = usePublishedCourses();
  const cats = useCategories();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(params.get('q') || '');
  const cat = params.get('cat') || 'All';
  const [sort, setSort] = useState('new');

  const catNames = useMemo(() => {
    const s = new Set([...cats.map((c) => c.name), ...courses.map((c) => c.category).filter(Boolean)]);
    return ['All', ...s];
  }, [cats, courses]);

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    let l = courses.filter(
      (c) =>
        (cat === 'All' || c.category === cat) &&
        (!term || [c.title, c.description, c.instructor, c.category].join(' ').toLowerCase().includes(term))
    );
    if (sort === 'low') l = [...l].sort((a, b) => effectivePrice(a) - effectivePrice(b));
    if (sort === 'high') l = [...l].sort((a, b) => effectivePrice(b) - effectivePrice(a));
    return l;
  }, [courses, q, cat, sort]);

  const setCat = (c) => {
    const p = new URLSearchParams(params);
    c === 'All' ? p.delete('cat') : p.set('cat', c);
    setParams(p, { replace: true });
  };

  return (
    <section style={{ paddingBottom: 90 }}>
      <div className="container">
        <div className="page-head">
          <div className="row-end">
            <div>
              <span className="eyebrow">Catalogue</span>
              <h1 className="display"><SplitWords text="All" /> <span className="gold-text" style={{ fontStyle: 'italic' }}><SplitWords text="Courses" delay={0.1} /></span></h1>
            </div>
            <p className="muted" style={{ maxWidth: 380, margin: 0 }}>{courses.length} course{courses.length === 1 ? '' : 's'} · video, PDF iyo sawirro · hal lacag, weligaa.</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 22 }}>
          <div style={{ position: 'relative', flex: '1 1 280px' }}>
            <Search size={17} style={{ position: 'absolute', left: 15, top: '50%', translate: '0 -50%', color: 'var(--muted)' }} />
            <input className="input" style={{ paddingLeft: 44 }} placeholder="Search by course, instructor or topic…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <select className="input" style={{ width: 200 }} value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="new">Newest</option>
            <option value="low">Price: low to high</option>
            <option value="high">Price: high to low</option>
          </select>
        </div>
        <LayoutGroup>
          <div className="filters">
            {catNames.map((c) => (
              <button key={c} className={`filter ${cat === c ? 'on' : ''}`} onClick={() => setCat(c)}>
                {cat === c && <motion.span layoutId="catbg" className="on-bg" transition={{ type: 'spring', stiffness: 400, damping: 30 }} />}
                {c}
              </button>
            ))}
          </div>
        </LayoutGroup>
        {error && <div className="alert err">Courses lama soo rari karin: {error.message}</div>}
        {loading ? (
          <Loader />
        ) : list.length ? (
          <motion.div key={cat + sort + q} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <CourseLayout courses={list} />
          </motion.div>
        ) : (
          <Empty icon={BookOpen} title="No courses found">Isku day erey kale ama category kale.</Empty>
        )}
      </div>
    </section>
  );
}

export function Categories() {
  const { courses, loading } = usePublishedCourses();
  const cats = useCategories();
  const names = useMemo(() => {
    const m = new Map();
    cats.forEach((c) => m.set(c.name, { ...c, count: 0 }));
    courses.forEach((c) => {
      if (!c.category) return;
      const x = m.get(c.category) || { name: c.category, count: 0 };
      x.count++;
      m.set(c.category, x);
    });
    return [...m.values()];
  }, [cats, courses]);

  return (
    <section style={{ paddingBottom: 90 }}>
      <div className="container">
        <div className="page-head">
          <span className="eyebrow">Explore</span>
          <h1 className="display"><SplitWords text="Categories" /></h1>
        </div>
        {loading ? (
          <Loader />
        ) : names.length ? (
          <div style={{ borderTop: '1px solid var(--line)' }}>
            {names.map((c, i) => (
              <Reveal key={c.name} delay={i * 0.05}>
                <CategoryRow c={c} i={i} />
              </Reveal>
            ))}
          </div>
        ) : (
          <Empty icon={BookOpen} title="No categories yet" />
        )}
      </div>
    </section>
  );
}

function CategoryRow({ c, i }) {
  const [hover, setHover] = useState(false);
  return (
    <Link
      to={`/courses?cat=${encodeURIComponent(c.name)}`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ display: 'flex', alignItems: 'center', gap: 24, padding: '28px 6px', borderBottom: '1px solid var(--line)', position: 'relative', overflow: 'hidden' }}
    >
      <motion.span style={{ position: 'absolute', inset: 0, background: 'var(--gold-grad)', transformOrigin: 'left', zIndex: -1 }} initial={false} animate={{ scaleX: hover ? 1 : 0 }} transition={{ duration: 0.55, ease: [0.76, 0, 0.24, 1] }} />
      <span className="eyebrow" style={{ color: hover ? '#1a1305' : undefined, transition: '.3s' }}>{String(i + 1).padStart(2, '0')}</span>
      <motion.span className="display" animate={{ x: hover ? 20 : 0, color: hover ? '#1a1305' : '#fff' }} style={{ fontSize: 'clamp(30px, 5vw, 64px)', fontWeight: 400, flex: 1 }}>
        {c.name}
      </motion.span>
      <span style={{ color: hover ? '#1a1305' : 'var(--muted)', transition: '.3s', fontWeight: 700 }}>{c.count} courses</span>
      <motion.span animate={{ rotate: hover ? 45 : 0, color: hover ? '#1a1305' : '#D4AF37' }}><ArrowUpRight size={34} /></motion.span>
    </Link>
  );
}
