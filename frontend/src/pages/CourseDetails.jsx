import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

const API = "http://127.0.0.1:8000";

const DIFFICULTY_LABELS = {
  beginner:     { label: "Începător",   color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  intermediate: { label: "Intermediar", color: "bg-cyan-50 text-cyan-700 border-cyan-200" },
  advanced:     { label: "Avansat",     color: "bg-amber-50 text-amber-700 border-amber-200" },
  expert:       { label: "Expert",      color: "bg-red-50 text-red-700 border-red-200" },
};

// Convertește un link YouTube în URL de embed (altfel întoarce null)
function toYouTubeEmbed(url) {
  if (!url) return null;
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{6,})/);
  return m ? `https://www.youtube.com/embed/${m[1]}` : null;
}

// ─── Circular progress (temă deschisă) ───────────────────────
function CircleProgress({ percent, completed }) {
  const r = 52;
  const circ = 2 * Math.PI * r;
  const offset = circ - (Math.min(percent, 100) / 100) * circ;
  const color = completed ? "#10b981" : "#06b6d4";
  return (
    <svg width="128" height="128" viewBox="0 0 128 128">
      <circle cx="64" cy="64" r={r} fill="none" stroke="#f1f5f9" strokeWidth="9" />
      <circle
        cx="64" cy="64" r={r}
        fill="none" stroke={color} strokeWidth="9"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 64 64)"
        style={{ transition: "stroke-dashoffset .6s ease" }}
      />
      <text x="64" y="60" textAnchor="middle" fill="#0f172a" fontSize="22" fontWeight="800">
        {Math.round(percent)}%
      </text>
      <text x="64" y="80" textAnchor="middle" fill="#94a3b8" fontSize="11">
        progres
      </text>
    </svg>
  );
}

// ─── Module row (temă deschisă) ──────────────────────────────
function ModuleRow({ module, index, isCompleted, locked, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-4 p-4 rounded-2xl border w-full text-left transition group ${
        isCompleted
          ? "border-emerald-200 bg-emerald-50/60 hover:bg-emerald-50"
          : "border-gray-100 bg-white hover:border-cyan-300 hover:shadow-sm"
      }`}
    >
      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
        isCompleted ? "bg-emerald-500 text-white" : "bg-gray-100 text-gray-500"
      }`}>
        {isCompleted ? "✓" : index + 1}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-gray-900 truncate">{module.title}</p>
        <div className="flex items-center gap-3 mt-0.5">
          {module.duration_minutes > 0 && (
            <span className="text-xs text-gray-400">⏱ {module.duration_minutes} min</span>
          )}
          {module.video_url && <span className="text-xs text-cyan-600">🎥 Video</span>}
          {module.attachment_path && <span className="text-xs text-amber-600">📎 Fișier</span>}
        </div>
      </div>

      <span className={`text-xs font-semibold transition ${
        locked ? "text-gray-300" : isCompleted ? "text-emerald-600" : "text-gray-400 group-hover:text-cyan-600"
      }`}>
        {locked ? "🔒" : isCompleted ? "Finalizat" : "Deschide →"}
      </span>
    </button>
  );
}

