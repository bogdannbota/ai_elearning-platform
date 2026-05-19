import { useAuth } from "../../context/AuthContext";
import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";

export default function Quiz() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const { courseId } = useParams();
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => { generateQuiz(); }, []);

  const generateQuiz = async () => {
    setLoading(true);
    try {
      const res = await axios.post(
        `http://127.0.0.1:8000/ai/generate-quiz?token=${token}`,
        { course_id: parseInt(courseId), num_questions: 5 },
        { headers: { "Content-Type": "application/json" } }
      );
      setQuiz(res.data);
    } catch (err) {
      setError("Eroare la generarea quiz-ului: " + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (questionIndex, optionIndex) => {
    if (submitted) return;
    setAnswers({ ...answers, [questionIndex]: optionIndex });
  };

  const handleSubmit = () => {
    if (!quiz) return;
    let correct = 0;
    quiz.questions.forEach((q, i) => {
      if (answers[i] === q.correct) correct++;
    });
    setScore(correct);
    setSubmitted(true);
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="text-center">
        <p className="text-gray-500 text-lg mb-2">Se generează quiz-ul...</p>
        <p className="text-gray-400 text-sm">AI-ul pregătește întrebările 🤖</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow p-8 text-center max-w-md">
        <p className="text-red-500 mb-4">{error}</p>
        <button onClick={() => navigate("/dashboard")} className="bg-blue-600 text-white px-6 py-2 rounded-lg">
          Înapoi la Dashboard
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-blue-900 text-white px-6 py-4 flex justify-between items-center shadow">
        <h1 className="text-xl font-bold">AI eLearning</h1>
        <button onClick={() => navigate("/dashboard")} className="text-blue-200 hover:text-white text-sm">
          ← Înapoi la Dashboard
        </button>
      </nav>

      <div className="p-6 max-w-3xl mx-auto">
        <div className="bg-white rounded-xl shadow p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-1">Quiz generat de AI 🤖</h2>
          <p className="text-gray-500 text-sm">{quiz?.questions?.length} întrebări • Selectează răspunsul corect</p>
        </div>

        {submitted && (
          <div className={`rounded-xl shadow p-6 mb-6 text-center ${score >= quiz.questions.length * 0.7 ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
            <p className="text-4xl font-bold mb-2">{score}/{quiz.questions.length}</p>
            <p className="text-lg font-medium">
              {score >= quiz.questions.length * 0.7 ? "🎉 Felicitări! Ai trecut quiz-ul!" : "😔 Mai studiază puțin și încearcă din nou!"}
            </p>
            <div className="flex gap-3 justify-center mt-4">
              <button onClick={generateQuiz} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg text-sm font-medium">
                Quiz nou
              </button>
              <button onClick={() => navigate("/dashboard")} className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-6 py-2 rounded-lg text-sm font-medium">
                Dashboard
              </button>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {quiz?.questions?.map((q, qi) => (
            <div key={qi} className="bg-white rounded-xl shadow p-6">
              <p className="font-semibold text-gray-800 mb-4">
                <span className="text-blue-600 mr-2">{qi + 1}.</span>{q.question}
              </p>
              <div className="space-y-2">
                {q.options.map((opt, oi) => {
                  let style = "border border-gray-200 hover:border-blue-400 hover:bg-blue-50 cursor-pointer";
                  if (submitted) {
                    if (oi === q.correct) style = "border-2 border-green-500 bg-green-50";
                    else if (answers[qi] === oi) style = "border-2 border-red-400 bg-red-50";
                    else style = "border border-gray-200 opacity-50";
                  } else if (answers[qi] === oi) {
                    style = "border-2 border-blue-500 bg-blue-50";
                  }
                  return (
                    <div
                      key={oi}
                      onClick={() => handleAnswer(qi, oi)}
                      className={`px-4 py-3 rounded-lg text-sm transition ${style}`}
                    >
                      <span className="font-medium text-gray-500 mr-2">{["A", "B", "C", "D"][oi]}.</span>
                      {opt}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {!submitted && quiz && (
          <div className="mt-6 text-center">
            <button
              onClick={handleSubmit}
              disabled={Object.keys(answers).length < quiz.questions.length}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Trimite Răspunsurile ({Object.keys(answers).length}/{quiz?.questions?.length})
            </button>
          </div>
        )}
      </div>
    </div>
  );
}