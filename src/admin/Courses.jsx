import { useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, doc, addDoc, updateDoc, deleteDoc, getDocs, query, where, serverTimestamp, writeBatch } from 'firebase/firestore';
import { Plus, Pencil, Trash2, Layers, Eye, Search, Upload } from 'lucide-react';
import { adminDb } from '../firebase';
import { C, S } from '../lib/db';
import { useList, useCategories } from '../lib/hooks';
import { money, effectivePrice, errMsg, byTimeDesc } from '../lib/utils';
import { Modal, StatusChip, Empty, useToast } from '../components/UI';
import { uploadFile, publicUrl, removeFile, safeName } from './shared';

const EMPTY = {
  title: '', shortDescription: '', description: '', category: '', instructor: '', instructorBio: '',
  price: '', discountPrice: '', status: 'draft', accessType: 'paid', duration: '', level: 'Beginner',
  whatYouLearn: '', thumbnail: '', thumbnailPath: '',
};

export default function CoursesAdmin() {
  const { rows } = useList(adminDb, C.courses);
  const toast = useToast();
  const [edit, setEdit] = useState(null);
  const [q, setQ] = useState('');
  const list = rows.filter((c) => !q || (c.title + c.category + c.instructor).toLowerCase().includes(q.toLowerCase())).sort(byTimeDesc());

  const remove = async (c) => {
    if (!confirm(`Delete "${c.title}" and all its lessons? This cannot be undone.`)) return;
    try {
      const ls = await getDocs(query(collection(adminDb, C.lessons), where('courseId', '==', c.id)));
      const b = writeBatch(adminDb);
      ls.docs.forEach((d) => {
        const l = d.data();
        removeFile(l.videoPath);
        (l.pdfs || []).concat(l.images || []).forEach((f) => removeFile(f.path));
        b.delete(d.ref);
      });
      b.delete(doc(adminDb, C.courses, c.id));
      await b.commit();
      removeFile(c.thumbnailPath);
      toast('Course-ka waa la tirtiray');
    } catch (e) { toast(errMsg(e), 'err'); }
  };

  const togglePublish = (c) =>
    updateDoc(doc(adminDb, C.courses, c.id), { status: c.status === 'published' ? 'draft' : 'published' })
      .then(() => toast(c.status === 'published' ? 'Moved to draft' : 'Published'))
      .catch((e) => toast(errMsg(e), 'err'));

  return (
    <>
      <div className="admin-top">
        <h1>Courses</h1>
        <button className="btn btn-gold btn-sm" onClick={() => setEdit(EMPTY)}><Plus size={15} /> Add New Course</button>
      </div>
      <div style={{ position: 'relative', marginBottom: 18, maxWidth: 380 }}>
        <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', translate: '0 -50%', color: 'var(--muted)' }} />
        <input className="input" style={{ paddingLeft: 40 }} placeholder="Search courses" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {list.length ? (
        <div className="table-wrap">
          <table>
            <thead><tr><th></th><th>Course</th><th>Category</th><th>Lessons</th><th>Price</th><th>Access</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {list.map((c) => (
                <tr key={c.id}>
                  <td>{c.thumbnail ? <img src={c.thumbnail} className="thumb-sm" alt="" /> : <div className="thumb-sm" />}</td>
                  <td><b>{c.title}</b><div className="muted" style={{ fontSize: 12 }}>{c.instructor}</div></td>
                  <td>{c.category || '—'}</td>
                  <td>{c.lessonCount || 0}</td>
                  <td>{c.accessType === 'free' ? 'Free' : <>{money(effectivePrice(c))}{effectivePrice(c) < Number(c.price) && <s className="muted" style={{ marginLeft: 6, fontSize: 12 }}>{money(c.price)}</s>}</>}</td>
                  <td>{c.accessType}</td>
                  <td><button style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer' }} onClick={() => togglePublish(c)} title="Toggle"><StatusChip status={c.status} /></button></td>
                  <td>
                    <div className="actions">
                      <Link className="btn btn-sm btn-ghost" to={`/admin/lessons/${c.id}`}><Layers size={14} /> Lessons</Link>
                      <button className="icon-btn" onClick={() => setEdit({ ...EMPTY, ...c, whatYouLearn: (c.whatYouLearn || []).join('\n') })} title="Edit"><Pencil size={15} /></button>
                      {c.status === 'published' && <a className="icon-btn" href={`/courses/${c.id}`} target="_blank" rel="noreferrer" title="View"><Eye size={15} /></a>}
                      <button className="icon-btn" onClick={() => remove(c)} title="Delete"><Trash2 size={15} color="var(--bad)" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty title="No courses yet">Gujii “Add New Course” si aad u abuurto course-kii ugu horreeyay.</Empty>
      )}
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? 'Edit course' : 'Add New Course'} wide>
        {edit && <CourseForm initial={edit} onDone={() => setEdit(null)} />}
      </Modal>
    </>
  );
}

function CourseForm({ initial, onDone }) {
  const toast = useToast();
  const cats = useCategories(adminDb);
  const [f, setF] = useState(initial);
  const [thumb, setThumb] = useState(null);
  const [prog, setProg] = useState(0);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const save = async (e) => {
    e.preventDefault();
    if (f.accessType === 'paid' && !(Number(f.price) > 0)) return toast('Geli qiimaha course-ka', 'err');
    setBusy(true);
    try {
      const data = {
        title: f.title.trim(),
        shortDescription: f.shortDescription.trim(),
        description: f.description,
        category: f.category,
        instructor: f.instructor.trim(),
        instructorBio: f.instructorBio || '',
        price: f.accessType === 'free' ? 0 : Number(f.price || 0),
        discountPrice: f.discountPrice ? Number(f.discountPrice) : null,
        status: f.status,
        accessType: f.accessType,
        duration: f.duration,
        level: f.level,
        whatYouLearn: f.whatYouLearn.split('\n').map((s) => s.trim()).filter(Boolean),
        updatedAt: serverTimestamp(),
      };
      let id = f.id;
      if (id) await updateDoc(doc(adminDb, C.courses, id), data);
      else id = (await addDoc(collection(adminDb, C.courses), { ...data, lessonCount: 0, createdAt: serverTimestamp() })).id;

      if (thumb) {
        const path = await uploadFile(S.thumb(id, safeName(thumb.name)), thumb, setProg);
        const url = await publicUrl(path);
        await updateDoc(doc(adminDb, C.courses, id), { thumbnail: url, thumbnailPath: path });
        if (f.thumbnailPath) removeFile(f.thumbnailPath);
      }
      toast(f.id ? 'Course-ka waa la cusboonaysiiyey' : 'Course cusub waa la abuuray — hadda ku dar casharro');
      onDone();
    } catch (e2) { toast(errMsg(e2), 'err'); }
    setBusy(false);
  };

  return (
    <form onSubmit={save}>
      <div className="field"><label>Course Title</label><input value={f.title} onChange={set('title')} required /></div>
      <div className="field"><label>Short description (card)</label><input value={f.shortDescription} onChange={set('shortDescription')} maxLength={180} /></div>
      <div className="field"><label>Course Description</label><textarea value={f.description} onChange={set('description')} rows={5} /></div>
      <div className="field"><label>What students will learn (one per line)</label><textarea value={f.whatYouLearn} onChange={set('whatYouLearn')} rows={4} /></div>
      <div className="row3">
        <div className="field">
          <label>Category</label>
          <select value={f.category} onChange={set('category')}>
            <option value="">— Select —</option>
            {cats.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
          </select>
          <small>Categories: Website Settings</small>
        </div>
        <div className="field"><label>Level</label><select value={f.level} onChange={set('level')}><option>Beginner</option><option>Intermediate</option><option>Advanced</option><option>All levels</option></select></div>
        <div className="field"><label>Duration</label><input value={f.duration} onChange={set('duration')} placeholder="8 Hours" /></div>
      </div>
      <div className="row2">
        <div className="field"><label>Instructor</label><input value={f.instructor} onChange={set('instructor')} /></div>
        <div className="field"><label>Instructor bio</label><input value={f.instructorBio} onChange={set('instructorBio')} /></div>
      </div>
      <div className="row2">
        <div className="field"><label>Access Type</label><select value={f.accessType} onChange={set('accessType')}><option value="paid">Paid</option><option value="free">Free</option></select></div>
        <div className="field"><label>Course Status</label><select value={f.status} onChange={set('status')}><option value="draft">Draft</option><option value="published">Published</option></select></div>
      </div>
      {f.accessType === 'paid' && (
        <div className="row2">
          <div className="field"><label>Price ($)</label><input type="number" min="0" step="0.01" value={f.price} onChange={set('price')} required /></div>
          <div className="field"><label>Discount Price ($)</label><input type="number" min="0" step="0.01" value={f.discountPrice || ''} onChange={set('discountPrice')} placeholder="optional" /></div>
        </div>
      )}
      <div className="field">
        <label>Course Thumbnail</label>
        <div className="dropzone">
          <input type="file" accept="image/*" onChange={(e) => setThumb(e.target.files?.[0] || null)} />
          {thumb ? <img src={URL.createObjectURL(thumb)} alt="" style={{ maxHeight: 160, margin: '0 auto', borderRadius: 10 }} /> : f.thumbnail ? <img src={f.thumbnail} alt="" style={{ maxHeight: 160, margin: '0 auto', borderRadius: 10 }} /> : <><Upload size={22} /><div>Upload image (16:10 recommended)</div></>}
        </div>
        {busy && prog > 0 && <div className="upload-bar"><div style={{ width: `${prog}%` }} /></div>}
      </div>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button type="button" className="btn btn-ghost" onClick={onDone}>Cancel</button>
        <button className="btn btn-gold" disabled={busy}>{busy ? 'Saving…' : 'Save course'}</button>
      </div>
    </form>
  );
}
