import { useEffect, useState } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, Menu, X, LogOut, LayoutDashboard } from 'lucide-react';
import { Brand } from './UI';
import { useAuth } from '../context/AuthContext';

const LINKS = [
  ['/', 'Home'],
  ['/courses', 'All Courses'],
  ['/categories', 'Categories'],
  ['/about', 'About Us'],
  ['/contact', 'Contact'],
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 20);
    on();
    window.addEventListener('scroll', on);
    return () => window.removeEventListener('scroll', on);
  }, []);
  useEffect(() => setOpen(false), [loc.pathname]);

  const search = (e) => {
    e.preventDefault();
    nav(`/courses?q=${encodeURIComponent(q.trim())}`);
  };

  return (
    <header className={`nav ${scrolled ? 'scrolled' : ''}`}>
      <div className="container nav-inner">
        <Link to="/"><Brand /></Link>
        <nav className="nav-links">
          {LINKS.map(([to, label]) => (
            <NavLink key={to} to={to} end={to === '/'}>
              {({ isActive }) => (
                <>
                  {isActive && <motion.span layoutId="navpill" className="pill" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />}
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <form className="nav-search" onSubmit={search}>
          <Search size={16} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search courses…" aria-label="Search courses" />
        </form>
        <div className="nav-actions">
          {user ? (
            <>
              <Link to="/dashboard" className="btn btn-sm btn-gold"><LayoutDashboard size={15} /> My Courses</Link>
              <button className="icon-btn" title="Logout" onClick={() => logout().then(() => nav('/'))}><LogOut size={16} /></button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-sm btn-ghost">Login</Link>
              <Link to="/register" className="btn btn-sm btn-gold">Register</Link>
            </>
          )}
          <button className="icon-btn burger" onClick={() => setOpen(true)} aria-label="Menu"><Menu size={18} /></button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div className="mobile-menu" initial={{ clipPath: 'circle(0% at 95% 4%)' }} animate={{ clipPath: 'circle(150% at 95% 4%)' }} exit={{ clipPath: 'circle(0% at 95% 4%)' }} transition={{ duration: 0.6, ease: [0.76, 0, 0.24, 1] }}>
            <button className="icon-btn" style={{ position: 'absolute', top: 22, right: 18 }} onClick={() => setOpen(false)}><X size={18} /></button>
            <form onSubmit={search} style={{ marginBottom: 20 }}>
              <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search courses…" />
            </form>
            {LINKS.map(([to, label], i) => (
              <motion.div key={to} initial={{ x: 60, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.2 + i * 0.06 }}>
                <Link to={to}>{label}</Link>
              </motion.div>
            ))}
            <motion.div initial={{ x: 60, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.55 }}>
              {user ? <Link to="/dashboard">My Courses</Link> : <Link to="/login">Login / Register</Link>}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
