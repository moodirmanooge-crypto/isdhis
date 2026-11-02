import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { C } from './db';
import { byTimeDesc } from './utils';

/* Published courses (public). Sorted client-side so no composite index is needed. */
export function usePublishedCourses() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  useEffect(() => {
    const q = query(collection(db, C.courses), where('status', '==', 'published'));
    return onSnapshot(
      q,
      (s) => {
        setCourses(s.docs.map((d) => ({ id: d.id, ...d.data() })).sort(byTimeDesc()));
        setLoading(false);
      },
      (e) => {
        setError(e);
        setLoading(false);
      }
    );
  }, []);
  return { courses, loading, error };
}

export function useCategories(database = db) {
  const [cats, setCats] = useState([]);
  useEffect(
    () =>
      onSnapshot(
        collection(database, C.categories),
        (s) => setCats(s.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (a.name || '').localeCompare(b.name || ''))),
        () => {}
      ),
    [database]
  );
  return cats;
}

export function useDoc(database, col, id) {
  const [data, setData] = useState(undefined);
  useEffect(() => {
    if (!id) return setData(null);
    return onSnapshot(
      doc(database, col, id),
      (s) => setData(s.exists() ? { id: s.id, ...s.data() } : null),
      () => setData(null)
    );
  }, [database, col, id]);
  return data;
}

/* Live list of a collection with an optional single where clause */
export function useList(database, col, whereClause, enabled = true) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const key = whereClause ? whereClause.join('|') : '';
  useEffect(() => {
    if (!enabled) return;
    const ref = collection(database, col);
    const q = whereClause ? query(ref, where(...whereClause)) : ref;
    return onSnapshot(
      q,
      (s) => {
        setRows(s.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      () => setLoading(false)
    );
  }, [database, col, key, enabled]);
  return { rows, loading };
}
