import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

const API = "http://127.0.0.1:8000";

const DIFFICULTY_LABELS = {
  beginner:     { label: "Începător",   color: "bg-green-500/20 text-green-400"  },
  intermediate: { label: "Intermediar", color: "bg-blue-500/20 text-blue-400"    },
  advanced:     { label: "Avansat",     color: "bg-amber-500/20 text-amber-400"  },
  expert:       { label: "Expert",      color: "bg-red-500/20 text-red-400"      },
};

// ─── Course Card ─────────────────────────────────────────────
function CourseCard({ course, enrollment, onEnroll, onView }) {
  const progress  = enrollment?.progress_percent ?? 0;
  const completed = enrollment?.completed ?? false;
  const diff      = DIFFICULTY_LABELS[course.difficulty_level] ?? DIFFICULTY_LABELS.beginner;

  return (
    <div
      className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-blue-500/40 hover:-translate-y-0.5 transition-all cursor-pointer group"
      onClick={() => onView(course.id)}
    >
      {/* Cover */}
      <div className="h-36 bg-gradient-to-br from-blue-900/60 to-indigo-900/60 flex items-center justify-center relative overflow-hidden">
        {course.cover_image_path ? (
          <img
            src={`${API}/${course.cover_image_path}`}
            alt={course.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-5xl opacity-60">📚</span>
        )}
        {/* Badge categorie */}
        {course.category && (
          <span className="absolute top-3 left-3 px-2 py-0.5 bg-black/50 text-white text-xs rounded-full backdrop-blur-sm">
            {course.category.name}
          </span>
        )}
        {/* Badge finalizat */}
        {completed && (
          <span className="absolute top-3 right-3 px-2 py-0.5 bg-green-500/80 text-white text-xs rounded-full font-medium">
            ✓ Finalizat
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-5">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="text-sm font-semibold text-white leading-snug group-hover:text-blue-400 transition line-clamp-2">
            {course.title}
          </h3>
        </div>

        <p className="text-xs text-gray-500 mb-3 line-clamp-2">
          {course.short_description || course.description || "Fără descriere"}
        </p>

        <div className="flex items-center gap-2 mb-4">
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${diff.color}`}>
            {diff.label}
          </span>
          {course.duration_minutes > 0 && (
            <span className="text-xs text-gray-500">
              ⏱ {course.duration_minutes} min
            </span>
          )}
        </div>

        {/* Progress bar dacă e înscris */}
        {enrollment && (
          <div className="mb-3">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-500">Progres</span>
              <span className={completed ? "text-green-400" : "text-blue-400"}>
                {progress}%
              </span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-1.5">
              <div
                className={`h-1.5 rounded-full transition-all ${completed ? "bg-green-500" : "bg-blue-500"}`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* CTA */}
        {enrollment ? (
          <button
            onClick={(e) => { e.stopPropagation(); onView(course.id); }}
            className="w-full py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition"
          >
            {completed ? "📖 Revizuiește" : "▶ Continuă cursul"}
          </button>
        ) : (
          <button
            onClick={(e) => { e.stopPropagation(); onEnroll(course.id); }}
            className="w-full py-2 rounded-xl bg-white/10 hover:bg-blue-600 text-gray-300 hover:text-white text-xs font-semibold transition border border-white/10 hover:border-transparent"
          >
            + Înscrie-te gratuit
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main ────────────────────────────────────────────────────
export default function Cursuri() {
  const { token } = useAuth();
  const navigate  = useNavigate();
  const { addToast } = useToast();

  const [courses,     setCourses]     = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [categories,  setCategories]  = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [activeDiff,     setActiveDiff]     = useState("all");
  const [activeStatus,   setActiveStatus]   = useState("all");

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

      // Extragem categoriile unice din cursuri
      const cats = [];
      cRes.data.forEach((c) => {
        if (c.category && !cats.find((x) => x.id === c.category.id)) {
          cats.push(c.category);
        }
      });
      setCategories(cats);
    } catch {
      addToast("Eroare la încărcarea cursurilor", "error");
    } finally {
      setLoading(false);
    }
  };

  const getEnrollment = (id) => enrollments.find((e) => e.course_id === id);

  const handleEnroll = async (courseId) => {
    try {
      await axios.post(`${API}/progress/enroll/${courseId}?token=${token}`);
      addToast("Te-ai înscris cu succes! 🎉", "success");
      fetchData();
    } catch {
      addToast("Eroare la înscriere", "error");
    }
  };

  // ─── Filtrare ─────────────────────────────────────────────
  const filtered = courses.filter((c) => {
    const enr = getEnrollment(c.id);

    const matchSearch =
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.description?.toLowerCase().includes(search.toLowerCase());

    const matchCat =
      activeCategory === "all" ||
      c.category?.id?.toString() === activeCategory;

    const matchDiff =
      activeDiff === "all" || c.difficulty_level === activeDiff;

    const matchStatus =
      activeStatus === "all" ||
      (activeStatus === "enrolled" && enr) ||
      (activeStatus === "available" && !enr) ||
      (activeStatus === "completed" && enr?.completed);

    return matchSearch && matchCat && matchDiff && matchStatus;
  });

  // ─── Statistici rapide ────────────────────────────────────
  const enrolledCount  = enrollments.length;
  const completedCount = enrollments.filter((e) => e.completed).length;
  const availableCount = courses.length - enrolledCount;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">Se încarcă cursurile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">

      {/* Header */}
      <div className="bg-gradient-to-br from-gray-900 via-blue-950/20 to-gray-900 border-b border-white/5 px-6 py-10">
        <div className="max-w-7xl mx-auto">
          <p className="text-gray-500 text-xs mb-1 uppercase tracking-widest">E-Learning</p>
          <h1 className="text-3xl font-bold mb-2">Biblioteca de cursuri</h1>
          <p className="text-gray-400 text-sm mb-8">
            {courses.length} cursuri disponibile · {enrolledCount} înscrise · {completedCount} finalizate
          </p>

          {/* Search bar mare */}
          <div className="relative max-w-2xl">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-lg">🔍</span>
            <input
              type="text"
              placeholder="Caută cursuri după titlu sau descriere..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl pl-11 pr-4 py-3.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 focus:bg-white/8"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 flex gap-8">

        {/* Sidebar filtre */}
        <aside className="w-56 flex-shrink-0 space-y-6">

          {/* Status */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Status</p>
            <div className="space-y-1">
              {[
                { key: "all",       label: "Toate cursurile", count: courses.length     },
                { key: "enrolled",  label: "Înscrise",         count: enrolledCount      },
                { key: "available", label: "Disponibile",      count: availableCount     },
                { key: "completed", label: "Finalizate",       count: completedCount     },
              ].map(({ key, label, count }) => (
                <button
                  key={key}
                  onClick={() => setActiveStatus(key)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm transition ${
                    activeStatus === key
                      ? "bg-blue-600 text-white"
                      : "text-gray-400 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <span>{label}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                    activeStatus === key ? "bg-white/20" : "bg-white/10"
                  }`}>{count}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Categorii */}
          {categories.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Categorii</p>
              <div className="space-y-1">
                <button
                  onClick={() => setActiveCategory("all")}
                  className={`w-full text-left px-3 py-2 rounded-xl text-sm transition ${
                    activeCategory === "all"
                      ? "bg-white/10 text-white"
                      : "text-gray-400 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  Toate categoriile
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id.toString())}
                    className={`w-full text-left px-3 py-2 rounded-xl text-sm transition ${
                      activeCategory === cat.id.toString()
                        ? "bg-white/10 text-white"
                        : "text-gray-400 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Nivel dificultate */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Nivel</p>
            <div className="space-y-1">
              <button
                onClick={() => setActiveDiff("all")}
                className={`w-full text-left px-3 py-2 rounded-xl text-sm transition ${
                  activeDiff === "all"
                    ? "bg-white/10 text-white"
                    : "text-gray-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                Toate nivelele
              </button>
              {Object.entries(DIFFICULTY_LABELS).map(([key, { label }]) => (
                <button
                  key={key}
                  onClick={() => setActiveDiff(key)}
                  className={`w-full text-left px-3 py-2 rounded-xl text-sm transition ${
                    activeDiff === key
                      ? "bg-white/10 text-white"
                      : "text-gray-400 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Reset filtre */}
          {(search || activeCategory !== "all" || activeDiff !== "all" || activeStatus !== "all") && (
            <button
              onClick={() => {
                setSearch("");
                setActiveCategory("all");
                setActiveDiff("all");
                setActiveStatus("all");
              }}
              className="w-full py-2 rounded-xl border border-white/10 text-gray-400 hover:text-white text-xs transition hover:bg-white/5"
            >
              ✕ Resetează filtrele
            </button>
          )}
        </aside>

        {/* Grid cursuri */}
        <div className="flex-1 min-w-0">

          {/* Header rezultate */}
          <div className="flex items-center justify-between mb-6">
            <p className="text-sm text-gray-400">
              {filtered.length === courses.length
                ? `${courses.length} cursuri`
                : `${filtered.length} din ${courses.length} cursuri`}
              {search && <span className="text-blue-400"> pentru „{search}"</span>}
            </p>
          </div>

          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <span className="text-6xl opacity-30">🔍</span>
              <p className="text-gray-500">
                {search
                  ? `Nu am găsit cursuri pentru „${search}"`
                  : "Nu există cursuri cu filtrele selectate"}
              </p>
              <button
                onClick={() => {
                  setSearch("");
                  setActiveCategory("all");
                  setActiveDiff("all");
                  setActiveStatus("all");
                }}
                className="text-blue-400 hover:text-blue-300 text-sm transition"
              >
                Resetează filtrele
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {filtered.map((course) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  enrollment={getEnrollment(course.id)}
                  onEnroll={handleEnroll}
                  onView={(id) => navigate(`/course/${id}`)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
