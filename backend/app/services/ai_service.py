import json
import re

from app.core.ai_client import ai_client
from app.services.course_service import (
    get_course_context,
    chunk_text,
    simple_retrieve
)
from app.prompts.ai_prompts import (
    CHAT_SYSTEM,
    QUIZ_SYSTEM,
    EXAM_SYSTEM,
    ASSIST_SYSTEM
)


class AIService:

    def chat_tutor(self, course, message: str):
        context = get_course_context(course)

        chunks = chunk_text(context)
        relevant_chunks = simple_retrieve(chunks, message)
        final_context = "\n\n".join(relevant_chunks)

        response = ai_client.chat(
            messages=[
                {
                    "role": "system",
                    "content": f"{CHAT_SYSTEM}\n\nCONTEXT:\n{final_context}"
                },
                {
                    "role": "user",
                    "content": message
                },
            ],
            temperature=0.3,
            max_tokens=1000,
        )

        return response

    def generate_quiz(self, course, num_questions: int):
        context = get_course_context(course)

        response = ai_client.chat(
            messages=[
                {"role": "system", "content": QUIZ_SYSTEM},
                {
                    "role": "user",
                    "content": f"""
Generează {num_questions} întrebări quiz.

{context}

Return format JSON:
{{
  "questions": [
    {{
      "question": "...",
      "options": ["a","b","c","d"],
      "correct": 0
    }}
  ]
}}
"""
                },
            ],
            temperature=0.3,
            max_tokens=2000,
        )

        return self._safe_json(response)

    def summarize(self, course):
        context = get_course_context(course)

        response = ai_client.chat(
            messages=[
                {"role": "system", "content": "Creează rezumate clare în română."},
                {"role": "user", "content": context},
            ],
            temperature=0.3,
            max_tokens=1000,
        )

        return response

    def assist(self, message: str, context: str = None):

        user_msg = message
        if context:
            user_msg = f"Context:\n{context}\n\nÎntrebare:\n{message}"

        response = ai_client.chat(
            messages=[
                {"role": "system", "content": ASSIST_SYSTEM},
                {"role": "user", "content": user_msg},
            ],
            temperature=0.4,
            max_tokens=1500,
        )

        return response

    def generate_exam_questions(self, prompt: str):

        response = ai_client.chat(
            messages=[
                {"role": "system", "content": EXAM_SYSTEM},
                {"role": "user", "content": prompt},
            ],
            temperature=0.3,
            max_tokens=4000,
        )

        return self._safe_json(response)

    def _safe_json(self, text: str):
        try:
            return json.loads(text)
        except:
            cleaned = text.replace("```json", "").replace("```", "").strip()

            try:
                return json.loads(cleaned)
            except:
                match = re.search(r"\{.*\}", cleaned, re.DOTALL)
                if match:
                    return json.loads(match.group(0))
                raise


ai_service = AIService()