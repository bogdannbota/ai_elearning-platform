import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";

const API = "http://127.0.0.1:8000";

export default function ExameneAdmin() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);

  const [form, setForm] = useState({
    title: "",
    description: "",
    duration_minutes: 30,
    max_attempts: 1,
    passing_score: 70,
  });

  useEffect(() => {
    fetchExams();
  }, []);

  const fetchExams = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API}/exams/?token=${token}`);
      setExams(res.data);
    } catch (e) {
      addToast("Eroare la încărcarea examenelor", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (form.title.trim().length < 3) {
      addToast("Titlul trebuie să aibă minim 3 caractere", "error");
      return;
    }
    try {
      setCreating(true);
      const res = await axios.post(`${API}/exams/?token=${token}`, form);
      addToast("Examen creat! Acum adaugă întrebări.", "success");
      setShowCreateModal(false);
      navigate(`/admin/examene/${res.data.id}/editor`);
    } catch (e) {
      addToast(e.response?.data?.detail || "Eroare la creare", "error");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (examId, title) => {
    if (!window.confirm(`Sigur ștergi examenul "${title}"?`)) return;
    try {
      await axios.delete(`${API}/exams/${examId}?token=${token}`);
      addToast("Examen șters", "success");
      fetchExams();
    } catch (e) {
      addToast("Eroare la ștergere", "error");
    }
  };

  const togglePublish = async (exam) => {
    try {
      const endpoint = exam.is_published ? "unpublish" : "publish";
      await axios.post(`${API}/exams/${exam.id}/${endpoint}?token=${token}`);
      addToast(exam.is_published ? "Examen retras" : "Examen publicat!", "success");
      fetchExams();
    } catch (e) {
      addToast(e.response?.data?.detail || "Eroare", "error");
    }
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
      <div className="bg-gradient-to-br from-gray-900 via-indigo-950/20 to-gray-900 border-b border-white/5 px-6 py-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <p className="text-gray-500 text-xs mb-1 uppercase tracking-widest">Admin</p>
            <h1 className="text-3xl font-bold">Gestionare examene</h1>
            <p className="text-sm text-gray-400 mt-1">
              {exams.length} {exams.length === 1 ? "examen" : "examene"} totale
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition flex items-center gap-2"
          >
            <span className="text-lg">+</span> Examen nou
          </button>
        </div>
      </div>

      {/* Lista */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {exams.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-16 text-center">
            <div className="text-5xl mb-4">📝</div>
            <p className="text-gray-400 mb-4">Nu există examene încă.</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition"
            >
              Creează primul examen
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {exams.map((exam) => (
              <div
                key={exam.id}
                className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:border-blue-500/40 transition"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center text-lg">
                    📝
                  </div>
                  <span
                    className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                      exam.is_published
                        ? "bg-green-500/20 text-green-400"
                        : "bg-gray-500/20 text-gray-400"
                    }`}
                  >
                    {exam.is_published ? "Publicat" : "Ciornă"}
                  </span>
                </div>

                <h3 className="text-base font-semibold text-white mb-1 leading-snug">
                  {exam.title}
                </h3>
                <p className="text-xs text-gray-500 mb-4 line-clamp-2">
                  {exam.description || "Fără descriere"}
                </p>

                <div className="flex items-center gap-3 text-xs text-gray-400 mb-4">
                  <span>⏱️ {exam.duration_minutes} min</span>
                  <span>🎯 {parseFloat(exam.passing_score)}%</span>
                  <span>🔄 {exam.max_attempts === 0 ? "∞" : exam.max_attempts}</span>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => navigate(`/admin/examene/${exam.id}/editor`)}
                    className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition"
                  >
                    ✏️ Editează
                  </button>
                  <button
                    onClick={() => togglePublish(exam)}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold transition ${
                      exam.is_published
                        ? "bg-amber-500/20 hover:bg-amber-500/30 text-amber-400"
                        : "bg-green-500/20 hover:bg-green-500/30 text-green-400"
                    }`}
                  >
                    {exam.is_published ? "📤" : "📥"}
                  </button>
                  <button
                    onClick={() => handleDelete(exam.id, exam.title)}
                    className="px-3 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs font-semibold transition"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Creare */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-white/10 rounded-2xl p-6 max-w-lg w-full">
            <h2 className="text-xl font-bold mb-1">Examen nou</h2>
            <p className="text-sm text-gray-400 mb-5">
              Setări de bază. Întrebările le adaugi la pasul următor.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Titlu *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="ex: Examen final - Programare"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/50"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Descriere</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  placeholder="Descriere opțională..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/50 resize-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">Durată (min)</label>
                  <input
                    type="number"
                    min={1}
                    value={form.duration_minutes}
                    onChange={(e) =>
                      setForm({ ...form, duration_minutes: parseInt(e.target.value) || 30 })
                    }
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/50"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">Tentative</label>
                  <input
                    type="number"
                    min={0}
                    value={form.max_attempts}
                    onChange={(e) =>
                      setForm({ ...form, max_attempts: parseInt(e.target.value) || 1 })
                    }
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/50"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">Promovare %</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={form.passing_score}
                    onChange={(e) =>
                      setForm({ ...form, passing_score: parseFloat(e.target.value) || 70 })
                    }
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/50"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-sm font-semibold transition border border-white/10"
                disabled={creating}
              >
                Anulează
              </button>
              <button
                onClick={handleCreate}
                disabled={creating}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white text-sm font-semibold transition"
              >
                {creating ? "Se creează..." : "Creează și editează"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
