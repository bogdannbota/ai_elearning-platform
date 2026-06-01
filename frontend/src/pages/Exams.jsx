import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { GridSkeletons } from "../components/SkeletonLoader";
import Modal from "../components/Modal";

const API = "http://127.0.0.1:8000";

const STATUS = {
  passed:      ["bg-emerald-50 text-emerald-700 border-emerald-200", "Promovat"],
  failed:      ["bg-rose-50 text-rose-700 border-rose-200", "Respins"],
  submitted:   ["bg-amber-50 text-amber-800 border-amber-200", "În corectare"],
  graded:      ["bg-blue-50 text-blue-700 border-blue-200", "Corectat"],
  in_progress: ["bg-slate-100 text-slate-600 border-slate-200", "În curs"],
};

export default function Exams() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [exams, setExams] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("available");
  const [selected, setSelected] = useState(null);
  const [showResult, setShowResult] = useState(false);

  useEffect(() => { fetchAll(); }, []);
  const fetchAll = async () => {
    try {
      setLoading(true);
      const [e, a] = await Promise.all([
        axios.get(`${API}/exams/?token=${token}`),
        axios.get(`${API}/exams/my/attempts?token=${token}`),
      ]);
      setExams(e.data); setAttempts(a.data);
    } catch { addToast("Eroare la încărcarea examenelor", "error"); }
    finally { setLoading(false); }
  };

  const attemptsFor = (id) => attempts.filter((a) => a.exam_id === id);
  const bestAttempt = (id) => {
    const list = attemptsFor(id).filter((a) => a.score !== null);
    return list.length ? list.reduce((b, a) => (a.score > b.score ? a : b)) : null;
  };
  const inProgressAttempt = (id) => attemptsFor(id).find((a) => a.status === "in_progress");
  const badge = (status) => {
    const [cls, label] = STATUS[status] || STATUS.in_progress;
    return <span className={`tag ${cls}`}>{label}</span>;
  };

  if (loading) return <div className="min-h-screen py-12 px-4 max-w-6xl mx-auto"><GridSkeletons count={4} /></div>;

  const finished = attempts.filter((a) => a.status !== "in_progress");

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <span className="eyebrow">Evaluări</span>
          <h1 className="text-3xl font-extrabold text-slate-900 mt-1">Examenele mele</h1>
          <p className="text-slate-500 mt-1">Susține examenele disponibile și urmărește-ți rezultatele.</p>
        </div>

        <div className="mb-8 border-b flex gap-8" style={{ borderColor: "var(--line)" }}>
          {[["available", "Disponibile"], ["results", `Rezultate (${finished.length})`]].map(([k, l]) => (
            <button key={k} onClick={() => setActiveTab(k)}
              className={`py-3 font-semibold border-b-2 -mb-px transition ${activeTab === k ? "text-slate-900" : "text-slate-400 hover:text-slate-700"}`}
              style={{ borderColor: activeTab === k ? "var(--ink)" : "transparent" }}>
              {l}
            </button>
          ))}
        </div>

        {activeTab === "available" && (
          exams.length === 0 ? (
            <div className="surface py-16 text-center text-slate-400">Niciun examen disponibil momentan.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {exams.map((exam) => {
                const best = bestAttempt(exam.id);
                const inProg = inProgressAttempt(exam.id);
                const used = attemptsFor(exam.id).filter((a) => a.status !== "in_progress").length;
                const maxReached = exam.max_attempts > 0 && used >= exam.max_attempts;
                return (
                  <div key={exam.id} className="surface p-6 flex flex-col">
                    <h3 className="text-lg font-bold text-slate-900 mb-2">{exam.title}</h3>
                    <p className="text-sm text-slate-500 mb-5 line-clamp-2 flex-1">{exam.description || "Acest examen nu are descriere."}</p>
                    <div className="grid grid-cols-3 gap-2 mb-5 p-3 rounded-xl bg-slate-50 border" style={{ borderColor: "var(--line)" }}>
                      {[["Timp", `${exam.duration_minutes}'`], ["Prag", `${parseFloat(exam.passing_score)}%`], ["Încercări", exam.max_attempts === 0 ? "∞" : `${used}/${exam.max_attempts}`]].map(([l, v]) => (
                        <div key={l} className="text-center">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{l}</p>
                          <p className="metric font-bold text-slate-900 mt-0.5">{v}</p>
                        </div>
                      ))}
                    </div>
                    {best && (
                      <div className="flex items-center justify-between text-sm mb-4">
                        <span className="text-slate-500">Cel mai bun scor</span>
                        <span className={`metric font-bold ${best.status === "passed" ? "text-emerald-600" : "text-rose-500"}`}>{best.score}%</span>
                      </div>
                    )}
                    <div className="mt-auto">
                      {inProg
                        ? <button onClick={() => navigate(`/exams/${exam.id}/take`)} className="btn w-full" style={{ background: "#b45309", color: "#fff" }}>Continuă examenul</button>
                        : maxReached
                          ? <button disabled className="btn btn-ghost w-full">Încercări epuizate</button>
                          : <button onClick={() => navigate(`/exams/${exam.id}/take`)} className="btn btn-primary w-full">{best ? "Reîncearcă" : "Începe examenul"}</button>}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}

        {activeTab === "results" && (
          <div className="surface overflow-hidden">
            <div className="px-6 py-5 border-b" style={{ borderColor: "var(--line)" }}>
              <h2 className="text-lg font-bold text-slate-900">Istoric tentative</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="data">
                <thead>
                  <tr><th>Examen</th><th style={{ textAlign: "center" }}>Scor</th><th style={{ textAlign: "center" }}>Status</th><th style={{ textAlign: "center" }}>Data</th><th style={{ textAlign: "right" }}>Acțiune</th></tr>
                </thead>
                <tbody>
                  {finished.map((a) => (
                    <tr key={a.attempt_id}>
                      <td className="font-semibold text-slate-900">{a.exam_title}</td>
                      <td style={{ textAlign: "center" }}>{a.score !== null ? <span className={`metric font-bold ${a.status === "passed" ? "text-emerald-600" : "text-rose-500"}`}>{a.score}%</span> : <span className="text-slate-300">—</span>}</td>
                      <td style={{ textAlign: "center" }}>{badge(a.status)}</td>
                      <td style={{ textAlign: "center" }} className="text-slate-500">{a.submitted_at ? new Date(a.submitted_at).toLocaleDateString("ro-RO") : "—"}</td>
                      <td style={{ textAlign: "right" }}><button onClick={() => { setSelected(a); setShowResult(true); }} className="text-sm font-semibold" style={{ color: "var(--accent)" }}>Detalii →</button></td>
                    </tr>
                  ))}
                  {finished.length === 0 && <tr><td colSpan="5" className="text-center py-12 text-slate-400">Nu ai finalizat niciun examen încă.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <Modal isOpen={showResult} title="Detalii tentativă" onClose={() => setShowResult(false)}>
        {selected && (
          <div className="space-y-5">
            <div className="text-center pb-5 border-b" style={{ borderColor: "var(--line)" }}>
              <h3 className="text-lg font-bold text-slate-900 mb-2">{selected.exam_title}</h3>
              {badge(selected.status)}
            </div>
            {selected.score !== null ? (
              <div className="text-center p-5 rounded-xl bg-slate-50 border" style={{ borderColor: "var(--line)" }}>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Scor final</p>
                <p className={`metric text-4xl font-bold ${selected.status === "passed" ? "text-emerald-600" : "text-rose-500"}`}>{selected.score}%</p>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-800">Examen cu răspuns liber, în curs de corectare.</div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}