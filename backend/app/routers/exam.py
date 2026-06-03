"""
Router pentru examene.
Endpoint-uri pentru admin/manager (creare/editare/ștergere)
și student (susținere examen).
"""
from typing import List, Optional
from datetime import datetime, timezone
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, selectinload
from sqlalchemy import or_, and_

from app.services.exam_grading_service import ExamGradingService
from app.database import get_db
from app.models.exam import (
    Exam, ExamQuestion, ExamQuestionOption,
    ExamAttempt, ExamStudentAnswer, ExamAssignment,
    QuestionType, ExamAttemptStatus,
)
from app.models.user import User, RoleEnum
from app.routers.auth import get_current_user
from app.schemas.exam import (
    ExamCreate, ExamUpdate, ExamResponse,
    ExamDetailResponse, ExamPublicDetailResponse,
    ExamQuestionCreate, ExamQuestionUpdate, ExamQuestionResponse,
    ExamSubmission, ExamGradingSubmission,
)

router = APIRouter(prefix="/exams", tags=["Exams"])


# ============================================================
# Helpers
# ============================================================

def _require_creator(user: User):
    """Doar admin și manager pot crea/edita conținut."""
    if not user.can_create_content:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Doar adminul și profesorul pot gestiona examene.",
        )


def _get_exam_or_404(db: Session, exam_id: int) -> Exam:
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Examenul nu există.")
    return exam


def _get_question_or_404(db: Session, question_id: int) -> ExamQuestion:
    q = db.query(ExamQuestion).filter(ExamQuestion.id == question_id).first()
    if not q:
        raise HTTPException(status_code=404, detail="Întrebarea nu există.")
    return q


def _sync_assignments(db: Session, exam: Exam, student_ids, assigned_by: int):
    """Rescrie complet lista de elevi nominalizați pentru un examen."""
    db.query(ExamAssignment).filter(ExamAssignment.exam_id == exam.id).delete()
    for sid in set(student_ids or []):
        student = (
            db.query(User)
            .filter(User.id == sid, User.role == RoleEnum.student)
            .first()
        )
        if student:
            db.add(ExamAssignment(
                exam_id=exam.id, student_id=sid, assigned_by=assigned_by
            ))


# ============================================================
# CRUD Examen
# ============================================================

@router.get("/", response_model=List[ExamResponse])
def list_exams(
    token: str,
    db: Session = Depends(get_db),
    course_id: Optional[int] = None,
    only_published: bool = False,
):
    """
    Listează examenele.
    - Admin: vede tot
    - Profesor: vede examenele din departamentul lui
    - Student: doar publicate, unde e nominalizat SAU care nu au nicio
      nominalizare (vizibile pe departament / generale)
    """
    user = get_current_user(token, db)
    query = db.query(Exam)

    if course_id is not None:
        query = query.filter(Exam.course_id == course_id)

    if user.is_admin:
        pass  # vede tot

    elif user.is_teacher:
        query = query.filter(Exam.department_id == user.department_id)

    else:  # student
        query = query.filter(Exam.is_published == True)

        assigned_exam_ids = db.query(ExamAssignment.exam_id).distinct()
        my_exam_ids = (
            db.query(ExamAssignment.exam_id)
            .filter(ExamAssignment.student_id == user.id)
        )
        query = query.filter(
            or_(
                # nominalizat explicit pe mine
                Exam.id.in_(my_exam_ids),
                # examen fără nominalizări => vizibil pe departamentul meu / general
                and_(
                    ~Exam.id.in_(assigned_exam_ids),
                    or_(
                        Exam.department_id == None,  # noqa: E711
                        Exam.department_id == user.department_id,
                    ),
                ),
            )
        )

    if only_published:
        query = query.filter(Exam.is_published == True)

    return query.order_by(Exam.created_at.desc()).all()


