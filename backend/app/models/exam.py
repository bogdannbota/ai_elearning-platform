"""
Modele pentru examene:
- Exam: examenul în sine
- ExamQuestion: o întrebare (3 tipuri: SingleChoice, MultipleChoice, OpenText)
- ExamQuestionOption: variantă de răspuns (pentru SingleChoice și MultipleChoice)
- ExamAttempt: o tentativă a unui student la un examen
- ExamStudentAnswer: răspunsul studentului la o întrebare

Logică:
- SingleChoice & MultipleChoice: corectate AUTOMAT de sistem
- OpenText: corectate MANUAL de profesor/admin (notă + feedback text)
"""
import enum
from sqlalchemy import (
    Column, Integer, String, Boolean, ForeignKey, Enum,
    DateTime, Float, Numeric, Text
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class QuestionType(str, enum.Enum):
    """Tipul de întrebare."""
    single_choice = "single_choice"      # 1 răspuns corect
    multiple_choice = "multiple_choice"  # mai multe răspunsuri corecte
    open_text = "open_text"              # text liber (corectat manual)


class ExamAttemptStatus(str, enum.Enum):
    """Statusul unei tentative de examen."""
    in_progress = "in_progress"   # în curs (studentul încă rezolvă)
    submitted = "submitted"       # finalizat, așteaptă corectare manuală
    graded = "graded"             # corectat complet
    passed = "passed"             # promovat
    failed = "failed"             # nepromovat
    expired = "expired"           # timpul a expirat


class Exam(Base):
    """Examen creat de admin/profesor."""
    __tablename__ = "exams"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    
    # Examen legat opțional de un curs
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=True)
    
    # Imagine cover
    cover_image_path = Column(String, nullable=True)
    
    # Configurare
    duration_minutes = Column(Integer, default=30)        # timp pentru a finaliza
    max_attempts = Column(Integer, default=1)             # 0 = nelimitat
    passing_score = Column(Numeric(5, 2), default=70.0)   # procent pt promovare
    shuffle_questions = Column(Boolean, default=False)
    show_result_immediately = Column(Boolean, default=True)
    
    # Disponibilitate
    available_from = Column(DateTime(timezone=True), nullable=True)
    available_to = Column(DateTime(timezone=True), nullable=True)
    
    is_published = Column(Boolean, default=False, nullable=False)
    
    # Audit
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now()
    )

    # Relationships
    creator = relationship("User", foreign_keys=[created_by])
    course = relationship("Course", foreign_keys=[course_id])
    questions = relationship(
        "ExamQuestion",
        back_populates="exam",
        cascade="all, delete-orphan",
        order_by="ExamQuestion.display_order"
    )
    attempts = relationship(
        "ExamAttempt",
        back_populates="exam",
        cascade="all, delete-orphan"
    )


class ExamQuestion(Base):
    """O întrebare într-un examen."""
    __tablename__ = "exam_questions"

    id = Column(Integer, primary_key=True, index=True)
    exam_id = Column(Integer, ForeignKey("exams.id"), nullable=False)
    
    question_text = Column(Text, nullable=False)
    question_type = Column(Enum(QuestionType), nullable=False)
    
    points = Column(Numeric(5, 2), default=1.0)    # cât valorează
    display_order = Column(Integer, default=0, nullable=False)
    
    # Explicație afișată după răspuns (opțional)
    explanation = Column(Text, nullable=True)
    
    # Imagine atașată întrebării (opțional)
    image_path = Column(String, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    exam = relationship("Exam", back_populates="questions")
    options = relationship(
        "ExamQuestionOption",
        back_populates="question",
        cascade="all, delete-orphan",
        order_by="ExamQuestionOption.display_order"
    )
    student_answers = relationship(
        "ExamStudentAnswer",
        back_populates="question",
        cascade="all, delete-orphan"
    )


class ExamQuestionOption(Base):
    """
    Variantă de răspuns pentru întrebări de tip
    SingleChoice și MultipleChoice.
    Pentru OpenText nu există opțiuni.
    """
    __tablename__ = "exam_question_options"

    id = Column(Integer, primary_key=True, index=True)
    question_id = Column(Integer, ForeignKey("exam_questions.id"), nullable=False)
    
    option_text = Column(Text, nullable=False)
    is_correct = Column(Boolean, default=False, nullable=False)
    display_order = Column(Integer, default=0, nullable=False)

    # Relationships
    question = relationship("ExamQuestion", back_populates="options")


class ExamAttempt(Base):
    """Tentativă a unui student la un examen."""
    __tablename__ = "exam_attempts"

    id = Column(Integer, primary_key=True, index=True)
    exam_id = Column(Integer, ForeignKey("exams.id"), nullable=False)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Timeline
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    submitted_at = Column(DateTime(timezone=True), nullable=True)
    
    # Rezultate
    score = Column(Numeric(5, 2), nullable=True)           # procent 0-100
    points_earned = Column(Numeric(7, 2), nullable=True)
    total_points = Column(Numeric(7, 2), nullable=True)
    
    status = Column(
        Enum(ExamAttemptStatus),
        default=ExamAttemptStatus.in_progress,
        nullable=False
    )
    
    # True dacă examenul are întrebări OpenText (necesită corectare manuală)
    requires_manual_grading = Column(Boolean, default=False)
    
    # Cine a corectat manual (pentru OpenText)
    graded_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    graded_at = Column(DateTime(timezone=True), nullable=True)
    teacher_feedback = Column(Text, nullable=True)  # feedback general

    # Relationships
    exam = relationship("Exam", back_populates="attempts")
    student = relationship("User", foreign_keys=[student_id])
    grader = relationship("User", foreign_keys=[graded_by])
    answers = relationship(
        "ExamStudentAnswer",
        back_populates="attempt",
        cascade="all, delete-orphan"
    )


class ExamStudentAnswer(Base):
    """Răspunsul studentului la o întrebare specifică."""
    __tablename__ = "exam_student_answers"

    id = Column(Integer, primary_key=True, index=True)
    attempt_id = Column(Integer, ForeignKey("exam_attempts.id"), nullable=False)
    question_id = Column(Integer, ForeignKey("exam_questions.id"), nullable=False)
    
    # Pentru SingleChoice / MultipleChoice - CSV cu ID-urile opțiunilor selectate
    # ex: "12" pt single, "12,15,18" pt multiple
    selected_option_ids = Column(String, nullable=True)
    
    # Pentru OpenText
    text_answer = Column(Text, nullable=True)
    
    # Notare
    points_earned = Column(Numeric(5, 2), nullable=True)
    is_correct = Column(Boolean, nullable=True)  # null până la corectare manuală
    
    # Feedback profesor (pentru OpenText)
    teacher_feedback = Column(Text, nullable=True)
    graded_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    graded_at = Column(DateTime(timezone=True), nullable=True)
    
    answered_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    attempt = relationship("ExamAttempt", back_populates="answers")
    question = relationship("ExamQuestion", back_populates="student_answers")
    grader = relationship("User", foreign_keys=[graded_by])
