import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { PieChart, Pie, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";
import { GridSkeletons } from "../../components/SkeletonLoader";

export default function AdminSettings() {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalUsers: 0, totalCourses: 0, totalEnrollments: 0, activeDepartments: 0 });
  const [chartData, setChartData] = useState([]);
  const [coursesData, setCoursesData] = useState([]);

  useEffect(() => { fetchStats(); }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setStats({ totalUsers: 156, totalCourses: 24, totalEnrollments: 542, activeDepartments: 8 });
      setChartData([{ name: "Python", value: 120, fill: "#06b6d4" }, { name: "JavaScript", value: 95, fill: "#8b5cf6" }, { name: "Web Dev", value: 87, fill: "#10b981" }, { name: "Data Science", value: 75, fill: "#f59e0b" }, { name: "DevOps", value: 65, fill: "#ef4444" }]);
      setCoursesData([{ name: "Ian", enrollments: 42, completed: 18 }, { name: "Feb", enrollments: 55, completed: 28 }, { name: "Mar", enrollments: 48, completed: 22 }, { name: "Apr", enrollments: 78, completed: 45 }, { name: "Mai", enrollments: 92, completed: 58 }, { name: "Iun", enrollments: 85, completed: 52 }]);
    } catch { addToast("Eroare", "error"); } finally { setLoading(false); }
  };

  if (loading) return <div className="min-h-screen bg-gray-50 pt-12 max-w-7xl mx-auto"><GridSkeletons count={6} /></div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-12 animate-in fade-in duration-500">
      <div className="bg-white border-b border-gray-100 px-6 py-10 relative overflow-hidden mb-8">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-50/50 via-white to-amber-50/30 pointer-events-none" />
        <div className="max-w-7xl mx-auto relative z-10">
          <p className="text-xs font-bold text-cyan-600 uppercase tracking-widest mb-1">Configurări Platformă</p>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Setări Sistem</h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 space-y-8">
        
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[{ label: "Utilizatori", value: stats.totalUsers, icon: "👥", color: "text-blue-600" }, { label: "Cursuri", value: stats.totalCourses, icon: "📚", color: "text-green-600" }, { label: "Înscrieri", value: stats.totalEnrollments, icon: "📝", color: "text-purple-600" }, { label: "Departamente", value: stats.activeDepartments, icon: "🏢", color: "text-amber-600" }].map((stat, i) => (
            <div key={i} className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 flex flex-col justify-between">
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
            <h2 className="text-xl font-extrabold text-gray-900 mb-6">📊 Top Cursuri (Înscrieri)</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={chartData} cx="50%" cy="50%" labelLine={false} label={({ name, value }) => `${name}: ${value}`} outerRadius={90} dataKey="value">
                  {chartData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
              </PieChart>
            </ResponsiveContainer>
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
                <Bar dataKey="completed" fill="#10b981" name="Finalizate" radius={[4, 4, 0, 0]} maxBarSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Setari Formulari */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8">
            <h2 className="text-xl font-extrabold text-gray-900 mb-6 border-b border-gray-50 pb-4">🔧 Profil Platformă</h2>
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 ml-1">Titlu Platformă</label>
                <input type="text" defaultValue="AI eLearning Platform" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-sm text-gray-900 focus:outline-none focus:border-cyan-400 transition-all" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 ml-1">Email Admin</label>
                <input type="email" defaultValue="admin@elearning.com" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-sm text-gray-900 focus:outline-none focus:border-cyan-400 transition-all" />
              </div>
              <button className="w-full mt-4 bg-gray-900 text-white font-extrabold py-3.5 rounded-xl hover:bg-gray-800 transition-all shadow-md shadow-gray-900/10">💾 Salvează Profilul</button>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8">
            <h2 className="text-xl font-extrabold text-gray-900 mb-6 border-b border-gray-50 pb-4">🔒 Securitate</h2>
            <div className="space-y-3">
              {[ { t: "2FA", s: "Necesită 2FA pentru admini" }, { t: "HTTPS Strict", s: "Forțează conexiuni securizate" }, { t: "Rate Limiting", s: "Limitează requesturile API" } ].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-gray-50 border border-gray-100 rounded-2xl">
                  <div>
                    <p className="font-extrabold text-gray-900 text-sm">{item.t}</p>
                    <p className="text-xs font-medium text-gray-500 mt-0.5">{item.s}</p>
                  </div>
                  <input type="checkbox" defaultChecked className="w-5 h-5 accent-cyan-500" />
                </div>
              ))}
              <button className="w-full mt-4 bg-white border border-red-200 text-red-600 hover:bg-red-50 font-extrabold py-3.5 rounded-xl transition-all">🔄 Resetează Sesiuni Active</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}