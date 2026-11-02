import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInAnonymously, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { adminAuth, adminDb, ADMIN_DOC_IDS } from '../firebase';
import { C } from '../lib/db';
import { getDeviceLabel } from '../lib/device';

/*
 * Admin login uses your existing Firestore collection:
 *   IsdhisAdmin / superadmin  { username: "imam", password: "...", role: "admin" }
 *
 * How it stays secure:
 *  1. The browser signs in anonymously on a separate Firebase app instance.
 *  2. It tries to create IsdhisAdminSessions/{uid} containing the typed username + password.
 *  3. Firestore rules compare those values against IsdhisAdmin/{docId} on the server.
 *     The browser can NEVER read IsdhisAdmin, so passwords are never downloaded.
 *  4. Every admin-only rule checks that IsdhisAdminSessions/{uid} exists.
 */

const Ctx = createContext(null);

export function AdminProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    return onAuthStateChanged(adminAuth, async (u) => {
      if (!u) {
        setAdmin(null);
        setReady(true);
        return;
      }
      try {
        const snap = await getDoc(doc(adminDb, C.adminSessions, u.uid));
        setAdmin(snap.exists() ? { uid: u.uid, ...snap.data(), password: undefined } : null);
      } catch {
        setAdmin(null);
      }
      setReady(true);
    });
  }, []);

  const login = async (username, password) => {
    const uname = username.trim();
    if (!uname || !password) throw new Error('Geli username iyo password.');

    let u = adminAuth.currentUser;
    if (!u) u = (await signInAnonymously(adminAuth)).user;

    const candidates = [...new Set([...ADMIN_DOC_IDS, uname])];
    for (const adminId of candidates) {
      try {
        const data = {
          adminId,
          username: uname,
          password,
          device: getDeviceLabel(),
          createdAt: serverTimestamp(),
        };
        await setDoc(doc(adminDb, C.adminSessions, u.uid), data);
        const session = { uid: u.uid, adminId, username: uname };
        setAdmin(session);
        return session;
      } catch (e) {
        if (e?.code !== 'permission-denied') {
          await signOut(adminAuth).catch(() => {});
          throw e;
        }
      }
    }
    await signOut(adminAuth).catch(() => {});
    throw new Error('Username ama password khaldan.');
  };

  const logout = async () => {
    const u = adminAuth.currentUser;
    if (u) await deleteDoc(doc(adminDb, C.adminSessions, u.uid)).catch(() => {});
    await signOut(adminAuth);
    setAdmin(null);
  };

  return <Ctx.Provider value={{ admin, ready, login, logout }}>{children}</Ctx.Provider>;
}

export const useAdmin = () => useContext(Ctx);
