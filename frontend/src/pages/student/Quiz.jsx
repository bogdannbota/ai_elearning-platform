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
    } catch { alert("Eroare generare"); }
    finally { setLoading(false); }
  };
  const handleAnswer = (qi, oi) => !submitted && setAnswers({ ...answers, [qi]: oi });
  const handleSubmit = () => {
    let correct = 0;
    quiz.questions.forEach((q, i) => { if (answers[i] === q.correct) correct++; });
    setScore(correct); setSubmitted(true);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-500">Se generează quiz-ul...</div>;

  return (
    <div className="min-h-screen py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="surface p-6 mb-6">
          <span className="eyebrow">Quiz generat de AI</span>
          <h2 className="text-2xl font-extrabold text-slate-900 mt-1">Testează-ți cunoștințele</h2>
        </div>

        {submitted && (
          <div className={`surface p-6 text-center mb-6 ${score >= quiz.questions.length * 0.7 ? "border-emerald-200" : "border-rose-200"}`}>
            <p className="metric text-5xl font-bold text-slate-900">{score}/{quiz.questions.length}</p>
            <button onClick={() => navigate("/dashboard")} className="btn btn-primary mt-4">Închide quiz</button>
          </div>
        )}

        <div className="space-y-5">
          {quiz?.questions?.map((q, qi) => (
            <div key={qi} className="surface p-6">
              <p className="font-semibold text-slate-900 mb-5">{qi + 1}. {q.question}</p>
              <div className="space-y-3">
                {q.options.map((opt, oi) => {
                  let style = { borderColor: "var(--line)" };
                  if (submitted) {
                    if (oi === q.correct) style = { borderColor: "#10b981", background: "rgba(16,185,129,.08)" };
                    else if (answers[qi] === oi) style = { borderColor: "#be123c", background: "rgba(190,18,60,.06)" };
                    else style = { borderColor: "var(--line)", opacity: .5 };
                  } else if (answers[qi] === oi) style = { borderColor: "var(--accent)", background: "rgba(31,95,191,.06)" };
                  return <button key={oi} onClick={() => handleAnswer(qi, oi)} className="w-full text-left px-4 py-3 rounded-xl border font-medium text-sm transition" style={style}>{opt}</button>;
                })}
              </div>
            </div>
          ))}
        </div>

        {!submitted && <button onClick={handleSubmit} className="btn btn-primary w-full mt-8 py-3">Trimite răspunsurile</button>}
      </div>
    </div>
  );
}