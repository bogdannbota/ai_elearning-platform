import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";
import { useToast } from "../../context/ToastContext";
import { deptTheme } from "../../theme/departments";

const API = "http://127.0.0.1:8000";

const DIFFICULTY = [
  { value: "beginner",     label: "Începător",   cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { value: "intermediate", label: "Intermediar", cls: "bg-blue-50 text-blue-700 border-blue-200" },
  { value: "advanced",     label: "Avansat",     cls: "bg-amber-50 text-amber-800 border-amber-200" },
  { value: "expert",       label: "Expert",      cls: "bg-rose-50 text-rose-700 border-rose-200" },
];
const diffOf = (v) => DIFFICULTY.find((d) => d.value === v) || DIFFICULTY[0];

export default function CursuriAdmin() {
  const { token, user } = useAuth();
  const isAdmin = user?.role === "admin";
  const { addToast } = useToast();

  const [courses, setCourses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [showModulesModal, setShowModulesModal] = useState(false);
  const [modulesCourse, setModulesCourse] = useState(null);

  useEffect(() => { fetchAll(); }, []);
  const fetchAll = async () => {
    try {
      setLoading(true);
      const [c, cat, d] = await Promise.all([
        axios.get(`${API}/courses/?token=${token}`),
        axios.get(`${API}/course-categories/?token=${token}`),
        axios.get(`${API}/departments/?token=${token}`),
      ]);
      setCourses(c.data); setCategories(cat.data); setDepartments(d.data);
    } catch { addToast("Eroare la încărcarea datelor", "error"); }
    finally { setLoading(false); }
  };

  const handleDelete = async (course) => {
    if (!window.confirm(`Sigur ștergi cursul "${course.title}"?`)) return;
    try { await axios.delete(`${API}/courses/${course.id}?token=${token}`); addToast("Curs șters", "success"); fetchAll(); }
    catch (e) { addToast(e.response?.data?.detail || "Eroare la ștergere", "error"); }
  };
  const togglePublish = async (course) => {
    try {
      await axios.post(`${API}/courses/${course.id}/${course.is_published ? "unpublish" : "publish"}?token=${token}`);
      addToast(course.is_published ? "Curs retras în ciornă" : "Curs publicat", "success"); fetchAll();
    } catch { addToast("Eroare la schimbarea stării", "error"); }
  };
  const deptName = (id) => departments.find((d) => d.id === id)?.name;

  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-500">Se încarcă...</div>;

  return (
    <div className="min-h-screen pb-12">
      <div className="bg-white border-b px-6 py-9" style={{ borderColor: "var(--line)" }}>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="eyebrow">Conținut</span>
            <h1 className="text-3xl font-extrabold text-slate-900 mt-1">Gestionare cursuri</h1>
          </div>
          <button onClick={() => { setEditingCourse(null); setShowCourseModal(true); }} className="btn btn-primary">+ Curs nou</button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 mt-8">
        {courses.length === 0 ? (
          <div className="surface p-16 text-center text-slate-400">Niciun curs în catalog.</div>
        ) : (
          <div className="surface overflow-hidden">
            <div className="px-6 py-5 border-b flex justify-between items-center" style={{ borderColor: "var(--line)" }}>
              <h2 className="text-lg font-bold text-slate-900">Catalogul de cursuri</h2>
              <span className="text-xs font-semibold text-slate-400">{courses.length} cursuri</span>
            </div>
            <div className="overflow-x-auto">
              <table className="data">
                <thead><tr><th>Curs</th><th>Categorie</th><th>Departament</th><th>Dificultate</th><th style={{ textAlign: "center" }}>Status</th><th style={{ textAlign: "right" }}>Acțiuni</th></tr></thead>
                <tbody>
                  {courses.map((c) => {
                    const diff = diffOf(c.difficulty_level);
                    const cat = categories.find((x) => x.id === c.category_id);
                    const dt = deptTheme(c.department_id);
                    return (
                      <tr key={c.id}>
                        <td>
                          <div className="flex items-center gap-3">
                            {c.cover_image_path
                              ? <img src={`${API}/${c.cover_image_path}`} alt="" className="w-11 h-11 rounded-lg object-cover border" style={{ borderColor: "var(--line)" }} />
                              : <div className="w-11 h-11 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 font-bold" style={{ fontFamily: "var(--font-display)" }}>{c.title?.[0] || "C"}</div>}
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-900 truncate max-w-[240px]">{c.title}</p>
                              <p className="text-xs text-slate-400 truncate max-w-[240px]">{c.short_description || c.description || "Fără descriere"}</p>
                            </div>
                          </div>
                        </td>
                        <td>{cat ? <span className="tag bg-slate-100 text-slate-600 border-slate-200">{cat.name}</span> : <span className="text-slate-300 text-xs">—</span>}</td>
                        <td>{c.department_id ? <span className={`tag ${dt.chip}`}>{deptName(c.department_id) || `#${c.department_id}`}</span> : <span className="text-slate-400 text-xs">Toate</span>}</td>
                        <td><span className={`tag ${diff.cls}`}>{diff.label}</span></td>
                        <td style={{ textAlign: "center" }}><span className={`tag ${c.is_published ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-800 border-amber-200"}`}>{c.is_published ? "Publicat" : "Ciornă"}</span></td>
                        <td style={{ textAlign: "right" }}>
                          <div className="flex justify-end gap-3 items-center">
                            <button onClick={() => { setModulesCourse(c); setShowModulesModal(true); }} className="text-sm font-semibold text-slate-500 hover:text-slate-900">Lecții</button>
                            <button onClick={() => togglePublish(c)} className={`text-sm font-semibold ${c.is_published ? "text-amber-600" : "text-emerald-600"}`}>{c.is_published ? "Ascunde" : "Publică"}</button>
                            <button onClick={() => { setEditingCourse(c); setShowCourseModal(true); }} className="text-sm font-semibold" style={{ color: "var(--accent)" }}>Editează</button>
                            {isAdmin && <button onClick={() => handleDelete(c)} className="text-sm font-semibold text-rose-600">Șterge</button>}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {showCourseModal && (
        <CourseModal existing={editingCourse} categories={categories} departments={departments}
          onClose={() => { setShowCourseModal(false); setEditingCourse(null); }}
          onSaved={() => { setShowCourseModal(false); setEditingCourse(null); fetchAll(); }}
          token={token} addToast={addToast} />
      )}
      {showModulesModal && modulesCourse && (
        <ModulesModal course={modulesCourse} onClose={() => { setShowModulesModal(false); setModulesCourse(null); }} token={token} addToast={addToast} />
      )}
    </div>
  );
}

function CourseModal({ existing, categories, departments, onClose, onSaved, token, addToast }) {
  const isEdit = !!existing;
  const [form, setForm] = useState({
    title: existing?.title || "",
    short_description: existing?.short_description || "",
    description: existing?.description || "",
    category_id: existing?.category_id || "",
    difficulty_level: existing?.difficulty_level || "beginner",
    duration_minutes: existing?.duration_minutes ?? 0,
    is_published: existing?.is_published ?? false,
    display_order: existing?.display_order ?? 0,
    department_id: existing?.department_id ? String(existing.department_id) : "",
  });
  const [file, setFile] = useState(null);
  const [coverImage, setCoverImage] = useState(null);
  const [coverPreview, setCoverPreview] = useState(existing?.cover_image_path ? `${API}/${existing.cover_image_path}` : null);
  const [saving, setSaving] = useState(false);

  const handleCoverChange = (e) => {
    const f = e.target.files[0]; if (!f) return;
    setCoverImage(f); const r = new FileReader(); r.onload = (ev) => setCoverPreview(ev.target.result); r.readAsDataURL(f);
  };

  const handleSubmit = async () => {
    if (form.title.trim().length < 3) return addToast("Titlul trebuie să aibă minim 3 caractere", "warning");
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("title", form.title);
      if (form.short_description) fd.append("short_description", form.short_description);
      if (form.description) fd.append("description", form.description);
      if (form.category_id) fd.append("category_id", form.category_id);
      fd.append("difficulty_level", form.difficulty_level);
      fd.append("duration_minutes", form.duration_minutes);
      fd.append("is_published", form.is_published);
      fd.append("display_order", form.display_order);
      fd.append("department_ids", form.department_id);
      if (file) fd.append("file", file);
      if (coverImage) fd.append("cover_image", coverImage);
      if (isEdit) { await axios.put(`${API}/courses/${existing.id}?token=${token}`, fd, { headers: { "Content-Type": "multipart/form-data" } }); addToast("Curs actualizat", "success"); }
      else { await axios.post(`${API}/courses/?token=${token}`, fd, { headers: { "Content-Type": "multipart/form-data" } }); addToast("Curs creat", "success"); }
      onSaved();
    } catch (e) { addToast(e.response?.data?.detail || "Eroare la salvare", "error"); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto" style={{ background: "rgba(15,22,34,.45)" }}>
      <div className="surface w-full max-w-3xl my-8 p-8">
        <h2 className="text-2xl font-extrabold text-slate-900 mb-1">{isEdit ? "Editează cursul" : "Curs nou"}</h2>
        <p className="text-sm text-slate-500 mb-6 border-b pb-4" style={{ borderColor: "var(--line)" }}>Informațiile de bază. Lecțiile le adaugi separat.</p>

        <div className="mb-6">
          <label className="block text-xs font-semibold text-slate-600 mb-2">Imagine cover (opțional)</label>
          <div className="flex items-center gap-4">
            {coverPreview
              ? <img src={coverPreview} alt="cover" className="w-32 h-20 rounded-lg object-cover border" style={{ borderColor: "var(--line)" }} />
              : <div className="w-32 h-20 rounded-lg bg-slate-50 border-2 border-dashed flex items-center justify-center text-slate-300" style={{ borderColor: "var(--line)" }}>cover</div>}
            <div>
              <input type="file" accept="image/*" onChange={handleCoverChange} className="hidden" id="cover-upload" />
              <label htmlFor="cover-upload" className="btn btn-ghost cursor-pointer">{coverPreview ? "Schimbă" : "Încarcă"}</label>
              {coverPreview && <button type="button" onClick={() => { setCoverImage(null); setCoverPreview(null); }} className="ml-2 text-xs text-rose-600 font-semibold">Elimină</button>}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Titlu *</label>
            <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="ex: Introducere în Python" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Descriere scurtă</label>
            <input className="input" value={form.short_description} onChange={(e) => setForm({ ...form, short_description: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Descriere completă</label>
            <textarea rows={4} className="input resize-none" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Categorie</label>
              <select className="input" value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
                <option value="">— Fără categorie —</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Dificultate</label>
              <select className="input" value={form.difficulty_level} onChange={(e) => setForm({ ...form, difficulty_level: e.target.value })}>
                {DIFFICULTY.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Durată (min)</label>
              <input type="number" min={0} className="input text-center" value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: parseInt(e.target.value) || 0 })} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Ordine</label>
              <input type="number" min={0} className="input text-center" value={form.display_order} onChange={(e) => setForm({ ...form, display_order: parseInt(e.target.value) || 0 })} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Departament</label>
              <select className="input" value={form.department_id} onChange={(e) => setForm({ ...form, department_id: e.target.value })}>
                <option value="">— Toate —</option>{departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Material PDF (opțional)</label>
            <div className="border-2 border-dashed bg-slate-50 rounded-xl p-4 text-center" style={{ borderColor: "var(--line)" }}>
              <input id="pdfInput" type="file" accept=".pdf" onChange={(e) => setFile(e.target.files[0])} className="hidden" />
              <label htmlFor="pdfInput" className="cursor-pointer block text-sm text-slate-500">
                {file ? <span className="font-semibold text-slate-700">{file.name}</span> : existing?.file_path ? "PDF existent · click pentru a-l schimba" : "Click pentru a încărca un PDF"}
              </label>
            </div>
          </div>
          <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border cursor-pointer" style={{ borderColor: "var(--line)" }}>
            <input type="checkbox" checked={form.is_published} onChange={(e) => setForm({ ...form, is_published: e.target.checked })} className="w-5 h-5" style={{ accentColor: "var(--ink)" }} />
            <span className="text-sm font-semibold text-slate-900">Publică imediat</span>
          </label>
        </div>

        <div className="flex gap-3 mt-8">
          <button onClick={handleSubmit} disabled={saving} className="btn btn-primary flex-1">{saving ? "Se salvează..." : isEdit ? "Salvează" : "Crează cursul"}</button>
          <button onClick={onClose} disabled={saving} className="btn btn-ghost flex-1">Anulează</button>
        </div>
      </div>
    </div>
  );
}

function ModulesModal({ course, onClose, token, addToast }) {
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  useEffect(() => { fetchModules(); }, []);
  const fetchModules = async () => {
    try { setLoading(true); const res = await axios.get(`${API}/courses/${course.id}/modules?token=${token}`); setModules(res.data); }
    catch { addToast("Eroare la încărcarea lecțiilor", "error"); }
    finally { setLoading(false); }
  };
  const handleDelete = async (mod) => {
    if (!window.confirm(`Sigur ștergi lecția "${mod.title}"?`)) return;
    try { await axios.delete(`${API}/courses/modules/${mod.id}?token=${token}`); addToast("Lecție ștearsă", "success"); fetchModules(); }
    catch { addToast("Eroare la ștergere", "error"); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto" style={{ background: "rgba(15,22,34,.45)" }}>
      <div className="surface w-full max-w-3xl my-8 p-8">
        <div className="flex items-start justify-between mb-6 border-b pb-4" style={{ borderColor: "var(--line)" }}>
          <div>
            <span className="eyebrow">Lecții în curs</span>
            <h2 className="text-2xl font-extrabold text-slate-900 mt-1">{course.title}</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-xl">✕</button>
        </div>

        {showForm ? (
          <ModuleForm courseId={course.id} existing={editing} onCancel={() => { setShowForm(false); setEditing(null); }} onSaved={() => { setShowForm(false); setEditing(null); fetchModules(); }} token={token} addToast={addToast} />
        ) : (
          <>
            <div className="flex justify-between items-center mb-4">
              <p className="text-sm font-semibold text-slate-500">{modules.length} {modules.length === 1 ? "lecție" : "lecții"}</p>
              <button onClick={() => { setEditing(null); setShowForm(true); }} className="btn btn-primary">+ Lecție nouă</button>
            </div>
            {loading ? <div className="text-center py-8 text-slate-400">Se încarcă...</div>
              : modules.length === 0 ? <div className="text-center py-12 bg-slate-50 rounded-xl border text-slate-400" style={{ borderColor: "var(--line)" }}>Nicio lecție încă.</div>
              : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                  {modules.map((m, i) => (
                    <div key={m.id} className="bg-slate-50 border rounded-xl p-4 flex items-start justify-between gap-3" style={{ borderColor: "var(--line)" }}>
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <span className="w-8 h-8 rounded-lg bg-white border text-slate-700 font-bold text-sm flex items-center justify-center flex-shrink-0 metric" style={{ borderColor: "var(--line)" }}>{i + 1}</span>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-slate-900 truncate">{m.title}</p>
                          <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                            {m.duration_minutes > 0 && <span className="metric">{m.duration_minutes}m</span>}
                            {m.video_url && <span>Video</span>}
                            {m.attachment_path && <span>Atașament</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-3 flex-shrink-0">
                        <button onClick={() => { setEditing(m); setShowForm(true); }} className="text-sm font-semibold" style={{ color: "var(--accent)" }}>Editează</button>
                        <button onClick={() => handleDelete(m)} className="text-sm font-semibold text-rose-600">Șterge</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            <div className="mt-6 pt-4 border-t" style={{ borderColor: "var(--line)" }}>
              <button onClick={onClose} className="btn btn-ghost w-full">Închide</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ModuleForm({ courseId, existing, onCancel, onSaved, token, addToast }) {
  const isEdit = !!existing;
  const [form, setForm] = useState({
    title: existing?.title || "", content: existing?.content || "", video_url: existing?.video_url || "",
    duration_minutes: existing?.duration_minutes ?? 0, display_order: existing?.display_order ?? 0,
  });
  const [attachment, setAttachment] = useState(null);
  const [removeAttachment, setRemoveAttachment] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (form.title.trim().length < 2) return addToast("Titlul lecției e prea scurt", "warning");
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("title", form.title);
      if (form.content) fd.append("content", form.content);
      if (form.video_url) fd.append("video_url", form.video_url); else if (isEdit) fd.append("video_url", "");
      fd.append("duration_minutes", form.duration_minutes);
      fd.append("display_order", form.display_order);
      if (attachment) fd.append("attachment", attachment);
      if (isEdit && removeAttachment) fd.append("remove_attachment", "true");
      if (isEdit) { await axios.put(`${API}/courses/modules/${existing.id}?token=${token}`, fd, { headers: { "Content-Type": "multipart/form-data" } }); addToast("Lecție actualizată", "success"); }
      else { await axios.post(`${API}/courses/${courseId}/modules?token=${token}`, fd, { headers: { "Content-Type": "multipart/form-data" } }); addToast("Lecție adăugată", "success"); }
      onSaved();
    } catch (e) { addToast(e.response?.data?.detail || "Eroare la salvare", "error"); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-slate-900 border-b pb-3" style={{ borderColor: "var(--line)" }}>{isEdit ? "Editează lecția" : "Lecție nouă"}</h3>
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1.5">Titlu *</label>
        <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
      </div>
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1.5">Conținut (HTML / text)</label>
        <textarea rows={5} className="input resize-none" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
      </div>
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1.5">Link video (YouTube/Vimeo)</label>
        <input type="url" className="input" value={form.video_url} onChange={(e) => setForm({ ...form, video_url: e.target.value })} placeholder="https://..." />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Durată (min)</label>
          <input type="number" min={0} className="input text-center" value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: parseInt(e.target.value) || 0 })} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Ordine</label>
          <input type="number" min={0} className="input text-center" value={form.display_order} onChange={(e) => setForm({ ...form, display_order: parseInt(e.target.value) || 0 })} />
        </div>
      </div>
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1.5">Atașament (PDF, etc.)</label>
        {existing?.attachment_path && !attachment && !removeAttachment && (
          <div className="mb-2 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-800">Atașament existent</span>
            <button type="button" onClick={() => setRemoveAttachment(true)} className="text-xs text-rose-600 font-semibold">Elimină</button>
          </div>
        )}
        <input type="file" onChange={(e) => { setAttachment(e.target.files[0]); setRemoveAttachment(false); }} className="text-sm" />
      </div>
      <div className="flex gap-3 pt-4">
        <button onClick={handleSubmit} disabled={saving} className="btn btn-primary flex-1">{saving ? "Se salvează..." : isEdit ? "Salvează" : "Adaugă"}</button>
        <button onClick={onCancel} disabled={saving} className="btn btn-ghost flex-1">Anulează</button>
      </div>
    </div>
  );
}