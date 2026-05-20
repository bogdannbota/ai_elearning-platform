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

  useEffect(() => {
    fetchExams();
  }, []);

  const fetchExams = async () => {
    try {
      setLoading(true);
      // Simulate fetching exams
      const mockExams = [
        {
          id: 1,
          title: "Test Modul 1",
          course: "Introducție în Python",
          duration: 30,
          questions: 20,
          passing_score: 60,
          status: "available",
          deadline: "2026-06-15",
        },
        {
          id: 2,
          title: "Test Modul 2",
          course: "Introducție în Python",
          duration: 45,
          questions: 30,
          passing_score: 65,
          status: "available",
          deadline: "2026-07-01",
        },
        {
          id: 3,
          title: "Test Final",
          course: "Introducție în Python",
          duration: 60,
          questions: 50,
          passing_score: 70,
          status: "locked",
          deadline: "2026-08-01",
        },
        {
          id: 4,
          title: "Test - JavaScript Basics",
          course: "Web Development",
          duration: 40,
          questions: 25,
          passing_score: 60,
          status: "available",
          deadline: "2026-06-30",
        },
      ];

      const mockResults = [
        {
          exam_id: 1,
          title: "Test Modul 1",
          score: 85,
          passed: true,
          date: "2026-05-15",
          time_taken: 28,
        },
        {
          exam_id: 2,
          title: "Test Modul 2",
          score: 72,
          passed: true,
          date: "2026-05-18",
          time_taken: 42,
        },
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

  if (loading) return <GridSkeletons count={4} />;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">📝 Testele Mele</h1>
          <p className="text-gray-600">Gestionează și ia testele tale disponibile</p>
        </div>

        {/* Tabs */}
        <div className="mb-8 border-b border-gray-200">
          <div className="flex gap-8">
            <button className="py-3 border-b-2 border-blue-600 font-semibold text-blue-600">
              Teste Disponibile
            </button>
            <button className="py-3 text-gray-600 hover:text-gray-900">Rezultate</button>
          </div>
        </div>

        {/* Available Exams */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {exams.map((exam) => {
            const result = getExamResult(exam.id);
            return (
              <div
                key={exam.id}
                className="bg-white rounded-lg shadow-lg hover:shadow-xl transition overflow-hidden"
              >
                {/* Status Badge */}
                <div className="h-1 bg-gradient-to-r from-blue-600 to-indigo-600"></div>

                <div className="p-6">
                  {/* Title and Course */}
                  <h3 className="text-xl font-bold text-gray-900 mb-1">{exam.title}</h3>
                  <p className="text-sm text-gray-600 mb-4">📚 {exam.course}</p>

                  {/* Result Badge if exists */}
                  {result && (
                    <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-sm font-semibold text-green-700">✓ Finalizat</p>
                      <p className="text-2xl font-bold text-green-600">{result.score}%</p>
                    </div>
                  )}

                  {/* Exam Details */}
                  <div className="grid grid-cols-3 gap-4 mb-6 text-center">
                    <div>
                      <p className="text-xs text-gray-600">Timp</p>
                      <p className="font-semibold text-gray-900">{exam.duration} min</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Întrebări</p>
                      <p className="font-semibold text-gray-900">{exam.questions}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Nota Min</p>
                      <p className="font-semibold text-gray-900">{exam.passing_score}%</p>
                    </div>
                  </div>

                  {/* Deadline */}
                  <p className="text-sm text-gray-600 mb-6">
                    📅 Termen limită: {new Date(exam.deadline).toLocaleDateString("ro-RO")}
                  </p>

                  {/* Status */}
                  <div className="mb-6">
                    {exam.status === "locked" ? (
                      <span className="inline-block px-3 py-1 bg-gray-200 text-gray-800 rounded-full text-sm font-semibold">
                        🔒 Blocat
                      </span>
                    ) : (
                      <span className="inline-block px-3 py-1 bg-green-200 text-green-800 rounded-full text-sm font-semibold">
                        ✓ Disponibil
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3">
                    {!result && exam.status !== "locked" && (
                      <button
                        onClick={() => handleStartExam(exam)}
                        className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition font-semibold"
                      >
                        ▶️ Startează Test
                      </button>
                    )}
                    {result && (
                      <button
                        onClick={() => handleViewResult(result)}
                        className="flex-1 bg-gray-200 text-gray-900 py-2 rounded-lg hover:bg-gray-300 transition font-semibold"
                      >
                        👁️ Vezi Rezultat
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Recent Results */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="px-6 py-4 bg-gradient-to-r from-blue-900 to-indigo-900 text-white">
            <h2 className="text-xl font-bold">📊 Rezultatele Recente</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-6 py-3 text-left font-semibold text-gray-900">Test</th>
                  <th className="px-6 py-3 text-center font-semibold text-gray-900">Punctaj</th>
                  <th className="px-6 py-3 text-center font-semibold text-gray-900">Status</th>
                  <th className="px-6 py-3 text-center font-semibold text-gray-900">Data</th>
                  <th className="px-6 py-3 text-center font-semibold text-gray-900">Timp</th>
                </tr>
              </thead>
              <tbody>
                {results.map((result) => (
                  <tr
                    key={result.exam_id}
                    className="border-b border-gray-200 hover:bg-gray-50"
                  >
                    <td className="px-6 py-4 font-semibold text-gray-900">
                      {result.title}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-2xl font-bold text-blue-600">
                        {result.score}%
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {result.passed ? (
                        <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-semibold">
                          ✓ PROMOVAT
                        </span>
                      ) : (
                        <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-semibold">
                          ✕ RESPINS
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center text-gray-600">
                      {new Date(result.date).toLocaleDateString("ro-RO")}
                    </td>
                    <td className="px-6 py-4 text-center text-gray-600">
                      {result.time_taken} min
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Result Modal */}
      <Modal
        isOpen={showResultModal}
        title="Detalii Rezultat"
        onClose={() => setShowResultModal(false)}
      >
        {selectedExam && (
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600">Test</p>
              <p className="font-semibold text-gray-900">{selectedExam.title}</p>
            </div>
            <div className="flex justify-around text-center">
              <div>
                <p className="text-sm text-gray-600">Punctaj</p>
                <p className="text-3xl font-bold text-blue-600">{selectedExam.score}%</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Status</p>
                <p className="text-lg font-bold text-green-600">
                  {selectedExam.passed ? "PROMOVAT" : "RESPINS"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Timp</p>
                <p className="text-lg font-bold text-gray-900">{selectedExam.time_taken} min</p>
              </div>
            </div>
            <div className="pt-4 border-t">
              <p className="text-sm text-gray-600">Data completării</p>
              <p className="font-semibold text-gray-900">
                {new Date(selectedExam.date).toLocaleDateString("ro-RO")}
              </p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
