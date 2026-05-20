"""
Service centralizat pentru verificarea permisiunilor.

Mapping roluri:
    admin   = Admin (acces total)
    manager = Profesor (creează conținut, corectează examene)
    student = Cursant (parcurge conținut, susține examene)
"""
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models import User, RoleEnum, Course, Exam, LearningPlan


class PermissionService:
    """Service pentru verificarea drepturilor de acces."""

    # --- Verificări de bază pe rol ---

    @staticmethod
    def is_admin(user: User) -> bool:
        return user.role == RoleEnum.admin

    @staticmethod
    def is_teacher(user: User) -> bool:
        return user.role == RoleEnum.manager

    @staticmethod
    def is_student(user: User) -> bool:
        return user.role == RoleEnum.student

    @staticmethod
    def can_create_content(user: User) -> bool:
        """Admin și Profesor pot crea cursuri, examene, planuri."""
        return user.role in (RoleEnum.admin, RoleEnum.manager)

    # --- Guards (ridică HTTPException dacă nu ai dreptul) ---

    @staticmethod
    def require_admin(user: User) -> None:
        if not PermissionService.is_admin(user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Acces interzis. Necesită rol de Admin.",
            )

    @staticmethod
    def require_teacher_or_admin(user: User) -> None:
        if not PermissionService.can_create_content(user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Acces interzis. Necesită rol de Admin sau Profesor.",
            )

    @staticmethod
    def require_student(user: User) -> None:
        if not PermissionService.is_student(user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Acțiune permisă doar studenților.",
            )

    # --- Ownership checks (pe entități specifice) ---

    @staticmethod
    def can_edit_course(user: User, course: Course) -> bool:
        """
        Admin poate edita orice curs.
        Profesorul poate edita doar cursurile create de el.
        """
        if PermissionService.is_admin(user):
            return True
        if PermissionService.is_teacher(user) and course.created_by == user.id:
            return True
        return False

    @staticmethod
    def require_can_edit_course(user: User, course: Course) -> None:
        if not PermissionService.can_edit_course(user, course):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Nu aveți permisiunea să editați acest curs.",
            )

    @staticmethod
    def can_delete_course(user: User, course: Course) -> bool:
        """Doar Admin poate șterge cursuri."""
        return PermissionService.is_admin(user)

    @staticmethod
    def can_edit_exam(user: User, exam: Exam) -> bool:
        if PermissionService.is_admin(user):
            return True
        if PermissionService.is_teacher(user) and exam.created_by == user.id:
            return True
        return False

    @staticmethod
    def require_can_edit_exam(user: User, exam: Exam) -> None:
        if not PermissionService.can_edit_exam(user, exam):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Nu aveți permisiunea să editați acest examen.",
            )

    @staticmethod
    def can_grade_exam(user: User, exam: Exam) -> bool:
        """
        Cine poate corecta examene cu OpenText:
        - Admin: orice examen
        - Profesor: doar examenele create de el
        """
        return PermissionService.can_edit_exam(user, exam)

    @staticmethod
    def can_edit_learning_plan(user: User, plan: LearningPlan) -> bool:
        if PermissionService.is_admin(user):
            return True
        if PermissionService.is_teacher(user) and plan.created_by == user.id:
            return True
        return False

    @staticmethod
    def require_can_edit_learning_plan(user: User, plan: LearningPlan) -> None:
        if not PermissionService.can_edit_learning_plan(user, plan):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Nu aveți permisiunea să editați acest plan de învățare.",
            )