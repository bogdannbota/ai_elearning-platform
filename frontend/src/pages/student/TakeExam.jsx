import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";

const API = "http://127.0.0.1:8000";

// ─── Format timp mm:ss ───────────────────────────────────────
function fmt(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function TakeExam() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const { addToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [attemptId, setAttemptId] = useState(null);
  const [exam, setExam] = useState(null);
  const [answers, setAnswers] = useState({}); // { [questionId]: [optionId,...] | "text" }
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);

  const submittedRef = useRef(false);

  // ─── Start attempt ─────────────────────────────────────────
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        const res = await axios.post(`${API}/exams/${examId}/start?token=${token}`);
        if (!active) return;
        setAttemptId(res.data.attempt_id);
        setExam(res.data.exam);
        setTimeLeft((res.data.exam.duration_minutes || 30) * 60);
      } catch (e) {
        addToast(e.response?.data?.detail || "Nu se poate începe examenul", "error");
        navigate("/my-exams");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [examId]);

  // ─── Submit (memoizat pt. timer auto-submit) ───────────────
  const handleSubmit = useCallback(async (auto = false) => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setSubmitting(true);

    const payload = {
      answers: (exam?.questions || []).map((q) => {
        const a = answers[q.id];
        if (q.question_type === "open_text") {
          return { question_id: q.id, text_answer: typeof a === "string" ? a : "" };
        }
        return { question_id: q.id, selected_option_ids: Array.isArray(a) ? a : [] };
      }),
    };

    try {
      const res = await axios.post(
        `${API}/exams/attempts/${attemptId}/submit?token=${token}`,
        payload
      );
      setResult(res.data);
      if (auto) addToast("Timpul a expirat — examen trimis automat", "warning");
    } catch (e) {
      submittedRef.current = false;
      addToast(e.response?.data?.detail || "Eroare la trimitere", "error");
      setSubmitting(false);
    }
  }, [exam, answers, attemptId, token, addToast]);

  // ─── Timer ─────────────────────────────────────────────────
  useEffect(() => {
    if (timeLeft === null || result) return;
    if (timeLeft <= 0) { handleSubmit(true); return; }
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft, result, handleSubmit]);

  // ─── Selectare răspuns ─────────────────────────────────────
  const toggleOption = (q, optId) => {
    if (result) return;
    setAnswers((prev) => {
      if (q.question_type === "single_choice") {
        return { ...prev, [q.id]: [optId] };
      }
      // multiple_choice
      const cur = Array.isArray(prev[q.id]) ? prev[q.id] : [];
      return {
        ...prev,
        [q.id]: cur.includes(optId) ? cur.filter((x) => x !== optId) : [...cur, optId],
      };
    });
  };

  const setText = (q, val) => !result && setAnswers((p) => ({ ...p, [q.id]: val }));

  const answeredCount = exam
    ? exam.questions.filter((q) => {
        const a = answers[q.id];
        return q.question_type === "open_text"
          ? typeof a === "string" && a.trim().length > 0
          : Array.isArray(a) && a.length > 0;
      }).length
    : 0;

  if (loading)
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-cyan-200 border-t-cyan-500 rounded-full animate-spin" />
          <p className="text-gray-500 font-bold text-sm">Se pregătește examenul...</p>
        </div>
      </div>
    );

  // ─── Ecran rezultat ────────────────────────────────────────
  if (result) {
    const pending = result.requires_manual_grading && result.score === null;
    const passed = result.status === "passed";
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-xl mx-auto">
          <div className="bg-white border border-gray-100 rounded-3xl shadow-sm p-8 text-center">
            {pending ? (
              <>
                <div className="text-6xl mb-4">⏳</div>
                <h1 className="text-2xl font-extrabold text-gray-900 mb-2">Examen trimis!</h1>
                <p className="text-gray-500">
                  Conține întrebări cu răspuns liber care vor fi corectate manual de profesor.
                  Vei vedea scorul final după corectare.
                </p>
              </>
            ) : (
              <>
                <div className="text-6xl mb-4">{passed ? "🎉" : "📋"}</div>
                <h1 className="text-2xl font-extrabold text-gray-900 mb-1">
                  {passed ? "Felicitări, ai promovat!" : "Examen finalizat"}
                </h1>
                <p className="text-5xl font-black my-6" style={{ color: passed ? "#10b981" : "#ef4444" }}>
                  {result.score}%
                </p>
                <p className="text-sm text-gray-500">
                  {result.points_earned} / {result.total_points} puncte · prag {result.passing_score}%
                </p>
                <span className={`inline-block mt-4 px-4 py-1.5 rounded-full text-sm font-bold ${
                  passed ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                }`}>
                  {passed ? "PROMOVAT" : "RESPINS"}
                </span>
              </>
            )}
            <button
              onClick={() => navigate("/my-exams")}
              className="block w-full mt-8 py-3 rounded-xl bg-gray-900 hover:bg-gray-800 text-white font-extrabold transition"
            >
              Înapoi la examene
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Ecran examen ──────────────────────────────────────────
  const lowTime = timeLeft !== null && timeLeft <= 60;

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      {/* Bara sus: titlu + timer + progres */}
      <div className="bg-white border-b border-gray-100 sticky top-16 z-30 shadow-sm">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-lg font-extrabold text-gray-900 truncate">{exam.title}</h1>
            <p className="text-xs font-bold text-gray-400">
              {answeredCount}/{exam.questions.length} răspunse
            </p>
          </div>
          <div className={`px-4 py-2 rounded-xl font-black text-lg tabular-nums border ${
            lowTime ? "bg-red-50 border-red-200 text-red-600 animate-pulse" : "bg-cyan-50 border-cyan-100 text-cyan-700"
          }`}>
            ⏱ {fmt(timeLeft ?? 0)}
          </div>
        </div>
        <div className="h-1 w-full bg-gray-100">
          <div className="h-full bg-cyan-500 transition-all" style={{ width: `${(answeredCount / exam.questions.length) * 100}%` }} />
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-5">
        {exam.questions.map((q, i) => (
          <div key={q.id} className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">
            <div className="flex items-start gap-3 mb-5">
              <span className="w-8 h-8 rounded-lg bg-gray-100 text-gray-600 font-black text-sm flex items-center justify-center flex-shrink-0">
                {i + 1}
              </span>
              <div>
                <p className="font-bold text-gray-900 leading-snug">{q.question_text}</p>
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  {q.points} {q.points === 1 ? "punct" : "puncte"}
                  {q.question_type === "multiple_choice" && " · alege una sau mai multe"}
                </span>
              </div>
            </div>

            {q.question_type === "open_text" ? (
              <textarea
                rows={4}
                value={typeof answers[q.id] === "string" ? answers[q.id] : ""}
                onChange={(e) => setText(q, e.target.value)}
                placeholder="Scrie răspunsul tău..."
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-100 transition resize-none"
              />
            ) : (
              <div className="space-y-3 ml-11">
                {q.options.map((o) => {
                  const sel = Array.isArray(answers[q.id]) && answers[q.id].includes(o.id);
                  return (
                    <button
                      key={o.id}
                      onClick={() => toggleOption(q, o.id)}
                      className={`w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium transition ${
                        sel ? "border-cyan-500 bg-cyan-50 text-cyan-900" : "border-gray-200 bg-gray-50 hover:border-cyan-300"
                      }`}
                    >
                      <span className={`w-5 h-5 flex items-center justify-center flex-shrink-0 text-xs ${
                        q.question_type === "single_choice" ? "rounded-full" : "rounded"
                      } ${sel ? "bg-cyan-500 text-white" : "border-2 border-gray-300"}`}>
                        {sel ? "✓" : ""}
                      </span>
                      {o.option_text}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Bara jos: submit */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 shadow-lg">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <p className="text-sm font-bold text-gray-500">
            {answeredCount < exam.questions.length
              ? `Ai ${exam.questions.length - answeredCount} întrebări fără răspuns`
              : "Toate întrebările au răspuns ✓"}
          </p>
          <button
            onClick={() => handleSubmit(false)}
            disabled={submitting}
            className="px-8 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-600 disabled:bg-gray-400 text-white font-extrabold transition shadow-md shadow-cyan-500/20"
          >
            {submitting ? "Se trimite..." : "Trimite Examenul"}
          </button>
        </div>
      </div>
    </div>
  );
}