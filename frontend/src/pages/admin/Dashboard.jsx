import { useAuth } from "../../context/AuthContext";
import { useEffect, useState } from "react";
import axios from "axios";
import { useToast } from "../../context/ToastContext";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

const API = "http://127.0.0.1:8000";
const COLORS = ["#1f5fbf", "#0f766e", "#6d28d9", "#b45309", "#be123c"];

function Stat({ label, value }) {
  return (
    <div className="surface p-5">
      <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
      <p className="metric text-3xl text-slate-900 mt-2">{value}</p>
    </div>
  );
}

function Spotlight({ tag, name, sub, metricLabel, metricValue }) {
  return (
    <div className="surface p-5 flex flex-col justify-between">
      <div>
        <span className="eyebrow">{tag}</span>
        <h4 className="text-xl font-bold text-slate-900 mt-3 truncate">{name}</h4>
        <p className="text-xs text-slate-500 mt-0.5">{sub}</p>
      </div>
      <div className="mt-6 pt-3 border-t flex justify-between items-center" style={{ borderColor: "var(--line)" }}>
        <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">{metricLabel}</span>
        <span className="metric font-bold text-slate-900">{metricValue}</span>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { token } = useAuth();
  const { addToast } = useToast();
  const [users, setUsers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, []);
  const fetchData = async () => {
    try {
      setLoading(true);
      const [u, c, e, d] = await Promise.all([
        axios.get(`${API}/users/?token=${token}`),
        axios.get(`${API}/courses/?token=${token}`),
        axios.get(`${API}/progress/admin/all?token=${token}`),
        axios.get(`${API}/departments/?token=${token}`),
      ]);
      setUsers(u.data); setCourses(c.data); setEnrollments(e.data); setDepartments(d.data);
    } catch { addToast("Eroare la încărcarea datelor", "error"); }
    finally { setLoading(false); }
  };

  const students = users.filter((u) => u.role === "student");
  const teachers = users.filter((u) => u.role === "manager");
  const completed = enrollments.filter((e) => e.completed).length;
  const avgProgress = enrollments.length ? Math.round(enrollments.reduce((s, e) => s + e.progress_percent, 0) / enrollments.length) : 0;

  const topStudent = students.map((u) => {
    const ue = enrollments.filter((e) => e.user_id === u.id);
    return { ...u, avg: ue.length ? Math.round(ue.reduce((s, e) => s + e.progress_percent, 0) / ue.length) : 0 };
  }).sort((a, b) => b.avg - a.avg)[0];
  const topTeacher = teachers.map((u) => ({ ...u, count: courses.filter((c) => c.created_by === u.id).length })).sort((a, b) => b.count - a.count)[0];
  const topCourse = courses.map((c) => ({ ...c, count: enrollments.filter((e) => e.course_id === c.id).length })).sort((a, b) => b.count - a.count)[0];

  const deptChart = departments.map((d) => {
    const dUsers = users.filter((u) => u.department_id === d.id);
    const dEnr = enrollments.filter((e) => dUsers.some((u) => u.id === e.user_id));
    return { name: d.name.slice(0, 14), studenți: dUsers.filter((u) => u.role === "student").length, cursuri: dEnr.length };
  });

  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-500">Se încarcă...</div>;

  return (
    <div className="min-h-screen pb-12">
      <div className="bg-white border-b px-6 py-9" style={{ borderColor: "var(--line)" }}>
        <div className="max-w-7xl mx-auto">
          <span className="eyebrow">Administrare</span>
          <h1 className="text-3xl font-extrabold text-slate-900 mt-1">Panou de administrare</h1>
          <p className="text-slate-500 mt-1">Situația centralizată a platformei.</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 space-y-8 mt-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Stat label="Utilizatori" value={users.length} />
          <Stat label="Studenți" value={students.length} />
          <Stat label="Profesori" value={teachers.length} />
          <Stat label="Cursuri absolvite" value={completed} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 surface p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-1">Departamente & înscrieri</h3>
            <p className="text-xs text-slate-400 mb-6">Studenți și cursuri active per departament.</p>
            {deptChart.length === 0 ? <div className="text-center py-12 text-slate-400 text-sm">Nu există departamente.</div> : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={deptChart} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef1f4" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} dy={10} />
                  <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e3e7ec" }} />
                  <Bar dataKey="studenți" radius={[6, 6, 0, 0]} maxBarSize={32}>{deptChart.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Bar>
                  <Bar dataKey="cursuri" fill="#e3e7ec" radius={[6, 6, 0, 0]} maxBarSize={32} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="surface p-6 flex flex-col gap-5">
            <h3 className="text-base font-bold text-slate-900">Eficiență platformă</h3>
            {[{ label: "Progres mediu", value: `${avgProgress}%`, pct: avgProgress }, { label: "Rată absolvire", value: enrollments.length ? `${Math.round((completed / enrollments.length) * 100)}%` : "0%", pct: enrollments.length ? Math.round((completed / enrollments.length) * 100) : 0 }].map((it, i) => (
              <div key={i}>
                <div className="flex justify-between items-end mb-2">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{it.label}</span>
                  <span className="metric font-bold text-slate-900">{it.value}</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${it.pct}%`, background: "var(--accent)" }} /></div>
              </div>
            ))}
            <div className="grid grid-cols-2 gap-3 pt-3 border-t mt-auto" style={{ borderColor: "var(--line)" }}>
              <div className="text-center p-2.5 rounded-xl bg-slate-50 border" style={{ borderColor: "var(--line)" }}>
                <span className="metric text-xl font-bold text-slate-900 block">{courses.length}</span>
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Cursuri</span>
              </div>
              <div className="text-center p-2.5 rounded-xl bg-slate-50 border" style={{ borderColor: "var(--line)" }}>
                <span className="metric text-xl font-bold text-slate-900 block">{departments.length}</span>
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Departamente</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Spotlight tag="Cursant de top" name={topStudent ? topStudent.full_name : "N/A"} sub="Progres mediu" metricLabel="Rating" metricValue={topStudent ? `${topStudent.avg}%` : "—"} />
          <Spotlight tag="Profesor activ" name={topTeacher ? topTeacher.full_name : "N/A"} sub={(topTeacher && departments.find((d) => d.id === topTeacher.department_id)?.name) || "—"} metricLabel="Cursuri" metricValue={topTeacher ? topTeacher.count : "—"} />
          <Spotlight tag="Curs popular" name={topCourse ? topCourse.title : "N/A"} sub="Cele mai multe înscrieri" metricLabel="Înscrieri" metricValue={topCourse ? topCourse.count : "—"} />
        </div>

        <div className="surface overflow-hidden">
          <div className="px-6 py-5 border-b flex justify-between items-center" style={{ borderColor: "var(--line)" }}>
            <h3 className="text-base font-bold text-slate-900">Înscrieri recente</h3>
            <span className="text-xs font-semibold text-slate-400">{enrollments.length} total</span>
          </div>
          {enrollments.length === 0 ? <p className="text-center py-12 text-slate-400">Nicio activitate recentă.</p> : (
            <div className="overflow-x-auto">
              <table className="data">
                <thead><tr><th>Student</th><th>Curs</th><th style={{ textAlign: "center" }}>Progres</th><th style={{ textAlign: "center" }}>Status</th></tr></thead>
                <tbody>
                  {enrollments.slice(0, 6).map((e) => {
                    const u = users.find((x) => x.id === e.user_id);
                    const c = courses.find((x) => x.id === e.course_id);
                    return (
                      <tr key={e.id}>
                        <td className="font-semibold text-slate-900">{u?.full_name || "—"}</td>
                        <td className="text-slate-600 truncate max-w-[240px]">{c?.title || "—"}</td>
                        <td style={{ textAlign: "center" }}>
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-24 bg-slate-100 rounded-full h-1.5 overflow-hidden"><div className="h-full rounded-full" style={{ width: `${e.progress_percent}%`, background: e.completed ? "#10b981" : "var(--accent)" }} /></div>
                            <span className="metric text-xs text-slate-600 w-8 text-right">{e.progress_percent}%</span>
                          </div>
                        </td>
                        <td style={{ textAlign: "center" }}><span className={`tag ${e.completed ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-800 border-amber-200"}`}>{e.completed ? "Finalizat" : "Activ"}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}