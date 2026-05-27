"""
Router pentru examene.
Endpoint-uri pentru admin/manager (creare/editare/ștergere)
și student (susținere examen).
"""

from typing import List, Optional
from datetime import datetime
from decimal import Decimal
 
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, selectinload
 
from app.database import get_db
from app.models.exam import (
    Exam, ExamQuestion, ExamQuestionOption,
    ExamAttempt, ExamStudentAnswer,
    QuestionType, ExamAttemptStatus,
)
from app.models.user import User
from app.routers.auth import get_current_user
from app.schemas.exam import (
    ExamCreate, ExamUpdate, ExamResponse,
    ExamDetailResponse, ExamPublicDetailResponse,
    ExamQuestionCreate, ExamQuestionUpdate, ExamQuestionResponse,
    ExamSubmission, ExamAttemptResponse, ExamAttemptDetailResponse,
    ExamGradingSubmission,
)
from app.services.exam_grading_service import ExamGradingService
 
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
    - Admin/Manager: vede tot
    - Student: vede doar publicate
    """
    user = get_current_user(token, db)

    query = db.query(Exam)
    if course_id is not None:
        query = query.filter(Exam.course_id == course_id)

    if user.is_student or only_published:
        query = query.filter(Exam.is_published == True)

    return query.order_by(Exam.created_at.desc()).all()


@router.post("/", response_model=ExamResponse, status_code=201)
def create_exam(
    data: ExamCreate,
    token: str,
    db: Session = Depends(get_db),
):
    """Creează un examen nou (fără întrebări încă)."""
    user = get_current_user(token, db)
    _require_creator(user)

    exam = Exam(
        **data.model_dump(),
        created_by=user.id,
    )
    db.add(exam)
    db.commit()
    db.refresh(exam)
    return exam


@router.get("/{exam_id}", response_model=ExamDetailResponse)
def get_exam_detail(
    exam_id: int,
    token: str,
    db: Session = Depends(get_db),
):
    """
    Detalii examen + toate întrebările cu răspunsuri corecte.
    DOAR pentru admin/manager. Studentul folosește /exams/{id}/take.
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
def get_exam_public(
    exam_id: int,
    token: str,
    db: Session = Depends(get_db),
):
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
def update_exam(
    exam_id: int,
    data: ExamUpdate,
    token: str,
    db: Session = Depends(get_db),
):
    """Editează setările examenului."""
    user = get_current_user(token, db)
    _require_creator(user)

    exam = _get_exam_or_404(db, exam_id)

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(exam, key, value)

    db.commit()
    db.refresh(exam)
    return exam


@router.delete("/{exam_id}", status_code=204)
def delete_exam(
    exam_id: int,
    token: str,
    db: Session = Depends(get_db),
):
    """Șterge examenul (cascade pe întrebări și tentative)."""
    user = get_current_user(token, db)
    _require_creator(user)

    exam = _get_exam_or_404(db, exam_id)
    db.delete(exam)
    db.commit()


@router.post("/{exam_id}/publish", response_model=ExamResponse)
def publish_exam(
    exam_id: int,
    token: str,
    db: Session = Depends(get_db),
):
    """Publică examenul (devine vizibil pentru studenți)."""
    user = get_current_user(token, db)
    _require_creator(user)

    exam = _get_exam_or_404(db, exam_id)

    # Validare: trebuie să aibă cel puțin o întrebare
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
def unpublish_exam(
    exam_id: int,
    token: str,
    db: Session = Depends(get_db),
):
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
def add_question(
    exam_id: int,
    data: ExamQuestionCreate,
    token: str,
    db: Session = Depends(get_db),
):
    """
    Adaugă o întrebare la examen, cu opțiunile sale (validate de Pydantic).
    Pentru OpenText: fără opțiuni.
    Pentru SingleChoice: exact 1 opțiune corectă.
    Pentru MultipleChoice: ≥ 1 opțiune corectă.
    """
    user = get_current_user(token, db)
    _require_creator(user)
    _get_exam_or_404(db, exam_id)

    # Calculează display_order automat dacă nu e setat
    if data.display_order == 0:
        last_order = (
            db.query(ExamQuestion)
            .filter(ExamQuestion.exam_id == exam_id)
            .count()
        )
        display_order = last_order + 1
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
    db.flush()  # ca să avem question.id pentru opțiuni

    # Adăugăm opțiunile (doar pentru SingleChoice & MultipleChoice)
    if data.question_type != QuestionType.open_text:
        for idx, opt in enumerate(data.options):
            option = ExamQuestionOption(
                question_id=question.id,
                option_text=opt.option_text,
                is_correct=opt.is_correct,
                display_order=opt.display_order if opt.display_order else idx,
            )
            db.add(option)

    db.commit()
    db.refresh(question)
    return question


