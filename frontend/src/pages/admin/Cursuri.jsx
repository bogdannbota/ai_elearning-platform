import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";
import { useToast } from "../../context/ToastContext";

const API = "http://127.0.0.1:8000";

const DIFFICULTY_OPTIONS = [
  { value: "beginner",     label: "Începător",   color: "bg-green-50 text-green-700 border-green-100" },
  { value: "intermediate", label: "Intermediar", color: "bg-cyan-50 text-cyan-700 border-cyan-100"    },
  { value: "advanced",     label: "Avansat",     color: "bg-amber-50 text-amber-700 border-amber-100" },
  { value: "expert",       label: "Expert",      color: "bg-red-50 text-red-700 border-red-100"       },
];

const diffLabel = (val) => DIFFICULTY_OPTIONS.find(d => d.value === val) || DIFFICULTY_OPTIONS[0];

// ──────────────────────────────────────────────────────────────
//  PAGINA PRINCIPALĂ
// ──────────────────────────────────────────────────────────────
export default function CursuriAdmin() {
  const { token, user } = useAuth();
  const isAdmin = user?.role === "admin";
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [courses, setCourses]         = useState([]);
  const [categories, setCategories]   = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading]         = useState(true);

  const [showCourseModal, setShowCourseModal] = useState(false);
  const [editingCourse, setEditingCourse]     = useState(null);

  const [showModulesModal, setShowModulesModal] = useState(false);
  const [modulesCourse, setModulesCourse]       = useState(null);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [cRes, catRes, dRes] = await Promise.all([
        axios.get(`${API}/courses/?token=${token}`),
        axios.get(`${API}/course-categories/?token=${token}`),
        axios.get(`${API}/departments/?token=${token}`),
      ]);
      setCourses(cRes.data);
      setCategories(catRes.data);
      setDepartments(dRes.data);
    } catch (err) {
      addToast("Eroare la încărcarea datelor", "error");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (course) => {
    if (!window.confirm(`Sigur ștergi cursul "${course.title}"?`)) return;
    try {
      await axios.delete(`${API}/courses/${course.id}?token=${token}`);
      addToast("Curs șters", "success");
      fetchAll();
    } catch (e) {
      addToast(e.response?.data?.detail || "Eroare la ștergere", "error");
    }
  };

  const togglePublish = async (course) => {
    try {
      const endpoint = course.is_published ? "unpublish" : "publish";
      await axios.post(`${API}/courses/${course.id}/${endpoint}?token=${token}`);
      addToast(course.is_published ? "Curs retras în ciornă" : "Curs publicat!", "success");
      fetchAll();
    } catch {
      addToast("Eroare la schimbarea stării", "error");
    }
  };

  const deptName = (id) => departments.find((d) => d.id === id)?.name;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-cyan-200 border-t-cyan-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-12 animate-in fade-in duration-500">

      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-10 relative overflow-hidden mb-8">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-50/50 to-transparent pointer-events-none" />
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <p className="text-xs font-bold text-cyan-600 uppercase tracking-widest mb-1">Panou de Control</p>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Gestionare Cursuri</h1>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => navigate("/admin/categorii")}
              className="px-5 py-3 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 font-bold rounded-xl transition-all text-sm"
            >
              📁 Categorii
            </button>
            <button
              onClick={() => { setEditingCourse(null); setShowCourseModal(true); }}
              className="px-6 py-3 bg-gray-900 hover:bg-gray-800 text-white font-extrabold rounded-xl transition-all shadow-md shadow-gray-900/10 flex items-center gap-2 text-sm"
            >
              <span className="text-lg">+</span> Curs Nou
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6">

        {courses.length === 0 ? (
          <div className="bg-white border border-gray-100 rounded-3xl p-16 text-center shadow-sm">
            <div className="text-6xl mb-4 opacity-50">📚</div>
            <p className="text-gray-900 font-bold text-xl mb-2">Niciun curs în catalog</p>
            <p className="text-gray-500 mb-6">Apasă "Curs Nou" pentru a începe.</p>
          </div>
        ) : (
          <div className="bg-white border border-gray-100 rounded-3xl shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
              <h2 className="text-lg font-extrabold text-gray-900">Catalogul de Cursuri</h2>
              <span className="text-xs font-bold text-cyan-700 bg-cyan-50 px-3 py-1 rounded-lg">
                {courses.length} cursuri
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-500 uppercase tracking-wider bg-white border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-4 font-bold">Curs</th>
                    <th className="px-6 py-4 font-bold">Categorie</th>
                    <th className="px-6 py-4 font-bold">Departament</th>
                    <th className="px-6 py-4 font-bold">Dificultate</th>
                    <th className="px-6 py-4 font-bold text-center">Durată</th>
                    <th className="px-6 py-4 font-bold text-center">Status</th>
                    <th className="px-6 py-4 font-bold text-right">Acțiuni</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {courses.map((c) => {
                    const diff = diffLabel(c.difficulty_level);
                    const cat = categories.find(x => x.id === c.category_id);
                    return (
                      <tr key={c.id} className="hover:bg-cyan-50/30 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            {c.cover_image_path ? (
                              <img
                                src={`${API}/${c.cover_image_path}`}
                                alt=""
                                className="w-12 h-12 rounded-xl object-cover border border-gray-100"
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-100 to-amber-100 flex items-center justify-center text-lg">
                                📚
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="font-bold text-gray-900 truncate max-w-[260px]">{c.title}</p>
                              <p className="text-xs text-gray-500 truncate max-w-[260px] mt-0.5">
                                {c.short_description || c.description || "Fără descriere"}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {cat ? (
                            <span className="bg-purple-50 text-purple-700 px-2.5 py-1 rounded-lg text-xs font-bold border border-purple-100">
                              {cat.name}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-xs italic">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {c.department_id ? (
                            <span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg text-xs font-bold border border-blue-100">
                              🏢 {deptName(c.department_id) || `#${c.department_id}`}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-xs italic">Toate</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${diff.color}`}>
                            {diff.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center text-gray-600 font-medium">
                          {c.duration_minutes > 0 ? `${c.duration_minutes}m` : "—"}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                            c.is_published
                              ? "bg-green-50 text-green-700"
                              : "bg-amber-50 text-amber-700"
                          }`}>
                            {c.is_published ? "✓ Publicat" : "📝 Ciornă"}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-end gap-3 items-center">
                            <button
                              onClick={() => { setModulesCourse(c); setShowModulesModal(true); }}
                              className="text-purple-600 hover:text-purple-800 font-bold text-xs transition-colors"
                              title="Gestionează lecții"
                            >
                              📋 Lecții
                            </button>
                            <button
                              onClick={() => togglePublish(c)}
                              className={`font-bold text-xs transition-colors ${
                                c.is_published
                                  ? "text-amber-600 hover:text-amber-800"
                                  : "text-green-600 hover:text-green-800"
                              }`}
                            >
                              {c.is_published ? "Ascunde" : "Publică"}
                            </button>
                            <button
                              onClick={() => { setEditingCourse(c); setShowCourseModal(true); }}
                              className="text-cyan-600 hover:text-cyan-800 font-bold text-xs transition-colors"
                            >
                              Editează
                            </button>
                            {isAdmin && (
                              <button
                                onClick={() => handleDelete(c)}
                                className="text-red-500 hover:text-red-700 font-bold text-xs transition-colors"
                              >
                                Șterge
                              </button>
                            )}
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

      {/* Modal curs */}
      {showCourseModal && (
        <CourseModal
          existing={editingCourse}
          categories={categories}
          departments={departments}
          onClose={() => { setShowCourseModal(false); setEditingCourse(null); }}
          onSaved={() => { setShowCourseModal(false); setEditingCourse(null); fetchAll(); }}
          token={token}
          addToast={addToast}
        />
      )}

      {/* Modal module (lecții în curs) */}
      {showModulesModal && modulesCourse && (
        <ModulesModal
          course={modulesCourse}
          onClose={() => { setShowModulesModal(false); setModulesCourse(null); }}
          token={token}
          addToast={addToast}
        />
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
//  MODAL CURS (create/edit)
// ──────────────────────────────────────────────────────────────
function CourseModal({ existing, categories, departments, onClose, onSaved, token, addToast }) {
  const isEdit = !!existing;

  const [form, setForm] = useState({
    title:            existing?.title              || "",
    short_description: existing?.short_description || "",
    description:      existing?.description        || "",
    category_id:      existing?.category_id        || "",
    difficulty_level: existing?.difficulty_level   || "beginner",
    duration_minutes: existing?.duration_minutes   ?? 0,
    is_published:     existing?.is_published       ?? false,
    display_order:    existing?.display_order      ?? 0,
    department_id:    existing?.department_id ? String(existing.department_id) : "",
  });

  const [file, setFile]               = useState(null);
  const [coverImage, setCoverImage]   = useState(null);
  const [coverPreview, setCoverPreview] = useState(
    existing?.cover_image_path ? `${API}/${existing.cover_image_path}` : null
  );
  const [saving, setSaving] = useState(false);

  const handleCoverChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setCoverImage(f);
    const reader = new FileReader();
    reader.onload = (ev) => setCoverPreview(ev.target.result);
    reader.readAsDataURL(f);
  };

  const handleSubmit = async () => {
    if (form.title.trim().length < 3) {
      return addToast("Titlul trebuie să aibă minim 3 caractere", "warning");
    }

    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("title", form.title);
      if (form.short_description) fd.append("short_description", form.short_description);
      if (form.description)       fd.append("description", form.description);
      if (form.category_id)       fd.append("category_id", form.category_id);
      fd.append("difficulty_level", form.difficulty_level);
      fd.append("duration_minutes", form.duration_minutes);
      fd.append("is_published",     form.is_published);
      fd.append("display_order",    form.display_order);

      // Variant A: trimitem mereu departamentul (creare ȘI editare).
      // Gol => curs "general", vizibil tuturor; altfel mapat pe departament.
      fd.append("department_ids", form.department_id);

      if (file)       fd.append("file", file);
      if (coverImage) fd.append("cover_image", coverImage);

      if (isEdit) {
        await axios.put(`${API}/courses/${existing.id}?token=${token}`, fd, {
          headers: { "Content-Type": "multipart/form-data" }
        });
        addToast("Curs actualizat!", "success");
      } else {
        await axios.post(`${API}/courses/?token=${token}`, fd, {
          headers: { "Content-Type": "multipart/form-data" }
        });
        addToast("Curs creat!", "success");
      }
      onSaved();
    } catch (e) {
      addToast(e.response?.data?.detail || "Eroare la salvare", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white border border-gray-100 rounded-3xl p-8 max-w-3xl w-full my-8 shadow-2xl animate-in zoom-in-95">

        <h2 className="text-2xl font-extrabold text-gray-900 mb-2">
          {isEdit ? "Editează Cursul" : "Crează un Curs Nou"}
        </h2>
        <p className="text-sm font-medium text-gray-500 mb-6 border-b border-gray-100 pb-4">
          Completează informațiile de bază. Lecțiile le adaugi separat din tabel.
        </p>

        {/* Cover image */}
        <div className="mb-6">
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
            Imagine Cover (Opțional)
          </label>
          <div className="flex items-center gap-4">
            {coverPreview ? (
              <img src={coverPreview} alt="cover" className="w-32 h-20 rounded-xl object-cover border border-gray-200" />
            ) : (
              <div className="w-32 h-20 rounded-xl bg-gray-50 border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-400 text-2xl">
                🖼️
              </div>
            )}
            <div>
              <input
                type="file"
                accept="image/*"
                onChange={handleCoverChange}
                className="hidden"
                id="cover-upload"
              />
              <label
                htmlFor="cover-upload"
                className="cursor-pointer px-4 py-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 transition inline-block"
              >
                {coverPreview ? "Schimbă imagine" : "Încarcă imagine"}
              </label>
              {coverPreview && (
                <button
                  type="button"
                  onClick={() => { setCoverImage(null); setCoverPreview(null); }}
                  className="ml-2 text-xs text-red-500 hover:underline"
                >
                  Elimină
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Titlu */}
        <div className="mb-4">
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
            Titlu Curs *
          </label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-100 transition-all"
            placeholder="ex: Introducere în Python"
          />
        </div>

        {/* Short description */}
        <div className="mb-4">
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
            Descriere Scurtă
          </label>
          <input
            type="text"
            value={form.short_description}
            onChange={(e) => setForm({ ...form, short_description: e.target.value })}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-cyan-400 transition-all"
            placeholder="O frază care apare în catalog"
          />
        </div>

        {/* Descriere lungă */}
        <div className="mb-4">
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
            Descriere Completă
          </label>
          <textarea
            rows={4}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-100 transition-all resize-none"
          />
        </div>

        {/* Grid: categorie + dificultate */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
              Categorie
            </label>
            <select
              value={form.category_id}
              onChange={(e) => setForm({ ...form, category_id: e.target.value })}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-cyan-400 transition-all"
            >
              <option value="">— Fără categorie —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            {categories.length === 0 && (
              <p className="text-xs text-amber-600 mt-1">Nu există categorii. Mergi la "📁 Categorii".</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
              Dificultate *
            </label>
            <select
              value={form.difficulty_level}
              onChange={(e) => setForm({ ...form, difficulty_level: e.target.value })}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-cyan-400 transition-all"
            >
              {DIFFICULTY_OPTIONS.map((d) => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Grid: durată + ordine + departament (creare ȘI editare) */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
              Durată (min)
            </label>
            <input
              type="number"
              min={0}
              value={form.duration_minutes}
              onChange={(e) => setForm({ ...form, duration_minutes: parseInt(e.target.value) || 0 })}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-cyan-400 transition-all text-center"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
              Ordine
            </label>
            <input
              type="number"
              min={0}
              value={form.display_order}
              onChange={(e) => setForm({ ...form, display_order: parseInt(e.target.value) || 0 })}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-cyan-400 transition-all text-center"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
              Departament
            </label>
            <select
              value={form.department_id}
              onChange={(e) => setForm({ ...form, department_id: e.target.value })}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-cyan-400 transition-all"
            >
              <option value="">— Toate (general) —</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* PDF curs */}
        <div className="mb-6">
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
            Material PDF (Opțional)
          </label>
          <div className="border-2 border-dashed border-gray-200 bg-gray-50 rounded-xl p-4 text-center hover:border-cyan-400 transition-all">
            <input
              id="pdfInput"
              type="file"
              accept=".pdf"
              onChange={(e) => setFile(e.target.files[0])}
              className="hidden"
            />
            <label htmlFor="pdfInput" className="cursor-pointer block">
              {file ? (
                <span className="text-sm font-bold text-cyan-700">📄 {file.name}</span>
              ) : existing?.file_path ? (
                <span className="text-sm font-medium text-gray-500">PDF existent · click pentru a-l schimba</span>
              ) : (
                <span className="text-sm text-gray-500">Click pentru a încărca un PDF</span>
              )}
            </label>
          </div>
        </div>

        {/* Toggle publicat */}
        <div className="mb-8 flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
          <input
            type="checkbox"
            id="is_published"
            checked={form.is_published}
            onChange={(e) => setForm({ ...form, is_published: e.target.checked })}
            className="w-5 h-5 accent-cyan-500"
          />
          <label htmlFor="is_published" className="text-sm font-bold text-gray-900 cursor-pointer flex-1">
            Publică imediat
            <span className="text-xs font-medium text-gray-500 block mt-0.5">
              Cursul va fi vizibil studenților după salvare.
            </span>
          </label>
        </div>

        <div className="flex gap-4">
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex-1 py-3.5 rounded-xl bg-gray-900 hover:bg-gray-800 disabled:bg-gray-400 text-white text-sm font-extrabold transition-all shadow-md shadow-gray-900/10"
          >
            {saving ? "Se salvează..." : isEdit ? "Salvează Modificările" : "Crează Cursul"}
          </button>
          <button
            onClick={onClose}
            disabled={saving}
            className="flex-1 py-3.5 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-extrabold transition-all"
          >
            Anulează
          </button>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
//  MODAL MODULE / LECȚII
// ──────────────────────────────────────────────────────────────
function ModulesModal({ course, onClose, token, addToast }) {
  const [modules, setModules]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [showForm, setShowForm]     = useState(false);
  const [editing, setEditing]       = useState(null);

  useEffect(() => { fetchModules(); }, []);

  const fetchModules = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API}/courses/${course.id}/modules?token=${token}`);
      setModules(res.data);
    } catch {
      addToast("Eroare la încărcarea lecțiilor", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (mod) => {
    if (!window.confirm(`Sigur ștergi lecția "${mod.title}"?`)) return;
    try {
      await axios.delete(`${API}/courses/modules/${mod.id}?token=${token}`);
      addToast("Lecție ștearsă", "success");
      fetchModules();
    } catch {
      addToast("Eroare la ștergere", "error");
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white border border-gray-100 rounded-3xl p-8 max-w-3xl w-full my-8 shadow-2xl animate-in zoom-in-95">

        <div className="flex items-start justify-between mb-6 border-b border-gray-100 pb-4">
          <div>
            <p className="text-xs font-bold text-purple-600 uppercase tracking-widest mb-1">Lecții în Curs</p>
            <h2 className="text-2xl font-extrabold text-gray-900">{course.title}</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">✕</button>
        </div>

        {showForm ? (
          <ModuleForm
            courseId={course.id}
            existing={editing}
            onCancel={() => { setShowForm(false); setEditing(null); }}
            onSaved={() => { setShowForm(false); setEditing(null); fetchModules(); }}
            token={token}
            addToast={addToast}
          />
        ) : (
          <>
            <div className="flex justify-between items-center mb-4">
              <p className="text-sm font-bold text-gray-500">
                {modules.length} {modules.length === 1 ? "lecție" : "lecții"}
              </p>
              <button
                onClick={() => { setEditing(null); setShowForm(true); }}
                className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-xl text-sm font-bold shadow-md shadow-cyan-500/20"
              >
                + Lecție nouă
              </button>
            </div>

            {loading ? (
              <div className="text-center py-8 text-gray-500">Se încarcă...</div>
            ) : modules.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-2xl border border-gray-100">
                <p className="text-gray-500 font-medium">Nicio lecție încă.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                {modules.map((m, i) => (
                  <div key={m.id} className="bg-gray-50 border border-gray-100 rounded-2xl p-4 hover:bg-white hover:border-cyan-100 transition-all group">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <span className="w-8 h-8 rounded-lg bg-white border border-gray-200 text-gray-700 font-black text-sm flex items-center justify-center flex-shrink-0">
                          {i + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-gray-900 truncate">{m.title}</p>
                          <div className="flex items-center gap-3 mt-1 flex-wrap">
                            {m.duration_minutes > 0 && (
                              <span className="text-xs text-gray-500">⏱ {m.duration_minutes}m</span>
                            )}
                            {m.video_url && (
                              <span className="text-xs text-blue-600 font-semibold">🎥 Video</span>
                            )}
                            {m.attachment_path && (
                              <span className="text-xs text-amber-600 font-semibold">📎 Atașament</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => { setEditing(m); setShowForm(true); }}
                          className="text-cyan-600 hover:text-cyan-800 font-bold text-xs"
                        >
                          Editează
                        </button>
                        <button
                          onClick={() => handleDelete(m)}
                          className="text-red-500 hover:text-red-700 font-bold text-xs"
                        >
                          Șterge
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-6 pt-4 border-t border-gray-100">
              <button
                onClick={onClose}
                className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-extrabold rounded-xl text-sm transition"
              >
                Închide
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
//  FORMULAR LECȚIE (intern în ModulesModal)
// ──────────────────────────────────────────────────────────────
function ModuleForm({ courseId, existing, onCancel, onSaved, token, addToast }) {
  const isEdit = !!existing;
  const [form, setForm] = useState({
    title:            existing?.title              || "",
    content:          existing?.content            || "",
    video_url:        existing?.video_url          || "",
    duration_minutes: existing?.duration_minutes   ?? 0,
    display_order:    existing?.display_order      ?? 0,
  });
  const [attachment, setAttachment]         = useState(null);
  const [removeAttachment, setRemoveAttachment] = useState(false);
  const [saving, setSaving]                 = useState(false);

  const handleSubmit = async () => {
    if (form.title.trim().length < 2) {
      return addToast("Titlul lecției e prea scurt", "warning");
    }

    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("title", form.title);
      if (form.content)   fd.append("content", form.content);
      if (form.video_url) fd.append("video_url", form.video_url);
      else if (isEdit)    fd.append("video_url", "");  // permite ștergerea video_url
      fd.append("duration_minutes", form.duration_minutes);
      fd.append("display_order",    form.display_order);

      if (attachment) fd.append("attachment", attachment);
      if (isEdit && removeAttachment) fd.append("remove_attachment", "true");

      if (isEdit) {
        await axios.put(`${API}/courses/modules/${existing.id}?token=${token}`, fd, {
          headers: { "Content-Type": "multipart/form-data" }
        });
        addToast("Lecție actualizată", "success");
      } else {
        await axios.post(`${API}/courses/${courseId}/modules?token=${token}`, fd, {
          headers: { "Content-Type": "multipart/form-data" }
        });
        addToast("Lecție adăugată", "success");
      }
      onSaved();
    } catch (e) {
      addToast(e.response?.data?.detail || "Eroare la salvare", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-extrabold text-gray-900 border-b border-gray-100 pb-3 mb-4">
        {isEdit ? "Editează Lecția" : "Adaugă Lecție Nouă"}
      </h3>

      <div>
        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Titlu *</label>
        <input
          type="text"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-400 transition-all"
        />
      </div>

      <div>
        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Conținut (HTML / Text)</label>
        <textarea
          rows={5}
          value={form.content}
          onChange={(e) => setForm({ ...form, content: e.target.value })}
          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-400 transition-all resize-none"
          placeholder="Lecția poate conține text, HTML, embed-uri..."
        />
      </div>

      <div>
        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Link Video (YouTube/Vimeo)</label>
        <input
          type="url"
          value={form.video_url}
          onChange={(e) => setForm({ ...form, video_url: e.target.value })}
          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-400 transition-all"
          placeholder="https://..."
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Durată (min)</label>
          <input
            type="number"
            min={0}
            value={form.duration_minutes}
            onChange={(e) => setForm({ ...form, duration_minutes: parseInt(e.target.value) || 0 })}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-400 transition-all text-center"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Ordine</label>
          <input
            type="number"
            min={0}
            value={form.display_order}
            onChange={(e) => setForm({ ...form, display_order: parseInt(e.target.value) || 0 })}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-400 transition-all text-center"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
          Atașament (PDF, etc.)
        </label>
        {existing?.attachment_path && !attachment && !removeAttachment && (
          <div className="mb-2 p-3 bg-amber-50 border border-amber-100 rounded-xl flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-800">📎 Atașament existent</span>
            <button
              type="button"
              onClick={() => setRemoveAttachment(true)}
              className="text-xs text-red-600 font-bold hover:underline"
            >
              Elimină
            </button>
          </div>
        )}
        <input
          type="file"
          onChange={(e) => { setAttachment(e.target.files[0]); setRemoveAttachment(false); }}
          className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-gray-50 file:text-gray-700 hover:file:bg-gray-100"
        />
      </div>

      <div className="flex gap-3 pt-4">
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="flex-1 py-3 bg-cyan-500 hover:bg-cyan-600 disabled:bg-gray-400 text-white text-sm font-extrabold rounded-xl shadow-md shadow-cyan-500/20 transition"
        >
          {saving ? "Se salvează..." : isEdit ? "Salvează" : "Adaugă"}
        </button>
        <button
          onClick={onCancel}
          disabled={saving}
          className="flex-1 py-3 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-extrabold rounded-xl transition"
        >
          Anulează
        </button>
      </div>
    </div>
  );
}