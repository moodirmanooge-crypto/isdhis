import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { adminDb } from '../firebase';
import { C } from '../lib/db';
import { useList } from '../lib/hooks';
import { money, toDate } from '../lib/utils';

function lastMonths(n) {
  const out = [];
  const d = new Date();
  d.setDate(1);
  for (let i = n - 1; i >= 0; i--) {
    const x = new Date(d.getFullYear(), d.getMonth() - i, 1);
    out.push({ key: `${x.getFullYear()}-${x.getMonth()}`, label: x.toLocaleString(undefined, { month: 'short' }) });
  }
  return out;
}

function Bars({ data, fmt = (v) => v }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="bar-chart">
      {data.map((d, i) => (
        <div className="b" key={d.label + i}>
          <em>{d.value ? fmt(d.value) : ''}</em>
          <motion.div initial={{ height: 0 }} animate={{ height: `${(d.value / max) * 100}%` }} transition={{ duration: 0.9, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }} />
          <span>{d.label}</span>
        </div>
      ))}
    </div>
  );
}

export default function Reports() {
  const { rows: payments } = useList(adminDb, C.payments);
  const { rows: users } = useList(adminDb, C.users);
  const { rows: enrollments } = useList(adminDb, C.enrollments);
  const { rows: courses } = useList(adminDb, C.courses);

  const months = lastMonths(12);
  const approved = payments.filter((p) => p.status === 'approved');

  const revenueByMonth = useMemo(() => months.map((m) => ({
    label: m.label,
    value: approved.filter((p) => { const d = toDate(p.reviewedAt || p.createdAt); return d && `${d.getFullYear()}-${d.getMonth()}` === m.key; }).reduce((s, p) => s + Number(p.amount || 0), 0),
  })), [approved]);

  const studentsByMonth = useMemo(() => months.map((m) => ({
    label: m.label,
    value: users.filter((u) => { const d = toDate(u.createdAt); return d && `${d.getFullYear()}-${d.getMonth()}` === m.key; }).length,
  })), [users]);

  const byCourse = useMemo(() => courses.map((c) => ({
    title: c.title,
    students: enrollments.filter((e) => e.courseId === c.id).length,
    revenue: approved.filter((p) => p.courseId === c.id).reduce((s, p) => s + Number(p.amount || 0), 0),
  })).sort((a, b) => b.revenue - a.revenue || b.students - a.students), [courses, enrollments, approved]);

  const total = approved.reduce((s, p) => s + Number(p.amount || 0), 0);
  const methods = useMemo(() => {
    const m = {};
    approved.forEach((p) => (m[p.method] = (m[p.method] || 0) + Number(p.amount || 0)));
    return Object.entries(m);
  }, [approved]);
  const conv = payments.length ? Math.round((approved.length / payments.length) * 100) : 0;

  return (
    <>
      <div className="admin-top"><h1>Reports & Analytics</h1></div>
      <div className="stats">
        <div className="stat"><span>Total revenue</span><b>{money(total)}</b></div>
        <div className="stat"><span>Enrollments</span><b>{enrollments.length}</b></div>
        <div className="stat"><span>Avg. order</span><b>{money(approved.length ? total / approved.length : 0)}</b></div>
        <div className="stat"><span>Approval rate</span><b>{conv}%</b></div>
      </div>
      <div className="two-col" style={{ marginBottom: 20 }}>
        <div className="panel"><h3>Revenue — last 12 months</h3><Bars data={revenueByMonth} fmt={(v) => `$${Math.round(v)}`} /></div>
        <div className="panel"><h3>New students — last 12 months</h3><Bars data={studentsByMonth} /></div>
      </div>
      <div className="two-col">
        <div>
          <h3>Courses performance</h3>
          <div className="table-wrap"><table>
            <thead><tr><th>Course</th><th>Students</th><th>Revenue</th></tr></thead>
            <tbody>{byCourse.map((c) => <tr key={c.title}><td>{c.title}</td><td>{c.students}</td><td>{money(c.revenue)}</td></tr>)}</tbody>
          </table></div>
        </div>
        <div>
          <h3>Revenue by payment method</h3>
          <div className="panel">
            {methods.length ? methods.map(([m, v]) => (
              <div key={m} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 6 }}><b>{m}</b><span>{money(v)}</span></div>
                <div className="progress"><div style={{ width: `${(v / total) * 100}%` }} /></div>
              </div>
            )) : <p className="muted">No approved payments yet.</p>}
          </div>
        </div>
      </div>
    </>
  );
}
