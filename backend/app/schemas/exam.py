from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from decimal import Decimal
from app.models.exam import QuestionType, ExamAttemptStatus

# ==========================================
# Opțiuni pentru întrebări
# ==========================================
class ExamQuestionOptionBase(BaseModel):
    option_text: str
    is_correct: bool = False
    display_order: int = 0

class ExamQuestionOptionCreate(ExamQuestionOptionBase):
    pass

class ExamQuestionOptionResponse(ExamQuestionOptionBase):
    id: int
    question_id: int

    class Config:
        from_attributes = True

# ==========================================
# Întrebări
# ==========================================
class ExamQuestionBase(BaseModel):
    question_text: str
    question_type: QuestionType
    points: Decimal = Decimal("1.0")
    display_order: int = 0
    explanation: Optional[str] = None
    image_path: Optional[str] = None

class ExamQuestionCreate(ExamQuestionBase):
    options: List[ExamQuestionOptionCreate] = []

class ExamQuestionUpdate(BaseModel):
    question_text: Optional[str] = None
    points: Optional[Decimal] = None
    display_order: Optional[int] = None
    explanation: Optional[str] = None
    image_path: Optional[str] = None

class ExamQuestionResponse(ExamQuestionBase):
    id: int
    exam_id: int
    options: List[ExamQuestionOptionResponse] = []

    class Config:
        from_attributes = True

# ==========================================
# Examen (CRUD)
# ==========================================
class ExamBase(BaseModel):
    title: str = Field(..., min_length=3)
    description: Optional[str] = None
    course_id: Optional[int] = None
    duration_minutes: int = 30
    max_attempts: int = 1
    passing_score: Decimal = Decimal("70.0")
    shuffle_questions: bool = False
    show_result_immediately: bool = True
    available_from: Optional[datetime] = None
    available_to: Optional[datetime] = None

class ExamCreate(ExamBase):
    pass

class ExamUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    duration_minutes: Optional[int] = None
    max_attempts: Optional[int] = None
    passing_score: Optional[Decimal] = None
    is_published: Optional[bool] = None
    available_from: Optional[datetime] = None
    available_to: Optional[datetime] = None

class ExamResponse(ExamBase):
    id: int
    is_published: bool
    created_by: int
    created_at: datetime
    department_id: Optional[int] = None

    class Config:
        from_attributes = True

class ExamDetailResponse(ExamResponse):
    questions: List[ExamQuestionResponse] = []

class ExamPublicDetailResponse(ExamResponse):
    """Aici, în mod normal, frontend-ul primește întrebările, dar 
    logică din router trebuie să elimine `is_correct` din opțiuni."""
    questions: List[ExamQuestionResponse] = []

# ==========================================
# Susținere Examen (Student)
# ==========================================
class StudentAnswerSubmit(BaseModel):
    question_id: int
    selected_option_ids: Optional[List[int]] = None
    text_answer: Optional[str] = None

class ExamSubmission(BaseModel):
    answers: List[StudentAnswerSubmit]

class ExamStudentAnswerResponse(BaseModel):
    id: int
    question_id: int
    selected_option_ids: Optional[str] = None
    text_answer: Optional[str] = None
    points_earned: Optional[Decimal] = None
    is_correct: Optional[bool] = None
    teacher_feedback: Optional[str] = None

    class Config:
        from_attributes = True

class ExamAttemptResponse(BaseModel):
    id: int
    exam_id: int
    student_id: int
    started_at: datetime
    submitted_at: Optional[datetime] = None
    score: Optional[Decimal] = None
    status: ExamAttemptStatus
    requires_manual_grading: bool

    class Config:
        from_attributes = True

class ExamAttemptDetailResponse(ExamAttemptResponse):
    answers: List[ExamStudentAnswerResponse] = []

# ==========================================
# Corectare Examen (Profesor/Admin)
# ==========================================
class AnswerGrading(BaseModel):
    answer_id: int
    points_earned: Decimal
    teacher_feedback: Optional[str] = None

class ExamGradingSubmission(BaseModel):
    answers: List[AnswerGrading]
    overall_feedback: Optional[str] = None