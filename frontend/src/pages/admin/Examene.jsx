import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";

const API = "http://127.0.0.1:8000";

const EMPTY_FORM = {
  title: "",
  description: "",
  duration_minutes: "",
  max_attempts: "",
  passing_score: "",
  department_id: "",
  student_ids: [],
  available_from: "",
  available_to: "",
};

export default function ExameneAdmin() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [exams, setExams] = useState([]);
  const [pending, setPending] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [gradingExam, setGradingExam] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => { fetchAll(); }, []);

  // Când se schimbă departamentul -> aducem studenții lui din backend
  useEffect(() => {
    if (!form.department_id) { setStudents([]); return; }
    axios
      .get(`${API}/users/?token=${token}&role=student&department_id=${form.department_id}`)
      .then((r) => setStudents(r.data))
      .catch(() => setStudents([]));
  }, [form.department_id, token]);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [e, p, d] = await Promise.all([
        axios.get(`${API}/exams/?token=${token}`),
        axios.get(`${API}/exams/grading/pending?token=${token}`),
        axios.get(`${API}/departments/?token=${token}`),
      ]);
      setExams(e.data); setPending(p.data); setDepartments(d.data);
    } catch { addToast("Eroare la încărcarea examenelor", "error"); }
    finally { setLoading(false); }
  };

  const pendingFor = (id) => pending.filter((p) => p.exam_id === id);
  const deptName = (id) => departments.find((d) => d.id === id)?.name;

  const toggleStudent = (id) => setForm((f) => ({
    ...f,
    student_ids: f.student_ids.includes(id)
      ? f.student_ids.filter((x) => x !== id)
      : [...f.student_ids, id],
  }));

  const handleCreate = async () => {
    if (form.title.trim().length < 3) return addToast("Titlul trebuie să aibă minim 3 caractere", "warning");
    if (form.available_from && form.available_to && new Date(form.available_from) > new Date(form.available_to)) {
      return addToast("„Valabil de la” trebuie să fie înainte de „valabil până la”", "warning");
    }

    const payload = {
      title: form.title,
      description: form.description,
      student_ids: form.student_ids,
    };
    if (form.department_id !== "")    payload.department_id = parseInt(form.department_id);
    if (form.duration_minutes !== "") payload.duration_minutes = parseInt(form.duration_minutes);
    if (form.max_attempts !== "")     payload.max_attempts = parseInt(form.max_attempts);
    if (form.passing_score !== "")    payload.passing_score = parseFloat(form.passing_score);
    if (form.available_from)          payload.available_from = new Date(form.available_from).toISOString();
    if (form.available_to)            payload.available_to = new Date(form.available_to).toISOString();

    try {
      setCreating(true);
      const res = await axios.post(`${API}/exams/?token=${token}`, payload);
      addToast("Examen creat. Adaugă întrebări.", "success");
      setShowCreateModal(false);
      setForm(EMPTY_FORM);
      navigate(`/admin/examene/${res.data.id}/editor`);
    } catch (e) { addToast(e.response?.data?.detail || "Eroare la creare", "error"); }
    finally { setCreating(false); }
  };

  const handleDelete = async (examId, title) => {
    if (!window.confirm(`Sigur ștergi examenul "${title}"?`)) return;
    try { await axios.delete(`${API}/exams/${examId}?token=${token}`); addToast("Examen șters", "success"); fetchAll(); }
    catch { addToast("Eroare la ștergere", "error"); }
  };

  const togglePublish = async (exam) => {
    try {
      await axios.post(`${API}/exams/${exam.id}/${exam.is_published ? "unpublish" : "publish"}?token=${token}`);
      addToast(exam.is_published ? "Examen retras în ciornă" : "Examen publicat", "success");
      fetchAll();
    } catch { addToast("Eroare", "error"); }
  };

  // Departamentele pe care le poate alege userul curent
  const selectableDepartments = departments.filter(
    (d) => user?.role === "admin" || d.id === user?.department_id
  );

  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-500">Se încarcă...</div>;

  return (
    <div className="min-h-screen pb-12">
      <div className="bg-white border-b px-6 py-9" style={{ borderColor: "var(--line)" }}>
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="eyebrow">Evaluări</span>
            <h1 className="text-3xl font-extrabold text-slate-900 mt-1">Biblioteca de examene</h1>
          </div>
          <button onClick={() => { setForm(EMPTY_FORM); setShowCreateModal(true); }} className="btn btn-primary">+ Examen nou</button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 mt-8">
        {pending.length > 0 && (
          <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl px-5 py-4">
            <p className="text-sm font-semibold text-amber-800">Ai <span className="metric font-bold">{pending.length}</span> {pending.length === 1 ? "tentativă" : "tentative"} de corectat manual.</p>
          </div>
        )}

        {exams.length === 0 ? (
          <div className="surface p-16 text-center text-slate-400">Nu există examene.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {exams.map((exam) => {
              const toGrade = pendingFor(exam.id);
              return (
                <div key={exam.id} className="surface p-6 flex flex-col h-full">
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <span className={`tag ${exam.is_published ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-500 border-slate-200"}`}>{exam.is_published ? "Publicat" : "Ciornă"}</span>
                    <span className={`tag ${exam.department_id ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-slate-100 text-slate-500 border-slate-200"}`}>{exam.department_id ? (deptName(exam.department_id) || `Dept #${exam.department_id}`) : "General"}</span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2 leading-snug line-clamp-2">{exam.title}</h3>
                  <p className="text-sm text-slate-500 mb-5 line-clamp-2 flex-1">{exam.description || "Acest examen nu are descriere."}</p>
                  <div className="flex items-center gap-2 mb-4 flex-wrap">
                    <span className="tag bg-slate-100 text-slate-600 border-slate-200 metric">{exam.duration_minutes}m</span>
                    <span className="tag bg-slate-100 text-slate-600 border-slate-200 metric">{parseFloat(exam.passing_score)}%</span>
                    <span className="tag bg-slate-100 text-slate-600 border-slate-200 metric">{exam.max_attempts === 0 ? "∞" : `${exam.max_attempts}x`}</span>
                  </div>
                  {toGrade.length > 0 && <button onClick={() => setGradingExam(exam)} className="btn w-full mb-4" style={{ background: "#b45309", color: "#fff" }}>Corectează ({toGrade.length})</button>}
                  <div className="flex gap-2 mt-auto">
                    <button onClick={() => navigate(`/admin/examene/${exam.id}/editor`)} className="btn btn-ghost flex-1">Editor</button>
                    <button onClick={() => togglePublish(exam)} className="btn btn-ghost flex-1">{exam.is_published ? "Ascunde" : "Publică"}</button>
                    <button onClick={() => handleDelete(exam.id, exam.title)} className="btn btn-ghost" style={{ color: "#be123c" }}>Șterge</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto" style={{ background: "rgba(15,22,34,.45)" }}>
          <div className="surface w-full max-w-lg my-8 p-8">
            <h2 className="text-xl font-bold text-slate-900 mb-1">Creare examen</h2>
            <p className="text-sm text-slate-500 mb-6">Setează baza examenului. Întrebările le adaugi în pasul următor.</p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Titlu examen *</label>
                <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Descriere (opțional)</label>
                <textarea rows={3} className="input resize-none" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>

              {/* Departament */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Departament</label>
                <select
                  className="input"
                  value={form.department_id}
                  onChange={(e) => setForm({ ...form, department_id: e.target.value, student_ids: [] })}
                >
                  <option value="">— General (toți studenții) —</option>
                  {selectableDepartments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
                <p className="text-xs text-slate-400 mt-1">Alege un departament ca să poți nominaliza elevii care dau testul.</p>
              </div>

              {/* Elevi (apare după ce alegi departamentul) */}
              {form.department_id && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    Elevi care dau testul ({form.student_ids.length} selectați)
                  </label>
                  <div className="max-h-48 overflow-y-auto bg-slate-50 border rounded-xl divide-y divide-slate-100" style={{ borderColor: "var(--line)" }}>
                    {students.length === 0 ? (
                      <p className="text-sm text-slate-400 p-4">Niciun elev în acest departament.</p>
                    ) : students.map((s) => (
                      <label key={s.id} className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-white transition">
                        <input
                          type="checkbox"
                          checked={form.student_ids.includes(s.id)}
                          onChange={() => toggleStudent(s.id)}
                          className="w-4 h-4 accent-cyan-500"
                        />
                        <span className="text-sm font-medium text-slate-800">{s.full_name}</span>
                        <span className="text-xs text-slate-400">{s.email}</span>
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">Lasă gol pentru tot departamentul; selectează ca să restrângi la anumiți elevi.</p>
                </div>
              )}

              {/* Perioada de valabilitate */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Valabil de la</label>
                  <input type="datetime-local" className="input" value={form.available_from} onChange={(e) => setForm({ ...form, available_from: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Valabil până la</label>
                  <input type="datetime-local" className="input" value={form.available_to} onChange={(e) => setForm({ ...form, available_to: e.target.value })} />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Timp (m)</label>
                  <input type="number" min={1} className="input text-center" value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })} placeholder="30" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Încercări</label>
                  <input type="number" min={0} className="input text-center" value={form.max_attempts} onChange={(e) => setForm({ ...form, max_attempts: e.target.value })} placeholder="1" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Prag %</label>
                  <input type="number" min={0} max={100} className="input text-center" value={form.passing_score} onChange={(e) => setForm({ ...form, passing_score: e.target.value })} placeholder="70" />
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button onClick={handleCreate} disabled={creating} className="btn btn-primary flex-1">{creating ? "Se creează..." : "Mergi la editor"}</button>
              <button onClick={() => setShowCreateModal(false)} disabled={creating} className="btn btn-ghost flex-1">Anulează</button>
            </div>
          </div>
        </div>
      )}

      {gradingExam && <GradingModal exam={gradingExam} attempts={pendingFor(gradingExam.id)} token={token} addToast={addToast} onClose={() => setGradingExam(null)} onGraded={() => { setGradingExam(null); fetchAll(); }} />}
    </div>
  );
}

function GradingModal({ exam, attempts, token, addToast, onClose, onGraded }) {
  const [selected, setSelected] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [grades, setGrades] = useState({});
  const [overall, setOverall] = useState("");
  const [saving, setSaving] = useState(false);

  const openAttempt = async (attemptId) => {
    try {
      setLoadingDetail(true);
      const res = await axios.get(`${API}/exams/attempts/${attemptId}/grading?token=${token}`);
      setSelected(res.data);
      const init = {};
      res.data.open_answers.forEach((a) => { init[a.answer_id] = { points: a.points_earned ?? "", feedback: a.teacher_feedback ?? "" }; });
      setGrades(init); setOverall(res.data.overall_feedback ?? "");
    } catch (e) { addToast(e.response?.data?.detail || "Eroare la încărcare", "error"); }
    finally { setLoadingDetail(false); }
  };
  const setPoints = (id, max, val) => {
    if (val !== "") { const p = parseFloat(val); if (!isNaN(p)) { if (p < 0) val = "0"; else if (p > max) val = String(max); } }
    setGrades((prev) => ({ ...prev, [id]: { ...prev[id], points: val } }));
  };
  const quickSet = (id, val) => setGrades((prev) => ({ ...prev, [id]: { ...prev[id], points: val } }));
  const setFeedback = (id, val) => setGrades((prev) => ({ ...prev, [id]: { ...prev[id], feedback: val } }));
  const filledCount = selected ? selected.open_answers.filter((a) => grades[a.answer_id]?.points !== "" && grades[a.answer_id]?.points != null).length : 0;

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      answers: selected.open_answers.map((a) => {
        const raw = grades[a.answer_id]?.points;
        return { answer_id: a.answer_id, points_earned: raw === "" || raw == null ? 0 : parseFloat(raw), teacher_feedback: grades[a.answer_id]?.feedback || null };
      }),
      overall_feedback: overall || null,
    };
    try { const res = await axios.post(`${API}/exams/attempts/${selected.attempt_id}/grade?token=${token}`, payload); addToast(`Corectat. Scor final: ${res.data.score ?? "—"}%`, "success"); onGraded(); }
    catch (e) { addToast(e.response?.data?.detail || "Eroare la salvare", "error"); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto" style={{ background: "rgba(15,22,34,.45)" }}>
      <div className="surface w-full max-w-2xl my-8 p-8">
        <div className="flex items-start justify-between mb-6 border-b pb-4" style={{ borderColor: "var(--line)" }}>
          <div>
            <span className="eyebrow">Corectare manuală</span>
            <h2 className="text-2xl font-extrabold text-slate-900 mt-1">{exam.title}</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-xl">✕</button>
        </div>

        {!selected ? (
          attempts.length === 0 ? <div className="text-center py-12 text-slate-400">Nimic de corectat.</div>
            : (
              <div className="space-y-3">
                {attempts.map((a) => (
                  <div key={a.attempt_id} className="bg-slate-50 border rounded-xl p-4 flex items-center justify-between gap-3" style={{ borderColor: "var(--line)" }}>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 truncate">{a.student_name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{a.open_count} răspuns(uri) · trimis {a.submitted_at ? new Date(a.submitted_at).toLocaleDateString("ro-RO") : "—"}</p>
                    </div>
                    <button onClick={() => openAttempt(a.attempt_id)} disabled={loadingDetail} className="btn btn-primary flex-shrink-0">Corectează</button>
                  </div>
                ))}
              </div>
            )
        ) : (
          <>
            <div className="mb-5 flex items-center justify-between">
              <button onClick={() => setSelected(null)} className="text-sm font-semibold text-slate-400 hover:text-slate-700">← Înapoi la listă</button>
              <span className="text-sm font-semibold text-slate-700 metric">{selected.student_name} · auto: {selected.auto_points} pct</span>
            </div>
            <div className="space-y-5 max-h-[50vh] overflow-y-auto pr-2">
              {selected.open_answers.map((a, i) => (
                <div key={a.answer_id} className="bg-slate-50 border rounded-xl p-5" style={{ borderColor: "var(--line)" }}>
                  <p className="font-semibold text-slate-900 mb-2">{i + 1}. {a.question_text}</p>
                  <div className="bg-white border rounded-xl p-3 text-sm text-slate-700 mb-4 whitespace-pre-wrap" style={{ borderColor: "var(--line)" }}>{a.text_answer || <span className="text-slate-400 italic">— fără răspuns —</span>}</div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Punctaj <span className="text-slate-400">(din maxim {a.max_points})</span></label>
                  <div className="flex items-center gap-2 mb-3">
                    <input type="number" min={0} max={a.max_points} step={0.5} value={grades[a.answer_id]?.points ?? ""} onChange={(e) => setPoints(a.answer_id, a.max_points, e.target.value)} placeholder={`0 – ${a.max_points}`} className="input w-28 text-center" />
                    <div className="flex gap-1.5">
                      <button onClick={() => quickSet(a.answer_id, 0)} className="btn btn-ghost px-3 py-2">0</button>
                      <button onClick={() => quickSet(a.answer_id, a.max_points / 2)} className="btn btn-ghost px-3 py-2">½</button>
                      <button onClick={() => quickSet(a.answer_id, a.max_points)} className="btn btn-ghost px-3 py-2" style={{ color: "#0f766e" }}>Max</button>
                    </div>
                  </div>
                  <input className="input" value={grades[a.answer_id]?.feedback ?? ""} onChange={(e) => setFeedback(a.answer_id, e.target.value)} placeholder="Feedback (opțional)" />
                </div>
              ))}
            </div>
            <div className="mt-5">
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Feedback general (opțional)</label>
              <textarea rows={2} className="input resize-none" value={overall} onChange={(e) => setOverall(e.target.value)} />
            </div>
            <p className="text-xs text-slate-400 mt-3">{filledCount}/{selected.open_answers.length} notate · răspunsurile goale se consideră 0 puncte.</p>
            <div className="flex gap-3 mt-4">
              <button onClick={handleSave} disabled={saving} className="btn btn-primary flex-1">{saving ? "Se salvează..." : "Finalizează corectarea"}</button>
              <button onClick={() => setSelected(null)} disabled={saving} className="btn btn-ghost flex-1">Anulează</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}