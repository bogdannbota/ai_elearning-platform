from fastapi import APIRouter, Depends, HTTPException
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

router = APIRouter(prefix="/ai", tags=["AI"])

client = Groq(api_key=settings.GROQ_API_KEY)


# ============================================================
# Modele de date
# ============================================================

class ChatMessage(BaseModel):
    message: str
    course_id: int


class QuizRequest(BaseModel):
    course_id: int
    num_questions: int = 5


class ExamQuestionGenerationRequest(BaseModel):
    """
    Request pentru generarea de întrebări pentru examen.
    Dă un subiect și AI-ul generează întrebări complete (cu răspunsuri corecte).
    """
    subject: str = Field(..., min_length=3, description="Subiectul/tematica")
    num_questions: int = Field(5, ge=1, le=20)
    difficulty: str = Field("medium", description="easy | medium | hard")
    question_types: List[str] = Field(
        default=["single_choice", "multiple_choice"],
        description="Combinație: single_choice, multiple_choice, open_text",
    )
    language: str = Field("ro", description="Limba: ro | en")
    course_id: Optional[int] = Field(None, description="Opțional - bazat pe un curs")


# ============================================================
# Helpers
# ============================================================

def extract_pdf_text(file_path: str) -> str:
    try:
        import PyPDF2
        with open(file_path, "rb") as f:
            reader = PyPDF2.PdfReader(f)
            text = ""
            for page in reader.pages:
                text += page.extract_text() or ""
        return text[:8000]
    except Exception:
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


def _extract_json_from_response(text: str) -> dict:
    """
    Groq uneori returnează JSON-ul înconjurat de markdown ```json...```
    sau cu text adițional. Curățăm și parsăm.
    """
    # Încercăm direct
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # Eliminăm markdown fences
    cleaned = re.sub(r"```(?:json)?\s*", "", text)
    cleaned = re.sub(r"```\s*$", "", cleaned)
    cleaned = cleaned.strip()

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        # Încercăm să extragem primul obiect JSON găsit
        match = re.search(r"\{.*\}", cleaned, re.DOTALL)
        if match:
            return json.loads(match.group(0))
        raise


# ============================================================
# Chat tutore + Quiz auto + Sumarizare (existente)
# ============================================================

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

{course_context}""",
            },
            {"role": "user", "content": data.message},
        ],
        max_tokens=1000,
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
                "content": "Ești un generator de quiz-uri educaționale. Răspunde DOAR cu JSON valid, fără alte texte.",
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
}}""",
            },
        ],
        max_tokens=2000,
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
                "content": "Ești un asistent educațional. Creează rezumate clare în limba română.",
            },
            {
                "role": "user",
                "content": f"Creează un rezumat concis bazat pe conținutul exact al cursului:\n\n{course_context}",
            },
        ],
        max_tokens=1000,
    )

    return {"summary": response.choices[0].message.content}


# ============================================================
# NOU: Generare întrebări examen
# ============================================================

