import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";
import { useToast } from "../../context/ToastContext";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, BarChart, Bar
} from "recharts";

const API = "http://127.0.0.1:8000";

// ─── Stat Card ───────────────────────────────────────────────
function StatCard({ icon, label, value, color = "blue" }) {
  const colors = {
    blue:   { bg: "bg-blue-500/10",   icon: "bg-blue-500/20",   text: "text-blue-400" },
    green:  { bg: "bg-green-500/10",  icon: "bg-green-500/20",  text: "text-green-400" },
    purple: { bg: "bg-purple-500/10", icon: "bg-purple-500/20", text: "text-purple-400" },
    amber:  { bg: "bg-amber-500/10",  icon: "bg-amber-500/20",  text: "text-amber-400" },
  };
  const c = colors[color];
  return (
    <div className={`rounded-2xl p-5 flex items-center gap-4 ${c.bg} border border-white/5`}>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl ${c.icon}`}>
        {icon}
      </div>
      <div>
        <p className="text-xs text-gray-400 mb-1">{label}</p>
        <p className={`text-2xl font-bold ${c.text}`}>{value}</p>
      </div>
    </div>
  );
}

// ─── Course Card ─────────────────────────────────────────────
function CourseCard({ course, enrollment, onEnroll, onNavigate }) {
  const progress = enrollment?.progress_percent ?? 0;
  const completed = enrollment?.completed ?? false;

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:border-blue-500/40 transition-all hover:-translate-y-0.5">
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center text-lg flex-shrink-0">
          📚
        </div>
        {completed && (
          <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full font-medium">
            ✓ Finalizat
          </span>
        )}
        {enrollment && !completed && (
          <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded-full font-medium">
            În progres
          </span>
        )}
      </div>

      <h3 className="text-sm font-semibold text-white mb-1 leading-snug">{course.title}</h3>
      <p className="text-xs text-gray-500 mb-4 line-clamp-2">{course.description || "Fără descriere"}</p>

      {enrollment ? (
        <>
          <div className="flex justify-between text-xs text-gray-400 mb-1.5">
            <span>Progres</span>
            <span className="font-semibold text-blue-400">{progress}%</span>
          </div>
          <div className="w-full bg-white/10 rounded-full h-1.5 mb-4">
            <div
              className={`h-1.5 rounded-full transition-all ${completed ? "bg-green-500" : "bg-blue-500"}`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <button
            onClick={() => onNavigate(course.id)}
            className="w-full py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition"
          >
            ▶ Continuă
          </button>
        </>
      ) : (
        <button
          onClick={() => onEnroll(course.id)}
          className="w-full py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition border border-white/10"
        >
          + Înscrie-te
        </button>
      )}
    </div>
  );
}

// ─── Main ────────────────────────────────────────────────────
export default function StudentDashboard() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [courses, setCourses] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

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
    } catch {
      addToast("Eroare la încărcarea datelor", "error");
    } finally {
      setLoading(false);
    }
  };

  const getEnrollment = (id) => enrollments.find((e) => e.course_id === id);

  const handleEnroll = async (courseId) => {
    try {
      await axios.post(`${API}/progress/enroll/${courseId}?token=${token}`);
      addToast("Te-ai înscris cu succes!", "success");
      fetchData();
    } catch {
      addToast("Eroare la înscriere", "error");
    }
  };

  const enrolledCount = enrollments.length;
  const completedCount = enrollments.filter((e) => e.completed).length;
  const avgProgress = enrolledCount > 0
    ? Math.round(enrollments.reduce((s, e) => s + e.progress_percent, 0) / enrolledCount)
    : 0;

  const chartData = enrollments.slice(0, 6).map((e) => ({
    name: courses.find((c) => c.id === e.course_id)?.title?.slice(0, 15) + "..." || `Curs ${e.course_id}`,
    progres: e.progress_percent,
  }));

  const filtered = courses.filter((c) => {
    const enr = getEnrollment(c.id);
    const matchSearch = c.title.toLowerCase().includes(search.toLowerCase());
    if (filter === "enrolled") return enr && matchSearch;
    if (filter === "available") return !enr && matchSearch;
    return matchSearch;
  });

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
      <div className="bg-gradient-to-br from-gray-900 via-blue-950/30 to-gray-900 border-b border-white/5 px-6 py-10">
        <div className="max-w-6xl mx-auto">
          <p className="text-gray-400 text-sm mb-1">Tablou de bord</p>
          <h1 className="text-3xl font-bold mb-8">
            Bună, {user?.full_name?.split(" ")[0] || "Utilizator"} 👋
          </h1>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon="📚" label="Cursuri înscrise"  value={enrolledCount}    color="blue"   />
            <StatCard icon="✅" label="Finalizate"        value={completedCount}   color="green"  />
            <StatCard icon="📊" label="Progres mediu"     value={`${avgProgress}%`} color="purple" />
            <StatCard icon="🎯" label="Disponibile"       value={courses.length - enrolledCount} color="amber" />
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Left: cursuri */}
        <div className="lg:col-span-2 space-y-6">

          {/* Search + Filter */}
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="🔍 Caută cursuri..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
            />
            <div className="flex gap-2">
              {[
                { key: "all", label: "Toate" },
                { key: "enrolled", label: "Înscrise" },
                { key: "available", label: "Disponibile" },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
                    filter === key
                      ? "bg-blue-600 text-white"
                      : "bg-white/5 text-gray-400 hover:bg-white/10 border border-white/10"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Grid cursuri */}
          {filtered.length === 0 ? (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center text-gray-500">
              {search ? "Nu au fost găsite cursuri." : "Nu ai cursuri disponibile."}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filtered.map((c) => (
                <CourseCard
                  key={c.id}
                  course={c}
                  enrollment={getEnrollment(c.id)}
                  onEnroll={handleEnroll}
                  onNavigate={(id) => navigate(`/quiz/${id}`)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right: sidebar */}
        <div className="space-y-6">

          {/* Progres grafic */}
          {chartData.length > 0 && (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-white mb-4">📈 Progres cursuri</h3>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" tick={{ fill: "#6b7280", fontSize: 10 }} />
                  <YAxis tick={{ fill: "#6b7280", fontSize: 10 }} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{ background: "#1f2937", border: "none", borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: "#9ca3af" }}
                  />
                  <Bar dataKey="progres" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Situatie cursuri */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4">🎯 Situație cursuri</h3>
            <div className="space-y-3">
              {[
                { label: "Finalizate", value: completedCount, total: enrolledCount, color: "bg-green-500" },
                { label: "În progres", value: enrolledCount - completedCount, total: enrolledCount, color: "bg-blue-500" },
              ].map(({ label, value, total, color }) => (
                <div key={label}>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-gray-400">{label}</span>
                    <span className="text-white font-semibold">{value} / {total}</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full ${color}`}
                      style={{ width: total > 0 ? `${(value / total) * 100}%` : "0%" }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={() => navigate("/my-exams")}
              className="w-full mt-5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white text-xs font-semibold transition border border-white/10"
            >
              📝 Examenele mele →
            </button>
          </div>

          {/* Ultimul accesat */}
          {enrollments.length > 0 && (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-white mb-3">🕐 Continuă de unde ai rămas</h3>
              {(() => {
                const last = enrollments.find((e) => !e.completed) || enrollments[0];
                const course = courses.find((c) => c.id === last?.course_id);
                if (!course) return null;
                return (
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Ultimul curs accesat</p>
                    <p className="text-sm font-semibold text-white mb-3">{course.title}</p>
                    <div className="w-full bg-white/10 rounded-full h-1.5 mb-3">
                      <div
                        className="h-1.5 rounded-full bg-blue-500"
                        style={{ width: `${last.progress_percent}%` }}
                      />
                    </div>
                    <button
                      onClick={() => navigate(`/quiz/${course.id}`)}
                      className="w-full py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition"
                    >
                      ▶ Continuă cursul
                    </button>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
