"""
Modelele aplicației - organizate pe domenii.

IMPORTANT: Toate modelele trebuie importate aici ca să fie vizibile pentru:
- SQLAlchemy (relationship resolution)
- Alembic (autogenerate migrations)
"""

# User & Department
from app.models.user import User, Department, RoleEnum

# Course & related
from app.models.course import (
    Course,
    CourseCategory,
    CourseModule,
    DepartmentCourse,
    Enrollment,
    CourseModuleProgress,
    DifficultyLevel,
)

# Learning Plan
from backend.app.models.learning_plans import (
    LearningPlan,
    LearningPlanItem,
    LearningPlanAssignment,
)

# Exam
from app.models.exam import (
    Exam,
    ExamQuestion,
    ExamQuestionOption,
    ExamAttempt,
    ExamStudentAnswer,
    QuestionType,
    ExamAttemptStatus,
)

__all__ = [
    # User
    "User", "Department", "RoleEnum",
    # Course
    "Course", "CourseCategory", "CourseModule", "DepartmentCourse",
    "Enrollment", "CourseModuleProgress", "DifficultyLevel",
    # Learning Plan
    "LearningPlan", "LearningPlanItem", "LearningPlanAssignment",
    # Exam
    "Exam", "ExamQuestion", "ExamQuestionOption",
    "ExamAttempt", "ExamStudentAnswer",
    "QuestionType", "ExamAttemptStatus",
]
