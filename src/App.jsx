import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation, Outlet } from 'react-router-dom';
import { motion, useScroll, useSpring } from 'framer-motion';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ErrorBoundary from './components/ErrorBoundary';
import { Cursor, Loader, PageCurtain } from './components/UI';
import { useAuth } from './context/AuthContext';
import { useSettings } from './context/SettingsContext';
import { useAdmin } from './context/AdminContext';
import Home from './pages/Home';

// Every other page is downloaded only when it is opened → much faster first load.
const Courses = lazy(() => import('./pages/Courses'));
const Categories = lazy(() => import('./pages/Courses').then((m) => ({ default: m.Categories })));
const CourseDetails = lazy(() => import('./pages/CourseDetails'));
const Login = lazy(() => import('./pages/Auth').then((m) => ({ default: m.Login })));
const Register = lazy(() => import('./pages/Auth').then((m) => ({ default: m.Register })));
const About = lazy(() => import('./pages/Static').then((m) => ({ default: m.About })));
const Contact = lazy(() => import('./pages/Static').then((m) => ({ default: m.Contact })));
const NotFound = lazy(() => import('./pages/Static').then((m) => ({ default: m.NotFound })));
const Maintenance = lazy(() => import('./pages/Static').then((m) => ({ default: m.Maintenance })));
const Checkout = lazy(() => import('./pages/student/Checkout'));
const Learn = lazy(() => import('./pages/student/Learn'));
const Dashboard = lazy(() => import('./pages/student/Dashboard'));
const Certificate = lazy(() => import('./pages/student/Certificate'));
const AdminLogin = lazy(() => import('./admin/AdminLogin'));
const AdminLayout = lazy(() => import('./admin/AdminLayout'));

function RequireStudent({ children }) {
  const { user, ready } = useAuth();
  const loc = useLocation();
  if (!ready) return <Loader />;
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(loc.pathname + loc.search)}`} replace />;
  return children;
}

function ScrollBar() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 30 });
  return <motion.div className="scroll-bar" style={{ scaleX, width: '100%' }} />;
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
      <div className="topline" />
      <ScrollBar />
      <Navbar />
      <main>
        <ErrorBoundary key={loc.pathname}>
          <Suspense fallback={<Loader />}><Outlet /></Suspense>
        </ErrorBoundary>
      </main>
      {!isLearn && <Footer />}
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <Cursor />
      <Suspense fallback={<Loader />}>
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
      </Suspense>
    </ErrorBoundary>
  );
}
