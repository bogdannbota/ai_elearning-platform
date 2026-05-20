import { useAuth } from "../../context/AuthContext";
import { useEffect, useState } from "react";
import axios from "axios";
import { useToast } from "../../context/ToastContext";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell
} from "recharts";

const API = "http://127.0.0.1:8000";

// ─── Stat Card ───────────────────────────────────────────────
function StatCard({ icon, label, value, sub, color = "blue" }) {
  const map = {
    blue:   { ring: "ring-blue-500/20",   bg: "bg-blue-500/10",   icon: "bg-blue-500/20",   text: "text-blue-400" },
    green:  { ring: "ring-green-500/20",  bg: "bg-green-500/10",  icon: "bg-green-500/20",  text: "text-green-400" },
    purple: { ring: "ring-purple-500/20", bg: "bg-purple-500/10", icon: "bg-purple-500/20", text: "text-purple-400" },
    amber:  { ring: "ring-amber-500/20",  bg: "bg-amber-500/10",  icon: "bg-amber-500/20",  text: "text-amber-400" },
    red:    { ring: "ring-red-500/20",    bg: "bg-red-500/10",    icon: "bg-red-500/20",    text: "text-red-400" },
  };
  const c = map[color];
  return (
    <div className={`rounded-2xl p-5 flex items-center gap-4 ${c.bg} ring-1 ${c.ring}`}>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${c.icon}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-400 mb-0.5">{label}</p>
        <p className={`text-2xl font-bold ${c.text}`}>{value}</p>
        {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Rank Row ────────────────────────────────────────────────
function RankRow({ rank, initials, name, sub, value, color = "blue" }) {
  const avatarColors = {
    blue:   "bg-blue-500/20 text-blue-400",
    green:  "bg-green-500/20 text-green-400",
    purple: "bg-purple-500/20 text-purple-400",
  };
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-white/5 last:border-0">
      <span className="text-xs text-gray-600 w-5">#{rank}</span>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${avatarColors[color] || avatarColors.blue}`}>
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">{name}</p>
        {sub && <p className="text-xs text-gray-500">{sub}</p>}
      </div>
      <span className="text-xs font-semibold text-gray-400 flex-shrink-0">{value}</span>
    </div>
  );
}

// ─── Main ────────────────────────────────────────────────────
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
      addToast("Eroare la încărcarea datelor", "error");
    } finally {
      setLoading(false);
    }
  };

  // Calcule
  const students  = users.filter((u) => u.role === "student");
  const teachers  = users.filter((u) => u.role === "manager");
  const completed = enrollments.filter((e) => e.completed).length;
  const avgProgress = enrollments.length > 0
    ? Math.round(enrollments.reduce((s, e) => s + e.progress_percent, 0) / enrollments.length)
    : 0;

  // Top cursuri după număr de înscrierii
  const topCourses = courses
    .map((c) => ({
      ...c,
      count: enrollments.filter((e) => e.course_id === c.id).length,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Top studenți după progres mediu
  const topStudents = students
    .map((u) => {
      const ue = enrollments.filter((e) => e.user_id === u.id);
      const avg = ue.length > 0
        ? Math.round(ue.reduce((s, e) => s + e.progress_percent, 0) / ue.length)
        : 0;
      return { ...u, avgProgress: avg };
    })
    .sort((a, b) => b.avgProgress - a.avgProgress)
    .slice(0, 3);

  // Date chart departamente
  const deptChart = departments.map((d) => {
    const dUsers = users.filter((u) => u.department_id === d.id);
    const dEnrollments = enrollments.filter((e) =>
      dUsers.some((u) => u.id === e.user_id)
    );
    return {
      name: d.name.slice(0, 12),
      studenți: dUsers.filter((u) => u.role === "student").length,
      cursuri: dEnrollments.length,
    };
  });

  const COLORS = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444"];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">Se încarcă datele...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">

      {/* Header */}
      <div className="bg-gradient-to-br from-gray-900 via-indigo-950/20 to-gray-900 border-b border-white/5 px-6 py-10">
        <div className="max-w-7xl mx-auto">
          <p className="text-gray-500 text-xs mb-1 uppercase tracking-widest">Admin</p>
          <h1 className="text-3xl font-bold mb-8">Panou de administrare</h1>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <StatCard icon="👥" label="Total utilizatori" value={users.length}       color="blue"   />
            <StatCard icon="🎓" label="Studenți"           value={students.length}   color="purple" />
            <StatCard icon="🧑‍🏫" label="Profesori"        value={teachers.length}   color="green"  />
            <StatCard icon="📚" label="Cursuri"            value={courses.length}    color="amber"  />
            <StatCard icon="✅" label="Finalizări"         value={completed}         color="green"  />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">

        {/* Rândul 1: Top 3 coloane */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Top studenți */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              🏆 Top cursanți
            </h3>
            {topStudents.length === 0 ? (
              <p className="text-xs text-gray-500 py-4 text-center">Nu există date</p>
            ) : (
              topStudents.map((u, i) => (
                <RankRow
                  key={u.id}
                  rank={i + 1}
                  initials={u.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                  name={u.full_name}
                  sub="Cursant"
                  value={`${u.avgProgress}%`}
                  color={["blue", "purple", "green"][i]}
                />
              ))
            )}
          </div>

          {/* Top profesori */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              ⭐ Top profesori
            </h3>
            {teachers.length === 0 ? (
              <p className="text-xs text-gray-500 py-4 text-center">Nu există profesori</p>
            ) : (
              teachers.slice(0, 3).map((u, i) => {
                const courseCount = courses.filter((c) => c.created_by === u.id).length;
                return (
                  <RankRow
                    key={u.id}
                    rank={i + 1}
                    initials={u.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                    name={u.full_name}
                    sub={departments.find((d) => d.id === u.department_id)?.name || "—"}
                    value={`${courseCount} cursuri`}
                    color={["blue", "purple", "green"][i]}
                  />
                );
              })
            )}
          </div>

          {/* Top cursuri */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              🔥 Top cursuri
            </h3>
            {topCourses.length === 0 ? (
              <p className="text-xs text-gray-500 py-4 text-center">Nu există cursuri</p>
            ) : (
              topCourses.slice(0, 3).map((c, i) => (
                <RankRow
                  key={c.id}
                  rank={i + 1}
                  initials="📖"
                  name={c.title}
                  sub="Curs"
                  value={`${c.count} viz`}
                  color={["blue", "purple", "green"][i]}
                />
              ))
            )}
          </div>
        </div>

        {/* Rândul 2: Chart + Statistici rapide */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Bar chart departamente */}
          <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4">📊 Activitate pe departamente</h3>
            {deptChart.length === 0 ? (
              <p className="text-xs text-gray-500 py-8 text-center">Nu există departamente</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={deptChart} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" tick={{ fill: "#6b7280", fontSize: 11 }} />
                  <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ background: "#111827", border: "none", borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: "#9ca3af" }}
                  />
                  <Bar dataKey="studenți" radius={[4, 4, 0, 0]}>
                    {deptChart.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                  <Bar dataKey="cursuri" fill="rgba(255,255,255,0.1)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Statistici rapide */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col gap-4">
            <h3 className="text-sm font-semibold text-white">⚡ Statistici rapide</h3>

            {[
              {
                label: "Progres mediu global",
                value: `${avgProgress}%`,
                bar: avgProgress,
                color: "bg-blue-500",
              },
              {
                label: "Rată finalizare",
                value: enrollments.length > 0
                  ? `${Math.round((completed / enrollments.length) * 100)}%`
                  : "0%",
                bar: enrollments.length > 0
                  ? Math.round((completed / enrollments.length) * 100)
                  : 0,
                color: "bg-green-500",
              },
              {
                label: "Studenți activi",
                value: `${students.length}`,
                bar: users.length > 0 ? Math.round((students.length / users.length) * 100) : 0,
                color: "bg-purple-500",
              },
            ].map(({ label, value, bar, color }) => (
              <div key={label}>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-gray-400">{label}</span>
                  <span className="text-white font-semibold">{value}</span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-1.5">
                  <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${bar}%` }} />
                </div>
              </div>
            ))}

            <div className="mt-auto pt-2 border-t border-white/5">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/5 rounded-xl p-3 text-center">
                  <p className="text-lg font-bold text-amber-400">{courses.length}</p>
                  <p className="text-xs text-gray-500">Cursuri totale</p>
                </div>
                <div className="bg-white/5 rounded-xl p-3 text-center">
                  <p className="text-lg font-bold text-green-400">{departments.length}</p>
                  <p className="text-xs text-gray-500">Departamente</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Rândul 3: Tabel înscrieri recente */}
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">📋 Înscrieri recente</h3>
            <span className="text-xs text-gray-500">{enrollments.length} total</span>
          </div>
          {enrollments.length === 0 ? (
            <p className="text-xs text-gray-500 text-center py-8">Nu există înscrieri.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Curs</th>
                    <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Progres</th>
                    <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {enrollments.slice(0, 8).map((e) => {
                    const u = users.find((u) => u.id === e.user_id);
                    const c = courses.find((c) => c.id === e.course_id);
                    return (
                      <tr key={e.id} className="border-b border-white/5 hover:bg-white/5 transition">
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-bold flex-shrink-0">
                              {u?.full_name?.charAt(0) || "?"}
                            </div>
                            <span className="text-white font-medium">{u?.full_name || "—"}</span>
                          </div>
                        </td>
                        <td className="px-6 py-3 text-gray-400 truncate max-w-xs">{c?.title || "—"}</td>
                        <td className="px-6 py-3">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-20 bg-white/10 rounded-full h-1.5">
                              <div
                                className={`h-1.5 rounded-full ${e.completed ? "bg-green-500" : "bg-blue-500"}`}
                                style={{ width: `${e.progress_percent}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-400 w-8 text-right">{e.progress_percent}%</span>
                          </div>
                        </td>
                        <td className="px-6 py-3 text-center">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                            e.completed
                              ? "bg-green-500/20 text-green-400"
                              : "bg-amber-500/20 text-amber-400"
                          }`}>
                            {e.completed ? "✓ Finalizat" : "⏳ În progres"}
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
