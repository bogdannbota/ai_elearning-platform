from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from typing import List, Optional
from app.database import get_db
from app.models import Course, Enrollment
from app.routers.auth import get_current_user
from app.config import settings
from groq import Groq
import json
import os
import re
import logging
import PyPDF2

router = APIRouter(prefix="/ai", tags=["AI"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

client = Groq(api_key=settings.GROQ_API_KEY)

logger = logging.getLogger(__name__)

MAX_PDF_CHARS = 8000


# ============================================================
# Modele de date
# ============================================================

class ChatMessage(BaseModel):
    message: str
    course_id: int


class QuizRequest(BaseModel):
    course_id: int
    num_questions: int = Field(5, ge=1, le=20)


class ExamQuestionGenerationRequest(BaseModel):
    subject: str = Field(..., min_length=3)
    num_questions: int = Field(5, ge=1, le=20)
    difficulty: str = Field("medium")
    question_types: List[str] = Field(
        default=["single_choice", "multiple_choice"]
    )
    language: str = Field("ro")
    course_id: Optional[int] = None


class GeneralAssistRequest(BaseModel):
    message: str
    context: Optional[str] = None


# ============================================================
# Helpers
# ============================================================

def extract_pdf_text(file_path: str) -> str:
    """
    Extrage text din PDF și limitează dimensiunea.
    """

    try:
        if not os.path.exists(file_path):
            return ""

        text = ""

        with open(file_path, "rb") as f:
            reader = PyPDF2.PdfReader(f)

            for page in reader.pages:
                page_text = page.extract_text() or ""
                text += page_text

                if len(text) >= MAX_PDF_CHARS:
                    break

        text = text[:MAX_PDF_CHARS]

        if " " in text:
            text = text.rsplit(" ", 1)[0]

        return text.strip()

    except Exception:
        logger.exception("Eroare la citirea PDF-ului")
        return ""


def get_course_context(course) -> str:
    """
    Construiește contextul pentru AI.
    """

    context = f"Titlu curs: {course.title}\n"
    context += f"Descriere: {course.description or 'N/A'}\n"

    if course.file_path:
        pdf_text = extract_pdf_text(course.file_path)

        if pdf_text:
            context += (
                "\n=== CONTEXT CURS START ===\n"
                f"{pdf_text}\n"
                "=== CONTEXT CURS END ===\n"
            )

    return context


def _extract_json_from_response(text: str) -> dict:
    """
    Curăță și parsează răspunsul JSON al AI-ului.
    """

    try:
        return json.loads(text)

    except json.JSONDecodeError:
        pass

    cleaned = text.replace("```json", "")
    cleaned = cleaned.replace("```", "")
    cleaned = cleaned.strip()

    try:
        return json.loads(cleaned)

    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", cleaned, re.DOTALL)

        if match:
            return json.loads(match.group(0))

        raise


def validate_course_access(user, course, db: Session):
    """
    Verifică dacă utilizatorul are acces la curs.
    """

    if getattr(user, "is_admin", False):
        return

    enrolled = (
        db.query(Enrollment)
        .filter(
            Enrollment.user_id == user.id,
            Enrollment.course_id == course.id,
        )
        .first()
    )

    if not enrolled:
        raise HTTPException(
            status_code=403,
            detail="Nu ai acces la acest curs.",
        )


def safe_float(value, default=1.0):
    try:
        return float(value)
    except Exception:
        return default


# ============================================================
# CHAT AI
# ============================================================

@router.post("/chat")
def chat_with_tutor(
    data: ChatMessage,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    user = get_current_user(token, db)

    course = (
        db.query(Course)
        .filter(Course.id == data.course_id)
        .first()
    )

    if not course:
        raise HTTPException(
            status_code=404,
            detail="Cursul nu există",
        )

    validate_course_access(user, course, db)

    course_context = get_course_context(course)

    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {
                    "role": "system",
                    "content": f"""
Ești un tutor AI educațional.

Folosește DOAR informațiile din contextul de mai jos.

Dacă întrebarea nu are legătură cu cursul,
spune că poți răspunde doar la întrebări despre curs.

Răspunde în limba română.

{course_context}
""",
                },
                {
                    "role": "user",
                    "content": data.message,
                },
            ],
            max_tokens=1000,
            temperature=0.3,
        )

        return {
            "response": response.choices[0].message.content
        }

    except Exception:
        logger.exception("Eroare AI chat")

        raise HTTPException(
            status_code=500,
            detail="Eroare internă AI",
        )


# ============================================================
# GENERARE QUIZ
# ============================================================

@router.post("/generate-quiz")
def generate_quiz(
    data: QuizRequest,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    user = get_current_user(token, db)

    course = (
        db.query(Course)
        .filter(Course.id == data.course_id)
        .first()
    )

    if not course:
        raise HTTPException(
            status_code=404,
            detail="Cursul nu există",
        )

    validate_course_access(user, course, db)

    course_context = get_course_context(course)

    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {
                    "role": "system",
                    "content": """
Ești un generator de quiz-uri educaționale.

Răspunde DOAR cu JSON valid.
Fără markdown.
Fără explicații.
""",
                },
                {
                    "role": "user",
                    "content": f"""
Generează exact {data.num_questions} întrebări.

Bazate STRICT pe cursul de mai jos.

{course_context}

Format exact:

{{
  "questions": [
    {{
      "question": "text",
      "options": ["a", "b", "c", "d"],
      "correct": 0
    }}
  ]
}}
""",
                },
            ],
            max_tokens=2000,
            temperature=0.3,
            response_format={"type": "json_object"},
        )

        parsed = _extract_json_from_response(
            response.choices[0].message.content
        )

        questions = parsed.get("questions", [])

        normalized = []

        for q in questions:
            options = q.get("options", [])

            if len(options) < 2:
                continue

            correct = q.get("correct", 0)

            if not isinstance(correct, int):
                correct = 0

            if correct >= len(options):
                correct = 0

            normalized.append({
                "question": str(q.get("question", "")).strip(),
                "options": options,
                "correct": correct,
            })

        return {
            "questions": normalized,
            "count": len(normalized),
        }

    except Exception:
        logger.exception("Eroare generare quiz")

        raise HTTPException(
            status_code=500,
            detail="Eroare la generarea quiz-ului",
        )


