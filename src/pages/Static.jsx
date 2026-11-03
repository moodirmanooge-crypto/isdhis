import { useState } from 'react';
import { Link } from 'react-router-dom';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { Mail, Phone, MapPin, Send, Target, Eye, Heart, Wrench, Compass } from 'lucide-react';
import { db } from '../firebase';
import { C } from '../lib/db';
import { errMsg } from '../lib/utils';
import { useSettings } from '../context/SettingsContext';
import { SplitWords, Reveal, Magnetic } from '../components/Motion';
import { BreathText } from '../components/TextFx';
import { useToast } from '../components/UI';
import GoldField from '../components/GoldField';

export function About() {
  const { settings } = useSettings();
  return (
    <>
      <section className="section" style={{ paddingTop: 60 }}>
        <div className="container">
          <span className="eyebrow">About Us</span>
          <h1 className="display" style={{ fontSize: 'clamp(44px, 9vw, 130px)', margin: '14px 0 30px', fontWeight: 300 }}>
            <BreathText text="We build" /><br />
            <span className="gold-text" style={{ fontStyle: 'italic' }}><SplitWords text="future leaders." /></span>
          </h1>
          <Reveal>
            <p style={{ fontSize: 22, maxWidth: 820, color: 'var(--silver)', fontFamily: 'var(--display)', fontWeight: 300, lineHeight: 1.45 }}>
              {settings.siteName} is an online academy that gives Somali learners — and everyone, everywhere — access to practical, expert-led courses. We believe knowledge should be affordable, accessible and built for real careers.
            </p>
          </Reveal>
        </div>
      </section>
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="feature-grid">
            {[
              [Target, 'Our mission', 'Make professional skills reachable for every learner through clear, high-quality online courses.'],
              [Eye, 'Our vision', 'Become the leading e-learning academy in the Horn of Africa.'],
              [Heart, 'Our values', 'Quality, honesty and respect for every student’s time and money.'],
            ].map(([Icon, t, d], i) => (
              <Reveal key={t} delay={i * 0.1} className="feature">
                <span className="num">0{i + 1}</span>
                <Icon className="ic" size={26} />
                <h3>{t}</h3>
                <p>{d}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <Reveal>
            <div className="cta-band">
              <h2 className="display">Ready to <span className="gold-text" style={{ fontStyle: 'italic' }}>start?</span></h2>
              <Magnetic as={Link} to="/courses">Explore Courses</Magnetic>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}

export function Contact() {
  const { settings } = useSettings();
  const toast = useToast();
  const [f, setF] = useState({ name: '', email: '', subject: '', message: '' });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await addDoc(collection(db, C.messages), { ...f, read: false, createdAt: serverTimestamp() });
      toast('Fariintaada waa la diray. Mahadsanid!');
      setF({ name: '', email: '', subject: '', message: '' });
    } catch (e2) { toast(errMsg(e2), 'err'); }
    setBusy(false);
  };
  return (
    <section className="section" style={{ paddingTop: 60 }}>
      <div className="container">
        <div className="page-head" style={{ marginTop: -60 }}>
          <span className="eyebrow">Contact</span>
          <h1 className="display"><SplitWords text="Let's" /> <span className="gold-text" style={{ fontStyle: 'italic' }}><SplitWords text="talk." delay={0.1} /></span></h1>
        </div>
        <div className="two-col" style={{ gridTemplateColumns: '1fr 1.3fr', gap: 30 }}>
          <Reveal>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[[Mail, 'Email', settings.contactEmail], [Phone, 'Phone', settings.contactPhone], [MapPin, 'Address', settings.address]].map(([Icon, l, v]) => (
                <div key={l} className="panel" style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                  <Icon color="var(--gold)" />
                  <div><div className="muted" style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '.1em' }}>{l}</div><b>{v}</b></div>
                </div>
              ))}
            </div>
          </Reveal>
          <Reveal delay={0.15}>
            <form className="panel" onSubmit={submit}>
              <div className="row2">
                <div className="field"><label>Name</label><input value={f.name} onChange={set('name')} required /></div>
                <div className="field"><label>Email</label><input type="email" value={f.email} onChange={set('email')} required /></div>
              </div>
              <div className="field"><label>Subject</label><input value={f.subject} onChange={set('subject')} /></div>
              <div className="field"><label>Message</label><textarea value={f.message} onChange={set('message')} required /></div>
              <Magnetic type="submit" disabled={busy}><Send size={16} /> {busy ? 'Sending…' : 'Send message'}</Magnetic>
            </form>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

export function NotFound() {
  return (
    <section className="hero" style={{ minHeight: '80vh' }}>
      <GoldField density={500} offsetX={0.5} />
      <div className="container hero-content" style={{ textAlign: 'center' }}>
        <h1 className="display gold-text" style={{ fontSize: 'clamp(100px, 25vw, 300px)', margin: 0 }}>404</h1>
        <p className="muted"><Compass size={16} style={{ verticalAlign: -3 }} /> Page-kan lama helin.</p>
        <Link to="/" className="btn btn-gold">Back home</Link>
      </div>
    </section>
  );
}

export function Maintenance() {
  const { settings } = useSettings();
  return (
    <section className="hero" style={{ minHeight: '100vh' }}>
      <GoldField density={600} offsetX={0.5} />
      <div className="container hero-content" style={{ textAlign: 'center' }}>
        <Wrench size={40} color="var(--gold)" />
        <h1 className="display" style={{ fontSize: 'clamp(40px, 7vw, 90px)', fontWeight: 300 }}>We'll be back <span className="gold-text" style={{ fontStyle: 'italic' }}>soon.</span></h1>
        <p className="muted">{settings.siteName} waxaa lagu hayaa dayactir. Fadlan dib u soo laabo wax yar kadib.</p>
      </div>
    </section>
  );
}
