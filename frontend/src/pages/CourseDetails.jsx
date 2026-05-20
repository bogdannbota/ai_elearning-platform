import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { SkeletonLoader } from "../components/SkeletonLoader";

export default function CourseDetails() {
  const { courseId } = useParams();
  const { token } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [course, setCourse] = useState(null);
  const [enrollment, setEnrollment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [materials, setMaterials] = useState([]);
  const [lessons, setLessons] = useState([]);

  useEffect(() => {
    fetchCourseDetails();
  }, [courseId]);

  const fetchCourseDetails = async () => {
    try {
      setLoading(true);
      const res = await axios.get(
        `http://127.0.0.1:8000/courses/${courseId}?token=${token}`
      );
      setCourse(res.data);
      
      // Fetch enrollment status
      try {
        const enrollRes = await axios.get(
          `http://127.0.0.1:8000/progress/my-courses?token=${token}`
        );
        const enrolledCourse = enrollRes.data.find(e => e.course_id === parseInt(courseId));
        setEnrollment(enrolledCourse);
      } catch (err) {
        console.log("Not enrolled yet");
      }
    } catch (err) {
      console.error(err);
      addToast("Eroare la încărcarea cursului", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async () => {
    try {
      await axios.post(
        `http://127.0.0.1:8000/progress/enroll/${courseId}?token=${token}`
      );
      addToast("Te-ai înscris cu succes!", "success");
      fetchCourseDetails();
    } catch (err) {
      addToast("Eroare la înscrierea în curs", "error");
    }
  };

  const handleStartCourse = () => {
    if (course?.has_exam) {
      navigate(`/quiz/${courseId}`);
    } else {
      addToast("Acest curs nu are test disponibil", "info");
    }
  };

  if (loading) return <SkeletonLoader count={3} />;

  if (!course) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500 text-lg">Cursul nu a fost găsit</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Course Header */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => navigate(-1)}
            className="text-blue-100 hover:text-white mb-4 flex items-center gap-2"
          >
            ← Înapoi
          </button>
          <h1 className="text-4xl font-bold mb-4">{course.title}</h1>
          <p className="text-blue-100 text-lg mb-4">{course.description}</p>
          <div className="flex gap-6 flex-wrap">
            <div>
              <p className="text-blue-200 text-sm">Instructor</p>
              <p className="text-lg font-semibold">{course.instructor || "N/A"}</p>
            </div>
            <div>
              <p className="text-blue-200 text-sm">Nivel</p>
              <p className="text-lg font-semibold capitalize">{course.level || "Intermediar"}</p>
            </div>
            <div>
              <p className="text-blue-200 text-sm">Status</p>
              <p className="text-lg font-semibold">
                {enrollment ? (
                  <span className="text-green-300">✓ Înscris</span>
                ) : (
                  <span className="text-yellow-300">⊙ Disponibil</span>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Course Content */}
      <div className="max-w-4xl mx-auto py-12 px-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Overview */}
            <div className="bg-white rounded-lg shadow p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">📋 Descriere Curs</h2>
              <p className="text-gray-600 leading-relaxed">{course.description}</p>
            </div>

            {/* Learning Outcomes */}
            <div className="bg-white rounded-lg shadow p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">🎯 Obiective de Învățare</h2>
              <ul className="space-y-3">
                {[
                  "Să înțelegi conceptele fundamentale",
                  "Să aplici cunoștințele în practică",
                  "Să rezolvi probleme complexe",
                ].map((outcome, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="text-green-600 font-bold mt-1">✓</span>
                    <span className="text-gray-700">{outcome}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Course Content */}
            <div className="bg-white rounded-lg shadow p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">📚 Conținut Curs</h2>
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="border-l-4 border-blue-600 pl-4 py-2">
                    <h3 className="font-semibold text-gray-900">Modul {i}: Introduceție în Temă</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {i === 1 && "Concepte fundamentale și baze teoretice"}
                      {i === 2 && "Aplicații practice și exemple"}
                      {i === 3 && "Proiecte avansate și integrare"}
                    </p>
                    <button className="text-blue-600 text-sm mt-2 hover:text-blue-800">
                      {enrollment ? "Accesează modulul →" : ""}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Progress Card */}
            {enrollment && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">📊 Progresul Tău</h3>
                <div className="relative w-32 h-32 mx-auto mb-4">
                  <svg className="transform -rotate-90 w-32 h-32">
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      fill="none"
                      stroke="#e5e7eb"
                      strokeWidth="8"
                    />
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      fill="none"
                      stroke="#3b82f6"
                      strokeWidth="8"
                      strokeDasharray={`${enrollment.progress_percent * 3.52} 352`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <p className="text-3xl font-bold text-gray-900">
                        {enrollment.progress_percent}%
                      </p>
                      <p className="text-xs text-gray-600">Progres</p>
                    </div>
                  </div>
                </div>
                <div className="text-center">
                  {enrollment.completed ? (
                    <p className="text-green-600 font-semibold">✓ Finalizat</p>
                  ) : (
                    <p className="text-gray-600">În progres...</p>
                  )}
                </div>
              </div>
            )}

            {/* CTA Button */}
            {!enrollment ? (
              <button
                onClick={handleEnroll}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 rounded-lg font-bold hover:from-green-700 hover:to-emerald-700 transition text-lg"
              >
                📝 Înscrie-te Acum
              </button>
            ) : (
              <>
                <button
                  onClick={handleStartCourse}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-lg font-bold hover:from-blue-700 hover:to-indigo-700 transition text-lg"
                >
                  ▶️ Continuă Curs
                </button>
              </>
            )}

            {/* Course Info */}
            <div className="bg-white rounded-lg shadow p-6 space-y-4">
              <div>
                <p className="text-sm text-gray-600">Duration</p>
                <p className="font-semibold text-gray-900">4-6 săptămâni</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Efort zilnic</p>
                <p className="font-semibold text-gray-900">2-3 ore</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Certificat</p>
                <p className="font-semibold text-gray-900">Da</p>
              </div>
              {enrollment && (
                <div>
                  <p className="text-sm text-gray-600">Data Înscrierii</p>
                  <p className="font-semibold text-gray-900">
                    {new Date(enrollment.enrollment_date).toLocaleDateString("ro-RO")}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
