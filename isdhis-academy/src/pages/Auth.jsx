import { useState } from 'react';
import { Link, useNavigate, useSearchParams, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, User, Phone, ArrowRight, AlertTriangle } from 'lucide-react';
import GoldField from '../components/GoldField';
import { useAuth } from '../context/AuthContext';
import { errMsg } from '../lib/utils';
import { Magnetic } from '../components/Motion';
import { useToast } from '../components/UI';

function Art({ quote }) {
  return (
    <div className="auth-art">
      <GoldField density={700} radius={0.4} offsetX={0.5} className="" />
      <motion.blockquote initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 1 }}>
        {quote[0]} <span className="gold-text" style={{ fontStyle: 'italic' }}>{quote[1]}</span>
      </motion.blockquote>
    </div>
  );
}

const fieldAnim = (i) => ({ initial: { opacity: 0, y: 18 }, animate: { opacity: 1, y: 0 }, transition: { delay: 0.15 + i * 0.07 } });

export function Login() {
  const { login, resetPassword, user } = useAuth();
  const [params] = useSearchParams();
  const next = params.get('next') || '/dashboard';
  const nav = useNavigate();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={next} replace />;

  const submit = async (e) => {
    e.preventDefault();
    setErr(''); setBusy(true);
    try { await login(email, password); nav(next, { replace: true }); }
    catch (e2) { setErr(errMsg(e2)); }
    setBusy(false);
  };

  const forgot = async () => {
    if (!email) return setErr('Marka hore geli email-kaaga.');
    try { await resetPassword(email); toast('Link-ga password reset-ka waxaa loo diray email-kaaga.'); }
    catch (e2) { setErr(errMsg(e2)); }
  };

  return (
    <div className="auth-wrap">
      <Art quote={['Welcome back.', 'Keep leading.']} />
      <div className="auth-form">
        <form onSubmit={submit}>
          <motion.span className="eyebrow" {...fieldAnim(0)}>Student Login</motion.span>
          <motion.h1 {...fieldAnim(1)}>Sign in</motion.h1>
          <motion.p className="muted" {...fieldAnim(2)} style={{ marginTop: 0, marginBottom: 26 }}>Ku gal email-kaaga iyo password-kaaga.</motion.p>
          {err && <div className="alert err"><AlertTriangle size={17} /> {err}</div>}
          <motion.div className="field" {...fieldAnim(3)}>
            <label><Mail size={13} /> Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          </motion.div>
          <motion.div className="field" {...fieldAnim(4)}>
            <label><Lock size={13} /> Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
          </motion.div>
          <motion.div {...fieldAnim(5)} style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 18 }}>
            <button type="button" onClick={forgot} style={{ background: 'none', border: 0, color: 'var(--gold)', cursor: 'pointer', fontSize: 13 }}>Forgot password?</button>
          </motion.div>
          <motion.div {...fieldAnim(6)}>
            <Magnetic type="submit" disabled={busy} style={{ width: '100%' }}>{busy ? 'Signing in…' : 'Login'} <ArrowRight size={17} /></Magnetic>
          </motion.div>
          <motion.p {...fieldAnim(7)} className="muted" style={{ textAlign: 'center', marginTop: 22 }}>
            New here? <Link to={`/register${params.get('next') ? `?next=${encodeURIComponent(next)}` : ''}`} style={{ color: 'var(--gold-hi)' }}>Create an account</Link>
          </motion.p>
        </form>
      </div>
    </div>
  );
}

export function Register() {
  const { register, user } = useAuth();
  const [params] = useSearchParams();
  const next = params.get('next') || '/dashboard';
  const nav = useNavigate();
  const [f, setF] = useState({ name: '', email: '', phone: '', password: '', confirm: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  if (user && !busy) return <Navigate to={next} replace />;

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    if (f.password.length < 6) return setErr('Password-ku waa inuu ahaadaa ugu yaraan 6 xaraf.');
    if (f.password !== f.confirm) return setErr('Labada password isma laha.');
    setBusy(true);
    try { await register(f); nav(next, { replace: true }); }
    catch (e2) { setErr(errMsg(e2)); setBusy(false); }
  };

  return (
    <div className="auth-wrap">
      <Art quote={['Your journey', 'begins today.']} />
      <div className="auth-form">
        <form onSubmit={submit}>
          <motion.span className="eyebrow" {...fieldAnim(0)}>Join Academy</motion.span>
          <motion.h1 {...fieldAnim(1)}>Create account</motion.h1>
          <motion.p className="muted" {...fieldAnim(2)} style={{ marginTop: 0, marginBottom: 26 }}>Email-kaagu wuxuu noqonayaa aqoonsiga account-kaaga.</motion.p>
          {err && <div className="alert err"><AlertTriangle size={17} /> {err}</div>}
          <motion.div className="field" {...fieldAnim(3)}><label><User size={13} /> Full name</label><input value={f.name} onChange={set('name')} required /></motion.div>
          <motion.div className="field" {...fieldAnim(4)}><label><Mail size={13} /> Email</label><input type="email" value={f.email} onChange={set('email')} required autoComplete="email" /></motion.div>
          <motion.div className="field" {...fieldAnim(5)}><label><Phone size={13} /> Phone</label><input value={f.phone} onChange={set('phone')} placeholder="061XXXXXXX" /></motion.div>
          <motion.div className="row2" {...fieldAnim(6)}>
            <div className="field"><label><Lock size={13} /> Password</label><input type="password" value={f.password} onChange={set('password')} required autoComplete="new-password" /></div>
            <div className="field"><label>Confirm</label><input type="password" value={f.confirm} onChange={set('confirm')} required autoComplete="new-password" /></div>
          </motion.div>
          <motion.div {...fieldAnim(7)}>
            <Magnetic type="submit" disabled={busy} style={{ width: '100%', marginTop: 6 }}>{busy ? 'Creating…' : 'Register'} <ArrowRight size={17} /></Magnetic>
          </motion.div>
          <motion.p {...fieldAnim(8)} className="muted" style={{ textAlign: 'center', marginTop: 22 }}>
            Already have an account? <Link to="/login" style={{ color: 'var(--gold-hi)' }}>Login</Link>
          </motion.p>
        </form>
      </div>
    </div>
  );
}
