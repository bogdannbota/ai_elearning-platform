from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from app.database import get_db
from app.models import Course, DepartmentCourse, RoleEnum, Department
from app.routers.auth import get_current_user
import shutil
import os

router = APIRouter(prefix="/courses", tags=["Courses"])

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

class CourseResponse(BaseModel):
    id: int
    title: str
    description: Optional[str]
    file_path: Optional[str]
    created_by: int
    department_id: Optional[int] = None
    department_name: Optional[str] = None

    class Config:
        from_attributes = True

@router.post("/", response_model=CourseResponse, status_code=201)
def create_course(
    title: str,
    description: Optional[str] = None,
    department_ids: str = "",
    token: str = "",
    file: UploadFile = File(None),
    db: Session = Depends(get_db)
):
    user = get_current_user(token, db)
    if user.role != RoleEnum.admin:
        raise HTTPException(status_code=403, detail="Doar adminul poate crea cursuri")

    file_path = None
    if file and file.filename:
        if not file.filename.endswith(".pdf"):
            raise HTTPException(status_code=400, detail="Doar fișiere PDF sunt acceptate")
        safe_filename = f"{title.replace(' ', '_')}_{file.filename}"
        file_path = f"{UPLOAD_DIR}/{safe_filename}"
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

    course = Course(
        title=title,
        description=description,
        file_path=file_path,
        created_by=user.id
    )
    db.add(course)
    db.commit()
    db.refresh(course)

    if department_ids:
        for dept_id in department_ids.split(","):
            try:
                dc = DepartmentCourse(department_id=int(dept_id.strip()), course_id=course.id)
                db.add(dc)
            except:
                pass
        db.commit()

    return _build_course_response(course, db)

@router.get("/", response_model=List[CourseResponse])
def get_courses(token: str, db: Session = Depends(get_db)):
    user = get_current_user(token, db)

    if user.role == RoleEnum.admin:
        courses = db.query(Course).all()
    else:
        dept_courses = db.query(DepartmentCourse).filter(
            DepartmentCourse.department_id == user.department_id
        ).all()
        course_ids = [dc.course_id for dc in dept_courses]
        courses = db.query(Course).filter(Course.id.in_(course_ids)).all()

    return [_build_course_response(c, db) for c in courses]

@router.post("/assign-department")
def assign_department(course_id: int, department_id: int, token: str, db: Session = Depends(get_db)):
    user = get_current_user(token, db)
    if user.role != RoleEnum.admin:
        raise HTTPException(status_code=403, detail="Acces interzis")

    db.query(DepartmentCourse).filter(DepartmentCourse.course_id == course_id).delete()
    dc = DepartmentCourse(course_id=course_id, department_id=department_id)
    db.add(dc)
    db.commit()
    return {"message": "Departament asignat cu succes"}

@router.get("/{course_id}", response_model=CourseResponse)
def get_course(course_id: int, token: str, db: Session = Depends(get_db)):
    user = get_current_user(token, db)
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Cursul nu există")
    return _build_course_response(course, db)

@router.delete("/{course_id}", status_code=204)
def delete_course(course_id: int, token: str, db: Session = Depends(get_db)):
    user = get_current_user(token, db)
    if user.role != RoleEnum.admin:
        raise HTTPException(status_code=403, detail="Doar adminul poate șterge cursuri")

    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Cursul nu există")

    if course.file_path and os.path.exists(course.file_path):
        os.remove(course.file_path)

    db.query(DepartmentCourse).filter(DepartmentCourse.course_id == course_id).delete()
    db.delete(course)
    db.commit()

def _build_course_response(course, db):
    dc = db.query(DepartmentCourse).filter(DepartmentCourse.course_id == course.id).first()
    dept_name = None
    dept_id = None
    if dc:
        dept = db.query(Department).filter(Department.id == dc.department_id).first()
        dept_name = dept.name if dept else None
        dept_id = dc.department_id
    return CourseResponse(
        id=course.id,
        title=course.title,
        description=course.description,
        file_path=course.file_path,
        created_by=course.created_by,
        department_id=dept_id,
        department_name=dept_name
    )
