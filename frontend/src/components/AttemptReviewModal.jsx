import { useState, useEffect } from "react";
import axios from "axios";

const API = "http://127.0.0.1:8000";

const STATUS = {
  passed:      ["bg-emerald-50 text-emerald-700 border-emerald-200", "Promovat"],
  failed:      ["bg-rose-50 text-rose-700 border-rose-200", "Respins"],
  submitted:   ["bg-amber-50 text-amber-800 border-amber-200", "În corectare"],
  graded:      ["bg-blue-50 text-blue-700 border-blue-200", "Corectat"],
  in_progress: ["bg-slate-100 text-slate-600 border-slate-200", "În curs"],
  expired:     ["bg-slate-100 text-slate-600 border-slate-200", "Expirat"],
};

export default function AttemptReviewModal({ attempt, token, onClose, addToast }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        const res = await axios.get(`${API}/exams/attempts/${attempt.attempt_id}?token=${token}`);
        if (active) setData(res.data);
      } catch (e) {
        if (active) addToast?.(e.response?.data?.detail || "Eroare la încărcarea detaliilor", "error");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [attempt.attempt_id, token]);

  const badge = (status) => {
    const [cls, label] = STATUS[status] || STATUS.in_progress;
    return <span className={`tag ${cls}`}>{label}</span>;
  };

  const pending = data && data.requires_manual_grading && data.score === null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(15,22,34,.45)" }}>
      <div className="surface w-full max-w-2xl max-h-[88vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-6 py-5 border-b" style={{ borderColor: "var(--line)" }}>
          <div>
            <span className="eyebrow">Detalii tentativă</span>
            <h3 className="text-lg font-bold text-slate-900 mt-1">{attempt.exam_title}</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-xl">✕</button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 overflow-y-auto space-y-5">
          {loading ? (
            <p className="text-center py-12 text-slate-400">Se încarcă...</p>
          ) : !data ? (
            <p className="text-center py-12 text-slate-400">Nu s-au putut încărca detaliile.</p>
          ) : (
            <>
              {/* Scor */}
              {data.score !== null ? (
                <div className="text-center p-5 rounded-xl bg-slate-50 border" style={{ borderColor: "var(--line)" }}>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Scor final</p>
                  <p className={`metric text-4xl font-bold ${data.status === "passed" ? "text-emerald-600" : "text-rose-500"}`}>{data.score}%</p>
                  <p className="text-sm text-slate-500 metric mt-1">{data.points_earned} / {data.total_points} puncte · prag {data.passing_score}%</p>
                  <div className="mt-3">{badge(data.status)}</div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-800">Examen cu răspuns liber, în curs de corectare.</div>
              )}

              {/* Revizuire pe întrebări */}
              {!pending && data.questions?.length > 0 && (
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-slate-900">Revizuire răspunsuri</h4>
                  {data.questions.map((q, i) => {
                    const isOpen = q.question_type === "open_text";
                    const earned = q.points_earned;
                    let pill;
                    if (isOpen && earned === null) pill = ["bg-amber-50 text-amber-800 border-amber-200", "În corectare"];
                    else if (q.is_correct === true) pill = ["bg-emerald-50 text-emerald-700 border-emerald-200", "Corect"];
                    else if (earned != null && earned > 0) pill = ["bg-amber-50 text-amber-800 border-amber-200", "Parțial"];
                    else pill = ["bg-rose-50 text-rose-700 border-rose-200", "Greșit"];

                    return (
                      <div key={q.id} className="bg-slate-50 border rounded-xl p-5" style={{ borderColor: "var(--line)" }}>
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex items-start gap-3">
                            <span className="w-7 h-7 rounded-lg bg-white border text-slate-600 font-bold text-xs flex items-center justify-center flex-shrink-0 metric" style={{ borderColor: "var(--line)" }}>{i + 1}</span>
                            <div>
                              <p className="font-semibold text-slate-900 text-sm leading-snug">{q.question_text}</p>
                              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider metric">
                                {earned != null ? `${earned}/${q.points}` : `— /${q.points}`} {q.points === 1 ? "punct" : "puncte"}
                              </span>
                            </div>
                          </div>
                          <span className={`tag flex-shrink-0 ${pill[0]}`}>{pill[1]}</span>
                        </div>

                        {isOpen ? (
                          <div className="ml-10 space-y-2">
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Răspunsul tău</p>
                            <p className="text-sm text-slate-700 bg-white border rounded-xl px-4 py-3 whitespace-pre-wrap" style={{ borderColor: "var(--line)" }}>
                              {q.text_answer?.trim() ? q.text_answer : <span className="text-slate-400 italic">Fără răspuns</span>}
                            </p>
                          </div>
                        ) : (
                          <div className="ml-10 space-y-2">
                            {q.options.map((o) => {
                              const chosen = q.selected_option_ids?.includes(o.id);
                              const correct = o.is_correct;
                              let style, label;
                              if (correct) {
                                style = { borderColor: "#10b981", background: "rgba(16,185,129,.07)" };
                                label = chosen ? "✓ Răspunsul tău (corect)" : "Răspuns corect";
                              } else if (chosen) {
                                style = { borderColor: "#be123c", background: "rgba(190,18,60,.06)" };
                                label = "✕ Răspunsul tău";
                              } else {
                                style = { borderColor: "var(--line)", background: "#fff" };
                                label = null;
                              }
                              return (
                                <div key={o.id} className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl border text-sm font-medium" style={style}>
                                  <span className="text-slate-800">{o.option_text}</span>
                                  {label && <span className={`text-xs font-bold flex-shrink-0 ${correct ? "text-emerald-600" : "text-rose-500"}`}>{label}</span>}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {q.explanation && (
                          <div className="ml-10 mt-3 text-sm text-slate-600 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
                            <span className="font-semibold text-blue-700">Explicație: </span>{q.explanation}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex justify-end" style={{ borderColor: "var(--line)" }}>
          <button onClick={onClose} className="btn btn-ghost">Închide</button>
        </div>
      </div>
    </div>
  );
}