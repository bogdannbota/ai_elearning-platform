from groq import Groq
from app.config import settings


class AIClient:
    def __init__(self):
        self.client = Groq(api_key=settings.GROQ_API_KEY)

    def chat(self, messages, max_tokens=1000, temperature=0.3):
        return self.client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=messages,
            max_tokens=max_tokens,
            temperature=temperature,
        )


ai_client = AIClient()