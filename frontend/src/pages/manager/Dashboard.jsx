import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";
import { useToast } from "../../context/ToastContext";
import { deptTheme } from "../../theme/departments";

const API = "http://127.0.0.1:8000";

const STATUS = {
  passed:      ["bg-emerald-50 text-emerald-700 border-emerald-200", "Promovat"],
  failed:      ["bg-rose-50 text-rose-700 border-rose-200", "Respins"],
  submitted:   ["bg-amber-50 text-amber-800 border-amber-200", "De corectat"],
  graded:      ["bg-blue-50 text-blue-700 border-blue-200", "Corectat"],
  in_progress: ["bg-slate-100 text-slate-600 border-slate-200", "În curs"],
};

function Stat({ label, value, hint }) {
  return (
    <div className="surface p-5">
      <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
      <p className="metric text-3xl text-slate-900 mt-2">{value}</p>
      {hint && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
    </div>
  );
}

export default function ManagerDashboard() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [employees, setEmployees] = useState([]);
  const [courses, setCourses] = useState([]);
  const [exams, setExams] = useState([]);
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openExamId, setOpenExamId] = useState(null);
  const [attempts, setAttempts] = useState({});

  const dept = deptTheme(user?.department_id);
  const deptName = user?.department?.name || "Departamentul tău";

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [emp, c, e, p] = await Promise.all([
        axios.get(`${API}/users/department/performance?token=${token}`),
        axios.get(`${API}/courses/?token=${token}`),
        axios.get(`${API}/exams/?token=${token}`),
        axios.get(`${API}/exams/grading/pending?token=${token}`),
      ]);
      setEmployees(emp.data);
      setCourses(c.data.filter((x) => x.created_by === user?.id));
      setExams(e.data);
      setPending(p.data);
    } catch {
      addToast("Eroare la încărcarea datelor", "error");
    } finally { setLoading(false); }
  };

  const pendingFor = (id) => pending.filter((p) => p.exam_id === id).length;

  const toggleExam = async (id) => {
    if (openExamId === id) return setOpenExamId(null);
    setOpenExamId(id);
    if (!attempts[id]) {
      try {
        const res = await axios.get(`${API}/exams/${id}/attempts?token=${token}`);
        setAttempts((prev) => ({ ...prev, [id]: res.data }));
      } catch { addToast("Eroare la încărcarea rezultatelor", "error"); }
    }
  };

  const badge = (status) => {
    const [cls, label] = STATUS[status] || STATUS.in_progress;
    return <span className={`tag ${cls}`}>{label}</span>;
  };

  if (loading)
    return <div className="min-h-screen flex items-center justify-center text-slate-500">Se încarcă...</div>;

  return (
    <div className="min-h-screen pb-12">
      {/* Header cu accent de departament */}
      <div className="bg-white border-b" style={{ borderColor: "var(--line)" }}>
        <div className="max-w-6xl mx-auto px-6 py-9">
          <div className="flex items-center gap-3 mb-2">
            <span className="eyebrow">Panou Manager</span>
            <span className={`tag ${dept.chip}`}>{deptName}</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900">Bun venit, {user?.full_name?.split(" ")[0]}</h1>
          <p className="text-slate-500 mt-1">Performanța echipei tale și starea examenelor din departament.</p>
        </div>
        <div className="h-1" style={{ background: dept.bar }} />
      </div>

      <div className="max-w-6xl mx-auto px-6 space-y-8 mt-8">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Stat label="Angajați" value={employees.length} />
          <Stat label="Cursurile mele" value={courses.length} />
          <Stat label="Examenele mele" value={exams.length} />
          <Stat label="De corectat" value={pending.length} hint={pending.length ? "necesită atenție" : "totul la zi"} />
        </div>

        {/* Tabel angajați */}
        <div className="surface overflow-hidden">
          <div className="px-6 py-5 border-b flex items-center justify-between" style={{ borderColor: "var(--line)" }}>
            <h2 className="text-lg font-bold text-slate-900">Performanța echipei</h2>
            <span className="text-xs font-semibold text-slate-400">{employees.length} angajați</span>
          </div>
          {employees.length === 0 ? (
            <p className="text-center py-12 text-slate-400">Niciun angajat în departament.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="data">
                <thead>
                  <tr>
                    <th>Angajat</th>
                    <th style={{ textAlign: "center" }}>Cursuri</th>
                    <th>Progres mediu</th>
                    <th style={{ textAlign: "center" }}>Examene promovate</th>
                    <th style={{ textAlign: "center" }}>Scor mediu</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((e) => (
                    <tr key={e.id}>
                      <td>
                        <p className="font-semibold text-slate-900">{e.full_name}</p>
                        <p className="text-xs text-slate-400">{e.email}</p>
                      </td>
                      <td style={{ textAlign: "center" }} className="metric text-slate-700">
                        {e.courses_completed}/{e.courses_total}
                      </td>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${e.avg_progress}%`, background: dept.bar }} />
                          </div>
                          <span className="metric text-xs text-slate-600 w-10 text-right">{e.avg_progress}%</span>
                        </div>
                      </td>
                      <td style={{ textAlign: "center" }} className="metric text-slate-700">{e.exams_passed}</td>
                      <td style={{ textAlign: "center" }}>
                        <span className={`metric font-bold ${e.avg_score >= 50 ? "text-emerald-600" : "text-slate-400"}`}>
                          {e.avg_score}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Examene */}
        <div className="surface overflow-hidden">
          <div className="px-6 py-5 border-b flex items-center justify-between" style={{ borderColor: "var(--line)" }}>
            <h2 className="text-lg font-bold text-slate-900">Examenele departamentului</h2>
            <button onClick={() => navigate("/admin/examene")} className="text-sm font-semibold" style={{ color: "var(--accent)" }}>
              Gestionează →
            </button>
          </div>
          {exams.length === 0 ? (
            <p className="text-center py-12 text-slate-400">Niciun examen în departament.</p>
          ) : (
            <div className="divide-y" style={{ borderColor: "var(--line)" }}>
              {exams.map((ex) => {
                const toGrade = pendingFor(ex.id);
                const isOpen = openExamId === ex.id;
                const rows = attempts[ex.id] || [];
                return (
                  <div key={ex.id}>
                    <button onClick={() => toggleExam(ex.id)}
                      className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition text-left">
                      <div className="flex items-center gap-3">
                        <span className="text-slate-400 metric">{isOpen ? "–" : "+"}</span>
                        <span className="font-semibold text-slate-900">{ex.title}</span>
                        {!ex.is_published && <span className="tag bg-slate-100 text-slate-500 border-slate-200">Ciornă</span>}
                      </div>
                      {toGrade > 0 && <span className="tag bg-amber-50 text-amber-800 border-amber-200">{toGrade} de corectat</span>}
                    </button>
                    {isOpen && (
                      <div className="px-6 pb-5">
                        {rows.length === 0 ? (
                          <p className="text-sm text-slate-400 py-3">Niciun angajat nu a dat acest examen încă.</p>
                        ) : (
                          <table className="data">
                            <thead>
                              <tr>
                                <th>Angajat</th>
                                <th style={{ textAlign: "center" }}>Scor</th>
                                <th style={{ textAlign: "center" }}>Status</th>
                                <th style={{ textAlign: "right" }}>Data</th>
                              </tr>
                            </thead>
                            <tbody>
                              {rows.map((a) => (
                                <tr key={a.attempt_id}>
                                  <td className="font-medium text-slate-800">{a.student_name}</td>
                                  <td style={{ textAlign: "center" }}>
                                    {a.score !== null ? <span className="metric font-bold text-slate-900">{a.score}%</span> : <span className="text-slate-300">—</span>}
                                  </td>
                                  <td style={{ textAlign: "center" }}>{badge(a.status)}</td>
                                  <td style={{ textAlign: "right" }} className="text-slate-500">
                                    {a.submitted_at ? new Date(a.submitted_at).toLocaleDateString("ro-RO") : "—"}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}