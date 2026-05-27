from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from fastapi.security import OAuth2PasswordBearer

from app.database import get_db
from app.models import Course, Enrollment
from app.routers.auth import get_current_user

from app.services.ai_service import ai_service

router = APIRouter(prefix="/ai", tags=["AI"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")


# ---------------- CHAT ----------------
@router.post("/chat")
def chat(data, token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):

    user = get_current_user(token, db)

    course = db.query(Course).filter(Course.id == data.course_id).first()

    if not course:
        raise HTTPException(404, "Cursul nu există")

    return {
        "response": ai_service.chat_tutor(course, data.message)
    }


# ---------------- QUIZ ----------------
@router.post("/generate-quiz")
def quiz(data, token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):

    user = get_current_user(token, db)

    course = db.query(Course).filter(Course.id == data.course_id).first()

    if not course:
        raise HTTPException(404, "Cursul nu există")

    return ai_service.generate_quiz(course, data.num_questions)


# ---------------- SUMMARIZE ----------------
@router.post("/summarize/{course_id}")
def summarize(course_id: int, token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):

    user = get_current_user(token, db)

    course = db.query(Course).filter(Course.id == course_id).first()

    if not course:
        raise HTTPException(404, "Cursul nu există")

    return {
        "summary": ai_service.summarize(course)
    }


# ---------------- ASSIST ----------------
@router.post("/assist")
def assist(data, token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):

    user = get_current_user(token, db)

    return {
        "response": ai_service.assist(data.message, getattr(data, "context", None))
    }


# ---------------- EXAM QUESTIONS ----------------
@router.post("/generate-exam-questions")
def exam(data, token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):

    user = get_current_user(token, db)

    if not getattr(user, "can_create_content", False):
        raise HTTPException(403, "Fără permisiuni")

    prompt = f"""
Generează {data.num_questions} întrebări.

Subiect: {data.subject}
Dificultate: {data.difficulty}
Limba: {data.language}

Returnează JSON valid.
"""

    return ai_service.generate_exam_questions(prompt)