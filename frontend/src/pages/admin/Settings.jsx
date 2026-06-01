import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { PieChart, Pie, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";

const API = "http://127.0.0.1:8000";
const COLORS = ["#1f5fbf", "#0f766e", "#6d28d9", "#b45309", "#be123c"];

const TABS = [
  { key: "overview", label: "Profil platformă" },
  { key: "categories", label: "Categorii" },
  { key: "departments", label: "Departamente" },
  { key: "security", label: "Securitate" },
];

export default function AdminSettings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initial = searchParams.get("tab") || "overview";
  const [activeTab, setActiveTab] = useState(TABS.find((t) => t.key === initial) ? initial : "overview");
  const changeTab = (tab) => { setActiveTab(tab); setSearchParams({ tab }); };

  return (
    <div className="min-h-screen pb-12">
      <div className="bg-white border-b px-6 py-9" style={{ borderColor: "var(--line)" }}>
        <div className="max-w-7xl mx-auto">
          <span className="eyebrow">Configurări</span>
          <h1 className="text-3xl font-extrabold text-slate-900 mt-1">Setări sistem</h1>
        </div>
      </div>

      <div className="bg-white border-b sticky top-16 z-30" style={{ borderColor: "var(--line)" }}>
        <div className="max-w-7xl mx-auto px-6 flex gap-1 overflow-x-auto">
          {TABS.map((t) => (
            <button key={t.key} onClick={() => changeTab(t.key)}
              className={`px-5 py-4 text-sm font-semibold border-b-2 -mb-px whitespace-nowrap transition ${activeTab === t.key ? "text-slate-900" : "text-slate-400 hover:text-slate-700"}`}
              style={{ borderColor: activeTab === t.key ? "var(--ink)" : "transparent" }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 pt-8">
        {activeTab === "overview" && <OverviewTab />}
        {activeTab === "categories" && <CategoriesTab />}
        {activeTab === "departments" && <DepartmentsTab />}
        {activeTab === "security" && <SecurityTab />}
      </div>
    </div>
  );
}

function OverviewTab() {
  const { token } = useAuth();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalUsers: 0, totalCourses: 0, totalEnrollments: 0, activeDepartments: 0 });
  const [chartData, setChartData] = useState([]);
  const [coursesData, setCoursesData] = useState([]);

  useEffect(() => { fetchStats(); }, []);
  const fetchStats = async () => {
    try {
      setLoading(true);
      const [u, c, e, d] = await Promise.all([
        axios.get(`${API}/users/?token=${token}`),
        axios.get(`${API}/courses/?token=${token}`),
        axios.get(`${API}/progress/admin/all?token=${token}`),
        axios.get(`${API}/departments/?token=${token}`),
      ]);
      setStats({ totalUsers: u.data.length, totalCourses: c.data.length, totalEnrollments: e.data.length, activeDepartments: d.data.length });
      const map = {};
      e.data.forEach((x) => { map[x.course_id] = (map[x.course_id] || 0) + 1; });
      setChartData(c.data.map((x) => ({ name: x.title.slice(0, 14), value: map[x.id] || 0 })).sort((a, b) => b.value - a.value).slice(0, 5).map((x, i) => ({ ...x, fill: COLORS[i % COLORS.length] })));
      setCoursesData([
        { name: "Ian", enrollments: 42, completed: 18 }, { name: "Feb", enrollments: 55, completed: 28 },
        { name: "Mar", enrollments: 48, completed: 22 }, { name: "Apr", enrollments: 78, completed: 45 },
        { name: "Mai", enrollments: 92, completed: 58 }, { name: "Iun", enrollments: 85, completed: 52 },
      ]);
    } catch { addToast("Eroare la încărcarea statisticilor", "error"); }
    finally { setLoading(false); }
  };

  if (loading) return <div className="text-center py-12 text-slate-400">Se încarcă...</div>;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[["Utilizatori", stats.totalUsers], ["Cursuri", stats.totalCourses], ["Înscrieri", stats.totalEnrollments], ["Departamente", stats.activeDepartments]].map(([l, v]) => (
          <div key={l} className="surface p-5">
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{l}</p>
            <p className="metric text-3xl text-slate-900 mt-2">{v}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="surface p-8">
          <h2 className="text-lg font-bold text-slate-900 mb-6">Top 5 cursuri (înscrieri)</h2>
          {chartData.length === 0 ? <div className="text-center py-12 text-slate-400 text-sm">Nu există date de înscrieri.</div> : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={chartData} cx="50%" cy="50%" labelLine={false} label={({ name, value }) => `${name}: ${value}`} outerRadius={90} dataKey="value">
                  {chartData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e3e7ec" }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="surface p-8">
          <h2 className="text-lg font-bold text-slate-900 mb-6">Trend înscrieri</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={coursesData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef1f4" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: "#64748b" }} axisLine={false} tickLine={false} dy={10} />
              <YAxis tick={{ fill: "#64748b" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e3e7ec" }} />
              <Legend iconType="circle" wrapperStyle={{ paddingTop: 20 }} />
              <Bar dataKey="enrollments" fill="#1f5fbf" name="Înscrieri" radius={[4, 4, 0, 0]} maxBarSize={30} />
              <Bar dataKey="completed" fill="#10b981" name="Finalizate" radius={[4, 4, 0, 0]} maxBarSize={30} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="surface p-8">
        <h2 className="text-lg font-bold text-slate-900 mb-6 border-b pb-4" style={{ borderColor: "var(--line)" }}>Profil platformă</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Titlu platformă</label>
            <input className="input" defaultValue="LearnHub Enterprise" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Email admin</label>
            <input type="email" className="input" defaultValue="admin@learnhub.com" />
          </div>
        </div>
        <button className="btn btn-primary mt-6">Salvează profilul</button>
      </div>
    </div>
  );
}

function CategoriesTab() {
  const { token } = useAuth();
  const { addToast } = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);

  useEffect(() => { fetchAll(); }, []);
  const fetchAll = async () => {
    try { setLoading(true); const res = await axios.get(`${API}/course-categories/?token=${token}`); setItems(res.data); }
    catch { addToast("Eroare la încărcarea categoriilor", "error"); }
    finally { setLoading(false); }
  };
  const handleDelete = async (cat) => {
    if (!window.confirm(`Sigur ștergi categoria "${cat.name}"?`)) return;
    try { await axios.delete(`${API}/course-categories/${cat.id}?token=${token}`); addToast("Categorie ștearsă", "success"); fetchAll(); }
    catch (e) { addToast(e.response?.data?.detail || "Eroare la ștergere", "error"); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Categorii de cursuri</h2>
          <p className="text-sm text-slate-500 mt-0.5">Organizează catalogul (ex: Tehnic, Business).</p>
        </div>
        <button onClick={() => { setEditing(null); setShowModal(true); }} className="btn btn-primary">+ Categorie nouă</button>
      </div>

      {loading ? <div className="text-center py-12 text-slate-400">Se încarcă...</div>
        : items.length === 0 ? <div className="surface p-16 text-center text-slate-400">Nicio categorie.</div>
        : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {items.map((c) => (
              <div key={c.id} className="surface p-6 group">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-bold text-slate-900">{c.name}</h3>
                  <span className={`tag ${c.is_published ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-500 border-slate-200"}`}>{c.is_published ? "Activă" : "Ascunsă"}</span>
                </div>
                <p className="text-sm text-slate-500 line-clamp-2 min-h-[40px]">{c.description || "Fără descriere"}</p>
                <div className="flex items-center gap-2 mt-4 pt-4 border-t" style={{ borderColor: "var(--line)" }}>
                  <span className="metric text-xs text-slate-400">Ordine: {c.display_order}</span>
                  <div className="ml-auto flex gap-3">
                    <button onClick={() => { setEditing(c); setShowModal(true); }} className="text-sm font-semibold" style={{ color: "var(--accent)" }}>Editează</button>
                    <button onClick={() => handleDelete(c)} className="text-sm font-semibold text-rose-600">Șterge</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      {showModal && <CategoryModal existing={editing} onClose={() => { setShowModal(false); setEditing(null); }} onSaved={() => { setShowModal(false); setEditing(null); fetchAll(); }} token={token} addToast={addToast} />}
    </div>
  );
}

function CategoryModal({ existing, onClose, onSaved, token, addToast }) {
  const isEdit = !!existing;
  const [form, setForm] = useState({ name: existing?.name || "", description: existing?.description || "", display_order: existing?.display_order ?? 0, is_published: existing?.is_published ?? true });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (form.name.trim().length < 2) return addToast("Numele e prea scurt", "warning");
    setSaving(true);
    try {
      if (isEdit) { await axios.put(`${API}/course-categories/${existing.id}?token=${token}`, form); addToast("Categorie actualizată", "success"); }
      else { await axios.post(`${API}/course-categories/?token=${token}`, form); addToast("Categorie creată", "success"); }
      onSaved();
    } catch (e) { addToast(e.response?.data?.detail || "Eroare la salvare", "error"); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(15,22,34,.45)" }}>
      <div className="surface w-full max-w-md p-8">
        <h2 className="text-xl font-bold text-slate-900 mb-6">{isEdit ? "Editează categoria" : "Categorie nouă"}</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Nume *</label>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="ex: Tehnic, Business..." />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Descriere</label>
            <textarea rows={3} className="input resize-none" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Ordine afișare</label>
            <input type="number" min={0} className="input text-center" value={form.display_order} onChange={(e) => setForm({ ...form, display_order: parseInt(e.target.value) || 0 })} />
          </div>
          <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border cursor-pointer" style={{ borderColor: "var(--line)" }}>
            <input type="checkbox" checked={form.is_published} onChange={(e) => setForm({ ...form, is_published: e.target.checked })} className="w-5 h-5" style={{ accentColor: "var(--ink)" }} />
            <span className="text-sm font-semibold text-slate-900">Categorie activă</span>
          </label>
        </div>
        <div className="flex gap-3 mt-8">
          <button onClick={handleSubmit} disabled={saving} className="btn btn-primary flex-1">{saving ? "Se salvează..." : isEdit ? "Salvează" : "Crează"}</button>
          <button onClick={onClose} disabled={saving} className="btn btn-ghost flex-1">Anulează</button>
        </div>
      </div>
    </div>
  );
}

function DepartmentsTab() {
  const { token } = useAuth();
  const { addToast } = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchAll(); }, []);
  const fetchAll = async () => {
    try { setLoading(true); const res = await axios.get(`${API}/departments/?token=${token}`); setItems(res.data); }
    catch { addToast("Eroare la încărcare", "error"); }
    finally { setLoading(false); }
  };
  const handleCreate = async () => {
    if (newName.trim().length < 2) return addToast("Nume prea scurt", "warning");
    setSaving(true);
    try { await axios.post(`${API}/departments/?token=${token}`, { name: newName.trim() }); addToast("Departament creat", "success"); setNewName(""); setShowModal(false); fetchAll(); }
    catch (e) { addToast(e.response?.data?.detail || "Eroare la creare", "error"); }
    finally { setSaving(false); }
  };
  const handleDelete = async (d) => {
    if (!window.confirm(`Sigur ștergi departamentul "${d.name}"?`)) return;
    try { await axios.delete(`${API}/departments/${d.id}?token=${token}`); addToast("Departament șters", "success"); fetchAll(); }
    catch (e) { addToast(e.response?.data?.detail || "Eroare la ștergere", "error"); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Departamente</h2>
          <p className="text-sm text-slate-500 mt-0.5">Grupează utilizatorii și permit asignarea cursurilor pe grupe.</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn btn-primary">+ Departament nou</button>
      </div>

      {loading ? <div className="text-center py-12 text-slate-400">Se încarcă...</div>
        : items.length === 0 ? <div className="surface p-16 text-center text-slate-400">Niciun departament.</div>
        : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {items.map((d) => (
              <div key={d.id} className="surface p-6 group">
                <h3 className="text-lg font-bold text-slate-900">{d.name}</h3>
                <p className="metric text-xs text-slate-400 mt-1">ID: {d.id}</p>
                <div className="flex justify-end mt-4 pt-4 border-t" style={{ borderColor: "var(--line)" }}>
                  <button onClick={() => handleDelete(d)} className="text-sm font-semibold text-rose-600">Șterge</button>
                </div>
              </div>
            ))}
          </div>
        )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(15,22,34,.45)" }}>
          <div className="surface w-full max-w-md p-8">
            <h2 className="text-xl font-bold text-slate-900 mb-6">Departament nou</h2>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Nume *</label>
            <input className="input" value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleCreate()} placeholder="ex: IT, Marketing, HR..." autoFocus />
            <div className="flex gap-3 mt-8">
              <button onClick={handleCreate} disabled={saving} className="btn btn-primary flex-1">{saving ? "Se salvează..." : "Crează"}</button>
              <button onClick={() => { setShowModal(false); setNewName(""); }} disabled={saving} className="btn btn-ghost flex-1">Anulează</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SecurityTab() {
  return (
    <div className="surface p-8 max-w-2xl">
      <h2 className="text-lg font-bold text-slate-900 mb-6 border-b pb-4" style={{ borderColor: "var(--line)" }}>Securitate</h2>
      <div className="space-y-3">
        {[["2FA", "Necesită 2FA pentru admini"], ["HTTPS strict", "Forțează conexiuni securizate"], ["Rate limiting", "Limitează requesturile API"]].map(([t, s]) => (
          <div key={t} className="flex items-center justify-between p-4 bg-slate-50 border rounded-xl" style={{ borderColor: "var(--line)" }}>
            <div>
              <p className="font-bold text-slate-900 text-sm">{t}</p>
              <p className="text-xs text-slate-500 mt-0.5">{s}</p>
            </div>
            <input type="checkbox" defaultChecked className="w-5 h-5" style={{ accentColor: "var(--ink)" }} />
          </div>
        ))}
        <button className="btn btn-ghost w-full mt-4" style={{ color: "#be123c", borderColor: "#fecdd3" }}>Resetează sesiunile active</button>
      </div>
    </div>
  );
}