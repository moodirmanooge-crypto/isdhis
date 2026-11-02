import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { collection, doc, getDoc, onSnapshot, query, where, setDoc, serverTimestamp } from 'firebase/firestore';
import { ref, getDownloadURL } from 'firebase/storage';
import { CheckCircle2, PlayCircle, FileText, Image as ImageIcon, Lock, Eye, Clock, BookOpen, Infinity as Inf, Award, Smartphone, ShieldCheck, Hourglass, Play } from 'lucide-react';
import { db, storage } from '../firebase';
import { C, enrollmentId } from '../lib/db';
import { money, effectivePrice, initials, fmtDate, errMsg } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import { Loader, Empty, Stars, Modal, useToast } from '../components/UI';
import { SplitWords, Reveal, Magnetic } from '../components/Motion';
import { PaymentPanel } from './student/Checkout';

const fmtDur = (s) => (s ? `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}` : '');

export default function CourseDetails() {
  const { id } = useParams();
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const toast = useToast();
  const { user, profile } = useAuth();
  const [course, setCourse] = useState(undefined);
  const [lessons, setLessons] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [enrolled, setEnrolled] = useState(false);
  const [pending, setPending] = useState(false);
  const [busy, setBusy] = useState(false);
  const [buyOpen, setBuyOpen] = useState(false);
  const [lightbox, setLightbox] = useState(null);

  useEffect(() => onSnapshot(doc(db, C.courses, id), (s) => setCourse(s.exists() ? { id: s.id, ...s.data() } : null), () => setCourse(null)), [id]);

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

  // back from login with ?buy=1 → open the payment window automatically
  useEffect(() => {
    if (params.get('buy') === '1' && course) {
      setBuyOpen(true);
      params.delete('buy');
      setParams(params, { replace: true });
    }
  }, [params, course]);

  const rating = useMemo(() => (reviews.length ? reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length : 0), [reviews]);
  const totalSecs = lessons.reduce((s, l) => s + (l.videoDuration || 0), 0);
  const counts = useMemo(() => ({
    videos: lessons.filter((l) => l.videoPath).length,
    pdfs: lessons.reduce((s, l) => s + (l.pdfs?.length || 0), 0),
    images: lessons.reduce((s, l) => s + (l.images?.length || 0), 0),
  }), [lessons]);

  if (course === undefined) return <Loader />;
  if (!course) return <div className="container section"><Empty icon={BookOpen} title="Course not found">Course-kan ma jiro ama lama daabicin.</Empty></div>;

  const price = effectivePrice(course);
  const isFree = price === 0;

  const buy = async () => {
    if (enrolled) return nav(`/learn/${id}`);
    if (isFree) {
      if (!user) return nav(`/login?next=${encodeURIComponent(`/courses/${id}`)}`);
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
    setBuyOpen(true);
  };

  const openLesson = (l) => {
    if (enrolled || l.preview) return nav(`/learn/${id}?lesson=${l.id}`);
    toast(pending ? 'Lacag-bixintaada waa la sugayaa — marka la oggolaado ayaad daawan kartaa.' : 'Cashar-kan wuu xiran yahay. Iibso course-ka si aad u daawato.', 'err');
    if (!pending) setBuyOpen(true);
  };

  const label = enrolled ? 'Continue Learning' : pending ? 'Payment pending approval' : isFree ? 'Enroll for Free' : 'Buy Now';

  return (
    <>
      <section className="cd-hero">
        {course.thumbnail && <div className="bg" style={{ backgroundImage: `url(${course.thumbnail})` }} />}
        <div className="container cd-grid">
          <div style={{ minWidth: 0 }}>
            <Link to={`/courses?cat=${encodeURIComponent(course.category || '')}`} className="eyebrow">{course.category || 'Course'}</Link>
            <h1 className="display"><SplitWords text={course.title} /></h1>
            <Reveal delay={0.3}><p style={{ fontSize: 19, color: 'var(--silver)', opacity: 0.85, maxWidth: 680 }}>{course.shortDescription}</p></Reveal>
            <Reveal delay={0.4}>
              <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap', alignItems: 'center', marginTop: 20, fontSize: 14 }}>
                {reviews.length > 0 && <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}><b style={{ color: 'var(--gold-hi)' }}>{rating.toFixed(1)}</b><Stars value={rating} /> <span className="muted">({reviews.length})</span></span>}
                <span className="ccard-meta"><span><BookOpen size={15} /> {lessons.length} lessons</span></span>
                {(course.duration || totalSecs > 0) && <span className="ccard-meta"><span><Clock size={15} /> {course.duration || `${Math.round(totalSecs / 60)} min`}</span></span>}
                {course.level && <span className="chip">{course.level}</span>}
                {course.instructor && <span className="inst" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span className="avatar">{initials(course.instructor)}</span> {course.instructor}</span>}
              </div>
            </Reveal>
          </div>
          <motion.aside className="buy-card" initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}>
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
                {counts.videos > 0 && <li><PlayCircle size={16} /> {counts.videos} videos{totalSecs ? ` · ${Math.round(totalSecs / 60)} min` : ''}</li>}
                {counts.pdfs > 0 && <li><FileText size={16} /> {counts.pdfs} PDF files</li>}
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
        <div className="container" style={{ display: 'flex', flexDirection: 'column', gap: 56, maxWidth: 1000, marginInline: 'auto' }}>
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

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
              <h2 className="display" style={{ fontSize: 32, margin: 0 }}>
                Course lessons <span className="muted" style={{ fontSize: 16, fontFamily: 'var(--body)' }}>· {lessons.length} lessons{counts.images ? ` · ${counts.images} images` : ''}</span>
              </h2>
              {!enrolled && lessons.length > 0 && <span className="chip pending"><Lock size={12} /> {pending ? 'Waiting for approval' : 'Locked until purchase'}</span>}
            </div>
            {lessons.length ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                {lessons.map((l, i) => (
                  <LessonCard key={l.id} lesson={l} index={i} course={course} open={enrolled || l.preview} enrolled={enrolled} onOpen={() => openLesson(l)} onImage={setLightbox} />
                ))}
              </div>
            ) : (
              <p className="muted">Casharro wali lama soo gelin.</p>
            )}
            {!enrolled && !pending && lessons.length > 0 && !isFree && (
              <div className="panel" style={{ marginTop: 22, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap', borderColor: 'rgba(212,175,55,.35)' }}>
                <div><b>Unlock all {lessons.length} lessons</b><div className="muted" style={{ fontSize: 14 }}>Hal lacag — course-ka oo dhan, weligaa.</div></div>
                <button className="btn btn-gold" onClick={() => setBuyOpen(true)}>Buy Now · {money(price)}</button>
              </div>
            )}
          </div>

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
      </section>

      <Modal open={buyOpen} onClose={() => setBuyOpen(false)} title="Buy course" wide>
        {buyOpen && <PaymentPanel course={course} compact />}
      </Modal>
      <Modal open={!!lightbox} onClose={() => setLightbox(null)} title={lightbox?.name || ''} wide>
        {lightbox && <img src={lightbox.url} alt="" style={{ width: '100%', borderRadius: 12 }} />}
      </Modal>
    </>
  );
}

