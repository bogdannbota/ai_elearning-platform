import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { GridSkeletons } from "../components/SkeletonLoader";
import Modal from "../components/Modal";

export default function Exams() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [exams, setExams] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedExam, setSelectedExam] = useState(null);
  const [showResultModal, setShowResultModal] = useState(false);
  const [activeTab, setActiveTab] = useState("available"); // available | results

  useEffect(() => {
    fetchExams();
  }, []);

  const fetchExams = async () => {
    try {
      setLoading(true);
      // Simulate fetching exams
      const mockExams = [
        { id: 1, title: "Test Modul 1", course: "Introducere în Python", duration: 30, questions: 20, passing_score: 60, status: "available", deadline: "2026-06-15" },
        { id: 2, title: "Test Modul 2", course: "Introducere în Python", duration: 45, questions: 30, passing_score: 65, status: "available", deadline: "2026-07-01" },
        { id: 3, title: "Test Final", course: "Introducere în Python", duration: 60, questions: 50, passing_score: 70, status: "locked", deadline: "2026-08-01" },
        { id: 4, title: "Test - JavaScript Basics", course: "Web Development", duration: 40, questions: 25, passing_score: 60, status: "available", deadline: "2026-06-30" },
      ];

      const mockResults = [
        { exam_id: 1, title: "Test Modul 1", score: 85, passed: true, date: "2026-05-15", time_taken: 28 },
        { exam_id: 2, title: "Test Modul 2", score: 72, passed: true, date: "2026-05-18", time_taken: 42 },
      ];

      setExams(mockExams);
      setResults(mockResults);
    } catch (err) {
      console.error(err);
      addToast("Eroare la încărcarea testelor", "error");
    } finally {
      setLoading(false);
    }
  };

  const getExamResult = (examId) => results.find((r) => r.exam_id === examId);

  const handleStartExam = (exam) => {
    if (exam.status === "locked") {
      addToast("Trebuie să finalizezi testele anterioare", "warning");
      return;
    }
    navigate(`/quiz/${exam.id}`, { state: { exam } });
  };

  const handleViewResult = (result) => {
    setSelectedExam(result);
    setShowResultModal(true);
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 max-w-6xl mx-auto">
      <GridSkeletons count={4} />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 relative">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-cyan-50/50 to-transparent pointer-events-none" />

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Header */}
        <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-cyan-100 text-cyan-800 rounded-full text-xs font-bold uppercase tracking-wider mb-3">
              <span>📝</span> Evaluări
            </div>
            <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">Testele Mele</h1>
            <p className="text-gray-500 mt-2">Gestionează și participă la testele disponibile pentru tine.</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-8 border-b border-gray-200 flex gap-8">
          <button 
            onClick={() => setActiveTab("available")}
            className={`py-3 font-semibold transition-all border-b-2 ${
              activeTab === "available" ? "border-cyan-500 text-cyan-600" : "border-transparent text-gray-500 hover:text-gray-900"
            }`}
          >
            Teste Disponibile
          </button>
          <button 
            onClick={() => setActiveTab("results")}
            className={`py-3 font-semibold transition-all border-b-2 ${
              activeTab === "results" ? "border-cyan-500 text-cyan-600" : "border-transparent text-gray-500 hover:text-gray-900"
            }`}
          >
            Rezultatele Mele
          </button>
        </div>

        {/* Tab Content: Available Exams */}
        {activeTab === "available" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {exams.map((exam) => {
              const result = getExamResult(exam.id);
              return (
                <div key={exam.id} className="bg-white border border-gray-100 rounded-2xl shadow-xl shadow-gray-100/50 hover:shadow-2xl hover:shadow-cyan-100 transition-all duration-300 overflow-hidden flex flex-col">
                  {/* Status Gradient Line */}
                  <div className={`h-1.5 w-full ${exam.status === "locked" ? "bg-gray-200" : result ? "bg-green-400" : "bg-gradient-to-r from-cyan-400 to-teal-400"}`} />

                  <div className="p-6 flex-1 flex flex-col">
                    <div className="flex justify-between items-start mb-4">
                      <span className="text-xs font-bold uppercase tracking-wider text-cyan-600 bg-cyan-50 px-2.5 py-1 rounded-lg">
                        {exam.course}
                      </span>
                      {exam.status === "locked" && <span className="text-gray-400">🔒</span>}
                    </div>

                    <h3 className="text-xl font-bold text-gray-900 mb-4">{exam.title}</h3>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-3 gap-3 mb-6 p-4 bg-gray-50 rounded-xl border border-gray-100">
                      <div className="text-center">
                        <p className="text-xs font-semibold text-gray-500 uppercase">Timp</p>
                        <p className="font-bold text-gray-900 mt-0.5">{exam.duration}'</p>
                      </div>
                      <div className="text-center border-x border-gray-200">
                        <p className="text-xs font-semibold text-gray-500 uppercase">Întrebări</p>
                        <p className="font-bold text-gray-900 mt-0.5">{exam.questions}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs font-semibold text-gray-500 uppercase">Minim</p>
                        <p className="font-bold text-gray-900 mt-0.5">{exam.passing_score}%</p>
                      </div>
                    </div>

                    <div className="mt-auto space-y-4">
                      <p className="text-sm text-gray-500 flex items-center gap-2">
                        <span>📅</span> Termen: <span className="font-medium text-gray-700">{new Date(exam.deadline).toLocaleDateString("ro-RO")}</span>
                      </p>

                      {/* Action Button */}
                      {!result && exam.status !== "locked" && (
                        <button onClick={() => handleStartExam(exam)} className="w-full bg-cyan-500 hover:bg-cyan-600 text-white py-3 rounded-xl font-bold transition shadow-md shadow-cyan-500/20">
                          Începe Testul
                        </button>
                      )}
                      {exam.status === "locked" && (
                        <button disabled className="w-full bg-gray-100 text-gray-400 py-3 rounded-xl font-bold cursor-not-allowed">
                          Test Blocat
                        </button>
                      )}
                      {result && (
                        <button onClick={() => handleViewResult(result)} className="w-full bg-white border-2 border-gray-100 hover:border-cyan-200 hover:bg-cyan-50 text-gray-700 py-2.5 rounded-xl font-bold transition">
                          Vezi Rezultatul
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Tab Content: Results */}
        {activeTab === "results" && (
          <div className="bg-white border border-gray-100 rounded-3xl shadow-xl shadow-gray-100/50 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-900">Istoric Evaluări</h2>
              <span className="text-sm font-medium text-gray-500">{results.length} teste finalizate</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-500 uppercase bg-white border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-4 font-semibold tracking-wider">Test / Curs</th>
                    <th className="px-6 py-4 font-semibold tracking-wider text-center">Punctaj</th>
                    <th className="px-6 py-4 font-semibold tracking-wider text-center">Status</th>
                    <th className="px-6 py-4 font-semibold tracking-wider text-center">Data</th>
                    <th className="px-6 py-4 font-semibold tracking-wider text-center">Timp</th>
                    <th className="px-6 py-4 font-semibold tracking-wider text-right">Acțiune</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {results.map((result) => (
                    <tr key={result.exam_id} className="hover:bg-cyan-50/30 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-bold text-gray-900">{result.title}</p>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`text-xl font-black ${result.passed ? 'text-cyan-600' : 'text-red-500'}`}>
                          {result.score}%
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {result.passed ? (
                          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-bold">PROMOVAT</span>
                        ) : (
                          <span className="px-3 py-1 bg-red-100 text-red-700 rounded-lg text-xs font-bold">RESPINS</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center text-gray-500 font-medium">
                        {new Date(result.date).toLocaleDateString("ro-RO")}
                      </td>
                      <td className="px-6 py-4 text-center text-gray-500 font-medium">
                        {result.time_taken} min
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => handleViewResult(result)} className="text-cyan-600 hover:text-cyan-800 font-semibold text-sm">
                          Detalii →
                        </button>
                      </td>
                    </tr>
                  ))}
                  {results.length === 0 && (
                    <tr>
                      <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                        Nu ai finalizat niciun test încă.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Result Modal - Refreshed */}
      <Modal isOpen={showResultModal} title="Detalii Performanță" onClose={() => setShowResultModal(false)}>
        {selectedExam && (
          <div className="space-y-6">
            <div className="text-center pb-6 border-b border-gray-100">
              <h3 className="text-xl font-bold text-gray-900 mb-2">{selectedExam.title}</h3>
              <span className={`inline-block px-4 py-1.5 rounded-full text-sm font-bold ${selectedExam.passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {selectedExam.passed ? "FELICITĂRI, AI PROMOVAT!" : "TEST RESPINS"}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 text-center">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Scor Obținut</p>
                <p className={`text-3xl font-black ${selectedExam.passed ? 'text-cyan-600' : 'text-red-500'}`}>{selectedExam.score}%</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 text-center">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Timp Alocat</p>
                <p className="text-3xl font-black text-gray-900">{selectedExam.time_taken}<span className="text-lg text-gray-500">m</span></p>
              </div>
            </div>

            <div className="bg-cyan-50 rounded-xl p-4 border border-cyan-100 text-sm text-cyan-800 flex items-start gap-3">
              <span className="text-xl">💡</span>
              <p>Testul a fost susținut pe <strong>{new Date(selectedExam.date).toLocaleDateString("ro-RO")}</strong>. Poți revizui materia cursului oricând din dashboard-ul tău.</p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}