import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
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

// ─── Circular progress ───────────────────────────────────────
function CircleProgress({ percent, color = "#3b82f6" }) {
  const r = 52;
  const circ = 2 * Math.PI * r;
  const offset = circ - (percent / 100) * circ;
  return (
    <svg width="128" height="128" viewBox="0 0 128 128">
      <circle cx="64" cy="64" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
      <circle
        cx="64" cy="64" r={r}
        fill="none" stroke={color} strokeWidth="8"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 64 64)"
        style={{ transition: "stroke-dashoffset .6s ease" }}
      />
      <text x="64" y="60" textAnchor="middle" fill="white" fontSize="22" fontWeight="700">
        {percent}%
      </text>
      <text x="64" y="78" textAnchor="middle" fill="#6b7280" fontSize="11">
        progres
      </text>
    </svg>
  );
}

// ─── Module row ──────────────────────────────────────────────
function ModuleRow({ module, index, isCompleted, onClick }) {
  return (
    <div
      className={`flex items-center gap-4 p-4 rounded-xl border transition cursor-pointer group ${
        isCompleted
          ? "border-green-500/30 bg-green-500/5 hover:bg-green-500/10"
          : "border-white/10 bg-white/5 hover:border-blue-500/40 hover:bg-white/8"
      }`}
      onClick={onClick}
    >
      {/* Index / check */}
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
        isCompleted ? "bg-green-500 text-white" : "bg-white/10 text-gray-400"
      }`}>
        {isCompleted ? "✓" : index + 1}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">{module.title}</p>
        <div className="flex items-center gap-3 mt-0.5">
          {module.duration_minutes > 0 && (
            <span className="text-xs text-gray-500">⏱ {module.duration_minutes} min</span>
          )}
          {module.video_url && (
            <span className="text-xs text-blue-400">🎥 Video</span>
          )}
          {module.attachment_path && (
            <span className="text-xs text-amber-400">📎 Fișier</span>
          )}
        </div>
      </div>

      <span className={`text-xs transition ${
        isCompleted ? "text-green-400" : "text-gray-600 group-hover:text-gray-400"
      }`}>
        {isCompleted ? "Finalizat" : "→"}
      </span>
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

  useEffect(() => { fetchAll(); }, [courseId]);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [cRes, eRes] = await Promise.all([
        axios.get(`${API}/courses/${courseId}?token=${token}`),
        axios.get(`${API}/progress/my-courses?token=${token}`),
      ]);

      setCourse(cRes.data);

      // Module vin din course.modules (dacă există) sau le extragem
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">Se încarcă cursul...</p>
        </div>
      </div>
    );
  }

  if (!course) return null;

  const diff     = DIFFICULTY_LABELS[course.difficulty_level] ?? DIFFICULTY_LABELS.beginner;
  const progress = enrollment?.progress_percent ?? 0;
  const completed = enrollment?.completed ?? false;
  const completedModules = 0; // va fi calculat din progress records când le avem

  return (
    <div className="min-h-screen bg-gray-950 text-white">

      {/* Hero */}
      <div className="bg-gradient-to-br from-gray-900 via-blue-950/30 to-gray-900 border-b border-white/5">
        <div className="max-w-5xl mx-auto px-6 py-10">

          {/* Breadcrumb */}
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-400 hover:text-white text-sm mb-6 transition"
          >
            ← Înapoi la cursuri
          </button>

          <div className="flex flex-col lg:flex-row gap-8">
            {/* Left */}
            <div className="flex-1">
              {/* Categorii & nivel */}
              <div className="flex items-center gap-2 mb-4 flex-wrap">
                {course.category && (
                  <span className="px-3 py-1 bg-white/10 text-gray-300 text-xs rounded-full">
                    {course.category.name}
                  </span>
                )}
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${diff.color}`}>
                  {diff.label}
                </span>
                {course.duration_minutes > 0 && (
                  <span className="px-3 py-1 bg-white/5 text-gray-400 text-xs rounded-full">
                    ⏱ {course.duration_minutes} min
                  </span>
                )}
              </div>

              <h1 className="text-3xl font-bold mb-3 leading-tight">{course.title}</h1>
              <p className="text-gray-400 text-base leading-relaxed mb-6">
                {course.description || course.short_description || "Fără descriere"}
              </p>

              {/* Enrollment status */}
              {enrollment ? (
                <div className="flex items-center gap-3 text-sm">
                  <span className={`px-3 py-1 rounded-full font-medium ${
                    completed
                      ? "bg-green-500/20 text-green-400"
                      : "bg-blue-500/20 text-blue-400"
                  }`}>
                    {completed ? "✓ Finalizat" : "⏳ În progres"}
                  </span>
                  <span className="text-gray-500">
                    Înscris din {new Date(enrollment.started_at || Date.now()).toLocaleDateString("ro-RO")}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleEnroll}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold text-sm transition"
                  >
                    + Înscrie-te gratuit
                  </button>
                  <span className="text-gray-500 text-sm">Acces imediat după înscriere</span>
                </div>
              )}
            </div>

            {/* Right: progress card */}
            {enrollment && (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col items-center gap-4 flex-shrink-0 w-full lg:w-48">
                <CircleProgress percent={progress} color={completed ? "#22c55e" : "#3b82f6"} />
                <div className="text-center">
                  <p className="text-xs text-gray-500 mb-1">Module completate</p>
                  <p className="text-sm font-semibold text-white">
                    {completedModules} / {modules.length || "—"}
                  </p>
                </div>
                {!completed && (
                  <button
                    onClick={() => navigate(`/quiz/${courseId}`)}
                    className="w-full py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition"
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

        {/* Modulele cursului */}
        <div className="lg:col-span-2 space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-white mb-4">
              📋 Conținut curs
              {modules.length > 0 && (
                <span className="ml-2 text-sm font-normal text-gray-500">
                  {modules.length} module
                </span>
              )}
            </h2>

            {modules.length === 0 ? (
              // Dacă nu sunt module în DB, afișăm secțiunile hardcodate placeholder
              <div className="space-y-3">
                {["Introducere și concepte de bază", "Aplicații practice", "Evaluare finală"].map(
                  (title, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-4 p-4 rounded-xl border border-white/10 bg-white/5"
                    >
                      <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs text-gray-400 flex-shrink-0">
                        {i + 1}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{title}</p>
                        <p className="text-xs text-gray-500 mt-0.5">Modul {i + 1}</p>
                      </div>
                      {!enrollment && (
                        <span className="ml-auto text-xs text-gray-600">🔒</span>
                      )}
                    </div>
                  )
                )}
                {!enrollment && (
                  <p className="text-xs text-gray-500 text-center py-2">
                    Înscrie-te pentru a accesa conținutul cursului
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {modules.map((mod, i) => (
                  <ModuleRow
                    key={mod.id}
                    module={mod}
                    index={i}
                    isCompleted={false}
                    onClick={() => {
                      if (!enrollment) {
                        addToast("Înscrie-te mai întâi la acest curs", "info");
                        return;
                      }
                      navigate(`/quiz/${courseId}`);
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Descriere completă */}
          {course.description && (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h2 className="text-base font-semibold text-white mb-3">📖 Despre acest curs</h2>
              <p className="text-gray-400 text-sm leading-relaxed">{course.description}</p>
            </div>
          )}

          {/* Obiective placeholder */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <h2 className="text-base font-semibold text-white mb-4">🎯 Ce vei învăța</h2>
            <ul className="space-y-2.5">
              {[
                "Înțelegi conceptele fundamentale din domeniu",
                "Aplici cunoștințele în situații reale",
                "Rezolvi probleme cu metodologiile învățate",
                "Obții certificat de finalizare",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-gray-400">
                  <span className="text-green-400 mt-0.5 flex-shrink-0">✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-5">

          {/* CTA card */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4">
              {enrollment ? "Continuă cursul" : "Începe cursul"}
            </h3>

            {enrollment ? (
              <div className="space-y-3">
                <div className="w-full bg-white/10 rounded-full h-1.5 mb-1">
                  <div
                    className={`h-1.5 rounded-full ${completed ? "bg-green-500" : "bg-blue-500"}`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mb-3">{progress}% completat</p>
                <button
                  onClick={() => navigate(`/quiz/${courseId}`)}
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition"
                >
                  {completed ? "📖 Revizuiește" : "▶ Continuă cursul"}
                </button>
              </div>
            ) : (
              <button
                onClick={handleEnroll}
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition"
              >
                + Înscrie-te gratuit
              </button>
            )}
          </div>

          {/* Detalii curs */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-white">ℹ️ Detalii curs</h3>
            {[
              { label: "Nivel",    value: diff.label },
              { label: "Module",   value: modules.length > 0 ? `${modules.length} module` : "—" },
              { label: "Durată",   value: course.duration_minutes > 0 ? `${course.duration_minutes} min` : "—" },
              { label: "Categorie", value: course.category?.name || "—" },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between text-sm">
                <span className="text-gray-500">{label}</span>
                <span className="text-white font-medium">{value}</span>
              </div>
            ))}
          </div>

          {/* Fișier atașat cursului */}
          {course.file_path && enrollment && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-amber-400 mb-3">📎 Material de studiu</h3>
              <a
                href={`${API}/${course.file_path}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 text-xs text-amber-300 hover:text-white transition"
              >
                <span>📄</span>
                <span>Descarcă materialul</span>
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