// ─── Modal lecție ────────────────────────────────────────────
function LessonModal({ module, index, isCompleted, onClose, onComplete }) {
  if (!module) return null;
  const embed = toYouTubeEmbed(module.video_url);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-2xl max-h-[88vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-gray-100">
          <div>
            <p className="text-xs font-bold text-cyan-600 uppercase tracking-wider mb-1">
              Lecția {index + 1}
            </p>
            <h3 className="text-lg font-extrabold text-gray-900">{module.title}</h3>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 w-9 h-9 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition flex items-center justify-center"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 overflow-y-auto space-y-5">
          {embed && (
            <div className="relative w-full rounded-2xl overflow-hidden bg-black" style={{ paddingTop: "56.25%" }}>
              <iframe
                src={embed}
                title={module.title}
                className="absolute inset-0 w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}

          {!embed && module.video_url && (
            <a
              href={module.video_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-50 text-cyan-700 border border-cyan-200 text-sm font-semibold hover:bg-cyan-100 transition"
            >
              🎥 Deschide video
            </a>
          )}

          {module.content ? (
            <div
              className="prose prose-sm max-w-none text-gray-700 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: module.content }}
            />
          ) : (
            !module.video_url && (
              <p className="text-sm text-gray-400">Această lecție nu are încă conținut text.</p>
            )
          )}

          {module.attachment_path && (
            <a
              href={`${API}/${module.attachment_path}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-sm font-semibold hover:bg-amber-100 transition w-fit"
            >
              📎 Descarcă materialul
            </a>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-bold text-sm hover:bg-gray-50 transition"
          >
            Închide
          </button>
          {isCompleted ? (
            <span className="px-4 py-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-sm font-bold">
              ✓ Finalizată
            </span>
          ) : (
            <button
              onClick={onComplete}
              className="px-5 py-2.5 rounded-xl bg-gray-900 hover:bg-gray-800 text-white font-bold text-sm transition"
            >
              Marchează ca finalizată
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main ────────────────────────────────────────────────────
export default function CourseDetails() {
  const { courseId } = useParams();
  const { token }    = useAuth();
  const navigate     = useNavigate();
  const { addToast } = useToast();

  const [course,     setCourse]     = useState(null);
  const [enrollment, setEnrollment] = useState(null);
  const [modules,    setModules]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [openIdx,    setOpenIdx]    = useState(null); // index modul deschis în modal

  useEffect(() => { fetchAll(); }, [courseId]);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [cRes, eRes] = await Promise.all([
        axios.get(`${API}/courses/${courseId}?token=${token}`),
        axios.get(`${API}/progress/my-courses?token=${token}`),
      ]);
      setCourse(cRes.data);
      setModules(cRes.data.modules || []);
      const enr = eRes.data.find((e) => e.course_id === parseInt(courseId));
      setEnrollment(enr || null);
    } catch {
      addToast("Eroare la încărcarea cursului", "error");
      navigate(-1);
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async () => {
    try {
      await axios.post(`${API}/progress/enroll/${courseId}?token=${token}`);
      addToast("Te-ai înscris cu succes! 🎉", "success");
      fetchAll();
    } catch {
      addToast("Eroare la înscriere", "error");
    }
  };

  // Marchează lecția (și pe cele dinaintea ei) ca finalizate → actualizează progresul
  const completeLesson = async (index) => {
    if (!enrollment) return;
    const total = modules.length || 1;
    const newPercent = Math.round(((index + 1) / total) * 100);
    // nu scădem progresul dacă utilizatorul deschide o lecție anterioară
    if (newPercent <= (enrollment.progress_percent ?? 0)) {
      setOpenIdx(null);
      return;
    }
    try {
      await axios.put(`${API}/progress/update/${courseId}?token=${token}`, {
        progress_percent: newPercent,
      });
      addToast("Lecție finalizată ✓", "success");
      setOpenIdx(null);
      fetchAll();
    } catch {
      addToast("Eroare la salvarea progresului", "error");
    }
  };

  const openModule = (index) => {
    if (!enrollment) {
      addToast("Înscrie-te mai întâi la acest curs", "info");
      return;
    }
    setOpenIdx(index);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 text-sm">Se încarcă cursul...</p>
        </div>
      </div>
    );
  }

  if (!course) return null;

  const diff       = DIFFICULTY_LABELS[course.difficulty_level] ?? DIFFICULTY_LABELS.beginner;
  const progress   = enrollment?.progress_percent ?? 0;
  const completed  = enrollment?.completed ?? false;
  const total      = modules.length;
  const completedModules = total > 0 ? Math.round((progress / 100) * total) : 0;

  // index-ul primei lecții neterminate (pentru „Continuă")
  const nextIdx = Math.min(completedModules, Math.max(total - 1, 0));

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-12 animate-in fade-in">

      {/* Hero */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-6 py-10">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-400 hover:text-gray-700 text-sm mb-6 transition"
          >
            ← Înapoi
          </button>

          <div className="flex flex-col lg:flex-row gap-8">
            {/* Left */}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-4 flex-wrap">
                {course.category && (
                  <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs rounded-full border border-gray-200">
                    {course.category.name}
                  </span>
                )}
                <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${diff.color}`}>
                  {diff.label}
                </span>
                {course.duration_minutes > 0 && (
                  <span className="px-3 py-1 bg-gray-50 text-gray-500 text-xs rounded-full border border-gray-200">
                    ⏱ {course.duration_minutes} min
                  </span>
                )}
              </div>

              <h1 className="text-3xl font-extrabold mb-3 leading-tight">{course.title}</h1>
              <p className="text-gray-500 text-base leading-relaxed mb-6">
                {course.short_description || course.description || "Fără descriere"}
              </p>

              {enrollment ? (
                <div className="flex items-center gap-3 text-sm">
                  <span className={`px-3 py-1 rounded-full font-semibold border ${
                    completed
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-cyan-50 text-cyan-700 border-cyan-200"
                  }`}>
                    {completed ? "✓ Finalizat" : "⏳ În progres"}
                  </span>
                  <span className="text-gray-400">
                    Înscris din {new Date(enrollment.started_at || Date.now()).toLocaleDateString("ro-RO")}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleEnroll}
                    className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold text-sm transition shadow-sm"
                  >
                    + Înscrie-te gratuit
                  </button>
                  <span className="text-gray-400 text-sm">Acces imediat după înscriere</span>
                </div>
              )}
            </div>

            {/* Right: progress card */}
            {enrollment && (
              <div className="bg-white border border-gray-100 rounded-3xl p-6 flex flex-col items-center gap-4 flex-shrink-0 w-full lg:w-52 shadow-sm">
                <CircleProgress percent={progress} completed={completed} />
                <div className="text-center">
                  <p className="text-xs text-gray-400 mb-1">Module completate</p>
                  <p className="text-sm font-bold text-gray-900">
                    {completedModules} / {total || "—"}
                  </p>
                </div>
                {!completed && total > 0 && (
                  <button
                    onClick={() => openModule(nextIdx)}
                    className="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-bold transition"
                  >
                    ▶ Continuă
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Module */}
        <div className="lg:col-span-2 space-y-6">
          <div>
            <h2 className="text-lg font-extrabold text-gray-900 mb-4">
              📋 Conținut curs
              {total > 0 && (
                <span className="ml-2 text-sm font-medium text-gray-400">{total} module</span>
              )}
            </h2>

            {total === 0 ? (
              <div className="bg-white border border-gray-100 rounded-2xl p-8 text-center">
                <p className="text-gray-500 font-semibold">Cursul nu are încă module adăugate.</p>
                <p className="text-gray-400 text-sm mt-1">
                  Profesorul va adăuga lecțiile în curând.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {modules.map((mod, i) => (
                  <ModuleRow
                    key={mod.id}
                    module={mod}
                    index={i}
                    isCompleted={i < completedModules}
                    locked={!enrollment}
                    onClick={() => openModule(i)}
                  />
                ))}
              </div>
            )}
          </div>

          {course.description && (
            <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">
              <h2 className="text-base font-extrabold text-gray-900 mb-3">📖 Despre acest curs</h2>
              <p className="text-gray-600 text-sm leading-relaxed">{course.description}</p>
            </div>
          )}

          <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">
            <h2 className="text-base font-extrabold text-gray-900 mb-4">🎯 Ce vei învăța</h2>
            <ul className="space-y-2.5">
              {[
                "Înțelegi conceptele fundamentale din domeniu",
                "Aplici cunoștințele în situații reale",
                "Rezolvi probleme cu metodologiile învățate",
                "Obții certificat de finalizare",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-gray-600">
                  <span className="text-emerald-500 mt-0.5 flex-shrink-0">✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm">
            <h3 className="text-sm font-extrabold text-gray-900 mb-4">
              {enrollment ? "Continuă cursul" : "Începe cursul"}
            </h3>

            {enrollment ? (
              <div className="space-y-3">
                <div className="w-full bg-gray-100 rounded-full h-2 mb-1">
                  <div
                    className={`h-2 rounded-full ${completed ? "bg-emerald-500" : "bg-cyan-500"}`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-xs text-gray-400 mb-3">{Math.round(progress)}% completat</p>
                {total > 0 && (
                  <button
                    onClick={() => openModule(completed ? 0 : nextIdx)}
                    className="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-bold transition"
                  >
                    {completed ? "📖 Revizuiește" : "▶ Continuă cursul"}
                  </button>
                )}
              </div>
            ) : (
              <button
                onClick={handleEnroll}
                className="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-bold transition"
              >
                + Înscrie-te gratuit
              </button>
            )}
          </div>

          <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-extrabold text-gray-900">ℹ️ Detalii curs</h3>
            {[
              { label: "Nivel",     value: diff.label },
              { label: "Module",    value: total > 0 ? `${total} module` : "—" },
              { label: "Durată",    value: course.duration_minutes > 0 ? `${course.duration_minutes} min` : "—" },
              { label: "Categorie", value: course.category?.name || "—" },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between text-sm">
                <span className="text-gray-400">{label}</span>
                <span className="text-gray-900 font-semibold">{value}</span>
              </div>
            ))}
          </div>

          {course.file_path && enrollment && (
            <div className="bg-amber-50 border border-amber-200 rounded-3xl p-5">
              <h3 className="text-sm font-extrabold text-amber-700 mb-3">📎 Material de studiu</h3>
              <a
                href={`${API}/${course.file_path}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 text-xs text-amber-700 hover:text-amber-900 font-semibold transition"
              >
                📄 Descarcă materialul
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Modal lecție */}
      {openIdx !== null && (
        <LessonModal
          module={modules[openIdx]}
          index={openIdx}
          isCompleted={openIdx < completedModules}
          onClose={() => setOpenIdx(null)}
          onComplete={() => completeLesson(openIdx)}
        />
      )}
    </div>
  );
}