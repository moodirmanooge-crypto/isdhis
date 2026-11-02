import { initializeApp } from 'firebase/app';
import { getAuth, browserLocalPersistence, setPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const env = import.meta.env;

export const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || 'AIzaSyAtjD-bDtA36ijj5whyYClexnFBM1COTw0',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || 'barakaat-a9fe1.firebaseapp.com',
  databaseURL: env.VITE_FIREBASE_DATABASE_URL || 'https://barakaat-a9fe1-default-rtdb.firebaseio.com',
  projectId: env.VITE_FIREBASE_PROJECT_ID || 'barakaat-a9fe1',
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || 'barakaat-a9fe1.firebasestorage.app',
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || '993046978374',
  appId: env.VITE_FIREBASE_APP_ID || '1:993046978374:web:739f72acb0cad3f2ae0f47',
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID || 'G-RV1BEJG5RP',
};

/*
 * Two separate Firebase app instances:
 *  - "student" app: students sign in with email + password (Firebase Auth).
 *  - "admin" app:   admin signs in with the IsdhisAdmin collection (username/password).
 * Keeping them separate means an admin and a student session never overwrite each other.
 */
const studentApp = initializeApp(firebaseConfig, 'isdhis-student');
const adminApp = initializeApp(firebaseConfig, 'isdhis-admin');

export const auth = getAuth(studentApp);
export const db = getFirestore(studentApp);
export const storage = getStorage(studentApp);

export const adminAuth = getAuth(adminApp);
export const adminDb = getFirestore(adminApp);
export const adminStorage = getStorage(adminApp);

setPersistence(auth, browserLocalPersistence).catch(() => {});
setPersistence(adminAuth, browserLocalPersistence).catch(() => {});

export const ADMIN_DOC_IDS = (env.VITE_ISDHIS_ADMIN_DOC_IDS || 'superadmin')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
