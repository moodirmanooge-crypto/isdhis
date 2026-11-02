import { useEffect, useState } from 'react';
import { doc, setDoc, updateDoc, deleteDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { Mail, Send, Trash2, Inbox } from 'lucide-react';
import { adminDb } from '../firebase';
import { C } from '../lib/db';
import { useList } from '../lib/hooks';
import { fmtDateTime, byTimeDesc, errMsg } from '../lib/utils';
import { useSettings } from '../context/SettingsContext';
import { useToast } from '../components/UI';

export default function EmailsAdmin() {
  const { settings } = useSettings();
  const toast = useToast();
  const [t, setT] = useState(settings.emailTemplates);
  const { rows: mail } = useList(adminDb, C.mail);
  const { rows: messages } = useList(adminDb, C.messages);
  const { rows: users } = useList(adminDb, C.users);
  const [blast, setBlast] = useState({ to: 'all', subject: '', body: '' });
  useEffect(() => setT(settings.emailTemplates), [settings.emailTemplates]);

  const saveTemplates = () =>
    setDoc(doc(adminDb, C.settings, 'site'), { emailTemplates: t }, { merge: true }).then(() => toast('Templates saved')).catch((e) => toast(errMsg(e), 'err'));

  const send = async (e) => {
    e.preventDefault();
    const list = blast.to === 'all' ? users.map((u) => u.email).filter(Boolean) : [blast.to.trim()];
    if (!list.length) return toast('No recipients', 'err');
    try {
      await Promise.all(list.map((to) => addDoc(collection(adminDb, C.mail), { to, message: { subject: blast.subject, text: blast.body, html: blast.body.replace(/\n/g, '<br/>') }, createdAt: serverTimestamp() })));
      toast(`Queued ${list.length} email(s)`);
      setBlast({ ...blast, subject: '', body: '' });
    } catch (e2) { toast(errMsg(e2), 'err'); }
  };

  const status = (m) => m.delivery?.state || 'queued';

  return (
    <>
      <div className="admin-top"><h1>Email Notifications</h1></div>
      <div className="alert info">
        <Mail size={16} />
        <span>Emails are written to the <b>IsdhisMail</b> collection. Install the Firebase <b>“Trigger Email from Firestore”</b> extension and set its collection to <code>IsdhisMail</code> to send them automatically (SMTP: Gmail, SendGrid, Mailgun…). Students also see every update inside their dashboard.</span>
      </div>
      <div className="two-col" style={{ marginBottom: 24 }}>
        <div className="panel">
          <h3>Templates</h3>
          <p className="muted" style={{ fontSize: 13 }}>Variables: {'{name}'} {'{course}'} {'{amount}'} {'{reason}'}</p>
          <div className="field"><label>Approved — subject</label><input value={t.approvedSubject} onChange={(e) => setT({ ...t, approvedSubject: e.target.value })} /></div>
          <div className="field"><label>Approved — body</label><textarea rows={5} value={t.approvedBody} onChange={(e) => setT({ ...t, approvedBody: e.target.value })} /></div>
          <div className="field"><label>Rejected — subject</label><input value={t.rejectedSubject} onChange={(e) => setT({ ...t, rejectedSubject: e.target.value })} /></div>
          <div className="field"><label>Rejected — body</label><textarea rows={5} value={t.rejectedBody} onChange={(e) => setT({ ...t, rejectedBody: e.target.value })} /></div>
          <button className="btn btn-gold btn-sm" onClick={saveTemplates}>Save templates</button>
        </div>
        <form className="panel" onSubmit={send}>
          <h3>Send announcement</h3>
          <div className="field">
            <label>To</label>
            <select value={blast.to === 'all' ? 'all' : 'one'} onChange={(e) => setBlast({ ...blast, to: e.target.value === 'all' ? 'all' : '' })}>
              <option value="all">All students ({users.length})</option>
              <option value="one">One email address</option>
            </select>
          </div>
          {blast.to !== 'all' && <div className="field"><label>Email</label><input type="email" value={blast.to} onChange={(e) => setBlast({ ...blast, to: e.target.value })} required /></div>}
          <div className="field"><label>Subject</label><input value={blast.subject} onChange={(e) => setBlast({ ...blast, subject: e.target.value })} required /></div>
          <div className="field"><label>Message</label><textarea rows={7} value={blast.body} onChange={(e) => setBlast({ ...blast, body: e.target.value })} required /></div>
          <button className="btn btn-gold btn-sm"><Send size={14} /> Queue email</button>
        </form>
      </div>
      <div className="two-col">
        <div>
          <h3>Outbox</h3>
          <div className="table-wrap"><table>
            <thead><tr><th>To</th><th>Subject</th><th>Date</th><th>State</th></tr></thead>
            <tbody>
              {[...mail].sort(byTimeDesc()).slice(0, 40).map((m) => <tr key={m.id}><td style={{ fontSize: 13 }}>{m.to}</td><td style={{ fontSize: 13 }}>{m.message?.subject}</td><td style={{ fontSize: 12 }}>{fmtDateTime(m.createdAt)}</td><td><span className={`chip ${status(m) === 'SUCCESS' ? 'approved' : status(m) === 'ERROR' ? 'rejected' : 'pending'}`}>{status(m)}</span></td></tr>)}
              {!mail.length && <tr><td colSpan={4} className="muted">Empty.</td></tr>}
            </tbody>
          </table></div>
        </div>
        <div>
          <h3><Inbox size={18} style={{ verticalAlign: -3 }} /> Contact messages</h3>
          {[...messages].sort(byTimeDesc()).map((m) => (
            <div key={m.id} className="panel" style={{ marginBottom: 10, padding: 18, opacity: m.read ? 0.65 : 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                <b>{m.name} <span className="muted" style={{ fontWeight: 400, fontSize: 13 }}>· {m.email}</span></b>
                <div className="actions">
                  {!m.read && <button className="btn btn-sm btn-ghost" onClick={() => updateDoc(doc(adminDb, C.messages, m.id), { read: true })}>Mark read</button>}
                  <button className="icon-btn" onClick={() => deleteDoc(doc(adminDb, C.messages, m.id))}><Trash2 size={14} /></button>
                </div>
              </div>
              {m.subject && <div style={{ color: 'var(--gold-hi)', fontSize: 14, marginTop: 4 }}>{m.subject}</div>}
              <p style={{ margin: '8px 0 4px', whiteSpace: 'pre-wrap', fontSize: 14 }}>{m.message}</p>
              <div className="muted" style={{ fontSize: 12 }}>{fmtDateTime(m.createdAt)}</div>
            </div>
          ))}
          {!messages.length && <p className="muted">No messages.</p>}
        </div>
      </div>
    </>
  );
}
