import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldCheck, User, Lock, AlertTriangle, ArrowRight } from 'lucide-react';
import GoldField from '../components/GoldField';
import { Brand } from '../components/UI';
import { Magnetic } from '../components/Motion';
import { useAdmin } from '../context/AdminContext';
import { errMsg } from '../lib/utils';

export default function AdminLogin() {
  const { admin, login } = useAdmin();
  const nav = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [shake, setShake] = useState(0);

  if (admin) return <Navigate to="/admin" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setErr(''); setBusy(true);
    try { await login(username, password); nav('/admin', { replace: true }); }
    catch (e2) { setErr(errMsg(e2)); setShake((s) => s + 1); }
    setBusy(false);
  };

  return (
    <div className="admin-login">
      <GoldField density={800} offsetX={0.5} radius={0.42} className="" />
      <motion.form
        key={shake}
        onSubmit={submit}
        initial={shake ? { x: 0 } : { opacity: 0, y: 40, scale: 0.96 }}
        animate={shake ? { x: [0, -14, 14, -10, 10, -4, 0] } : { opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: shake ? 0.5 : 0.9, ease: [0.22, 1, 0.36, 1] }}
      >
        <Brand />
        <div className="eyebrow" style={{ marginTop: 26 }}><ShieldCheck size={13} /> Admin Panel</div>
        <h1 className="display" style={{ fontSize: 40, margin: '8px 0 24px', fontWeight: 500 }}>Admin login</h1>
        {err && <div className="alert err"><AlertTriangle size={17} /> {err}</div>}
        <div className="field"><label><User size={13} /> Username</label><input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" required /></div>
        <div className="field"><label><Lock size={13} /> Password</label><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required /></div>
        <Magnetic type="submit" disabled={busy} style={{ width: '100%', marginTop: 8 }}>{busy ? 'Checking…' : 'Login'} <ArrowRight size={17} /></Magnetic>
        <p className="muted" style={{ fontSize: 12, marginTop: 18, textAlign: 'center' }}>Verified against the IsdhisAdmin collection.</p>
      </motion.form>
    </div>
  );
}
