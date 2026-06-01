import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";

const API = "http://127.0.0.1:8000";

const STATUS_META = {
  done:        { label: "Finalizat",  chip: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  in_progress: { label: "În curs",    chip: "bg-amber-50 text-amber-800 border-amber-200",       dot: "bg-amber-500" },
  failed:      { label: "Nepromovat", chip: "bg-rose-50 text-rose-700 border-rose-200",          dot: "bg-rose-500" },
  not_started: { label: "Neînceput",  chip: "bg-slate-100 text-slate-500 border-slate-200",      dot: "bg-slate-300" },
};

function ProgressBar({ value, completed }) {
  return (
    <div className="w-full bg-slate-100 rounded-full h-2">
      <div className="h-2 rounded-full transition-all" style={{ width: `${Math.min(value, 100)}%`, background: completed ? "#10b981" : "var(--accent)" }} />
    </div>
  );
}

function PlanCard({ plan, active, onClick }) {
  return (
    <button onClick={onClick} className="text-left w-full surface p-5 transition" style={active ? { boxShadow: "0 0 0 2px var(--accent)" } : undefined}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <h3 className="font-bold text-slate-900 leading-snug">{plan.title}</h3>
        {plan.is_mandatory && <span className="tag bg-slate-100 text-slate-600 border-slate-200">Obligatoriu</span>}
      </div>
      {plan.description && <p className="text-sm text-slate-500 mb-4 line-clamp-2">{plan.description}</p>}
      <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1.5">
        <span className="metric">{plan.items_done}/{plan.items_total} pași</span>
        <span className={`metric ${plan.completed ? "text-emerald-600" : ""}`}>{plan.progress_percent}%</span>
      </div>
      <ProgressBar value={plan.progress_percent} completed={plan.completed} />
    </button>
  );
}

function PlanItem({ item, index, onOpen }) {
  const meta = STATUS_META[item.status] || STATUS_META.not_started;
  const isCourse = item.type === "course";
  return (
    <div className="flex items-center gap-4 surface p-4">
      <div className={`w-9 h-9 flex-shrink-0 rounded-full flex items-center justify-center text-white font-bold text-sm metric ${meta.dot}`}>{index + 1}</div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-slate-900 truncate">{item.title}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="tag bg-slate-100 text-slate-500 border-slate-200">{isCourse ? "Curs" : "Examen"}</span>
          <span className={`tag ${meta.chip}`}>{meta.label}</span>
          {isCourse && item.status === "in_progress" && <span className="metric text-xs text-slate-400">{Math.round(item.progress_percent)}%</span>}
          {!isCourse && item.score != null && <span className="metric text-xs text-slate-400">scor {item.score}%</span>}
        </div>
      </div>
      <button onClick={() => onOpen(item)} className="btn btn-primary flex-shrink-0">{isCourse ? "Deschide" : "La examen"}</button>
    </div>
  );
}

export default function MyLearningPlans() {
  const { token } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [selected, setSelected] = useState(null);
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
    } catch { addToast("Eroare la încărcarea planurilor", "error"); }
    finally { setLoadingList(false); }
  };
  const selectPlan = async (id) => {
    try { setLoadingDetail(true); const res = await axios.get(`${API}/learning-plans/my/${id}`, authHeader); setSelected(res.data); }
    catch { addToast("Eroare la încărcarea traseului", "error"); }
    finally { setLoadingDetail(false); }
  };
  const openItem = (item) => item.type === "course" ? navigate(`/course/${item.ref_id}`) : navigate("/my-exams");

  if (loadingList) return <div className="min-h-screen flex items-center justify-center text-slate-500">Se încarcă...</div>;

  return (
    <div className="min-h-screen pb-12">
      <div className="bg-white border-b px-6 py-9" style={{ borderColor: "var(--line)" }}>
        <div className="max-w-6xl mx-auto">
          <span className="eyebrow">Trasee de învățare</span>
          <h1 className="text-3xl font-extrabold text-slate-900 mt-1">Planurile mele</h1>
          <p className="text-slate-500 mt-1">Trasee de cursuri și examene asignate ție. Parcurge-le în ordine.</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 mt-8">
        {plans.length === 0 ? (
          <div className="surface p-12 text-center text-slate-400">Niciun plan asignat încă.</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <div className="lg:col-span-2 space-y-4">
              {plans.map((p) => <PlanCard key={p.assignment_id} plan={p} active={selected?.assignment_id === p.assignment_id} onClick={() => selectPlan(p.assignment_id)} />)}
            </div>
            <div className="lg:col-span-3">
              {loadingDetail || !selected ? (
                <div className="surface p-12 text-center text-slate-400">Se încarcă traseul...</div>
              ) : (
                <div className="surface p-6">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h2 className="text-xl font-bold text-slate-900">{selected.title}</h2>
                    {selected.completed && <span className="tag bg-emerald-50 text-emerald-700 border-emerald-200">Complet</span>}
                  </div>
                  {selected.description && <p className="text-sm text-slate-500 mb-4">{selected.description}</p>}
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1.5">
                    <span>Progres total</span>
                    <span className={`metric ${selected.completed ? "text-emerald-600" : ""}`}>{selected.progress_percent}%</span>
                  </div>
                  <ProgressBar value={selected.progress_percent} completed={selected.completed} />
                  <div className="mt-6 space-y-3">
                    {selected.items.length === 0
                      ? <p className="text-sm text-slate-400 text-center py-6">Planul nu are încă pași adăugați.</p>
                      : selected.items.map((item, i) => <PlanItem key={item.id} item={item} index={i} onOpen={openItem} />)}
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