@router.post("/", response_model=ExamResponse, status_code=201)
def create_exam(data: ExamCreate, token: str, db: Session = Depends(get_db)):
    """Creează un examen nou + asignează elevii selectați."""
    user = get_current_user(token, db)
    _require_creator(user)

    payload = data.model_dump()
    student_ids = payload.pop("student_ids", [])

    exam = Exam(**payload, created_by=user.id)
    db.add(exam)
    db.flush()  # ca să avem exam.id înainte de asignări

    _sync_assignments(db, exam, student_ids, user.id)

    db.commit()
    db.refresh(exam)
    return exam


@router.get("/{exam_id}", response_model=ExamDetailResponse)
def get_exam_detail(exam_id: int, token: str, db: Session = Depends(get_db)):
    """
    Detalii examen + toate întrebările cu răspunsuri corecte.
    DOAR pentru admin/manager.
    """
    user = get_current_user(token, db)
    _require_creator(user)

    exam = (
        db.query(Exam)
        .options(selectinload(Exam.questions).selectinload(ExamQuestion.options))
        .filter(Exam.id == exam_id)
        .first()
    )
    if not exam:
        raise HTTPException(status_code=404, detail="Examenul nu există.")
    return exam


@router.get("/{exam_id}/public", response_model=ExamPublicDetailResponse)
def get_exam_public(exam_id: int, token: str, db: Session = Depends(get_db)):
    """Vizualizare examen pentru student - FĂRĂ răspunsuri corecte."""
    user = get_current_user(token, db)

    exam = (
        db.query(Exam)
        .options(selectinload(Exam.questions).selectinload(ExamQuestion.options))
        .filter(Exam.id == exam_id)
        .first()
    )
    if not exam:
        raise HTTPException(status_code=404, detail="Examenul nu există.")

    if not exam.is_published and user.is_student:
        raise HTTPException(status_code=403, detail="Examenul nu este publicat.")

    return exam


@router.put("/{exam_id}", response_model=ExamResponse)
def update_exam(exam_id: int, data: ExamUpdate, token: str, db: Session = Depends(get_db)):
    """Editează setările examenului (și opțional lista de elevi)."""
    user = get_current_user(token, db)
    _require_creator(user)

    exam = _get_exam_or_404(db, exam_id)

    update_data = data.model_dump(exclude_unset=True)
    student_ids = update_data.pop("student_ids", None)  # tratat separat

    for key, value in update_data.items():
        setattr(exam, key, value)

    if student_ids is not None:
        _sync_assignments(db, exam, student_ids, user.id)

    db.commit()
    db.refresh(exam)
    return exam


@router.delete("/{exam_id}", status_code=204)
def delete_exam(exam_id: int, token: str, db: Session = Depends(get_db)):
    """Șterge examenul (cascade pe întrebări, tentative și asignări)."""
    user = get_current_user(token, db)
    _require_creator(user)

    exam = _get_exam_or_404(db, exam_id)
    db.delete(exam)
    db.commit()


@router.post("/{exam_id}/publish", response_model=ExamResponse)
def publish_exam(exam_id: int, token: str, db: Session = Depends(get_db)):
    """Publică examenul (devine vizibil pentru studenți)."""
    user = get_current_user(token, db)
    _require_creator(user)

    exam = _get_exam_or_404(db, exam_id)

    q_count = db.query(ExamQuestion).filter(ExamQuestion.exam_id == exam_id).count()
    if q_count == 0:
        raise HTTPException(
            status_code=400,
            detail="Examenul trebuie să aibă cel puțin o întrebare ca să fie publicat.",
        )

    exam.is_published = True
    db.commit()
    db.refresh(exam)
    return exam


@router.post("/{exam_id}/unpublish", response_model=ExamResponse)
def unpublish_exam(exam_id: int, token: str, db: Session = Depends(get_db)):
    """Retrage publicarea (nu mai e vizibil pentru studenți)."""
    user = get_current_user(token, db)
    _require_creator(user)

    exam = _get_exam_or_404(db, exam_id)
    exam.is_published = False
    db.commit()
    db.refresh(exam)
    return exam


# ============================================================
# Întrebări (questions)
# ============================================================

