import { useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight, Sparkles, ShieldCheck, Smartphone, Award, PlayCircle, BookOpen, Wallet, CheckCircle2, GraduationCap } from 'lucide-react';
import GoldField from '../components/GoldField';
import { ScrambleText, BreathText, CountUp } from '../components/TextFx';
import { Reveal, SplitWords, Magnetic } from '../components/Motion';
import CourseCard from '../components/CourseCard';
import { Loader, Empty } from '../components/UI';
import { usePublishedCourses, useCategories } from '../lib/hooks';
import { useSettings } from '../context/SettingsContext';

const FALLBACK = ['Web Development', 'Advanced Trading', 'Graphic Design', 'ICT Skills', 'Digital Marketing'];

export default function Home() {
  const { courses, loading } = usePublishedCourses();
  const cats = useCategories();
  const { settings } = useSettings();
  const words = useMemo(() => (courses.length ? courses.map((c) => c.title).slice(0, 8) : FALLBACK), [courses]);
  const totalLessons = courses.reduce((s, c) => s + (c.lessonCount || 0), 0);

  return (
    <>
      <section className="hero">
        <GoldField />
        <div className="hero-glow" />
        <div className="container hero-content">
          <motion.span className="eyebrow" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }}>
            {settings.siteName}
          </motion.span>
          <h1 className="display">
            <span className="row">
              <motion.span style={{ display: 'inline-block' }} initial={{ y: '105%' }} animate={{ y: 0 }} transition={{ duration: 1.1, delay: 0.55, ease: [0.22, 1, 0.36, 1] }}>
                <BreathText text="Learn Today." />
              </motion.span>
            </span>
            <span className="row">
              <motion.span className="gold-text" style={{ display: 'inline-block', fontStyle: 'italic', fontWeight: 400 }} initial={{ y: '105%' }} animate={{ y: 0 }} transition={{ duration: 1.1, delay: 0.7, ease: [0.22, 1, 0.36, 1] }}>
                Lead Tomorrow.
              </motion.span>
            </span>
          </h1>
          <motion.div className="hero-sub" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }}>
            <span className="muted">Now learning →</span>
            <ScrambleText words={words} />
          </motion.div>
          <motion.p className="lead" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.35 }}>
            {settings.heroText} Explore expert-led courses, learn at your own pace, and unlock your potential.
          </motion.p>
          <motion.div className="hero-ctas" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.5 }}>
            <Magnetic as={Link} to="/courses">Explore Courses <ArrowRight size={18} /></Magnetic>
            <Magnetic as={Link} to="/register" className="btn btn-ghost">Join Academy</Magnetic>
          </motion.div>
          <motion.div className="hero-meta" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.7 }}>
            <div><b><CountUp to={courses.length} /></b><span>Courses</span></div>
            <div><b><CountUp to={totalLessons} /></b><span>Lessons</span></div>
            <div><b><CountUp to={cats.length} /></b><span>Categories</span></div>
            <div><b>∞</b><span>Lifetime access</span></div>
          </motion.div>
        </div>
      </section>

      <div className="ribbon">
        <div className="ribbon-track">
          {[...words, ...words, ...words, ...words].map((w, i) => (
            <span key={i}>{w}</span>
          ))}
        </div>
      </div>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <div>
              <Reveal><span className="eyebrow">Featured Courses</span></Reveal>
              <h2 className="display"><SplitWords text="Courses that move" /> <span className="gold-text" style={{ fontStyle: 'italic' }}><SplitWords text="your career." delay={0.2} /></span></h2>
            </div>
            <Reveal delay={0.2}><Link to="/courses" className="btn btn-ghost">All Courses <ArrowRight size={16} /></Link></Reveal>
          </div>
          {loading ? (
            <Loader />
          ) : courses.length ? (
            <div className="grid">
              {courses.slice(0, 6).map((c, i) => <CourseCard key={c.id} course={c} index={i} />)}
            </div>
          ) : (
            <Empty icon={BookOpen} title="Courses are coming soon">Admin-ku wali course ma soo gelin. Admin Dashboard → Courses → Add New Course.</Empty>
          )}
        </div>
      </section>

      <HowItWorks />

      <section className="section">
        <div className="container">
          <div className="section-head">
            <div>
              <Reveal><span className="eyebrow">Why Isdhis</span></Reveal>
              <h2 className="display"><SplitWords text="Premium learning," /> <span className="gold-text" style={{ fontStyle: 'italic' }}><SplitWords text="built for you." delay={0.2} /></span></h2>
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
                <div className="feature" key={t}>
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

      <section className="section" style={{ paddingTop: 20 }}>
        <div className="container">
          <Reveal>
            <div className="cta-band">
              <span className="eyebrow">Start now</span>
              <h2 className="display" style={{ marginTop: 16 }}>Your next skill <span className="gold-text" style={{ fontStyle: 'italic' }}>starts here.</span></h2>
              <p className="muted" style={{ maxWidth: 520, margin: '0 auto 30px' }}>Create your free account, choose a course and begin learning today.</p>
              <Magnetic as={Link} to="/register">Join Academy <ArrowRight size={18} /></Magnetic>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}

