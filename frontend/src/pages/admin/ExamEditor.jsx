import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";

const API = "http://127.0.0.1:8000";
const TYPE_LABEL = { single_choice: "Single choice", multiple_choice: "Multiple choice", open_text: "Text liber" };

export default function ExamEditor() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const { addToast } = useToast();
  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [aiPanel, setAiPanel] = useState(false);
  const [aiSubject, setAiSubject] = useState("");
  const [aiCount, setAiCount] = useState(5);
  const [aiDifficulty, setAiDifficulty] = useState("medium");
  const [aiTypes, setAiTypes] = useState(["single_choice", "multiple_choice"]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState([]);

  useEffect(() => { fetchExam(); }, [examId]);
  const fetchExam = async () => {
    try { setLoading(true); const res = await axios.get(`${API}/exams/${examId}?token=${token}`); setExam(res.data); }
    catch { addToast("Eroare la încărcarea examenului", "error"); navigate("/admin/examene"); }
    finally { setLoading(false); }
  };

  const handleSaveQuestion = async (q) => {
    try {
      if (editingQuestion) { await axios.put(`${API}/exams/questions/${editingQuestion.id}?token=${token}`, { question_text: q.question_text, points: q.points, explanation: q.explanation }); addToast("Întrebare actualizată", "success"); }
      else { await axios.post(`${API}/exams/${examId}/questions?token=${token}`, q); addToast("Întrebare adăugată", "success"); }
      setShowQuestionModal(false); setEditingQuestion(null); fetchExam();
    } catch (e) { addToast(e.response?.data?.detail?.[0]?.msg || e.response?.data?.detail || "Eroare la salvare", "error"); }
  };
  const handleDeleteQuestion = async (q) => {
    if (!window.confirm("Sigur ștergi această întrebare?")) return;
    try { await axios.delete(`${API}/exams/questions/${q.id}?token=${token}`); addToast("Întrebare ștearsă", "success"); fetchExam(); }
    catch { addToast("Eroare la ștergere", "error"); }
  };
  const handlePublishExam = async () => {
    if (!exam.questions || exam.questions.length === 0) return addToast("Adaugă cel puțin o întrebare", "warning");
    try { await axios.post(`${API}/exams/${examId}/publish?token=${token}`); addToast("Examen publicat", "success"); navigate("/admin/examene"); }
    catch (e) { addToast(e.response?.data?.detail || "Eroare la publicare", "error"); }
  };
  const generateWithAI = async () => {
    if (aiSubject.trim().length < 3) return addToast("Subiectul trebuie minim 3 caractere", "warning");
    if (aiTypes.length === 0) return addToast("Alege cel puțin un tip", "warning");
    try {
      setAiLoading(true);
      const res = await axios.post(`${API}/ai/generate-exam-questions?token=${token}`, { subject: aiSubject, num_questions: aiCount, difficulty: aiDifficulty, question_types: aiTypes, language: "ro" });
      const body = res.data?.data ?? res.data;
      const questions = body?.questions || [];
      setAiSuggestions(questions); addToast(`${questions.length} întrebări generate`, "success");
    } catch (e) { addToast(e.response?.data?.detail || "Eroare la generare AI", "error"); }
    finally { setAiLoading(false); }
  };
  const addSuggestionToExam = async (s) => {
    try { await axios.post(`${API}/exams/${examId}/questions?token=${token}`, s); addToast("Adăugat la examen", "success"); setAiSuggestions(aiSuggestions.filter((x) => x !== s)); fetchExam(); }
    catch (e) { addToast(e.response?.data?.detail || "Eroare", "error"); }
  };
  const addAllSuggestions = async () => {
    let added = 0;
    for (const s of aiSuggestions) { try { await axios.post(`${API}/exams/${examId}/questions?token=${token}`, s); added++; } catch {} }
    addToast(`${added} adăugate`, "success"); setAiSuggestions([]); fetchExam();
  };
  const toggleType = (t) => setAiTypes((p) => p.includes(t) ? p.filter((x) => x !== t) : [...p, t]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-500">Se încarcă...</div>;

  return (
    <div className="min-h-screen pb-12">
      <div className="bg-white border-b px-6 py-8" style={{ borderColor: "var(--line)" }}>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <button onClick={() => navigate("/admin/examene")} className="text-xs font-semibold text-slate-400 hover:text-slate-700 mb-2 uppercase tracking-widest">← Bibliotecă examene</button>
            <h1 className="text-3xl font-extrabold text-slate-900">{exam.title}</h1>
            <div className="flex items-center gap-2 mt-3">
              <span className="tag bg-slate-100 text-slate-600 border-slate-200 metric">{exam.questions?.length || 0} întrebări</span>
              <span className="tag bg-slate-100 text-slate-600 border-slate-200 metric">{exam.duration_minutes} min</span>
              <span className={`tag ${exam.is_published ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-800 border-amber-200"}`}>{exam.is_published ? "Publicat" : "Ciornă"}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setAiPanel(!aiPanel)} className={`btn ${aiPanel ? "btn-primary" : "btn-ghost"}`}>{aiPanel ? "Închide asistent AI" : "Asistent AI"}</button>
            <button onClick={handlePublishExam} className="btn btn-primary">Salvează și publică</button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className={`${aiPanel ? "lg:col-span-2" : "lg:col-span-3"} space-y-6 transition-all`}>
          <div className="surface p-5 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Structură examen</h2>
            <button onClick={() => { setEditingQuestion(null); setShowQuestionModal(true); }} className="btn btn-primary">+ Adaugă întrebare</button>
          </div>

          {(!exam.questions || exam.questions.length === 0) ? (
            <div className="surface p-16 text-center text-slate-400">Examenul este gol. Adaugă întrebări manual sau folosește asistentul AI.</div>
          ) : (
            <div className="space-y-4">
              {exam.questions.map((q, idx) => <QuestionCard key={q.id} question={q} index={idx + 1} onEdit={() => { setEditingQuestion(q); setShowQuestionModal(true); }} onDelete={() => handleDeleteQuestion(q)} />)}
            </div>
          )}
        </div>

        {aiPanel && (
          <div className="surface p-6 h-fit lg:sticky lg:top-24">
            <h3 className="font-bold text-slate-900 text-lg mb-6 border-b pb-4" style={{ borderColor: "var(--line)" }}>Generator AI</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Subiect / tematică</label>
                <textarea rows={3} className="input resize-none" value={aiSubject} onChange={(e) => setAiSubject(e.target.value)} placeholder="ex: React Hooks, ES6..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Număr</label>
                  <input type="number" min={1} max={20} className="input" value={aiCount} onChange={(e) => setAiCount(parseInt(e.target.value) || 5)} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Dificultate</label>
                  <select className="input" value={aiDifficulty} onChange={(e) => setAiDifficulty(e.target.value)}>
                    <option value="easy">Ușor</option><option value="medium">Mediu</option><option value="hard">Dificil</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Tipuri de răspuns</label>
                <div className="flex flex-wrap gap-2">
                  {[["single_choice", "Simplu"], ["multiple_choice", "Multiplu"], ["open_text", "Text liber"]].map(([k, l]) => (
                    <button key={k} onClick={() => toggleType(k)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition border ${aiTypes.includes(k) ? "bg-slate-900 text-white border-transparent" : "bg-white text-slate-500 border-slate-200"}`}>{l}</button>
                  ))}
                </div>
              </div>
              <button onClick={generateWithAI} disabled={aiLoading || !aiSubject.trim()} className="btn btn-primary w-full">{aiLoading ? "Se procesează..." : "Generează întrebări"}</button>
            </div>

            {aiSuggestions.length > 0 && (
              <div className="mt-6 pt-5 border-t" style={{ borderColor: "var(--line)" }}>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-bold text-slate-900">Sugestii ({aiSuggestions.length})</h4>
                  <button onClick={addAllSuggestions} className="text-xs font-semibold" style={{ color: "var(--accent)" }}>+ Adaugă toate</button>
                </div>
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                  {aiSuggestions.map((s, i) => <SuggestionCard key={i} suggestion={s} onAdd={() => addSuggestionToExam(s)} onDismiss={() => setAiSuggestions(aiSuggestions.filter((x) => x !== s))} />)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {showQuestionModal && <QuestionModal existing={editingQuestion} onClose={() => { setShowQuestionModal(false); setEditingQuestion(null); }} onSave={handleSaveQuestion} />}
    </div>
  );
}

function QuestionCard({ question, index, onEdit, onDelete }) {
  const cls = { single_choice: "bg-blue-50 text-blue-700 border-blue-200", multiple_choice: "bg-violet-50 text-violet-700 border-violet-200", open_text: "bg-amber-50 text-amber-800 border-amber-200" }[question.question_type];
  return (
    <div className="surface p-6 group">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <span className="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 font-bold text-sm flex items-center justify-center metric">{index}</span>
            <span className={`tag ${cls}`}>{TYPE_LABEL[question.question_type]}</span>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest metric">{parseFloat(question.points)} pct</span>
          </div>
          <p className="text-base font-semibold text-slate-900 leading-snug">{question.question_text}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={onEdit} className="text-sm font-semibold" style={{ color: "var(--accent)" }}>Editează</button>
          <button onClick={onDelete} className="text-sm font-semibold text-rose-600">Șterge</button>
        </div>
      </div>
      {question.options && question.options.length > 0 && (
        <div className="space-y-2 mt-4 ml-11">
          {question.options.map((o) => (
            <div key={o.id} className={`flex items-center gap-3 text-sm px-4 py-2.5 rounded-xl border ${o.is_correct ? "bg-emerald-50/60 border-emerald-200 text-emerald-800 font-semibold" : "bg-white border-slate-100 text-slate-600"}`}>
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${o.is_correct ? "bg-emerald-500 text-white" : "border-2 border-slate-200"}`}>{o.is_correct ? "✓" : ""}</div>
              {o.option_text}
            </div>
          ))}
        </div>
      )}
      {question.explanation && (
        <div className="mt-4 ml-11 p-3 bg-amber-50/60 border border-amber-200 rounded-xl text-sm text-amber-800"><span className="font-bold">Explicație:</span> {question.explanation}</div>
      )}
    </div>
  );
}

