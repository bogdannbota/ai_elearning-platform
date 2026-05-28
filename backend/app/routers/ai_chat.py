from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
import json

from app.database import get_db
from app.core.ai_client import ai_client
from app.core.auth import get_current_user

router = APIRouter(prefix="/ai", tags=["AI Chat"])


class ChatRequest(BaseModel):
    message: str


class ChatResponse(BaseModel):
    answer: str
    action: dict | None = None


SYSTEM_PROMPT = """
Ești un asistent AI integrat într-o platformă de e-learning.

Rolul tău:
- ajuți studenții să navigheze în platformă
- explici unde se găsesc cursuri, examene, profil, dashboard
- recomanzi acțiuni utile în platformă

REGULI OBLIGATORII:
- răspunzi DOAR în JSON valid
- fără text extra, fără markdown
- dacă nu ai acțiune, action = null

RUTE DISPONIBILE:
- /cursuri
- /exams
- /profile
- /dashboard

FORMAT OBLIGATORIU:

{
  "answer": "text scurt",
  "action": {
    "type": "navigate",
    "to": "/cursuri"
  }
}

sau

{
  "answer": "text scurt",
  "action": null
}
"""


@router.post("/chat", response_model=ChatResponse)
def chat(
    request: ChatRequest,
    user=Depends(get_current_user),
    db: Session = Depends(get_db)
):

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": request.message}
    ]

    content = ai_client.chat(messages)

    try:
        parsed = json.loads(content)
        return parsed
    except Exception:
        return {
            "answer": content,
            "action": None
        }