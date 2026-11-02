import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { doc, writeBatch, serverTimestamp, increment, collection } from 'firebase/firestore';
import { adminDb, adminStorage } from '../firebase';
import { C, enrollmentId } from '../lib/db';
import { fill } from '../lib/utils';

export function uploadFile(path, file, onProgress) {
  return new Promise((resolve, reject) => {
    const task = uploadBytesResumable(ref(adminStorage, path), file, { contentType: file.type || undefined });
    task.on(
      'state_changed',
      (s) => onProgress?.(Math.round((s.bytesTransferred / s.totalBytes) * 100)),
      reject,
      () => resolve(path)
    );
  });
}

export const publicUrl = (path) => getDownloadURL(ref(adminStorage, path));
export const fileUrl = (path) => getDownloadURL(ref(adminStorage, path));
export const removeFile = (path) => (path ? deleteObject(ref(adminStorage, path)).catch(() => {}) : Promise.resolve());

export const safeName = (n = 'file') => n.replace(/[^\w.\-]/g, '_').slice(-80);

function mailDoc(batch, to, subject, text) {
  if (!to) return;
  batch.set(doc(collection(adminDb, C.mail)), {
    to,
    message: { subject, text, html: text.replace(/\n/g, '<br/>') },
    createdAt: serverTimestamp(),
  });
}

/* Approve: payment → approved, enrollment created, student notified (+ email outbox) */
export async function approvePayment(p, settings) {
  const b = writeBatch(adminDb);
  b.update(doc(adminDb, C.payments, p.id), { status: 'approved', reviewedAt: serverTimestamp(), rejectReason: null });
  b.set(doc(adminDb, C.enrollments, enrollmentId(p.uid, p.courseId)), {
    uid: p.uid,
    courseId: p.courseId,
    courseTitle: p.courseTitle,
    studentName: p.studentName,
    studentEmail: p.studentEmail,
    paymentId: p.id,
    amount: p.amount,
    source: 'payment',
    createdAt: serverTimestamp(),
  });
  b.set(doc(collection(adminDb, C.notifications)), {
    to: p.uid,
    type: 'approved',
    title: 'Payment approved',
    body: `"${p.courseTitle}" waa kuu furan yahay. Ka bilow My Courses.`,
    read: false,
    createdAt: serverTimestamp(),
  });
  if (p.coupon) b.update(doc(adminDb, C.coupons, p.coupon), { usedCount: increment(1) });
  const t = settings.emailTemplates;
  const vars = { name: p.studentName, course: p.courseTitle, amount: `$${p.amount}` };
  mailDoc(b, p.studentEmail, fill(t.approvedSubject, vars), fill(t.approvedBody, vars));
  await b.commit();
}

export async function rejectPayment(p, reason, allowResubmit, settings) {
  const b = writeBatch(adminDb);
  b.update(doc(adminDb, C.payments, p.id), { status: 'rejected', rejectReason: reason, allowResubmit, reviewedAt: serverTimestamp() });
  b.set(doc(collection(adminDb, C.notifications)), {
    to: p.uid,
    type: 'rejected',
    title: 'Payment rejected',
    body: `"${p.courseTitle}": ${reason}${allowResubmit ? ' — waad dib u submit-gareyn kartaa.' : ''}`,
    read: false,
    createdAt: serverTimestamp(),
  });
  const t = settings.emailTemplates;
  const vars = { name: p.studentName, course: p.courseTitle, reason, amount: `$${p.amount}` };
  mailDoc(b, p.studentEmail, fill(t.rejectedSubject, vars), fill(t.rejectedBody, vars));
  await b.commit();
}

export function downloadCSV(name, rows) {
  if (!rows.length) return;
  const keys = Object.keys(rows[0]);
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = [keys.join(','), ...rows.map((r) => keys.map((k) => esc(r[k])).join(','))].join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = name;
  a.click();
}