@router.post("/{exam_id}/questions", response_model=ExamQuestionResponse, status_code=201)
def add_question(exam_id: int, data: ExamQuestionCreate, token: str, db: Session = Depends(get_db)):
    """Adaugă o întrebare la examen, cu opțiunile sale."""
    user = get_current_user(token, db)
    _require_creator(user)
    _get_exam_or_404(db, exam_id)

    if data.display_order == 0:
        display_order = (
            db.query(ExamQuestion).filter(ExamQuestion.exam_id == exam_id).count() + 1
        )
    else:
        display_order = data.display_order

    question = ExamQuestion(
        exam_id=exam_id,
        question_text=data.question_text,
        question_type=data.question_type,
        points=data.points,
        display_order=display_order,
        explanation=data.explanation,
        image_path=data.image_path,
    )
    db.add(question)
    db.flush()

    if data.question_type != QuestionType.open_text:
        for idx, opt in enumerate(data.options):
            db.add(ExamQuestionOption(
                question_id=question.id,
                option_text=opt.option_text,
                is_correct=opt.is_correct,
                display_order=opt.display_order if opt.display_order else idx,
            ))

    db.commit()
    db.refresh(question)
    return question


@router.put("/questions/{question_id}", response_model=ExamQuestionResponse)
def update_question(question_id: int, data: ExamQuestionUpdate, token: str, db: Session = Depends(get_db)):
    """Editează textul/punctele/explicația unei întrebări."""
    user = get_current_user(token, db)
    _require_creator(user)

    question = _get_question_or_404(db, question_id)
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(question, key, value)

    db.commit()
    db.refresh(question)
    return question


@router.delete("/questions/{question_id}", status_code=204)
def delete_question(question_id: int, token: str, db: Session = Depends(get_db)):
    """Șterge o întrebare (cascade pe opțiuni și răspunsuri studenți)."""
    user = get_current_user(token, db)
    _require_creator(user)

    question = _get_question_or_404(db, question_id)
    db.delete(question)
    db.commit()


@router.post("/questions/{question_id}/options", status_code=201)
def add_option_to_question(
    question_id: int,
    option_text: str,
    is_correct: bool,
    token: str,
    db: Session = Depends(get_db),
):
    """Adaugă o opțiune la o întrebare existentă (post-creare)."""
    user = get_current_user(token, db)
    _require_creator(user)

    question = _get_question_or_404(db, question_id)
    if question.question_type == QuestionType.open_text:
        raise HTTPException(status_code=400, detail="Întrebările OpenText nu pot avea opțiuni.")

    last_order = (
        db.query(ExamQuestionOption)
        .filter(ExamQuestionOption.question_id == question_id)
        .count()
    )
    option = ExamQuestionOption(
        question_id=question_id,
        option_text=option_text,
        is_correct=is_correct,
        display_order=last_order + 1,
    )
    db.add(option)
    db.commit()
    db.refresh(option)
    return {
        "id": option.id,
        "question_id": option.question_id,
        "option_text": option.option_text,
        "is_correct": option.is_correct,
        "display_order": option.display_order,
    }


@router.delete("/options/{option_id}", status_code=204)
def delete_option(option_id: int, token: str, db: Session = Depends(get_db)):
    """Șterge o opțiune."""
    user = get_current_user(token, db)
    _require_creator(user)

    option = db.query(ExamQuestionOption).filter(ExamQuestionOption.id == option_id).first()
    if not option:
        raise HTTPException(status_code=404, detail="Opțiunea nu există.")
    db.delete(option)
    db.commit()


# ============================================================
# STUDENT - Susținere examen (attempt + auto-grading + rezultat)
# ============================================================

def _sanitize_questions_for_student(exam: Exam):
    """Întrebările FĂRĂ a dezvălui ce opțiune e corectă."""
    out = []
    for q in exam.questions:
        out.append({
            "id": q.id,
            "question_text": q.question_text,
            "question_type": q.question_type.value if hasattr(q.question_type, "value") else q.question_type,
            "points": float(q.points),
            "display_order": q.display_order,
            "image_path": q.image_path,
            "options": [
                {"id": o.id, "option_text": o.option_text, "display_order": o.display_order}
                for o in q.options
            ],
        })
    return out


