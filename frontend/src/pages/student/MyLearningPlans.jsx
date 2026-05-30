import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";

const API = "http://127.0.0.1:8000";

// ─────────────────────────────────────────────
// Helpers status
// ─────────────────────────────────────────────
const STATUS_META = {
  done:        { label: "Finalizat",  chip: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  in_progress: { label: "În curs",    chip: "bg-amber-50 text-amber-700 border-amber-200",       dot: "bg-amber-500" },
  failed:      { label: "Nepromovat", chip: "bg-red-50 text-red-700 border-red-200",             dot: "bg-red-500" },
  not_started: { label: "Neînceput",  chip: "bg-gray-100 text-gray-500 border-gray-200",         dot: "bg-gray-300" },
};

function ProgressBar({ value, completed }) {
  return (
    <div className="w-full bg-gray-100 rounded-full h-2">
      <div
        className={`h-2 rounded-full transition-all ${completed ? "bg-emerald-500" : "bg-cyan-500"}`}
        style={{ width: `${Math.min(value, 100)}%` }}
      />
    </div>
  );
}

// ─────────────────────────────────────────────
// Card plan (în listă)
// ─────────────────────────────────────────────
function PlanCard({ plan, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`text-left w-full bg-white border rounded-3xl p-6 shadow-sm hover:shadow-md transition-all ${
        active ? "border-cyan-400 ring-2 ring-cyan-100" : "border-gray-100"
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3 className="font-extrabold text-gray-900 text-lg leading-snug">{plan.title}</h3>
        {plan.is_mandatory && (
          <span className="flex-shrink-0 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
            Obligatoriu
          </span>
        )}
      </div>

      {plan.description && (
        <p className="text-sm text-gray-500 mb-4 line-clamp-2">{plan.description}</p>
      )}

      <div className="flex items-center justify-between text-xs font-semibold text-gray-500 mb-1.5">
        <span>{plan.items_done} / {plan.items_total} pași</span>
        <span className={plan.completed ? "text-emerald-600" : "text-cyan-600"}>
          {plan.progress_percent}%
        </span>
      </div>
      <ProgressBar value={plan.progress_percent} completed={plan.completed} />
    </button>
  );
}

// ─────────────────────────────────────────────
// Item în traseu (detaliu)
// ─────────────────────────────────────────────
function PlanItem({ item, index, onOpen }) {
  const meta = STATUS_META[item.status] || STATUS_META.not_started;
  const isCourse = item.type === "course";

  return (
    <div className="flex items-center gap-4 bg-white border border-gray-100 rounded-2xl p-4">
      <div className={`w-9 h-9 flex-shrink-0 rounded-full flex items-center justify-center text-white font-bold text-sm ${meta.dot}`}>
        {index + 1}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-base">{isCourse ? "📘" : "📝"}</span>
          <p className="font-bold text-gray-900 truncate">{item.title}</p>
          {!item.is_required && (
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">opțional</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${meta.chip}`}>
            {meta.label}
          </span>
          {isCourse && item.status === "in_progress" && (
            <span className="text-xs text-gray-400">{Math.round(item.progress_percent)}%</span>
          )}
          {!isCourse && item.score != null && (
            <span className="text-xs text-gray-400">scor {item.score}%</span>
          )}
        </div>
      </div>

      <button
        onClick={() => onOpen(item)}
        className="flex-shrink-0 px-4 py-2 rounded-xl bg-gray-900 hover:bg-gray-800 text-white text-sm font-bold transition"
      >
        {isCourse ? "Deschide" : "La examen"}
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────
// Pagina principală
// ─────────────────────────────────────────────
export default function MyLearningPlans() {
  const { token } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [plans, setPlans] = useState([]);
  const [selected, setSelected] = useState(null); // detaliul planului selectat
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const authHeader = { headers: { Authorization: `Bearer ${token}` } };

  useEffect(() => { fetchPlans(); }, []);

  const fetchPlans = async () => {
    try {
      setLoadingList(true);
      const res = await axios.get(`${API}/learning-plans/my`, authHeader);
      setPlans(res.data);
      if (res.data.length > 0) selectPlan(res.data[0].assignment_id);
    } catch {
      addToast("Eroare la încărcarea planurilor", "error");
    } finally {
      setLoadingList(false);
    }
  };

  const selectPlan = async (assignmentId) => {
    try {
      setLoadingDetail(true);
      const res = await axios.get(`${API}/learning-plans/my/${assignmentId}`, authHeader);
      setSelected(res.data);
    } catch {
      addToast("Eroare la încărcarea traseului", "error");
    } finally {
      setLoadingDetail(false);
    }
  };

  const openItem = (item) => {
    if (item.type === "course") navigate(`/course/${item.ref_id}`);
    else navigate("/my-exams");
  };

  if (loadingList) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-500">
        Se încarcă...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-12 animate-in fade-in">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-10 mb-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-extrabold text-gray-900">Planurile mele de învățare</h1>
          <p className="text-gray-500 mt-1">
            Trasee de cursuri și examene asignate ție. Parcurge-le în ordine.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6">
        {plans.length === 0 ? (
          <div className="bg-white border border-gray-100 rounded-3xl p-12 text-center">
            <p className="text-5xl mb-4">🗺️</p>
            <p className="text-gray-900 font-bold text-lg">Niciun plan asignat încă</p>
            <p className="text-gray-500 mt-1">
              Când un profesor îți asignează un plan de învățare, îl vei vedea aici.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Lista planuri */}
            <div className="lg:col-span-2 space-y-4">
              {plans.map((p) => (
                <PlanCard
                  key={p.assignment_id}
                  plan={p}
                  active={selected?.assignment_id === p.assignment_id}
                  onClick={() => selectPlan(p.assignment_id)}
                />
              ))}
            </div>

            {/* Detaliu traseu */}
            <div className="lg:col-span-3">
              {loadingDetail || !selected ? (
                <div className="bg-white border border-gray-100 rounded-3xl p-12 text-center text-gray-400">
                  Se încarcă traseul...
                </div>
              ) : (
                <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h2 className="text-xl font-extrabold text-gray-900">{selected.title}</h2>
                    {selected.completed && (
                      <span className="flex-shrink-0 text-xs font-bold px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        ✓ Complet
                      </span>
                    )}
                  </div>
                  {selected.description && (
                    <p className="text-sm text-gray-500 mb-4">{selected.description}</p>
                  )}

                  <div className="flex items-center justify-between text-xs font-semibold text-gray-500 mb-1.5">
                    <span>Progres total</span>
                    <span className={selected.completed ? "text-emerald-600" : "text-cyan-600"}>
                      {selected.progress_percent}%
                    </span>
                  </div>
                  <ProgressBar value={selected.progress_percent} completed={selected.completed} />

                  <div className="mt-6 space-y-3">
                    {selected.items.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-6">
                        Planul nu are încă pași adăugați.
                      </p>
                    ) : (
                      selected.items.map((item, i) => (
                        <PlanItem key={item.id} item={item} index={i} onOpen={openItem} />
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}