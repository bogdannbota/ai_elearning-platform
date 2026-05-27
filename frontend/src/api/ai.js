import api from "./client";

export const chatAI = (course_id, message) =>
  api.post("/ai/chat", { course_id, message });

export const generateQuiz = (course_id, num_questions) =>
  api.post("/ai/generate-quiz", { course_id, num_questions });

export const summarizeCourse = (course_id) =>
  api.post(`/ai/summarize/${course_id}`);

export const askAI = (message, context) =>
  api.post("/ai/assist", { message, context });