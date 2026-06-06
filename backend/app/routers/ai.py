from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone

from app.database import get_db
from app.models import (
    Course,
    DepartmentCourse,
    CourseStudent,
    Exam,
    LearningPlanAssignment,
    User,
)
from app.models.exam import ExamAssignment
from app.routers.auth import get_current_user

from app.services.ai_service import ai_service
from app.schemas.common import APIResponse

router = APIRouter(prefix="/ai", tags=["AI"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")


# ---------------- MODELS ----------------

class NavChatRequest(BaseModel):
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
# Asistent de navigare personalizat (folosit de butonul flotant)
# Rute reale per rol + date reale ale utilizatorului
# ============================================================
ROUTES_BY_ROLE = {
    "student": [
        ("/student/dashboard", "pagina principală / panoul de bord"),
        ("/cursuri", "lista cursurilor mele"),
        ("/my-exams", "examenele mele"),
        ("/my-learning-plans", "planurile mele de învățare"),
        ("/my-profile", "profilul meu"),
    ],
    "manager": [
        ("/manager/dashboard", "panoul de bord profesor"),
        ("/admin/cursuri", "gestionarea cursurilor"),
        ("/admin/examene", "gestionarea examenelor"),
        ("/admin/learning-plans", "gestionarea planurilor de învățare"),
        ("/cursuri", "lista cursurilor"),
        ("/my-exams", "examenele"),
        ("/my-profile", "profilul meu"),
    ],
    "admin": [
        ("/admin/dashboard", "panoul de bord administrator"),
        ("/admin/cursuri", "gestionarea cursurilor"),
        ("/admin/examene", "gestionarea examenelor"),
        ("/admin/learning-plans", "gestionarea planurilor de învățare"),
        ("/admin/useri", "gestionarea utilizatorilor"),
        ("/admin/settings", "setările platformei"),
        ("/my-profile", "profilul meu"),
    ],
}


def _student_courses(db: Session, user: User):
    try:
        mapped_course_ids = db.query(DepartmentCourse.course_id).distinct()
        my_dept_course_ids = (
            db.query(DepartmentCourse.course_id)
            .filter(DepartmentCourse.department_id == user.department_id)
        )
        restricted_course_ids = db.query(CourseStudent.course_id).distinct()
        my_restricted_course_ids = (
            db.query(CourseStudent.course_id)
            .filter(CourseStudent.student_id == user.id)
        )
        courses = (
            db.query(Course)
            .filter(Course.is_published == True)  # noqa: E712
            .filter(
                or_(
                    ~Course.id.in_(mapped_course_ids),
                    and_(
                        Course.id.in_(my_dept_course_ids),
                        or_(
                            ~Course.id.in_(restricted_course_ids),
                            Course.id.in_(my_restricted_course_ids),
                        ),
                    ),
                )
            )
            .all()
        )
        return [c.title for c in courses][:15]
    except Exception:
        return []


def _exam_status(exam: Exam) -> str:
    now = datetime.now(timezone.utc)
    try:
        if exam.available_from and now < exam.available_from:
            return "indisponibil încă"
        if exam.available_to and now > exam.available_to:
            return "expirat"
    except Exception:
        pass
    return "disponibil acum"


def _student_exams(db: Session, user: User):
    try:
        assigned_exam_ids = db.query(ExamAssignment.exam_id).distinct()
        my_exam_ids = (
            db.query(ExamAssignment.exam_id)
            .filter(ExamAssignment.student_id == user.id)
        )
        exams = (
            db.query(Exam)
            .filter(Exam.is_published == True)  # noqa: E712
            .filter(
                or_(
                    Exam.id.in_(my_exam_ids),
                    and_(
                        ~Exam.id.in_(assigned_exam_ids),
                        or_(
                            Exam.department_id == None,  # noqa: E711
                            Exam.department_id == user.department_id,
                        ),
                    ),
                )
            )
            .all()
        )
        return [(e.title, _exam_status(e)) for e in exams][:15]
    except Exception:
        return []


def _student_plans(db: Session, user: User):
    try:
        assignments = (
            db.query(LearningPlanAssignment)
            .filter(LearningPlanAssignment.student_id == user.id)
            .all()
        )
        out = []
        for a in assignments:
            plan = a.learning_plan
            if plan:
                out.append((plan.title, round(a.progress_percent or 0.0, 1)))
        return out[:15]
    except Exception:
        return []


def _build_nav_prompt(user: User, db: Session) -> str:
    role = user.role.value if hasattr(user.role, "value") else str(user.role)
    routes = ROUTES_BY_ROLE.get(role, ROUTES_BY_ROLE["student"])

    routes_text = "\n".join(f"- {path} → {desc}" for path, desc in routes)
    allowed_paths = ", ".join(path for path, _ in routes)

    context_lines = [f"Utilizator: {user.full_name}", f"Rol: {role}"]

    if role == "student":
        courses = _student_courses(db, user)
        exams = _student_exams(db, user)
        plans = _student_plans(db, user)

        context_lines.append(
            "Cursurile mele:\n" + "\n".join(f"  - {t}" for t in courses)
            if courses else "Cursurile mele: niciun curs vizibil momentan."
        )
        context_lines.append(
            "Examenele mele:\n" + "\n".join(f"  - {t} ({s})" for t, s in exams)
            if exams else "Examenele mele: niciun examen disponibil momentan."
        )
        context_lines.append(
            "Planurile mele:\n" + "\n".join(f"  - {t} ({p}% finalizat)" for t, p in plans)
            if plans else "Planurile mele: niciun plan asignat."
        )

    context_text = "\n".join(context_lines)

    return f"""
Ești asistentul integrat al unei platforme de e-learning. Ajuți utilizatorul să
navigheze și răspunzi DOAR pe baza datelor reale de mai jos.

DATELE UTILIZATORULUI CURENT:
{context_text}

RUTE DISPONIBILE (folosește exact aceste căi pentru navigare):
{routes_text}

REGULI OBLIGATORII:
- Răspunzi DOAR cu un singur obiect JSON valid, fără text în plus, fără markdown.
- "answer" = text scurt, prietenos, în limba română.
- Folosește datele reale de mai sus (ex: câte examene am, ce cursuri am).
- NU inventa cursuri, examene sau planuri care nu apar în date.
- Pentru navigare, "to" trebuie să fie EXACT una din căile: {allowed_paths}.
- Dacă întrebarea nu necesită navigare, action = null.

FORMAT OBLIGATORIU:
{{ "answer": "text scurt", "action": {{ "type": "navigate", "to": "/my-exams" }} }}
sau
{{ "answer": "text scurt", "action": null }}
"""


# ---------------- CHAT (asistent navigare, header Bearer) ----------------
@router.post("/chat", response_model=APIResponse)
def chat(
    data: NavChatRequest,
    user: User = Depends(get_current_user),   # era get_current_user_bearer
    db: Session = Depends(get_db),
):
    import json

    system_prompt = _build_nav_prompt(user, db)
    content = ai_client_chat(system_prompt, data.message)

    try:
        parsed = json.loads(content)
        role = user.role.value if hasattr(user.role, "value") else str(user.role)
        allowed = {p for p, _ in ROUTES_BY_ROLE.get(role, [])}
        action = parsed.get("action")
        if action and action.get("to") not in allowed:
            parsed["action"] = None
        return APIResponse(data={"answer": parsed.get("answer", ""), "action": parsed.get("action")})
    except Exception:
        return APIResponse(data={"answer": content, "action": None})


def ai_client_chat(system_prompt: str, message: str) -> str:
    from app.core.ai_client import ai_client
    return ai_client.chat(
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": message},
        ],
        temperature=0.2,
        max_tokens=800,
    )


# ---------------- QUIZ ----------------
@router.post("/generate-quiz", response_model=APIResponse)
def quiz(data: QuizRequest, token: str, db: Session = Depends(get_db)):
    get_current_user(token, db)
    course = db.query(Course).filter(Course.id == data.course_id).first()
    if not course:
        raise HTTPException(404, "Cursul nu există")
    return APIResponse(data=ai_service.generate_quiz(course, data.num_questions))


# ---------------- SUMMARIZE ----------------
@router.post("/summarize/{course_id}", response_model=APIResponse)
def summarize(course_id: int, token: str, db: Session = Depends(get_db)):
    get_current_user(token, db)
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(404, "Cursul nu există")
    return APIResponse(data={"summary": ai_service.summarize(course)})


# ---------------- ASSIST ----------------
@router.post("/assist", response_model=APIResponse)
def assist(data: AssistRequest, token: str, db: Session = Depends(get_db)):
    get_current_user(token, db)
    return APIResponse(data={"response": ai_service.assist(data.message, data.context)})


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

    return APIResponse(data=ai_service.generate_exam_questions(prompt))