/* Load an image URL: stored public URL first, otherwise ask Storage. */
function useImageUrl(img) {
  const [url, setUrl] = useState(img?.url || '');
  useEffect(() => {
    if (!img || img.url) return setUrl(img?.url || '');
    let alive = true;
    getDownloadURL(ref(storage, img.path)).then((u) => alive && setUrl(u)).catch(() => {});
    return () => { alive = false; };
  }, [img?.path, img?.url]);
  return url;
}

function Thumb({ img, onClick }) {
  const url = useImageUrl(img);
  return (
    <button type="button" onClick={() => url && onClick({ name: img.name, url })} style={{ padding: 0, border: '1px solid var(--line)', borderRadius: 10, overflow: 'hidden', background: 'var(--card-2)', cursor: 'zoom-in', width: 92, height: 66, flexShrink: 0 }}>
      {url ? <img src={url} alt={img.name} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <ImageIcon size={18} color="var(--muted)" />}
    </button>
  );
}

function LessonCard({ lesson: l, index, course, open, enrolled, onOpen, onImage }) {
  const firstImg = useImageUrl(l.images?.[0]);
  const cover = l.posterUrl || firstImg || course.thumbnail;
  return (
    <motion.article
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.6, delay: Math.min(index, 4) * 0.06 }}
      className="lesson-card"
    >
      <button type="button" className="lesson-cover" onClick={onOpen} aria-label={open ? 'Play lesson' : 'Locked lesson'}>
        {cover ? <img src={cover} alt="" loading="lazy" className={open ? '' : 'locked'} /> : <div className="ph" />}
        <span className={`lesson-play ${open ? '' : 'is-locked'}`}>{open ? <Play size={22} fill="currentColor" /> : <Lock size={20} />}</span>
        {l.videoPath && l.videoDuration > 0 && <span className="lesson-dur">{fmtDur(l.videoDuration)}</span>}
        {!open && <span className="lesson-badge"><Lock size={11} /> Locked</span>}
        {l.preview && !enrolled && <span className="lesson-badge free"><Eye size={11} /> Free preview</span>}
      </button>
      <div className="lesson-body">
        <span className="eyebrow" style={{ fontSize: 11 }}>Lesson {String(index + 1).padStart(2, '0')}</span>
        <h3>{l.title}</h3>
        {l.description && <p className="muted lesson-desc">{l.description}</p>}
        <div className="ccard-meta">
          {l.videoPath && <span><PlayCircle size={14} /> Video</span>}
          {l.pdfs?.length > 0 && <span><FileText size={14} /> {l.pdfs.length} PDF{open ? '' : ' (locked)'}</span>}
          {l.images?.length > 0 && <span><ImageIcon size={14} /> {l.images.length} images</span>}
        </div>
        {l.images?.length > 0 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {l.images.map((im) => <Thumb key={im.path} img={im} onClick={onImage} />)}
          </div>
        )}
      </div>
    </motion.article>
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
