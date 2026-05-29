import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";

const API = "http://127.0.0.1:8000";

export default function ExameneAdmin() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [exams, setExams] = useState([]);
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [gradingExam, setGradingExam] = useState(null);
  const [form, setForm] = useState({ title: "", description: "", duration_minutes: "", max_attempts: "", passing_score: "" });

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [eRes, pRes] = await Promise.all([
        axios.get(`${API}/exams/?token=${token}`),
        axios.get(`${API}/exams/grading/pending?token=${token}`),
      ]);
      setExams(eRes.data);
      setPending(pRes.data);
    } catch {
      addToast("Eroare la încărcarea examenelor", "error");
    } finally {
      setLoading(false);
    }
  };

  const pendingFor = (examId) => pending.filter((p) => p.exam_id === examId);

  const handleCreate = async () => {
    if (form.title.trim().length < 3) return addToast("Titlul trebuie să aibă minim 3 caractere", "warning");

    const payload = { title: form.title, description: form.description };
    if (form.duration_minutes !== "") payload.duration_minutes = parseInt(form.duration_minutes);
    if (form.max_attempts !== "")     payload.max_attempts = parseInt(form.max_attempts);
    if (form.passing_score !== "")    payload.passing_score = parseFloat(form.passing_score);

    try {
      setCreating(true);
      const res = await axios.post(`${API}/exams/?token=${token}`, payload);
      addToast("Examen creat! Adaugă întrebări.", "success");
      setShowCreateModal(false);
      navigate(`/admin/examene/${res.data.id}/editor`);
    } catch (e) {
      addToast(e.response?.data?.detail || "Eroare la creare", "error");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (examId, title) => {
    if (!window.confirm(`Sigur ștergi examenul "${title}"?`)) return;
    try {
      await axios.delete(`${API}/exams/${examId}?token=${token}`);
      addToast("Examen șters", "success");
      fetchAll();
    } catch {
      addToast("Eroare la ștergere", "error");
    }
  };

  const togglePublish = async (exam) => {
    try {
      await axios.post(`${API}/exams/${exam.id}/${exam.is_published ? "unpublish" : "publish"}?token=${token}`);
      addToast(exam.is_published ? "Examen retras în ciornă" : "Examen publicat!", "success");
      fetchAll();
    } catch {
      addToast("Eroare", "error");
    }
  };

  if (loading)
    return <div className="min-h-screen bg-gray-50 flex justify-center items-center"><div className="w-10 h-10 border-4 border-cyan-200 border-t-cyan-500 rounded-full animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-12 animate-in fade-in">
      <div className="bg-white border-b border-gray-100 px-6 py-10 relative overflow-hidden mb-8">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-50/50 via-white to-amber-50/30 pointer-events-none" />
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <p className="text-xs font-bold text-cyan-600 uppercase tracking-widest mb-1">Evaluări Generale</p>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Biblioteca de Examene</h1>
          </div>
          <button onClick={() => setShowCreateModal(true)} className="px-6 py-3.5 rounded-xl bg-gray-900 hover:bg-gray-800 text-white text-sm font-extrabold transition-all shadow-md shadow-gray-900/10 flex items-center gap-2">
            <span className="text-lg">+</span> Examen Nou
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6">
        {pending.length > 0 && (
          <div className="mb-6 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 flex items-center gap-3">
            <span className="text-2xl">📥</span>
            <p className="text-sm font-bold text-amber-800">
              Ai <span className="font-black">{pending.length}</span> {pending.length === 1 ? "tentativă" : "tentative"} de corectat manual (răspunsuri libere).
            </p>
          </div>
        )}

        {exams.length === 0 ? (
          <div className="bg-white border border-gray-100 rounded-3xl p-16 text-center shadow-sm">
            <div className="text-6xl mb-4 opacity-50">📝</div>
            <p className="text-gray-900 font-bold text-xl mb-2">Nu există examene</p>
            <p className="text-gray-500 mb-6">Apasă pe butonul de mai sus pentru a crea primul examen.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {exams.map((exam) => {
              const toGrade = pendingFor(exam.id);
              return (
                <div key={exam.id} className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm hover:shadow-xl hover:shadow-cyan-100/50 hover:-translate-y-1 transition-all duration-300 flex flex-col h-full">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-50 to-blue-50 border border-cyan-100 flex items-center justify-center text-xl shadow-sm">📝</div>
                    <span className={`px-2.5 py-1 text-[10px] uppercase tracking-widest font-extrabold rounded-lg border ${exam.is_published ? "bg-green-50 border-green-200 text-green-700" : "bg-gray-50 border-gray-200 text-gray-500"}`}>
                      {exam.is_published ? "Publicat" : "Ciornă"}
                    </span>
                  </div>
                  <h3 className="text-lg font-extrabold text-gray-900 mb-2 leading-snug line-clamp-2">{exam.title}</h3>
                  <p className="text-sm font-medium text-gray-500 mb-5 line-clamp-2 flex-1">{exam.description || "Acest examen nu are o descriere."}</p>

                  <div className="flex items-center gap-2 mb-4 flex-wrap">
                    <span className="bg-gray-50 border border-gray-100 text-gray-600 px-2.5 py-1 rounded-lg text-xs font-bold">⏱️ {exam.duration_minutes}m</span>
                    <span className="bg-gray-50 border border-gray-100 text-gray-600 px-2.5 py-1 rounded-lg text-xs font-bold">🎯 {parseFloat(exam.passing_score)}%</span>
                    <span className="bg-gray-50 border border-gray-100 text-gray-600 px-2.5 py-1 rounded-lg text-xs font-bold">🔄 {exam.max_attempts === 0 ? "∞" : `${exam.max_attempts}x`}</span>
                  </div>

                  {toGrade.length > 0 && (
                    <button
                      onClick={() => setGradingExam(exam)}
                      className="mb-4 w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-sm transition shadow-md shadow-amber-500/20"
                    >
                      📥 Corectează ({toGrade.length})
                    </button>
                  )}

                  <div className="flex gap-2 mt-auto">
                    <button onClick={() => navigate(`/admin/examene/${exam.id}/editor`)} className="flex-1 py-2.5 rounded-xl bg-cyan-50 text-cyan-700 hover:bg-cyan-500 hover:text-white font-extrabold text-sm transition-colors border border-cyan-100 hover:border-transparent">Editor</button>
                    <button onClick={() => togglePublish(exam)} className={`flex-1 py-2.5 rounded-xl font-extrabold text-sm transition-colors border ${exam.is_published ? "bg-amber-50 border-amber-100 text-amber-700 hover:bg-amber-500 hover:text-white" : "bg-green-50 border-green-100 text-green-700 hover:bg-green-500 hover:text-white"}`}>
                      {exam.is_published ? "Ascunde" : "Publică"}
                    </button>
                    <button onClick={() => handleDelete(exam.id, exam.title)} className="px-3 py-2.5 rounded-xl bg-red-50 text-red-600 hover:bg-red-500 hover:text-white border border-red-100 hover:border-transparent transition-colors font-bold text-sm">🗑️</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal creare examen */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-gray-100 rounded-3xl p-8 max-w-lg w-full shadow-2xl animate-in zoom-in-95">
            <h2 className="text-2xl font-extrabold text-gray-900 mb-2">Creare Examen</h2>
            <p className="text-sm font-medium text-gray-500 mb-6">Setează baza examenului. Întrebările le vei adăuga în pasul următor.</p>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 ml-1">Titlu Examen *</label>
                <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-100 transition-all" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 ml-1">Descriere (Opțional)</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-100 resize-none transition-all" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 ml-1">Timp (m)</label>
                  <input type="number" min={1} value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })} placeholder="ex: 30" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-100 transition-all text-center" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 ml-1">Încercări</label>
                  <input type="number" min={0} value={form.max_attempts} onChange={(e) => setForm({ ...form, max_attempts: e.target.value })} placeholder="ex: 1" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-100 transition-all text-center" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 ml-1">Trecere %</label>
                  <input type="number" min={0} max={100} value={form.passing_score} onChange={(e) => setForm({ ...form, passing_score: e.target.value })} placeholder="ex: 70" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-100 transition-all text-center" />
                </div>
              </div>
            </div>
            <div className="flex gap-4 mt-8">
              <button onClick={handleCreate} disabled={creating} className="flex-1 py-3.5 rounded-xl bg-gray-900 hover:bg-gray-800 disabled:bg-gray-400 text-white text-sm font-extrabold transition-all shadow-md shadow-gray-900/10">{creating ? "Se creează..." : "Mergi la Editor"}</button>
              <button onClick={() => setShowCreateModal(false)} disabled={creating} className="flex-1 py-3.5 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-extrabold transition-all">Anulează</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal corectare */}
      {gradingExam && (
        <GradingModal
          exam={gradingExam}
          attempts={pendingFor(gradingExam.id)}
          token={token}
          addToast={addToast}
          onClose={() => setGradingExam(null)}
          onGraded={() => { setGradingExam(null); fetchAll(); }}
        />
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
//  MODAL CORECTARE MANUALĂ (open_text) — simplu, fără valori prestabilite
// ──────────────────────────────────────────────────────────────
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
      res.data.open_answers.forEach((a) => {
        init[a.answer_id] = {
          points: a.points_earned ?? "",
          feedback: a.teacher_feedback ?? "",
        };
      });
      setGrades(init);
      setOverall(res.data.overall_feedback ?? "");
    } catch (e) {
      addToast(e.response?.data?.detail || "Eroare la încărcarea tentativei", "error");
    } finally {
      setLoadingDetail(false);
    }
  };

  const setPoints = (answerId, max, val) => {
    if (val !== "") {
      const p = parseFloat(val);
      if (!isNaN(p)) {
        if (p < 0) val = "0";
        else if (p > max) val = String(max);
      }
    }
    setGrades((prev) => ({ ...prev, [answerId]: { ...prev[answerId], points: val } }));
  };

  const quickSet = (answerId, val) =>
    setGrades((prev) => ({ ...prev, [answerId]: { ...prev[answerId], points: val } }));

  const setFeedback = (answerId, val) =>
    setGrades((prev) => ({ ...prev, [answerId]: { ...prev[answerId], feedback: val } }));

  const filledCount = selected
    ? selected.open_answers.filter((a) => grades[a.answer_id]?.points !== "" && grades[a.answer_id]?.points != null).length
    : 0;

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      answers: selected.open_answers.map((a) => {
        const raw = grades[a.answer_id]?.points;
        return {
          answer_id: a.answer_id,
          points_earned: raw === "" || raw == null ? 0 : parseFloat(raw),
          teacher_feedback: grades[a.answer_id]?.feedback || null,
        };
      }),
      overall_feedback: overall || null,
    };
    try {
      const res = await axios.post(`${API}/exams/attempts/${selected.attempt_id}/grade?token=${token}`, payload);
      addToast(`Corectat! Scor final: ${res.data.score ?? "—"}%`, "success");
      onGraded();
    } catch (e) {
      addToast(e.response?.data?.detail || "Eroare la salvarea notării", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white border border-gray-100 rounded-3xl p-8 max-w-2xl w-full my-8 shadow-2xl animate-in zoom-in-95">
        <div className="flex items-start justify-between mb-6 border-b border-gray-100 pb-4">
          <div>
            <p className="text-xs font-bold text-amber-600 uppercase tracking-widest mb-1">Corectare Manuală</p>
            <h2 className="text-2xl font-extrabold text-gray-900">{exam.title}</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">✕</button>
        </div>

        {!selected ? (
          attempts.length === 0 ? (
            <div className="text-center py-12 text-gray-500">Nimic de corectat aici.</div>
          ) : (
            <div className="space-y-3">
              {attempts.map((a) => (
                <div key={a.attempt_id} className="bg-gray-50 border border-gray-100 rounded-2xl p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold text-gray-900 truncate">{a.student_name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {a.open_count} răspuns(uri) de notat · trimis {a.submitted_at ? new Date(a.submitted_at).toLocaleDateString("ro-RO") : "—"}
                    </p>
                  </div>
                  <button
                    onClick={() => openAttempt(a.attempt_id)}
                    disabled={loadingDetail}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-bold shadow-md shadow-amber-500/20 flex-shrink-0"
                  >
                    Corectează
                  </button>
                </div>
              ))}
            </div>
          )
        ) : (
          <>
            <div className="mb-5 flex items-center justify-between">
              <button onClick={() => setSelected(null)} className="text-sm font-bold text-gray-400 hover:text-gray-700">← Înapoi la listă</button>
              <span className="text-sm font-bold text-gray-700">
                {selected.student_name} · auto: {selected.auto_points} pct
              </span>
            </div>

            <div className="space-y-5 max-h-[50vh] overflow-y-auto pr-2">
              {selected.open_answers.map((a, i) => (
                <div key={a.answer_id} className="bg-gray-50 border border-gray-100 rounded-2xl p-5">
                  <p className="font-bold text-gray-900 mb-2">{i + 1}. {a.question_text}</p>
                  <div className="bg-white border border-gray-200 rounded-xl p-3 text-sm text-gray-700 mb-4 whitespace-pre-wrap">
                    {a.text_answer || <span className="text-gray-400 italic">— fără răspuns —</span>}
                  </div>

                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                    Punctaj <span className="text-gray-400 normal-case">(din maxim {a.max_points})</span>
                  </label>
                  <div className="flex items-center gap-2 mb-3">
                    <input
                      type="number" min={0} max={a.max_points} step={0.5}
                      value={grades[a.answer_id]?.points ?? ""}
                      onChange={(e) => setPoints(a.answer_id, a.max_points, e.target.value)}
                      placeholder={`0 – ${a.max_points}`}
                      className="w-28 bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-cyan-400 transition text-center"
                    />
                    <div className="flex gap-1.5">
                      <button onClick={() => quickSet(a.answer_id, 0)} className="px-3 py-2 rounded-lg bg-white border border-gray-200 text-gray-600 text-xs font-bold hover:bg-gray-100 transition">0</button>
                      <button onClick={() => quickSet(a.answer_id, a.max_points / 2)} className="px-3 py-2 rounded-lg bg-white border border-gray-200 text-gray-600 text-xs font-bold hover:bg-gray-100 transition">½</button>
                      <button onClick={() => quickSet(a.answer_id, a.max_points)} className="px-3 py-2 rounded-lg bg-green-50 border border-green-200 text-green-700 text-xs font-bold hover:bg-green-100 transition">Max</button>
                    </div>
                  </div>

                  <input
                    type="text"
                    value={grades[a.answer_id]?.feedback ?? ""}
                    onChange={(e) => setFeedback(a.answer_id, e.target.value)}
                    placeholder="Feedback (opțional)"
                    className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-cyan-400 transition"
                  />
                </div>
              ))}
            </div>

            <div className="mt-5">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Feedback general (opțional)</label>
              <textarea value={overall} onChange={(e) => setOverall(e.target.value)} rows={2} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-400 transition resize-none" />
            </div>

            <p className="text-xs text-gray-400 mt-3">
              {filledCount}/{selected.open_answers.length} notate · răspunsurile lăsate goale se consideră 0 puncte.
            </p>

            <div className="flex gap-4 mt-4">
              <button onClick={handleSave} disabled={saving} className="flex-1 py-3.5 rounded-xl bg-gray-900 hover:bg-gray-800 disabled:bg-gray-400 text-white text-sm font-extrabold transition-all shadow-md">
                {saving ? "Se salvează..." : "Finalizează Corectarea"}
              </button>
              <button onClick={() => setSelected(null)} disabled={saving} className="flex-1 py-3.5 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-extrabold transition-all">Anulează</button>
            </div>
          </>
        )}
      </div>
    </div>
    
  );
}