@router.post("/generate-exam-questions")
def generate_exam_questions(
    data: ExamQuestionGenerationRequest,
    token: str,
    db: Session = Depends(get_db),
):
    """
    Generează întrebări pentru examen pe baza unui subiect.
    Returnează JSON gata de adăugat prin builder-ul de examene.

    Returnează structura compatibilă cu ExamQuestionCreate din schemas/exam.py:
    {
      "questions": [
        {
          "question_text": "...",
          "question_type": "single_choice" | "multiple_choice" | "open_text",
          "points": 1.0,
          "explanation": "...",
          "options": [
            {"option_text": "...", "is_correct": true|false, "display_order": 0}
          ]
        }
      ]
    }
    """
    user = get_current_user(token, db)

    if not user.can_create_content:
        raise HTTPException(
            status_code=403,
            detail="Doar adminul și profesorul pot genera întrebări cu AI.",
        )

    # Validăm tipurile cerute
    valid_types = {"single_choice", "multiple_choice", "open_text"}
    requested_types = [t for t in data.question_types if t in valid_types]
    if not requested_types:
        requested_types = ["single_choice"]

    # Context opțional dintr-un curs
    extra_context = ""
    if data.course_id:
        course = db.query(Course).filter(Course.id == data.course_id).first()
        if course:
            extra_context = f"\nFolosește și contextul cursului:\n{get_course_context(course)}\n"

    types_str = ", ".join(requested_types)
    lang_label = "română" if data.language == "ro" else "engleză"
    diff_label = {"easy": "ușor", "medium": "mediu", "hard": "dificil"}.get(
        data.difficulty, "mediu"
    )

    system_prompt = f"""Ești un generator profesionist de întrebări de examen educațional.
Răspunzi DOAR cu JSON valid, fără markdown, fără explicații, fără text adițional.
Întrebările trebuie să fie clare, precise, fără ambiguitate, și să aibă răspunsuri verificabile.
Toate textele sunt în limba {lang_label}."""

    user_prompt = f"""Generează exact {data.num_questions} întrebări de examen pe subiectul:
"{data.subject}"

Dificultate: {diff_label}
Tipuri permise: {types_str}
{extra_context}

REGULI STRICTE pentru fiecare tip:
- single_choice: exact 4 opțiuni, EXACT UNA cu is_correct=true
- multiple_choice: exact 4 opțiuni, ÎNTRE 2 ȘI 3 cu is_correct=true
- open_text: FĂRĂ opțiuni (array gol), folosit pentru răspunsuri libere (eseu scurt)

Variază între tipurile permise dacă sunt mai multe.
Pentru fiecare întrebare, adaugă "explanation" - o explicație scurtă a răspunsului corect.

Format JSON exact (NIMIC altceva în afară):
{{
  "questions": [
    {{
      "question_text": "Care este capitala Franței?",
      "question_type": "single_choice",
      "points": 1.0,
      "explanation": "Parisul este capitala Franței încă din secolul al X-lea.",
      "options": [
        {{"option_text": "Berlin", "is_correct": false, "display_order": 0}},
        {{"option_text": "Paris", "is_correct": true, "display_order": 1}},
        {{"option_text": "Madrid", "is_correct": false, "display_order": 2}},
        {{"option_text": "Roma", "is_correct": false, "display_order": 3}}
      ]
    }}
  ]
}}"""

    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            max_tokens=4000,
            temperature=0.7,
            response_format={"type": "json_object"},
        )

        raw = response.choices[0].message.content
        parsed = _extract_json_from_response(raw)

        questions = parsed.get("questions", [])

        # Validare + normalizare server-side (sigur Pydantic-compatibil)
        normalized = []
        for q in questions:
            q_type = q.get("question_type", "single_choice")
            if q_type not in valid_types:
                continue

            opts = q.get("options", []) or []

            # Reguli per tip
            if q_type == "open_text":
                opts = []
            elif q_type == "single_choice":
                correct_count = sum(1 for o in opts if o.get("is_correct"))
                if correct_count != 1 or len(opts) < 2:
                    # forțăm: prima opțiune = corectă, restul nu
                    if len(opts) >= 2:
                        for i, o in enumerate(opts):
                            o["is_correct"] = i == 0
                    else:
                        continue
            elif q_type == "multiple_choice":
                correct_count = sum(1 for o in opts if o.get("is_correct"))
                if correct_count < 1 or len(opts) < 2:
                    if len(opts) >= 2:
                        opts[0]["is_correct"] = True
                        opts[1]["is_correct"] = True
                    else:
                        continue

            # Normalizăm câmpurile fiecărei opțiuni
            clean_opts = []
            for idx, o in enumerate(opts):
                clean_opts.append({
                    "option_text": str(o.get("option_text", "")).strip(),
                    "is_correct": bool(o.get("is_correct", False)),
                    "display_order": idx,
                })

            normalized.append({
                "question_text": str(q.get("question_text", "")).strip(),
                "question_type": q_type,
                "points": float(q.get("points", 1.0)),
                "display_order": 0,
                "explanation": q.get("explanation"),
                "image_path": None,
                "options": clean_opts,
            })

        return {
            "questions": normalized,
            "count": len(normalized),
            "subject": data.subject,
        }

    except json.JSONDecodeError as e:
        raise HTTPException(
            status_code=500,
            detail=f"AI-ul a returnat JSON invalid: {str(e)}",
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Eroare la generarea întrebărilor: {str(e)}",
        )


# ============================================================
# NOU: Asistent AI general (pentru întrebări de pe pagină)
# ============================================================

class GeneralAssistRequest(BaseModel):
    message: str
    context: Optional[str] = Field(None, description="Context din pagina curentă")


@router.post("/assist")
def general_assist(
    data: GeneralAssistRequest,
    token: str,
    db: Session = Depends(get_db),
):
    """
    Asistent AI general - poate primi context din pagina curentă.
    Util pentru întrebări gen "explică-mi acest text", "cum funcționează X", etc.
    """
    user = get_current_user(token, db)

    system_msg = (
        "Ești un asistent AI educațional pentru o platformă de e-learning. "
        "Răspunzi în limba română, clar, concis, profesionist. "
        "Dacă utilizatorul îți dă un context, folosește-l ca referință."
    )

    user_msg = data.message
    if data.context:
        user_msg = f"Context:\n{data.context}\n\n---\n\nÎntrebare: {data.message}"

    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": system_msg},
                {"role": "user", "content": user_msg},
            ],
            max_tokens=1500,
            temperature=0.5,
        )
        return {"response": response.choices[0].message.content}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Eroare AI: {str(e)}")