import { createContext, useContext, useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { C, DEFAULT_SETTINGS } from '../lib/db';

const Ctx = createContext({ settings: DEFAULT_SETTINGS, loaded: false });

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, C.settings, 'site'),
      (snap) => {
        const d = snap.exists() ? snap.data() : {};
        setSettings({
          ...DEFAULT_SETTINGS,
          ...d,
          emailTemplates: { ...DEFAULT_SETTINGS.emailTemplates, ...(d.emailTemplates || {}) },
        });
        setLoaded(true);
      },
      () => setLoaded(true)
    );
    return unsub;
  }, []);

  useEffect(() => {
    document.title = settings.siteName || 'Isdhis Academy';
  }, [settings.siteName]);

  return <Ctx.Provider value={{ settings, loaded }}>{children}</Ctx.Provider>;
}

export const useSettings = () => useContext(Ctx);
