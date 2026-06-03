from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel
from typing import Optional, List
import json
import re

from app.database import get_db
from app.models import Course
from app.routers.auth import get_current_user
from app.services.ai_service import ai_service
from app.core.ai_client import ai_client
from app.schemas.common import APIResponse

router = APIRouter(prefix="/ai", tags=["AI"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")


# ---------------- MODELS ----------------

class AssistantChatRequest(BaseModel):
    message: str


class TutorChatRequest(BaseModel):
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


# ============================================================
# ASISTENT DE NAVIGARE  (folosit de widget-ul AiAssistant.jsx)
# Auth pe header Bearer (Depends), body doar { message }.
# Răspunde mereu cu { answer, action } – action poate fi null
# sau { "type": "navigate", "to": "<ruta>" }.
# ============================================================

# Rute reale pe rol (trebuie să corespundă cu App.jsx)
NAV_ROUTES = {
    "admin": {
        "Dashboard": "/admin/dashboard",
        "Cursuri": "/admin/cursuri",
        "Examene": "/admin/examene",
        "Planuri de învățare": "/admin/learning-plans",
        "Utilizatori": "/admin/useri",
        "Setări": "/admin/settings",
        "Profilul meu": "/my-profile",
    },
    "manager": {
        "Dashboard": "/manager/dashboard",
        "Cursuri": "/admin/cursuri",
        "Examene": "/admin/examene",
        "Planuri de învățare": "/admin/learning-plans",
        "Profilul meu": "/my-profile",
    },
    "student": {
        "Dashboard": "/student/dashboard",
        "Cursuri": "/cursuri",
        "Examenele mele": "/my-exams",
        "Planurile mele": "/my-learning-plans",
        "Profilul meu": "/my-profile",
    },
}


def _role_str(user) -> str:
    """Întoarce rolul ca string ('admin' / 'manager' / 'student')."""
    role = getattr(user, "role", None)
    return str(getattr(role, "value", role) or "student").lower()


def _build_nav_prompt(role: str) -> str:
    routes = NAV_ROUTES.get(role, NAV_ROUTES["student"])
    routes_block = "\n".join(f'- {label} -> "{path}"' for label, path in routes.items())
    return f"""Ești asistentul de navigare al unei platforme de e-learning.
Rolul utilizatorului curent: {role}.

Ajuți utilizatorul să se orienteze și, când cere explicit să meargă undeva,
îl trimiți către pagina potrivită.

PAGINI DISPONIBILE PENTRU ACEST UTILIZATOR:
{routes_block}

REGULI:
- Răspunzi DOAR cu un singur obiect JSON valid, fără markdown, fără text în plus.
- "answer" = o frază scurtă, prietenoasă, în limba română.
- Dacă utilizatorul vrea să ajungă la o pagină din lista de mai sus,
  pui "action": {{"type": "navigate", "to": "<una din rutele de mai sus>"}}.
- Folosești DOAR rutele din listă. Dacă nu există o potrivire, "action": null.
- Dacă utilizatorul doar întreabă/discută, "action": null.

FORMAT OBLIGATORIU:
{{"answer": "text scurt", "action": {{"type": "navigate", "to": "/cursuri"}}}}
sau
{{"answer": "text scurt", "action": null}}"""


def _valid_paths(role: str):
    return set(NAV_ROUTES.get(role, NAV_ROUTES["student"]).values())


def _parse_assistant_reply(content: str, role: str):
    """Parsează răspunsul modelului în (answer, action) în mod tolerant."""
    raw = (content or "").strip()

    def _try_load(text):
        try:
            return json.loads(text)
        except Exception:
            return None

    data = _try_load(raw)
    if data is None:
        cleaned = raw.replace("```json", "").replace("```", "").strip()
        data = _try_load(cleaned)
        if data is None:
            match = re.search(r"\{.*\}", cleaned, re.DOTALL)
            if match:
                data = _try_load(match.group(0))

    if not isinstance(data, dict):
        # modelul a răspuns în text liber -> îl arătăm ca atare, fără navigare
        return raw or "Nu am un răspuns acum.", None

    answer = data.get("answer") or "Gata."
    action = data.get("action")

    # Validăm acțiunea: doar 'navigate' către o rută permisă rolului
    if isinstance(action, dict) and action.get("type") == "navigate":
        to = action.get("to")
        if to in _valid_paths(role):
            return answer, {"type": "navigate", "to": to}

    return answer, None


@router.post("/chat")
def chat(
    data: AssistantChatRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    role = _role_str(current_user)

    content = ai_client.chat(
        messages=[
            {"role": "system", "content": _build_nav_prompt(role)},
            {"role": "user", "content": data.message},
        ],
        temperature=0.1,
        max_tokens=400,
    )

    answer, action = _parse_assistant_reply(content, role)
    return {"answer": answer, "action": action}


# ============================================================
# TUTOR PE CURS (păstrat din vechiul /chat, mutat pe /tutor)
# ============================================================
@router.post("/tutor", response_model=APIResponse)
def tutor(data: TutorChatRequest, token: str, db: Session = Depends(get_db)):
    get_current_user(token, db)

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