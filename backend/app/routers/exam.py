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