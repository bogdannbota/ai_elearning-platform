import { useAuth } from "../../context/AuthContext";
import { useEffect, useState } from "react";
import axios from "axios";
import { useToast } from "../../context/ToastContext";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from "recharts";

const API = "http://127.0.0.1:8000";

// ─── Stat Card ───────────────────────────────────────────────
function StatCard({ icon, label, value, color = "blue", alert = false }) {
  const map = {
    blue:   { bg: "bg-blue-500/10",   icon: "bg-blue-500/20",   text: "text-blue-400",   ring: "ring-blue-500/20"   },
    green:  { bg: "bg-green-500/10",  icon: "bg-green-500/20",  text: "text-green-400",  ring: "ring-green-500/20"  },
    purple: { bg: "bg-purple-500/10", icon: "bg-purple-500/20", text: "text-purple-400", ring: "ring-purple-500/20" },
    red:    { bg: "bg-red-500/10",    icon: "bg-red-500/20",    text: "text-red-400",    ring: "ring-red-500/20"    },
    amber:  { bg: "bg-amber-500/10",  icon: "bg-amber-500/20",  text: "text-amber-400",  ring: "ring-amber-500/20"  },
  };
  const c = map[color];
  return (
    <div className={`rounded-2xl p-5 flex items-center gap-4 ${c.bg} ring-1 ${c.ring} ${alert ? "animate-pulse" : ""}`}>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${c.icon}`}>
        {icon}
      </div>
      <div>
        <p className="text-xs text-gray-400 mb-0.5">{label}</p>
        <p className={`text-2xl font-bold ${c.text}`}>{value}</p>
      </div>
    </div>
  );
}

// ─── Exam Pending Row ─────────────────────────────────────────
function PendingRow({ name, courseName, time }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs font-bold flex-shrink-0">
          {name?.charAt(0) || "?"}
        </div>
        <div>
          <p className="text-sm font-medium text-white">{name}</p>
          <p className="text-xs text-gray-500">{courseName}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500">{time}</span>
        <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded-full font-medium">
          Pending
        </span>
      </div>
    </div>
  );
}

// ─── Main ────────────────────────────────────────────────────
export default function ManagerDashboard() {
  const { user, token } = useAuth();
  const { addToast } = useToast();

  const [myCourses, setMyCourses]     = useState([]);
  const [allUsers, setAllUsers]       = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading]         = useState(true);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [cRes, uRes, eRes] = await Promise.all([
        axios.get(`${API}/courses/?token=${token}`),
        axios.get(`${API}/users/?token=${token}`),
        axios.get(`${API}/progress/admin/all?token=${token}`),
      ]);
      // Filtrăm doar cursurile create de userul curent (manager)
      const mine = cRes.data.filter((c) => c.created_by === user?.id);
      setMyCourses(mine);
      setAllUsers(uRes.data);
      setEnrollments(eRes.data);
    } catch {
      addToast("Eroare la încărcarea datelor", "error");
    } finally {
      setLoading(false);
    }
  };

  // Studenții înscriși la cursurile mele
  const myCourseIds = myCourses.map((c) => c.id);
  const myEnrollments = enrollments.filter((e) => myCourseIds.includes(e.course_id));
  const uniqueStudentIds = [...new Set(myEnrollments.map((e) => e.user_id))];
  const myStudents = allUsers.filter((u) => uniqueStudentIds.includes(u.id));

  const avgProgress = myEnrollments.length > 0
    ? Math.round(myEnrollments.reduce((s, e) => s + e.progress_percent, 0) / myEnrollments.length)
    : 0;
  const completedCount = myEnrollments.filter((e) => e.completed).length;

  // Date grafic progres per curs (ultimele 6)
  const chartData = myCourses.slice(0, 6).map((c) => {
    const ce = myEnrollments.filter((e) => e.course_id === c.id);
    const avg = ce.length > 0
      ? Math.round(ce.reduce((s, e) => s + e.progress_percent, 0) / ce.length)
      : 0;
    return {
      name: c.title.slice(0, 14) + (c.title.length > 14 ? "…" : ""),
      progres: avg,
      studenți: ce.length,
    };
  });

  // Simulăm examene pending (în producție vin de la /exams/grading/pending)
  const pendingExams = [];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">Se încarcă...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">

      {/* Header */}
      <div className="bg-gradient-to-br from-gray-900 via-purple-950/20 to-gray-900 border-b border-white/5 px-6 py-10">
        <div className="max-w-6xl mx-auto">
          <p className="text-gray-500 text-xs mb-1 uppercase tracking-widest">Profesor</p>
          <h1 className="text-3xl font-bold mb-8">
            Bună, {user?.full_name?.split(" ")[0] || "Profesor"} 👋
          </h1>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon="📚" label="Cursuri create"      value={myCourses.length}     color="blue"   />
            <StatCard icon="👥" label="Studenți activi"     value={myStudents.length}    color="green"  />
            <StatCard icon="📊" label="Progres mediu"       value={`${avgProgress}%`}    color="purple" />
            <StatCard
              icon="⏰"
              label="De corectat"
              value={pendingExams.length}
              color={pendingExams.length > 0 ? "red" : "amber"}
              alert={pendingExams.length > 0}
            />
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Left: 2 coloane */}
        <div className="lg:col-span-2 space-y-6">

          {/* Alert examene pending */}
          {pendingExams.length > 0 && (
            <div className="bg-amber-500/10 ring-1 ring-amber-500/30 rounded-2xl p-4 flex items-center gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <p className="text-sm font-semibold text-amber-400">
                  {pendingExams.length} examene așteaptă corectare
                </p>
                <p className="text-xs text-gray-400">Răspunsuri cu text liber care necesită notare manuală</p>
              </div>
              <button className="ml-auto px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 text-xs font-semibold rounded-xl transition">
                Corectează →
              </button>
            </div>
          )}

          {/* Grafic progres cursuri */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4">📈 Progres mediu per curs</h3>
            {chartData.length === 0 ? (
              <p className="text-xs text-gray-500 py-8 text-center">Nu ai cursuri create încă.</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" tick={{ fill: "#6b7280", fontSize: 10 }} />
                  <YAxis tick={{ fill: "#6b7280", fontSize: 10 }} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{ background: "#111827", border: "none", borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: "#9ca3af" }}
                  />
                  <Area type="monotone" dataKey="progres" stroke="#8b5cf6" fill="url(#grad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Cursurile mele */}
          <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">📚 Cursurile mele</h3>
              <span className="text-xs text-gray-500">{myCourses.length} cursuri</span>
            </div>
            {myCourses.length === 0 ? (
              <p className="text-xs text-gray-500 text-center py-8">Nu ai creat niciun curs.</p>
            ) : (
              <div className="divide-y divide-white/5">
                {myCourses.slice(0, 5).map((c) => {
                  const ce = myEnrollments.filter((e) => e.course_id === c.id);
                  const avg = ce.length > 0
                    ? Math.round(ce.reduce((s, e) => s + e.progress_percent, 0) / ce.length)
                    : 0;
                  return (
                    <div key={c.id} className="px-5 py-4 flex items-center gap-4 hover:bg-white/5 transition">
                      <div className="w-9 h-9 rounded-xl bg-blue-500/20 flex items-center justify-center text-sm flex-shrink-0">
                        📖
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{c.title}</p>
                        <p className="text-xs text-gray-500">{ce.length} studenți înscriși</p>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="w-20 bg-white/10 rounded-full h-1.5">
                          <div
                            className="h-1.5 rounded-full bg-purple-500"
                            style={{ width: `${avg}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-400 w-10 text-right">{avg}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Examene de corectat */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4">✏️ Examene de corectat</h3>
            {pendingExams.length === 0 ? (
              <div className="flex flex-col items-center py-6 gap-2">
                <span className="text-3xl">🎉</span>
                <p className="text-sm text-gray-400">Toate examenele sunt corectate!</p>
              </div>
            ) : (
              pendingExams.map((e, i) => (
                <PendingRow key={i} name={e.studentName} courseName={e.courseName} time={e.time} />
              ))
            )}
          </div>
        </div>

        {/* Right sidebar */}
        <div className="space-y-6">

          {/* Statistici */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4">⚡ Statisticile mele</h3>
            <div className="space-y-4">
              {[
                { label: "Progres mediu studenți", value: avgProgress, color: "bg-purple-500" },
                {
                  label: "Rată finalizare",
                  value: myEnrollments.length > 0
                    ? Math.round((completedCount / myEnrollments.length) * 100)
                    : 0,
                  color: "bg-green-500",
                },
              ].map(({ label, value, color }) => (
                <div key={label}>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-gray-400">{label}</span>
                    <span className="text-white font-semibold">{value}%</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-1.5">
                    <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${value}%` }} />
                  </div>
                </div>
              ))}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="bg-white/5 rounded-xl p-3 text-center">
                  <p className="text-lg font-bold text-green-400">{completedCount}</p>
                  <p className="text-xs text-gray-500">Finalizări</p>
                </div>
                <div className="bg-white/5 rounded-xl p-3 text-center">
                  <p className="text-lg font-bold text-blue-400">{myEnrollments.length}</p>
                  <p className="text-xs text-gray-500">Înscrieri total</p>
                </div>
              </div>
            </div>
          </div>

          {/* Studenții mei */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4">👥 Studenții mei</h3>
            {myStudents.length === 0 ? (
              <p className="text-xs text-gray-500 text-center py-4">Niciun student înscris.</p>
            ) : (
              <div className="space-y-2">
                {myStudents.slice(0, 5).map((u) => {
                  const ue = myEnrollments.filter((e) => e.user_id === u.id);
                  const avg = ue.length > 0
                    ? Math.round(ue.reduce((s, e) => s + e.progress_percent, 0) / ue.length)
                    : 0;
                  return (
                    <div key={u.id} className="flex items-center gap-3 py-1.5">
                      <div className="w-7 h-7 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {u.full_name?.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-white truncate">{u.full_name}</p>
                        <div className="w-full bg-white/10 rounded-full h-1 mt-1">
                          <div
                            className={`h-1 rounded-full ${avg === 100 ? "bg-green-500" : "bg-blue-500"}`}
                            style={{ width: `${avg}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-xs text-gray-500 flex-shrink-0">{avg}%</span>
                    </div>
                  );
                })}
                {myStudents.length > 5 && (
                  <p className="text-xs text-gray-500 text-center pt-2">+{myStudents.length - 5} mai mulți</p>
                )}
              </div>
            )}
          </div>

          {/* Acțiuni rapide */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4">🚀 Acțiuni rapide</h3>
            <div className="space-y-2">
              {[
                { label: "Creează un curs nou", icon: "📚", href: "/admin/cursuri" },
                { label: "Planuri de învățare", icon: "🗺️", href: "/learning-plans" },
                { label: "Examene", icon: "📝", href: "/my-exams" },
              ].map(({ label, icon, href }) => (
                <a
                  key={href}
                  href={href}
                  className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition border border-white/5 hover:border-white/15 group"
                >
                  <span className="text-lg">{icon}</span>
                  <span className="text-sm text-gray-400 group-hover:text-white transition">{label}</span>
                  <span className="ml-auto text-gray-600 group-hover:text-gray-400 transition">→</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
