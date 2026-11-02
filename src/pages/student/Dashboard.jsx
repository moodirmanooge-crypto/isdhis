import { useEffect, useState } from 'react';
import { NavLink, Link, Routes, Route } from 'react-router-dom';
import { motion } from 'framer-motion';
import { collection, doc, getDoc, onSnapshot, query, where, updateDoc } from 'firebase/firestore';
import { BookOpen, PlayCircle, Wallet, Award, User, MonitorSmartphone, Bell } from 'lucide-react';
import { db } from '../../firebase';
import { C } from '../../lib/db';
import { money, fmtDate, fmtDateTime, byTimeDesc, errMsg } from '../../lib/utils';
import { getDeviceId, getDeviceLabel } from '../../lib/device';
import { useAuth } from '../../context/AuthContext';
import { Loader, Empty, StatusChip, useToast } from '../../components/UI';
import { SplitWords } from '../../components/Motion';

export default function Dashboard() {
  const { profile, user } = useAuth();
  return (
    <div className="container">
      <div className="dash-head">
        <div>
          <span className="eyebrow">Student Dashboard</span>
          <h1><SplitWords text={`Salaan, ${(profile?.name || user.displayName || 'Student').split(' ')[0]}.`} /></h1>
        </div>
        <Link to="/courses" className="btn btn-ghost">Browse courses</Link>
      </div>
      {profile?.status === 'blocked' && <div className="alert err">Account-kaaga waa la xannibay. Fadlan la xiriir Admin-ka.</div>}
      <Notifications />
      <nav className="tabs">
        <NavLink to="/dashboard" end><BookOpen size={14} style={{ verticalAlign: -2 }} /> My Courses</NavLink>
        <NavLink to="/dashboard/payments"><Wallet size={14} style={{ verticalAlign: -2 }} /> Payments</NavLink>
        <NavLink to="/dashboard/certificates"><Award size={14} style={{ verticalAlign: -2 }} /> Certificates</NavLink>
        <NavLink to="/dashboard/profile"><User size={14} style={{ verticalAlign: -2 }} /> Profile</NavLink>
      </nav>
      <div style={{ paddingBottom: 80 }}>
        <Routes>
          <Route index element={<MyCourses />} />
          <Route path="payments" element={<MyPayments />} />
          <Route path="certificates" element={<MyCertificates />} />
          <Route path="profile" element={<Profile />} />
        </Routes>
      </div>
    </div>
  );
}

function Notifications() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  useEffect(
    () =>
      onSnapshot(query(collection(db, C.notifications), where('to', '==', user.uid)), (s) =>
        setItems(s.docs.map((d) => ({ id: d.id, ...d.data() })).filter((n) => !n.read).sort(byTimeDesc())), () => {}
      ),
    [user.uid]
  );
  if (!items.length) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
      {items.slice(0, 3).map((n) => (
        <motion.div key={n.id} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className={`alert ${n.type === 'rejected' ? 'err' : 'ok'}`} style={{ margin: 0, justifyContent: 'space-between' }}>
          <span><Bell size={15} style={{ verticalAlign: -2 }} /> <b>{n.title}</b> — {n.body}</span>
          <button className="btn btn-sm btn-ghost" onClick={() => updateDoc(doc(db, C.notifications, n.id), { read: true })}>OK</button>
        </motion.div>
      ))}
    </div>
  );
}

function MyCourses() {
  const { user } = useAuth();
  const [items, setItems] = useState(null);
  const [progress, setProgress] = useState({});

  useEffect(() => {
    const u1 = onSnapshot(query(collection(db, C.enrollments), where('uid', '==', user.uid)), async (s) => {
      const ens = s.docs.map((d) => ({ id: d.id, ...d.data() })).sort(byTimeDesc());
      const withCourse = await Promise.all(
        ens.map(async (e) => {
          const c = await getDoc(doc(db, C.courses, e.courseId)).catch(() => null);
          return { ...e, course: c?.exists() ? { id: c.id, ...c.data() } : { id: e.courseId, title: e.courseTitle } };
        })
      );
      setItems(withCourse);
    }, () => setItems([]));
    const u2 = onSnapshot(query(collection(db, C.progress), where('uid', '==', user.uid)), (s) => {
      const m = {};
      s.docs.forEach((d) => (m[d.data().courseId] = (d.data().completed || []).length));
      setProgress(m);
    }, () => {});
    return () => { u1(); u2(); };
  }, [user.uid]);

  if (!items) return <Loader />;
  if (!items.length) return <Empty icon={BookOpen} title="No courses yet">Course ma iibsan wali. <Link to="/courses" style={{ color: 'var(--gold-hi)' }}>Browse courses</Link></Empty>;

  return (
    <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(440px, 1fr))' }}>
      {items.map((e, i) => {
        const total = e.course.lessonCount || 0;
        const pct = total ? Math.min(100, Math.round(((progress[e.courseId] || 0) / total) * 100)) : 0;
        return (
          <motion.div key={e.id} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
            <Link to={`/learn/${e.courseId}`} className="my-card">
              <div className="thumb">{e.course.thumbnail ? <img src={e.course.thumbnail} alt="" /> : <div className="ccard-thumb" style={{ height: '100%' }}><div className="ph">{(e.course.title || 'I')[0]}</div></div>}</div>
              <div className="body">
                <span className="eyebrow" style={{ fontSize: 10 }}>{e.course.category || 'Course'}</span>
                <h3 className="display" style={{ margin: 0, fontSize: 22 }}>{e.course.title}</h3>
                <div className="progress"><div style={{ width: `${pct}%` }} /></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span className="muted">{pct}% complete</span>
                  <span style={{ color: 'var(--gold-hi)', fontWeight: 700 }}><PlayCircle size={14} style={{ verticalAlign: -2 }} /> {pct ? 'Continue' : 'Start'}</span>
                </div>
              </div>
            </Link>
          </motion.div>
        );
      })}
    </div>
  );
}

