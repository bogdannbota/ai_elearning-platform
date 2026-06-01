from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel
from datetime import datetime
from app.database import get_db
from app.models import RoleEnum, Enrollment, Course
from app.routers.auth import get_current_user

router = APIRouter(prefix="/progress", tags=["Progress"])

class EnrollmentResponse(BaseModel):
    id: int
    user_id: int
    course_id: int
    progress_percent: float
    completed: bool

    class Config:
        from_attributes = True

class ProgressUpdate(BaseModel):
    progress_percent: float

@router.post("/enroll/{course_id}", response_model=EnrollmentResponse, status_code=201)
def enroll(course_id: int, token: str, db: Session = Depends(get_db)):
    user = get_current_user(token, db)
    
    existing = db.query(Enrollment).filter(
        Enrollment.user_id == user.id,
        Enrollment.course_id == course_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Ești deja înscris la acest curs")
    
    enrollment = Enrollment(user_id=user.id, course_id=course_id)
    db.add(enrollment)
    db.commit()
    db.refresh(enrollment)
    return enrollment

@router.put("/update/{course_id}", response_model=EnrollmentResponse)
def update_progress(course_id: int, data: ProgressUpdate, token: str, db: Session = Depends(get_db)):
    user = get_current_user(token, db)
    
    enrollment = db.query(Enrollment).filter(
        Enrollment.user_id == user.id,
        Enrollment.course_id == course_id
    ).first()
    if not enrollment:
        raise HTTPException(status_code=404, detail="Nu ești înscris la acest curs")
    
    enrollment.progress_percent = data.progress_percent
    if data.progress_percent >= 100:
        enrollment.completed = True
        enrollment.completed_at = datetime.utcnow()
    
    db.commit()
    db.refresh(enrollment)
    return enrollment

@router.get("/my-courses", response_model=List[EnrollmentResponse])
def my_courses(token: str, db: Session = Depends(get_db)):
    user = get_current_user(token, db)
    return db.query(Enrollment).filter(Enrollment.user_id == user.id).all()

@router.get("/admin/all", response_model=List[EnrollmentResponse])
def all_progress(token: str, db: Session = Depends(get_db)):
    user = get_current_user(token, db)

    if user.role == RoleEnum.admin:
        return db.query(Enrollment).all()

    if user.role == RoleEnum.manager:
        # doar înscrierile la cursurile create de el
        course_ids = [
            c.id for c in db.query(Course).filter(Course.created_by == user.id).all()
        ]
        if not course_ids:
            return []
        return db.query(Enrollment).filter(Enrollment.course_id.in_(course_ids)).all()

    raise HTTPException(status_code=403, detail="Acces interzis")

@router.get("/admin/user/{user_id}", response_model=List[EnrollmentResponse])
def user_progress(user_id: int, token: str, db: Session = Depends(get_db)):
    user = get_current_user(token, db)
    if user.role not in [RoleEnum.admin, RoleEnum.manager]:
        raise HTTPException(status_code=403, detail="Acces interzis")
    return db.query(Enrollment).filter(Enrollment.user_id == user_id).all()
