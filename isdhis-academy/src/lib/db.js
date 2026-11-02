/*
 * All Firestore collections used by Isdhis Academy.
 * Every name starts with "Isdhis" so nothing collides with the other apps
 * (Barakaat, dream-market, …) that live in the same Firebase project.
 */
export const C = {
  admin: 'IsdhisAdmin',                 // existing: superadmin { username, password, role }
  adminSessions: 'IsdhisAdminSessions', // one doc per signed-in admin session (uid)
  users: 'IsdhisUsers',                 // student profiles
  courses: 'IsdhisCourses',
  lessons: 'IsdhisLessons',
  categories: 'IsdhisCategories',
  payments: 'IsdhisPayments',
  enrollments: 'IsdhisEnrollments',     // id = `${uid}_${courseId}`
  progress: 'IsdhisProgress',           // id = `${uid}_${courseId}`
  devices: 'IsdhisDevices',             // id = uid
  certificates: 'IsdhisCertificates',   // id = `${uid}_${courseId}`
  reviews: 'IsdhisReviews',             // id = `${uid}_${courseId}`
  coupons: 'IsdhisCoupons',             // id = CODE (uppercase)
  notifications: 'IsdhisNotifications',
  messages: 'IsdhisMessages',           // contact form
  mail: 'IsdhisMail',                   // outbox for the "Trigger Email" Firebase extension
  settings: 'IsdhisSettings',           // doc "site"
};

/* Storage folders — everything under "Isdhis/" */
export const S = {
  thumb: (courseId, name) => `Isdhis/courses/${courseId}/thumbnail/${Date.now()}_${name}`,
  lessonFile: (courseId, lessonId, kind, name) =>
    `Isdhis/courses/${courseId}/lessons/${lessonId}/${kind}/${Date.now()}_${name}`,
  payment: (uid, name) => `Isdhis/payments/${uid}/${Date.now()}_${name}`,
  site: (name) => `Isdhis/site/${Date.now()}_${name}`,
  avatar: (uid, name) => `Isdhis/avatars/${uid}/${Date.now()}_${name}`,
};

export const enrollmentId = (uid, courseId) => `${uid}_${courseId}`;

export const DEFAULT_SETTINGS = {
  siteName: 'Isdhis Academy',
  tagline: 'Learn Today. Lead Tomorrow.',
  logoUrl: '',
  heroText:
    'Welcome to Isdhis Academy, your gateway to knowledge, professional skills, and lifelong learning.',
  contactEmail: 'info@isdhisacademy.com',
  contactPhone: '+252 61 0000000',
  address: 'Mogadishu, Somalia',
  paymentMethods: [
    { name: 'EVC Plus', number: '061XXXXXXX', holder: 'Isdhis Academy', active: true },
    { name: 'Zaad', number: '063XXXXXXX', holder: 'Isdhis Academy', active: true },
    { name: 'Sahal', number: '090XXXXXXX', holder: 'Isdhis Academy', active: true },
  ],
  paymentInstructions:
    'Send the exact course amount to one of the numbers below, then submit your Transaction ID and a screenshot of the receipt.',
  deviceRestriction: true,
  maintenanceMode: false,
  certificatesEnabled: true,
  emailTemplates: {
    approvedSubject: 'Your course is ready — {course}',
    approvedBody:
      'Hello {name},\n\nYour payment for "{course}" has been approved. You can start learning now from My Courses.\n\nIsdhis Academy',
    rejectedSubject: 'Payment not approved — {course}',
    rejectedBody:
      'Hello {name},\n\nWe could not approve your payment for "{course}".\nReason: {reason}\n\nYou can submit a new payment from your dashboard.\n\nIsdhis Academy',
  },
};
