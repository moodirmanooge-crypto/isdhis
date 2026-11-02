import { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation, Outlet } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import { Cursor, Loader, PageCurtain } from './components/UI';
import { useAuth } from './context/AuthContext';
import { useSettings } from './context/SettingsContext';
import { useAdmin } from './context/AdminContext';

import Home from './pages/Home';
import Courses, { Categories } from './pages/Courses';
import CourseDetails from './pages/CourseDetails';
import { Login, Register } from './pages/Auth';
import { About, Contact, NotFound, Maintenance } from './pages/Static';
import Checkout from './pages/student/Checkout';
import Learn from './pages/student/Learn';
import Dashboard from './pages/student/Dashboard';
import Certificate from './pages/student/Certificate';
import AdminLogin from './admin/AdminLogin';
import AdminLayout from './admin/AdminLayout';

function RequireStudent({ children }) {
  const { user, ready } = useAuth();
  const loc = useLocation();
  if (!ready) return <Loader />;
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(loc.pathname + loc.search)}`} replace />;
  return children;
}

function PublicLayout() {
  const loc = useLocation();
  const { settings, loaded } = useSettings();
  const { admin } = useAdmin();
  useEffect(() => { window.scrollTo(0, 0); }, [loc.pathname]);
  if (loaded && settings.maintenanceMode && !admin) return <Maintenance />;
  const isLearn = loc.pathname.startsWith('/learn');
  return (
    <>
      <PageCurtain k={loc.pathname} />
      <Navbar />
      <main><Outlet /></main>
      {!isLearn && <Footer />}
    </>
  );
}

export default function App() {
  return (
    <>
      <Cursor />
      <Routes>
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/*" element={<AdminLayout />} />
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/courses" element={<Courses />} />
          <Route path="/courses/:id" element={<CourseDetails />} />
          <Route path="/categories" element={<Categories />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/learn/:id" element={<Learn />} />
          <Route path="/certificate/:certId" element={<Certificate />} />
          <Route path="/checkout/:id" element={<RequireStudent><Checkout /></RequireStudent>} />
          <Route path="/dashboard/*" element={<RequireStudent><Dashboard /></RequireStudent>} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </>
  );
}
