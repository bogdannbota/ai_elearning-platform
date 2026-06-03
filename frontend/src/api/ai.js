import { api } from "./client";

// Endpoint-urile de mai jos cer token-ul ca query param (token: str în backend).
// /ai/chat (asistentul de navigare) NU e aici — el merge pe header, din AiAssistant.jsx.
const withToken = (url) => {
  const token = sessionStorage.getItem("token");
  return token ? `${url}${url.includes("?") ? "&" : "?"}token=${token}` : url;
};

// Tutor pe curs — mutat pe /ai/tutor în backend
export const tutorAI = (course_id, message) =>
  api.post(withToken("/ai/tutor"), { course_id, message });

export const generateQuiz = (course_id, num_questions) =>
  api.post(withToken("/ai/generate-quiz"), { course_id, num_questions });

export const summarizeCourse = (course_id) =>
  api.post(withToken(`/ai/summarize/${course_id}`));

export const askAI = (message, context) =>
  api.post(withToken("/ai/assist"), { message, context });