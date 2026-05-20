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

  useEffect(() => { generateQuiz(); }, []);

  const generateQuiz = async () => {
    setLoading(true);
    try {
      const res = await axios.post(`http://127.0.0.1:8000/ai/generate-quiz?token=${token}`, { course_id: parseInt(courseId), num_questions: 5 });
      setQuiz(res.data);
    } catch { alert("Eroare generare"); } finally { setLoading(false); }
  };

  const handleAnswer = (qi, oi) => !submitted && setAnswers({ ...answers, [qi]: oi });

  const handleSubmit = () => {
    let correct = 0;
    quiz.questions.forEach((q, i) => { if (answers[i] === q.correct) correct++; });
    setScore(correct);
    setSubmitted(true);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center font-bold">Se generează quiz-ul AI...</div>;

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white border border-gray-100 rounded-3xl p-8 shadow-sm mb-6">
          <h2 className="text-2xl font-black text-gray-900">Quiz Generat de AI 🤖</h2>
          <p className="text-gray-500 mt-1">Alege varianta corectă pentru a-ți testa cunoștințele.</p>
        </div>

        {submitted && (
          <div className={`p-6 rounded-3xl text-center mb-6 border ${score >= quiz.questions.length * 0.7 ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
             <p className="text-5xl font-black text-gray-900">{score}/{quiz.questions.length}</p>
             <button onClick={() => navigate("/dashboard")} className="mt-4 bg-gray-900 text-white px-6 py-2.5 rounded-xl font-bold">Închide Quiz</button>
          </div>
        )}

        <div className="space-y-6">
          {quiz?.questions?.map((q, qi) => (
            <div key={qi} className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">
              <p className="font-bold text-gray-900 mb-5">{qi + 1}. {q.question}</p>
              <div className="space-y-3">
                {q.options.map((opt, oi) => {
                  let style = "border border-gray-200 hover:border-cyan-400 bg-gray-50";
                  if (submitted) {
                    if (oi === q.correct) style = "border-2 border-emerald-500 bg-emerald-50";
                    else if (answers[qi] === oi) style = "border-2 border-red-400 bg-red-50";
                    else style = "opacity-50 border border-gray-100";
                  } else if (answers[qi] === oi) style = "border-2 border-cyan-500 bg-cyan-50";
                  
                  return (
                    <button key={oi} onClick={() => handleAnswer(qi, oi)} className={`w-full text-left px-4 py-3 rounded-xl font-medium text-sm transition ${style}`}>
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {!submitted && (
          <button onClick={handleSubmit} className="w-full mt-8 bg-cyan-500 text-white font-bold py-4 rounded-xl shadow-lg">Trimite Răspunsurile</button>
        )}
      </div>
    </div>
  );
}