# ============================================================
# SUMARIZARE CURS
# ============================================================

@router.post("/summarize/{course_id}")
def summarize_course(
    course_id: int,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    user = get_current_user(token, db)

    course = (
        db.query(Course)
        .filter(Course.id == course_id)
        .first()
    )

    if not course:
        raise HTTPException(
            status_code=404,
            detail="Cursul nu există",
        )

    validate_course_access(user, course, db)

    course_context = get_course_context(course)

    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {
                    "role": "system",
                    "content": """
Ești un asistent educațional.

Creează rezumate clare și concise în limba română.
""",
                },
                {
                    "role": "user",
                    "content": f"""
Creează un rezumat bazat pe cursul:

{course_context}
""",
                },
            ],
            max_tokens=1000,
            temperature=0.3,
        )

        return {
            "summary": response.choices[0].message.content
        }

    except Exception:
        logger.exception("Eroare sumarizare")

        raise HTTPException(
            status_code=500,
            detail="Eroare la sumarizare",
        )


# ============================================================
# GENERARE ÎNTREBĂRI EXAMEN
# ============================================================

@router.post("/generate-exam-questions")
def generate_exam_questions(
    data: ExamQuestionGenerationRequest,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    user = get_current_user(token, db)

    if not getattr(user, "can_create_content", False):
        raise HTTPException(
            status_code=403,
            detail="Nu ai permisiunea necesară.",
        )

    valid_types = {
        "single_choice",
        "multiple_choice",
        "open_text",
    }

    requested_types = [
        t for t in data.question_types
        if t in valid_types
    ]

    if not requested_types:
        requested_types = ["single_choice"]

    extra_context = ""

    if data.course_id:
        course = (
            db.query(Course)
            .filter(Course.id == data.course_id)
            .first()
        )

        if course:
            extra_context = get_course_context(course)

    types_str = ", ".join(requested_types)

    lang_label = (
        "română"
        if data.language == "ro"
        else "engleză"
    )

    difficulty_label = {
        "easy": "ușor",
        "medium": "mediu",
        "hard": "dificil",
    }.get(data.difficulty, "mediu")

    system_prompt = f"""
Ești un generator profesionist de întrebări de examen.

Răspunzi DOAR cu JSON valid.
Fără markdown.
Fără explicații extra.

Toate textele sunt în limba {lang_label}.
"""

    user_prompt = f"""
Generează exact {data.num_questions} întrebări.

Subiect:
{data.subject}

Dificultate:
{difficulty_label}

Tipuri permise:
{types_str}

Context:
{extra_context}

REGULI:

- single_choice:
  exact 4 opțiuni
  EXACT 1 corectă

- multiple_choice:
  exact 4 opțiuni
  ÎNTRE 2 ȘI 3 corecte

- open_text:
  fără opțiuni

Format JSON exact:

{{
  "questions": [
    {{
      "question_text": "text",
      "question_type": "single_choice",
      "points": 1.0,
      "explanation": "explicație",
      "options": [
        {{
          "option_text": "A",
          "is_correct": false,
          "display_order": 0
        }}
      ]
    }}
  ]
}}
"""

    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {
                    "role": "system",
                    "content": system_prompt,
                },
                {
                    "role": "user",
                    "content": user_prompt,
                },
            ],
            max_tokens=4000,
            temperature=0.3,
            response_format={"type": "json_object"},
        )

        parsed = _extract_json_from_response(
            response.choices[0].message.content
        )

        questions = parsed.get("questions", [])

        normalized = []

        for q_index, q in enumerate(questions):

            q_type = q.get(
                "question_type",
                "single_choice",
            )

            if q_type not in valid_types:
                continue

            opts = q.get("options", []) or []

            if q_type == "open_text":
                opts = []

            elif q_type == "single_choice":

                if len(opts) != 4:
                    continue

                correct_count = sum(
                    1 for o in opts
                    if o.get("is_correct")
                )

                if correct_count != 1:
                    continue

            elif q_type == "multiple_choice":

                if len(opts) != 4:
                    continue

                correct_count = sum(
                    1 for o in opts
                    if o.get("is_correct")
                )

                if correct_count < 2 or correct_count > 3:
                    continue

            clean_opts = []

            for idx, o in enumerate(opts):
                clean_opts.append({
                    "option_text": str(
                        o.get("option_text", "")
                    ).strip(),
                    "is_correct": bool(
                        o.get("is_correct", False)
                    ),
                    "display_order": idx,
                })

            normalized.append({
                "question_text": str(
                    q.get("question_text", "")
                ).strip(),

                "question_type": q_type,

                "points": safe_float(
                    q.get("points", 1.0)
                ),

                "display_order": q_index,

                "explanation": str(
                    q.get("explanation", "")
                ).strip(),

                "image_path": None,

                "options": clean_opts,
            })

        return {
            "questions": normalized,
            "count": len(normalized),
            "subject": data.subject,
        }

    except json.JSONDecodeError:
        logger.exception("JSON invalid de la AI")

        raise HTTPException(
            status_code=500,
            detail="AI-ul a returnat JSON invalid",
        )

    except Exception:
        logger.exception("Eroare generare întrebări examen")

        raise HTTPException(
            status_code=500,
            detail="Eroare internă AI",
        )


# ============================================================
# ASISTENT GENERAL
# ============================================================

@router.post("/assist")
def general_assist(
    data: GeneralAssistRequest,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    _ = get_current_user(token, db)

    system_msg = """
Ești un asistent AI educațional.

Răspunzi:
- clar
- concis
- profesionist
- în limba română
"""

    user_msg = data.message

    if data.context:
        user_msg = f"""
Context:
{data.context}

Întrebare:
{data.message}
"""

    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {
                    "role": "system",
                    "content": system_msg,
                },
                {
                    "role": "user",
                    "content": user_msg,
                },
            ],
            max_tokens=1500,
            temperature=0.4,
        )

        return {
            "response": response.choices[0].message.content
        }

    except Exception:
        logger.exception("Eroare AI assist")

        raise HTTPException(
            status_code=500,
            detail="Eroare internă AI",
        )