@router.put("/questions/{question_id}", response_model=ExamQuestionResponse)
def update_question(
    question_id: int,
    data: ExamQuestionUpdate,
    token: str,
    db: Session = Depends(get_db),
):
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
def delete_question(
    question_id: int,
    token: str,
    db: Session = Depends(get_db),
):
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
        raise HTTPException(
            status_code=400,
            detail="Întrebările OpenText nu pot avea opțiuni.",
        )

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
def delete_option(
    option_id: int,
    token: str,
    db: Session = Depends(get_db),
):
    """Șterge o opțiune."""
    user = get_current_user(token, db)
    _require_creator(user)

    option = db.query(ExamQuestionOption).filter(ExamQuestionOption.id == option_id).first()
    if not option:
        raise HTTPException(status_code=404, detail="Opțiunea nu există.")
    db.delete(option)
    db.commit()

    # ============================================================
# STUDENT - Susținere examen
# ============================================================
# IMPORTANT: la începutul fișierului exam.py, asigură-te că ai
# importat și ExamGradingService:
#
# from app.services.exam_grading_service import ExamGradingService
#
# (dacă nu e deja, adaugă-l acolo)


@router.post("/{exam_id}/attempts/start", response_model=ExamAttemptResponse, status_code=201)
def start_exam_attempt(
    exam_id: int,
    token: str,
    db: Session = Depends(get_db),
):
    """
    Studentul pornește o tentativă nouă.
    - Verifică că examenul e publicat și disponibil în interval
    - Verifică max_attempts (numără TOATE tentativele)
    - Dacă există o tentativă in_progress veche, o marchează ca expired
      (regulă: tab închis = pierdut, contactează adminul pt reset)
    """
    user = get_current_user(token, db)

    if not user.is_student:
        raise HTTPException(
            status_code=403,
            detail="Doar studenții pot susține examene.",
        )

    exam = _get_exam_or_404(db, exam_id)

    if not exam.is_published:
        raise HTTPException(status_code=403, detail="Examenul nu este publicat.")

    # Verifică interval disponibilitate
    now = datetime.utcnow()
    if exam.available_from and now < exam.available_from.replace(tzinfo=None):
        raise HTTPException(
            status_code=403,
            detail=f"Examenul devine disponibil pe {exam.available_from.strftime('%d.%m.%Y %H:%M')}.",
        )
    if exam.available_to and now > exam.available_to.replace(tzinfo=None):
        raise HTTPException(
            status_code=403,
            detail="Perioada de susținere a examenului a expirat.",
        )

    # Tentative existente pentru acest student la acest examen
    existing_attempts = (
        db.query(ExamAttempt)
        .filter(
            ExamAttempt.exam_id == exam_id,
            ExamAttempt.student_id == user.id,
        )
        .all()
    )

    # Marchează ca expirate orice tentative rămase in_progress
    # (regulă: dacă a închis tab-ul, gata, nu mai poate continua)
    for a in existing_attempts:
        if a.status == ExamAttemptStatus.in_progress:
            a.status = ExamAttemptStatus.expired
            a.submitted_at = now

    # Verifică limita de încercări (max_attempts = 0 înseamnă nelimitat)
    if exam.max_attempts > 0:
        if len(existing_attempts) >= exam.max_attempts:
            raise HTTPException(
                status_code=403,
                detail=(
                    f"Ai atins limita de {exam.max_attempts} încercări pentru acest examen. "
                    f"Contactează administratorul pentru resetare."
                ),
            )

    # Verifică să existe întrebări
    q_count = db.query(ExamQuestion).filter(ExamQuestion.exam_id == exam_id).count()
    if q_count == 0:
        raise HTTPException(
            status_code=400,
            detail="Examenul nu conține întrebări.",
        )

    # Detectăm dacă are întrebări OpenText (impactează manual grading)
    has_open_text = (
        db.query(ExamQuestion)
        .filter(
            ExamQuestion.exam_id == exam_id,
            ExamQuestion.question_type == QuestionType.open_text,
        )
        .first()
        is not None
    )

    attempt = ExamAttempt(
        exam_id=exam_id,
        student_id=user.id,
        status=ExamAttemptStatus.in_progress,
        requires_manual_grading=has_open_text,
    )
    db.add(attempt)
    db.commit()
    db.refresh(attempt)
    return attempt


