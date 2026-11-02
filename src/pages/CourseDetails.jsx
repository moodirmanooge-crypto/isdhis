import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { collection, doc, getDoc, onSnapshot, query, where, setDoc, serverTimestamp } from 'firebase/firestore';
import { CheckCircle2, PlayCircle, FileText, Image as ImageIcon, Lock, Eye, Clock, BookOpen, Infinity as Inf, Award, Smartphone, ShieldCheck, Hourglass } from 'lucide-react';
import { db } from '../firebase';
import { C, enrollmentId } from '../lib/db';
import { money, effectivePrice, initials, fmtDate, errMsg } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import { Loader, Empty, Stars, useToast } from '../components/UI';
import { SplitWords, Reveal, Magnetic } from '../components/Motion';

export default function CourseDetails() {
  const { id } = useParams();
  const nav = useNavigate();
  const toast = useToast();
  const { user, profile } = useAuth();
  const [course, setCourse] = useState(undefined);
  const [lessons, setLessons] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [enrolled, setEnrolled] = useState(false);
  const [pending, setPending] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    return onSnapshot(
      doc(db, C.courses, id),
      (s) => setCourse(s.exists() ? { id: s.id, ...s.data() } : null),
      () => setCourse(null)
    );
  }, [id]);

  useEffect(() => {
    const u1 = onSnapshot(query(collection(db, C.lessons), where('courseId', '==', id)), (s) =>
      setLessons(s.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (a.order || 0) - (b.order || 0))), () => {}
    );
    const u2 = onSnapshot(query(collection(db, C.reviews), where('courseId', '==', id)), (s) =>
      setReviews(s.docs.map((d) => ({ id: d.id, ...d.data() }))), () => {}
    );
    return () => { u1(); u2(); };
  }, [id]);

  useEffect(() => {
    if (!user) { setEnrolled(false); setPending(false); return; }
    getDoc(doc(db, C.enrollments, enrollmentId(user.uid, id))).then((s) => setEnrolled(s.exists())).catch(() => setEnrolled(false));
    return onSnapshot(query(collection(db, C.payments), where('uid', '==', user.uid)), (s) =>
      setPending(s.docs.some((d) => d.data().courseId === id && d.data().status === 'pending')), () => {}
    );
  }, [user, id]);

  const rating = useMemo(() => (reviews.length ? reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length : 0), [reviews]);

  if (course === undefined) return <Loader />;
  if (!course) return <div className="container section"><Empty icon={BookOpen} title="Course not found">Course-kan ma jiro ama lama daabicin.</Empty></div>;

  const price = effectivePrice(course);
  const isFree = price === 0;

  const buy = async () => {
    if (!user) return nav(`/login?next=/courses/${id}`);
    if (enrolled) return nav(`/learn/${id}`);
    if (isFree) {
      setBusy(true);
      try {
        await setDoc(doc(db, C.enrollments, enrollmentId(user.uid, id)), {
          uid: user.uid, courseId: id, courseTitle: course.title, studentName: profile?.name || '', studentEmail: user.email, source: 'free', createdAt: serverTimestamp(),
        });
        setEnrolled(true);
        toast('Waad ku biirtay course-ka!');
        nav(`/learn/${id}`);
      } catch (e) { toast(errMsg(e), 'err'); }
      setBusy(false);
      return;
    }
    nav(`/checkout/${id}`);
  };

  const label = enrolled ? 'Continue Learning' : pending ? 'Payment pending approval' : isFree ? 'Enroll for Free' : 'Buy Now';

  return (
    <>
      <section className="cd-hero">
        {course.thumbnail && <div className="bg" style={{ backgroundImage: `url(${course.thumbnail})` }} />}
        <div className="container cd-grid">
          <div>
            <Link to={`/courses?cat=${encodeURIComponent(course.category || '')}`} className="eyebrow">{course.category || 'Course'}</Link>
            <h1 className="display"><SplitWords text={course.title} /></h1>
            <Reveal delay={0.3}><p style={{ fontSize: 19, color: 'var(--silver)', opacity: 0.85, maxWidth: 680 }}>{course.shortDescription}</p></Reveal>
            <Reveal delay={0.4}>
              <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap', alignItems: 'center', marginTop: 20, fontSize: 14 }}>
                {reviews.length > 0 && <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}><b style={{ color: 'var(--gold-hi)' }}>{rating.toFixed(1)}</b><Stars value={rating} /> <span className="muted">({reviews.length})</span></span>}
                <span className="ccard-meta"><span><BookOpen size={15} /> {lessons.length} lessons</span></span>
                {course.duration && <span className="ccard-meta"><span><Clock size={15} /> {course.duration}</span></span>}
                {course.level && <span className="chip">{course.level}</span>}
                {course.instructor && <span className="inst" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span className="avatar">{initials(course.instructor)}</span> {course.instructor}</span>}
              </div>
            </Reveal>
          </div>
          <motion.aside className="buy-card" initial={{ opacity: 0, y: 40, rotateY: -12 }} animate={{ opacity: 1, y: 0, rotateY: 0 }} transition={{ duration: 1, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}>
            <div className="thumb">{course.thumbnail ? <img src={course.thumbnail} alt="" /> : <div className="ccard-thumb" style={{ height: '100%' }}><div className="ph">{course.title[0]}</div></div>}</div>
            <div className="inner">
              <div className="price" style={{ fontSize: 40 }}>
                {isFree ? 'Free' : money(price)}
                {!isFree && price < Number(course.price) && <s>{money(course.price)}</s>}
              </div>
              <Magnetic className="btn btn-gold" onClick={buy} disabled={busy || (pending && !enrolled)} style={{ width: '100%' }}>
                {pending && !enrolled ? <Hourglass size={17} /> : enrolled ? <PlayCircle size={17} /> : null} {label}
              </Magnetic>
              {pending && !enrolled && <div className="alert info" style={{ margin: 0 }}>Lacag-bixintaada waxay sugaysaa xaqiijinta Admin-ka.</div>}
              <ul>
                <li><BookOpen size={16} /> {lessons.length} lessons — one price, whole course</li>
                <li><Inf size={16} /> Lifetime access after approval</li>
                <li><Smartphone size={16} /> EVC Plus · Zaad · Sahal</li>
                <li><ShieldCheck size={16} /> Secure, account-locked access</li>
                <li><Award size={16} /> Certificate of completion</li>
              </ul>
            </div>
          </motion.aside>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 60 }}>
        <div className="container cd-grid" style={{ gridTemplateColumns: '1fr 380px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 50, minWidth: 0 }}>
            {course.whatYouLearn?.length > 0 && (
              <Reveal>
                <div className="panel">
                  <h2 className="display" style={{ fontSize: 32, marginTop: 0 }}>What you'll learn</h2>
                  <ul className="learn-list">{course.whatYouLearn.map((w, i) => <li key={i}><CheckCircle2 size={17} /> {w}</li>)}</ul>
                </div>
              </Reveal>
            )}
            <Reveal>
              <h2 className="display" style={{ fontSize: 32 }}>About this course</h2>
              <div style={{ whiteSpace: 'pre-wrap', color: 'var(--silver)', opacity: 0.88 }}>{course.description}</div>
            </Reveal>
            <Reveal>
              <h2 className="display" style={{ fontSize: 32 }}>Curriculum <span className="muted" style={{ fontSize: 16, fontFamily: 'var(--body)' }}>· {lessons.length} lessons</span></h2>
              {lessons.length ? (
                <div className="curriculum">
                  {lessons.map((l, i) => (
                    <motion.div className="lesson-row" key={l.id} initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.04 }}>
                      <span className="n">{String(i + 1).padStart(2, '0')}</span>
                      <span className="t">{l.title}</span>
                      <span className="icons">
                        {l.videoPath && <PlayCircle size={16} />}
                        {l.pdfs?.length > 0 && <FileText size={16} />}
                        {l.images?.length > 0 && <ImageIcon size={16} />}
                      </span>
                      {l.preview ? (
                        <Link to={`/learn/${id}?lesson=${l.id}`} className="chip approved"><Eye size={12} /> Preview</Link>
                      ) : enrolled ? (
                        <Link to={`/learn/${id}?lesson=${l.id}`} className="chip">Open</Link>
                      ) : (
                        <Lock size={15} color="var(--muted)" />
                      )}
                    </motion.div>
                  ))}
                </div>
              ) : (
                <p className="muted">Casharro wali lama soo gelin.</p>
              )}
            </Reveal>
            {course.instructor && (
              <Reveal>
                <div className="panel" style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
                  {course.instructorPhoto ? <img src={course.instructorPhoto} alt="" className="avatar" style={{ width: 80, height: 80 }} /> : <span className="avatar" style={{ width: 80, height: 80, fontSize: 26 }}>{initials(course.instructor)}</span>}
                  <div>
                    <span className="eyebrow">Instructor</span>
                    <h3 className="display" style={{ fontSize: 28, margin: '6px 0' }}>{course.instructor}</h3>
                    <p className="muted" style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{course.instructorBio || 'Expert instructor at Isdhis Academy.'}</p>
                  </div>
                </div>
              </Reveal>
            )}
            <Reviews courseId={id} reviews={reviews} rating={rating} enrolled={enrolled} />
          </div>
          <div />
        </div>
      </section>
    </>
  );
}

