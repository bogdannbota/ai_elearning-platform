import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
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

function toYouTubeEmbed(url) {
  if (!url) return null;
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{6,})/);
  return m ? `https://www.youtube.com/embed/${m[1]}` : null;
}

function CircleProgress({ percent, completed }) {
  const r = 52;
  const circ = 2 * Math.PI * r;
  const offset = circ - (Math.min(percent, 100) / 100) * circ;
  const color = completed ? "#10b981" : "#1f5fbf";
  return (
    <svg width="120" height="120" viewBox="0 0 128 128">
      <circle cx="64" cy="64" r={r} fill="none" stroke="#eef1f4" strokeWidth="9" />
      <circle cx="64" cy="64" r={r} fill="none" stroke={color} strokeWidth="9" strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" transform="rotate(-90 64 64)" style={{ transition: "stroke-dashoffset .6s ease" }} />
      <text x="64" y="60" textAnchor="middle" fill="#0f1622" fontSize="22" fontWeight="700" fontFamily="IBM Plex Mono">{Math.round(percent)}%</text>
      <text x="64" y="80" textAnchor="middle" fill="#94a3b8" fontSize="11">progres</text>
    </svg>
  );
}

function ModuleRow({ module, index, isCompleted, locked, onClick }) {
  return (
    <button onClick={onClick} className={`flex items-center gap-4 p-4 rounded-xl border w-full text-left transition ${isCompleted ? "border-emerald-200 bg-emerald-50/50" : "hover:bg-slate-50"}`} style={!isCompleted ? { borderColor: "var(--line)" } : undefined}>
      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 metric ${isCompleted ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-500"}`}>{isCompleted ? "✓" : index + 1}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-900 truncate">{module.title}</p>
        <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-400">
          {module.duration_minutes > 0 && <span className="metric">{module.duration_minutes} min</span>}
          {module.video_url && <span>Video</span>}
          {module.attachment_path && <span>Fișier</span>}
        </div>
      </div>
      <span className="text-xs font-semibold text-slate-400">{locked ? "blocat" : isCompleted ? "Finalizat" : "Deschide →"}</span>
    </button>
  );
}

function LessonModal({ module, index, isCompleted, onClose, onComplete }) {
  if (!module) return null;
  const embed = toYouTubeEmbed(module.video_url);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(15,22,34,.45)" }}>
      <div className="surface w-full max-w-2xl max-h-[88vh] overflow-hidden flex flex-col">
        <div className="flex items-start justify-between gap-4 px-6 py-5 border-b" style={{ borderColor: "var(--line)" }}>
          <div>
            <span className="eyebrow">Lecția {index + 1}</span>
            <h3 className="text-lg font-bold text-slate-900 mt-1">{module.title}</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-xl">✕</button>
        </div>
        <div className="px-6 py-5 overflow-y-auto space-y-5">
          {embed && (
            <div className="relative w-full rounded-xl overflow-hidden bg-black" style={{ paddingTop: "56.25%" }}>
              <iframe src={embed} title={module.title} className="absolute inset-0 w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
            </div>
          )}
          {!embed && module.video_url && <a href={module.video_url} target="_blank" rel="noreferrer" className="btn btn-ghost">Deschide video</a>}
          {module.content ? <div className="prose prose-sm max-w-none text-slate-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: module.content }} /> : (!module.video_url && <p className="text-sm text-slate-400">Această lecție nu are încă conținut text.</p>)}
          {module.attachment_path && <a href={`${API}/${module.attachment_path}`} target="_blank" rel="noreferrer" className="btn btn-ghost w-fit">Descarcă materialul</a>}
        </div>
        <div className="px-6 py-4 border-t flex items-center justify-between gap-3" style={{ borderColor: "var(--line)" }}>
          <button onClick={onClose} className="btn btn-ghost">Închide</button>
          {isCompleted ? <span className="tag bg-emerald-50 text-emerald-700 border-emerald-200">Finalizată</span> : <button onClick={onComplete} className="btn btn-primary">Marchează ca finalizată</button>}
        </div>
      </div>
    </div>
  );
}

export default function CourseDetails() {
  const { courseId } = useParams();
  const { token } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [course, setCourse] = useState(null);
  const [enrollment, setEnrollment] = useState(null);
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openIdx, setOpenIdx] = useState(null);

  useEffect(() => { fetchAll(); }, [courseId]);
  const fetchAll = async () => {
    try {
      setLoading(true);
      const [cRes, eRes] = await Promise.all([
        axios.get(`${API}/courses/${courseId}?token=${token}`),
        axios.get(`${API}/progress/my-courses?token=${token}`),
      ]);
      setCourse(cRes.data); setModules(cRes.data.modules || []);
      setEnrollment(eRes.data.find((e) => e.course_id === parseInt(courseId)) || null);
    } catch { addToast("Eroare la încărcarea cursului", "error"); navigate(-1); }
    finally { setLoading(false); }
  };
  const handleEnroll = async () => {
    try { await axios.post(`${API}/progress/enroll/${courseId}?token=${token}`); addToast("Te-ai înscris cu succes", "success"); fetchAll(); }
    catch { addToast("Eroare la înscriere", "error"); }
  };
  const completeLesson = async (index) => {
    if (!enrollment) return;
    const total = modules.length || 1;
    const newPercent = Math.round(((index + 1) / total) * 100);
    if (newPercent <= (enrollment.progress_percent ?? 0)) { setOpenIdx(null); return; }
    try { await axios.put(`${API}/progress/update/${courseId}?token=${token}`, { progress_percent: newPercent }); addToast("Lecție finalizată", "success"); setOpenIdx(null); fetchAll(); }
    catch { addToast("Eroare la salvarea progresului", "error"); }
  };
  const openModule = (index) => { if (!enrollment) { addToast("Înscrie-te mai întâi la acest curs", "info"); return; } setOpenIdx(index); };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-500">Se încarcă cursul...</div>;
  if (!course) return null;

  const diff = DIFFICULTY[course.difficulty_level] ?? DIFFICULTY.beginner;
  const progress = enrollment?.progress_percent ?? 0;
  const completed = enrollment?.completed ?? false;
  const total = modules.length;
  const completedModules = total > 0 ? Math.round((progress / 100) * total) : 0;
  const nextIdx = Math.min(completedModules, Math.max(total - 1, 0));

  return (
    <div className="min-h-screen pb-12">
      <div className="bg-white border-b" style={{ borderColor: "var(--line)" }}>
        <div className="max-w-5xl mx-auto px-6 py-9">
          <button onClick={() => navigate(-1)} className="text-sm text-slate-400 hover:text-slate-700 mb-5">← Înapoi</button>
          <div className="flex flex-col lg:flex-row gap-8">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-4 flex-wrap">
                {course.category && <span className="tag bg-slate-100 text-slate-600 border-slate-200">{course.category.name}</span>}
                <span className={`tag ${diff.cls}`}>{diff.label}</span>
                {course.duration_minutes > 0 && <span className="tag bg-slate-100 text-slate-500 border-slate-200 metric">{course.duration_minutes} min</span>}
              </div>
              <h1 className="text-3xl font-extrabold text-slate-900 mb-3 leading-tight">{course.title}</h1>
              <p className="text-slate-500 leading-relaxed mb-6">{course.short_description || course.description || "Fără descriere"}</p>
              {enrollment
                ? <span className={`tag ${completed ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-blue-50 text-blue-700 border-blue-200"}`}>{completed ? "Finalizat" : "În progres"}</span>
                : <button onClick={handleEnroll} className="btn btn-primary">Înscrie-te</button>}
            </div>
            {enrollment && (
              <div className="surface p-6 flex flex-col items-center gap-4 flex-shrink-0 w-full lg:w-52">
                <CircleProgress percent={progress} completed={completed} />
                <div className="text-center">
                  <p className="text-xs text-slate-400 mb-1">Module completate</p>
                  <p className="metric text-sm font-bold text-slate-900">{completedModules} / {total || "—"}</p>
                </div>
                {!completed && total > 0 && <button onClick={() => openModule(nextIdx)} className="btn btn-primary w-full">Continuă</button>}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900 mb-4">Conținut curs {total > 0 && <span className="text-sm font-medium text-slate-400">· {total} module</span>}</h2>
            {total === 0
              ? <div className="surface p-8 text-center text-slate-400">Cursul nu are încă module adăugate.</div>
              : <div className="space-y-3">{modules.map((mod, i) => <ModuleRow key={mod.id} module={mod} index={i} isCompleted={i < completedModules} locked={!enrollment} onClick={() => openModule(i)} />)}</div>}
          </div>
          {course.description && (
            <div className="surface p-6">
              <h2 className="text-base font-bold text-slate-900 mb-3">Despre acest curs</h2>
              <p className="text-slate-600 text-sm leading-relaxed">{course.description}</p>
            </div>
          )}
        </div>

        <div className="space-y-5">
          <div className="surface p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Detalii curs</h3>
            {[["Nivel", diff.label], ["Module", total > 0 ? `${total} module` : "—"], ["Durată", course.duration_minutes > 0 ? `${course.duration_minutes} min` : "—"], ["Categorie", course.category?.name || "—"]].map(([l, v]) => (
              <div key={l} className="flex justify-between text-sm">
                <span className="text-slate-400">{l}</span>
                <span className="text-slate-900 font-semibold">{v}</span>
              </div>
            ))}
          </div>
          {course.file_path && enrollment && (
            <div className="surface p-5">
              <h3 className="text-sm font-bold text-slate-900 mb-3">Material de studiu</h3>
              <a href={`${API}/${course.file_path}`} target="_blank" rel="noreferrer" className="btn btn-ghost w-full">Descarcă PDF</a>
            </div>
          )}
        </div>
      </div>

      {openIdx !== null && <LessonModal module={modules[openIdx]} index={openIdx} isCompleted={openIdx < completedModules} onClose={() => setOpenIdx(null)} onComplete={() => completeLesson(openIdx)} />}
    </div>
  );
}