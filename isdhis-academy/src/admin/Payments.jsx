import { useEffect, useMemo, useState } from 'react';
import { motion, LayoutGroup } from 'framer-motion';
import { CheckCircle2, XCircle, Eye, Search, Download } from 'lucide-react';
import { adminDb } from '../firebase';
import { C } from '../lib/db';
import { useList } from '../lib/hooks';
import { money, fmtDateTime, byTimeDesc, errMsg } from '../lib/utils';
import { useSettings } from '../context/SettingsContext';
import { Modal, StatusChip, Empty, useToast } from '../components/UI';
import { approvePayment, rejectPayment, fileUrl, downloadCSV } from './shared';

const TABS = ['pending', 'approved', 'rejected', 'all'];

export default function PaymentsAdmin() {
  const { rows } = useList(adminDb, C.payments);
  const [tab, setTab] = useState('pending');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(null);
  const list = useMemo(
    () =>
      rows
        .filter((p) => tab === 'all' || p.status === tab)
        .filter((p) => !q || [p.studentName, p.studentEmail, p.courseTitle, p.transactionId, p.phone].join(' ').toLowerCase().includes(q.toLowerCase()))
        .sort(byTimeDesc()),
    [rows, tab, q]
  );
  const count = (t) => (t === 'all' ? rows.length : rows.filter((p) => p.status === t).length);

  return (
    <>
      <div className="admin-top">
        <h1>Payments</h1>
        <button className="btn btn-sm btn-ghost" onClick={() => downloadCSV('isdhis-payments.csv', list.map(({ id, studentName, studentEmail, courseTitle, amount, method, transactionId, phone, status, createdAt }) => ({ id, studentName, studentEmail, courseTitle, amount, method, transactionId, phone, status, date: fmtDateTime(createdAt) })))}><Download size={14} /> Export CSV</button>
      </div>
      <LayoutGroup>
        <div className="filters" style={{ marginBottom: 16 }}>
          {TABS.map((t) => (
            <button key={t} className={`filter ${tab === t ? 'on' : ''}`} onClick={() => setTab(t)} style={{ textTransform: 'capitalize' }}>
              {tab === t && <motion.span layoutId="paytab" className="on-bg" />}
              {t} ({count(t)})
            </button>
          ))}
        </div>
      </LayoutGroup>
      <div style={{ position: 'relative', marginBottom: 16, maxWidth: 420 }}>
        <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', translate: '0 -50%', color: 'var(--muted)' }} />
        <input className="input" style={{ paddingLeft: 40 }} placeholder="Search student, course, transaction ID, phone" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {list.length ? (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Student</th><th>Course</th><th>Amount</th><th>Method</th><th>Transaction ID</th><th>Date</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {list.map((p) => (
                <tr key={p.id}>
                  <td><b>{p.studentName}</b><div className="muted" style={{ fontSize: 12 }}>{p.studentEmail}</div></td>
                  <td>{p.courseTitle}</td>
                  <td>{money(p.amount)}{p.coupon && <div className="muted" style={{ fontSize: 11 }}>code {p.coupon}</div>}</td>
                  <td>{p.method}</td>
                  <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{p.transactionId}</td>
                  <td style={{ fontSize: 13 }}>{fmtDateTime(p.createdAt)}</td>
                  <td><StatusChip status={p.status} /></td>
                  <td><button className="btn btn-sm btn-gold" onClick={() => setOpen(p)}><Eye size={14} /> Review</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty title={`No ${tab === 'all' ? '' : tab} payments`} />
      )}
      <Modal open={!!open} onClose={() => setOpen(null)} title="Payment details" wide>
        {open && <PaymentDetail p={rows.find((r) => r.id === open.id) || open} onDone={() => setOpen(null)} />}
      </Modal>
    </>
  );
}

function PaymentDetail({ p, onDone }) {
  const { settings } = useSettings();
  const toast = useToast();
  const [img, setImg] = useState('');
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [allow, setAllow] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (p.screenshotPath) fileUrl(p.screenshotPath).then(setImg).catch(() => setImg(''));
  }, [p.screenshotPath]);

  const approve = async () => {
    if (!confirm(`Approve ${money(p.amount)} from ${p.studentName}? The course will be unlocked.`)) return;
    setBusy(true);
    try { await approvePayment(p, settings); toast('Payment approved — course unlocked'); onDone(); }
    catch (e) { toast(errMsg(e), 'err'); }
    setBusy(false);
  };
  const reject = async () => {
    if (!reason.trim()) return toast('Qor sababta rejection-ka', 'err');
    setBusy(true);
    try { await rejectPayment(p, reason.trim(), allow, settings); toast('Payment rejected'); onDone(); }
    catch (e) { toast(errMsg(e), 'err'); }
    setBusy(false);
  };

  return (
    <div className="two-col" style={{ alignItems: 'start' }}>
      <div>
        <dl className="kv">
          <dt>Student name</dt><dd><b>{p.studentName}</b></dd>
          <dt>Email</dt><dd>{p.studentEmail}</dd>
          <dt>Course</dt><dd>{p.courseTitle}</dd>
          <dt>Amount</dt><dd className="price" style={{ fontSize: 24 }}>{money(p.amount)} {p.originalAmount > p.amount && <s>{money(p.originalAmount)}</s>}</dd>
          {p.coupon && <><dt>Discount code</dt><dd>{p.coupon}</dd></>}
          <dt>Method</dt><dd>{p.method} → {p.payTo}</dd>
          <dt>Phone number</dt><dd style={{ fontFamily: 'var(--mono)' }}>{p.phone}</dd>
          <dt>Transaction ID</dt><dd style={{ fontFamily: 'var(--mono)', color: 'var(--gold-hi)' }}>{p.transactionId}</dd>
          <dt>Submitted</dt><dd>{fmtDateTime(p.createdAt)}</dd>
          <dt>Status</dt><dd><StatusChip status={p.status} /></dd>
          {p.rejectReason && <><dt>Reject reason</dt><dd>{p.rejectReason}</dd></>}
        </dl>
        {p.status !== 'approved' && (
          <div style={{ marginTop: 24 }}>
            {!rejecting ? (
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button className="btn btn-gold" onClick={approve} disabled={busy}><CheckCircle2 size={17} /> Approve Payment</button>
                {p.status === 'pending' && <button className="btn btn-danger" onClick={() => setRejecting(true)} disabled={busy}><XCircle size={17} /> Reject Payment</button>}
              </div>
            ) : (
              <div className="panel" style={{ background: 'var(--navy-2)' }}>
                <div className="field"><label>Reason for rejection</label><textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Transaction ID lama helin / qiimaha waa khaldan" /></div>
                <label className="check" style={{ marginBottom: 14 }}><input type="checkbox" checked={allow} onChange={(e) => setAllow(e.target.checked)} /> Allow student to resubmit</label>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button className="btn btn-danger" onClick={reject} disabled={busy}>Confirm reject</button>
                  <button className="btn btn-ghost" onClick={() => setRejecting(false)}>Cancel</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      <div>
        <div className="muted" style={{ fontSize: 13, marginBottom: 8 }}>Payment screenshot</div>
        {img ? <a href={img} target="_blank" rel="noreferrer"><img src={img} alt="receipt" className="receipt-img" /></a> : <div className="empty">No screenshot / loading…</div>}
      </div>
    </div>
  );
}
