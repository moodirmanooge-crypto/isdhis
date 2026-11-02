import { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { C } from '../lib/db';

const Ctx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let unsubProfile = () => {};
    const unsub = onAuthStateChanged(auth, (u) => {
      unsubProfile();
      setUser(u);
      if (!u) {
        setProfile(null);
        setReady(true);
        return;
      }
      unsubProfile = onSnapshot(
        doc(db, C.users, u.uid),
        (snap) => {
          setProfile(snap.exists() ? { id: snap.id, ...snap.data() } : null);
          setReady(true);
        },
        () => setReady(true)
      );
    });
    return () => {
      unsub();
      unsubProfile();
    };
  }, []);

  const login = async (email, password) => {
    const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
    const ref = doc(db, C.users, cred.user.uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        name: cred.user.displayName || email.split('@')[0],
        email: cred.user.email,
        phone: '',
        role: 'student',
        status: 'active',
        createdAt: serverTimestamp(),
      });
    }
    return cred.user;
  };

  const register = async ({ name, email, phone, password }) => {
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
    await updateProfile(cred.user, { displayName: name });
    await setDoc(doc(db, C.users, cred.user.uid), {
      name,
      email: email.trim().toLowerCase(),
      phone: phone || '',
      role: 'student',
      status: 'active',
      createdAt: serverTimestamp(),
    });
    return cred.user;
  };

  const logout = () => signOut(auth);
  const resetPassword = (email) => sendPasswordResetEmail(auth, email.trim());

  return (
    <Ctx.Provider value={{ user, profile, ready, login, register, logout, resetPassword }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
