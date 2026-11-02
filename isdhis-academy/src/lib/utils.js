export const money = (n) =>
  `$${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const effectivePrice = (c) =>
  c?.accessType === 'free'
    ? 0
    : c?.discountPrice && Number(c.discountPrice) > 0 && Number(c.discountPrice) < Number(c.price)
    ? Number(c.discountPrice)
    : Number(c?.price || 0);

export const toDate = (v) => (v?.toDate ? v.toDate() : v ? new Date(v) : null);

export const fmtDate = (v) => {
  const d = toDate(v);
  return d ? d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '—';
};

export const fmtDateTime = (v) => {
  const d = toDate(v);
  return d ? d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—';
};

export const byTimeDesc = (key = 'createdAt') => (a, b) =>
  (toDate(b[key])?.getTime() || 0) - (toDate(a[key])?.getTime() || 0);

export const fill = (tpl = '', vars = {}) =>
  tpl.replace(/\{(\w+)\}/g, (_, k) => (vars[k] !== undefined ? vars[k] : `{${k}}`));

export const slugify = (s = '') =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 60);

export const initials = (name = '') =>
  name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('') || '?';

export const errMsg = (e) => {
  const code = e?.code || '';
  const map = {
    'auth/invalid-credential': 'Email ama password khaldan.',
    'auth/wrong-password': 'Password khaldan.',
    'auth/user-not-found': 'Account-kan lama helin.',
    'auth/email-already-in-use': 'Email-kan hore ayaa loo isticmaalay.',
    'auth/weak-password': 'Password-ku waa inuu ahaadaa ugu yaraan 6 xaraf.',
    'auth/invalid-email': 'Email-ku sax ma aha.',
    'auth/too-many-requests': 'Isku day badan. Wax yar sug kadibna isku day.',
    'auth/operation-not-allowed':
      'Habkan login-ka lama shidin. Firebase Console → Authentication → Sign-in method.',
    'auth/admin-restricted-operation':
      'Anonymous sign-in lama shidin. Firebase Console → Authentication → Sign-in method → Anonymous.',
    'permission-denied': 'Fasax ma lihid (permission denied). Hubi Firestore rules-ka.',
    'storage/unauthorized': 'Fasax ma lihid inaad file-kan gasho.',
  };
  return map[code] || e?.message || 'Wax khalad ah ayaa dhacay.';
};
