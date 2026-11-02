import { useEffect, useMemo, useState } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { addDoc, collection, doc, getDoc, getDocs, query, where, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable } from 'firebase/storage';
import { Copy, Upload, CheckCircle2, Smartphone, Tag, AlertTriangle, Hourglass, ArrowLeft } from 'lucide-react';
import { db, storage } from '../../firebase';
import { C, S, enrollmentId } from '../../lib/db';
import { money, effectivePrice, errMsg, toDate } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { Loader, Empty, useToast } from '../../components/UI';
import { Magnetic } from '../../components/Motion';

export default function Checkout() {
  const { id } = useParams();
  const { user, profile } = useAuth();
  const { settings } = useSettings();
  const toast = useToast();
  const methods = useMemo(() => (settings.paymentMethods || []).filter((m) => m.active !== false), [settings.paymentMethods]);
  const [course, setCourse] = useState(undefined);
  const [state, setState] = useState('loading'); // loading | ready | enrolled | pending | done
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
    (async () => {
      try {
        const s = await getDoc(doc(db, C.courses, id));
        if (!s.exists()) return setCourse(null);
        setCourse({ id: s.id, ...s.data() });
        const en = await getDoc(doc(db, C.enrollments, enrollmentId(user.uid, id))).catch(() => null);
        if (en?.exists()) return setState('enrolled');
        const ps = await getDocs(query(collection(db, C.payments), where('uid', '==', user.uid)));
        if (ps.docs.some((d) => d.data().courseId === id && d.data().status === 'pending')) return setState('pending');
        setState('ready');
      } catch {
        setCourse(null);
      }
    })();
  }, [id, user.uid]);

  useEffect(() => { if (profile?.phone && !phone) setPhone(profile.phone); }, [profile?.phone]);

  if (course === undefined || state === 'loading') return <Loader />;
  if (!course) return <div className="container section"><Empty title="Course not found" /></div>;
  if (state === 'enrolled') return <Navigate to={`/learn/${id}`} replace />;

  const base = effectivePrice(course);
  const amount = applied ? Math.max(0, +(applied.type === 'percent' ? base * (1 - applied.value / 100) : base - applied.value).toFixed(2)) : base;
  const m = methods[method] || methods[0];

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
        to: 'admin',
        type: 'payment',
        title: 'New payment submitted',
        body: `${studentName} — ${course.title} — ${money(amount)} via ${m.name}`,
        read: false,
        createdAt: serverTimestamp(),
      }).catch(() => {});
      setState('done');
    } catch (e2) { setErr(errMsg(e2)); }
    setBusy(false);
  };

  if (state === 'done' || state === 'pending') {
    return (
      <div className="container" style={{ padding: '100px 0', textAlign: 'center' }}>
        <motion.div initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', damping: 12 }} style={{ display: 'inline-grid', placeItems: 'center', width: 110, height: 110, borderRadius: '50%', background: 'rgba(212,175,55,.1)', border: '1px solid var(--gold)', color: 'var(--gold)' }}>
          {state === 'done' ? <CheckCircle2 size={54} /> : <Hourglass size={50} />}
        </motion.div>
        <motion.h1 className="display" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} style={{ fontSize: 'clamp(34px, 5vw, 60px)', margin: '28px 0 10px', fontWeight: 400 }}>
          {state === 'done' ? <>Payment Submitted <span className="gold-text" style={{ fontStyle: 'italic' }}>Successfully.</span></> : <>Payment <span className="gold-text" style={{ fontStyle: 'italic' }}>pending.</span></>}
        </motion.h1>
        <motion.p className="muted" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} style={{ fontSize: 18 }}>
          Awaiting Approval. Marka Admin-ku xaqiijiyo, course-ka <b style={{ color: '#fff' }}>{course.title}</b> wuxuu ka soo muuqan doonaa My Courses.
        </motion.p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 30, flexWrap: 'wrap' }}>
          <Link to="/dashboard/payments" className="btn btn-gold">View my payments</Link>
          <Link to="/courses" className="btn btn-ghost">Browse courses</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <Link to={`/courses/${id}`} className="btn btn-sm btn-ghost" style={{ marginTop: 30 }}><ArrowLeft size={15} /> Back to course</Link>
      <div className="checkout" style={{ paddingTop: 26 }}>
        <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8 }}>
          <div className="panel" style={{ position: 'sticky', top: 100 }}>
            <span className="eyebrow">Complete Your Purchase</span>
            <h2 className="display" style={{ fontSize: 34, margin: '12px 0 4px' }}>{course.title}</h2>
            <p className="muted" style={{ margin: 0 }}>Lifetime access after approval</p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, margin: '22px 0' }}>
              <AnimatePresence mode="wait">
                <motion.span key={amount} className="price" style={{ fontSize: 56 }} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }}>{money(amount)}</motion.span>
              </AnimatePresence>
              {amount < base && <s className="muted">{money(base)}</s>}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input className="input" placeholder="Discount code" value={coupon} onChange={(e) => setCoupon(e.target.value)} />
              <button type="button" className="btn btn-ghost btn-sm" onClick={applyCoupon}><Tag size={14} /> Apply</button>
            </div>
            <hr style={{ border: 0, borderTop: '1px dashed var(--line-2)', margin: '24px 0' }} />
            <h4 style={{ margin: '0 0 12px' }}>Payment instructions</h4>
            <p className="muted" style={{ fontSize: 14, marginTop: 0 }}>{settings.paymentInstructions}</p>
            <ol className="steps-list">
              <li>Dooro payment method-ka (EVC Plus / Zaad / Sahal).</li>
              <li>U dir <b style={{ color: 'var(--gold-hi)' }}>{money(amount)}</b> number-ka hoose.</li>
              <li>Koobi Transaction ID-ga fariinta lacagta.</li>
              <li>Buuxi form-ka, soo geli screenshot, kadibna Submit.</li>
            </ol>
          </div>
        </motion.div>

        <motion.form onSubmit={submit} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, delay: 0.1 }}>
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
                  <img src={preview} alt="receipt" style={{ maxHeight: 220, margin: '0 auto', borderRadius: 10 }} />
                ) : (
                  <><Upload size={24} /><div>Upload payment receipt</div><small>JPG, PNG · max 5MB</small></>
                )}
              </div>
              {busy && progress > 0 && <div className="upload-bar"><div style={{ width: `${progress}%` }} /></div>}
            </div>
            <div className="alert info"><Hourglass size={16} /> Payment-ku wuxuu sugayaa xaqiijinta Admin-ka.</div>
            <Magnetic type="submit" disabled={busy || !methods.length} style={{ width: '100%' }}>{busy ? `Submitting… ${progress}%` : 'Submit Payment'}</Magnetic>
          </div>
        </motion.form>
      </div>
    </div>
  );
}
