import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";

const API = "http://127.0.0.1:8000";

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
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);
  const submittedRef = useRef(false);

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
      } finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, [examId]);

  const handleSubmit = useCallback(async (auto = false) => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setSubmitting(true);
    const payload = {
      answers: (exam?.questions || []).map((q) => {
        const a = answers[q.id];
        if (q.question_type === "open_text") return { question_id: q.id, text_answer: typeof a === "string" ? a : "" };
        return { question_id: q.id, selected_option_ids: Array.isArray(a) ? a : [] };
      }),
    };
    try {
      const res = await axios.post(`${API}/exams/attempts/${attemptId}/submit?token=${token}`, payload);
      setResult(res.data);
      if (auto) addToast("Timpul a expirat — examen trimis automat", "warning");
    } catch (e) {
      submittedRef.current = false;
      addToast(e.response?.data?.detail || "Eroare la trimitere", "error");
      setSubmitting(false);
    }
  }, [exam, answers, attemptId, token, addToast]);

  useEffect(() => {
    if (timeLeft === null || result) return;
    if (timeLeft <= 0) { handleSubmit(true); return; }
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft, result, handleSubmit]);

  const toggleOption = (q, optId) => {
    if (result) return;
    setAnswers((prev) => {
      if (q.question_type === "single_choice") return { ...prev, [q.id]: [optId] };
      const cur = Array.isArray(prev[q.id]) ? prev[q.id] : [];
      return { ...prev, [q.id]: cur.includes(optId) ? cur.filter((x) => x !== optId) : [...cur, optId] };
    });
  };
  const setText = (q, val) => !result && setAnswers((p) => ({ ...p, [q.id]: val }));

  const answeredCount = exam ? exam.questions.filter((q) => {
    const a = answers[q.id];
    return q.question_type === "open_text" ? typeof a === "string" && a.trim().length > 0 : Array.isArray(a) && a.length > 0;
  }).length : 0;

  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-500">Se pregătește examenul...</div>;

  if (result) {
    const pending = result.requires_manual_grading && result.score === null;
    const passed = result.status === "passed";
    return (
      <div className="min-h-screen py-12 px-4">
        <div className="max-w-xl mx-auto surface p-8 text-center">
          {pending ? (
            <>
              <h1 className="text-2xl font-extrabold text-slate-900 mb-2">Examen trimis</h1>
              <p className="text-slate-500">Conține întrebări cu răspuns liber, care vor fi corectate manual. Vei vedea scorul final după corectare.</p>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-extrabold text-slate-900 mb-1">{passed ? "Ai promovat" : "Examen finalizat"}</h1>
              <p className="metric text-5xl font-bold my-6" style={{ color: passed ? "#10b981" : "#be123c" }}>{result.score}%</p>
              <p className="text-sm text-slate-500 metric">{result.points_earned} / {result.total_points} puncte · prag {result.passing_score}%</p>
              <div className="mt-4"><span className={`tag ${passed ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-rose-50 text-rose-700 border-rose-200"}`}>{passed ? "Promovat" : "Respins"}</span></div>
            </>
          )}
          <button onClick={() => navigate("/my-exams")} className="btn btn-primary w-full mt-8">Înapoi la examene</button>
        </div>
      </div>
    );
  }

  const lowTime = timeLeft !== null && timeLeft <= 60;
  return (
    <div className="min-h-screen pb-32">
      <div className="bg-white border-b sticky top-16 z-30" style={{ borderColor: "var(--line)" }}>
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-slate-900 truncate">{exam.title}</h1>
            <p className="text-xs font-semibold text-slate-400 metric">{answeredCount}/{exam.questions.length} răspunse</p>
          </div>
          <div className={`px-4 py-2 rounded-xl metric font-bold text-lg border ${lowTime ? "bg-rose-50 border-rose-200 text-rose-600 animate-pulse" : "bg-slate-100 border-slate-200 text-slate-700"}`}>{fmt(timeLeft ?? 0)}</div>
        </div>
        <div className="h-1 bg-slate-100"><div className="h-full" style={{ width: `${(answeredCount / exam.questions.length) * 100}%`, background: "var(--accent)" }} /></div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-5">
        {exam.questions.map((q, i) => (
          <div key={q.id} className="surface p-6">
            <div className="flex items-start gap-3 mb-5">
              <span className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 font-bold text-sm flex items-center justify-center flex-shrink-0 metric">{i + 1}</span>
              <div>
                <p className="font-semibold text-slate-900 leading-snug">{q.question_text}</p>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider metric">{q.points} {q.points === 1 ? "punct" : "puncte"}{q.question_type === "multiple_choice" && " · alegere multiplă"}</span>
              </div>
            </div>
            {q.question_type === "open_text" ? (
              <textarea rows={4} value={typeof answers[q.id] === "string" ? answers[q.id] : ""} onChange={(e) => setText(q, e.target.value)} placeholder="Scrie răspunsul tău..." className="input resize-none" />
            ) : (
              <div className="space-y-3 ml-11">
                {q.options.map((o) => {
                  const sel = Array.isArray(answers[q.id]) && answers[q.id].includes(o.id);
                  return (
                    <button key={o.id} onClick={() => toggleOption(q, o.id)} className="w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium transition"
                      style={sel ? { borderColor: "var(--accent)", background: "rgba(31,95,191,.06)" } : { borderColor: "var(--line)" }}>
                      <span className={`w-5 h-5 flex items-center justify-center flex-shrink-0 text-xs ${q.question_type === "single_choice" ? "rounded-full" : "rounded"}`} style={sel ? { background: "var(--accent)", color: "#fff" } : { border: "2px solid #cbd5e1" }}>{sel ? "✓" : ""}</span>
                      {o.option_text}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t" style={{ borderColor: "var(--line)" }}>
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <p className="text-sm font-semibold text-slate-500">{answeredCount < exam.questions.length ? `${exam.questions.length - answeredCount} întrebări fără răspuns` : "Toate întrebările au răspuns"}</p>
          <button onClick={() => handleSubmit(false)} disabled={submitting} className="btn btn-primary px-8">{submitting ? "Se trimite..." : "Trimite examenul"}</button>
        </div>
      </div>
    </div>
  );
}