import { useEffect, useMemo, useState } from 'react';
import { useParams, Link, Navigate, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { addDoc, collection, doc, getDoc, getDocs, query, where, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable } from 'firebase/storage';
import { Copy, Upload, CheckCircle2, Smartphone, Tag, AlertTriangle, Hourglass, ArrowLeft, LogIn } from 'lucide-react';
import { db, storage } from '../../firebase';
import { C, S, enrollmentId } from '../../lib/db';
import { money, effectivePrice, errMsg, toDate } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { Loader, Empty, useToast } from '../../components/UI';
import { Magnetic } from '../../components/Motion';

/* Full-page checkout: /checkout/:id */
export default function Checkout() {
  const { id } = useParams();
  const [course, setCourse] = useState(undefined);
  useEffect(() => {
    getDoc(doc(db, C.courses, id)).then((s) => setCourse(s.exists() ? { id: s.id, ...s.data() } : null)).catch(() => setCourse(null));
  }, [id]);
  if (course === undefined) return <Loader />;
  if (!course) return <div className="container section"><Empty title="Course not found" /></div>;
  return (
    <div className="container" style={{ paddingBottom: 80 }}>
      <Link to={`/courses/${id}`} className="btn btn-sm btn-ghost" style={{ marginTop: 30 }}><ArrowLeft size={15} /> Back to course</Link>
      <div style={{ marginTop: 26 }}><PaymentPanel course={course} /></div>
    </div>
  );
}

/*
 * PaymentPanel — the whole "Complete Your Purchase" flow.
 * Used on /checkout/:id and inside the Buy Now window on the course page.
 * Visitors who are not logged in still see the amount, numbers and form;
 * they are asked to login/register only when they press Submit.
 */
export function PaymentPanel({ course, compact = false }) {
  const id = course.id;
  const { user, profile } = useAuth();
  const { settings } = useSettings();
  const toast = useToast();
  const nav = useNavigate();
  const methods = useMemo(() => (settings.paymentMethods || []).filter((m) => m.active !== false), [settings.paymentMethods]);
  const [state, setState] = useState(user ? 'loading' : 'ready'); // loading | ready | enrolled | pending | done
  const [method, setMethod] = useState(0);
  const [txn, setTxn] = useState('');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [coupon, setCoupon] = useState('');
  const [applied, setApplied] = useState(null);
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!user) return setState('ready');
    let alive = true;
    (async () => {
      const en = await getDoc(doc(db, C.enrollments, enrollmentId(user.uid, id))).catch(() => null);
      if (!alive) return;
      if (en?.exists()) return setState('enrolled');
      const ps = await getDocs(query(collection(db, C.payments), where('uid', '==', user.uid))).catch(() => null);
      if (!alive) return;
      if (ps?.docs.some((d) => d.data().courseId === id && d.data().status === 'pending')) return setState('pending');
      setState('ready');
    })();
    return () => { alive = false; };
  }, [id, user?.uid]);

  useEffect(() => { if (profile?.phone && !phone) setPhone(profile.phone); }, [profile?.phone]);

  if (state === 'loading') return <Loader />;
  if (state === 'enrolled') return <Navigate to={`/learn/${id}`} replace />;

  const base = effectivePrice(course);
  const amount = applied ? Math.max(0, +(applied.type === 'percent' ? base * (1 - applied.value / 100) : base - applied.value).toFixed(2)) : base;
  const m = methods[method] || methods[0];
  const loginNext = `/courses/${id}?buy=1`;

  const applyCoupon = async () => {
    setErr('');
    const code = coupon.trim().toUpperCase();
    if (!code) return;
    try {
      const s = await getDoc(doc(db, C.coupons, code));
      const c = s.exists() ? s.data() : null;
      if (!c || c.active === false) throw new Error('Discount code-kan ma shaqaynayo.');
      if (c.expiresAt && toDate(c.expiresAt) < new Date()) throw new Error('Discount code-kan wuu dhacay.');
      if (c.maxUses && (c.usedCount || 0) >= c.maxUses) throw new Error('Discount code-kan waa la isticmaalay oo dhan.');
      if (c.courseId && c.courseId !== id) throw new Error('Code-kan course-kan uma shaqeeyo.');
      setApplied({ code, type: c.type || 'percent', value: Number(c.value || 0) });
      toast(`Code ${code} waa la dabaqay`);
    } catch (e) { setApplied(null); setErr(e.message); }
  };

  const pick = (f) => {
    if (!f) return;
    if (!/^image\/(png|jpe?g|webp)$/.test(f.type)) return setErr('Screenshot-ku waa inuu ahaadaa JPG ama PNG.');
    if (f.size > 5 * 1024 * 1024) return setErr('Sawirku waa inuu ka yaraadaa 5MB.');
    setErr(''); setFile(f); setPreview(URL.createObjectURL(f));
  };

  const copy = (t) => navigator.clipboard?.writeText(t).then(() => toast('Number-ka waa la koobiyeeyey'));

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    if (!user) return nav(`/login?next=${encodeURIComponent(loginNext)}`);
    if (!m) return setErr('Payment method lama helin. Admin-ka la xiriir.');
    if (txn.trim().length < 4) return setErr('Geli Transaction ID sax ah.');
    if (!phone.trim()) return setErr('Geli number-ka aad lacagta ka dirtay.');
    if (!file) return setErr('Soo geli screenshot-ka lacag-bixinta.');
    setBusy(true);
    try {
      const path = S.payment(user.uid, file.name.replace(/[^\w.]/g, '_'));
      await new Promise((res, rej) => {
        const task = uploadBytesResumable(ref(storage, path), file, { contentType: file.type });
        task.on('state_changed', (s) => setProgress(Math.round((s.bytesTransferred / s.totalBytes) * 100)), rej, res);
      });
      const studentName = profile?.name || user.displayName || user.email;
      await addDoc(collection(db, C.payments), {
        uid: user.uid,
        studentName,
        studentEmail: user.email,
        courseId: id,
        courseTitle: course.title,
        amount,
        originalAmount: base,
        coupon: applied?.code || null,
        method: m.name,
        payTo: m.number,
        transactionId: txn.trim(),
        phone: phone.trim(),
        screenshotPath: path,
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      await addDoc(collection(db, C.notifications), {
        to: 'admin', type: 'payment', title: 'New payment submitted',
        body: `${studentName} — ${course.title} — ${money(amount)} via ${m.name}`, read: false, createdAt: serverTimestamp(),
      }).catch(() => {});
      setState('done');
    } catch (e2) { setErr(errMsg(e2)); }
    setBusy(false);
  };

  if (state === 'done' || state === 'pending') {
    return (
      <div style={{ padding: compact ? '30px 0' : '70px 0', textAlign: 'center' }}>
        <motion.div initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', damping: 12 }} style={{ display: 'inline-grid', placeItems: 'center', width: 100, height: 100, borderRadius: '50%', background: 'rgba(212,175,55,.1)', border: '1px solid var(--gold)', color: 'var(--gold)' }}>
          {state === 'done' ? <CheckCircle2 size={50} /> : <Hourglass size={46} />}
        </motion.div>
        <h2 className="display" style={{ fontSize: 'clamp(28px, 4vw, 48px)', margin: '24px 0 10px', fontWeight: 400 }}>
          {state === 'done' ? <>Payment Submitted <span className="gold-text" style={{ fontStyle: 'italic' }}>Successfully.</span></> : <>Payment <span className="gold-text" style={{ fontStyle: 'italic' }}>pending.</span></>}
        </h2>
        <p className="muted" style={{ fontSize: 17 }}>
          Awaiting Approval. Marka Admin-ku xaqiijiyo, course-ka <b style={{ color: '#fff' }}>{course.title}</b> wuxuu kuu furmayaa, wuxuuna ka muuqan doonaa My Courses.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 24, flexWrap: 'wrap' }}>
          <Link to="/dashboard/payments" className="btn btn-gold">View my payments</Link>
          <Link to="/courses" className="btn btn-ghost">Browse courses</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="checkout" style={{ padding: 0 }}>
      <div>
        <div className="panel" style={{ position: compact ? 'static' : 'sticky', top: 100 }}>
          <span className="eyebrow">Complete Your Purchase</span>
          <h2 className="display" style={{ fontSize: 30, margin: '12px 0 4px' }}>{course.title}</h2>
          <p className="muted" style={{ margin: 0 }}>Lifetime access after approval</p>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, margin: '18px 0' }}>
            <AnimatePresence mode="wait">
              <motion.span key={amount} className="price" style={{ fontSize: 50 }} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }}>{money(amount)}</motion.span>
            </AnimatePresence>
            {amount < base && <s className="muted">{money(base)}</s>}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input className="input" placeholder="Discount code" value={coupon} onChange={(e) => setCoupon(e.target.value)} />
            <button type="button" className="btn btn-ghost btn-sm" onClick={applyCoupon}><Tag size={14} /> Apply</button>
          </div>
          <hr style={{ border: 0, borderTop: '1px dashed var(--line-2)', margin: '22px 0' }} />
          <h4 style={{ margin: '0 0 10px' }}>Payment instructions</h4>
          <p className="muted" style={{ fontSize: 14, marginTop: 0 }}>{settings.paymentInstructions}</p>
          <ol className="steps-list">
            <li>Dooro payment method-ka (EVC Plus / Zaad / Sahal).</li>
            <li>U dir <b style={{ color: 'var(--gold-hi)' }}>{money(amount)}</b> number-ka.</li>
            <li>Koobi Transaction ID-ga fariinta lacagta.</li>
            <li>Buuxi form-ka, soo geli screenshot, kadibna Submit.</li>
          </ol>
        </div>
      </div>

      <form onSubmit={submit}>
        <div className="panel" style={{ marginBottom: 20 }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Smartphone size={20} color="var(--gold)" /> Payment Method</h3>
          {methods.length ? (
            <>
              <div className="pay-method">
                {methods.map((pm, i) => (
                  <button type="button" key={pm.name + i} className={method === i ? 'on' : ''} onClick={() => setMethod(i)}>{pm.name}</button>
                ))}
              </div>
              <AnimatePresence mode="wait">
                <motion.div key={method} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                  <div className="muted" style={{ fontSize: 13 }}>Send payment to the academy's registered {m?.name} number</div>
                  <div className="pay-number" style={{ margin: '8px 0' }}>
                    {m?.number}
                    <button type="button" className="icon-btn" onClick={() => copy(m?.number)} title="Copy"><Copy size={16} /></button>
                  </div>
                  <div style={{ fontSize: 14 }}>Account name: <b>{m?.holder}</b></div>
                </motion.div>
              </AnimatePresence>
            </>
          ) : (
            <div className="alert err">Admin-ku wali payment number ma gelin.</div>
          )}
        </div>

        <div className="panel">
          <h3>Submit Your Payment</h3>
          <p className="muted" style={{ marginTop: -6 }}>Course: {course.title} — {money(amount)}</p>
          {!user && (
            <div className="alert info" style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
              <span><LogIn size={16} style={{ verticalAlign: -3 }} /> Si aad u submit-gareyso, marka hore gal account-kaaga.</span>
              <span style={{ display: 'flex', gap: 8 }}>
                <Link className="btn btn-sm btn-gold" to={`/login?next=${encodeURIComponent(loginNext)}`}>Login</Link>
                <Link className="btn btn-sm btn-ghost" to={`/register?next=${encodeURIComponent(loginNext)}`}>Register</Link>
              </span>
            </div>
          )}
          {err && <div className="alert err"><AlertTriangle size={17} /> {err}</div>}
          <div className="field">
            <label>Transaction ID / Reference</label>
            <input value={txn} onChange={(e) => setTxn(e.target.value)} placeholder="Geli transaction ID-ga lacagta aad dirtay" required />
          </div>
          <div className="field">
            <label>Phone Number Used to Send Payment</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="061XXXXXXX" required />
          </div>
          <div className="field">
            <label>Upload Payment Screenshot</label>
            <div className="dropzone">
              <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => pick(e.target.files?.[0])} />
              {preview ? (
                <img src={preview} alt="receipt" style={{ maxHeight: 200, margin: '0 auto', borderRadius: 10 }} />
              ) : (
                <><Upload size={24} /><div>Upload payment receipt</div><small>JPG, PNG · max 5MB</small></>
              )}
            </div>
            {busy && progress > 0 && <div className="upload-bar"><div style={{ width: `${progress}%` }} /></div>}
          </div>
          <div className="alert info"><Hourglass size={16} /> Payment-ku wuxuu sugayaa xaqiijinta Admin-ka.</div>
          <Magnetic type="submit" disabled={busy || !methods.length} style={{ width: '100%' }}>
            {busy ? `Submitting… ${progress}%` : user ? 'Submit Payment' : 'Login to Submit Payment'}
          </Magnetic>
        </div>
      </form>
    </div>
  );
}
