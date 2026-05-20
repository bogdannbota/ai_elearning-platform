"""
Schemas Pydantic pentru examene.
Cele mai complexe - manipulează 3 tipuri de întrebări:
SingleChoice, MultipleChoice, OpenText.
"""
from datetime import datetime
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel, Field, validator

from app.models import QuestionType, ExamAttemptStatus


# ============================================================
# ExamQuestionOption (variante de răspuns)
# ============================================================

class ExamQuestionOptionBase(BaseModel):
    option_text: str
    is_correct: bool = False
    display_order: int = 0


class ExamQuestionOptionCreate(ExamQuestionOptionBase):
    pass


class ExamQuestionOptionUpdate(BaseModel):
    option_text: Optional[str] = None
    is_correct: Optional[bool] = None
    display_order: Optional[int] = None


class ExamQuestionOptionResponse(ExamQuestionOptionBase):
    id: int
    question_id: int

    class Config:
        from_attributes = True


class ExamQuestionOptionPublicResponse(BaseModel):
    """
    Versiunea pentru STUDENT - nu include is_correct
    (altfel studentul ar vedea răspunsul corect!)
    """
    id: int
    option_text: str
    display_order: int

    class Config:
        from_attributes = True


# ============================================================
# ExamQuestion
# ============================================================

class ExamQuestionBase(BaseModel):
    question_text: str
    question_type: QuestionType
    points: Decimal = Decimal("1.0")
    display_order: int = 0
    explanation: Optional[str] = None
    image_path: Optional[str] = None


class ExamQuestionCreate(ExamQuestionBase):
    # Pentru SingleChoice/MultipleChoice trimitem și opțiunile la creare
    options: List[ExamQuestionOptionCreate] = []

    @validator("options")
    def validate_options(cls, options, values):
        q_type = values.get("question_type")
        if q_type == QuestionType.open_text:
            # OpenText nu are opțiuni
            if options:
                raise ValueError("OpenText questions should not have options.")
            return options

        # SingleChoice & MultipleChoice trebuie să aibă cel puțin 2 opțiuni
        if len(options) < 2:
            raise ValueError(
                f"{q_type.value} questions must have at least 2 options."
            )

        correct_count = sum(1 for o in options if o.is_correct)

        if q_type == QuestionType.single_choice:
            if correct_count != 1:
                raise ValueError(
                    "Single choice questions must have exactly 1 correct option."
                )
        elif q_type == QuestionType.multiple_choice:
            if correct_count < 1:
                raise ValueError(
                    "Multiple choice questions must have at least 1 correct option."
                )

        return options


class ExamQuestionUpdate(BaseModel):
    question_text: Optional[str] = None
    points: Optional[Decimal] = None
    display_order: Optional[int] = None
    explanation: Optional[str] = None
    image_path: Optional[str] = None


class ExamQuestionResponse(ExamQuestionBase):
    """Versiunea pentru ADMIN/PROFESOR - include is_correct pe opțiuni."""
    id: int
    exam_id: int
    options: List[ExamQuestionOptionResponse] = []

    class Config:
        from_attributes = True


class ExamQuestionPublicResponse(BaseModel):
    """Versiunea pentru STUDENT - ascunde răspunsurile corecte."""
    id: int
    question_text: str
    question_type: QuestionType
    points: Decimal
    display_order: int
    image_path: Optional[str] = None
    options: List[ExamQuestionOptionPublicResponse] = []

    class Config:
        from_attributes = True


# ============================================================
# Exam
# ============================================================

class ExamBase(BaseModel):
    title: str = Field(..., min_length=3, max_length=255)
    description: Optional[str] = None
    course_id: Optional[int] = None
    duration_minutes: int = Field(30, ge=1)
    max_attempts: int = Field(1, ge=0)
    passing_score: Decimal = Field(Decimal("70.0"), ge=0, le=100)
    shuffle_questions: bool = False
    show_result_immediately: bool = True
    available_from: Optional[datetime] = None
    available_to: Optional[datetime] = None
    is_published: bool = False


class ExamCreate(ExamBase):
    pass


class ExamUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    course_id: Optional[int] = None
    duration_minutes: Optional[int] = None
    max_attempts: Optional[int] = None
    passing_score: Optional[Decimal] = None
    shuffle_questions: Optional[bool] = None
    show_result_immediately: Optional[bool] = None
    available_from: Optional[datetime] = None
    available_to: Optional[datetime] = None
    is_published: Optional[bool] = None


class ExamResponse(ExamBase):
    id: int
    cover_image_path: Optional[str] = None
    created_by: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ExamDetailResponse(ExamResponse):
    """Examen complet - cu toate întrebările (vizibil doar adminului/profesorului)."""
    questions: List[ExamQuestionResponse] = []

    class Config:
        from_attributes = True


class ExamPublicDetailResponse(ExamResponse):
    """Examen pentru STUDENT - cu întrebări dar fără răspunsuri corecte."""
    questions: List[ExamQuestionPublicResponse] = []

    class Config:
        from_attributes = True


# ============================================================
# Student answering an exam
# ============================================================

class StudentAnswerSubmit(BaseModel):
    """Răspunsul pe care studentul îl trimite pentru o întrebare."""
    question_id: int
    # Pentru SingleChoice - 1 ID; pentru MultipleChoice - mai multe IDs
    selected_option_ids: Optional[List[int]] = None
    # Pentru OpenText
    text_answer: Optional[str] = None


class ExamSubmission(BaseModel):
    """Studentul trimite toate răspunsurile sale dintr-o tentativă."""
    answers: List[StudentAnswerSubmit]


class StudentAnswerResponse(BaseModel):
    """Cum apare un răspuns după submit."""
    id: int
    attempt_id: int
    question_id: int
    selected_option_ids: Optional[str] = None  # CSV
    text_answer: Optional[str] = None
    points_earned: Optional[Decimal] = None
    is_correct: Optional[bool] = None
    teacher_feedback: Optional[str] = None
    answered_at: datetime

    class Config:
        from_attributes = True


# ============================================================
# Manual Grading (pentru OpenText)
# ============================================================

class AnswerGrading(BaseModel):
    """Profesorul completează asta pentru fiecare răspuns OpenText."""
    answer_id: int
    points_earned: Decimal = Field(..., ge=0)
    teacher_feedback: Optional[str] = None


class ExamGradingSubmission(BaseModel):
    """Profesorul trimite notele pentru toate răspunsurile OpenText din tentativă."""
    answers: List[AnswerGrading]
    overall_feedback: Optional[str] = None


# ============================================================
# ExamAttempt
# ============================================================

class ExamAttemptResponse(BaseModel):
    id: int
    exam_id: int
    student_id: int
    started_at: datetime
    submitted_at: Optional[datetime] = None
    score: Optional[Decimal] = None
    points_earned: Optional[Decimal] = None
    total_points: Optional[Decimal] = None
    status: ExamAttemptStatus
    requires_manual_grading: bool
    teacher_feedback: Optional[str] = None
    graded_by: Optional[int] = None
    graded_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ExamAttemptDetailResponse(ExamAttemptResponse):
    """Tentativa cu toate răspunsurile (pentru profesor la corectare)."""
    answers: List[StudentAnswerResponse] = []

    class Config:
        from_attributes = True