import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users, BookOpen, DollarSign, Hourglass, CheckCircle2, XCircle, ArrowRight } from 'lucide-react';
import { adminDb } from '../firebase';
import { C } from '../lib/db';
import { useList } from '../lib/hooks';
import { money, fmtDate, fmtDateTime, byTimeDesc } from '../lib/utils';
import { CountUp } from '../components/TextFx';
import { StatusChip } from '../components/UI';

export default function AdminDashboard() {
  const { rows: users } = useList(adminDb, C.users);
  const { rows: courses } = useList(adminDb, C.courses);
  const { rows: payments } = useList(adminDb, C.payments);

  const approved = payments.filter((p) => p.status === 'approved');
  const revenue = approved.reduce((s, p) => s + Number(p.amount || 0), 0);
  const stats = [
    ['Total Students', users.length, Users],
    ['Total Courses', courses.length, BookOpen],
    ['Total Revenue', revenue, DollarSign, true],
    ['Pending Payments', payments.filter((p) => p.status === 'pending').length, Hourglass],
    ['Approved Payments', approved.length, CheckCircle2],
    ['Rejected Payments', payments.filter((p) => p.status === 'rejected').length, XCircle],
  ];

  return (
    <>
      <div className="admin-top"><h1>Dashboard</h1><Link to="/admin/courses" className="btn btn-gold btn-sm">+ Add New Course</Link></div>
      <div className="stats">
        {stats.map(([l, v, Icon, isMoney], i) => (
          <motion.div className="stat" key={l} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
            <span><Icon size={15} /> {l}</span>
            <b>{isMoney ? <>$<CountUp to={Math.round(v)} /></> : <CountUp to={v} />}</b>
          </motion.div>
        ))}
      </div>
      <div className="two-col">
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3>Recent Transactions</h3><Link to="/admin/payments" className="muted" style={{ fontSize: 13 }}>View all <ArrowRight size={13} /></Link>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Student</th><th>Course</th><th>Amount</th><th>Status</th></tr></thead>
              <tbody>
                {[...payments].sort(byTimeDesc()).slice(0, 7).map((p) => (
                  <tr key={p.id}><td>{p.studentName}<div className="muted" style={{ fontSize: 11 }}>{fmtDateTime(p.createdAt)}</div></td><td>{p.courseTitle}</td><td>{money(p.amount)}</td><td><StatusChip status={p.status} /></td></tr>
                ))}
                {!payments.length && <tr><td colSpan={4} className="muted">No transactions yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3>Recent Students</h3><Link to="/admin/students" className="muted" style={{ fontSize: 13 }}>View all <ArrowRight size={13} /></Link>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Name</th><th>Email</th><th>Joined</th></tr></thead>
              <tbody>
                {[...users].sort(byTimeDesc()).slice(0, 7).map((u) => (
                  <tr key={u.id}><td>{u.name}</td><td className="muted">{u.email}</td><td>{fmtDate(u.createdAt)}</td></tr>
                ))}
                {!users.length && <tr><td colSpan={3} className="muted">No students yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
