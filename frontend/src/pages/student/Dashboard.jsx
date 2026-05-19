import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";

export default function StudentDashboard() {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [chatMessage, setChatMessage] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [enrollSuccess, setEnrollSuccess] = useState("");

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [coursesRes, enrollRes] = await Promise.all([
        axios.get(`http://127.0.0.1:8000/courses/?token=${token}`),
        axios.get(`http://127.0.0.1:8000/progress/my-courses?token=${token}`),
      ]);
      setCourses(coursesRes.data);
      setEnrollments(enrollRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  const getEnrollment = (courseId) => enrollments.find((e) => e.course_id === courseId);

  const handleEnroll = async (courseId) => {
    try {
      await axios.post(`http://127.0.0.1:8000/progress/enroll/${courseId}?token=${token}`);
      setEnrollSuccess("Te-ai înscris cu succes!");
      fetchData();
      setTimeout(() => setEnrollSuccess(""), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateProgress = async (courseId, percent) => {
    await axios.put(
      `http://127.0.0.1:8000/progress/update/${courseId}?token=${token}`,
      { progress_percent: percent }
    );
    fetchData();
  };

  const handleChat = async (e) => {
    e.preventDefault();
    if (!chatMessage.trim() || !selectedCourse) return;
    const userMsg = chatMessage;
    setChatHistory(prev => [...prev, { role: "user", text: userMsg }]);
    setChatMessage("");
    setChatLoading(true);
    try {
      const res = await axios.post(
        `http://127.0.0.1:8000/ai/chat?token=${token}`,
        { message: userMsg, course_id: selectedCourse.id }
      );
      setChatHistory(prev => [...prev, { role: "ai", text: res.data.response }]);
    } catch (err) {
      setChatHistory(prev => [...prev, { role: "ai", text: "Eroare la conectarea cu AI." }]);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-indigo-900 text-white px-6 py-4 flex justify-between items-center shadow">
        <h1 className="text-xl font-bold">AI eLearning</h1>
        <div className="flex items-center gap-4">
          <span className="text-indigo-200 text-sm">Bun venit, {user?.full_name}</span>
          <button onClick={() => { logout(); navigate("/login"); }} className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded-lg text-sm">Deconectare</button>
        </div>
      </nav>

      <div className="p-6 max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cursuri */}
        <div>
          <h2 className="text-xl font-bold text-gray-800 mb-4">Cursurile mele</h2>
          {enrollSuccess && <div className="bg-green-50 text-green-600 px-4 py-3 rounded-lg text-sm mb-4">{enrollSuccess}</div>}

          {courses.length === 0 ? (
            <div className="bg-white rounded-xl shadow p-8 text-center text-gray-500">Nu ai cursuri disponibile.</div>
          ) : (
            <div className="space-y-4">
              {courses.map((course) => {
                const enrollment = getEnrollment(course.id);
                return (
                  <div
                    key={course.id}
                    className={`bg-white rounded-xl shadow p-5 cursor-pointer border-2 transition ${selectedCourse?.id === course.id ? "border-indigo-500" : "border-transparent hover:border-indigo-200"}`}
                    onClick={() => { setSelectedCourse(course); setChatHistory([]); }}
                  >
                    <h3 className="text-lg font-bold text-gray-800">{course.title}</h3>
                    <p className="text-gray-500 text-sm mt-1 mb-3">{course.description || "Fără descriere"}</p>

                    {enrollment ? (
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-600">Progres</span>
                          <span className="font-medium text-indigo-600">{enrollment.progress_percent}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                          <div className="bg-indigo-500 h-2 rounded-full transition-all" style={{ width: `${enrollment.progress_percent}%` }} />
                        </div>
                        <div className="flex gap-2 flex-wrap mb-2">
                          {[25, 50, 75, 100].map((p) => (
                            <button
                              key={p}
                              onClick={(e) => { e.stopPropagation(); handleUpdateProgress(course.id, p); }}
                              className="text-xs bg-indigo-100 hover:bg-indigo-200 text-indigo-700 px-3 py-1 rounded-full transition"
                            >
                              {p}%
                            </button>
                          ))}
                        </div>
                        {enrollment.completed && (
                          <span className="mb-2 inline-block bg-green-100 text-green-700 text-xs px-3 py-1 rounded-full">✓ Finalizat</span>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); navigate(`/quiz/${course.id}`); }}
                          className="mt-2 w-full bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium py-2 rounded-lg transition"
                        >
                          🤖 Generează Quiz
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleEnroll(course.id); }}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-lg transition"
                      >
                        Înscrie-te
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* AI Tutor */}
        <div>
          <h2 className="text-xl font-bold text-gray-800 mb-4">Tutor AI</h2>
          {!selectedCourse ? (
            <div className="bg-white rounded-xl shadow p-8 text-center text-gray-500">
              Selectează un curs din stânga pentru a vorbi cu tutorul AI.
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow flex flex-col" style={{ height: "500px" }}>
              <div className="px-5 py-4 border-b border-gray-100">
                <p className="font-semibold text-gray-800">Tutor: {selectedCourse.title}</p>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {chatHistory.length === 0 && (
                  <p className="text-gray-400 text-sm text-center mt-8">Pune o întrebare despre curs!</p>
                )}
                {chatHistory.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-xs lg:max-w-sm px-4 py-2 rounded-2xl text-sm ${msg.role === "user" ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-800"}`}>
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
              <form onSubmit={handleChat} className="p-4 border-t border-gray-100 flex gap-2">
                <input
                  type="text"
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  placeholder="Pune o întrebare..."
                  className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm transition">
                  Trimite
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}