function HowItWorks() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 75%', 'end 60%'] });
  const len = useTransform(scrollYProgress, [0, 1], [0, 1]);
  const steps = [
    [BookOpen, 'Choose a course', 'Browse courses and open the one you want.'],
    [Wallet, 'Pay with mobile money', 'Send the amount via EVC Plus, Zaad or Sahal and submit your Transaction ID.'],
    [CheckCircle2, 'Admin approval', 'Our team verifies your payment and unlocks the course.'],
    [PlayCircle, 'Start learning', 'The course appears in My Courses — watch, read and earn your certificate.'],
  ];
  return (
    <section className="section" ref={ref} style={{ background: 'linear-gradient(180deg, transparent, rgba(16,31,58,.5), transparent)' }}>
      <div className="container">
        <div className="section-head">
          <div>
            <Reveal><span className="eyebrow">How it works</span></Reveal>
            <h2 className="display"><SplitWords text="Four steps to" /> <span className="gold-text" style={{ fontStyle: 'italic' }}><SplitWords text="your course." delay={0.2} /></span></h2>
          </div>
        </div>
        <div style={{ position: 'relative' }}>
          <svg viewBox="0 0 1000 20" preserveAspectRatio="none" style={{ position: 'absolute', top: 34, left: 0, width: '100%', height: 20, overflow: 'visible' }} aria-hidden="true">
            <path d="M0 10 C 250 -10, 250 30, 500 10 S 750 -10, 1000 10" fill="none" stroke="rgba(232,234,240,.1)" strokeWidth="2" />
            <motion.path d="M0 10 C 250 -10, 250 30, 500 10 S 750 -10, 1000 10" fill="none" stroke="url(#gl)" strokeWidth="2.5" style={{ pathLength: len }} />
            <defs><linearGradient id="gl"><stop offset="0" stopColor="#8E6F17" /><stop offset=".5" stopColor="#F5DE8A" /><stop offset="1" stopColor="#D4AF37" /></linearGradient></defs>
          </svg>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 26, position: 'relative' }}>
            {steps.map(([Icon, t, d], i) => (
              <Reveal key={t} delay={i * 0.15}>
                <div style={{ width: 70, height: 70, borderRadius: 22, display: 'grid', placeItems: 'center', background: 'var(--navy)', border: '1px solid rgba(212,175,55,.5)', boxShadow: '0 0 40px -10px rgba(212,175,55,.6)', color: 'var(--gold)' }}>
                  <Icon size={28} />
                </div>
                <div className="eyebrow" style={{ marginTop: 22 }}>Step 0{i + 1}</div>
                <h3 className="display" style={{ fontSize: 26, fontWeight: 500, margin: '8px 0' }}>{t}</h3>
                <p className="muted" style={{ margin: 0 }}>{d}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
