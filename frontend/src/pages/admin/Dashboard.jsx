import { useAuth } from "../../context/AuthContext";
import { useEffect, useState } from "react";
import axios from "axios";
import { useToast } from "../../context/ToastContext";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

const API = "http://127.0.0.1:8000";

// ─── Stat Card Metric ─────────────────────────────────────────
function MetricTile({ icon, label, value, trend, color = "cyan" }) {
  const colorMap = {
    cyan:   "from-cyan-500 to-blue-500 text-cyan-600 bg-cyan-50/60 border-cyan-100/70",
    purple: "from-purple-500 to-indigo-500 text-purple-600 bg-purple-50/60 border-purple-100/70",
    green:  "from-green-500 to-emerald-500 text-green-600 bg-green-50/60 border-green-100/70",
    amber:  "from-amber-500 to-orange-500 text-amber-600 bg-amber-50/60 border-amber-100/70",
  };
  const classes = colorMap[color] || colorMap.cyan;

  return (
    <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden group">
      <div className="flex items-center justify-between relative z-10">
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">{label}</p>
          <p className="text-3xl font-black text-gray-900 tracking-tight">{value}</p>
        </div>
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-sm border ${classes.split(" ")[2]} ${classes.split(" ")[3]} ${classes.split(" ")[1]}`}>
          {icon}
        </div>
      </div>
      <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-gradient-to-br opacity-[0.03] rounded-full group-hover:scale-125 transition-transform duration-500 pointer-events-none" />
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────
export default function AdminDashboard() {
  const { token } = useAuth();
  const { addToast } = useToast();

  const [users, setUsers]           = useState([]);
  const [courses, setCourses]       = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading]       = useState(true);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [uRes, cRes, eRes, dRes] = await Promise.all([
        axios.get(`${API}/users/?token=${token}`),
        axios.get(`${API}/courses/?token=${token}`),
        axios.get(`${API}/progress/admin/all?token=${token}`),
        axios.get(`${API}/departments/?token=${token}`),
      ]);
      setUsers(uRes.data);
      setCourses(cRes.data);
      setEnrollments(eRes.data);
      setDepartments(dRes.data);
    } catch {
      addToast("Eroare la încărcarea datelor dashboard", "error");
    } finally {
      setLoading(false);
    }
  };

  const students  = users.filter((u) => u.role === "student");
  const teachers  = users.filter((u) => u.role === "manager");
  const completed = enrollments.filter((e) => e.completed).length;
  const avgProgress = enrollments.length > 0 ? Math.round(enrollments.reduce((s, e) => s + e.progress_percent, 0) / enrollments.length) : 0;

  // Extragem doar locul #1 absolut din fiecare categorie pentru Spotlight Center
  const topStudent = students
    .map((u) => {
      const ue = enrollments.filter((e) => e.user_id === u.id);
      return { ...u, avg: ue.length > 0 ? Math.round(ue.reduce((s, e) => s + e.progress_percent, 0) / ue.length) : 0 };
    })
    .sort((a, b) => b.avg - a.avg)[0];

  const topTeacher = teachers
    .map((u) => ({ ...u, count: courses.filter((c) => c.created_by === u.id).length }))
    .sort((a, b) => b.count - a.count)[0];

  const topCourse = courses
    .map((c) => ({ ...c, count: enrollments.filter((e) => e.course_id === c.id).length }))
    .sort((a, b) => b.count - a.count)[0];

  const deptChart = departments.map((d) => {
    const dUsers = users.filter((u) => u.department_id === d.id);
    const dEnrollments = enrollments.filter((e) => dUsers.some((u) => u.id === e.user_id));
    return { name: d.name.slice(0, 15), studenți: dUsers.filter((u) => u.role === "student").length, cursuri: dEnrollments.length };
  });

  const CHART_COLORS = ["#06b6d4", "#f59e0b", "#10b981", "#8b5cf6", "#ef4444"];

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-cyan-200 border-t-cyan-500 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-12 animate-in fade-in duration-500">

      {/* Header Banner */}
      <div className="bg-white border-b border-gray-100 px-6 py-10 relative overflow-hidden mb-8">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-50/40 via-white to-amber-50/20 pointer-events-none" />
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-cyan-50 text-cyan-700 rounded-lg text-xs font-bold uppercase tracking-wider mb-3">
            <span>⚙️</span> Control Panel
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Panou de Administrare</h1>
          <p className="text-sm text-gray-500 mt-1 font-medium">Situația centralizată a platformei e-learning inteligente.</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 space-y-8">

        {/* METRICS ROW (4 elemente compacte) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricTile icon="👥" label="Utilizatori Activi" value={users.length}     color="cyan"   />
          <MetricTile icon="🎓" label="Total Studenți"   value={students.length}  color="purple" />
          <MetricTile icon="🧑‍🏫" label="Corp Profesoral"  value={teachers.length}  color="green"  />
          <MetricTile icon="✅" label="Cursuri Absolvite" value={completed}        color="amber"  />
        </div>

        {/* BENTO SECTION 1: GRAFIC MASIV + STATISTICI RAPIDE */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Card Grafic Mare (Stânga - 2/3) */}
          <div className="lg:col-span-2 bg-white border border-gray-100 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
            <div className="mb-6">
              <h3 className="text-lg font-extrabold text-gray-900 tracking-tight">Departamente & Înscrieri</h3>
              <p className="text-xs font-medium text-gray-400 mt-0.5">Volumul de cursuri active raportat la numărul de studenți per specializare.</p>
            </div>
            
            {deptChart.length === 0 ? (
              <div className="text-center py-12 text-gray-400 font-medium text-sm">Nu există structură de departamente în baza de date.</div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={deptChart} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f4f5f7" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: "#9ca3af", fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} dy={10} />
                  <YAxis tick={{ fill: "#9ca3af", fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: "#ffffff", border: "1px solid #f3f4f6", borderRadius: 16, boxShadow: "0 10px 15px -3px rgba(0,0,0,0.05)" }} />
                  <Bar dataKey="studenți" radius={[6, 6, 0, 0]} maxBarSize={32}>
                    {deptChart.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Bar>
                  <Bar dataKey="cursuri" fill="#f3f4f6" radius={[6, 6, 0, 0]} maxBarSize={32} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Card Indicatori Progres (Dreapta - 1/3) */}
          <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm flex flex-col justify-between gap-5">
            <div>
              <h3 className="text-base font-extrabold text-gray-900 tracking-tight">Eficiență Platformă</h3>
              <p className="text-xs font-medium text-gray-400 mt-0.5">Metrici de performanță globală.</p>
            </div>

            <div className="space-y-4 flex-1 flex flex-col justify-center">
              {[
                { label: "Progres Mediu Cursanți", value: `${avgProgress}%`, pct: avgProgress, barColor: "bg-cyan-500", tileBg: "bg-cyan-50/30" },
                { label: "Rată de Absolvire", value: enrollments.length > 0 ? `${Math.round((completed / enrollments.length) * 100)}%` : "0%", pct: enrollments.length > 0 ? Math.round((completed / enrollments.length) * 100) : 0, barColor: "bg-emerald-500", tileBg: "bg-emerald-50/30" },
              ].map((item, i) => (
                <div key={i} className={`${item.tileBg} border border-gray-50 p-4 rounded-2xl`}>
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">{item.label}</span>
                    <span className="text-lg font-black text-gray-900 leading-none">{item.value}</span>
                  </div>
                  <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${item.barColor} transition-all duration-1000`} style={{ width: `${item.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-50">
              <div className="text-center p-2.5 bg-gray-50 rounded-xl border border-gray-100">
                <span className="text-xl font-black text-gray-900 block">{courses.length}</span>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Cursuri</span>
              </div>
              <div className="text-center p-2.5 bg-gray-50 rounded-xl border border-gray-100">
                <span className="text-xl font-black text-gray-900 block">{departments.length}</span>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Catedre</span>
              </div>
            </div>
          </div>
        </div>

        {/* BENTO SECTION 2: SPOTLIGHT SHOWCASE (REPLACE PENTRU POZA 3) */}
        <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">
          <div className="mb-6">
            <h3 className="text-lg font-extrabold text-gray-900 tracking-tight">Evidențieri de Performanță</h3>
            <p className="text-xs font-medium text-gray-400 mt-0.5">Topul absolut al entităților din platformă, fără tabele aglomerate.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Spotlight 1: Studentul de Top */}
            <div className="bg-gradient-to-br from-cyan-50/40 via-white to-white border border-cyan-100/50 rounded-2xl p-5 flex flex-col justify-between shadow-sm relative overflow-hidden group">
              <span className="absolute right-4 top-4 text-3xl opacity-20 group-hover:scale-110 transition-transform">🏆</span>
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-cyan-600 bg-cyan-50 px-2.5 py-1 rounded-md">Cursantul Lunii</span>
                <h4 className="text-xl font-extrabold text-gray-900 mt-4 truncate">{topStudent ? topStudent.full_name : "N/A"}</h4>
                <p className="text-xs text-gray-500 font-medium mt-0.5">Progres mediu excepțional în aplicație.</p>
              </div>
              <div className="mt-6 pt-3 border-t border-gray-50 flex justify-between items-center">
                <span className="text-xs text-gray-400 font-bold">RATING MEDIU</span>
                <span className="text-base font-black text-cyan-600 bg-cyan-50 px-3 py-1 rounded-xl">{topStudent ? `${topStudent.avg}%` : "—"}</span>
              </div>
            </div>

            {/* Spotlight 2: Profesorul de Top */}
            <div className="bg-gradient-to-br from-purple-50/40 via-white to-white border border-purple-100/50 rounded-2xl p-5 flex flex-col justify-between shadow-sm relative overflow-hidden group">
              <span className="absolute right-4 top-4 text-3xl opacity-20 group-hover:scale-110 transition-transform">⭐</span>
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-purple-600 bg-purple-50 px-2.5 py-1 rounded-md">Cel Mai Activ Profesor</span>
                <h4 className="text-xl font-extrabold text-gray-900 mt-4 truncate">{topTeacher ? topTeacher.full_name : "N/A"}</h4>
                <p className="text-xs text-gray-500 font-medium mt-0.5">{topTeacher && departments.find((d) => d.id === topTeacher.department_id)?.name || "Facultate"}</p>
              </div>
              <div className="mt-6 pt-3 border-t border-gray-50 flex justify-between items-center">
                <span className="text-xs text-gray-400 font-bold">CURSURI PUBLICATE</span>
                <span className="text-base font-black text-purple-600 bg-purple-50 px-3 py-1 rounded-xl">{topTeacher ? `${topTeacher.count} Cursuri` : "—"}</span>
              </div>
            </div>

            {/* Spotlight 3: Cursul de Top */}
            <div className="bg-gradient-to-br from-amber-50/40 via-white to-white border border-amber-100/50 rounded-2xl p-5 flex flex-col justify-between shadow-sm relative overflow-hidden group">
              <span className="absolute right-4 top-4 text-3xl opacity-20 group-hover:scale-110 transition-transform">🔥</span>
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-600 bg-amber-50 px-2.5 py-1 rounded-md">Cel Mai Căutat Curs</span>
                <h4 className="text-xl font-extrabold text-gray-900 mt-4 truncate">{topCourse ? topCourse.title : "N/A"}</h4>
                <p className="text-xs text-gray-500 font-medium mt-0.5">Cel mai mare număr de interacțiuni și vizualizări.</p>
              </div>
              <div className="mt-6 pt-3 border-t border-gray-50 flex justify-between items-center">
                <span className="text-xs text-gray-400 font-bold">TOTAL ÎNSCRIERI</span>
                <span className="text-base font-black text-amber-600 bg-amber-50 px-3 py-1 rounded-xl">{topCourse ? `${topCourse.count} viz.` : "—"}</span>
              </div>
            </div>

          </div>
        </div>

        {/* BENTO SECTION 3: ULTIMELE ÎNSCRIERI RECENTE */}
        <div className="bg-white border border-gray-100 rounded-3xl shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
            <div>
              <h3 className="text-base font-extrabold text-gray-900 tracking-tight">📋 Înscrieri Recente</h3>
              <p className="text-xs font-medium text-gray-400 mt-0.5">Monitorizarea activității în timp real pe platformă.</p>
            </div>
            <span className="text-xs font-bold text-cyan-700 bg-cyan-50 px-3 py-1 rounded-lg">{enrollments.length} înscrieri</span>
          </div>

          {enrollments.length === 0 ? (
            <p className="text-sm font-medium text-gray-400 text-center py-12">Nu există activitate recentă.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-400 uppercase bg-white border-b border-gray-100 font-bold tracking-wider">
                  <tr>
                    <th className="px-6 py-4 font-bold text-gray-500">Student</th>
                    <th className="px-6 py-4 font-bold text-gray-500">Curs Solicitat</th>
                    <th className="px-6 py-4 font-bold text-center Richmond text-gray-500">Progres curent</th>
                    <th className="px-6 py-4 font-bold text-center text-gray-500">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {enrollments.slice(0, 5).map((e) => {
                    const u = users.find((userItem) => userItem.id === e.user_id);
                    const c = courses.find((courseItem) => courseItem.id === e.course_id);
                    return (
                      <tr key={e.id} className="hover:bg-cyan-50/20 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 text-white flex items-center justify-center text-xs font-black shadow-sm">
                              {u?.full_name?.charAt(0) || "?"}
                            </div>
                            <span className="text-gray-900 font-bold">{u?.full_name || "Utilizator șters"}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-600 font-medium truncate max-w-[240px]">{c?.title || "—"}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-3">
                            <div className="w-24 bg-gray-100 rounded-full h-1.5 overflow-hidden border border-gray-200">
                              <div className={`h-full rounded-full ${e.completed ? "bg-emerald-500" : "bg-cyan-500"}`} style={{ width: `${e.progress_percent}%` }} />
                            </div>
                            <span className="text-xs font-bold text-gray-700 w-8 text-right">{e.progress_percent}%</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider ${e.completed ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"}`}>
                            {e.completed ? "✓ Finalizat" : "⏳ Activ"}
                          </span>
                        </td>
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