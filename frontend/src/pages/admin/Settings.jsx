import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { PieChart, Pie, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";

const API = "http://127.0.0.1:8000";

const TABS = [
  { key: "overview",     label: "Profil Platformă", icon: "⚙️" },
  { key: "categories",   label: "Categorii",        icon: "📁" },
  { key: "departments",  label: "Departamente",     icon: "🏢" },
  { key: "security",     label: "Securitate",       icon: "🔒" },
];

export default function AdminSettings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") || "overview";
  const [activeTab, setActiveTab] = useState(
    TABS.find((t) => t.key === initialTab) ? initialTab : "overview"
  );

  const changeTab = (tab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-12 animate-in fade-in duration-500">

      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-10 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-50/50 via-white to-amber-50/30 pointer-events-none" />
        <div className="max-w-7xl mx-auto relative z-10">
          <p className="text-xs font-bold text-cyan-600 uppercase tracking-widest mb-1">Configurări Platformă</p>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Setări Sistem</h1>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="bg-white border-b border-gray-100 sticky top-16 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 flex gap-1 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => changeTab(t.key)}
              className={`flex items-center gap-2 px-5 py-4 text-sm font-bold transition-all whitespace-nowrap border-b-2 ${
                activeTab === t.key
                  ? "border-cyan-500 text-cyan-700"
                  : "border-transparent text-gray-500 hover:text-gray-900"
              }`}
            >
              <span>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="max-w-7xl mx-auto px-6 pt-8">
        {activeTab === "overview"    && <OverviewTab />}
        {activeTab === "categories"  && <CategoriesTab />}
        {activeTab === "departments" && <DepartmentsTab />}
        {activeTab === "security"    && <SecurityTab />}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
//  TAB: Profil Platformă (overview + grafice)
// ──────────────────────────────────────────────────────────────
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
      // Folosim datele reale din backend când avem nevoie
      const [usersRes, coursesRes, enrollRes, deptsRes] = await Promise.all([
        axios.get(`${API}/users/?token=${token}`),
        axios.get(`${API}/courses/?token=${token}`),
        axios.get(`${API}/progress/admin/all?token=${token}`),
        axios.get(`${API}/departments/?token=${token}`),
      ]);

      setStats({
        totalUsers: usersRes.data.length,
        totalCourses: coursesRes.data.length,
        totalEnrollments: enrollRes.data.length,
        activeDepartments: deptsRes.data.length,
      });

      // Top cursuri după înscrieri
      const courseEnrollMap = {};
      enrollRes.data.forEach((e) => {
        courseEnrollMap[e.course_id] = (courseEnrollMap[e.course_id] || 0) + 1;
      });
      const colors = ["#06b6d4", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444"];
      const top = coursesRes.data
        .map((c) => ({ name: c.title.slice(0, 14), value: courseEnrollMap[c.id] || 0 }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5)
        .map((c, i) => ({ ...c, fill: colors[i % colors.length] }));
      setChartData(top);

      // Date statice pt grafic temporal - le lăsăm până avem tracking de date
      setCoursesData([
        { name: "Ian", enrollments: 42, completed: 18 },
        { name: "Feb", enrollments: 55, completed: 28 },
        { name: "Mar", enrollments: 48, completed: 22 },
        { name: "Apr", enrollments: 78, completed: 45 },
        { name: "Mai", enrollments: 92, completed: 58 },
        { name: "Iun", enrollments: 85, completed: 52 },
      ]);
    } catch {
      addToast("Eroare la încărcarea statisticilor", "error");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Se încarcă...</div>;
  }

  return (
    <div className="space-y-8">
      {/* Stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: "Utilizatori",   value: stats.totalUsers,         icon: "👥", color: "text-blue-600"   },
          { label: "Cursuri",       value: stats.totalCourses,       icon: "📚", color: "text-green-600"  },
          { label: "Înscrieri",     value: stats.totalEnrollments,   icon: "📝", color: "text-purple-600" },
          { label: "Departamente",  value: stats.activeDepartments,  icon: "🏢", color: "text-amber-600"  },
        ].map((stat, i) => (
          <div key={i} className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-gray-500 uppercase tracking-wider text-xs">{stat.label}</h3>
              <span className="text-2xl">{stat.icon}</span>
            </div>
            <p className={`text-4xl font-black ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8">
          <h2 className="text-xl font-extrabold text-gray-900 mb-6">📊 Top 5 Cursuri (Înscrieri)</h2>
          {chartData.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm font-medium">Nu există încă date de înscrieri.</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={chartData} cx="50%" cy="50%" labelLine={false} label={({ name, value }) => `${name}: ${value}`} outerRadius={90} dataKey="value">
                  {chartData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8">
          <h2 className="text-xl font-extrabold text-gray-900 mb-6">📈 Trend Înscrieri</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={coursesData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: "#6b7280", fontWeight: 600 }} axisLine={false} tickLine={false} dy={10} />
              <YAxis tick={{ fill: "#6b7280", fontWeight: 600 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
              <Legend iconType="circle" wrapperStyle={{ paddingTop: 20 }} />
              <Bar dataKey="enrollments" fill="#06b6d4" name="Înscrieri" radius={[4, 4, 0, 0]} maxBarSize={30} />
              <Bar dataKey="completed"   fill="#10b981" name="Finalizate" radius={[4, 4, 0, 0]} maxBarSize={30} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Profil platformă form */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8">
        <h2 className="text-xl font-extrabold text-gray-900 mb-6 border-b border-gray-50 pb-4">🔧 Profil Platformă</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 ml-1">Titlu Platformă</label>
            <input type="text" defaultValue="AI eLearning Platform" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-sm text-gray-900 focus:outline-none focus:border-cyan-400 transition-all" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 ml-1">Email Admin</label>
            <input type="email" defaultValue="admin@elearning.com" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-sm text-gray-900 focus:outline-none focus:border-cyan-400 transition-all" />
          </div>
        </div>
        <button className="mt-6 bg-gray-900 text-white font-extrabold py-3 px-6 rounded-xl hover:bg-gray-800 transition-all shadow-md shadow-gray-900/10">
          💾 Salvează Profilul
        </button>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
//  TAB: Categorii
// ──────────────────────────────────────────────────────────────
function CategoriesTab() {
  const { token } = useAuth();
  const { addToast } = useToast();

  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API}/course-categories/?token=${token}`);
      setItems(res.data);
    } catch {
      addToast("Eroare la încărcarea categoriilor", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (cat) => {
    if (!window.confirm(`Sigur ștergi categoria "${cat.name}"? Cursurile asociate rămân, dar fără categorie.`)) return;
    try {
      await axios.delete(`${API}/course-categories/${cat.id}?token=${token}`);
      addToast("Categorie ștearsă", "success");
      fetchAll();
    } catch (e) {
      addToast(e.response?.data?.detail || "Eroare la ștergere", "error");
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-extrabold text-gray-900">Categorii de Cursuri</h2>
          <p className="text-sm text-gray-500 font-medium mt-1">
            Categoriile organizează catalogul (ex: Tehnic, Business).
          </p>
        </div>
        <button
          onClick={() => { setEditing(null); setShowModal(true); }}
          className="px-5 py-3 bg-gray-900 hover:bg-gray-800 text-white font-extrabold rounded-xl shadow-md shadow-gray-900/10 text-sm flex items-center gap-2"
        >
          <span className="text-lg">+</span> Categorie Nouă
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Se încarcă...</div>
      ) : items.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-3xl p-16 text-center shadow-sm">
          <div className="text-5xl mb-4 opacity-50">📁</div>
          <p className="text-gray-900 font-bold text-lg mb-2">Nicio categorie</p>
          <p className="text-gray-500 text-sm">Adaugă prima categorie pentru a începe.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map((c) => (
            <div key={c.id} className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all group">
              <div className="flex items-start justify-between mb-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-100 flex items-center justify-center text-xl">📁</div>
                <span className={`px-2.5 py-1 text-[10px] font-extrabold rounded-lg uppercase tracking-wider border ${
                  c.is_published
                    ? "bg-green-50 border-green-200 text-green-700"
                    : "bg-gray-50 border-gray-200 text-gray-500"
                }`}>
                  {c.is_published ? "Activă" : "Ascunsă"}
                </span>
              </div>
              <h3 className="text-lg font-extrabold text-gray-900 mb-1">{c.name}</h3>
              <p className="text-sm text-gray-500 line-clamp-2 min-h-[40px]">{c.description || "Fără descriere"}</p>
              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-50">
                <span className="text-xs font-bold text-gray-400">Ordine: {c.display_order}</span>
                <div className="ml-auto flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => { setEditing(c); setShowModal(true); }} className="px-3 py-1.5 bg-cyan-50 hover:bg-cyan-100 text-cyan-700 rounded-lg text-xs font-bold transition">Editează</button>
                  <button onClick={() => handleDelete(c)} className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-bold transition">Șterge</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <CategoryModal
          existing={editing}
          onClose={() => { setShowModal(false); setEditing(null); }}
          onSaved={() => { setShowModal(false); setEditing(null); fetchAll(); }}
          token={token}
          addToast={addToast}
        />
      )}
    </div>
  );
}

function CategoryModal({ existing, onClose, onSaved, token, addToast }) {
  const isEdit = !!existing;
  const [form, setForm] = useState({
    name:          existing?.name          || "",
    description:   existing?.description   || "",
    display_order: existing?.display_order ?? 0,
    is_published:  existing?.is_published  ?? true,
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (form.name.trim().length < 2) return addToast("Numele e prea scurt", "warning");
    setSaving(true);
    try {
      if (isEdit) {
        await axios.put(`${API}/course-categories/${existing.id}?token=${token}`, form);
        addToast("Categorie actualizată", "success");
      } else {
        await axios.post(`${API}/course-categories/?token=${token}`, form);
        addToast("Categorie creată", "success");
      }
      onSaved();
    } catch (e) {
      addToast(e.response?.data?.detail || "Eroare la salvare", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-gray-100 rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95">
        <h2 className="text-2xl font-extrabold text-gray-900 mb-2">
          {isEdit ? "Editează Categoria" : "Categorie Nouă"}
        </h2>
        <p className="text-sm font-medium text-gray-500 mb-6 border-b border-gray-100 pb-4">
          Categoriile grupează cursurile în catalog.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Nume *</label>
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-400 transition-all" placeholder="ex: Tehnic, Business..." />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Descriere</label>
            <textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-400 transition-all resize-none" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Ordine afișare</label>
            <input type="number" min={0} value={form.display_order} onChange={(e) => setForm({ ...form, display_order: parseInt(e.target.value) || 0 })} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-400 transition-all text-center" />
          </div>
          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
            <input type="checkbox" id="cat_pub_st" checked={form.is_published} onChange={(e) => setForm({ ...form, is_published: e.target.checked })} className="w-5 h-5 accent-cyan-500" />
            <label htmlFor="cat_pub_st" className="text-sm font-bold text-gray-900 cursor-pointer">Categorie activă</label>
          </div>
        </div>

        <div className="flex gap-4 mt-8">
          <button onClick={handleSubmit} disabled={saving} className="flex-1 py-3.5 rounded-xl bg-gray-900 hover:bg-gray-800 disabled:bg-gray-400 text-white text-sm font-extrabold transition-all shadow-md">
            {saving ? "Se salvează..." : isEdit ? "Salvează" : "Crează"}
          </button>
          <button onClick={onClose} disabled={saving} className="flex-1 py-3.5 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-extrabold transition-all">
            Anulează
          </button>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
//  TAB: Departamente
// ──────────────────────────────────────────────────────────────
function DepartmentsTab() {
  const { token } = useAuth();
  const { addToast } = useToast();

  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [saving, setSaving]   = useState(false);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API}/departments/?token=${token}`);
      setItems(res.data);
    } catch {
      addToast("Eroare la încărcare", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (newName.trim().length < 2) return addToast("Nume prea scurt", "warning");
    setSaving(true);
    try {
      await axios.post(`${API}/departments/?token=${token}`, { name: newName.trim() });
      addToast("Departament creat", "success");
      setNewName("");
      setShowModal(false);
      fetchAll();
    } catch (e) {
      addToast(e.response?.data?.detail || "Eroare la creare", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (d) => {
    if (!window.confirm(`Sigur ștergi departamentul "${d.name}"?`)) return;
    try {
      await axios.delete(`${API}/departments/${d.id}?token=${token}`);
      addToast("Departament șters", "success");
      fetchAll();
    } catch (e) {
      addToast(e.response?.data?.detail || "Eroare la ștergere (verifică dependențe)", "error");
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-extrabold text-gray-900">Departamente</h2>
          <p className="text-sm text-gray-500 font-medium mt-1">
            Departamentele grupează utilizatorii și permit asignarea cursurilor pe grupe.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-5 py-3 bg-gray-900 hover:bg-gray-800 text-white font-extrabold rounded-xl shadow-md shadow-gray-900/10 text-sm flex items-center gap-2"
        >
          <span className="text-lg">+</span> Departament Nou
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Se încarcă...</div>
      ) : items.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-3xl p-16 text-center shadow-sm">
          <div className="text-5xl mb-4 opacity-50">🏢</div>
          <p className="text-gray-900 font-bold text-lg mb-2">Niciun departament</p>
          <p className="text-gray-500 text-sm">Adaugă primul departament pentru a începe.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map((d) => (
            <div key={d.id} className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all group">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 flex items-center justify-center text-xl mb-4">🏢</div>
              <h3 className="text-lg font-extrabold text-gray-900 mb-1">{d.name}</h3>
              <p className="text-xs text-gray-400 font-medium">ID: {d.id}</p>
              <div className="flex justify-end mt-4 pt-4 border-t border-gray-50">
                <button onClick={() => handleDelete(d)} className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-bold transition opacity-0 group-hover:opacity-100">
                  Șterge
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-gray-100 rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95">
            <h2 className="text-2xl font-extrabold text-gray-900 mb-2">Departament Nou</h2>
            <p className="text-sm font-medium text-gray-500 mb-6 border-b border-gray-100 pb-4">
              Adaugă un departament pentru a organiza utilizatorii.
            </p>

            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Nume *</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-400 transition-all"
              placeholder="ex: IT, Marketing, HR..."
              autoFocus
            />

            <div className="flex gap-4 mt-8">
              <button onClick={handleCreate} disabled={saving} className="flex-1 py-3.5 rounded-xl bg-gray-900 hover:bg-gray-800 disabled:bg-gray-400 text-white text-sm font-extrabold transition-all shadow-md">
                {saving ? "Se salvează..." : "Crează"}
              </button>
              <button onClick={() => { setShowModal(false); setNewName(""); }} disabled={saving} className="flex-1 py-3.5 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-extrabold transition-all">
                Anulează
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
//  TAB: Securitate
// ──────────────────────────────────────────────────────────────
function SecurityTab() {
  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 max-w-2xl">
      <h2 className="text-xl font-extrabold text-gray-900 mb-6 border-b border-gray-50 pb-4">🔒 Securitate</h2>
      <div className="space-y-3">
        {[
          { t: "2FA",             s: "Necesită 2FA pentru admini" },
          { t: "HTTPS Strict",    s: "Forțează conexiuni securizate" },
          { t: "Rate Limiting",   s: "Limitează requesturile API" }
        ].map((item, i) => (
          <div key={i} className="flex items-center justify-between p-4 bg-gray-50 border border-gray-100 rounded-2xl">
            <div>
              <p className="font-extrabold text-gray-900 text-sm">{item.t}</p>
              <p className="text-xs font-medium text-gray-500 mt-0.5">{item.s}</p>
            </div>
            <input type="checkbox" defaultChecked className="w-5 h-5 accent-cyan-500" />
          </div>
        ))}
        <button className="w-full mt-4 bg-white border border-red-200 text-red-600 hover:bg-red-50 font-extrabold py-3.5 rounded-xl transition-all">
          🔄 Resetează Sesiuni Active
        </button>
      </div>
    </div>
  );
}