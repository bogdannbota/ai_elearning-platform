import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";
import { useToast } from "../../context/ToastContext";
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { deptTheme } from "../../theme/departments";

const API = "http://127.0.0.1:8000";

function Stat({ label, value }) {
  return (
    <div className="surface p-5">
      <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
      <p className="metric text-3xl text-slate-900 mt-2">{value}</p>
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
  const dept = deptTheme(user?.department_id);

  useEffect(() => { fetchData(); }, []);
  const fetchData = async () => {
    try {
      setLoading(true);
      const [c, e] = await Promise.all([
        axios.get(`${API}/courses/?token=${token}`),
        axios.get(`${API}/progress/my-courses?token=${token}`),
      ]);
      setCourses(c.data); setEnrollments(e.data);
    } catch { addToast("Eroare la încărcare", "error"); }
    finally { setLoading(false); }
  };

  const chartData = enrollments.slice(0, 6).map((e) => ({
    name: courses.find((c) => c.id === e.course_id)?.title?.slice(0, 10) || "Curs",
    progres: e.progress_percent,
  }));
  const avg = enrollments.length ? Math.round(enrollments.reduce((s, e) => s + e.progress_percent, 0) / enrollments.length) : 0;

  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-500">Se încarcă...</div>;

  return (
    <div className="min-h-screen pb-12">
      <div className="bg-white border-b" style={{ borderColor: "var(--line)" }}>
        <div className="max-w-6xl mx-auto px-6 py-9">
          <div className="flex items-center gap-3 mb-2">
            <span className="eyebrow">Panou Cursant</span>
            {user?.department?.name && <span className={`tag ${dept.chip}`}>{user.department.name}</span>}
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900">Salut, {user?.full_name?.split(" ")[0]}</h1>
          <p className="text-slate-500 mt-1">Progresul tău și cursurile la care ești înscris.</p>
        </div>
        <div className="h-1" style={{ background: dept.bar }} />
      </div>

      <div className="max-w-6xl mx-auto px-6 mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Stat label="Cursuri" value={enrollments.length} />
            <Stat label="Finalizate" value={enrollments.filter((e) => e.completed).length} />
            <Stat label="Progres mediu" value={`${avg}%`} />
            <Stat label="Disponibile" value={Math.max(courses.length - enrollments.length, 0)} />
          </div>
          <div className="surface p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-6">Progres cursuri</h2>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef1f4" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e3e7ec" }} />
                <Bar dataKey="progres" fill={dept.bar} radius={[6, 6, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="space-y-6">
          <div className="surface p-6">
            <h3 className="font-bold text-slate-900 mb-4">Continuă învățarea</h3>
            {enrollments.filter((e) => !e.completed).slice(0, 3).map((e) => {
              const c = courses.find((x) => x.id === e.course_id);
              return c && (
                <button key={e.id} onClick={() => navigate(`/course/${c.id}`)} className="w-full text-left mb-3 p-4 rounded-xl border hover:bg-slate-50 transition" style={{ borderColor: "var(--line)" }}>
                  <p className="font-semibold text-sm text-slate-800 truncate">{c.title}</p>
                  <div className="w-full h-1.5 rounded-full bg-slate-100 mt-2 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${e.progress_percent}%`, background: dept.bar }} />
                  </div>
                </button>
              );
            })}
            {enrollments.filter((e) => !e.completed).length === 0 && <p className="text-sm text-slate-400">Niciun curs în desfășurare.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}