def _attempt_result_payload(attempt: ExamAttempt):
    return {
        "attempt_id": attempt.id,
        "exam_id": attempt.exam_id,
        "status": attempt.status.value if hasattr(attempt.status, "value") else attempt.status,
        "score": float(attempt.score) if attempt.score is not None else None,
        "points_earned": float(attempt.points_earned) if attempt.points_earned is not None else None,
        "total_points": float(attempt.total_points) if attempt.total_points is not None else None,
        "passing_score": float(attempt.exam.passing_score),
        "requires_manual_grading": attempt.requires_manual_grading,
        "submitted_at": attempt.submitted_at.isoformat() if attempt.submitted_at else None,
    }


@router.get("/my/attempts")
def my_attempts(token: str, db: Session = Depends(get_db)):
    """Toate tentativele studentului curent (pt. tab-ul Rezultate)."""
    user = get_current_user(token, db)
    attempts = (
        db.query(ExamAttempt)
        .options(selectinload(ExamAttempt.exam))
        .filter(ExamAttempt.student_id == user.id)
        .order_by(ExamAttempt.started_at.desc())
        .all()
    )
    return [
        {
            "attempt_id": a.id,
            "exam_id": a.exam_id,
            "exam_title": a.exam.title if a.exam else "—",
            "status": a.status.value if hasattr(a.status, "value") else a.status,
            "score": float(a.score) if a.score is not None else None,
            "started_at": a.started_at.isoformat() if a.started_at else None,
            "submitted_at": a.submitted_at.isoformat() if a.submitted_at else None,
            "requires_manual_grading": a.requires_manual_grading,
        }
        for a in attempts
    ]


@router.post("/{exam_id}/start")
def start_attempt(exam_id: int, token: str, db: Session = Depends(get_db)):
    """
    Începe (sau reia) o tentativă. Verifică publicarea, fereastra de
    disponibilitate, nominalizarea și max_attempts.
    """
    user = get_current_user(token, db)

    exam = (
        db.query(Exam)
        .options(selectinload(Exam.questions).selectinload(ExamQuestion.options))
        .filter(Exam.id == exam_id)
        .first()
    )
    if not exam:
        raise HTTPException(status_code=404, detail="Examenul nu există.")
    if not exam.is_published and user.is_student:
        raise HTTPException(status_code=403, detail="Examenul nu este publicat.")
    if not exam.questions:
        raise HTTPException(status_code=400, detail="Examenul nu are întrebări.")

    # Fereastra de disponibilitate (valabil de la / până la)
    now = datetime.now(timezone.utc)
    if exam.available_from and now < exam.available_from:
        raise HTTPException(status_code=403, detail="Examenul nu a început încă.")
    if exam.available_to and now > exam.available_to:
        raise HTTPException(status_code=403, detail="Perioada examenului s-a încheiat.")

    # Dacă examenul are elevi nominalizați, doar ei pot intra
    if user.is_student:
        has_assignments = (
            db.query(ExamAssignment).filter(ExamAssignment.exam_id == exam_id).count() > 0
        )
        if has_assignments:
            mine = (
                db.query(ExamAssignment)
                .filter(
                    ExamAssignment.exam_id == exam_id,
                    ExamAssignment.student_id == user.id,
                )
                .first()
            )
            if not mine:
                raise HTTPException(status_code=403, detail="Nu ești înscris la acest examen.")

    # Reia o tentativă în curs dacă există
    attempt = (
        db.query(ExamAttempt)
        .filter(
            ExamAttempt.exam_id == exam_id,
            ExamAttempt.student_id == user.id,
            ExamAttempt.status == ExamAttemptStatus.in_progress,
        )
        .first()
    )

    if not attempt:
        used = (
            db.query(ExamAttempt)
            .filter(
                ExamAttempt.exam_id == exam_id,
                ExamAttempt.student_id == user.id,
            )
            .count()
        )
        if exam.max_attempts and exam.max_attempts > 0 and used >= exam.max_attempts:
            raise HTTPException(status_code=403, detail="Ai atins numărul maxim de încercări.")

        attempt = ExamAttempt(
            exam_id=exam_id,
            student_id=user.id,
            status=ExamAttemptStatus.in_progress,
        )
        db.add(attempt)
        db.commit()
        db.refresh(attempt)

    return {
        "attempt_id": attempt.id,
        "exam": {
            "id": exam.id,
            "title": exam.title,
            "description": exam.description,
            "duration_minutes": exam.duration_minutes,
            "passing_score": float(exam.passing_score),
            "questions": _sanitize_questions_for_student(exam),
        },
    }


