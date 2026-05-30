import { useEffect, useState } from "react";
import { api } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";

// instanța `api` adaugă automat header-ul Authorization (vezi api/client.js).
// Rutele de learning-plans folosesc autentificare prin header, deci e exact ce trebuie.
// Pentru cursuri/examene/useri/departamente adăugăm și ?token= (folosesc query param).

export default function LearningPlans() {
  const { token } = useAuth();
  const { addToast } = useToast();

  const [plans, setPlans] = useState([]);
  const [courses, setCourses] = useState([]);
  const [exams, setExams] = useState([]);
  const [students, setStudents] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  const [planModal, setPlanModal] = useState(null);   // { mode:"create"|"edit", plan? }
  const [itemsPlan, setItemsPlan] = useState(null);    // planul deschis pt conținut
  const [assignPlan, setAssignPlan] = useState(null);  // planul deschis pt asignare

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [pRes, cRes, eRes, uRes, dRes] = await Promise.all([
        api.get("/learning-plans/"),
        api.get(`/courses/?token=${token}`),
        api.get(`/exams/?token=${token}`),
        api.get(`/users/?token=${token}`),
        api.get(`/departments/?token=${token}`),
      ]);
      setPlans(pRes.data);
      setCourses(cRes.data);
      setExams(eRes.data);
      setStudents(uRes.data.filter((u) => u.role === "student" && u.is_active));
      setDepartments(dRes.data);
    } catch {
      addToast("Eroare la încărcarea planurilor", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (plan) => {
    if (!window.confirm(`Sigur ștergi planul "${plan.title}"?`)) return;
    try {
      await api.delete(`/learning-plans/${plan.id}`);
      addToast("Plan șters", "success");
      fetchAll();
    } catch (e) {
      addToast(e.response?.data?.detail || "Eroare la ștergere", "error");
    }
  };

  const deptName = (id) => departments.find((d) => d.id === id)?.name;

  if (loading)
    return <div className="min-h-screen bg-gray-50 flex justify-center items-center"><div className="w-10 h-10 border-4 border-cyan-200 border-t-cyan-500 rounded-full animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-12 animate-in fade-in">
      <div className="bg-white border-b border-gray-100 px-6 py-10 relative overflow-hidden mb-8">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-50/50 via-white to-amber-50/30 pointer-events-none" />
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <p className="text-xs font-bold text-cyan-600 uppercase tracking-widest mb-1">Trasee de Învățare</p>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Planuri de Învățare</h1>
            <p className="text-sm text-gray-500 mt-1 font-medium">Construiește un traseu (cursuri + examene) și asignează-l studenților sau unui departament.</p>
          </div>
          <button onClick={() => setPlanModal({ mode: "create" })} className="px-6 py-3.5 rounded-xl bg-gray-900 hover:bg-gray-800 text-white text-sm font-extrabold transition-all shadow-md shadow-gray-900/10 flex items-center gap-2">
            <span className="text-lg">+</span> Plan Nou
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6">
        {plans.length === 0 ? (
          <div className="bg-white border border-gray-100 rounded-3xl p-16 text-center shadow-sm">
            <div className="text-6xl mb-4 opacity-50">🗺️</div>
            <p className="text-gray-900 font-bold text-xl mb-2">Niciun plan de învățare</p>
            <p className="text-gray-500 mb-6">Apasă „Plan Nou" pentru a crea primul traseu.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <div key={plan.id} className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm hover:shadow-xl hover:shadow-cyan-100/50 hover:-translate-y-1 transition-all duration-300 flex flex-col h-full">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-50 to-blue-50 border border-cyan-100 flex items-center justify-center text-xl shadow-sm">🗺️</div>
                  <div className="flex flex-col items-end gap-1.5">
                    <span className={`px-2.5 py-1 text-[10px] uppercase tracking-widest font-extrabold rounded-lg border ${plan.is_published ? "bg-green-50 border-green-200 text-green-700" : "bg-gray-50 border-gray-200 text-gray-500"}`}>
                      {plan.is_published ? "Publicat" : "Ciornă"}
                    </span>
                    {plan.is_mandatory && (
                      <span className="px-2.5 py-1 text-[10px] uppercase tracking-widest font-extrabold rounded-lg border bg-amber-50 border-amber-200 text-amber-700">Obligatoriu</span>
                    )}
                  </div>
                </div>
                <h3 className="text-lg font-extrabold text-gray-900 mb-2 leading-snug line-clamp-2">{plan.title}</h3>

                {plan.target_department_id && (
                  <span className="self-start mb-3 px-2.5 py-1 text-[10px] uppercase tracking-widest font-extrabold rounded-lg border bg-blue-50 border-blue-200 text-blue-700">
                    🏢 {deptName(plan.target_department_id) || "Departament"}
                  </span>
                )}

                <p className="text-sm font-medium text-gray-500 mb-5 line-clamp-2 flex-1">{plan.description || "Acest plan nu are o descriere."}</p>

                <div className="grid grid-cols-2 gap-2 mb-2">
                  <button onClick={() => setItemsPlan(plan)} className="py-2.5 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-500 hover:text-white font-extrabold text-sm transition-colors border border-purple-100 hover:border-transparent">📋 Conținut</button>
                  <button onClick={() => setAssignPlan(plan)} className="py-2.5 rounded-xl bg-cyan-50 text-cyan-700 hover:bg-cyan-500 hover:text-white font-extrabold text-sm transition-colors border border-cyan-100 hover:border-transparent">👥 Asignează</button>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setPlanModal({ mode: "edit", plan })} className="flex-1 py-2.5 rounded-xl bg-gray-50 text-gray-700 hover:bg-gray-200 font-extrabold text-sm transition-colors border border-gray-100">Editează</button>
                  <button onClick={() => handleDelete(plan)} className="px-3 py-2.5 rounded-xl bg-red-50 text-red-600 hover:bg-red-500 hover:text-white border border-red-100 hover:border-transparent transition-colors font-bold text-sm">🗑️</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {planModal && (
        <PlanModal
          mode={planModal.mode}
          plan={planModal.plan}
          departments={departments}
          addToast={addToast}
          onClose={() => setPlanModal(null)}
          onSaved={() => { setPlanModal(null); fetchAll(); }}
        />
      )}

      {itemsPlan && (
        <ItemsModal
          plan={itemsPlan}
          courses={courses}
          exams={exams}
          addToast={addToast}
          onClose={() => setItemsPlan(null)}
        />
      )}

      {assignPlan && (
        <AssignModal
          plan={assignPlan}
          students={students}
          addToast={addToast}
          onClose={() => setAssignPlan(null)}
        />
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
//  MODAL: Creează / Editează plan
// ──────────────────────────────────────────────────────────────
function PlanModal({ mode, plan, departments = [], addToast, onClose, onSaved }) {
  const isEdit = mode === "edit";
  const [form, setForm] = useState({
    title: plan?.title || "",
    description: plan?.description || "",
    target_department_id: plan?.target_department_id ? String(plan.target_department_id) : "",
    is_mandatory: plan?.is_mandatory ?? false,
    is_published: plan?.is_published ?? false,
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (form.title.trim().length < 3) return addToast("Titlul trebuie să aibă minim 3 caractere", "warning");
    setSaving(true);
    try {
      const payload = {
        ...form,
        target_department_id: form.target_department_id ? parseInt(form.target_department_id) : null,
      };
      if (isEdit) {
        await api.put(`/learning-plans/${plan.id}`, payload);
        addToast("Plan actualizat", "success");
      } else {
        await api.post("/learning-plans/", payload);
        addToast("Plan creat", "success");
      }
      onSaved();
    } catch (e) {
      addToast(e.response?.data?.detail || "Eroare la salvare", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-gray-100 rounded-3xl p-8 max-w-lg w-full shadow-2xl animate-in zoom-in-95">
        <h2 className="text-2xl font-extrabold text-gray-900 mb-2">{isEdit ? "Editează Planul" : "Plan Nou"}</h2>
        <p className="text-sm font-medium text-gray-500 mb-6">Cursurile și examenele le adaugi după, din „Conținut".</p>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Titlu *</label>
            <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="ex: Onboarding Angajați Noi" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-400 transition-all" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Descriere (opțional)</label>
            <textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-400 transition-all resize-none" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Departament țintă</label>
            <select
              value={form.target_department_id}
              onChange={(e) => setForm({ ...form, target_department_id: e.target.value })}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-400 transition-all"
            >
              <option value="">— Niciunul (doar asignare manuală) —</option>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <p className="text-xs text-gray-400 mt-1">Cu departament ales + plan publicat, toți studenții din acel departament îl primesc automat.</p>
          </div>
          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
            <input type="checkbox" id="lp_mand" checked={form.is_mandatory} onChange={(e) => setForm({ ...form, is_mandatory: e.target.checked })} className="w-5 h-5 accent-cyan-500" />
            <label htmlFor="lp_mand" className="text-sm font-bold text-gray-900 cursor-pointer">Plan obligatoriu</label>
          </div>
          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
            <input type="checkbox" id="lp_pub" checked={form.is_published} onChange={(e) => setForm({ ...form, is_published: e.target.checked })} className="w-5 h-5 accent-cyan-500" />
            <label htmlFor="lp_pub" className="text-sm font-bold text-gray-900 cursor-pointer">Publicat (vizibil studenților)</label>
          </div>
        </div>

        <div className="flex gap-4 mt-8">
          <button onClick={handleSave} disabled={saving} className="flex-1 py-3.5 rounded-xl bg-gray-900 hover:bg-gray-800 disabled:bg-gray-400 text-white text-sm font-extrabold transition-all shadow-md">{saving ? "Se salvează..." : isEdit ? "Salvează" : "Crează"}</button>
          <button onClick={onClose} disabled={saving} className="flex-1 py-3.5 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-extrabold transition-all">Anulează</button>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
//  MODAL: Conținut plan (items: cursuri + examene)
// ──────────────────────────────────────────────────────────────
function ItemsModal({ plan, courses, exams, addToast, onClose }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addType, setAddType] = useState("course"); // course | exam
  const [selectedId, setSelectedId] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => { fetchItems(); }, []);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/learning-plans/${plan.id}`);
      setItems(res.data.items || []);
    } catch {
      addToast("Eroare la încărcarea conținutului", "error");
    } finally {
      setLoading(false);
    }
  };

  const courseName = (id) => courses.find((c) => c.id === id)?.title || `Curs #${id}`;
  const examName = (id) => exams.find((e) => e.id === id)?.title || `Examen #${id}`;

  const handleAdd = async () => {
    if (!selectedId) return addToast("Alege un curs sau examen", "warning");
    setAdding(true);
    try {
      const payload = {
        display_order: items.length,
        is_required: true,
        ...(addType === "course" ? { course_id: parseInt(selectedId) } : { exam_id: parseInt(selectedId) }),
      };
      await api.post(`/learning-plans/${plan.id}/items`, payload);
      addToast("Adăugat în plan", "success");
      setSelectedId("");
      fetchItems();
    } catch (e) {
      addToast(e.response?.data?.detail || "Eroare la adăugare", "error");
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (item) => {
    try {
      await api.delete(`/learning-plans/${plan.id}/items/${item.id}`);
      addToast("Eliminat din plan", "success");
      fetchItems();
    } catch (e) {
      addToast(e.response?.data?.detail || "Eroare la eliminare", "error");
    }
  };

  const options = addType === "course" ? courses : exams;

  return (
    <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white border border-gray-100 rounded-3xl p-8 max-w-2xl w-full my-8 shadow-2xl animate-in zoom-in-95">
        <div className="flex items-start justify-between mb-6 border-b border-gray-100 pb-4">
          <div>
            <p className="text-xs font-bold text-purple-600 uppercase tracking-widest mb-1">Conținut Plan</p>
            <h2 className="text-2xl font-extrabold text-gray-900">{plan.title}</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">✕</button>
        </div>

        {/* Adăugare item */}
        <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 mb-5">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Adaugă în traseu</p>
          <div className="flex flex-col sm:flex-row gap-2">
            <select value={addType} onChange={(e) => { setAddType(e.target.value); setSelectedId(""); }} className="bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-cyan-400">
              <option value="course">Curs</option>
              <option value="exam">Examen</option>
            </select>
            <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)} className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-cyan-400">
              <option value="">— alege {addType === "course" ? "un curs" : "un examen"} —</option>
              {options.map((o) => <option key={o.id} value={o.id}>{o.title}</option>)}
            </select>
            <button onClick={handleAdd} disabled={adding || !selectedId} className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-600 disabled:bg-gray-300 text-white text-sm font-bold transition shadow-md shadow-cyan-500/20">+ Adaugă</button>
          </div>
        </div>

        {/* Lista items */}
        {loading ? (
          <div className="text-center py-8 text-gray-500">Se încarcă...</div>
        ) : items.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-2xl border border-gray-100 text-gray-500">Traseul e gol. Adaugă cursuri sau examene.</div>
        ) : (
          <div className="space-y-2 max-h-[45vh] overflow-y-auto pr-2">
            {items.map((item, i) => {
              const isCourse = item.course_id != null;
              return (
                <div key={item.id} className="bg-gray-50 border border-gray-100 rounded-2xl p-4 flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-white border border-gray-200 text-gray-700 font-black text-sm flex items-center justify-center flex-shrink-0">{i + 1}</span>
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border flex-shrink-0 ${isCourse ? "bg-cyan-50 border-cyan-100 text-cyan-700" : "bg-purple-50 border-purple-100 text-purple-700"}`}>
                    {isCourse ? "📚 Curs" : "📝 Examen"}
                  </span>
                  <p className="font-bold text-gray-900 truncate flex-1">{isCourse ? courseName(item.course_id) : examName(item.exam_id)}</p>
                  <button onClick={() => handleRemove(item)} className="text-red-500 hover:text-red-700 font-bold text-sm flex-shrink-0">Elimină</button>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-gray-100">
          <button onClick={onClose} className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-extrabold rounded-xl text-sm transition">Închide</button>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
//  MODAL: Asignare la studenți
// ──────────────────────────────────────────────────────────────
function AssignModal({ plan, students, addToast, onClose }) {
  const [selected, setSelected] = useState([]);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  const toggle = (id) => setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const filtered = students.filter((s) =>
    s.full_name.toLowerCase().includes(search.toLowerCase()) || s.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleAssign = async () => {
    if (selected.length === 0) return addToast("Alege cel puțin un student", "warning");
    setSaving(true);
    try {
      await api.post(`/learning-plans/${plan.id}/assign`, {
        learning_plan_id: plan.id,
        student_ids: selected,
      });
      addToast(`Plan asignat la ${selected.length} ${selected.length === 1 ? "student" : "studenți"}`, "success");
      onClose();
    } catch (e) {
      addToast(e.response?.data?.detail || "Eroare la asignare", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white border border-gray-100 rounded-3xl p-8 max-w-lg w-full my-8 shadow-2xl animate-in zoom-in-95">
        <div className="flex items-start justify-between mb-6 border-b border-gray-100 pb-4">
          <div>
            <p className="text-xs font-bold text-cyan-600 uppercase tracking-widest mb-1">Asignare Plan</p>
            <h2 className="text-2xl font-extrabold text-gray-900">{plan.title}</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">✕</button>
        </div>

        <input
          type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Caută student după nume sau email..."
          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm mb-4 focus:outline-none focus:border-cyan-400"
        />

        {students.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-2xl border border-gray-100 text-gray-500">Nu există studenți disponibili.</div>
        ) : (
          <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-2">
            {filtered.map((s) => (
              <label key={s.id} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition ${selected.includes(s.id) ? "bg-cyan-50 border-cyan-200" : "bg-gray-50 border-gray-100 hover:border-cyan-200"}`}>
                <input type="checkbox" checked={selected.includes(s.id)} onChange={() => toggle(s.id)} className="w-5 h-5 accent-cyan-500" />
                <div className="min-w-0">
                  <p className="font-bold text-gray-900 text-sm truncate">{s.full_name}</p>
                  <p className="text-xs text-gray-500 truncate">{s.email}</p>
                </div>
              </label>
            ))}
          </div>
        )}

        <div className="flex gap-4 mt-6">
          <button onClick={handleAssign} disabled={saving || selected.length === 0} className="flex-1 py-3.5 rounded-xl bg-gray-900 hover:bg-gray-800 disabled:bg-gray-400 text-white text-sm font-extrabold transition-all shadow-md">
            {saving ? "Se asignează..." : `Asignează (${selected.length})`}
          </button>
          <button onClick={onClose} disabled={saving} className="flex-1 py-3.5 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-extrabold transition-all">Anulează</button>
        </div>
      </div>
    </div>
  );
}