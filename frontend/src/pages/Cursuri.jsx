import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

const API = "http://127.0.0.1:8000";

const DIFFICULTY = {
  beginner:     { label: "Începător",   cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  intermediate: { label: "Intermediar", cls: "bg-blue-50 text-blue-700 border-blue-200" },
  advanced:     { label: "Avansat",     cls: "bg-amber-50 text-amber-800 border-amber-200" },
  expert:       { label: "Expert",      cls: "bg-rose-50 text-rose-700 border-rose-200" },
};

function CourseCard({ course, enrollment, categories, onEnroll, onView }) {
  const progress = enrollment?.progress_percent ?? 0;
  const completed = enrollment?.completed ?? false;
  const diff = DIFFICULTY[course.difficulty_level] ?? DIFFICULTY.beginner;
  const category = categories.find((c) => c.id === course.category_id);

  return (
    <div className="surface overflow-hidden hover:shadow-md transition cursor-pointer flex flex-col" onClick={() => onView(course.id)}>
      <div className="h-36 bg-slate-100 flex items-center justify-center relative overflow-hidden border-b" style={{ borderColor: "var(--line)" }}>
        {course.cover_image_path
          ? <img src={`${API}/${course.cover_image_path}`} alt={course.title} className="w-full h-full object-cover" />
          : <span className="text-slate-300 font-bold text-3xl" style={{ fontFamily: "var(--font-display)" }}>{course.title?.[0] || "C"}</span>}
        {category && <span className="absolute top-3 left-3 tag bg-white/90 text-slate-700 border-slate-200">{category.name}</span>}
        {completed && <span className="absolute top-3 right-3 tag bg-emerald-600 text-white border-transparent">Finalizat</span>}
      </div>
      <div className="p-5 flex-1 flex flex-col">
        <h3 className="text-base font-bold text-slate-900 leading-snug line-clamp-2 mb-2">{course.title}</h3>
        <p className="text-sm text-slate-500 mb-4 line-clamp-2 flex-1">{course.short_description || course.description || "Fără descriere."}</p>
        <div className="flex items-center gap-2 mb-4">
          <span className={`tag ${diff.cls}`}>{diff.label}</span>
          {course.duration_minutes > 0 && <span className="tag bg-slate-100 text-slate-500 border-slate-200 metric">{course.duration_minutes} min</span>}
        </div>
        {enrollment && (
          <div className="mb-4">
            <div className="flex justify-between text-xs font-semibold mb-1.5">
              <span className="text-slate-400 uppercase tracking-wider">Progres</span>
              <span className="metric text-slate-700">{progress}%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${progress}%`, background: completed ? "#10b981" : "var(--accent)" }} />
            </div>
          </div>
        )}
        {enrollment
          ? <button onClick={(e) => { e.stopPropagation(); onView(course.id); }} className="btn btn-primary w-full mt-auto">{completed ? "Revizuiește" : "Continuă"}</button>
          : <button onClick={(e) => { e.stopPropagation(); onEnroll(course.id); }} className="btn btn-ghost w-full mt-auto">Înscrie-te</button>}
      </div>
    </div>
  );
}

export default function Cursuri() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [courses, setCourses] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [activeDiff, setActiveDiff] = useState("all");
  const [activeStatus, setActiveStatus] = useState("all");

  useEffect(() => { fetchData(); }, []);
  const fetchData = async () => {
    try {
      setLoading(true);
      const [c, e, cat] = await Promise.all([
        axios.get(`${API}/courses/?token=${token}`),
        axios.get(`${API}/progress/my-courses?token=${token}`),
        axios.get(`${API}/course-categories/?token=${token}`),
      ]);
      setCourses(c.data); setEnrollments(e.data); setCategories(cat.data);
    } catch { addToast("Eroare la încărcarea cursurilor", "error"); }
    finally { setLoading(false); }
  };

  const getEnrollment = (id) => enrollments.find((e) => e.course_id === id);
  const handleEnroll = async (courseId) => {
    try {
      await axios.post(`${API}/progress/enroll/${courseId}?token=${token}`);
      addToast("Te-ai înscris cu succes", "success");
      fetchData();
    } catch { addToast("Eroare la înscriere", "error"); }
  };

  const filtered = courses.filter((c) => {
    const enr = getEnrollment(c.id);
    const matchSearch = c.title.toLowerCase().includes(search.toLowerCase()) || c.description?.toLowerCase().includes(search.toLowerCase());
    const matchCat = activeCategory === "all" || c.category_id?.toString() === activeCategory;
    const matchDiff = activeDiff === "all" || c.difficulty_level === activeDiff;
    const matchStatus = activeStatus === "all" || (activeStatus === "enrolled" && enr) || (activeStatus === "available" && !enr) || (activeStatus === "completed" && enr?.completed);
    return matchSearch && matchCat && matchDiff && matchStatus;
  });

  const enrolledCount = enrollments.length;
  const completedCount = enrollments.filter((e) => e.completed).length;
  const availableCount = courses.length - enrolledCount;

  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-500">Se încarcă catalogul...</div>;

  const FilterBtn = ({ active, onClick, children, count }) => (
    <button onClick={onClick}
      className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg text-sm font-semibold transition ${active ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-white border border-transparent hover:border-slate-200"}`}>
      <span>{children}</span>
      {count != null && <span className={`metric text-xs px-2 py-0.5 rounded ${active ? "bg-white/20" : "bg-slate-100 text-slate-500"}`}>{count}</span>}
    </button>
  );

  return (
    <div className="min-h-screen pb-12">
      <div className="bg-white border-b px-6 py-10" style={{ borderColor: "var(--line)" }}>
        <div className="max-w-7xl mx-auto">
          <span className="eyebrow">Catalog</span>
          <h1 className="text-3xl font-extrabold text-slate-900 mt-1">Biblioteca de cursuri</h1>
          <p className="text-slate-500 mt-1 mb-6">{courses.length} cursuri · {enrolledCount} active · {completedCount} finalizate</p>
          <div className="relative max-w-2xl">
            <input type="text" placeholder="Caută după titlu sau subiect..." value={search} onChange={(e) => setSearch(e.target.value)} className="input" />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-10 flex flex-col lg:flex-row gap-10">
        <aside className="w-full lg:w-64 flex-shrink-0 space-y-8">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">Status</p>
            <div className="space-y-1.5">
              <FilterBtn active={activeStatus === "all"} onClick={() => setActiveStatus("all")} count={courses.length}>Toate</FilterBtn>
              <FilterBtn active={activeStatus === "enrolled"} onClick={() => setActiveStatus("enrolled")} count={enrolledCount}>Înscrise</FilterBtn>
              <FilterBtn active={activeStatus === "available"} onClick={() => setActiveStatus("available")} count={availableCount}>Disponibile</FilterBtn>
              <FilterBtn active={activeStatus === "completed"} onClick={() => setActiveStatus("completed")} count={completedCount}>Finalizate</FilterBtn>
            </div>
          </div>
          {categories.length > 0 && (
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">Categorii</p>
              <div className="space-y-1.5">
                <FilterBtn active={activeCategory === "all"} onClick={() => setActiveCategory("all")}>Toate categoriile</FilterBtn>
                {categories.map((cat) => <FilterBtn key={cat.id} active={activeCategory === cat.id.toString()} onClick={() => setActiveCategory(cat.id.toString())}>{cat.name}</FilterBtn>)}
              </div>
            </div>
          )}
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">Dificultate</p>
            <div className="space-y-1.5">
              <FilterBtn active={activeDiff === "all"} onClick={() => setActiveDiff("all")}>Orice nivel</FilterBtn>
              {Object.entries(DIFFICULTY).map(([k, { label }]) => <FilterBtn key={k} active={activeDiff === k} onClick={() => setActiveDiff(k)}>{label}</FilterBtn>)}
            </div>
          </div>
        </aside>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-500 mb-6">{filtered.length} {filtered.length === 1 ? "rezultat" : "rezultate"}</p>
          {filtered.length === 0 ? (
            <div className="surface py-20 text-center text-slate-400">Niciun curs găsit. Încearcă să modifici filtrele.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filtered.map((course) => (
                <CourseCard key={course.id} course={course} enrollment={getEnrollment(course.id)} categories={categories} onEnroll={handleEnroll} onView={(id) => navigate(`/course/${id}`)} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}