@router.post("/attempts/{attempt_id}/submit")
def submit_attempt(attempt_id: int, data: ExamSubmission, token: str, db: Session = Depends(get_db)):
    """Trimite răspunsurile -> auto-grading -> scor (sau 'submitted' dacă are OpenText)."""
    user = get_current_user(token, db)

    attempt = (
        db.query(ExamAttempt)
        .options(
            selectinload(ExamAttempt.exam).selectinload(Exam.questions),
            selectinload(ExamAttempt.answers),
        )
        .filter(ExamAttempt.id == attempt_id)
        .first()
    )
    if not attempt:
        raise HTTPException(status_code=404, detail="Tentativa nu există.")
    if attempt.student_id != user.id:
        raise HTTPException(status_code=403, detail="Aceasta nu este tentativa ta.")

    service = ExamGradingService(db)
    attempt = service.submit_exam_attempt(attempt, data.answers)
    return _attempt_result_payload(attempt)


@router.get("/attempts/{attempt_id}")
def get_attempt_detail(attempt_id: int, token: str, db: Session = Depends(get_db)):
    """Rezultat detaliat (cu răspunsuri corecte) - pt. review după finalizare."""
    user = get_current_user(token, db)

    attempt = (
        db.query(ExamAttempt)
        .options(
            selectinload(ExamAttempt.answers),
            selectinload(ExamAttempt.exam)
            .selectinload(Exam.questions)
            .selectinload(ExamQuestion.options),
        )
        .filter(ExamAttempt.id == attempt_id)
        .first()
    )
    if not attempt:
        raise HTTPException(status_code=404, detail="Tentativa nu există.")
    if attempt.student_id != user.id and not user.can_create_content:
        raise HTTPException(status_code=403, detail="Acces interzis.")

    ans_by_q = {a.question_id: a for a in attempt.answers}
    questions = []
    for q in attempt.exam.questions:
        a = ans_by_q.get(q.id)
        selected = []
        if a and a.selected_option_ids:
            selected = [
                int(x) for x in a.selected_option_ids.split(",")
                if x.strip().lstrip("-").isdigit()
            ]
        questions.append({
            "id": q.id,
            "question_text": q.question_text,
            "question_type": q.question_type.value if hasattr(q.question_type, "value") else q.question_type,
            "points": float(q.points),
            "explanation": q.explanation,
            "options": [
                {"id": o.id, "option_text": o.option_text, "is_correct": o.is_correct}
                for o in q.options
            ],
            "selected_option_ids": selected,
            "text_answer": a.text_answer if a else None,
            "points_earned": float(a.points_earned) if a and a.points_earned is not None else None,
            "is_correct": a.is_correct if a else None,
        })

    return {**_attempt_result_payload(attempt), "questions": questions}


# ============================================================
# PROFESOR/ADMIN - Corectare manuală (open_text)
# ============================================================

def _require_can_grade(user: User, exam: Exam):
    """Admin: orice examen. Profesor: doar cele create de el."""
    if user.is_admin:
        return
    if user.can_create_content and exam.created_by == user.id:
        return
    raise HTTPException(status_code=403, detail="Nu poți corecta acest examen.")


