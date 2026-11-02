import { useMemo, useState } from 'react';
import { doc, updateDoc, setDoc, deleteDoc, serverTimestamp, deleteField } from 'firebase/firestore';
import { Search, Eye, Ban, CheckCircle2, MonitorSmartphone, Trash2, Plus, RotateCcw, Download } from 'lucide-react';
import { adminDb } from '../firebase';
import { C, enrollmentId } from '../lib/db';
import { useList } from '../lib/hooks';
import { fmtDate, fmtDateTime, money, byTimeDesc, errMsg } from '../lib/utils';
import { Modal, StatusChip, Empty, useToast } from '../components/UI';
import { downloadCSV } from './shared';

export default function StudentsAdmin() {
  const { rows: users } = useList(adminDb, C.users);
  const { rows: enrollments } = useList(adminDb, C.enrollments);
  const { rows: devices } = useList(adminDb, C.devices);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(null);
  const [onlyResets, setOnlyResets] = useState(false);

  const devMap = useMemo(() => Object.fromEntries(devices.map((d) => [d.id, d])), [devices]);
  const list = useMemo(
    () =>
      users
        .filter((u) => !q || [u.name, u.email, u.phone].join(' ').toLowerCase().includes(q.toLowerCase()))
        .filter((u) => !onlyResets || devMap[u.id]?.resetRequested)
        .sort(byTimeDesc()),
    [users, q, onlyResets, devMap]
  );
  const resets = devices.filter((d) => d.resetRequested).length;

  return (
    <>
      <div className="admin-top">
        <h1>Students</h1>
        <button className="btn btn-sm btn-ghost" onClick={() => downloadCSV('isdhis-students.csv', list.map((u) => ({ name: u.name, email: u.email, phone: u.phone, status: u.status, courses: enrollments.filter((e) => e.uid === u.id).length, joined: fmtDate(u.createdAt) })))}><Download size={14} /> Export CSV</button>
      </div>
      {resets > 0 && (
        <div className="alert info" style={{ justifyContent: 'space-between' }}>
          <span><MonitorSmartphone size={16} style={{ verticalAlign: -3 }} /> {resets} student(s) requested a device reset.</span>
          <button className="btn btn-sm btn-ghost" onClick={() => setOnlyResets(!onlyResets)}>{onlyResets ? 'Show all' : 'Show requests'}</button>
        </div>
      )}
      <div style={{ position: 'relative', marginBottom: 16, maxWidth: 420 }}>
        <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', translate: '0 -50%', color: 'var(--muted)' }} />
        <input className="input" style={{ paddingLeft: 40 }} placeholder="Search name, email, phone" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {list.length ? (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Student</th><th>Phone</th><th>Courses</th><th>Active device</th><th>Joined</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {list.map((u) => {
                const d = devMap[u.id];
                return (
                  <tr key={u.id}>
                    <td><b>{u.name}</b><div className="muted" style={{ fontSize: 12 }}>{u.email}</div></td>
                    <td>{u.phone || '—'}</td>
                    <td>{enrollments.filter((e) => e.uid === u.id).length}</td>
                    <td style={{ fontSize: 13 }}>{d?.activeLabel || '—'} {d?.resetRequested && <span className="chip pending">reset requested</span>}</td>
                    <td>{fmtDate(u.createdAt)}</td>
                    <td><StatusChip status={u.status || 'active'} /></td>
                    <td><button className="btn btn-sm btn-gold" onClick={() => setOpen(u.id)}><Eye size={14} /> Manage</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty title="No students found" />
      )}
      <Modal open={!!open} onClose={() => setOpen(null)} title="Student" wide>
        {open && <StudentDetail user={users.find((u) => u.id === open)} enrollments={enrollments.filter((e) => e.uid === open)} device={devMap[open]} />}
      </Modal>
    </>
  );
}

function StudentDetail({ user, enrollments, device }) {
  const toast = useToast();
  const { rows: courses } = useList(adminDb, C.courses);
  const { rows: payments } = useList(adminDb, C.payments, ['uid', '==', user?.id || '-']);
  const [grant, setGrant] = useState('');
  if (!user) return null;

  const run = (p, msg) => p.then(() => toast(msg)).catch((e) => toast(errMsg(e), 'err'));
  const toggleBlock = () => run(updateDoc(doc(adminDb, C.users, user.id), { status: user.status === 'blocked' ? 'active' : 'blocked' }), 'Status updated');
  const resetDevice = () =>
    run(
      updateDoc(doc(adminDb, C.devices, user.id), {
        activeDeviceId: '',
        activeLabel: '',
        resetRequested: false,
        devices: deleteField(),
        updatedAt: serverTimestamp(),
      }),
      'Device reset — the next device the student uses becomes active'
    );
  const removeDevice = (id) => run(updateDoc(doc(adminDb, C.devices, user.id), { [`devices.${id}`]: deleteField() }), 'Device removed');
  const setActive = (id, label) => run(updateDoc(doc(adminDb, C.devices, user.id), { activeDeviceId: id, activeLabel: label, resetRequested: false, [`devices.${id}.status`]: 'active' }), 'Active device changed');
  const revoke = (e) => confirm(`Remove access to "${e.courseTitle}"?`) && run(deleteDoc(doc(adminDb, C.enrollments, e.id)), 'Access removed');
  const giveCourse = () => {
    const c = courses.find((x) => x.id === grant);
    if (!c) return;
    run(
      setDoc(doc(adminDb, C.enrollments, enrollmentId(user.id, c.id)), {
        uid: user.id, courseId: c.id, courseTitle: c.title, studentName: user.name, studentEmail: user.email, source: 'admin', createdAt: serverTimestamp(),
      }),
      'Course access granted'
    );
    setGrant('');
  };

  const devs = Object.entries(device?.devices || {});

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div className="two-col">
        <dl className="kv">
          <dt>Name</dt><dd><b>{user.name}</b></dd>
          <dt>Email</dt><dd>{user.email}</dd>
          <dt>Phone</dt><dd>{user.phone || '—'}</dd>
          <dt>Joined</dt><dd>{fmtDate(user.createdAt)}</dd>
          <dt>Status</dt><dd><StatusChip status={user.status || 'active'} /></dd>
        </dl>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-start' }}>
          <button className={`btn btn-sm ${user.status === 'blocked' ? 'btn-ok' : 'btn-danger'}`} onClick={toggleBlock}>
            {user.status === 'blocked' ? <><CheckCircle2 size={14} /> Unblock student</> : <><Ban size={14} /> Block student</>}
          </button>
          <p className="muted" style={{ fontSize: 12, margin: 0 }}>Blocked students cannot open any lesson.</p>
        </div>
      </div>

      <div className="panel" style={{ background: 'var(--navy-2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <h3 style={{ margin: 0 }}><MonitorSmartphone size={18} style={{ verticalAlign: -3 }} color="var(--gold)" /> Devices {device?.resetRequested && <span className="chip pending">reset requested</span>}</h3>
          {device && <button className="btn btn-sm btn-gold" onClick={resetDevice}><RotateCcw size={14} /> Reset device</button>}
        </div>
        {devs.length ? (
          <table style={{ marginTop: 12 }}>
            <thead><tr><th>Device</th><th>Last seen</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {devs.map(([id, d]) => {
                const active = device.activeDeviceId === id;
                return (
                  <tr key={id}>
                    <td>{d.label}<div className="muted" style={{ fontSize: 11, fontFamily: 'var(--mono)' }}>{id.slice(0, 10)}…</div></td>
                    <td style={{ fontSize: 13 }}>{fmtDateTime(d.lastSeen)}</td>
                    <td><StatusChip status={active ? 'active' : 'blocked'} /></td>
                    <td className="actions">
                      {!active && <button className="btn btn-sm btn-ghost" onClick={() => setActive(id, d.label)}>Make active</button>}
                      <button className="icon-btn" onClick={() => removeDevice(id)}><Trash2 size={14} /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : <p className="muted">No devices registered yet.</p>}
      </div>

      <div>
        <h3>Courses</h3>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
          <select className="input" style={{ maxWidth: 320 }} value={grant} onChange={(e) => setGrant(e.target.value)}>
            <option value="">Grant a course manually…</option>
            {courses.filter((c) => !enrollments.some((e) => e.courseId === c.id)).map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
          <button className="btn btn-sm btn-gold" onClick={giveCourse} disabled={!grant}><Plus size={14} /> Grant</button>
        </div>
        {enrollments.length ? (
          <div className="table-wrap"><table>
            <thead><tr><th>Course</th><th>Source</th><th>Since</th><th></th></tr></thead>
            <tbody>{enrollments.map((e) => (
              <tr key={e.id}><td>{e.courseTitle}</td><td>{e.source}</td><td>{fmtDate(e.createdAt)}</td><td><button className="btn btn-sm btn-danger" onClick={() => revoke(e)}>Revoke</button></td></tr>
            ))}</tbody>
          </table></div>
        ) : <p className="muted">No courses.</p>}
      </div>

      <div>
        <h3>Payments</h3>
        {payments.length ? (
          <div className="table-wrap"><table>
            <thead><tr><th>Course</th><th>Amount</th><th>Txn</th><th>Date</th><th>Status</th></tr></thead>
            <tbody>{[...payments].sort(byTimeDesc()).map((p) => (
              <tr key={p.id}><td>{p.courseTitle}</td><td>{money(p.amount)}</td><td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{p.transactionId}</td><td>{fmtDateTime(p.createdAt)}</td><td><StatusChip status={p.status} /></td></tr>
            ))}</tbody>
          </table></div>
        ) : <p className="muted">No payments.</p>}
      </div>
    </div>
  );
}
