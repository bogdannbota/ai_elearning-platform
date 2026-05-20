import { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { PieChart, Pie, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";
import { GridSkeletons } from "../../components/SkeletonLoader";

export default function AdminSettings() {
  const { token } = useAuth();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalCourses: 0,
    totalEnrollments: 0,
    activeDepartments: 0,
  });
  const [chartData, setChartData] = useState([]);
  const [coursesData, setCoursesData] = useState([]);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      // Simulate fetching data
      setStats({
        totalUsers: 156,
        totalCourses: 24,
        totalEnrollments: 542,
        activeDepartments: 8,
      });

      setChartData([
        { name: "Python", value: 120, fill: "#3b82f6" },
        { name: "JavaScript", value: 95, fill: "#8b5cf6" },
        { name: "Web Dev", value: 87, fill: "#10b981" },
        { name: "Data Science", value: 75, fill: "#f59e0b" },
        { name: "DevOps", value: 65, fill: "#ef4444" },
      ]);

      setCoursesData([
        { name: "Ian", enrollments: 42, completed: 18 },
        { name: "Feb", enrollments: 55, completed: 28 },
        { name: "Mar", enrollments: 48, completed: 22 },
        { name: "Apr", enrollments: 78, completed: 45 },
        { name: "Mai", enrollments: 92, completed: 58 },
        { name: "Iun", enrollments: 85, completed: 52 },
      ]);
    } catch (err) {
      console.error(err);
      addToast("Eroare la încărcarea statisticilor", "error");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <GridSkeletons count={6} />;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">⚙️ Setări Admin</h1>
          <p className="text-gray-600">Gestionează și monitorizează platforma eLearning</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {[
            { label: "Utilizatori Totali", value: stats.totalUsers, icon: "👥", color: "blue" },
            { label: "Cursuri", value: stats.totalCourses, icon: "📚", color: "green" },
            { label: "Înscrierii", value: stats.totalEnrollments, icon: "📝", color: "purple" },
            { label: "Departamente", value: stats.activeDepartments, icon: "🏢", color: "orange" },
          ].map((stat, i) => (
            <div key={i} className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-600 text-sm">{stat.label}</h3>
                <span className="text-3xl">{stat.icon}</span>
              </div>
              <p className={`text-4xl font-bold text-${stat.color}-600`}>{stat.value}</p>
              <p className="text-xs text-gray-500 mt-2">Total în sistem</p>
            </div>
          ))}
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Top Courses */}
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">📊 Top Cursuri (Înscriieri)</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Enrollment Trends */}
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">📈 Trend Înscriieri</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={coursesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="enrollments" fill="#3b82f6" name="Înscrierii" />
                <Bar dataKey="completed" fill="#10b981" name="Finalizate" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Settings Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* System Settings */}
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">🔧 Setări Sistem</h2>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Titlu Platformă
                </label>
                <input
                  type="text"
                  defaultValue="AI eLearning Platform"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Admin
                </label>
                <input
                  type="email"
                  defaultValue="admin@elearning.com"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Limba Implicită
                </label>
                <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                  <option>Română</option>
                  <option>Engleză</option>
                  <option>Franceză</option>
                </select>
              </div>
              <button className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition font-semibold">
                💾 Salvează Schimbări
              </button>
            </div>
          </div>

          {/* Security Settings */}
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">🔒 Setări Securitate</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-semibold text-gray-900">Autentificare cu Doi Factori</p>
                  <p className="text-sm text-gray-600">Necesită 2FA pentru conturi admin</p>
                </div>
                <input type="checkbox" className="w-5 h-5" defaultChecked />
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-semibold text-gray-900">Sesiuni HTTPS</p>
                  <p className="text-sm text-gray-600">Forțează conexiunile HTTPS</p>
                </div>
                <input type="checkbox" className="w-5 h-5" defaultChecked />
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-semibold text-gray-900">Rate Limiting</p>
                  <p className="text-sm text-gray-600">Limitează cererile per IP</p>
                </div>
                <input type="checkbox" className="w-5 h-5" defaultChecked />
              </div>
              <button className="w-full bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition font-semibold mt-4">
                🔄 Resetează Sesiuni
              </button>
            </div>
          </div>
        </div>

        {/* Maintenance Section */}
        <div className="mt-8 bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">🛠️ Întreținere</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition text-left">
              <p className="font-semibold text-gray-900">📦 Backup Bază Date</p>
              <p className="text-sm text-gray-600 mt-1">Creează backup complet</p>
            </button>
            <button className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition text-left">
              <p className="font-semibold text-gray-900">🗑️ Curață Cache</p>
              <p className="text-sm text-gray-600 mt-1">Golește memoria cache</p>
            </button>
            <button className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition text-left">
              <p className="font-semibold text-gray-900">📊 Raport Sistem</p>
              <p className="text-sm text-gray-600 mt-1">Generează raport detaliat</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