function MyPayments() {
  const { user } = useAuth();
  const [rows, setRows] = useState(null);
  useEffect(
    () => onSnapshot(query(collection(db, C.payments), where('uid', '==', user.uid)), (s) => setRows(s.docs.map((d) => ({ id: d.id, ...d.data() })).sort(byTimeDesc())), () => setRows([])),
    [user.uid]
  );
  if (!rows) return <Loader />;
  if (!rows.length) return <Empty icon={Wallet} title="No payments yet" />;
  return (
    <div className="table-wrap">
      <table>
        <thead><tr><th>Course</th><th>Amount</th><th>Method</th><th>Transaction</th><th>Date</th><th>Status</th><th></th></tr></thead>
        <tbody>
          {rows.map((p) => (
            <tr key={p.id}>
              <td><b>{p.courseTitle}</b>{p.status === 'rejected' && p.rejectReason && <div style={{ color: '#ffb3b3', fontSize: 12 }}>Reason: {p.rejectReason}</div>}</td>
              <td>{money(p.amount)}</td>
              <td>{p.method}</td>
              <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{p.transactionId}</td>
              <td>{fmtDateTime(p.createdAt)}</td>
              <td><StatusChip status={p.status} /></td>
              <td>{p.status === 'rejected' && p.allowResubmit !== false && <Link className="btn btn-sm btn-gold" to={`/checkout/${p.courseId}`}>Resubmit</Link>}{p.status === 'approved' && <Link className="btn btn-sm btn-ghost" to={`/learn/${p.courseId}`}>Open</Link>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MyCertificates() {
  const { user } = useAuth();
  const [rows, setRows] = useState(null);
  useEffect(
    () => onSnapshot(query(collection(db, C.certificates), where('uid', '==', user.uid)), (s) => setRows(s.docs.map((d) => ({ id: d.id, ...d.data() }))), () => setRows([])),
    [user.uid]
  );
  if (!rows) return <Loader />;
  if (!rows.length) return <Empty icon={Award} title="No certificates yet">Dhammaystir dhammaan casharrada course-ka si aad u hesho certificate.</Empty>;
  return (
    <div className="grid">
      {rows.map((c) => (
        <Link key={c.id} to={`/certificate/${c.id}`} className="panel" style={{ display: 'flex', flexDirection: 'column', gap: 8, borderColor: 'rgba(212,175,55,.35)' }}>
          <Award color="var(--gold)" size={30} />
          <h3 className="display" style={{ margin: 0, fontSize: 22 }}>{c.courseTitle}</h3>
          <span className="muted" style={{ fontSize: 13 }}>Issued {fmtDate(c.issuedAt)} · {c.code}</span>
        </Link>
      ))}
    </div>
  );
}

function Profile() {
  const { user, profile, resetPassword } = useAuth();
  const toast = useToast();
  const [f, setF] = useState({ name: profile?.name || '', phone: profile?.phone || '' });
  const [device, setDevice] = useState(null);
  useEffect(() => { setF({ name: profile?.name || '', phone: profile?.phone || '' }); }, [profile?.name, profile?.phone]);
  useEffect(() => onSnapshot(doc(db, C.devices, user.uid), (s) => setDevice(s.exists() ? s.data() : null), () => {}), [user.uid]);

  const save = async (e) => {
    e.preventDefault();
    try { await updateDoc(doc(db, C.users, user.uid), { name: f.name.trim(), phone: f.phone.trim() }); toast('Profile-ka waa la kaydiyey'); }
    catch (e2) { toast(errMsg(e2), 'err'); }
  };
  const myId = getDeviceId();

  return (
    <div className="two-col">
      <form className="panel" onSubmit={save}>
        <h3>Profile</h3>
        <div className="field"><label>Full name</label><input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required /></div>
        <div className="field"><label>Email</label><input value={user.email} disabled /><small>Email-ku waa aqoonsiga account-kaaga.</small></div>
        <div className="field"><label>Phone</label><input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn btn-gold btn-sm">Save</button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => resetPassword(user.email).then(() => toast('Password reset link waa la diray'))}>Change password</button>
        </div>
      </form>
      <div className="panel">
        <h3><MonitorSmartphone size={18} style={{ verticalAlign: -3 }} color="var(--gold)" /> Devices</h3>
        <p className="muted" style={{ fontSize: 14 }}>Course-yada waxaa laga daawan karaa hal device oo keliya markiiba.</p>
        <div className="kv">
          <dt>This device</dt><dd>{getDeviceLabel()}</dd>
          <dt>Active device</dt><dd>{device?.activeLabel || '—'} {device?.activeDeviceId === myId && <span className="chip active">this device</span>}</dd>
          <dt>Reset requested</dt><dd>{device?.resetRequested ? 'Yes — waiting for admin' : 'No'}</dd>
        </div>
      </div>
    </div>
  );
}
