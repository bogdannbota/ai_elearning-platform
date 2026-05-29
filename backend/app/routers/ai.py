from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel
from typing import Optional, List

from app.database import get_db
from app.models import Course
from app.routers.auth import get_current_user
from app.services.ai_service import ai_service
from app.schemas.common import APIResponse

router = APIRouter(prefix="/ai", tags=["AI"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")


# ---------------- MODELS ----------------

class ChatRequest(BaseModel):
    course_id: int
    message: str


class QuizRequest(BaseModel):
    course_id: int
    num_questions: int


class AssistRequest(BaseModel):
    message: str
    context: Optional[str] = None


class ExamRequest(BaseModel):
    subject: str
    num_questions: int
    difficulty: str = "medium"
    language: str = "ro"
    question_types: Optional[List[str]] = None


# ---------------- CHAT ----------------
@router.post("/chat", response_model=APIResponse)
def chat(data: ChatRequest, token: str, db: Session = Depends(get_db)):

    user = get_current_user(token, db)

    course = db.query(Course).filter(Course.id == data.course_id).first()
    if not course:
        raise HTTPException(404, "Cursul nu există")

    return APIResponse(
        data={"response": ai_service.chat_tutor(course, data.message)}
    )


# ---------------- QUIZ ----------------
@router.post("/generate-quiz", response_model=APIResponse)
def quiz(data: QuizRequest, token: str, db: Session = Depends(get_db)):

    get_current_user(token, db)

    course = db.query(Course).filter(Course.id == data.course_id).first()
    if not course:
        raise HTTPException(404, "Cursul nu există")

    return APIResponse(
        data=ai_service.generate_quiz(course, data.num_questions)
    )


# ---------------- SUMMARIZE ----------------
@router.post("/summarize/{course_id}", response_model=APIResponse)
def summarize(course_id: int, token: str, db: Session = Depends(get_db)):

    get_current_user(token, db)

    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(404, "Cursul nu există")

    return APIResponse(
        data={"summary": ai_service.summarize(course)}
    )


# ---------------- ASSIST ----------------
@router.post("/assist", response_model=APIResponse)
def assist(data: AssistRequest, token: str, db: Session = Depends(get_db)):

    get_current_user(token, db)

    return APIResponse(
        data={"response": ai_service.assist(data.message, data.context)}
    )


# ---------------- EXAM ----------------
@router.post("/generate-exam-questions", response_model=APIResponse)
def exam(data: ExamRequest, token: str, db: Session = Depends(get_db)):

    user = get_current_user(token, db)

    if not getattr(user, "can_create_content", False):
        raise HTTPException(403, "Fără permisiuni")

    types_str = ", ".join(data.question_types) if data.question_types else "single_choice, multiple_choice"

    prompt = f"""
Generează exact {data.num_questions} întrebări de examen despre subiectul: "{data.subject}".
Dificultate: {data.difficulty}. Limba: {data.language}.
Folosește DOAR aceste tipuri de întrebări: {types_str}.

Răspunde STRICT cu un singur obiect JSON valid, fără text în plus, fără markdown.
Structura OBLIGATORIE:

{{
  "questions": [
    {{
      "question_text": "textul întrebării",
      "question_type": "single_choice",
      "points": 1,
      "explanation": "scurtă explicație a răspunsului corect",
      "options": [
        {{ "option_text": "varianta A", "is_correct": true }},
        {{ "option_text": "varianta B", "is_correct": false }},
        {{ "option_text": "varianta C", "is_correct": false }},
        {{ "option_text": "varianta D", "is_correct": false }}
      ]
    }}
  ]
}}

REGULI:
- cheia principală trebuie să fie "questions" (nu altceva)
- "question_type" poate fi DOAR: "single_choice", "multiple_choice" sau "open_text"
- pentru "single_choice": exact o opțiune cu "is_correct": true, restul false, minim 3 opțiuni
- pentru "multiple_choice": cel puțin o opțiune cu "is_correct": true, minim 3 opțiuni
- pentru "open_text": lista "options" trebuie să fie goală []
- "points" este un număr (ex: 1)
- NU adăuga câmpuri în plus (fără "id", "tip", "raspuns", "dificultate")
"""

    return APIResponse(
        data=ai_service.generate_exam_questions(prompt)
    )