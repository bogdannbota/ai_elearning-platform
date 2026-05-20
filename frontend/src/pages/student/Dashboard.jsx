import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";
import { useToast } from "../../context/ToastContext";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const API = "http://127.0.0.1:8000";

// Stat Card luminos
function StatCard({ icon, label, value, color = "cyan" }) {
  const colorStyles = {
    cyan: "text-cyan-600 bg-cyan-50 border-cyan-100",
    green: "text-emerald-600 bg-emerald-50 border-emerald-100",
    purple: "text-indigo-600 bg-indigo-50 border-indigo-100",
    amber: "text-amber-600 bg-amber-50 border-amber-100",
  };
  return (
    <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all">
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl mb-4 border ${colorStyles[color]}`}>
        {icon}
      </div>
      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{label}</p>
      <p className="text-3xl font-black text-gray-900 mt-1">{value}</p>
    </div>
  );
}

export default function StudentDashboard() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [courses, setCourses] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [cRes, eRes] = await Promise.all([
        axios.get(`${API}/courses/?token=${token}`),
        axios.get(`${API}/progress/my-courses?token=${token}`),
      ]);
      setCourses(cRes.data);
      setEnrollments(eRes.data);
    } catch { addToast("Eroare la încărcare", "error"); } finally { setLoading(false); }
  };

  const chartData = enrollments.slice(0, 5).map(e => ({
    name: courses.find(c => c.id === e.course_id)?.title?.slice(0, 10) || "Curs",
    progres: e.progress_percent
  }));

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-500">Se încarcă...</div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-12 animate-in fade-in">
      <div className="bg-white border-b border-gray-100 px-6 py-10 mb-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-extrabold text-gray-900">Salut, {user?.full_name?.split(" ")[0]}! 👋</h1>
          <p className="text-gray-500 font-medium">Platforma ta de învățare inteligentă.</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard icon="📚" label="Cursuri" value={enrollments.length} color="cyan" />
            <StatCard icon="✅" label="Finalizate" value={enrollments.filter(e => e.completed).length} color="green" />
            <StatCard icon="📊" label="Progres Mediu" value={`${enrollments.length ? Math.round(enrollments.reduce((s, e) => s + e.progress_percent, 0) / enrollments.length) : 0}%`} color="purple" />
            <StatCard icon="🎯" label="Disponibile" value={courses.length - enrollments.length} color="amber" />
          </div>

          <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-6">Progres Cursuri</h2>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={false} />
                <Tooltip />
                <Bar dataKey="progres" fill="#06b6d4" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
           <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">
             <h3 className="font-bold text-gray-900 mb-4">Continuă învățarea</h3>
             {enrollments.filter(e => !e.completed).slice(0, 2).map(e => {
                const c = courses.find(course => course.id === e.course_id);
                return c && (
                  <div key={e.id} className="mb-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <p className="font-bold text-sm text-gray-800">{c.title}</p>
                    <div className="w-full bg-gray-200 h-1.5 rounded-full mt-3 overflow-hidden">
                       <div className="h-full bg-cyan-500" style={{ width: `${e.progress_percent}%` }} />
                    </div>
                  </div>
                )
             })}
           </div>
        </div>
      </div>
    </div>
  );
}