@router.get("/grading/pending")
def grading_pending(token: str, db: Session = Depends(get_db)):
    """Tentative care așteaptă corectare manuală (cu open_text)."""
    user = get_current_user(token, db)
    if not user.can_create_content:
        raise HTTPException(status_code=403, detail="Acces interzis.")

    q = (
        db.query(ExamAttempt)
        .join(Exam, Exam.id == ExamAttempt.exam_id)
        .options(
            selectinload(ExamAttempt.exam),
            selectinload(ExamAttempt.student),
            selectinload(ExamAttempt.answers),
        )
        .filter(
            ExamAttempt.status == ExamAttemptStatus.submitted,
            ExamAttempt.requires_manual_grading == True,
        )
    )
    if not user.is_admin:
        q = q.filter(Exam.created_by == user.id)

    attempts = q.order_by(ExamAttempt.submitted_at.asc()).all()
    return [
        {
            "attempt_id": a.id,
            "exam_id": a.exam_id,
            "exam_title": a.exam.title if a.exam else "—",
            "student_id": a.student_id,
            "student_name": a.student.full_name if a.student else "—",
            "submitted_at": a.submitted_at.isoformat() if a.submitted_at else None,
            "open_count": sum(1 for ans in a.answers if ans.points_earned is None),
        }
        for a in attempts
    ]


@router.get("/attempts/{attempt_id}/grading")
def attempt_grading_detail(attempt_id: int, token: str, db: Session = Depends(get_db)):
    """Detaliile unei tentative pentru corectare (doar răspunsurile open_text)."""
    user = get_current_user(token, db)
    if not user.can_create_content:
        raise HTTPException(status_code=403, detail="Acces interzis.")

    attempt = (
        db.query(ExamAttempt)
        .options(
            selectinload(ExamAttempt.exam).selectinload(Exam.questions),
            selectinload(ExamAttempt.student),
            selectinload(ExamAttempt.answers).selectinload(ExamStudentAnswer.question),
        )
        .filter(ExamAttempt.id == attempt_id)
        .first()
    )
    if not attempt:
        raise HTTPException(status_code=404, detail="Tentativa nu există.")
    _require_can_grade(user, attempt.exam)

    open_answers = []
    auto_points = Decimal("0")
    for a in attempt.answers:
        if a.question and a.question.question_type == QuestionType.open_text:
            open_answers.append({
                "answer_id": a.id,
                "question_text": a.question.question_text,
                "max_points": float(a.question.points),
                "text_answer": a.text_answer or "",
                "points_earned": float(a.points_earned) if a.points_earned is not None else None,
                "teacher_feedback": a.teacher_feedback,
            })
        elif a.points_earned is not None:
            auto_points += a.points_earned

    total_points = sum(Decimal(str(q.points)) for q in attempt.exam.questions)

    return {
        "attempt_id": attempt.id,
        "exam_title": attempt.exam.title,
        "student_name": attempt.student.full_name if attempt.student else "—",
        "auto_points": float(auto_points),
        "total_points": float(total_points),
        "open_answers": open_answers,
        "overall_feedback": attempt.teacher_feedback,
    }


@router.post("/attempts/{attempt_id}/grade")
def grade_attempt(attempt_id: int, data: ExamGradingSubmission, token: str, db: Session = Depends(get_db)):
    """Profesorul/Adminul notează răspunsurile open_text -> recalculează scorul."""
    user = get_current_user(token, db)
    if not user.can_create_content:
        raise HTTPException(status_code=403, detail="Acces interzis.")

    attempt = (
        db.query(ExamAttempt)
        .options(
            selectinload(ExamAttempt.exam).selectinload(Exam.questions),
            selectinload(ExamAttempt.answers).selectinload(ExamStudentAnswer.question),
        )
        .filter(ExamAttempt.id == attempt_id)
        .first()
    )
    if not attempt:
        raise HTTPException(status_code=404, detail="Tentativa nu există.")
    _require_can_grade(user, attempt.exam)

    service = ExamGradingService(db)
    attempt = service.grade_answers_manually(attempt, data.answers, user, data.overall_feedback)
    return _attempt_result_payload(attempt)