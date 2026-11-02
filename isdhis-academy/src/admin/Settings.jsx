import { useEffect, useState } from 'react';
import { doc, setDoc, addDoc, deleteDoc, updateDoc, collection, serverTimestamp, Timestamp } from 'firebase/firestore';
import { Plus, Trash2, Upload, Save, KeyRound } from 'lucide-react';
import { adminDb } from '../firebase';
import { C, S, DEFAULT_SETTINGS } from '../lib/db';
import { useList, useCategories } from '../lib/hooks';
import { errMsg, fmtDate } from '../lib/utils';
import { useSettings } from '../context/SettingsContext';
import { useAdmin } from '../context/AdminContext';
import { useToast } from '../components/UI';
import { uploadFile, publicUrl, safeName } from './shared';

export default function SettingsAdmin() {
  const { settings } = useSettings();
  const toast = useToast();
  const [f, setF] = useState(settings);
  const [logo, setLogo] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => setF(settings), [settings]);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  const save = async () => {
    setBusy(true);
    try {
      const data = {
        siteName: f.siteName, tagline: f.tagline, heroText: f.heroText, contactEmail: f.contactEmail, contactPhone: f.contactPhone, address: f.address,
        paymentInstructions: f.paymentInstructions, paymentMethods: f.paymentMethods, deviceRestriction: !!f.deviceRestriction,
        maintenanceMode: !!f.maintenanceMode, certificatesEnabled: !!f.certificatesEnabled, updatedAt: serverTimestamp(),
      };
      if (logo) data.logoUrl = await publicUrl(await uploadFile(S.site(safeName(logo.name)), logo));
      await setDoc(doc(adminDb, C.settings, 'site'), data, { merge: true });
      setLogo(null);
      toast('Settings saved');
    } catch (e) { toast(errMsg(e), 'err'); }
    setBusy(false);
  };

  const pm = f.paymentMethods || [];
  const setPm = (i, k, v) => setF({ ...f, paymentMethods: pm.map((m, j) => (j === i ? { ...m, [k]: v } : m)) });

  return (
    <>
      <div className="admin-top"><h1>Website Settings</h1><button className="btn btn-gold btn-sm" onClick={save} disabled={busy}><Save size={14} /> {busy ? 'Saving…' : 'Save settings'}</button></div>
      <div className="two-col" style={{ marginBottom: 20 }}>
        <div className="panel">
          <h3>General</h3>
          <div className="field"><label>Website name</label><input value={f.siteName} onChange={set('siteName')} /></div>
          <div className="field"><label>Tagline</label><input value={f.tagline} onChange={set('tagline')} /></div>
          <div className="field"><label>Hero text</label><textarea value={f.heroText} onChange={set('heroText')} rows={3} /></div>
          <div className="field">
            <label>Logo</label>
            <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
              <img src={logo ? URL.createObjectURL(logo) : f.logoUrl || '/logo.svg'} alt="" style={{ width: 64, height: 64, borderRadius: 12, objectFit: 'contain', background: 'var(--navy)' }} />
              <div className="dropzone" style={{ flex: 1, padding: 14 }}><input type="file" accept="image/*" onChange={(e) => setLogo(e.target.files?.[0] || null)} /><Upload size={16} /> {logo ? logo.name : 'Upload new logo'}</div>
            </div>
            {f.logoUrl && <button type="button" className="btn btn-sm btn-ghost" style={{ marginTop: 8, alignSelf: 'flex-start' }} onClick={() => setDoc(doc(adminDb, C.settings, 'site'), { logoUrl: '' }, { merge: true })}>Use default logo</button>}
          </div>
        </div>
        <div className="panel">
          <h3>Contact</h3>
          <div className="field"><label>Email</label><input value={f.contactEmail} onChange={set('contactEmail')} /></div>
          <div className="field"><label>Phone</label><input value={f.contactPhone} onChange={set('contactPhone')} /></div>
          <div className="field"><label>Address</label><input value={f.address} onChange={set('address')} /></div>
          <h3 style={{ marginTop: 26 }}>Access & features</h3>
          <label className="check" style={{ marginBottom: 12 }}><input type="checkbox" checked={!!f.deviceRestriction} onChange={set('deviceRestriction')} /> Device restriction — one active device per student</label>
          <label className="check" style={{ marginBottom: 12 }}><input type="checkbox" checked={!!f.certificatesEnabled} onChange={set('certificatesEnabled')} /> Certificates on completion</label>
          <label className="check"><input type="checkbox" checked={!!f.maintenanceMode} onChange={set('maintenanceMode')} /> Website maintenance mode</label>
        </div>
      </div>

      <div className="panel" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3>Payment methods & numbers</h3>
          <button className="btn btn-sm btn-ghost" onClick={() => setF({ ...f, paymentMethods: [...pm, { name: '', number: '', holder: f.siteName, active: true }] })}><Plus size={14} /> Add method</button>
        </div>
        {pm.map((m, i) => (
          <div key={i} className="row3" style={{ gridTemplateColumns: '1fr 1fr 1fr auto auto', alignItems: 'end' }}>
            <div className="field"><label>Method</label><input value={m.name} onChange={(e) => setPm(i, 'name', e.target.value)} placeholder="EVC Plus" /></div>
            <div className="field"><label>Number</label><input value={m.number} onChange={(e) => setPm(i, 'number', e.target.value)} placeholder="061XXXXXXX" /></div>
            <div className="field"><label>Account name</label><input value={m.holder} onChange={(e) => setPm(i, 'holder', e.target.value)} /></div>
            <label className="check" style={{ marginBottom: 28 }}><input type="checkbox" checked={m.active !== false} onChange={(e) => setPm(i, 'active', e.target.checked)} /> Active</label>
            <button className="icon-btn" style={{ marginBottom: 20 }} onClick={() => setF({ ...f, paymentMethods: pm.filter((_, j) => j !== i) })}><Trash2 size={15} /></button>
          </div>
        ))}
        <div className="field"><label>Payment instructions</label><textarea value={f.paymentInstructions} onChange={set('paymentInstructions')} rows={3} /></div>
        <button className="btn btn-sm btn-ghost" onClick={() => setF({ ...f, paymentMethods: DEFAULT_SETTINGS.paymentMethods })}>Reset to EVC / Zaad / Sahal</button>
      </div>

      <div className="two-col" style={{ marginBottom: 20 }}>
        <Categories />
        <Coupons />
      </div>
      <AdminPassword />
    </>
  );
}

