import { useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useMotionValue, useSpring, useTransform, useScroll } from 'framer-motion';
import {
  ArrowRight, Sparkles, ShieldCheck, Smartphone, Award, PlayCircle, BookOpen, Wallet, CheckCircle2,
  GraduationCap, Layers, Users, Infinity as Inf, Star,
} from 'lucide-react';
import GoldField from '../components/GoldField';
import { ScrambleText, BreathText, CountUp } from '../components/TextFx';
import { Reveal, SplitWords, Magnetic } from '../components/Motion';
import { CourseLayout } from '../components/CourseCard';
import { Loader, Empty } from '../components/UI';
import { usePublishedCourses, useCategories } from '../lib/hooks';
import { useSettings } from '../context/SettingsContext';
import { money, effectivePrice, clean } from '../lib/utils';

const FALLBACK = ['Business Management', 'Web Development', 'Graphic Design', 'ICT Skills', 'Digital Marketing'];

export default function Home() {
  const { courses, loading } = usePublishedCourses();
  const cats = useCategories();
  const { settings } = useSettings();
  const words = useMemo(() => (courses.length ? courses.map((c) => clean(c.title)).slice(0, 8) : FALLBACK), [courses]);
  const totalLessons = courses.reduce((s, c) => s + (c.lessonCount || 0), 0);
  const catCounts = useMemo(() => {
    const m = new Map(cats.map((c) => [c.name, 0]));
    courses.forEach((c) => c.category && m.set(c.category, (m.get(c.category) || 0) + 1));
    return [...m.entries()];
  }, [cats, courses]);

  return (
    <>
      {/* ---------------- HERO ---------------- */}
      <section className="hero">
        <GoldField density={520} offsetX={0.74} radius={0.32} />
        <div className="hero-glow" />
        <div className="container hero-content">
          <div className="hero-grid">
            <div>
              <motion.span className="eyebrow" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}>
                {settings.siteName}
              </motion.span>
              <h1 className="display">
                <span className="row">
                  <motion.span style={{ display: 'inline-block' }} initial={{ y: '105%' }} animate={{ y: 0 }} transition={{ duration: 1.1, delay: 0.45, ease: [0.22, 1, 0.36, 1] }}>
                    <BreathText text="Learn Today." />
                  </motion.span>
                </span>
                <span className="row">
                  <motion.span className="gold-text" style={{ display: 'inline-block', fontStyle: 'italic', fontWeight: 400, paddingRight: '0.1em' }} initial={{ y: '105%' }} animate={{ y: 0 }} transition={{ duration: 1.1, delay: 0.6, ease: [0.22, 1, 0.36, 1] }}>
                    Lead Tomorrow.
                  </motion.span>
                </span>
              </h1>
              <motion.div className="hero-sub" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}>
                <span className="silver-text">Now learning →</span>
                <ScrambleText words={words} />
              </motion.div>
              <motion.p className="lead" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.1 }}>
                {settings.heroText} Explore expert-led courses, learn at your own pace, and unlock your potential.
              </motion.p>
              <motion.div className="hero-ctas" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.2 }}>
                <Magnetic as={Link} to="/courses">Explore Courses <ArrowRight size={18} /></Magnetic>
                <Magnetic as={Link} to="/register" className="btn btn-silver">Join Academy</Magnetic>
              </motion.div>
              <motion.div className="hero-badges" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.35 }}>
                <span><Smartphone size={14} /> EVC Plus · Zaad · Sahal</span>
                <span><Award size={14} /> Certificate</span>
                <span><Inf size={14} /> Lifetime access</span>
              </motion.div>
            </div>
            <Showcase courses={courses} />
          </div>
        </div>
      </section>

      {/* ---------------- STATS ---------------- */}
      <section className="container" style={{ paddingBottom: 60 }}>
        <Reveal>
          <div className="stat-strip">
            <div><b className="gold-text"><CountUp to={courses.length} /></b><span><BookOpen size={14} /> Courses</span></div>
            <div><b><CountUp to={totalLessons} /></b><span><Layers size={14} /> Lessons</span></div>
            <div><b className="silver-text"><CountUp to={Math.max(cats.length, catCounts.length)} /></b><span><Sparkles size={14} /> Categories</span></div>
            <div><b>24/7</b><span><PlayCircle size={14} /> Learn anytime</span></div>
          </div>
        </Reveal>
      </section>

      <div className="ribbon">
        <div className="ribbon-track">
          {[...words, ...words, ...words, ...words].map((w, i) => <span key={i}>{w}</span>)}
        </div>
      </div>

      {/* ---------------- COURSES ---------------- */}
      <section className="section">
        <div className="container">
          <div className="section-head">
            <div>
              <Reveal><span className="eyebrow">Featured Courses</span></Reveal>
              <h2 className="display"><SplitWords text="Courses that move" /> <span className="gold-text" style={{ fontStyle: 'italic' }}><SplitWords text="your career." delay={0.2} /></span></h2>
              <p className="sub">Hal lacag, course-ka oo dhan — video, PDF iyo sawirro, weligaa adiga ayaa leh.</p>
            </div>
            <Reveal delay={0.2}><Link to="/courses" className="btn btn-ghost">All Courses <ArrowRight size={16} /></Link></Reveal>
          </div>
          {loading ? <Loader /> : courses.length ? (
            <CourseLayout courses={courses.slice(0, 7)} />
          ) : (
            <Empty icon={BookOpen} title="Courses are coming soon">Admin Dashboard → Courses → Add New Course.</Empty>
          )}
        </div>
      </section>

      {/* ---------------- CATEGORIES ---------------- */}
      {catCounts.length > 0 && (
        <section className="section tight" style={{ paddingTop: 0 }}>
          <div className="container">
            <div className="section-head" style={{ marginBottom: 24 }}>
              <div>
                <Reveal><span className="eyebrow">Categories</span></Reveal>
                <h2 className="display" style={{ fontSize: 'clamp(30px,4vw,48px)' }}><SplitWords text="Choose your" /> <span className="silver-text" style={{ fontStyle: 'italic' }}><SplitWords text="path." delay={0.15} /></span></h2>
              </div>
              <Link to="/categories" className="btn btn-ghost btn-sm">All categories <ArrowRight size={14} /></Link>
            </div>
            <div className="cat-tiles">
              {catCounts.map(([name, count], i) => (
                <motion.div key={name} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}>
                  <Link to={`/courses?cat=${encodeURIComponent(name)}`} className="cat-tile">
                    <i>{name[0]}</i>
                    <div><b>{name}</b><small>{count} course{count === 1 ? '' : 's'}</small></div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ---------------- HOW IT WORKS (white) ---------------- */}
      <HowItWorks />

      {/* ---------------- WHY ---------------- */}
      <section className="section">
        <div className="container">
          <div className="section-head">
            <div>
              <Reveal><span className="eyebrow">Why Isdhis</span></Reveal>
              <h2 className="display"><SplitWords text="Premium learning," /> <span className="silver-text" style={{ fontStyle: 'italic' }}><SplitWords text="built for you." delay={0.2} /></span></h2>
            </div>
          </div>
          <Reveal>
            <div className="feature-grid">
              {[
                [Sparkles, 'Expert-led courses', 'Practical lessons from instructors who work in the field every day.'],
                [PlayCircle, 'Learn at your pace', 'Video lessons, PDFs and images — rewatch anything, any time.'],
                [ShieldCheck, 'Secure access', 'Only verified students can open paid lessons. Your account is your key.'],
                [Smartphone, 'Mobile money', 'Pay with EVC Plus, Zaad or Sahal — approved by our team quickly.'],
                [Award, 'Certificates', 'Finish every lesson and receive your Isdhis Academy certificate.'],
                [GraduationCap, 'Lifetime access', 'Buy once, keep the course forever, including future updates.'],
              ].map(([Icon, t, d], i) => (
                <div className="feature sweep" key={t}>
                  <span className="num">0{i + 1}</span>
                  <Icon className="ic" size={26} />
                  <h3>{t}</h3>
                  <p>{d}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---------------- PROMO / CTA ---------------- */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <Reveal>
            <div className="promo trace always">
              <div className="pimg">
                {courses[0]?.thumbnail ? <img src={courses[0].thumbnail} alt="" /> : <GoldField density={300} offsetX={0.5} radius={0.4} className="" />}
              </div>
              <div className="ptxt">
                <span className="eyebrow">Start now</span>
                <h2 className="display">Your next skill <span className="gold-text" style={{ fontStyle: 'italic' }}>starts here.</span></h2>
                <p className="muted" style={{ margin: 0 }}>Samee account bilaash ah, dooro course, ku bixi EVC Plus, Zaad ama Sahal — kadibna bilow waxbarashada maanta.</p>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 8 }}>
                  <Magnetic as={Link} to="/register">Join Academy <ArrowRight size={18} /></Magnetic>
                  <Link to="/courses" className="btn btn-ghost">Browse courses</Link>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}

/* Floating stack of real course cards that react to the cursor in 3D. */
function Showcase({ courses }) {
  const ref = useRef(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 80, damping: 18 });
  const sy = useSpring(my, { stiffness: 80, damping: 18 });
  const rotY = useTransform(sx, [-1, 1], [-10, 10]);
  const rotX = useTransform(sy, [-1, 1], [8, -8]);
  const onMove = (e) => {
    const r = ref.current.getBoundingClientRect();
    mx.set(((e.clientX - r.left) / r.width) * 2 - 1);
    my.set(((e.clientY - r.top) / r.height) * 2 - 1);
  };
  const reset = () => { mx.set(0); my.set(0); };

  const items = courses.length
    ? courses.slice(0, 3)
    : FALLBACK.slice(0, 3).map((t, i) => ({ id: `f${i}`, title: t, lessonCount: 0, price: 0, accessType: 'paid' }));
  const spots = [
    { left: '0%', top: '24%', z: 60, rot: -8, d: 0 },
    { left: '36%', top: '2%', z: 120, rot: 3, d: 0.6 },
    { left: '24%', top: '46%', z: 180, rot: -2, d: 1.2 },
  ];

  return (
    <motion.div
      ref={ref}
      className="showcase"
      onPointerMove={onMove}
      onPointerLeave={reset}
      style={{ rotateX: rotX, rotateY: rotY, transformStyle: 'preserve-3d' }}
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 1.2, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="show-ring" />
      {items.map((c, i) => {
        const s = spots[i];
        const card = (
          <motion.div
            className="show-card"
            style={{ left: s.left, top: s.top, rotate: s.rot, translateZ: s.z, zIndex: i + 1 }}
            initial={{ opacity: 0, y: 80 }}
            animate={{ opacity: 1, y: [0, -12, 0] }}
            transition={{ opacity: { delay: 0.8 + i * 0.2 }, y: { duration: 6, repeat: Infinity, ease: 'easeInOut', delay: s.d } }}
            whileHover={{ scale: 1.04, rotate: 0, zIndex: 10 }}
          >
            {c.thumbnail ? <img src={c.thumbnail} alt="" /> : <div className="ccard-thumb" style={{ aspectRatio: '16/10' }}><div className="ph">{clean(c.title)[0]}</div></div>}
            <div className="sc-body">
              <h4 className="split-safe">{clean(c.title)}</h4>
              <div className="sc-foot">
                <span><BookOpen size={13} style={{ verticalAlign: -2 }} /> {c.lessonCount || 0} lessons</span>
                <b>{courses.length ? (effectivePrice(c) ? money(effectivePrice(c)) : 'Free') : '—'}</b>
              </div>
            </div>
          </motion.div>
        );
        return courses.length ? <Link key={c.id} to={`/courses/${c.id}`}>{card}</Link> : <div key={c.id}>{card}</div>;
      })}
      <motion.div className="show-float" style={{ right: '0%', top: '8%', translateZ: 220 }} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0, y: [0, 8, 0] }} transition={{ opacity: { delay: 1.6 }, x: { delay: 1.6 }, y: { duration: 5, repeat: Infinity } }}>
        <i><CheckCircle2 size={18} /></i><div>Payment approved<small>Course unlocked</small></div>
      </motion.div>
      <motion.div className="show-float" style={{ left: '0%', bottom: '6%', translateZ: 240 }} initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0, y: [0, -8, 0] }} transition={{ opacity: { delay: 1.9 }, x: { delay: 1.9 }, y: { duration: 5.5, repeat: Infinity } }}>
        <i><Award size={18} /></i><div>Certificate earned<small>100% complete</small></div>
      </motion.div>
      <motion.div className="show-float" style={{ right: '4%', bottom: '18%', translateZ: 200 }} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 2.2 }}>
        <i><Star size={18} /></i><div>Learn anytime<small>Video · PDF · Images</small></div>
      </motion.div>
    </motion.div>
  );
}