@router.get("/attempts/{attempt_id}", response_model=ExamPublicDetailResponse)
def get_attempt_for_taking(
    attempt_id: int,
    token: str,
    db: Session = Depends(get_db),
):
    """
    Returnează examenul (cu întrebări, FĂRĂ răspunsuri corecte)
    pentru tentativa curentă a studentului.
    """
    user = get_current_user(token, db)

    attempt = db.query(ExamAttempt).filter(ExamAttempt.id == attempt_id).first()
    if not attempt:
        raise HTTPException(status_code=404, detail="Tentativa nu există.")

    if attempt.student_id != user.id:
        raise HTTPException(status_code=403, detail="Nu este tentativa ta.")

    if attempt.status != ExamAttemptStatus.in_progress:
        raise HTTPException(
            status_code=400,
            detail="Tentativa nu mai este activă. Vezi rezultatul la /result.",
        )

    # Verifică timpul - dacă a expirat duration_minutes, o marcăm expirată
    exam = attempt.exam
    if exam.duration_minutes and attempt.started_at:
        elapsed = (datetime.utcnow() - attempt.started_at.replace(tzinfo=None)).total_seconds() / 60
        if elapsed > exam.duration_minutes:
            attempt.status = ExamAttemptStatus.expired
            attempt.submitted_at = datetime.utcnow()
            db.commit()
            raise HTTPException(
                status_code=403,
                detail="Timpul alocat pentru acest examen a expirat.",
            )

    # Returnăm examenul cu întrebări public (fără is_correct)
    exam_full = (
        db.query(Exam)
        .options(selectinload(Exam.questions).selectinload(ExamQuestion.options))
        .filter(Exam.id == attempt.exam_id)
        .first()
    )
    return exam_full


@router.post("/attempts/{attempt_id}/submit", response_model=ExamAttemptResponse)
def submit_exam_attempt(
    attempt_id: int,
    submission: ExamSubmission,
    token: str,
    db: Session = Depends(get_db),
):
    """
    Studentul finalizează tentativa.
    Service-ul auto-corectează SingleChoice/MultipleChoice,
    iar OpenText rămâne pentru corectare manuală.
    """
    user = get_current_user(token, db)

    attempt = db.query(ExamAttempt).filter(ExamAttempt.id == attempt_id).first()
    if not attempt:
        raise HTTPException(status_code=404, detail="Tentativa nu există.")

    if attempt.student_id != user.id:
        raise HTTPException(status_code=403, detail="Nu este tentativa ta.")

    if attempt.status != ExamAttemptStatus.in_progress:
        raise HTTPException(
            status_code=400,
            detail="Această tentativă a fost deja finalizată.",
        )

    service = ExamGradingService(db)
    updated = service.submit_exam_attempt(attempt, submission.answers)
    return updated