function Categories() {
  const cats = useCategories(adminDb);
  const toast = useToast();
  const [name, setName] = useState('');
  const add = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    try { await addDoc(collection(adminDb, C.categories), { name: name.trim(), createdAt: serverTimestamp() }); setName(''); }
    catch (e2) { toast(errMsg(e2), 'err'); }
  };
  return (
    <div className="panel">
      <h3>Course categories</h3>
      <form onSubmit={add} style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Programming, Trading, ICT…" />
        <button className="btn btn-sm btn-gold"><Plus size={14} /></button>
      </form>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {cats.map((c) => (
          <span key={c.id} className="chip" style={{ paddingRight: 6 }}>
            {c.name}
            <button style={{ background: 'none', border: 0, cursor: 'pointer', color: 'var(--muted)', padding: 2 }} onClick={() => confirm(`Delete category "${c.name}"?`) && deleteDoc(doc(adminDb, C.categories, c.id))}><Trash2 size={12} /></button>
          </span>
        ))}
        {!cats.length && <span className="muted">No categories yet.</span>}
      </div>
    </div>
  );
}

function Coupons() {
  const { rows } = useList(adminDb, C.coupons);
  const toast = useToast();
  const [f, setF] = useState({ code: '', type: 'percent', value: '', maxUses: '', expiresAt: '' });
  const add = async (e) => {
    e.preventDefault();
    const code = f.code.trim().toUpperCase().replace(/\s+/g, '');
    if (!code || !(Number(f.value) > 0)) return toast('Geli code iyo qiime', 'err');
    try {
      await setDoc(doc(adminDb, C.coupons, code), {
        type: f.type, value: Number(f.value), maxUses: f.maxUses ? Number(f.maxUses) : null, usedCount: 0, active: true,
        expiresAt: f.expiresAt ? Timestamp.fromDate(new Date(f.expiresAt + 'T23:59:59')) : null, createdAt: serverTimestamp(),
      });
      setF({ code: '', type: 'percent', value: '', maxUses: '', expiresAt: '' });
      toast(`Code ${code} created`);
    } catch (e2) { toast(errMsg(e2), 'err'); }
  };
  return (
    <div className="panel">
      <h3>Discount codes</h3>
      <form onSubmit={add}>
        <div className="row2">
          <div className="field"><label>Code</label><input value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} placeholder="ISDHIS20" /></div>
          <div className="field"><label>Type</label><select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}><option value="percent">% off</option><option value="fixed">$ off</option></select></div>
        </div>
        <div className="row3">
          <div className="field"><label>Value</label><input type="number" min="0" value={f.value} onChange={(e) => setF({ ...f, value: e.target.value })} /></div>
          <div className="field"><label>Max uses</label><input type="number" min="0" value={f.maxUses} onChange={(e) => setF({ ...f, maxUses: e.target.value })} placeholder="∞" /></div>
          <div className="field"><label>Expires</label><input type="date" value={f.expiresAt} onChange={(e) => setF({ ...f, expiresAt: e.target.value })} /></div>
        </div>
        <button className="btn btn-sm btn-gold"><Plus size={14} /> Create code</button>
      </form>
      <table style={{ marginTop: 14 }}>
        <tbody>
          {rows.map((c) => (
            <tr key={c.id}>
              <td style={{ fontFamily: 'var(--mono)', color: 'var(--gold-hi)' }}>{c.id}</td>
              <td>{c.type === 'percent' ? `${c.value}%` : `$${c.value}`}</td>
              <td className="muted" style={{ fontSize: 12 }}>{c.usedCount || 0}/{c.maxUses || '∞'} · {c.expiresAt ? fmtDate(c.expiresAt) : 'no expiry'}</td>
              <td className="actions">
                <button className="btn btn-sm btn-ghost" onClick={() => updateDoc(doc(adminDb, C.coupons, c.id), { active: c.active === false })}>{c.active === false ? 'Enable' : 'Disable'}</button>
                <button className="icon-btn" onClick={() => deleteDoc(doc(adminDb, C.coupons, c.id))}><Trash2 size={14} /></button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AdminPassword() {
  const { admin } = useAdmin();
  const toast = useToast();
  const [p, setP] = useState({ next: '', confirm: '' });
  const save = async (e) => {
    e.preventDefault();
    if (p.next.length < 6) return toast('Password-ku waa inuu ahaadaa ugu yaraan 6 xaraf', 'err');
    if (p.next !== p.confirm) return toast('Labada password isma laha', 'err');
    try {
      await updateDoc(doc(adminDb, C.admin, admin.adminId), { password: p.next, passwordUpdatedAt: serverTimestamp() });
      setP({ next: '', confirm: '' });
      toast('Admin password updated');
    } catch (e2) { toast(errMsg(e2), 'err'); }
  };
  return (
    <form className="panel" onSubmit={save} style={{ maxWidth: 560 }}>
      <h3><KeyRound size={18} style={{ verticalAlign: -3 }} color="var(--gold)" /> Admin password</h3>
      <p className="muted" style={{ fontSize: 13, marginTop: -6 }}>Updates <code>IsdhisAdmin/{admin.adminId}</code> (username: {admin.username}).</p>
      <div className="row2">
        <div className="field"><label>New password</label><input type="password" value={p.next} onChange={(e) => setP({ ...p, next: e.target.value })} /></div>
        <div className="field"><label>Confirm</label><input type="password" value={p.confirm} onChange={(e) => setP({ ...p, confirm: e.target.value })} /></div>
      </div>
      <button className="btn btn-sm btn-gold">Update password</button>
    </form>
  );
}
