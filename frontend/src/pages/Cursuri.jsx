import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

const API = "http://127.0.0.1:8000";

const DIFFICULTY_LABELS = {
  beginner:     { label: "Începător",   color: "bg-green-100 text-green-700" },
  intermediate: { label: "Intermediar", color: "bg-cyan-100 text-cyan-700"   },
  advanced:     { label: "Avansat",     color: "bg-amber-100 text-amber-700" },
  expert:       { label: "Expert",      color: "bg-red-100 text-red-700"     },
};

// ─── Course Card ─────────────────────────────────────────────
function CourseCard({ course, enrollment, onEnroll, onView }) {
  const progress  = enrollment?.progress_percent ?? 0;
  const completed = enrollment?.completed ?? false;
  const diff      = DIFFICULTY_LABELS[course.difficulty_level] ?? DIFFICULTY_LABELS.beginner;

  return (
    <div
      className="bg-white border border-gray-100 rounded-3xl overflow-hidden hover:shadow-xl hover:shadow-cyan-100/50 hover:-translate-y-1 transition-all duration-300 cursor-pointer group flex flex-col h-full"
      onClick={() => onView(course.id)}
    >
      {/* Cover */}
      <div className="h-40 bg-gradient-to-br from-cyan-50 to-amber-50 flex items-center justify-center relative overflow-hidden border-b border-gray-50">
        {course.cover_image_path ? (
          <img
            src={`${API}/${course.cover_image_path}`}
            alt={course.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <span className="text-6xl opacity-20 transform group-hover:scale-110 transition-transform duration-500">📚</span>
        )}
        
        {/* Badge categorie */}
        {course.category && (
          <span className="absolute top-3 left-3 px-3 py-1 bg-white/90 text-gray-800 text-xs font-bold rounded-full backdrop-blur-sm shadow-sm">
            {course.category.name}
          </span>
        )}
        {/* Badge finalizat */}
        {completed && (
          <span className="absolute top-3 right-3 px-3 py-1 bg-green-500 text-white text-xs font-bold rounded-full shadow-md shadow-green-500/30">
            ✓ Finalizat
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-6 flex-1 flex flex-col">
        <h3 className="text-lg font-extrabold text-gray-900 leading-snug group-hover:text-cyan-600 transition-colors line-clamp-2 mb-2">
          {course.title}
        </h3>

        <p className="text-sm text-gray-500 mb-4 line-clamp-2 flex-1">
          {course.short_description || course.description || "Acest curs nu are o descriere scurtă momentan."}
        </p>

        <div className="flex items-center gap-2 mb-5">
          <span className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${diff.color}`}>
            {diff.label}
          </span>
          {course.duration_minutes > 0 && (
            <span className="text-xs font-bold text-gray-500 bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-100">
              ⏱ {course.duration_minutes} min
            </span>
          )}
        </div>

        {/* Progress bar dacă e înscris */}
        {enrollment && (
          <div className="mb-4 bg-gray-50 p-3 rounded-xl border border-gray-100">
            <div className="flex justify-between text-xs font-bold mb-1.5 uppercase tracking-wider">
              <span className="text-gray-500">Progres</span>
              <span className={completed ? "text-green-600" : "text-cyan-600"}>
                {progress}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-1000 ${completed ? "bg-green-500" : "bg-cyan-500"}`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* CTA */}
        {enrollment ? (
          <button
            onClick={(e) => { e.stopPropagation(); onView(course.id); }}
            className="w-full py-3 rounded-xl bg-gray-900 hover:bg-gray-800 text-white text-sm font-bold transition shadow-md shadow-gray-900/10 mt-auto"
          >
            {completed ? "📖 Revizuiește Cursul" : "▶ Continuă Învățarea"}
          </button>
        ) : (
          <button
            onClick={(e) => { e.stopPropagation(); onEnroll(course.id); }}
            className="w-full py-3 rounded-xl bg-cyan-50 hover:bg-cyan-500 text-cyan-700 hover:text-white text-sm font-bold transition-all mt-auto"
          >
            + Înscrie-te Gratuit
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

  const filtered = courses.filter((c) => {
    const enr = getEnrollment(c.id);
    const matchSearch = c.title.toLowerCase().includes(search.toLowerCase()) || c.description?.toLowerCase().includes(search.toLowerCase());
    const matchCat = activeCategory === "all" || c.category?.id?.toString() === activeCategory;
    const matchDiff = activeDiff === "all" || c.difficulty_level === activeDiff;
    const matchStatus = activeStatus === "all" || (activeStatus === "enrolled" && enr) || (activeStatus === "available" && !enr) || (activeStatus === "completed" && enr?.completed);
    return matchSearch && matchCat && matchDiff && matchStatus;
  });

  const enrolledCount  = enrollments.length;
  const completedCount = enrollments.filter((e) => e.completed).length;
  const availableCount = courses.length - enrolledCount;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-cyan-200 border-t-cyan-500 rounded-full animate-spin" />
          <p className="text-cyan-700 font-bold text-sm uppercase tracking-wider">Se încarcă catalogul...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-12">

      {/* Header Banner */}
      <div className="bg-white border-b border-gray-100 px-6 py-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-50/50 to-transparent pointer-events-none" />
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-cyan-100 text-cyan-800 rounded-full text-xs font-bold uppercase tracking-wider mb-4">
            <span>🎓</span> E-Learning Platform
          </div>
          <h1 className="text-4xl font-extrabold mb-3 text-gray-900 tracking-tight">Biblioteca de Cursuri</h1>
          <p className="text-gray-500 text-base mb-8 font-medium">
            Explorează {courses.length} cursuri · Ai {enrolledCount} cursuri active · {completedCount} finalizate cu succes
          </p>

          {/* Search bar */}
          <div className="relative max-w-2xl">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg">🔍</span>
            <input
              type="text"
              placeholder="Caută cursuri după titlu sau subiect..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white border-2 border-gray-100 rounded-2xl pl-12 pr-4 py-4 text-gray-900 font-medium placeholder-gray-400 focus:outline-none focus:border-cyan-400 focus:ring-4 focus:ring-cyan-50 transition-all shadow-sm"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-full transition font-bold"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-10 flex flex-col lg:flex-row gap-10">

        {/* Sidebar filtre */}
        <aside className="w-full lg:w-64 flex-shrink-0 space-y-8">

          {/* Status */}
          <div>
            <p className="text-xs font-extrabold text-gray-400 uppercase tracking-widest mb-4">Filtrează după Status</p>
            <div className="space-y-1.5">
              {[
                { key: "all",       label: "Toate cursurile", count: courses.length },
                { key: "enrolled",  label: "Înscrise",        count: enrolledCount  },
                { key: "available", label: "Disponibile",     count: availableCount },
                { key: "completed", label: "Finalizate",      count: completedCount },
              ].map(({ key, label, count }) => (
                <button
                  key={key}
                  onClick={() => setActiveStatus(key)}
                  className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    activeStatus === key
                      ? "bg-cyan-500 text-white shadow-md shadow-cyan-500/20"
                      : "text-gray-600 hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-100"
                  }`}
                >
                  <span>{label}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-lg ${
                    activeStatus === key ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"
                  }`}>{count}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Categorii */}
          {categories.length > 0 && (
            <div>
              <p className="text-xs font-extrabold text-gray-400 uppercase tracking-widest mb-4">Categorii</p>
              <div className="space-y-1.5">
                <button
                  onClick={() => setActiveCategory("all")}
                  className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    activeCategory === "all" ? "bg-cyan-50 text-cyan-700" : "text-gray-600 hover:bg-white border border-transparent hover:border-gray-100"
                  }`}
                >
                  Toate categoriile
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id.toString())}
                    className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                      activeCategory === cat.id.toString() ? "bg-cyan-50 text-cyan-700" : "text-gray-600 hover:bg-white border border-transparent hover:border-gray-100"
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
            <p className="text-xs font-extrabold text-gray-400 uppercase tracking-widest mb-4">Dificultate</p>
            <div className="space-y-1.5">
              <button
                onClick={() => setActiveDiff("all")}
                className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  activeDiff === "all" ? "bg-cyan-50 text-cyan-700" : "text-gray-600 hover:bg-white border border-transparent hover:border-gray-100"
                }`}
              >
                Orice nivel
              </button>
              {Object.entries(DIFFICULTY_LABELS).map(([key, { label }]) => (
                <button
                  key={key}
                  onClick={() => setActiveDiff(key)}
                  className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    activeDiff === key ? "bg-cyan-50 text-cyan-700" : "text-gray-600 hover:bg-white border border-transparent hover:border-gray-100"
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
              onClick={() => { setSearch(""); setActiveCategory("all"); setActiveDiff("all"); setActiveStatus("all"); }}
              className="w-full py-3 rounded-xl border-2 border-gray-200 text-gray-500 font-bold hover:text-gray-900 hover:border-gray-300 hover:bg-white transition-all"
            >
              ✕ Resetează filtrele
            </button>
          )}
        </aside>

        {/* Grid cursuri */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-6">
            <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">
              {filtered.length === courses.length ? `Afișez toate cele ${courses.length} cursuri` : `Am găsit ${filtered.length} rezultate`}
            </p>
          </div>

          {filtered.length === 0 ? (
            <div className="bg-white border border-gray-100 rounded-3xl flex flex-col items-center justify-center py-24 gap-4 shadow-sm">
              <span className="text-6xl mb-2">🔍</span>
              <p className="text-gray-900 font-bold text-lg">Niciun curs găsit</p>
              <p className="text-gray-500 text-sm text-center max-w-sm">
                Încearcă să modifici termenii căutării sau să resetezi filtrele din meniul lateral.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
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