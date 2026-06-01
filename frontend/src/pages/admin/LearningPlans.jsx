import { useEffect, useState } from "react";
import { api } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { deptTheme } from "../../theme/departments";

export default function LearningPlans() {
  const { token } = useAuth();
  const { addToast } = useToast();
  const [plans, setPlans] = useState([]);
  const [courses, setCourses] = useState([]);
  const [exams, setExams] = useState([]);
  const [students, setStudents] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [planModal, setPlanModal] = useState(null);
  const [itemsPlan, setItemsPlan] = useState(null);
  const [assignPlan, setAssignPlan] = useState(null);

  useEffect(() => { fetchAll(); }, []);
  const fetchAll = async () => {
    try {
      setLoading(true);
      const [p, c, e, u, d] = await Promise.all([
        api.get("/learning-plans/"),
        api.get(`/courses/?token=${token}`),
        api.get(`/exams/?token=${token}`),
        api.get(`/users/?token=${token}`),
        api.get(`/departments/?token=${token}`),
      ]);
      setPlans(p.data); setCourses(c.data); setExams(e.data);
      setStudents(u.data.filter((x) => x.role === "student" && x.is_active));
      setDepartments(d.data);
    } catch { addToast("Eroare la încărcarea planurilor", "error"); }
    finally { setLoading(false); }
  };
  const handleDelete = async (plan) => {
    if (!window.confirm(`Sigur ștergi planul "${plan.title}"?`)) return;
    try { await api.delete(`/learning-plans/${plan.id}`); addToast("Plan șters", "success"); fetchAll(); }
    catch (e) { addToast(e.response?.data?.detail || "Eroare la ștergere", "error"); }
  };
  const deptName = (id) => departments.find((d) => d.id === id)?.name;

  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-500">Se încarcă...</div>;

  return (
    <div className="min-h-screen pb-12">
      <div className="bg-white border-b px-6 py-9" style={{ borderColor: "var(--line)" }}>
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="eyebrow">Trasee de învățare</span>
            <h1 className="text-3xl font-extrabold text-slate-900 mt-1">Planuri de învățare</h1>
            <p className="text-sm text-slate-500 mt-1">Construiește un traseu (cursuri + examene) și asignează-l unui departament sau studenților.</p>
          </div>
          <button onClick={() => setPlanModal({ mode: "create" })} className="btn btn-primary">+ Plan nou</button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 mt-8">
        {plans.length === 0 ? (
          <div className="surface p-16 text-center text-slate-400">Niciun plan de învățare.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {plans.map((plan) => {
              const dt = deptTheme(plan.target_department_id);
              return (
                <div key={plan.id} className="surface p-6 flex flex-col h-full">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex flex-col gap-1.5">
                      <span className={`tag ${plan.is_published ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-500 border-slate-200"}`}>{plan.is_published ? "Publicat" : "Ciornă"}</span>
                      {plan.is_mandatory && <span className="tag bg-amber-50 text-amber-800 border-amber-200">Obligatoriu</span>}
                    </div>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2 leading-snug line-clamp-2">{plan.title}</h3>
                  {plan.target_department_id && <span className={`self-start mb-3 tag ${dt.chip}`}>{deptName(plan.target_department_id) || "Departament"}</span>}
                  <p className="text-sm text-slate-500 mb-5 line-clamp-2 flex-1">{plan.description || "Acest plan nu are o descriere."}</p>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <button onClick={() => setItemsPlan(plan)} className="btn btn-ghost">Conținut</button>
                    <button onClick={() => setAssignPlan(plan)} className="btn btn-ghost">Asignează</button>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setPlanModal({ mode: "edit", plan })} className="btn btn-ghost flex-1">Editează</button>
                    <button onClick={() => handleDelete(plan)} className="btn btn-ghost" style={{ color: "#be123c" }}>Șterge</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {planModal && <PlanModal mode={planModal.mode} plan={planModal.plan} departments={departments} addToast={addToast} onClose={() => setPlanModal(null)} onSaved={() => { setPlanModal(null); fetchAll(); }} />}
      {itemsPlan && <ItemsModal plan={itemsPlan} courses={courses} exams={exams} addToast={addToast} onClose={() => setItemsPlan(null)} />}
      {assignPlan && <AssignModal plan={assignPlan} students={students} addToast={addToast} onClose={() => setAssignPlan(null)} />}
    </div>
  );
}

function PlanModal({ mode, plan, departments = [], addToast, onClose, onSaved }) {
  const isEdit = mode === "edit";
  const [form, setForm] = useState({
    title: plan?.title || "", description: plan?.description || "",
    target_department_id: plan?.target_department_id ? String(plan.target_department_id) : "",
    is_mandatory: plan?.is_mandatory ?? false, is_published: plan?.is_published ?? false,
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (form.title.trim().length < 3) return addToast("Titlul trebuie să aibă minim 3 caractere", "warning");
    setSaving(true);
    try {
      const payload = { ...form, target_department_id: form.target_department_id ? parseInt(form.target_department_id) : null };
      if (isEdit) { await api.put(`/learning-plans/${plan.id}`, payload); addToast("Plan actualizat", "success"); }
      else { await api.post("/learning-plans/", payload); addToast("Plan creat", "success"); }
      onSaved();
    } catch (e) { addToast(e.response?.data?.detail || "Eroare la salvare", "error"); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(15,22,34,.45)" }}>
      <div className="surface w-full max-w-lg p-8">
        <h2 className="text-xl font-bold text-slate-900 mb-1">{isEdit ? "Editează planul" : "Plan nou"}</h2>
        <p className="text-sm text-slate-500 mb-6">Cursurile și examenele le adaugi după, din „Conținut".</p>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Titlu *</label>
            <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="ex: Onboarding angajați noi" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Descriere (opțional)</label>
            <textarea rows={3} className="input resize-none" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Departament țintă</label>
            <select className="input" value={form.target_department_id} onChange={(e) => setForm({ ...form, target_department_id: e.target.value })}>
              <option value="">— Niciunul (doar asignare manuală) —</option>{departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <p className="text-xs text-slate-400 mt-1">Cu departament ales + plan publicat, toți studenții din acel departament îl primesc automat.</p>
          </div>
          <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border cursor-pointer" style={{ borderColor: "var(--line)" }}>
            <input type="checkbox" checked={form.is_mandatory} onChange={(e) => setForm({ ...form, is_mandatory: e.target.checked })} className="w-5 h-5" style={{ accentColor: "var(--ink)" }} />
            <span className="text-sm font-semibold text-slate-900">Plan obligatoriu</span>
          </label>
          <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border cursor-pointer" style={{ borderColor: "var(--line)" }}>
            <input type="checkbox" checked={form.is_published} onChange={(e) => setForm({ ...form, is_published: e.target.checked })} className="w-5 h-5" style={{ accentColor: "var(--ink)" }} />
            <span className="text-sm font-semibold text-slate-900">Publicat (vizibil studenților)</span>
          </label>
        </div>
        <div className="flex gap-3 mt-8">
          <button onClick={handleSave} disabled={saving} className="btn btn-primary flex-1">{saving ? "Se salvează..." : isEdit ? "Salvează" : "Crează"}</button>
          <button onClick={onClose} disabled={saving} className="btn btn-ghost flex-1">Anulează</button>
        </div>
      </div>
    </div>
  );
}

function ItemsModal({ plan, courses, exams, addToast, onClose }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addType, setAddType] = useState("course");
  const [selectedId, setSelectedId] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => { fetchItems(); }, []);
  const fetchItems = async () => {
    try { setLoading(true); const res = await api.get(`/learning-plans/${plan.id}`); setItems(res.data.items || []); }
    catch { addToast("Eroare la încărcarea conținutului", "error"); }
    finally { setLoading(false); }
  };
  const courseName = (id) => courses.find((c) => c.id === id)?.title || `Curs #${id}`;
  const examName = (id) => exams.find((e) => e.id === id)?.title || `Examen #${id}`;
  const handleAdd = async () => {
    if (!selectedId) return addToast("Alege un curs sau examen", "warning");
    setAdding(true);
    try {
      const payload = { display_order: items.length, is_required: true, ...(addType === "course" ? { course_id: parseInt(selectedId) } : { exam_id: parseInt(selectedId) }) };
      await api.post(`/learning-plans/${plan.id}/items`, payload); addToast("Adăugat în plan", "success"); setSelectedId(""); fetchItems();
    } catch (e) { addToast(e.response?.data?.detail || "Eroare la adăugare", "error"); }
    finally { setAdding(false); }
  };
  const handleRemove = async (item) => {
    try { await api.delete(`/learning-plans/${plan.id}/items/${item.id}`); addToast("Eliminat din plan", "success"); fetchItems(); }
    catch (e) { addToast(e.response?.data?.detail || "Eroare la eliminare", "error"); }
  };
  const options = addType === "course" ? courses : exams;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto" style={{ background: "rgba(15,22,34,.45)" }}>
      <div className="surface w-full max-w-2xl my-8 p-8">
        <div className="flex items-start justify-between mb-6 border-b pb-4" style={{ borderColor: "var(--line)" }}>
          <div>
            <span className="eyebrow">Conținut plan</span>
            <h2 className="text-2xl font-extrabold text-slate-900 mt-1">{plan.title}</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-xl">✕</button>
        </div>

        <div className="bg-slate-50 border rounded-xl p-4 mb-5" style={{ borderColor: "var(--line)" }}>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Adaugă în traseu</p>
          <div className="flex flex-col sm:flex-row gap-2">
            <select className="input sm:w-32" value={addType} onChange={(e) => { setAddType(e.target.value); setSelectedId(""); }}>
              <option value="course">Curs</option><option value="exam">Examen</option>
            </select>
            <select className="input flex-1" value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
              <option value="">— alege {addType === "course" ? "un curs" : "un examen"} —</option>{options.map((o) => <option key={o.id} value={o.id}>{o.title}</option>)}
            </select>
            <button onClick={handleAdd} disabled={adding || !selectedId} className="btn btn-primary">+ Adaugă</button>
          </div>
        </div>

        {loading ? <div className="text-center py-8 text-slate-400">Se încarcă...</div>
          : items.length === 0 ? <div className="text-center py-12 bg-slate-50 rounded-xl border text-slate-400" style={{ borderColor: "var(--line)" }}>Traseul e gol.</div>
          : (
            <div className="space-y-2 max-h-[45vh] overflow-y-auto pr-2">
              {items.map((item, i) => {
                const isCourse = item.course_id != null;
                return (
                  <div key={item.id} className="bg-slate-50 border rounded-xl p-4 flex items-center gap-3" style={{ borderColor: "var(--line)" }}>
                    <span className="w-8 h-8 rounded-lg bg-white border text-slate-700 font-bold text-sm flex items-center justify-center flex-shrink-0 metric" style={{ borderColor: "var(--line)" }}>{i + 1}</span>
                    <span className="tag bg-slate-100 text-slate-600 border-slate-200 flex-shrink-0">{isCourse ? "Curs" : "Examen"}</span>
                    <p className="font-semibold text-slate-900 truncate flex-1">{isCourse ? courseName(item.course_id) : examName(item.exam_id)}</p>
                    <button onClick={() => handleRemove(item)} className="text-rose-600 font-semibold text-sm flex-shrink-0">Elimină</button>
                  </div>
                );
              })}
            </div>
          )}
        <div className="mt-6 pt-4 border-t" style={{ borderColor: "var(--line)" }}>
          <button onClick={onClose} className="btn btn-ghost w-full">Închide</button>
        </div>
      </div>
    </div>
  );
}

function AssignModal({ plan, students, addToast, onClose }) {
  const [selected, setSelected] = useState([]);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  const toggle = (id) => setSelected((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);
  const filtered = students.filter((s) => s.full_name.toLowerCase().includes(search.toLowerCase()) || s.email.toLowerCase().includes(search.toLowerCase()));
  const handleAssign = async () => {
    if (selected.length === 0) return addToast("Alege cel puțin un student", "warning");
    setSaving(true);
    try { await api.post(`/learning-plans/${plan.id}/assign`, { learning_plan_id: plan.id, student_ids: selected }); addToast(`Plan asignat la ${selected.length} ${selected.length === 1 ? "student" : "studenți"}`, "success"); onClose(); }
    catch (e) { addToast(e.response?.data?.detail || "Eroare la asignare", "error"); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto" style={{ background: "rgba(15,22,34,.45)" }}>
      <div className="surface w-full max-w-lg my-8 p-8">
        <div className="flex items-start justify-between mb-6 border-b pb-4" style={{ borderColor: "var(--line)" }}>
          <div>
            <span className="eyebrow">Asignare plan</span>
            <h2 className="text-2xl font-extrabold text-slate-900 mt-1">{plan.title}</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-xl">✕</button>
        </div>
        <input className="input mb-4" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Caută student după nume sau email..." />
        {students.length === 0 ? <div className="text-center py-12 bg-slate-50 rounded-xl border text-slate-400" style={{ borderColor: "var(--line)" }}>Nu există studenți disponibili.</div>
          : (
            <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-2">
              {filtered.map((s) => (
                <label key={s.id} className="flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition" style={{ borderColor: selected.includes(s.id) ? "var(--accent)" : "var(--line)", background: selected.includes(s.id) ? "rgba(31,95,191,.06)" : "#f8fafc" }}>
                  <input type="checkbox" checked={selected.includes(s.id)} onChange={() => toggle(s.id)} className="w-5 h-5" style={{ accentColor: "var(--accent)" }} />
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 text-sm truncate">{s.full_name}</p>
                    <p className="text-xs text-slate-500 truncate">{s.email}</p>
                  </div>
                </label>
              ))}
            </div>
          )}
        <div className="flex gap-3 mt-6">
          <button onClick={handleAssign} disabled={saving || selected.length === 0} className="btn btn-primary flex-1">{saving ? "Se asignează..." : `Asignează (${selected.length})`}</button>
          <button onClick={onClose} disabled={saving} className="btn btn-ghost flex-1">Anulează</button>
        </div>
      </div>
    </div>
  );
}