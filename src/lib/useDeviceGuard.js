import { useCallback, useEffect, useState } from 'react';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { C } from './db';
import { getDeviceId, getDeviceLabel } from './device';

/*
 * One active device per student.
 * IsdhisDevices/{uid} = {
 *   activeDeviceId, activeLabel, resetRequested,
 *   devices: { [deviceId]: { label, lastSeen, status } }
 * }
 * The first device that opens a lesson becomes "active". Any other device is blocked
 * until the admin resets it (Admin → Students → Devices) — the student can request a reset.
 */
export function useDeviceGuard(user, enabled) {
  const [state, setState] = useState({ status: 'checking', data: null });
  const myId = getDeviceId();

  const check = useCallback(async () => {
    if (!user) return setState({ status: 'checking', data: null });
    if (!enabled) return setState({ status: 'allowed', data: null });
    const ref = doc(db, C.devices, user.uid);
    const label = getDeviceLabel();
    try {
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        await setDoc(ref, {
          uid: user.uid,
          email: user.email,
          activeDeviceId: myId,
          activeLabel: label,
          resetRequested: false,
          devices: { [myId]: { label, lastSeen: serverTimestamp(), status: 'active' } },
          updatedAt: serverTimestamp(),
        });
        return setState({ status: 'allowed', data: null });
      }
      const d = snap.data();
      if (!d.activeDeviceId) {
        await updateDoc(ref, {
          activeDeviceId: myId,
          activeLabel: label,
          resetRequested: false,
          [`devices.${myId}`]: { label, lastSeen: serverTimestamp(), status: 'active' },
          updatedAt: serverTimestamp(),
        });
        return setState({ status: 'allowed', data: d });
      }
      if (d.activeDeviceId === myId) {
        await updateDoc(ref, { [`devices.${myId}.lastSeen`]: serverTimestamp() }).catch(() => {});
        return setState({ status: 'allowed', data: d });
      }
      await updateDoc(ref, {
        [`devices.${myId}`]: { label, lastSeen: serverTimestamp(), status: 'blocked' },
        updatedAt: serverTimestamp(),
      }).catch(() => {});
      setState({ status: 'blocked', data: d });
    } catch (e) {
      setState({ status: 'error', data: null, error: e });
    }
  }, [user?.uid, enabled, myId]);

  useEffect(() => { check(); }, [check]);

  const requestReset = async () => {
    await updateDoc(doc(db, C.devices, user.uid), { resetRequested: true, resetRequestedAt: serverTimestamp(), resetRequestedBy: myId });
    setState((s) => ({ ...s, data: { ...(s.data || {}), resetRequested: true } }));
  };

  return { ...state, requestReset, recheck: check, deviceId: myId };
}
