from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models import User, RoleEnum, Department, Enrollment
from app.models.exam import ExamAttempt, ExamAttemptStatus
from app.schemas.auth import UserResponse
from app.routers.auth import get_current_user

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/", response_model=List[UserResponse])
def get_users(
    token: str,
    db: Session = Depends(get_db),
    role: Optional[str] = None,
    department_id: Optional[int] = None,
):
    """
    Listă utilizatori.
    - Admin: toți (cu filtre opționale role / department_id)
    - Manager: doar din departamentul lui (filtre opționale aplicate peste)
    """
    user = get_current_user(token, db)

    if user.role == RoleEnum.admin:
        q = db.query(User)
    elif user.role == RoleEnum.manager:
        q = db.query(User).filter(User.department_id == user.department_id)
    else:
        raise HTTPException(status_code=403, detail="Acces interzis")

    if role is not None:
        q = q.filter(User.role == role)
    if department_id is not None:
        q = q.filter(User.department_id == department_id)

    return q.all()


@router.get("/{user_id}", response_model=UserResponse)
def get_user(user_id: int, token: str, db: Session = Depends(get_db)):
    current_user = get_current_user(token, db)
    if current_user.role == RoleEnum.student and current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Acces interzis")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Userul nu există")
    return user


@router.put("/{user_id}/reactivate")
def reactivate_user(user_id: int, token: str, db: Session = Depends(get_db)):
    current_user = get_current_user(token, db)
    if current_user.role != RoleEnum.admin:
        raise HTTPException(status_code=403, detail="Acces interzis")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Userul nu există")
    user.is_active = True
    db.commit()
    return {"message": "User reactivat"}


@router.put("/{user_id}")
def update_user(user_id: int, token: str, role: Optional[str] = None,
                department_id: Optional[int] = None, db: Session = Depends(get_db)):
    current_user = get_current_user(token, db)
    if current_user.role != RoleEnum.admin:
        raise HTTPException(status_code=403, detail="Doar adminul poate edita useri")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Userul nu există")
    if role is not None:
        user.role = role
    if department_id is not None:
        user.department_id = department_id
    db.commit()
    db.refresh(user)
    return user


@router.delete("/{user_id}")
def deactivate_user(user_id: int, token: str, db: Session = Depends(get_db)):
    current_user = get_current_user(token, db)
    if current_user.role != RoleEnum.admin:
        raise HTTPException(status_code=403, detail="Acces interzis")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Userul nu există")
    user.is_active = False
    db.commit()
    return {"message": "User dezactivat"}


@router.get("/department/performance")
def department_performance(token: str, db: Session = Depends(get_db)):
    user = get_current_user(token, db)
    if user.role not in (RoleEnum.admin, RoleEnum.manager):
        raise HTTPException(status_code=403, detail="Acces interzis")

    q = db.query(User).filter(User.role == RoleEnum.student)
    if user.role == RoleEnum.manager:
        q = q.filter(User.department_id == user.department_id)
    employees = q.all()

    result = []
    for emp in employees:
        enrollments = db.query(Enrollment).filter(Enrollment.user_id == emp.id).all()
        courses_total = len(enrollments)
        courses_completed = sum(1 for e in enrollments if e.completed)
        avg_progress = (
            round(sum(float(e.progress_percent) for e in enrollments) / courses_total, 1)
            if courses_total else 0.0
        )

        attempts = db.query(ExamAttempt).filter(ExamAttempt.student_id == emp.id).all()
        finished = [a for a in attempts if a.score is not None]
        exams_passed = sum(1 for a in attempts if a.status == ExamAttemptStatus.passed)
        avg_score = (
            round(sum(float(a.score) for a in finished) / len(finished), 1)
            if finished else 0.0
        )

        result.append({
            "id": emp.id,
            "full_name": emp.full_name,
            "email": emp.email,
            "courses_total": courses_total,
            "courses_completed": courses_completed,
            "avg_progress": avg_progress,
            "exams_taken": len(finished),
            "exams_passed": exams_passed,
            "avg_score": avg_score,
        })

    return result