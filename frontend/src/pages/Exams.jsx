import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { GridSkeletons } from "../components/SkeletonLoader";
import Modal from "../components/Modal";

const API = "http://127.0.0.1:8000";

export default function Exams() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [exams, setExams] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("available"); // available | results
  const [selected, setSelected] = useState(null);
  const [showResult, setShowResult] = useState(false);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [eRes, aRes] = await Promise.all([
        axios.get(`${API}/exams/?token=${token}`),
        axios.get(`${API}/exams/my/attempts?token=${token}`),
      ]);
      setExams(eRes.data);
      setAttempts(aRes.data);
    } catch (err) {
      addToast("Eroare la încărcarea examenelor", "error");
    } finally {
      setLoading(false);
    }
  };

  // Tentativele pentru un examen, cea mai recentă prima
  const attemptsFor = (examId) =>
    attempts.filter((a) => a.exam_id === examId);

  const bestAttempt = (examId) => {
    const list = attemptsFor(examId).filter((a) => a.score !== null);
    if (!list.length) return null;
    return list.reduce((b, a) => (a.score > b.score ? a : b));
  };

  const inProgressAttempt = (examId) =>
    attemptsFor(examId).find((a) => a.status === "in_progress");

  const handleStart = (exam) => {
    navigate(`/exams/${exam.id}/take`);
  };

  const openResult = (attempt) => {
    setSelected(attempt);
    setShowResult(true);
  };

  const statusBadge = (status, score) => {
    const map = {
      passed:   ["bg-green-100 text-green-700", "PROMOVAT"],
      failed:   ["bg-red-100 text-red-700", "RESPINS"],
      submitted:["bg-amber-100 text-amber-700", "ÎN CORECTARE"],
      graded:   ["bg-blue-100 text-blue-700", "CORECTAT"],
      in_progress: ["bg-gray-100 text-gray-600", "ÎN CURS"],
    };
    const [cls, label] = map[status] || map.in_progress;
    return <span className={`px-3 py-1 rounded-lg text-xs font-bold ${cls}`}>{label}</span>;
  };

  if (loading)
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 max-w-6xl mx-auto">
        <GridSkeletons count={4} />
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 relative">
      <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-cyan-50/50 to-transparent pointer-events-none" />

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Header */}
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-cyan-100 text-cyan-800 rounded-full text-xs font-bold uppercase tracking-wider mb-3">
            <span>📝</span> Evaluări
          </div>
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">Testele Mele</h1>
          <p className="text-gray-500 mt-2">Susține examenele disponibile și urmărește-ți rezultatele.</p>
        </div>

        {/* Tabs */}
        <div className="mb-8 border-b border-gray-200 flex gap-8">
          <button
            onClick={() => setActiveTab("available")}
            className={`py-3 font-semibold transition-all border-b-2 ${
              activeTab === "available" ? "border-cyan-500 text-cyan-600" : "border-transparent text-gray-500 hover:text-gray-900"
            }`}
          >
            Examene Disponibile
          </button>
          <button
            onClick={() => setActiveTab("results")}
            className={`py-3 font-semibold transition-all border-b-2 ${
              activeTab === "results" ? "border-cyan-500 text-cyan-600" : "border-transparent text-gray-500 hover:text-gray-900"
            }`}
          >
            Rezultatele Mele ({attempts.filter((a) => a.status !== "in_progress").length})
          </button>
        </div>

        {/* ─── Tab: Disponibile ─── */}
        {activeTab === "available" && (
          exams.length === 0 ? (
            <div className="bg-white border border-gray-100 rounded-3xl py-20 text-center shadow-sm">
              <div className="text-5xl mb-3 opacity-50">📭</div>
              <p className="text-gray-900 font-bold text-lg">Niciun examen disponibil</p>
              <p className="text-gray-500 text-sm">Examenele publicate de profesori vor apărea aici.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {exams.map((exam) => {
                const best = bestAttempt(exam.id);
                const inProg = inProgressAttempt(exam.id);
                const used = attemptsFor(exam.id).filter((a) => a.status !== "in_progress").length;
                const maxReached = exam.max_attempts > 0 && used >= exam.max_attempts;
                const passing = parseFloat(exam.passing_score);

                return (
                  <div key={exam.id} className="bg-white border border-gray-100 rounded-2xl shadow-xl shadow-gray-100/50 hover:shadow-2xl hover:shadow-cyan-100 transition-all duration-300 overflow-hidden flex flex-col">
                    <div className={`h-1.5 w-full ${best?.status === "passed" ? "bg-green-400" : "bg-gradient-to-r from-cyan-400 to-teal-400"}`} />
                    <div className="p-6 flex-1 flex flex-col">
                      <h3 className="text-xl font-bold text-gray-900 mb-2">{exam.title}</h3>
                      <p className="text-sm text-gray-500 mb-4 line-clamp-2 flex-1">
                        {exam.description || "Acest examen nu are descriere."}
                      </p>

                      <div className="grid grid-cols-3 gap-3 mb-5 p-4 bg-gray-50 rounded-xl border border-gray-100">
                        <div className="text-center">
                          <p className="text-xs font-semibold text-gray-500 uppercase">Timp</p>
                          <p className="font-bold text-gray-900 mt-0.5">{exam.duration_minutes}'</p>
                        </div>
                        <div className="text-center border-x border-gray-200">
                          <p className="text-xs font-semibold text-gray-500 uppercase">Prag</p>
                          <p className="font-bold text-gray-900 mt-0.5">{passing}%</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs font-semibold text-gray-500 uppercase">Încercări</p>
                          <p className="font-bold text-gray-900 mt-0.5">
                            {exam.max_attempts === 0 ? "∞" : `${used}/${exam.max_attempts}`}
                          </p>
                        </div>
                      </div>

                      {best && (
                        <div className="mb-4 flex items-center justify-between text-sm">
                          <span className="text-gray-500">Cel mai bun scor</span>
                          <span className={`font-black ${best.status === "passed" ? "text-green-600" : "text-red-500"}`}>
                            {best.score}%
                          </span>
                        </div>
                      )}

                      <div className="mt-auto">
                        {inProg ? (
                          <button onClick={() => handleStart(exam)} className="w-full bg-amber-500 hover:bg-amber-600 text-white py-3 rounded-xl font-bold transition shadow-md shadow-amber-500/20">
                            Continuă examenul
                          </button>
                        ) : maxReached ? (
                          <button disabled className="w-full bg-gray-100 text-gray-400 py-3 rounded-xl font-bold cursor-not-allowed">
                            Încercări epuizate
                          </button>
                        ) : (
                          <button onClick={() => handleStart(exam)} className="w-full bg-cyan-500 hover:bg-cyan-600 text-white py-3 rounded-xl font-bold transition shadow-md shadow-cyan-500/20">
                            {best ? "Reîncearcă" : "Începe Examenul"}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}

        {/* ─── Tab: Rezultate ─── */}
        {activeTab === "results" && (
          <div className="bg-white border border-gray-100 rounded-3xl shadow-xl shadow-gray-100/50 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50">
              <h2 className="text-lg font-bold text-gray-900">Istoric Tentative</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-500 uppercase bg-white border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-4 font-semibold tracking-wider">Examen</th>
                    <th className="px-6 py-4 font-semibold tracking-wider text-center">Scor</th>
                    <th className="px-6 py-4 font-semibold tracking-wider text-center">Status</th>
                    <th className="px-6 py-4 font-semibold tracking-wider text-center">Data</th>
                    <th className="px-6 py-4 font-semibold tracking-wider text-right">Acțiune</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {attempts.filter((a) => a.status !== "in_progress").map((a) => (
                    <tr key={a.attempt_id} className="hover:bg-cyan-50/30 transition-colors">
                      <td className="px-6 py-4 font-bold text-gray-900">{a.exam_title}</td>
                      <td className="px-6 py-4 text-center">
                        {a.score !== null ? (
                          <span className={`text-lg font-black ${a.status === "passed" ? "text-green-600" : "text-red-500"}`}>
                            {a.score}%
                          </span>
                        ) : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-6 py-4 text-center">{statusBadge(a.status, a.score)}</td>
                      <td className="px-6 py-4 text-center text-gray-500 font-medium">
                        {a.submitted_at ? new Date(a.submitted_at).toLocaleDateString("ro-RO") : "—"}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => openResult(a)} className="text-cyan-600 hover:text-cyan-800 font-semibold text-sm">
                          Detalii →
                        </button>
                      </td>
                    </tr>
                  ))}
                  {attempts.filter((a) => a.status !== "in_progress").length === 0 && (
                    <tr>
                      <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                        Nu ai finalizat niciun examen încă.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modal rezultat */}
      <Modal isOpen={showResult} title="Detalii Tentativă" onClose={() => setShowResult(false)}>
        {selected && (
          <div className="space-y-6">
            <div className="text-center pb-6 border-b border-gray-100">
              <h3 className="text-xl font-bold text-gray-900 mb-2">{selected.exam_title}</h3>
              {statusBadge(selected.status, selected.score)}
            </div>
            {selected.score !== null ? (
              <div className="bg-gray-50 rounded-xl p-5 border border-gray-100 text-center">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Scor Final</p>
                <p className={`text-4xl font-black ${selected.status === "passed" ? "text-green-600" : "text-red-500"}`}>
                  {selected.score}%
                </p>
              </div>
            ) : (
              <div className="bg-amber-50 rounded-xl p-4 border border-amber-100 text-sm text-amber-800 flex items-start gap-3">
                <span className="text-xl">⏳</span>
                <p>Acest examen conține întrebări cu răspuns liber și este în curs de corectare de către profesor.</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}