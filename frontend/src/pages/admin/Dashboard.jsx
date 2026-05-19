import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";

export default function AdminDashboard() {
  const { token, logout } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ users: 0, departments: 0, courses: 0, enrollments: 0 });
  const [users, setUsers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, []);

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
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getCompletionRate = () => {
    if (enrollments.length === 0) return 0;
    const completed = enrollments.filter(e => e.completed).length;
    return Math.round((completed / enrollments.length) * 100);
  };

  const getUserProgress = (userId) => {
    const userEnrollments = enrollments.filter(e => e.user_id === userId);
    if (userEnrollments.length === 0) return null;
    const avg = userEnrollments.reduce((sum, e) => sum + e.progress_percent, 0) / userEnrollments.length;
    return Math.round(avg);
  };

  const getCourseStats = (courseId) => {
    const courseEnrollments = enrollments.filter(e => e.course_id === courseId);
    const completed = courseEnrollments.filter(e => e.completed).length;
    return { total: courseEnrollments.length, completed };
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <p className="text-gray-500 text-lg">Se încarcă...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-blue-900 text-white px-6 py-4 flex justify-between items-center shadow">
        <h1 className="text-xl font-bold">AI eLearning — Admin</h1>
        <div className="flex gap-4 items-center">
          <button onClick={() => navigate("/admin/dashboard")} className="text-white font-semibold text-sm">Dashboard</button>
          <button onClick={() => navigate("/admin/useri")} className="text-blue-200 hover:text-white text-sm">Useri</button>
          <button onClick={() => navigate("/admin/cursuri")} className="text-blue-200 hover:text-white text-sm">Cursuri</button>
          <button onClick={() => { logout(); navigate("/login"); }} className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded-lg text-sm">Deconectare</button>
        </div>
      </nav>

      <div className="p-6 max-w-7xl mx-auto">

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Total Useri", value: stats.users, color: "bg-blue-500", icon: "👥" },
            { label: "Departamente", value: stats.departments, color: "bg-purple-500", icon: "🏢" },
            { label: "Cursuri", value: stats.courses, color: "bg-green-500", icon: "📚" },
            { label: "Rată Finalizare", value: `${getCompletionRate()}%`, color: "bg-orange-500", icon: "🎯" },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl shadow p-5 flex items-center gap-4">
              <div className={`${s.color} text-white text-2xl w-12 h-12 rounded-lg flex items-center justify-center`}>{s.icon}</div>
              <div>
                <p className="text-gray-500 text-xs">{s.label}</p>
                <p className="text-2xl font-bold text-gray-800">{s.value}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">

          {/* Progres per User */}
          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">📊 Progres Useri</h2>
            {users.filter(u => u.role === "student").length === 0 ? (
              <p className="text-gray-400 text-sm">Nu există studenți înregistrați.</p>
            ) : (
              <div className="space-y-3">
                {users.filter(u => u.role === "student").map((u) => {
                  const progress = getUserProgress(u.id);
                  const dept = departments.find(d => d.id === u.department_id)?.name || "—";
                  return (
                    <div key={u.id} className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                        {u.full_name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-medium text-gray-700 truncate">{u.full_name}</span>
                          <span className="text-xs text-gray-400 ml-2">{dept}</span>
                        </div>
                        {progress !== null ? (
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${progress === 100 ? "bg-green-500" : "bg-blue-500"}`}
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                            <span className="text-xs font-medium text-gray-600 w-8">{progress}%</span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">Nicio înscriere</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Statistici Cursuri */}
          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">📚 Statistici Cursuri</h2>
            {courses.length === 0 ? (
              <p className="text-gray-400 text-sm">Nu există cursuri.</p>
            ) : (
              <div className="space-y-4">
                {courses.map((c) => {
                  const { total, completed } = getCourseStats(c.id);
                  const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
                  return (
                    <div key={c.id}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium text-gray-700">{c.title}</span>
                        <span className="text-xs text-gray-400">{completed}/{total} finalizați</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${rate === 100 ? "bg-green-500" : "bg-purple-500"}`}
                            style={{ width: `${rate}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-gray-600 w-8">{rate}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Tabel Enrollments */}
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">📋 Toate Înscrierile</h2>
          {enrollments.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-4">Nu există înscrieri.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-600">
                  <th className="text-left px-4 py-3">Student</th>
                  <th className="text-left px-4 py-3">Curs</th>
                  <th className="text-left px-4 py-3">Progres</th>
                  <th className="text-left px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {enrollments.map((e) => {
                  const user = users.find(u => u.id === e.user_id);
                  const course = courses.find(c => c.id === e.course_id);
                  return (
                    <tr key={e.id} className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{user?.full_name || "—"}</td>
                      <td className="px-4 py-3 text-gray-500">{course?.title || "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${e.progress_percent === 100 ? "bg-green-500" : "bg-blue-500"}`}
                              style={{ width: `${e.progress_percent}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-600">{e.progress_percent}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${e.completed ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                          {e.completed ? "✅ Finalizat" : "⏳ În progres"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}