from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.database import get_db
from app.models.user import Course, Enrollment
from app.routers.auth import get_current_user
from app.config import settings
from groq import Groq
import json
import os

router = APIRouter(prefix="/ai", tags=["AI"])

client = Groq(api_key=settings.GROQ_API_KEY)

class ChatMessage(BaseModel):
    message: str
    course_id: int

class QuizRequest(BaseModel):
    course_id: int
    num_questions: int = 5

def extract_pdf_text(file_path: str) -> str:
    try:
        import PyPDF2
        with open(file_path, "rb") as f:
            reader = PyPDF2.PdfReader(f)
            text = ""
            for page in reader.pages:
                text += page.extract_text() or ""
        return text[:8000]  # Limităm la 8000 caractere
    except Exception as e:
        return ""

def get_course_context(course) -> str:
    context = f"Titlu curs: {course.title}\n"
    context += f"Descriere: {course.description or 'N/A'}\n"
    
    if course.file_path and os.path.exists(course.file_path):
        pdf_text = extract_pdf_text(course.file_path)
        if pdf_text:
            context += f"\nConținut curs:\n{pdf_text}"
        else:
            context += "\n(PDF-ul nu a putut fi citit)"
    
    return context

@router.post("/chat")
def chat_with_tutor(data: ChatMessage, token: str, db: Session = Depends(get_db)):
    user = get_current_user(token, db)
    
    course = db.query(Course).filter(Course.id == data.course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Cursul nu există")

    course_context = get_course_context(course)

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {
                "role": "system",
                "content": f"""Ești un tutor AI pentru cursul următor. Răspunde DOAR pe baza conținutului cursului de mai jos. 
Dacă întrebarea nu are legătură cu cursul, spune că poți răspunde doar la întrebări despre acest curs.
Răspunde în limba română, clar și concis.

{course_context}"""
            },
            {"role": "user", "content": data.message}
        ],
        max_tokens=1000
    )
    
    return {"response": response.choices[0].message.content}

@router.post("/generate-quiz")
def generate_quiz(data: QuizRequest, token: str, db: Session = Depends(get_db)):
    user = get_current_user(token, db)
    
    course = db.query(Course).filter(Course.id == data.course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Cursul nu există")

    course_context = get_course_context(course)

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {
                "role": "system",
                "content": "Ești un generator de quiz-uri educaționale. Răspunde DOAR cu JSON valid, fără alte texte."
            },
            {
                "role": "user",
                "content": f"""Generează {data.num_questions} întrebări de quiz bazate PE CONȚINUTUL EXACT al cursului de mai jos.
                
{course_context}

Format JSON exact:
{{
    "questions": [
        {{
            "question": "întrebarea",
            "options": ["a", "b", "c", "d"],
            "correct": 0
        }}
    ]
}}"""
            }
        ],
        max_tokens=2000
    )
    
    quiz_data = json.loads(response.choices[0].message.content)
    return quiz_data

@router.post("/summarize/{course_id}")
def summarize_course(course_id: int, token: str, db: Session = Depends(get_db)):
    user = get_current_user(token, db)
    
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Cursul nu există")

    course_context = get_course_context(course)

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {
                "role": "system",
                "content": "Ești un asistent educațional. Creează rezumate clare în limba română."
            },
            {
                "role": "user",
                "content": f"Creează un rezumat concis bazat pe conținutul exact al cursului:\n\n{course_context}"
            }
        ],
        max_tokens=1000
    )
    
    return {"summary": response.choices[0].message.content}