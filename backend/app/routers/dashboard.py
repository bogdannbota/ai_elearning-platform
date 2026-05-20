"""
Router pentru dashboard - statistici per rol.

- /dashboard/me                returnează dashboard-ul potrivit pentru rolul curent
- /dashboard/admin             explicit admin (necesită admin)
- /dashboard/teacher           explicit profesor (necesită manager sau admin)
- /dashboard/student           explicit student
"""
from datetime import datetime, timedelta
from typing import Any, Dict
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import (
    User,
    Course,
    Enrollment,
    Exam,
    ExamAttempt,
    ExamAttemptStatus,
    RoleEnum,
)
from app.routers.auth import get_current_user
from app.services.permission_service import PermissionService

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


# ============================================================
# Helpers
# ============================================================

def _student_dashboard(db: Session, user: User) -> Dict[str, Any]:
    """Dashboard student (cum e în poza 1)."""
    enrollments = (
        db.query(Enrollment)
        .filter(Enrollment.user_id == user.id)
        .all()
    )

    courses_total = len(enrollments)
    courses_completed = sum(1 for e in enrollments if e.completed)
    courses_active = courses_total - courses_completed

    # Examene
    attempts = (
        db.query(ExamAttempt)
        .filter(ExamAttempt.student_id == user.id)
        .all()
    )
    exam_attempts_total = len(attempts)
    exam_attempts_passed = sum(
        1 for a in attempts if a.status == ExamAttemptStatus.passed
    )

    # Media notelor (scor)
    finished = [a for a in attempts if a.score is not None]
    avg_score = (
        sum(float(a.score) for a in finished) / len(finished)
        if finished else 0
    )

    return {
        "role": "student",
        "user_id": user.id,
        "full_name": user.full_name,
        "stats": {
            "courses_total": courses_total,
            "courses_active": courses_active,
            "courses_completed": courses_completed,
            "exam_attempts_total": exam_attempts_total,
            "exam_attempts_passed": exam_attempts_passed,
            "average_score_percent": round(avg_score, 2),
        },
    }


def _teacher_dashboard(db: Session, user: User) -> Dict[str, Any]:
    """Dashboard profesor (cursurile mele, studenții mei, examene de corectat)."""
    # Cursurile create de el
    my_courses = (
        db.query(Course)
        .filter(Course.created_by == user.id)
        .all()
    )
    course_ids = [c.id for c in my_courses]

    # Studenți înscriși la cursurile lui
    students_enrolled = 0
    if course_ids:
        students_enrolled = (
            db.query(func.count(func.distinct(Enrollment.user_id)))
            .filter(Enrollment.course_id.in_(course_ids))
            .scalar() or 0
        )

    # Examene create de el
    my_exams = (
        db.query(Exam)
        .filter(Exam.created_by == user.id)
        .all()
    )
    exam_ids = [e.id for e in my_exams]

    # Examene în așteptare de corectare manuală
    pending_grading = 0
    if exam_ids:
        pending_grading = (
            db.query(ExamAttempt)
            .filter(
                ExamAttempt.exam_id.in_(exam_ids),
                ExamAttempt.status == ExamAttemptStatus.submitted,
                ExamAttempt.requires_manual_grading == True,
            )
            .count()
        )

    # Progres mediu studenți pe cursurile lui
    avg_progress = 0
    if course_ids:
        avg = (
            db.query(func.avg(Enrollment.progress_percent))
            .filter(Enrollment.course_id.in_(course_ids))
            .scalar()
        )
        avg_progress = float(avg or 0)

    return {
        "role": "teacher",
        "user_id": user.id,
        "full_name": user.full_name,
        "stats": {
            "courses_created": len(my_courses),
            "exams_created": len(my_exams),
            "students_enrolled": students_enrolled,
            "pending_manual_grading": pending_grading,
            "average_student_progress_percent": round(avg_progress, 2),
        },
    }


def _admin_dashboard(db: Session) -> Dict[str, Any]:
    """Dashboard admin (statistici globale - poza 2)."""
    total_users = db.query(User).count()
    total_students = db.query(User).filter(User.role == RoleEnum.student).count()
    total_teachers = db.query(User).filter(User.role == RoleEnum.manager).count()
    total_admins = db.query(User).filter(User.role == RoleEnum.admin).count()

    total_courses = db.query(Course).count()
    published_courses = db.query(Course).filter(Course.is_published == True).count()
    total_exams = db.query(Exam).count()
    published_exams = db.query(Exam).filter(Exam.is_published == True).count()

    total_enrollments = db.query(Enrollment).count()
    completed_enrollments = (
        db.query(Enrollment).filter(Enrollment.completed == True).count()
    )

    total_attempts = db.query(ExamAttempt).count()
    pending_grading = (
        db.query(ExamAttempt)
        .filter(
            ExamAttempt.status == ExamAttemptStatus.submitted,
            ExamAttempt.requires_manual_grading == True,
        )
        .count()
    )

    # Media globală a notelor
    avg_score_row = (
        db.query(func.avg(ExamAttempt.score))
        .filter(ExamAttempt.score != None)
        .scalar()
    )
    avg_score = float(avg_score_row or 0)

    # Top 3 cursuri după înscrieri
    top_courses_query = (
        db.query(Course, func.count(Enrollment.id).label("enrollments"))
        .outerjoin(Enrollment, Enrollment.course_id == Course.id)
        .group_by(Course.id)
        .order_by(func.count(Enrollment.id).desc())
        .limit(3)
        .all()
    )
    top_courses = [
        {
            "id": c.id,
            "title": c.title,
            "enrollments": int(count),
        }
        for c, count in top_courses_query
    ]

    return {
        "role": "admin",
        "stats": {
            "users": {
                "total": total_users,
                "students": total_students,
                "teachers": total_teachers,
                "admins": total_admins,
            },
            "courses": {
                "total": total_courses,
                "published": published_courses,
            },
            "exams": {
                "total": total_exams,
                "published": published_exams,
                "pending_manual_grading": pending_grading,
            },
            "enrollments": {
                "total": total_enrollments,
                "completed": completed_enrollments,
            },
            "exam_attempts": {
                "total": total_attempts,
                "average_score_percent": round(avg_score, 2),
            },
        },
        "top_courses": top_courses,
    }


# ============================================================
# Endpoint-uri
# ============================================================

@router.get("/me")
def my_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Returnează dashboard-ul potrivit pentru rolul utilizatorului curent."""
    if PermissionService.is_admin(current_user):
        return _admin_dashboard(db)
    if PermissionService.is_teacher(current_user):
        return _teacher_dashboard(db, current_user)
    return _student_dashboard(db, current_user)


@router.get("/admin")
def admin_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    PermissionService.require_admin(current_user)
    return _admin_dashboard(db)


@router.get("/teacher")
def teacher_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    PermissionService.require_teacher_or_admin(current_user)
    return _teacher_dashboard(db, current_user)


@router.get("/student")
def student_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    PermissionService.require_student(current_user)
    return _student_dashboard(db, current_user)