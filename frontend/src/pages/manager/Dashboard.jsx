import { useAuth } from "../../context/AuthContext";
import { useEffect, useState } from "react";
import axios from "axios";
import { useToast } from "../../context/ToastContext";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

const API = "http://127.0.0.1:8000";

// Componentă pentru carduri de statistici rapide (Stil Light)
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

export default function ManagerDashboard() {
  const { token, user } = useAuth();
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
        axios.get(`${API}/progress/admin/all?token=${token}`),
      ]);
      // Managerul vede doar cursurile create de el
      setCourses(cRes.data.filter(c => c.created_by === user?.id));
      setEnrollments(eRes.data);
    } catch { addToast("Eroare la încărcarea datelor", "error"); } finally { setLoading(false); }
  };

  const chartData = courses.map(c => ({
      name: c.title.slice(0, 8),
      studenți: enrollments.filter(e => e.course_id === c.id).length
  }));

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Se încarcă...</div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-12 animate-in fade-in">
      <div className="bg-white border-b border-gray-100 px-6 py-10 mb-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-extrabold text-gray-900">Dashboard Profesor</h1>
          <p className="text-gray-500 font-medium mt-1">Bun venit, {user?.full_name}. Iată activitatea ta.</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard icon="📚" label="Cursuri Create" value={courses.length} color="cyan" />
        <StatCard icon="👥" label="Total Înscrieri" value={enrollments.filter(e => courses.some(c => c.id === e.course_id)).length} color="purple" />
        <StatCard icon="⭐" label="Cursuri Active" value={courses.length} color="green" />

        <div className="md:col-span-3 bg-white border border-gray-100 rounded-3xl p-8 shadow-sm">
           <h2 className="text-lg font-bold text-gray-900 mb-6">Înscrieri per curs</h2>
           <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" />
                <Tooltip />
                <Bar dataKey="studenți" fill="#06b6d4" radius={[8,8,0,0]} />
              </BarChart>
           </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}