function SuggestionCard({ suggestion, onAdd, onDismiss }) {
  return (
    <div className="bg-slate-50 border rounded-xl p-4" style={{ borderColor: "var(--line)" }}>
      <div className="flex items-start justify-between gap-2 mb-3 border-b pb-2" style={{ borderColor: "var(--line)" }}>
        <span className="tag bg-white text-slate-600 border-slate-200">{TYPE_LABEL[suggestion.question_type] || suggestion.question_type}</span>
        <button onClick={onDismiss} className="text-slate-400 hover:text-rose-500">✕</button>
      </div>
      <p className="text-sm font-semibold text-slate-900 mb-3">{suggestion.question_text}</p>
      {suggestion.options && (
        <div className="space-y-1.5 mb-4">
          {suggestion.options.map((o, i) => (
            <div key={i} className={`text-xs px-2.5 py-1.5 rounded-lg border flex items-center gap-2 ${o.is_correct ? "bg-emerald-50 border-emerald-200 text-emerald-700 font-semibold" : "bg-white border-slate-100 text-slate-500"}`}>
              <div className={`w-3 h-3 rounded-full flex-shrink-0 ${o.is_correct ? "bg-emerald-500" : "border border-slate-300"}`} />{o.option_text}
            </div>
          ))}
        </div>
      )}
      <button onClick={onAdd} className="btn btn-primary w-full">+ Folosește sugestia</button>
    </div>
  );
}

