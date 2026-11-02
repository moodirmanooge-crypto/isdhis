import { useEffect, useState } from 'react';
import { NavLink, Navigate, Routes, Route, useLocation, Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { LayoutDashboard, BookOpen, Layers, Users, Wallet, BarChart3, Mail, Settings, LogOut, Menu, ExternalLink } from 'lucide-react';
import { useAdmin } from '../context/AdminContext';
import { adminDb } from '../firebase';
import { C } from '../lib/db';
import { useList } from '../lib/hooks';
import { Brand, Loader } from '../components/UI';
import AdminDashboard from './Dashboard';
import CoursesAdmin from './Courses';
import LessonsAdmin from './Lessons';
import PaymentsAdmin from './Payments';
import StudentsAdmin from './Students';
import Reports from './Reports';
import EmailsAdmin from './Emails';
import SettingsAdmin from './Settings';

export default function AdminLayout() {
  const { admin, ready, logout } = useAdmin();
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  const { rows: pending } = useList(adminDb, C.payments, ['status', '==', 'pending'], !!admin);
  const { rows: resets } = useList(adminDb, C.devices, ['resetRequested', '==', true], !!admin);
  useEffect(() => setOpen(false), [loc.pathname]);

  if (!ready) return <Loader />;
  if (!admin) return <Navigate to="/admin/login" replace />;

  const items = [
    ['/admin', 'Dashboard', LayoutDashboard, null, true],
    ['/admin/courses', 'Courses Management', BookOpen],
    ['/admin/lessons', 'Lessons Management', Layers],
    ['/admin/students', 'Students Management', Users, resets.length || null],
    ['/admin/payments', 'Payments Management', Wallet, pending.length || null],
    ['/admin/reports', 'Reports & Analytics', BarChart3],
    ['/admin/emails', 'Email Notifications', Mail],
    ['/admin/settings', 'Website Settings', Settings],
  ];

  return (
    <div className="admin">
      <div className="mobile-admin-bar">
        <button className="icon-btn" onClick={() => setOpen(true)}><Menu size={18} /></button>
        <Brand />
      </div>
      {open && <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(0,0,0,.5)' }} />}
      <aside className={`admin-side ${open ? 'open' : ''}`}>
        <Link to="/admin"><Brand /></Link>
        {items.map(([to, label, Icon, badge, end]) => (
          <NavLink key={to} to={to} end={end} className="item">
            <Icon size={17} /> {label}
            {badge ? <span className="badge">{badge}</span> : null}
          </NavLink>
        ))}
        <div style={{ marginTop: 'auto', paddingTop: 20, borderTop: '1px solid var(--line)', display: 'flex', flexDirection: 'column', gap: 4 }}>
          <a className="item" href="/" target="_blank" rel="noreferrer"><ExternalLink size={17} /> View website</a>
          <div style={{ padding: '10px 14px', fontSize: 13 }} className="muted">Signed in as <b style={{ color: 'var(--gold-hi)' }}>{admin.username}</b></div>
          <a className="item" href="#" onClick={(e) => { e.preventDefault(); logout(); }}><LogOut size={17} /> Logout</a>
        </div>
      </aside>
      <main className="admin-main">
        <AnimatePresence mode="wait">
          <motion.div key={loc.pathname.split('/')[2] || 'dash'} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }}>
            <Routes location={loc}>
              <Route index element={<AdminDashboard />} />
              <Route path="courses" element={<CoursesAdmin />} />
              <Route path="lessons" element={<LessonsAdmin />} />
              <Route path="lessons/:courseId" element={<LessonsAdmin />} />
              <Route path="students" element={<StudentsAdmin />} />
              <Route path="payments" element={<PaymentsAdmin />} />
              <Route path="reports" element={<Reports />} />
              <Route path="emails" element={<EmailsAdmin />} />
              <Route path="settings" element={<SettingsAdmin />} />
              <Route path="*" element={<Navigate to="/admin" replace />} />
            </Routes>
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
