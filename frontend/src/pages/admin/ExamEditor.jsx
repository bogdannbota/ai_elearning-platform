import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";

const API = "http://127.0.0.1:8000";

// ─── Builder Examen ─────────────────────────────────────────
export default function ExamEditor() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const { addToast } = useToast();

  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);

  // ─── AI Assistant State ─────────────────
  const [aiPanel, setAiPanel] = useState(false);
  const [aiSubject, setAiSubject] = useState("");
  const [aiCount, setAiCount] = useState(5);
  const [aiDifficulty, setAiDifficulty] = useState("medium");
  const [aiTypes, setAiTypes] = useState(["single_choice", "multiple_choice"]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState([]);

  useEffect(() => {
    fetchExam();
  }, [examId]);

  const fetchExam = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API}/exams/${examId}?token=${token}`);
      setExam(res.data);
    } catch (e) {
      addToast("Eroare la încărcarea examenului", "error");
      navigate("/admin/examene");
    } finally {
      setLoading(false);
    }
  };

  // ─── Adăugare/editare întrebare ─────────
  const handleSaveQuestion = async (questionData) => {
    try {
      if (editingQuestion) {
        // Update
        await axios.put(
          `${API}/exams/questions/${editingQuestion.id}?token=${token}`,
          {
            question_text: questionData.question_text,
            points: questionData.points,
            explanation: questionData.explanation,
          }
        );
        addToast("Întrebare actualizată", "success");
      } else {
        // Create
        await axios.post(
          `${API}/exams/${examId}/questions?token=${token}`,
          questionData
        );
        addToast("Întrebare adăugată!", "success");
      }
      setShowQuestionModal(false);
      setEditingQuestion(null);
      fetchExam();
    } catch (e) {
      addToast(
        e.response?.data?.detail?.[0]?.msg ||
          e.response?.data?.detail ||
          "Eroare la salvare",
        "error"
      );
    }
  };

  const handleDeleteQuestion = async (q) => {
    if (!window.confirm("Sigur ștergi această întrebare?")) return;
    try {
      await axios.delete(`${API}/exams/questions/${q.id}?token=${token}`);
      addToast("Întrebare ștearsă", "success");
      fetchExam();
    } catch {
      addToast("Eroare la ștergere", "error");
    }
  };

  // ─── AI: Generare sugestii ──────────────
  const generateWithAI = async () => {
    if (aiSubject.trim().length < 3) {
      addToast("Subiectul trebuie minim 3 caractere", "error");
      return;
    }
    if (aiTypes.length === 0) {
      addToast("Alege cel puțin un tip de întrebare", "error");
      return;
    }
    try {
      setAiLoading(true);
      const res = await axios.post(
        `${API}/ai/generate-exam-questions?token=${token}`,
        {
          subject: aiSubject,
          num_questions: aiCount,
          difficulty: aiDifficulty,
          question_types: aiTypes,
          language: "ro",
        }
      );
      setAiSuggestions(res.data.questions || []);
      addToast(`${res.data.count} întrebări generate!`, "success");
    } catch (e) {
      addToast(e.response?.data?.detail || "Eroare la generare AI", "error");
    } finally {
      setAiLoading(false);
    }
  };

  const addSuggestionToExam = async (suggestion) => {
    try {
      await axios.post(
        `${API}/exams/${examId}/questions?token=${token}`,
        suggestion
      );
      addToast("Adăugat la examen!", "success");
      // scoatem sugestia din listă
      setAiSuggestions(aiSuggestions.filter((s) => s !== suggestion));
      fetchExam();
    } catch (e) {
      addToast(
        e.response?.data?.detail?.[0]?.msg ||
          e.response?.data?.detail ||
          "Eroare",
        "error"
      );
    }
  };

  const addAllSuggestions = async () => {
    let added = 0;
    for (const s of aiSuggestions) {
      try {
        await axios.post(
          `${API}/exams/${examId}/questions?token=${token}`,
          s
        );
        added++;
      } catch {
        // ignorăm greșelile individuale
      }
    }
    addToast(`${added} / ${aiSuggestions.length} adăugate`, "success");
    setAiSuggestions([]);
    fetchExam();
  };

  const toggleType = (t) => {
    setAiTypes((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="bg-gradient-to-br from-gray-900 via-indigo-950/20 to-gray-900 border-b border-white/5 px-6 py-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <button
              onClick={() => navigate("/admin/examene")}
              className="text-xs text-gray-400 hover:text-white mb-1 transition"
            >
              ← Înapoi la examene
            </button>
            <h1 className="text-2xl font-bold truncate">{exam.title}</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              {exam.questions?.length || 0} întrebări · {exam.duration_minutes} min ·{" "}
              {exam.is_published ? "Publicat" : "Ciornă"}
            </p>
          </div>
          <button
            onClick={() => setAiPanel(!aiPanel)}
            className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition flex items-center gap-2 ${
              aiPanel
                ? "bg-purple-600 text-white"
                : "bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 border border-purple-500/30"
            }`}
          >
            🤖 Asistent AI
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stânga: Lista întrebări */}
        <div className={`${aiPanel ? "lg:col-span-2" : "lg:col-span-3"} space-y-4`}>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Întrebări</h2>
            <button
              onClick={() => {
                setEditingQuestion(null);
                setShowQuestionModal(true);
              }}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition"
            >
              + Adaugă întrebare
            </button>
          </div>

          {(!exam.questions || exam.questions.length === 0) ? (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center">
              <div className="text-4xl mb-3">📋</div>
              <p className="text-gray-400 text-sm mb-2">Nu există întrebări încă.</p>
              <p className="text-xs text-gray-500">
                Adaugă manual sau folosește Asistentul AI →
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {exam.questions.map((q, idx) => (
                <QuestionCard
                  key={q.id}
                  question={q}
                  index={idx + 1}
                  onEdit={() => {
                    setEditingQuestion(q);
                    setShowQuestionModal(true);
                  }}
                  onDelete={() => handleDeleteQuestion(q)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Dreapta: Panou AI */}
        {aiPanel && (
          <div className="bg-purple-500/5 border border-purple-500/20 rounded-2xl p-5 h-fit lg:sticky lg:top-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xl">🤖</span>
              <h3 className="font-semibold">Asistent AI (Groq)</h3>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Subiect / tematică *</label>
                <textarea
                  value={aiSubject}
                  onChange={(e) => setAiSubject(e.target.value)}
                  rows={3}
                  placeholder="ex: Bazele HTML5, structura paginii, taguri semantice..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">Număr</label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={aiCount}
                    onChange={(e) => setAiCount(parseInt(e.target.value) || 5)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500/50"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">Dificultate</label>
                  <select
                    value={aiDifficulty}
                    onChange={(e) => setAiDifficulty(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500/50"
                  >
                    <option value="easy">Ușor</option>
                    <option value="medium">Mediu</option>
                    <option value="hard">Dificil</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Tipuri permise</label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { k: "single_choice", l: "Single" },
                    { k: "multiple_choice", l: "Multiple" },
                    { k: "open_text", l: "Text liber" },
                  ].map(({ k, l }) => (
                    <button
                      key={k}
                      onClick={() => toggleType(k)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                        aiTypes.includes(k)
                          ? "bg-purple-500/30 text-purple-200 border border-purple-500/50"
                          : "bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10"
                      }`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={generateWithAI}
                disabled={aiLoading || !aiSubject.trim()}
                className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:bg-purple-600/30 text-white text-sm font-semibold transition flex items-center justify-center gap-2"
              >
                {aiLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Generez...
                  </>
                ) : (
                  <>✨ Generează</>
                )}
              </button>
            </div>

            {/* Sugestii */}
            {aiSuggestions.length > 0 && (
              <div className="mt-5 pt-5 border-t border-purple-500/20">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold">
                    Sugestii ({aiSuggestions.length})
                  </h4>
                  <button
                    onClick={addAllSuggestions}
                    className="text-xs text-purple-300 hover:text-purple-200 font-medium"
                  >
                    + Adaugă toate
                  </button>
                </div>

                <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                  {aiSuggestions.map((s, i) => (
                    <SuggestionCard
                      key={i}
                      suggestion={s}
                      onAdd={() => addSuggestionToExam(s)}
                      onDismiss={() =>
                        setAiSuggestions(aiSuggestions.filter((x) => x !== s))
                      }
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal Adăugare/Editare întrebare */}
      {showQuestionModal && (
        <QuestionModal
          existing={editingQuestion}
          onClose={() => {
            setShowQuestionModal(false);
            setEditingQuestion(null);
          }}
          onSave={handleSaveQuestion}
        />
      )}
    </div>
  );
}

// ─── Card întrebare ─────────────────────────────────────────
function QuestionCard({ question, index, onEdit, onDelete }) {
  const typeLabel = {
    single_choice: "Un singur răspuns",
    multiple_choice: "Mai multe răspunsuri",
    open_text: "Text liber",
  }[question.question_type];

  const typeColor = {
    single_choice: "bg-blue-500/20 text-blue-300",
    multiple_choice: "bg-purple-500/20 text-purple-300",
    open_text: "bg-amber-500/20 text-amber-300",
  }[question.question_type];

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 hover:border-white/20 transition">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs text-gray-500">#{index}</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${typeColor}`}>
              {typeLabel}
            </span>
            <span className="text-xs text-gray-500">
              {parseFloat(question.points)} pct
            </span>
          </div>
          <p className="text-sm text-white">{question.question_text}</p>
        </div>
        <div className="flex gap-1.5 flex-shrink-0">
          <button
            onClick={onEdit}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition"
            title="Editează"
          >
            ✏️
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition"
            title="Șterge"
          >
            🗑️
          </button>
        </div>
      </div>

      {question.options && question.options.length > 0 && (
        <div className="space-y-1.5 mt-3">
          {question.options.map((o) => (
            <div
              key={o.id}
              className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg ${
                o.is_correct
                  ? "bg-green-500/10 text-green-300 border border-green-500/20"
                  : "bg-white/5 text-gray-400 border border-white/5"
              }`}
            >
              <span>{o.is_correct ? "✓" : "○"}</span>
              <span>{o.option_text}</span>
            </div>
          ))}
        </div>
      )}

      {question.explanation && (
        <p className="text-xs text-gray-500 italic mt-3 pl-2 border-l-2 border-white/10">
          💡 {question.explanation}
        </p>
      )}
    </div>
  );
}

// ─── Card sugestie AI ───────────────────────────────────────
function SuggestionCard({ suggestion, onAdd, onDismiss }) {
  const typeLabel = {
    single_choice: "Single",
    multiple_choice: "Multiple",
    open_text: "Text",
  }[suggestion.question_type];

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-3">
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-purple-500/20 text-purple-300">
          {typeLabel}
        </span>
        <button
          onClick={onDismiss}
          className="text-xs text-gray-500 hover:text-red-400 transition"
        >
          ✕
        </button>
      </div>
      <p className="text-xs text-white mb-2 line-clamp-3">{suggestion.question_text}</p>

      {suggestion.options && suggestion.options.length > 0 && (
        <div className="space-y-1 mb-2">
          {suggestion.options.map((o, i) => (
            <div
              key={i}
              className={`text-xs px-2 py-1 rounded ${
                o.is_correct
                  ? "bg-green-500/10 text-green-300"
                  : "bg-white/5 text-gray-400"
              }`}
            >
              {o.is_correct ? "✓" : "○"} {o.option_text}
            </div>
          ))}
        </div>
      )}

      <button
        onClick={onAdd}
        className="w-full py-1.5 rounded-lg bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 text-xs font-semibold transition"
      >
        + Adaugă la examen
      </button>
    </div>
  );
}

// ─── Modal întrebare ────────────────────────────────────────
function QuestionModal({ existing, onClose, onSave }) {
  const isEdit = !!existing;
  const [form, setForm] = useState({
    question_text: existing?.question_text || "",
    question_type: existing?.question_type || "single_choice",
    points: existing?.points ? parseFloat(existing.points) : 1,
    explanation: existing?.explanation || "",
    options: existing?.options?.length
      ? existing.options.map((o) => ({
          option_text: o.option_text,
          is_correct: o.is_correct,
        }))
      : [
          { option_text: "", is_correct: false },
          { option_text: "", is_correct: false },
        ],
  });

  const updateOption = (idx, field, value) => {
    const next = [...form.options];
    next[idx] = { ...next[idx], [field]: value };

    // Pentru single_choice: doar una poate fi corectă
    if (field === "is_correct" && value && form.question_type === "single_choice") {
      next.forEach((o, i) => {
        if (i !== idx) o.is_correct = false;
      });
    }
    setForm({ ...form, options: next });
  };

  const addOption = () => {
    setForm({
      ...form,
      options: [...form.options, { option_text: "", is_correct: false }],
    });
  };

  const removeOption = (idx) => {
    if (form.options.length <= 2) return;
    setForm({ ...form, options: form.options.filter((_, i) => i !== idx) });
  };

  const handleTypeChange = (newType) => {
    if (newType === "open_text") {
      setForm({ ...form, question_type: newType, options: [] });
    } else {
      setForm({
        ...form,
        question_type: newType,
        options:
          form.options.length >= 2
            ? form.options
            : [
                { option_text: "", is_correct: false },
                { option_text: "", is_correct: false },
              ],
      });
    }
  };

  const handleSave = () => {
    if (form.question_text.trim().length < 5) {
      alert("Textul întrebării e prea scurt.");
      return;
    }

    if (isEdit) {
      // La edit nu trimitem options (avem endpoint separat dacă vrem)
      onSave({
        question_text: form.question_text,
        points: form.points,
        explanation: form.explanation || null,
      });
      return;
    }

    // Create - trimitem tot
    const payload = {
      question_text: form.question_text,
      question_type: form.question_type,
      points: form.points,
      explanation: form.explanation || null,
      display_order: 0,
      options: form.options.map((o, i) => ({
        option_text: o.option_text,
        is_correct: o.is_correct,
        display_order: i,
      })),
    };
    onSave(payload);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-white/10 rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">
          {isEdit ? "Editează întrebarea" : "Întrebare nouă"}
        </h2>

        {/* Tip */}
        {!isEdit && (
          <div className="mb-4">
            <label className="block text-xs text-gray-400 mb-2">Tip întrebare</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { k: "single_choice", l: "Un răspuns", icon: "◯" },
                { k: "multiple_choice", l: "Mai multe", icon: "☐" },
                { k: "open_text", l: "Text liber", icon: "✎" },
              ].map(({ k, l, icon }) => (
                <button
                  key={k}
                  onClick={() => handleTypeChange(k)}
                  className={`py-2 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 ${
                    form.question_type === k
                      ? "bg-blue-600 text-white"
                      : "bg-white/5 text-gray-400 hover:bg-white/10 border border-white/10"
                  }`}
                >
                  <span>{icon}</span> {l}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Text */}
        <div className="mb-4">
          <label className="block text-xs text-gray-400 mb-1.5">Text întrebare *</label>
          <textarea
            value={form.question_text}
            onChange={(e) => setForm({ ...form, question_text: e.target.value })}
            rows={3}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/50 resize-none"
          />
        </div>

        {/* Puncte */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Puncte</label>
            <input
              type="number"
              step={0.5}
              min={0.5}
              value={form.points}
              onChange={(e) => setForm({ ...form, points: parseFloat(e.target.value) || 1 })}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/50"
            />
          </div>
        </div>

        {/* Opțiuni - doar pentru choice */}
        {form.question_type !== "open_text" && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-gray-400">
                Opțiuni{" "}
                <span className="text-gray-600">
                  ({form.question_type === "single_choice" ? "bifează doar 1 corect" : "bifează toate corecte"})
                </span>
              </label>
              <button
                onClick={addOption}
                className="text-xs text-blue-400 hover:text-blue-300 font-medium"
              >
                + Adaugă opțiune
              </button>
            </div>

            <div className="space-y-2">
              {form.options.map((o, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type={form.question_type === "single_choice" ? "radio" : "checkbox"}
                    checked={o.is_correct}
                    onChange={(e) => updateOption(i, "is_correct", e.target.checked)}
                    className="w-4 h-4"
                  />
                  <input
                    type="text"
                    value={o.option_text}
                    onChange={(e) => updateOption(i, "option_text", e.target.value)}
                    placeholder={`Opțiune ${i + 1}`}
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50"
                  />
                  {form.options.length > 2 && (
                    <button
                      onClick={() => removeOption(i)}
                      className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Explicație */}
        <div className="mb-5">
          <label className="block text-xs text-gray-400 mb-1.5">
            Explicație (opțional, afișată după răspuns)
          </label>
          <textarea
            value={form.explanation}
            onChange={(e) => setForm({ ...form, explanation: e.target.value })}
            rows={2}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/50 resize-none"
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-sm font-semibold transition border border-white/10"
          >
            Anulează
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition"
          >
            {isEdit ? "Salvează" : "Adaugă întrebarea"}
          </button>
        </div>
      </div>
    </div>
  );
}
