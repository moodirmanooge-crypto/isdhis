import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin } from 'lucide-react';
import { Brand } from './UI';
import { useSettings } from '../context/SettingsContext';

export default function Footer() {
  const { settings } = useSettings();
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <Brand />
            <p style={{ marginTop: 18, maxWidth: 340 }}>{settings.heroText}</p>
          </div>
          <div>
            <h4>Academy</h4>
            <Link to="/courses">All Courses</Link>
            <Link to="/categories">Categories</Link>
            <Link to="/about">About Us</Link>
            <Link to="/contact">Contact</Link>
          </div>
          <div>
            <h4>Students</h4>
            <Link to="/login">Login</Link>
            <Link to="/register">Register</Link>
            <Link to="/dashboard">My Courses</Link>
            <Link to="/dashboard/payments">My Payments</Link>
          </div>
          <div>
            <h4>Contact</h4>
            <p><Mail size={13} style={{ verticalAlign: -2 }} /> {settings.contactEmail}</p>
            <p><Phone size={13} style={{ verticalAlign: -2 }} /> {settings.contactPhone}</p>
            <p><MapPin size={13} style={{ verticalAlign: -2 }} /> {settings.address}</p>
          </div>
        </div>
        <div className="footer-big">ISDHIS ACADEMY</div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} {settings.siteName}. All rights reserved.</span>
          <span>{settings.tagline}</span>
        </div>
      </div>
    </footer>
  );
}
