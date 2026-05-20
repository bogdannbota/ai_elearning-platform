import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";
import { useToast } from "../../context/ToastContext";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { GridSkeletons } from "../../components/SkeletonLoader";

export default function StudentDashboard() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [courses, setCourses] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [chatMessage, setChatMessage] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all"); // all, enrolled, available
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [coursesRes, enrollRes] = await Promise.all([
        axios.get(`http://127.0.0.1:8000/courses/?token=${token}`),
        axios.get(`http://127.0.0.1:8000/progress/my-courses?token=${token}`),
      ]);
      setCourses(coursesRes.data);
      setEnrollments(enrollRes.data);
      
      // Prepare chart data
      if (enrollRes.data.length > 0) {
        const data = enrollRes.data.slice(0, 5).map((e) => ({
          name: coursesRes.data.find((c) => c.id === e.course_id)?.title || `Curs ${e.course_id}`,
          progress: e.progress_percent,
          completed: e.completed ? 100 : 0,
        }));
        setChartData(data);
      }
    } catch (err) {
      console.error(err);
      addToast("Eroare la încărcarea datelor", "error");
    } finally {
      setLoading(false);
    }
  };

  const getEnrollment = (courseId) => enrollments.find((e) => e.course_id === courseId);

  const handleEnroll = async (courseId) => {
    try {
      await axios.post(`http://127.0.0.1:8000/progress/enroll/${courseId}?token=${token}`);
      addToast("Te-ai înscris cu succes!", "success");
      fetchData();
    } catch (err) {
      console.error(err);
      addToast("Eroare la înscrierea în curs", "error");
    }
  };

  const handleUpdateProgress = async (courseId, percent) => {
    try {
      await axios.put(
        `http://127.0.0.1:8000/progress/update/${courseId}?token=${token}`,
        { progress_percent: percent }
      );
      addToast("Progres actualizat!", "success");
      fetchData();
    } catch (err) {
      addToast("Eroare la actualizarea progresului", "error");
    }
  };

  const handleChat = async (e) => {
    e.preventDefault();
    if (!chatMessage.trim() || !selectedCourse) return;
    const userMsg = chatMessage;
    setChatHistory((prev) => [...prev, { role: "user", text: userMsg }]);
    setChatMessage("");
    setChatLoading(true);
    try {
      const res = await axios.post(
        `http://127.0.0.1:8000/ai/chat?token=${token}`,
        { message: userMsg, course_id: selectedCourse.id }
      );
      setChatHistory((prev) => [...prev, { role: "ai", text: res.data.response }]);
    } catch (err) {
      addToast("Eroare la conectarea cu AI", "error");
      setChatHistory((prev) => [...prev, { role: "ai", text: "Eroare la conectarea cu AI." }]);
    } finally {
      setChatLoading(false);
    }
  };

  // Filtrare și căutare
  const filteredCourses = courses.filter((course) => {
    const enrollment = getEnrollment(course.id);
    const matchesSearch = course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          course.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filterStatus === "enrolled") return enrollment && matchesSearch;
    if (filterStatus === "available") return !enrollment && matchesSearch;
    return matchesSearch;
  });

  const enrolledCount = enrollments.length;
  const avgProgress = enrolledCount > 0 
    ? Math.round(enrollments.reduce((sum, e) => sum + e.progress_percent, 0) / enrolledCount)
    : 0;
  const completedCount = enrollments.filter((e) => e.completed).length;

  if (loading) return <GridSkeletons count={6} />;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Stats Section */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-4xl font-bold mb-2">Bun venit, {user?.full_name || "Utilizator"}! 👋</h1>
          <p className="text-blue-100">Continuă-ți parcursul de învățare</p>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-8">
            <div className="bg-white bg-opacity-10 rounded-lg p-6 backdrop-blur">
              <p className="text-blue-100 text-sm mb-2">Cursuri Înscrise</p>
              <p className="text-4xl font-bold">{enrolledCount}</p>
            </div>
            <div className="bg-white bg-opacity-10 rounded-lg p-6 backdrop-blur">
              <p className="text-blue-100 text-sm mb-2">Finalizate</p>
              <p className="text-4xl font-bold">{completedCount}</p>
            </div>
            <div className="bg-white bg-opacity-10 rounded-lg p-6 backdrop-blur">
              <p className="text-blue-100 text-sm mb-2">Progres Mediu</p>
              <p className="text-4xl font-bold">{avgProgress}%</p>
            </div>
            <div className="bg-white bg-opacity-10 rounded-lg p-6 backdrop-blur">
              <p className="text-blue-100 text-sm mb-2">Cursuri Disponibile</p>
              <p className="text-4xl font-bold">{courses.length - enrolledCount}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Cursuri */}
          <div className="lg:col-span-2">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">📚 Cursurile Mele</h2>
              
              {/* Search și Filter */}
              <div className="space-y-4 mb-6">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="🔍 Caută cursuri..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div className="flex gap-2 flex-wrap">
                  {["all", "enrolled", "available"].map((status) => (
                    <button
                      key={status}
                      onClick={() => setFilterStatus(status)}
                      className={`px-4 py-2 rounded-lg font-semibold transition ${
                        filterStatus === status
                          ? "bg-blue-600 text-white"
                          : "bg-gray-200 text-gray-900 hover:bg-gray-300"
                      }`}
                    >
                      {status === "all" && "Toate"}
                      {status === "enrolled" && "Înscrise"}
                      {status === "available" && "Disponibile"}
                    </button>
                  ))}
                </div>
              </div>

              {filteredCourses.length === 0 ? (
                <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
                  {searchTerm ? "Nu au fost găsite cursuri." : "Nu ai cursuri disponibile."}
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredCourses.map((course) => {
                    const enrollment = getEnrollment(course.id);
                    return (
                      <div
                        key={course.id}
                        className={`bg-white rounded-lg shadow-md hover:shadow-lg transition p-6 cursor-pointer border-l-4 ${
                          selectedCourse?.id === course.id ? "border-blue-600" : "border-transparent"
                        }`}
                        onClick={() => {
                          setSelectedCourse(course);
                          setChatHistory([]);
                        }}
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <h3 className="text-lg font-bold text-gray-900">{course.title}</h3>
                            <p className="text-gray-600 text-sm mt-1">{course.description || "Fără descriere"}</p>
                          </div>
                          {enrollment?.completed && (
                            <span className="ml-4 px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold whitespace-nowrap">
                              ✓ Finalizat
                            </span>
                          )}
                        </div>

                        {enrollment ? (
                          <div>
                            <div className="flex justify-between text-sm mb-2">
                              <span className="text-gray-600">Progres:</span>
                              <span className="font-bold text-blue-600">{enrollment.progress_percent}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                              <div
                                className="bg-blue-600 h-2 rounded-full transition-all"
                                style={{ width: `${enrollment.progress_percent}%` }}
                              />
                            </div>
                            <div className="flex gap-2 flex-wrap mb-3">
                              {[25, 50, 75, 100].map((p) => (
                                <button
                                  key={p}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleUpdateProgress(course.id, p);
                                  }}
                                  className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1 rounded transition"
                                >
                                  {p}%
                                </button>
                              ))}
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/quiz/${course.id}`);
                              }}
                              className="w-full bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold py-2 rounded-lg transition"
                            >
                              ▶️ Continuă Curs
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEnroll(course.id);
                            }}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition"
                          >
                            📝 Înscrie-te
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Progress Chart */}
            {chartData.length > 0 && (
              <div className="bg-white rounded-lg shadow-lg p-6 mt-8">
                <h2 className="text-xl font-bold text-gray-900 mb-4">📊 Progresul Cursurilor</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="progress" fill="#3b82f6" name="Progres %" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* AI Tutor */}
          <div className="lg:col-span-1">
            <h2 className="text-xl font-bold text-gray-900 mb-4">🤖 Tutor AI</h2>
            {!selectedCourse ? (
              <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500 h-96 flex items-center justify-center">
                Selectează un curs din stânga pentru a vorbi cu tutorul AI.
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow flex flex-col h-96">
                <div className="px-5 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg">
                  <p className="font-semibold">{selectedCourse.title}</p>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {chatHistory.length === 0 && (
                    <p className="text-gray-400 text-sm text-center mt-8">Pune o întrebare despre curs!</p>
                  )}
                  {chatHistory.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-xs px-4 py-2 rounded-2xl text-sm ${
                          msg.role === "user"
                            ? "bg-blue-600 text-white rounded-br-none"
                            : "bg-gray-100 text-gray-800 rounded-bl-none"
                        }`}
                      >
                        {msg.text}
                      </div>
                    </div>
                  ))}
                  {chatLoading && (
                    <div className="flex justify-start">
                      <div className="bg-gray-100 px-4 py-2 rounded-2xl text-sm text-gray-500">Se gândește...</div>
                    </div>
                  )}
                </div>
                <form onSubmit={handleChat} className="p-4 border-t border-gray-200 flex gap-2">
                  <input
                    type="text"
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    placeholder="Pune o întrebare..."
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="submit"
                    disabled={chatLoading}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm transition disabled:opacity-50"
                  >
                    ➤
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}