function HowItWorks() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 80%', 'end 70%'] });
  const width = useTransform(scrollYProgress, [0, 1], ['0%', '100%']);
  const steps = [
    [BookOpen, 'Choose a course', 'Browse courses and open the one you want — see every lesson before you buy.'],
    [Wallet, 'Pay with mobile money', 'Send the amount via EVC Plus, Zaad or Sahal and submit your Transaction ID.'],
    [CheckCircle2, 'Admin approval', 'Our team verifies your payment and unlocks the full course.'],
    [PlayCircle, 'Start learning', 'Watch, read and earn your certificate — from My Courses.'],
  ];
  return (
    <section className="section light" ref={ref}>
      <div className="container">
        <div className="section-head">
          <div>
            <Reveal><span className="eyebrow">How it works</span></Reveal>
            <h2 className="display"><SplitWords text="Four steps to" /> <span className="gold-text" style={{ fontStyle: 'italic' }}><SplitWords text="your course." delay={0.2} /></span></h2>
          </div>
          <Reveal delay={0.2}><Link to="/courses" className="btn" style={{ background: 'var(--ink)', color: '#fff' }}>Get started <ArrowRight size={16} /></Link></Reveal>
        </div>
        <div style={{ height: 3, background: '#e3e1da', borderRadius: 3, marginBottom: 26, overflow: 'hidden' }}>
          <motion.div style={{ width, height: '100%', background: 'var(--gold-grad)' }} />
        </div>
        <div className="steps-grid">
          {steps.map(([Icon, t, d], i) => (
            <Reveal key={t} delay={i * 0.12}>
              <div className="step-card">
                <span className="big">0{i + 1}</span>
                <div className="ico"><Icon size={26} /></div>
                <h3>{t}</h3>
                <p>{d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
