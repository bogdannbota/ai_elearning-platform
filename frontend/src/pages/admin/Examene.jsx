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
  const [form, setForm] = useState({ title: "", description: "", duration_minutes: 30, max_attempts: 1, passing_score: 70 });

  useEffect(() => { fetchExams(); }, []);

  const fetchExams = async () => {
    try { setLoading(true); const res = await axios.get(`${API}/exams/?token=${token}`); setExams(res.data); } 
    catch { addToast("Eroare la încărcarea examenelor", "error"); } 
    finally { setLoading(false); }
  };

  const handleCreate = async () => {
    if (form.title.trim().length < 3) return addToast("Titlul trebuie să aibă minim 3 caractere", "warning");
    try {
      setCreating(true);
      const res = await axios.post(`${API}/exams/?token=${token}`, form);
      addToast("Examen creat! Adaugă întrebări.", "success");
      setShowCreateModal(false); navigate(`/admin/examene/${res.data.id}/editor`);
    } catch (e) { addToast(e.response?.data?.detail || "Eroare la creare", "error"); } finally { setCreating(false); }
  };

  const handleDelete = async (examId, title) => {
    if (!window.confirm(`Sigur ștergi examenul "${title}"?`)) return;
    try { await axios.delete(`${API}/exams/${examId}?token=${token}`); addToast("Examen șters", "success"); fetchExams(); } 
    catch { addToast("Eroare la ștergere", "error"); }
  };

  const togglePublish = async (exam) => {
    try {
      await axios.post(`${API}/exams/${exam.id}/${exam.is_published ? "unpublish" : "publish"}?token=${token}`);
      addToast(exam.is_published ? "Examen retras în ciornă" : "Examen publicat!", "success"); fetchExams();
    } catch { addToast("Eroare", "error"); }
  };

  if (loading) return <div className="min-h-screen bg-gray-50 flex justify-center items-center"><div className="w-10 h-10 border-4 border-cyan-200 border-t-cyan-500 rounded-full animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-12 animate-in fade-in">
      <div className="bg-white border-b border-gray-100 px-6 py-10 relative overflow-hidden mb-8">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-50/50 via-white to-amber-50/30 pointer-events-none" />
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <p className="text-xs font-bold text-cyan-600 uppercase tracking-widest mb-1">Evaluări Generale</p>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Biblioteca de Examene</h1>
          </div>
          <button onClick={() => setShowCreateModal(true)} className="px-6 py-3.5 rounded-xl bg-gray-900 hover:bg-gray-800 text-white text-sm font-extrabold transition-all shadow-md shadow-gray-900/10 flex items-center gap-2">
            <span className="text-lg">+</span> Examen Nou
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6">
        {exams.length === 0 ? (
          <div className="bg-white border border-gray-100 rounded-3xl p-16 text-center shadow-sm">
            <div className="text-6xl mb-4 opacity-50">📝</div>
            <p className="text-gray-900 font-bold text-xl mb-2">Nu există examene</p>
            <p className="text-gray-500 mb-6">Apasă pe butonul de mai sus pentru a crea primul examen.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {exams.map((exam) => (
              <div key={exam.id} className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm hover:shadow-xl hover:shadow-cyan-100/50 hover:-translate-y-1 transition-all duration-300 flex flex-col h-full">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-50 to-blue-50 border border-cyan-100 flex items-center justify-center text-xl shadow-sm">📝</div>
                  <span className={`px-2.5 py-1 text-[10px] uppercase tracking-widest font-extrabold rounded-lg border ${exam.is_published ? "bg-green-50 border-green-200 text-green-700" : "bg-gray-50 border-gray-200 text-gray-500"}`}>
                    {exam.is_published ? "Publicat" : "Ciornă"}
                  </span>
                </div>
                <h3 className="text-lg font-extrabold text-gray-900 mb-2 leading-snug line-clamp-2">{exam.title}</h3>
                <p className="text-sm font-medium text-gray-500 mb-5 line-clamp-2 flex-1">{exam.description || "Acest examen nu are o descriere."}</p>
                <div className="flex items-center gap-2 mb-6 flex-wrap">
                  <span className="bg-gray-50 border border-gray-100 text-gray-600 px-2.5 py-1 rounded-lg text-xs font-bold">⏱️ {exam.duration_minutes}m</span>
                  <span className="bg-gray-50 border border-gray-100 text-gray-600 px-2.5 py-1 rounded-lg text-xs font-bold">🎯 {parseFloat(exam.passing_score)}%</span>
                  <span className="bg-gray-50 border border-gray-100 text-gray-600 px-2.5 py-1 rounded-lg text-xs font-bold">🔄 {exam.max_attempts === 0 ? "∞" : exam.max_attempts}x</span>
                </div>
                <div className="flex gap-2 mt-auto">
                  <button onClick={() => navigate(`/admin/examene/${exam.id}/editor`)} className="flex-1 py-2.5 rounded-xl bg-cyan-50 text-cyan-700 hover:bg-cyan-500 hover:text-white font-extrabold text-sm transition-colors border border-cyan-100 hover:border-transparent">Editor</button>
                  <button onClick={() => togglePublish(exam)} className={`flex-1 py-2.5 rounded-xl font-extrabold text-sm transition-colors border ${exam.is_published ? "bg-amber-50 border-amber-100 text-amber-700 hover:bg-amber-500 hover:text-white" : "bg-green-50 border-green-100 text-green-700 hover:bg-green-500 hover:text-white"}`}>
                    {exam.is_published ? "Ascunde" : "Publică"}
                  </button>
                  <button onClick={() => handleDelete(exam.id, exam.title)} className="px-3 py-2.5 rounded-xl bg-red-50 text-red-600 hover:bg-red-500 hover:text-white border border-red-100 hover:border-transparent transition-colors font-bold text-sm">🗑️</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-gray-100 rounded-3xl p-8 max-w-lg w-full shadow-2xl animate-in zoom-in-95">
            <h2 className="text-2xl font-extrabold text-gray-900 mb-2">Creare Examen</h2>
            <p className="text-sm font-medium text-gray-500 mb-6">Setează baza examenului. Întrebările le vei adăuga în pasul următor.</p>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 ml-1">Titlu Examen *</label>
                <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-100 transition-all" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 ml-1">Descriere (Opțional)</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-100 resize-none transition-all" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 ml-1">Timp (m)</label>
                  <input type="number" min={1} value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: parseInt(e.target.value) || 30 })} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-100 transition-all text-center" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 ml-1">Încercări</label>
                  <input type="number" min={0} value={form.max_attempts} onChange={(e) => setForm({ ...form, max_attempts: parseInt(e.target.value) || 1 })} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-100 transition-all text-center" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 ml-1">Trecere %</label>
                  <input type="number" min={0} max={100} value={form.passing_score} onChange={(e) => setForm({ ...form, passing_score: parseFloat(e.target.value) || 70 })} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-100 transition-all text-center" />
                </div>
              </div>
            </div>
            <div className="flex gap-4 mt-8">
              <button onClick={handleCreate} disabled={creating} className="flex-1 py-3.5 rounded-xl bg-gray-900 hover:bg-gray-800 disabled:bg-gray-400 text-white text-sm font-extrabold transition-all shadow-md shadow-gray-900/10">{creating ? "Se creează..." : "Mergi la Editor"}</button>
              <button onClick={() => setShowCreateModal(false)} disabled={creating} className="flex-1 py-3.5 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-extrabold transition-all">Anulează</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}