@router.get("/attempts/{attempt_id}/result", response_model=ExamAttemptDetailResponse)
def get_attempt_result(
    attempt_id: int,
    token: str,
    db: Session = Depends(get_db),
):
    """
    Rezultatul tentativei după submit.
    - Dacă examenul are OpenText nenotate încă -> notă PROVIZORIE
      (calculată din întrebările auto-corectate)
    - Dacă toate sunt notate -> notă FINALĂ
    Câmpul `status` indică starea: submitted/graded/passed/failed/expired
    """
    user = get_current_user(token, db)

    attempt = (
        db.query(ExamAttempt)
        .options(selectinload(ExamAttempt.answers))
        .filter(ExamAttempt.id == attempt_id)
        .first()
    )
    if not attempt:
        raise HTTPException(status_code=404, detail="Tentativa nu există.")

    # Doar studentul respectiv sau admin/profesor poate vedea
    if attempt.student_id != user.id and not user.can_create_content:
        raise HTTPException(status_code=403, detail="Nu ai acces la această tentativă.")

    if attempt.status == ExamAttemptStatus.in_progress:
        raise HTTPException(
            status_code=400,
            detail="Tentativa este încă în curs. Submit-o mai întâi.",
        )

    # Calculăm scor provizoriu dacă status = submitted (așteaptă manual grading)
    if attempt.status == ExamAttemptStatus.submitted:
        from decimal import Decimal
        provisional_points = sum(
            (a.points_earned or Decimal("0")) for a in attempt.answers
        )
        total_points = sum(
            Decimal(str(q.points)) for q in attempt.exam.questions
        )
        if total_points > 0:
            provisional_pct = (provisional_points / total_points) * Decimal("100")
            # Setăm temporar pentru răspuns, fără să persistăm
            attempt.points_earned = provisional_points
            attempt.total_points = total_points
            attempt.score = provisional_pct.quantize(Decimal("0.01"))

    return attempt


@router.get("/my-attempts", response_model=List[ExamAttemptResponse])
def my_attempts(
    token: str,
    db: Session = Depends(get_db),
    exam_id: Optional[int] = None,
):
    """Istoricul tentativelor studentului curent (opțional filtrat pe exam_id)."""
    user = get_current_user(token, db)

    q = db.query(ExamAttempt).filter(ExamAttempt.student_id == user.id)
    if exam_id is not None:
        q = q.filter(ExamAttempt.exam_id == exam_id)
    return q.order_by(ExamAttempt.started_at.desc()).all()


# ============================================================
# PROFESOR / ADMIN - manual grading pentru OpenText
# ============================================================

@router.get("/attempts/{attempt_id}/grading", response_model=ExamAttemptDetailResponse)
def get_attempt_for_grading(
    attempt_id: int,
    token: str,
    db: Session = Depends(get_db),
):
    """Profesorul/Adminul vede tentativa cu răspunsurile pentru corectare manuală."""
    user = get_current_user(token, db)
    _require_creator(user)

    attempt = (
        db.query(ExamAttempt)
        .options(selectinload(ExamAttempt.answers))
        .filter(ExamAttempt.id == attempt_id)
        .first()
    )
    if not attempt:
        raise HTTPException(status_code=404, detail="Tentativa nu există.")

    return attempt


@router.post("/attempts/{attempt_id}/grade", response_model=ExamAttemptResponse)
def grade_attempt_manually(
    attempt_id: int,
    grading: "ExamGradingSubmission",
    token: str,
    db: Session = Depends(get_db),
):
    """
    Profesorul/Adminul notează manual răspunsurile OpenText.
    După notarea tuturor -> calculează scorul final și setează passed/failed.
    """
    user = get_current_user(token, db)
    _require_creator(user)

    attempt = db.query(ExamAttempt).filter(ExamAttempt.id == attempt_id).first()
    if not attempt:
        raise HTTPException(status_code=404, detail="Tentativa nu există.")

    service = ExamGradingService(db)
    updated = service.grade_answers_manually(
        attempt=attempt,
        gradings=grading.answers,
        grader=user,
        overall_feedback=grading.overall_feedback,
    )
    return updated


@router.get("/pending-grading/all", response_model=List[ExamAttemptResponse])
def list_pending_grading(
    token: str,
    db: Session = Depends(get_db),
):
    """
    Lista tentativelor care așteaptă corectare manuală (OpenText).
    Admin vede toate, profesorul doar pentru examenele create de el.
    """
    user = get_current_user(token, db)
    _require_creator(user)

    q = db.query(ExamAttempt).filter(
        ExamAttempt.status == ExamAttemptStatus.submitted,
        ExamAttempt.requires_manual_grading == True,
    )

    if not user.is_admin:
        # Profesor: doar examenele lui
        my_exam_ids = [
            e.id for e in db.query(Exam).filter(Exam.created_by == user.id).all()
        ]
        q = q.filter(ExamAttempt.exam_id.in_(my_exam_ids))

    return q.order_by(ExamAttempt.submitted_at.desc()).all()