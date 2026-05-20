import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";
import { useToast } from "../../context/ToastContext";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { GridSkeletons } from "../../components/SkeletonLoader";

export default function AdminDashboard() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [stats, setStats] = useState({ users: 0, departments: 0, courses: 0, enrollments: 0 });
  const [users, setUsers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDept, setFilterDept] = useState("all");
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [u, c, e, d] = await Promise.all([
        axios.get(`http://127.0.0.1:8000/users/?token=${token}`),
        axios.get(`http://127.0.0.1:8000/courses/?token=${token}`),
        axios.get(`http://127.0.0.1:8000/progress/admin/all?token=${token}`),
        axios.get(`http://127.0.0.1:8000/departments/?token=${token}`),
      ]);
      setUsers(u.data);
      setCourses(c.data);
      setEnrollments(e.data);
      setDepartments(d.data);
      setStats({
        users: u.data.length,
        departments: d.data.length,
        courses: c.data.length,
        enrollments: e.data.length,
      });

      // Prepare chart data
      const chartData = c.data.slice(0, 6).map((course) => {
        const courseEnrollments = e.data.filter((en) => en.course_id === course.id);
        const completed = courseEnrollments.filter((en) => en.completed).length;
        return {
          name: course.title,
          total: courseEnrollments.length,
          completed: completed,
        };
      });
      setChartData(chartData);
    } catch (err) {
      console.error(err);
      addToast("Eroare la încărcarea datelor", "error");
    } finally {
      setLoading(false);
    }
  };

  const getCompletionRate = () => {
    if (enrollments.length === 0) return 0;
    const completed = enrollments.filter((e) => e.completed).length;
    return Math.round((completed / enrollments.length) * 100);
  };

  const getUserProgress = (userId) => {
    const userEnrollments = enrollments.filter((e) => e.user_id === userId);
    if (userEnrollments.length === 0) return null;
    const avg =
      userEnrollments.reduce((sum, e) => sum + e.progress_percent, 0) /
      userEnrollments.length;
    return Math.round(avg);
  };

  const getCourseStats = (courseId) => {
    const courseEnrollments = enrollments.filter((e) => e.course_id === courseId);
    const completed = courseEnrollments.filter((e) => e.completed).length;
    return { total: courseEnrollments.length, completed };
  };

  // Filtrare studenți
  const filteredStudents = users
    .filter((u) => u.role === "student")
    .filter((u) => {
      const matchesSearch =
        u.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase());
      if (filterDept === "all") return matchesSearch;
      return u.department_id?.toString() === filterDept && matchesSearch;
    });

  const activeStudents = users.filter(
    (u) => u.role === "student" && getUserProgress(u.id) !== null
  ).length;

  if (loading) return <GridSkeletons count={6} />;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-bold mb-2">📊 Dashboard Admin</h1>
          <p className="text-blue-100">Monitorizează activitatea platformei</p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
            {[
              {
                label: "Total Useri",
                value: stats.users,
                icon: "👥",
                change: "+12%",
              },
              {
                label: "Departamente",
                value: stats.departments,
                icon: "🏢",
                change: "N/A",
              },
              {
                label: "Cursuri",
                value: stats.courses,
                icon: "📚",
                change: "+3",
              },
              {
                label: "Rată Finalizare",
                value: `${getCompletionRate()}%`,
                icon: "🎯",
                change: "+5%",
              },
            ].map((s) => (
              <div
                key={s.label}
                className="bg-white bg-opacity-10 rounded-lg p-6 backdrop-blur"
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-blue-100 text-sm">{s.label}</p>
                  <span className="text-3xl">{s.icon}</span>
                </div>
                <p className="text-4xl font-bold">{s.value}</p>
                <p className="text-blue-200 text-xs mt-2">{s.change}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="p-6 max-w-7xl mx-auto">
        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Enrollment per Course */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">📈 Înscrierii pe Curs</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="total" fill="#3b82f6" name="Total" />
                <Bar dataKey="completed" fill="#10b981" name="Finalizate" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Active Users */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">📊 Statistici Utilizatori</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600">Utilizatori Activi</p>
                  <p className="text-2xl font-bold text-blue-600">{activeStudents}</p>
                </div>
                <span className="text-4xl">📌</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600">Cursuri Finalizate</p>
                  <p className="text-2xl font-bold text-green-600">
                    {enrollments.filter((e) => e.completed).length}
                  </p>
                </div>
                <span className="text-4xl">✅</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600">Progres Mediu</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {enrollments.length > 0
                      ? Math.round(
                          enrollments.reduce((s, e) => s + e.progress_percent, 0) /
                            enrollments.length
                        )
                      : 0}
                    %
                  </p>
                </div>
                <span className="text-4xl">📊</span>
              </div>
            </div>
          </div>
        </div>

        {/* Progres per User */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-12">
          <h2 className="text-xl font-bold text-gray-900 mb-6">👥 Progres Studenți</h2>

          {/* Search și Filter */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <input
              type="text"
              placeholder="🔍 Caută student..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={filterDept}
              onChange={(e) => setFilterDept(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Toate Departamentele</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            <div className="text-sm text-gray-600 flex items-center">
              {filteredStudents.length} studenți
            </div>
          </div>

          {filteredStudents.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">
              {searchTerm || filterDept !== "all"
                ? "Nu au fost găsiți studenți."
                : "Nu există studenți înregistrați."}
            </p>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {filteredStudents.map((u) => {
                const progress = getUserProgress(u.id);
                const dept =
                  departments.find((d) => d.id === u.department_id)?.name || "—";
                return (
                  <div
                    key={u.id}
                    className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                  >
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-full flex items-center justify-center font-bold shrink-0">
                      {u.full_name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate">
                        {u.full_name}
                      </p>
                      <p className="text-xs text-gray-600">{dept}</p>
                    </div>
                    {progress !== null ? (
                      <div className="flex items-center gap-3">
                        <div className="w-32 bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              progress === 100 ? "bg-green-500" : "bg-blue-500"
                            }`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <span className="text-sm font-semibold text-gray-700 w-12 text-right">
                          {progress}%
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400 w-32 text-right">
                        Fără progres
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Tabel Înscrierii */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="px-6 py-4 bg-gradient-to-r from-blue-900 to-indigo-900 text-white">
            <h2 className="text-xl font-bold">📋 Toate Înscrierile</h2>
          </div>

          {enrollments.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">Nu există înscrieri.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-6 py-3 font-semibold text-gray-900">
                      Student
                    </th>
                    <th className="text-left px-6 py-3 font-semibold text-gray-900">
                      Curs
                    </th>
                    <th className="text-center px-6 py-3 font-semibold text-gray-900">
                      Progres
                    </th>
                    <th className="text-center px-6 py-3 font-semibold text-gray-900">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {enrollments.slice(0, 10).map((e) => {
                    const user = users.find((u) => u.id === e.user_id);
                    const course = courses.find((c) => c.id === e.course_id);
                    return (
                      <tr
                        key={e.id}
                        className="border-b border-gray-200 hover:bg-gray-50"
                      >
                        <td className="px-6 py-3 font-medium text-gray-900">
                          {user?.full_name || "—"}
                        </td>
                        <td className="px-6 py-3 text-gray-600">
                          {course?.title || "—"}
                        </td>
                        <td className="px-6 py-3">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-24 bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${
                                  e.progress_percent === 100
                                    ? "bg-green-500"
                                    : "bg-blue-500"
                                }`}
                                style={{ width: `${e.progress_percent}%` }}
                              />
                            </div>
                            <span className="text-xs font-semibold text-gray-700 w-10 text-right">
                              {e.progress_percent}%
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-3 text-center">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              e.completed
                                ? "bg-green-100 text-green-800"
                                : "bg-yellow-100 text-yellow-800"
                            }`}
                          >
                            {e.completed ? "✓ Finalizat" : "⏳ În Progres"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 text-sm text-gray-600">
            Afișare 1-10 din {enrollments.length} înscrierii
          </div>
        </div>
      </div>
    </div>
  );
}