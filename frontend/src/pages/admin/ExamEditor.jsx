import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";

const API = "http://127.0.0.1:8000";

export default function ExamEditor() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const { addToast } = useToast();

  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);

  // AI Assistant State
  const [aiPanel, setAiPanel] = useState(false);
  const [aiSubject, setAiSubject] = useState("");
  const [aiCount, setAiCount] = useState(5);
  const [aiDifficulty, setAiDifficulty] = useState("medium");
  const [aiTypes, setAiTypes] = useState(["single_choice", "multiple_choice"]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState([]);

  useEffect(() => { fetchExam(); }, [examId]);

  const fetchExam = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API}/exams/${examId}?token=${token}`);
      setExam(res.data);
    } catch {
      addToast("Eroare la încărcarea examenului", "error");
      navigate("/admin/examene");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveQuestion = async (questionData) => {
    try {
      if (editingQuestion) {
        await axios.put(`${API}/exams/questions/${editingQuestion.id}?token=${token}`, { question_text: questionData.question_text, points: questionData.points, explanation: questionData.explanation });
        addToast("Întrebare actualizată", "success");
      } else {
        await axios.post(`${API}/exams/${examId}/questions?token=${token}`, questionData);
        addToast("Întrebare adăugată!", "success");
      }
      setShowQuestionModal(false); setEditingQuestion(null); fetchExam();
    } catch (e) {
      addToast(e.response?.data?.detail?.[0]?.msg || e.response?.data?.detail || "Eroare la salvare", "error");
    }
  };

  const handleDeleteQuestion = async (q) => {
    if (!window.confirm("Sigur ștergi această întrebare?")) return;
    try {
      await axios.delete(`${API}/exams/questions/${q.id}?token=${token}`);
      addToast("Întrebare ștearsă", "success"); fetchExam();
    } catch { addToast("Eroare la ștergere", "error"); }
  };

  const generateWithAI = async () => {
    if (aiSubject.trim().length < 3) return addToast("Subiectul trebuie minim 3 caractere", "warning");
    if (aiTypes.length === 0) return addToast("Alege cel puțin un tip de întrebare", "warning");
    try {
      setAiLoading(true);
      const res = await axios.post(`${API}/ai/generate-exam-questions?token=${token}`, { subject: aiSubject, num_questions: aiCount, difficulty: aiDifficulty, question_types: aiTypes, language: "ro" });
      setAiSuggestions(res.data.questions || []);
      addToast(`${res.data.count} întrebări generate!`, "success");
    } catch (e) { addToast(e.response?.data?.detail || "Eroare la generare AI", "error"); } finally { setAiLoading(false); }
  };

  const addSuggestionToExam = async (suggestion) => {
    try {
      await axios.post(`${API}/exams/${examId}/questions?token=${token}`, suggestion);
      addToast("Adăugat la examen!", "success");
      setAiSuggestions(aiSuggestions.filter((s) => s !== suggestion)); fetchExam();
    } catch (e) { addToast(e.response?.data?.detail || "Eroare", "error"); }
  };

  const addAllSuggestions = async () => {
    let added = 0;
    for (const s of aiSuggestions) {
      try { await axios.post(`${API}/exams/${examId}/questions?token=${token}`, s); added++; } catch {}
    }
    addToast(`${added} adăugate`, "success"); setAiSuggestions([]); fetchExam();
  };

  const toggleType = (t) => setAiTypes((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]);

  if (loading) return <div className="min-h-screen bg-gray-50 flex justify-center items-center"><div className="w-10 h-10 border-4 border-cyan-200 border-t-cyan-500 rounded-full animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-12 animate-in fade-in">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-8 relative overflow-hidden mb-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <button onClick={() => navigate("/admin/examene")} className="text-xs font-bold text-gray-400 hover:text-cyan-600 mb-2 transition flex items-center gap-1 uppercase tracking-widest">
              <span>←</span> Bibliotecă Examene
            </button>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">{exam.title}</h1>
            <div className="flex items-center gap-3 mt-3">
              <span className="px-2.5 py-1 bg-gray-100 text-gray-600 text-xs font-bold rounded-lg border border-gray-200">
                {exam.questions?.length || 0} Întrebări
              </span>
              <span className="px-2.5 py-1 bg-gray-100 text-gray-600 text-xs font-bold rounded-lg border border-gray-200">
                ⏱ {exam.duration_minutes} min
              </span>
              <span className={`px-2.5 py-1 text-xs font-bold rounded-lg ${exam.is_published ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                {exam.is_published ? "✓ Publicat" : "📝 Ciornă"}
              </span>
            </div>
          </div>
          <button
            onClick={() => setAiPanel(!aiPanel)}
            className={`px-5 py-3 rounded-xl text-sm font-extrabold transition-all shadow-sm flex items-center gap-2 ${
              aiPanel ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20" : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-100"
            }`}
          >
            <span>✨</span> {aiPanel ? "Închide Asistent AI" : "Deschide Asistent AI"}
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Editor Area */}
        <div className={`${aiPanel ? "lg:col-span-2" : "lg:col-span-3"} space-y-6 transition-all duration-300`}>
          <div className="flex items-center justify-between bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
            <h2 className="text-xl font-extrabold text-gray-900">Structură Examen</h2>
            <button onClick={() => { setEditingQuestion(null); setShowQuestionModal(true); }} className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-600 text-white text-sm font-bold transition shadow-md shadow-cyan-500/20">
              + Adaugă Întrebare
            </button>
          </div>

          {(!exam.questions || exam.questions.length === 0) ? (
            <div className="bg-white border border-gray-100 rounded-3xl p-16 text-center shadow-sm">
              <div className="text-5xl mb-4 opacity-50">📋</div>
              <p className="text-gray-900 font-bold text-lg mb-2">Examenul este gol</p>
              <p className="text-gray-500 text-sm max-w-sm mx-auto">Începe prin a adăuga manual întrebări sau folosește asistentul AI din colțul dreapta-sus pentru a genera automat conținut.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {exam.questions.map((q, idx) => (
                <QuestionCard key={q.id} question={q} index={idx + 1} onEdit={() => { setEditingQuestion(q); setShowQuestionModal(true); }} onDelete={() => handleDeleteQuestion(q)} />
              ))}
            </div>
          )}
        </div>

        {/* AI Panel */}
        {aiPanel && (
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 rounded-3xl p-6 shadow-xl shadow-indigo-100/50 h-fit lg:sticky lg:top-24 animate-in slide-in-from-right-8">
            <div className="flex items-center gap-3 mb-6 border-b border-indigo-100/50 pb-4">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-xl shadow-sm border border-indigo-50">✨</div>
              <h3 className="font-extrabold text-indigo-900 text-lg">Generator AI</h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-indigo-900 uppercase tracking-wider mb-2 ml-1">Subiect / Tematică</label>
                <textarea
                  value={aiSubject} onChange={(e) => setAiSubject(e.target.value)} rows={3}
                  placeholder="ex: React Hooks, JavaScript ES6..."
                  className="w-full bg-white border border-indigo-100 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 resize-none shadow-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-indigo-900 uppercase tracking-wider mb-2 ml-1">Număr</label>
                  <input type="number" min={1} max={20} value={aiCount} onChange={(e) => setAiCount(parseInt(e.target.value) || 5)} className="w-full bg-white border border-indigo-100 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 shadow-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-indigo-900 uppercase tracking-wider mb-2 ml-1">Dificultate</label>
                  <select value={aiDifficulty} onChange={(e) => setAiDifficulty(e.target.value)} className="w-full bg-white border border-indigo-100 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 shadow-sm">
                    <option value="easy">Ușor</option>
                    <option value="medium">Mediu</option>
                    <option value="hard">Dificil</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-indigo-900 uppercase tracking-wider mb-2 ml-1">Tipuri de Răspuns</label>
                <div className="flex flex-wrap gap-2">
                  {[{ k: "single_choice", l: "Single" }, { k: "multiple_choice", l: "Multiple" }, { k: "open_text", l: "Text Liber" }].map(({ k, l }) => (
                    <button
                      key={k} onClick={() => toggleType(k)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm ${aiTypes.includes(k) ? "bg-indigo-600 text-white" : "bg-white text-gray-500 border border-gray-200 hover:border-indigo-200 hover:text-indigo-600"}`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              <button onClick={generateWithAI} disabled={aiLoading || !aiSubject.trim()} className="w-full py-3.5 rounded-xl bg-gray-900 hover:bg-gray-800 disabled:bg-gray-400 text-white text-sm font-extrabold transition-all shadow-md mt-2 flex items-center justify-center gap-2">
                {aiLoading ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Se procesează...</> : "Generează Întrebări"}
              </button>
            </div>

            {aiSuggestions.length > 0 && (
              <div className="mt-6 pt-5 border-t border-indigo-200/50">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-extrabold text-indigo-900">Sugestii ({aiSuggestions.length})</h4>
                  <button onClick={addAllSuggestions} className="text-xs font-bold text-indigo-600 bg-indigo-100 px-3 py-1 rounded-lg hover:bg-indigo-200 transition-colors">
                    + Adaugă Toate
                  </button>
                </div>
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
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

// ─── Sub-Components ──────────────────────────────────────────

function QuestionCard({ question, index, onEdit, onDelete }) {
  const typeLabel = { single_choice: "Single Choice", multiple_choice: "Multiple Choice", open_text: "Text Liber" }[question.question_type];
  const typeColor = { single_choice: "bg-blue-50 text-blue-700 border-blue-100", multiple_choice: "bg-purple-50 text-purple-700 border-purple-100", open_text: "bg-amber-50 text-amber-700 border-amber-100" }[question.question_type];

  return (
    <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow group">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <span className="w-8 h-8 rounded-lg bg-gray-100 text-gray-500 font-black text-sm flex items-center justify-center">#{index}</span>
            <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${typeColor}`}>{typeLabel}</span>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{parseFloat(question.points)} Puncte</span>
          </div>
          <p className="text-base font-bold text-gray-900 leading-snug">{question.question_text}</p>
        </div>
        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={onEdit} className="p-2.5 rounded-xl bg-gray-50 hover:bg-cyan-50 hover:text-cyan-600 text-gray-400 font-bold transition border border-gray-100">✏️</button>
          <button onClick={onDelete} className="p-2.5 rounded-xl bg-gray-50 hover:bg-red-50 hover:text-red-600 text-gray-400 font-bold transition border border-gray-100">🗑️</button>
        </div>
      </div>

      {question.options && question.options.length > 0 && (
        <div className="space-y-2 mt-4 ml-11">
          {question.options.map((o) => (
            <div key={o.id} className={`flex items-center gap-3 text-sm px-4 py-2.5 rounded-xl border ${o.is_correct ? "bg-green-50/50 border-green-200 text-green-800 font-semibold" : "bg-white border-gray-100 text-gray-600"}`}>
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${o.is_correct ? "bg-green-500 text-white" : "border-2 border-gray-200"}`}>{o.is_correct ? "✓" : ""}</div>
              <span>{o.option_text}</span>
            </div>
          ))}
        </div>
      )}

      {question.explanation && (
        <div className="mt-4 ml-11 p-3 bg-amber-50/50 border border-amber-100 rounded-xl text-sm text-amber-800 flex items-start gap-2">
          <span className="text-lg leading-none">💡</span>
          <p><span className="font-bold">Explicație:</span> {question.explanation}</p>
        </div>
      )}
    </div>
  );
}

function SuggestionCard({ suggestion, onAdd, onDismiss }) {
  return (
    <div className="bg-white border border-indigo-100 rounded-2xl p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2 mb-3 border-b border-gray-50 pb-2">
        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-600 border border-indigo-100">{suggestion.question_type}</span>
        <button onClick={onDismiss} className="text-gray-400 hover:text-red-500 transition">✕</button>
      </div>
      <p className="text-sm font-bold text-gray-900 mb-3">{suggestion.question_text}</p>
      {suggestion.options && (
        <div className="space-y-1.5 mb-4">
          {suggestion.options.map((o, i) => (
            <div key={i} className={`text-xs px-2.5 py-1.5 rounded-lg border flex items-center gap-2 ${o.is_correct ? "bg-green-50 border-green-100 text-green-700 font-semibold" : "bg-gray-50 border-gray-100 text-gray-500"}`}>
              <div className={`w-3 h-3 rounded-full flex-shrink-0 ${o.is_correct ? "bg-green-500" : "border border-gray-300"}`} />
              {o.option_text}
            </div>
          ))}
        </div>
      )}
      <button onClick={onAdd} className="w-full py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 text-xs font-bold transition shadow-md shadow-indigo-600/20">+ Folosește Sugestia</button>
    </div>
  );
}

function QuestionModal({ existing, onClose, onSave }) {
  const isEdit = !!existing;
  const [form, setForm] = useState({
    question_text: existing?.question_text || "", question_type: existing?.question_type || "single_choice", points: existing?.points ? parseFloat(existing.points) : 1, explanation: existing?.explanation || "",
    options: existing?.options?.length ? existing.options.map((o) => ({ option_text: o.option_text, is_correct: o.is_correct })) : [{ option_text: "", is_correct: false }, { option_text: "", is_correct: false }],
  });

  const updateOption = (idx, field, value) => {
    const next = [...form.options]; next[idx] = { ...next[idx], [field]: value };
    if (field === "is_correct" && value && form.question_type === "single_choice") next.forEach((o, i) => { if (i !== idx) o.is_correct = false; });
    setForm({ ...form, options: next });
  };
  const addOption = () => setForm({ ...form, options: [...form.options, { option_text: "", is_correct: false }] });
  const removeOption = (idx) => form.options.length > 2 && setForm({ ...form, options: form.options.filter((_, i) => i !== idx) });
  const handleTypeChange = (newType) => setForm({ ...form, question_type: newType, options: newType === "open_text" ? [] : form.options.length >= 2 ? form.options : [{ option_text: "", is_correct: false }, { option_text: "", is_correct: false }] });

  const handleSave = () => {
    if (form.question_text.trim().length < 5) return alert("Textul întrebării e prea scurt.");
    if (isEdit) return onSave({ question_text: form.question_text, points: form.points, explanation: form.explanation || null });
    onSave({ question_text: form.question_text, question_type: form.question_type, points: form.points, explanation: form.explanation || null, display_order: 0, options: form.options.map((o, i) => ({ option_text: o.option_text, is_correct: o.is_correct, display_order: i })) });
  };

  return (
    <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-gray-100 rounded-3xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95">
        <h2 className="text-2xl font-extrabold text-gray-900 mb-6">{isEdit ? "Editează Întrebarea" : "Creează Întrebare Nouă"}</h2>

        {!isEdit && (
          <div className="mb-5">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Tip Format</label>
            <div className="grid grid-cols-3 gap-3">
              {[{ k: "single_choice", l: "Single Choice" }, { k: "multiple_choice", l: "Multiple" }, { k: "open_text", l: "Text Liber" }].map(({ k, l }) => (
                <button key={k} onClick={() => handleTypeChange(k)} className={`py-2.5 rounded-xl text-xs font-bold transition-all border ${form.question_type === k ? "bg-cyan-50 border-cyan-200 text-cyan-700 shadow-sm" : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mb-5">
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Enunțul Întrebării *</label>
          <textarea value={form.question_text} onChange={(e) => setForm({ ...form, question_text: e.target.value })} rows={3} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-100 resize-none transition-all" />
        </div>

        <div className="w-1/3 mb-5">
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Punctaj</label>
          <input type="number" step={0.5} min={0.5} value={form.points} onChange={(e) => setForm({ ...form, points: parseFloat(e.target.value) || 1 })} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-100 transition-all" />
        </div>

        {form.question_type !== "open_text" && (
          <div className="mb-6 bg-gray-50 p-5 rounded-2xl border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <label className="text-xs font-bold text-gray-900 uppercase tracking-wider">Variante Răspuns</label>
              <button onClick={addOption} className="text-xs font-bold bg-white border border-gray-200 px-3 py-1.5 rounded-lg text-cyan-600 hover:border-cyan-200 shadow-sm transition-all">+ Adaugă Variantă</button>
            </div>
            <div className="space-y-3">
              {form.options.map((o, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="flex items-center justify-center bg-white border border-gray-200 rounded-lg w-10 h-10 flex-shrink-0 cursor-pointer shadow-sm hover:border-cyan-300">
                    <input type={form.question_type === "single_choice" ? "radio" : "checkbox"} checked={o.is_correct} onChange={(e) => updateOption(i, "is_correct", e.target.checked)} className="w-4 h-4 accent-cyan-500" />
                  </div>
                  <input type="text" value={o.option_text} onChange={(e) => updateOption(i, "option_text", e.target.value)} placeholder={`Opțiune ${i + 1}`} className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-cyan-400 transition-all shadow-sm" />
                  {form.options.length > 2 && <button onClick={() => removeOption(i)} className="w-10 h-10 rounded-xl bg-white border border-gray-200 text-red-500 hover:bg-red-50 transition-all shadow-sm">✕</button>}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mb-8">
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Explicație (Opțional)</label>
          <textarea value={form.explanation} onChange={(e) => setForm({ ...form, explanation: e.target.value })} rows={2} placeholder="Afișată elevilor după ce răspund" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-100 resize-none transition-all" />
        </div>

        <div className="flex gap-4">
          <button onClick={handleSave} className="flex-1 py-3.5 rounded-xl bg-gray-900 hover:bg-gray-800 text-white text-sm font-extrabold transition-all shadow-md shadow-gray-900/10">{isEdit ? "Salvează Modificările" : "Salvează Întrebarea"}</button>
          <button onClick={onClose} className="flex-1 py-3.5 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-extrabold transition-all">Anulează</button>
        </div>
      </div>
    </div>
  );
}