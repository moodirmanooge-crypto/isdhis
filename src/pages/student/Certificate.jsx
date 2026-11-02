import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { doc, getDoc } from 'firebase/firestore';
import { Printer, ArrowLeft } from 'lucide-react';
import { db } from '../../firebase';
import { C } from '../../lib/db';
import { fmtDate } from '../../lib/utils';
import { useSettings } from '../../context/SettingsContext';
import { Loader, Empty, LogoMark } from '../../components/UI';

export default function Certificate() {
  const { certId } = useParams();
  const { settings } = useSettings();
  const [cert, setCert] = useState(undefined);
  useEffect(() => {
    getDoc(doc(db, C.certificates, certId)).then((s) => setCert(s.exists() ? s.data() : null)).catch(() => setCert(null));
  }, [certId]);

  if (cert === undefined) return <Loader />;
  if (!cert) return <div className="container section"><Empty title="Certificate not found">Certificate-kan lama helin.</Empty></div>;

  return (
    <div className="container" style={{ padding: '30px 0 60px' }}>
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
        <Link to="/dashboard/certificates" className="btn btn-sm btn-ghost"><ArrowLeft size={15} /> Certificates</Link>
        <button className="btn btn-sm btn-gold" onClick={() => window.print()}><Printer size={15} /> Print / Save PDF</button>
      </div>
      <motion.div className="cert" initial={{ opacity: 0, rotateX: 30, y: 40 }} animate={{ opacity: 1, rotateX: 0, y: 0 }} transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}>
        <LogoMark size={70} />
        <div className="eyebrow" style={{ marginTop: 18 }}>{settings.siteName}</div>
        <h2>CERTIFICATE <span className="gold-text">OF COMPLETION</span></h2>
        <div className="muted">This certifies that</div>
        <div className="name gold-text">{cert.studentName}</div>
        <div className="muted">has successfully completed the course</div>
        <h3 className="display" style={{ fontSize: 'clamp(20px, 3vw, 38px)', margin: '12px 0 30px', fontWeight: 500 }}>{cert.courseTitle}</h3>
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '80%', fontSize: 13, gap: 20 }}>
          <div style={{ borderTop: '1px solid rgba(212,175,55,.5)', paddingTop: 8, flex: 1 }}>{fmtDate(cert.issuedAt)}<br /><span className="muted">Date</span></div>
          <div style={{ borderTop: '1px solid rgba(212,175,55,.5)', paddingTop: 8, flex: 1 }}>{cert.instructor || settings.siteName}<br /><span className="muted">Instructor</span></div>
          <div style={{ borderTop: '1px solid rgba(212,175,55,.5)', paddingTop: 8, flex: 1, fontFamily: 'var(--mono)' }}>{cert.code}<br /><span className="muted" style={{ fontFamily: 'var(--body)' }}>Certificate ID</span></div>
        </div>
      </motion.div>
    </div>
  );
}