function Reviews({ courseId, reviews, rating, enrolled }) {
  const { user, profile } = useAuth();
  const toast = useToast();
  const mine = reviews.find((r) => r.uid === user?.uid);
  const [stars, setStars] = useState(5);
  const [text, setText] = useState('');
  useEffect(() => { if (mine) { setStars(mine.rating); setText(mine.comment); } }, [mine?.id]);

  const save = async (e) => {
    e.preventDefault();
    try {
      await setDoc(doc(db, C.reviews, enrollmentId(user.uid, courseId)), {
        uid: user.uid, courseId, name: profile?.name || user.email.split('@')[0], rating: stars, comment: text.trim(), createdAt: serverTimestamp(),
      });
      toast('Mahadsanid! Review-gaaga waa la kaydiyey.');
    } catch (err) { toast(errMsg(err), 'err'); }
  };

  return (
    <Reveal>
      <h2 className="display" style={{ fontSize: 32 }}>Reviews & ratings</h2>
      {reviews.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 10 }}>
          <span className="display gold-text" style={{ fontSize: 60 }}>{rating.toFixed(1)}</span>
          <div><Stars value={rating} size={20} /><div className="muted">{reviews.length} reviews</div></div>
        </div>
      )}
      {enrolled && (
        <form onSubmit={save} className="panel" style={{ marginBottom: 20 }}>
          <div style={{ marginBottom: 10 }}><Stars value={stars} size={24} onChange={setStars} /></div>
          <div className="field"><textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Share your experience with this course…" required /></div>
          <button className="btn btn-gold btn-sm">{mine ? 'Update review' : 'Post review'}</button>
        </form>
      )}
      {reviews.length ? reviews.map((r) => (
        <div key={r.id} className="review">
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <span className="avatar">{initials(r.name)}</span>
            <b>{r.name}</b> <Stars value={r.rating} size={13} /> <span className="muted" style={{ fontSize: 12, marginLeft: 'auto' }}>{fmtDate(r.createdAt)}</span>
          </div>
          <p style={{ margin: '10px 0 0 40px', color: 'var(--silver)' }}>{r.comment}</p>
        </div>
      )) : <p className="muted">No reviews yet.</p>}
    </Reveal>
  );
}
