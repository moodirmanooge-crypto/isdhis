import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useSearchParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, doc, getDoc, onSnapshot, query, where, setDoc, arrayUnion, serverTimestamp } from 'firebase/firestore';
import { ref, getDownloadURL } from 'firebase/storage';
import { Check, Lock, PlayCircle, FileText, Image as ImageIcon, ShieldAlert, Award, ChevronLeft, ChevronRight, MonitorSmartphone } from 'lucide-react';
import { db, storage } from '../../firebase';
import { C, enrollmentId } from '../../lib/db';
import { errMsg } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { useDeviceGuard } from '../../lib/useDeviceGuard';
import { Loader, Empty, Modal, useToast } from '../../components/UI';

export default function Learn() {
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const nav = useNavigate();
  const toast = useToast();
  const { user, profile } = useAuth();
  const { settings } = useSettings();
  const [course, setCourse] = useState(undefined);
  const [lessons, setLessons] = useState([]);
  const [enrolled, setEnrolled] = useState(null);
  const [completed, setCompleted] = useState([]);

  useEffect(() => {
    getDoc(doc(db, C.courses, id)).then((s) => setCourse(s.exists() ? { id: s.id, ...s.data() } : null)).catch(() => setCourse(null));
    return onSnapshot(query(collection(db, C.lessons), where('courseId', '==', id)), (s) =>
      setLessons(s.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (a.order || 0) - (b.order || 0))), () => {}
    );
  }, [id]);

  useEffect(() => {
    if (!user) return setEnrolled(false);
    if (profile?.status === 'blocked') return setEnrolled(false);
    getDoc(doc(db, C.enrollments, enrollmentId(user.uid, id))).then((s) => setEnrolled(s.exists())).catch(() => setEnrolled(false));
    return onSnapshot(doc(db, C.progress, enrollmentId(user.uid, id)), (s) => setCompleted(s.exists() ? s.data().completed || [] : []), () => {});
  }, [user, id, profile?.status]);

  const guard = useDeviceGuard(enrolled ? user : null, settings.deviceRestriction);

  const current = useMemo(() => {
    const want = params.get('lesson');
    const accessible = (l) => enrolled || l.preview;
    return lessons.find((l) => l.id === want && accessible(l)) || lessons.find(accessible) || null;
  }, [lessons, params, enrolled]);

  if (course === undefined || enrolled === null) return <Loader />;
  if (!course) return <div className="container section"><Empty title="Course not found" /></div>;

  const idx = current ? lessons.findIndex((l) => l.id === current.id) : -1;
  const pct = lessons.length ? Math.round((completed.filter((c) => lessons.some((l) => l.id === c)).length / lessons.length) * 100) : 0;
  const go = (l) => {
    if (!enrolled && !l.preview) return toast('Cashar-kan wuxuu u furan yahay ardayda course-ka iibsatay oo keliya.', 'err');
    setParams({ lesson: l.id });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const markDone = async (lessonId) => {
    if (!enrolled || completed.includes(lessonId)) return;
    try {
      await setDoc(doc(db, C.progress, enrollmentId(user.uid, id)), { uid: user.uid, courseId: id, completed: arrayUnion(lessonId), updatedAt: serverTimestamp() }, { merge: true });
    } catch (e) { toast(errMsg(e), 'err'); }
  };

  const getCert = async () => {
    const certId = enrollmentId(user.uid, id);
    try {
      const s = await getDoc(doc(db, C.certificates, certId)).catch(() => null);
      if (!s?.exists()) {
        await setDoc(doc(db, C.certificates, certId), {
          uid: user.uid, courseId: id, courseTitle: course.title, studentName: profile?.name || user.displayName || user.email,
          instructor: course.instructor || '', code: `ISD-${certId.slice(0, 6).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`, issuedAt: serverTimestamp(),
        });
      }
      nav(`/certificate/${certId}`);
    } catch (e) { toast(errMsg(e), 'err'); }
  };

  const blocked = enrolled && guard.status === 'blocked';
  const checking = enrolled && guard.status === 'checking';

  return (
    <div className="learn">
      <div className="learn-main">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
          <Link to={enrolled ? '/dashboard' : `/courses/${id}`} className="btn btn-sm btn-ghost"><ChevronLeft size={15} /> {enrolled ? 'My Courses' : 'Course'}</Link>
          <span className="muted" style={{ fontSize: 14 }}>{course.title}</span>
          {!enrolled && <Link to={`/courses/${id}`} className="btn btn-sm btn-gold" style={{ marginLeft: 'auto' }}>Buy full course</Link>}
        </div>

        {blocked ? (
          <DeviceBlocked guard={guard} />
        ) : checking ? (
          <Loader />
        ) : enrolled && guard.status === 'error' ? (
          <div className="alert err"><ShieldAlert size={18} /> Device-ka lama xaqiijin karo: {errMsg(guard.error)}</div>
        ) : !current ? (
          <Empty icon={Lock} title={lessons.length ? 'Lessons are locked' : 'No lessons yet'}>
            {lessons.length ? 'Iibso course-ka si aad u furto casharrada.' : 'Admin-ku wali casharro ma soo gelin.'}
          </Empty>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div key={current.id} initial={{ opacity: 0, y: 20, filter: 'blur(6px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.5 }}>
              <LessonView
                lesson={current}
                watermark={user ? `${user.email} · ${profile?.phone || ''}` : 'Isdhis Academy · Preview'}
                onEnded={() => markDone(current.id)}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, margin: '22px 0', flexWrap: 'wrap' }}>
                <div>
                  <span className="eyebrow">Lesson {idx + 1} of {lessons.length}</span>
                  <h1 className="display" style={{ fontSize: 'clamp(26px, 3.4vw, 40px)', margin: '8px 0 0', fontWeight: 500 }}>{current.title}</h1>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="icon-btn" disabled={idx <= 0} onClick={() => go(lessons[idx - 1])}><ChevronLeft size={18} /></button>
                  {enrolled && (
                    <button className={`btn btn-sm ${completed.includes(current.id) ? 'btn-ok' : 'btn-gold'}`} onClick={() => markDone(current.id)}>
                      <Check size={15} /> {completed.includes(current.id) ? 'Completed' : 'Mark complete'}
                    </button>
                  )}
                  <button className="icon-btn" disabled={idx >= lessons.length - 1} onClick={() => go(lessons[idx + 1])}><ChevronRight size={18} /></button>
                </div>
              </div>
              {current.description && <div className="panel" style={{ whiteSpace: 'pre-wrap', color: 'var(--silver)' }}>{current.description}</div>}
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      <aside className="learn-side">
        <div style={{ padding: 20, borderBottom: '1px solid var(--line)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8 }}>
            <b>Your progress</b><span className="gold-text" style={{ fontWeight: 800 }}>{pct}%</span>
          </div>
          <div className="progress"><div style={{ width: `${pct}%` }} /></div>
          {enrolled && pct === 100 && settings.certificatesEnabled && (
            <motion.button initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="btn btn-gold btn-sm" style={{ width: '100%', marginTop: 14 }} onClick={getCert}>
              <Award size={15} /> Get your certificate
            </motion.button>
          )}
        </div>
        {lessons.map((l, i) => {
          const open = enrolled || l.preview;
          const done = completed.includes(l.id);
          return (
            <div key={l.id} className={`l ${current?.id === l.id ? 'on' : ''}`} onClick={() => go(l)} style={{ opacity: open ? 1 : 0.5 }}>
              <span className={`ck ${done ? 'done' : ''}`}>{done ? <Check size={13} /> : open ? <span style={{ fontSize: 10, fontFamily: 'var(--mono)' }}>{i + 1}</span> : <Lock size={11} />}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{l.title}</div>
                <div style={{ display: 'flex', gap: 8, color: 'var(--muted)', marginTop: 4 }}>
                  {l.videoPath && <PlayCircle size={13} />}
                  {l.pdfs?.length > 0 && <FileText size={13} />}
                  {l.images?.length > 0 && <ImageIcon size={13} />}
                  {l.preview && !enrolled && <span className="chip approved" style={{ padding: '0 8px', fontSize: 10 }}>Preview</span>}
                </div>
              </div>
            </div>
          );
        })}
      </aside>
    </div>
  );
}

function DeviceBlocked({ guard }) {
  const [sent, setSent] = useState(!!guard.data?.resetRequested);
  return (
    <div className="panel" style={{ textAlign: 'center', padding: 50 }}>
      <MonitorSmartphone size={46} color="var(--gold)" />
      <h2 className="display" style={{ fontSize: 34, fontWeight: 500 }}>Device-kan waa xiran yahay</h2>
      <p className="muted" style={{ maxWidth: 520, margin: '0 auto 10px' }}>
        Account-kaagu wuxuu ku shaqaynayaa hal device oo keliya markiiba. Device-ka hadda active ah: <b style={{ color: '#fff' }}>{guard.data?.activeLabel || 'device kale'}</b>.
      </p>
      <p className="muted" style={{ maxWidth: 520, margin: '0 auto 24px' }}>Codso device reset — Admin-ka ayaa ka saari doona device-kii hore.</p>
      {sent ? (
        <div className="alert info" style={{ display: 'inline-flex' }}>Codsigaaga waa la diray. Sug Admin-ka, kadib page-ka refresh garee.</div>
      ) : (
        <button className="btn btn-gold" onClick={() => guard.requestReset().then(() => setSent(true))}>Request device reset</button>
      )}
      <div style={{ marginTop: 14 }}><button className="btn btn-sm btn-ghost" onClick={guard.recheck}>Check again</button></div>
    </div>
  );
}

function LessonView({ lesson, watermark, onEnded }) {
  const [video, setVideo] = useState(null);
  const [verr, setVerr] = useState('');
  const [img, setImg] = useState(null);
  const [pos, setPos] = useState({ top: '10%', left: '8%' });
  const toast = useToast();
  const vref = useRef(null);

  useEffect(() => {
    setVideo(null); setVerr('');
    if (!lesson.videoPath) return;
    getDownloadURL(ref(storage, lesson.videoPath)).then(setVideo).catch((e) => setVerr(errMsg(e)));
  }, [lesson.id, lesson.videoPath]);

  // moving watermark — makes screen recordings traceable to the account
  useEffect(() => {
    const t = setInterval(() => setPos({ top: `${8 + Math.random() * 80}%`, left: `${4 + Math.random() * 60}%` }), 4000);
    return () => clearInterval(t);
  }, []);

  const openFile = async (f) => {
    try {
      const url = await getDownloadURL(ref(storage, f.path));
      window.open(url, '_blank', 'noopener');
    } catch (e) { toast(errMsg(e), 'err'); }
  };
  const openImg = async (f) => {
    try { setImg({ name: f.name, url: await getDownloadURL(ref(storage, f.path)) }); } catch (e) { toast(errMsg(e), 'err'); }
  };

  return (
    <>
      {lesson.videoPath ? (
        <div className="player" onContextMenu={(e) => e.preventDefault()}>
          {video ? (
            <video
              ref={vref}
              src={video}
              controls
              controlsList="nodownload noremoteplayback"
              disablePictureInPicture
              playsInline
              onEnded={onEnded}
            />
          ) : (
            <div className="center-msg">{verr ? <span><ShieldAlert /> <br />{verr}</span> : <div className="ring" style={{ width: 40, height: 40, borderRadius: '50%', border: '2px solid rgba(212,175,55,.2)', borderTopColor: 'var(--gold)', animation: 'spin .9s linear infinite' }} />}</div>
          )}
          <div className="watermark" style={pos}>{watermark}</div>
        </div>
      ) : null}

      {(lesson.pdfs?.length > 0 || lesson.images?.length > 0) && (
        <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {lesson.pdfs?.length > 0 && (
            <div className="files">
              {lesson.pdfs.map((f) => (
                <button key={f.path} className="file-pill" onClick={() => openFile(f)}><FileText size={16} color="var(--gold)" /> {f.name}</button>
              ))}
            </div>
          )}
          {lesson.images?.length > 0 && <LessonImages images={lesson.images} onOpen={openImg} />}
        </div>
      )}
      <Modal open={!!img} onClose={() => setImg(null)} title={img?.name} wide>
        {img && <img src={img.url} alt="" style={{ width: '100%', borderRadius: 12 }} onContextMenu={(e) => e.preventDefault()} />}
      </Modal>
    </>
  );
}

function LessonImages({ images, onOpen }) {
  const [urls, setUrls] = useState({});
  useEffect(() => {
    images.forEach((f) => getDownloadURL(ref(storage, f.path)).then((u) => setUrls((x) => ({ ...x, [f.path]: u }))).catch(() => {}));
  }, [images.map((i) => i.path).join()]);
  return (
    <div className="lesson-images">
      {images.map((f) => (urls[f.path] ? <img key={f.path} src={urls[f.path]} alt={f.name} onClick={() => onOpen(f)} onContextMenu={(e) => e.preventDefault()} /> : <div key={f.path} className="ccard-thumb" style={{ borderRadius: 12 }} />))}
    </div>
  );
}
