import json
import re

from app.core.ai_client import ai_client
from app.services.course_service import get_course_context


class AIService:

    # ---------------- CHAT ----------------
    def chat_tutor(self, course, message: str):
        context = get_course_context(course)

        response = ai_client.chat(
            messages=[
                {
                    "role": "system",
                    "content": f"""
Ești un tutor AI educațional.

Răspunde DOAR pe baza cursului.

{context}
""",
                },
                {"role": "user", "content": message},
            ],
            temperature=0.3,
            max_tokens=1000,
        )

        return response.choices[0].message.content

    # ---------------- QUIZ ----------------
    def generate_quiz(self, course, num_questions: int):
        context = get_course_context(course)

        response = ai_client.chat(
            messages=[
                {
                    "role": "system",
                    "content": "Răspunde DOAR JSON valid.",
                },
                {
                    "role": "user",
                    "content": f"""
Generează {num_questions} întrebări quiz.

{context}

Format:
{{
  "questions": [
    {{
      "question": "...",
      "options": ["a","b","c","d"],
      "correct": 0
    }}
  ]
}}
""",
                },
            ],
            temperature=0.3,
            max_tokens=2000,
        )

        return self._safe_json(response.choices[0].message.content)

    # ---------------- SUMMARIZE ----------------
    def summarize(self, course):
        context = get_course_context(course)

        response = ai_client.chat(
            messages=[
                {
                    "role": "system",
                    "content": "Creează rezumate clare în română.",
                },
                {
                    "role": "user",
                    "content": context,
                },
            ],
            temperature=0.3,
            max_tokens=1000,
        )

        return response.choices[0].message.content

    # ---------------- ASSIST ----------------
    def assist(self, message: str, context: str = None):

        user_msg = message

        if context:
            user_msg = f"Context:\n{context}\n\nÎntrebare:\n{message}"

        response = ai_client.chat(
            messages=[
                {
                    "role": "system",
                    "content": "Ești asistent educațional.",
                },
                {"role": "user", "content": user_msg},
            ],
            temperature=0.4,
            max_tokens=1500,
        )

        return response.choices[0].message.content

    # ---------------- EXAM QUESTIONS ----------------
    def generate_exam_questions(self, prompt: str):

        response = ai_client.chat(
            messages=[
                {
                    "role": "system",
                    "content": "Returnează DOAR JSON valid.",
                },
                {"role": "user", "content": prompt},
            ],
            temperature=0.3,
            max_tokens=4000,
        )

        return self._safe_json(response.choices[0].message.content)

    # ---------------- JSON PARSER ----------------
    def _safe_json(self, text: str):
        try:
            return json.loads(text)
        except:
            pass

        cleaned = text.replace("```json", "").replace("```", "").strip()

        try:
            return json.loads(cleaned)
        except:
            match = re.search(r"\{.*\}", cleaned, re.DOTALL)
            if match:
                return json.loads(match.group(0))
            raise


ai_service = AIService()