function QuestionModal({ existing, onClose, onSave }) {
  const isEdit = !!existing;
  const [form, setForm] = useState({
    question_text: existing?.question_text || "", question_type: existing?.question_type || "single_choice",
    points: existing?.points ? parseFloat(existing.points) : 1, explanation: existing?.explanation || "",
    options: existing?.options?.length ? existing.options.map((o) => ({ option_text: o.option_text, is_correct: o.is_correct })) : [{ option_text: "", is_correct: false }, { option_text: "", is_correct: false }],
  });

  const updateOption = (idx, field, value) => {
    const next = [...form.options]; next[idx] = { ...next[idx], [field]: value };
    if (field === "is_correct" && value && form.question_type === "single_choice") next.forEach((o, i) => { if (i !== idx) o.is_correct = false; });
    setForm({ ...form, options: next });
  };
  const addOption = () => setForm({ ...form, options: [...form.options, { option_text: "", is_correct: false }] });
  const removeOption = (idx) => form.options.length > 2 && setForm({ ...form, options: form.options.filter((_, i) => i !== idx) });
  const handleTypeChange = (t) => setForm({ ...form, question_type: t, options: t === "open_text" ? [] : form.options.length >= 2 ? form.options : [{ option_text: "", is_correct: false }, { option_text: "", is_correct: false }] });
  const handleSave = () => {
    if (form.question_text.trim().length < 5) return alert("Textul întrebării e prea scurt.");
    if (isEdit) return onSave({ question_text: form.question_text, points: form.points, explanation: form.explanation || null });
    onSave({ question_text: form.question_text, question_type: form.question_type, points: form.points, explanation: form.explanation || null, display_order: 0, options: form.options.map((o, i) => ({ option_text: o.option_text, is_correct: o.is_correct, display_order: i })) });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(15,22,34,.45)" }}>
      <div className="surface w-full max-w-2xl max-h-[90vh] overflow-y-auto p-8">
        <h2 className="text-2xl font-extrabold text-slate-900 mb-6">{isEdit ? "Editează întrebarea" : "Întrebare nouă"}</h2>
        {!isEdit && (
          <div className="mb-5">
            <label className="block text-xs font-semibold text-slate-600 mb-2">Tip format</label>
            <div className="grid grid-cols-3 gap-3">
              {[["single_choice", "Single choice"], ["multiple_choice", "Multiple"], ["open_text", "Text liber"]].map(([k, l]) => (
                <button key={k} onClick={() => handleTypeChange(k)} className={`py-2.5 rounded-xl text-xs font-bold border transition ${form.question_type === k ? "bg-slate-900 text-white border-transparent" : "bg-white border-slate-200 text-slate-500"}`}>{l}</button>
              ))}
            </div>
          </div>
        )}
        <div className="mb-5">
          <label className="block text-xs font-semibold text-slate-600 mb-2">Enunțul întrebării *</label>
          <textarea rows={3} className="input resize-none" value={form.question_text} onChange={(e) => setForm({ ...form, question_text: e.target.value })} />
        </div>
        <div className="w-1/3 mb-5">
          <label className="block text-xs font-semibold text-slate-600 mb-2">Punctaj</label>
          <input type="number" step={0.5} min={0.5} className="input" value={form.points} onChange={(e) => setForm({ ...form, points: parseFloat(e.target.value) || 1 })} />
        </div>
        {form.question_type !== "open_text" && (
          <div className="mb-6 bg-slate-50 p-5 rounded-xl border" style={{ borderColor: "var(--line)" }}>
            <div className="flex items-center justify-between mb-4">
              <label className="text-xs font-bold text-slate-900 uppercase tracking-wider">Variante răspuns</label>
              <button onClick={addOption} className="btn btn-ghost px-3 py-1.5">+ Variantă</button>
            </div>
            <div className="space-y-3">
              {form.options.map((o, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="flex items-center justify-center bg-white border rounded-lg w-10 h-10 flex-shrink-0" style={{ borderColor: "var(--line)" }}>
                    <input type={form.question_type === "single_choice" ? "radio" : "checkbox"} checked={o.is_correct} onChange={(e) => updateOption(i, "is_correct", e.target.checked)} className="w-4 h-4" style={{ accentColor: "var(--accent)" }} />
                  </div>
                  <input className="input flex-1" value={o.option_text} onChange={(e) => updateOption(i, "option_text", e.target.value)} placeholder={`Opțiune ${i + 1}`} />
                  {form.options.length > 2 && <button onClick={() => removeOption(i)} className="w-10 h-10 rounded-xl bg-white border text-rose-500 flex-shrink-0" style={{ borderColor: "var(--line)" }}>✕</button>}
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="mb-8">
          <label className="block text-xs font-semibold text-slate-600 mb-2">Explicație (opțional)</label>
          <textarea rows={2} className="input resize-none" value={form.explanation} onChange={(e) => setForm({ ...form, explanation: e.target.value })} placeholder="Afișată după ce studenții răspund" />
        </div>
        <div className="flex gap-3">
          <button onClick={handleSave} className="btn btn-primary flex-1">{isEdit ? "Salvează" : "Salvează întrebarea"}</button>
          <button onClick={onClose} className="btn btn-ghost flex-1">Anulează</button>
        </div>
      </div>
    </div>
  );
}