import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, doc, updateDoc, serverTimestamp, writeBatch, increment } from 'firebase/firestore';
import { Plus, Pencil, Trash2, ArrowUp, ArrowDown, PlayCircle, FileText, Image as ImageIcon, Eye, X, Upload, Lock } from 'lucide-react';
import { adminDb } from '../firebase';
import { C, S } from '../lib/db';
import { useList } from '../lib/hooks';
import { errMsg } from '../lib/utils';
import { Modal, Empty, useToast } from '../components/UI';
import { uploadFile, removeFile, safeName, fileUrl, publicUrl, captureVideoFrame, videoDuration, fmtDuration, mb } from './shared';

export default function LessonsAdmin() {
  const { courseId } = useParams();
  const nav = useNavigate();
  const toast = useToast();
  const { rows: courses } = useList(adminDb, C.courses);
  const { rows: raw } = useList(adminDb, C.lessons, courseId ? ['courseId', '==', courseId] : null, !!courseId);
  const lessons = useMemo(() => (courseId ? [...raw].filter((l) => l.courseId === courseId).sort((a, b) => (a.order || 0) - (b.order || 0)) : []), [raw, courseId]);
  const course = courses.find((c) => c.id === courseId);
  const [edit, setEdit] = useState(null);
  const [busy, setBusy] = useState(false);

  const move = async (i, dir) => {
    const a = lessons[i], b = lessons[i + dir];
    if (!a || !b) return;
    const bt = writeBatch(adminDb);
    bt.update(doc(adminDb, C.lessons, a.id), { order: b.order ?? i + dir });
    bt.update(doc(adminDb, C.lessons, b.id), { order: a.order ?? i });
    await bt.commit().catch((e) => toast(errMsg(e), 'err'));
  };

  const normalize = async () => {
    const bt = writeBatch(adminDb);
    lessons.forEach((l, i) => bt.update(doc(adminDb, C.lessons, l.id), { order: i + 1 }));
    bt.update(doc(adminDb, C.courses, courseId), { lessonCount: lessons.length });
    await bt.commit();
    toast('Lesson order & count fixed');
  };

  const remove = async (l) => {
    if (!confirm(`Delete lesson "${l.title}"?`)) return;
    try {
      const bt = writeBatch(adminDb);
      bt.delete(doc(adminDb, C.lessons, l.id));
      bt.update(doc(adminDb, C.courses, courseId), { lessonCount: increment(-1) });
      await bt.commit();
      removeFile(l.videoPath);
      removeFile(l.posterPath);
      (l.pdfs || []).concat(l.images || []).forEach((f) => removeFile(f.path));
      toast('Lesson deleted');
    } catch (e) { toast(errMsg(e), 'err'); }
  };

  return (
    <>
      <div className="admin-top">
        <h1>Lessons</h1>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <select className="input" style={{ width: 280 }} value={courseId || ''} onChange={(e) => nav(`/admin/lessons/${e.target.value}`)}>
            <option value="">— Select a course —</option>
            {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
          {courseId && <button className="btn btn-gold btn-sm" onClick={() => setEdit({ title: '', description: '', preview: false, order: lessons.length + 1, pdfs: [], images: [] })}><Plus size={15} /> Add Lesson</button>}
        </div>
      </div>
      {!courseId ? (
        <Empty title="Select a course">Dooro course si aad casharro ugu darto.</Empty>
      ) : (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
            <h3 style={{ margin: 0 }}>{course?.title} <span className="muted" style={{ fontWeight: 400 }}>· {lessons.length} lessons</span></h3>
            {lessons.length > 0 && <button className="btn btn-sm btn-ghost" onClick={normalize}>Fix order & count</button>}
          </div>
          {lessons.length ? lessons.map((l, i) => (
            <div className="lesson-admin" key={l.id}>
              <span className="n">{String(i + 1).padStart(2, '0')}</span>
              {l.posterUrl || l.images?.[0]?.url ? <img src={l.posterUrl || l.images[0].url} alt="" className="thumb-sm" /> : <div className="thumb-sm" />}
              <div style={{ flex: 1, minWidth: 0 }}>
                <b>{l.title}</b>
                <div style={{ display: 'flex', gap: 12, color: 'var(--muted)', fontSize: 12, marginTop: 4, flexWrap: 'wrap' }}>
                  {l.videoPath && <span><PlayCircle size={12} /> video {l.videoDuration ? fmtDuration(l.videoDuration) : ''}</span>}
                  {l.pdfs?.length > 0 && <span><FileText size={12} /> {l.pdfs.length} PDF</span>}
                  {l.images?.length > 0 && <span><ImageIcon size={12} /> {l.images.length} images</span>}
                  {l.preview && <span className="chip approved" style={{ padding: '0 8px' }}><Eye size={11} /> preview</span>}
                </div>
              </div>
              <div className="actions">
                <button className="icon-btn" onClick={() => move(i, -1)} disabled={i === 0}><ArrowUp size={15} /></button>
                <button className="icon-btn" onClick={() => move(i, 1)} disabled={i === lessons.length - 1}><ArrowDown size={15} /></button>
                <button className="icon-btn" onClick={() => setEdit(l)}><Pencil size={15} /></button>
                <button className="icon-btn" onClick={() => remove(l)}><Trash2 size={15} color="var(--bad)" /></button>
              </div>
            </div>
          )) : <Empty title="No lessons yet">Gujii “Add Lesson”.</Empty>}
        </>
      )}
      <Modal open={!!edit} onClose={() => setEdit(null)} locked={busy} title={edit?.id ? 'Edit lesson' : 'Add Lesson'} wide>
        {edit && <LessonForm courseId={courseId} initial={edit} onBusy={setBusy} onDone={() => { setBusy(false); setEdit(null); }} />}
      </Modal>
    </>
  );
}

function LessonForm({ courseId, initial, onDone, onBusy }) {
  const toast = useToast();
  const [f, setF] = useState({ ...initial, pdfs: initial.pdfs || [], images: initial.images || [] });
  const [video, setVideo] = useState(null);
  const [pdfs, setPdfs] = useState([]);
  const [images, setImages] = useState([]);
  const [status, setStatus] = useState('');
  const [prog, setProg] = useState({ pct: 0, sent: 0, total: 0 });
  const [busy, setBusyLocal] = useState(false);
  const [removed, setRemoved] = useState([]);
  const setBusy = (b) => { setBusyLocal(b); onBusy?.(b); };
  const onProg = (pct, s) => setProg({ pct, sent: s?.sent || 0, total: s?.total || 0 });

  const dropExisting = (kind, path) => {
    setF({ ...f, [kind]: f[kind].filter((x) => x.path !== path) });
    setRemoved((r) => [...r, path]);
  };

  const preview = async (path) => {
    try { window.open(await fileUrl(path), '_blank', 'noopener'); } catch (e) { toast(errMsg(e), 'err'); }
  };

  // keep the browser from closing the tab mid-upload
  const guard = (e) => { e.preventDefault(); e.returnValue = ''; };

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    window.addEventListener('beforeunload', guard);
    try {
      const isNew = !f.id;
      const lref = isNew ? doc(collection(adminDb, C.lessons)) : doc(adminDb, C.lessons, f.id);
      const id = lref.id;
      let { videoPath = null, posterUrl = null, posterPath = null, videoDuration: dur = 0 } = f;

      if (video) {
        setStatus('Preparing video thumbnail…');
        const [frame, seconds] = await Promise.all([captureVideoFrame(video), videoDuration(video)]);
        dur = Math.round(seconds);
        if (frame) {
          const pp = await uploadFile(S.lessonFile(courseId, id, 'images', 'poster.jpg'), new File([frame], 'poster.jpg', { type: 'image/jpeg' }));
          if (posterPath && posterPath !== pp) removeFile(posterPath);
          posterPath = pp;
          posterUrl = await publicUrl(pp);
        }
        setStatus(`Uploading video: ${video.name}`);
        const p = await uploadFile(S.lessonFile(courseId, id, 'video', safeName(video.name)), video, onProg);
        if (videoPath) removeFile(videoPath);
        videoPath = p;
      }
      const newPdfs = [...f.pdfs];
      for (const file of pdfs) {
        setStatus(`Uploading PDF: ${file.name}`);
        newPdfs.push({ name: file.name, path: await uploadFile(S.lessonFile(courseId, id, 'pdf', safeName(file.name)), file, onProg) });
      }
      // images keep a public URL so everyone can see them on the course page
      const newImages = await Promise.all(f.images.map(async (im) => (im.url ? im : { ...im, url: await publicUrl(im.path).catch(() => '') })));
      for (const file of images) {
        setStatus(`Uploading image: ${file.name}`);
        const path = await uploadFile(S.lessonFile(courseId, id, 'images', safeName(file.name)), file, onProg);
        newImages.push({ name: file.name, path, url: await publicUrl(path) });
      }
      setStatus('Saving…');
      const data = {
        courseId,
        title: f.title.trim(),
        description: f.description || '',
        order: Number(f.order) || 1,
        preview: !!f.preview,
        videoPath,
        videoDuration: dur || 0,
        posterUrl: posterUrl || null,
        posterPath: posterPath || null,
        pdfs: newPdfs,
        images: newImages,
        updatedAt: serverTimestamp(),
      };
      if (isNew) {
        const bt = writeBatch(adminDb);
        bt.set(lref, { ...data, createdAt: serverTimestamp() });
        bt.update(doc(adminDb, C.courses, courseId), { lessonCount: increment(1) });
        await bt.commit();
      } else {
        await updateDoc(lref, data);
      }
      removed.forEach(removeFile);
      toast(isNew ? 'Lesson added' : 'Lesson updated');
      window.removeEventListener('beforeunload', guard);
      onDone();
      return;
    } catch (e2) {
      toast(errMsg(e2), 'err');
      setStatus('');
    }
    window.removeEventListener('beforeunload', guard);
    setBusy(false);
  };

  return (
    <form onSubmit={save}>
      <div className="row2" style={{ gridTemplateColumns: '1fr 120px' }}>
        <div className="field"><label>Lesson Title</label><input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} required disabled={busy} /></div>
        <div className="field"><label>Lesson Order</label><input type="number" min="1" value={f.order} onChange={(e) => setF({ ...f, order: e.target.value })} disabled={busy} /></div>
      </div>
      <div className="field"><label>Lesson Description</label><textarea value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} rows={4} disabled={busy} /></div>
      <label className="check" style={{ marginBottom: 18 }}><input type="checkbox" checked={!!f.preview} onChange={(e) => setF({ ...f, preview: e.target.checked })} disabled={busy} /> Preview Lesson — qof walba wuu daawan karaa (free sample)</label>

      <div className="field">
        <label><PlayCircle size={13} /> Video Upload</label>
        {f.videoPath && !video && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, flexWrap: 'wrap' }} className="muted">
            {f.posterUrl && <img src={f.posterUrl} alt="" className="thumb-sm" />}
            Current video {f.videoDuration ? `(${fmtDuration(f.videoDuration)})` : ''}
            <button type="button" className="btn btn-sm btn-ghost" onClick={() => preview(f.videoPath)}>Open</button>
            <button type="button" className="btn btn-sm btn-danger" onClick={() => { setRemoved((r) => [...r, f.videoPath]); setF({ ...f, videoPath: null }); }}>Remove</button>
          </div>
        )}
        <div className="dropzone"><input type="file" accept="video/*" disabled={busy} onChange={(e) => setVideo(e.target.files?.[0] || null)} />{video ? `${video.name} · ${mb(video.size)}` : <><Upload size={20} /><div>MP4 / WebM</div></>}</div>
        {video && video.size > 300 * 1048576 && <small style={{ color: 'var(--warn)' }}>Video-gu waa weyn yahay ({mb(video.size)}). Upload-ku wuu qaadan karaa waqti. Si uu u dhaqsado, ku compress garee 720p (HandBrake).</small>}
      </div>

      <div className="field">
        <label><FileText size={13} /> PDF Upload</label>
        {f.pdfs.map((p) => <ExistingFile key={p.path} f={p} onOpen={() => preview(p.path)} onRemove={() => dropExisting('pdfs', p.path)} />)}
        <div className="dropzone"><input type="file" accept="application/pdf" multiple disabled={busy} onChange={(e) => setPdfs([...e.target.files])} />{pdfs.length ? pdfs.map((p) => p.name).join(', ') : <><Upload size={20} /><div>One or more PDFs</div></>}</div>
      </div>

      <div className="field">
        <label><ImageIcon size={13} /> Images Upload <span className="muted" style={{ fontWeight: 400 }}>— waxay ka muuqanayaan bogga course-ka (qof walba)</span></label>
        {f.images.length > 0 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {f.images.map((p) => (
              <div key={p.path} style={{ position: 'relative' }}>
                {p.url ? <img src={p.url} alt="" style={{ width: 90, height: 64, objectFit: 'cover', borderRadius: 8 }} /> : <div className="thumb-sm" style={{ width: 90, height: 64 }} />}
                <button type="button" className="icon-btn" style={{ position: 'absolute', top: -8, right: -8, width: 24, height: 24, background: 'var(--card)' }} onClick={() => dropExisting('images', p.path)}><X size={12} /></button>
              </div>
            ))}
          </div>
        )}
        <div className="dropzone"><input type="file" accept="image/*" multiple disabled={busy} onChange={(e) => setImages([...e.target.files])} />{images.length ? images.map((p) => p.name).join(', ') : <><Upload size={20} /><div>One or more images</div></>}</div>
      </div>

      {busy && (
        <div style={{ marginBottom: 14 }}>
          <div className="muted" style={{ fontSize: 13, display: 'flex', justifyContent: 'space-between', gap: 10 }}>
            <span>{status}</span>
            <span>{prog.total ? `${mb(prog.sent)} / ${mb(prog.total)} · ${prog.pct}%` : ''}</span>
          </div>
          <div className="upload-bar"><div style={{ width: `${prog.pct}%` }} /></div>
          <small className="muted"><Lock size={11} /> Ha xirin tab-kan inta upload-ku socdo.</small>
        </div>
      )}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button type="button" className="btn btn-ghost" onClick={onDone} disabled={busy}>Cancel</button>
        <button className="btn btn-gold" disabled={busy}>{busy ? 'Uploading…' : 'Save lesson'}</button>
      </div>
    </form>
  );
}

function ExistingFile({ f, onOpen, onRemove }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, padding: '6px 10px', border: '1px solid var(--line)', borderRadius: 10 }}>
      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
      <button type="button" className="btn btn-sm btn-ghost" onClick={onOpen}>Open</button>
      <button type="button" className="icon-btn" onClick={onRemove}><X size={14} /></button>
    </div>
  );
}
