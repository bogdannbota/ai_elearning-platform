"""
Router pentru cursuri.

Endpointuri:
- GET    /courses/                  listă cursuri (filtrat per rol)
- POST   /courses/                  creează curs (admin/manager) - multipart/form-data
- GET    /courses/{id}              detalii curs (cu module + category)
- PUT    /courses/{id}              editează curs (multipart/form-data)
- DELETE /courses/{id}              șterge curs
- POST   /courses/{id}/publish      publică
- POST   /courses/{id}/unpublish    retrage publicarea
- POST   /courses/assign-department asignează departament la curs
"""
import os
import shutil
import uuid

from fastapi import UploadFile
from typing import List, Optional
from decimal import Decimal
from sqlalchemy import or_

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app.models import (
    Course, CourseCategory, CourseModule, DepartmentCourse,
    Department, DifficultyLevel, User,
)
from app.routers.auth import get_current_user
from app.schemas.course import CourseResponse, CourseDetailResponse
from app.services.permission_service import PermissionService

router = APIRouter(prefix="/courses", tags=["Courses"])

UPLOAD_DIR = "uploads"
COVER_DIR = os.path.join(UPLOAD_DIR, "covers")
FILES_DIR = os.path.join(UPLOAD_DIR, "courses")
os.makedirs(COVER_DIR, exist_ok=True)
os.makedirs(FILES_DIR, exist_ok=True)


# ============================================================
# Helpers
# ============================================================

def _save_upload_secure(file: UploadFile, subdir: str) -> str:
    if not file or not file.filename:
        return None

    # Extragem extensia fișierului în siguranță (ex: '.pdf', '.png')
    ext = os.path.splitext(file.filename)[1].lower()

    # Generăm un identificator unic garantat
    safe_name = f"{uuid.uuid4().hex}{ext}"

    # Construim calea
    rel_path = os.path.join(subdir, safe_name)
    full_path = os.path.join("uploads", rel_path)

    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    with open(full_path, "wb") as buf:
        shutil.copyfileobj(file.file, buf)

    return full_path.replace("\\", "/")


def _delete_file_safe(path: Optional[str]) -> None:
    if path and os.path.exists(path):
        try:
            os.remove(path)
        except OSError:
            pass


def _get_course_or_404(db: Session, course_id: int) -> Course:
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Cursul nu există")
    return course


def _set_course_departments(db: Session, course_id: int, department_ids: str) -> None:
    """
    Înlocuiește maparea cursului pe departamente.
    department_ids gol ("") => curs general (fără nicio mapare).
    """
    db.query(DepartmentCourse).filter(DepartmentCourse.course_id == course_id).delete()
    if department_ids and department_ids.strip():
        for raw in department_ids.split(","):
            try:
                dept_id = int(raw.strip())
                if db.query(Department).filter(Department.id == dept_id).first():
                    db.add(DepartmentCourse(course_id=course_id, department_id=dept_id))
            except ValueError:
                continue


# ============================================================
# Endpoint-uri
# ============================================================

@router.get("/", response_model=List[CourseResponse])
def list_courses(
    token: str,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    only_published: bool = False,
    category_id: Optional[int] = None,
):
    """
    Listează cursuri:
    - Admin/Manager: toate
    - Student: doar publicate, filtrate pe departament (Variant A)
    """
    user = get_current_user(token, db)

    query = db.query(Course).options(
        selectinload(Course.category),
        selectinload(Course.departments),
    )

    if category_id is not None:
        query = query.filter(Course.category_id == category_id)

    if PermissionService.is_student(user) or only_published:
        query = query.filter(Course.is_published == True)

    # Variant A: studentul vede un curs DOAR dacă e "general" (fără nicio mapare
    # la departament) SAU dacă e mapat pe departamentul lui.
    if PermissionService.is_student(user):
        mapped_course_ids = db.query(DepartmentCourse.course_id).distinct()
        my_dept_course_ids = (
            db.query(DepartmentCourse.course_id)
            .filter(DepartmentCourse.department_id == user.department_id)
        )
        query = query.filter(
            or_(
                ~Course.id.in_(mapped_course_ids),     # curs general
                Course.id.in_(my_dept_course_ids),     # cursul departamentului meu
            )
        )

    return query.order_by(Course.display_order, Course.created_at.desc()).offset(skip).limit(limit).all()


@router.get("/{course_id}", response_model=CourseDetailResponse)
def get_course(course_id: int, token: str, db: Session = Depends(get_db)):
    """Detalii curs cu module și category incluse."""
    user = get_current_user(token, db)

    course = (
        db.query(Course)
        .options(
            selectinload(Course.category),
            selectinload(Course.modules),
            selectinload(Course.departments),
        )
        .filter(Course.id == course_id)
        .first()
    )
    if not course:
        raise HTTPException(status_code=404, detail="Cursul nu există")

    # Studentul vede doar cursuri publicate
    if PermissionService.is_student(user) and not course.is_published:
        raise HTTPException(status_code=403, detail="Cursul nu este publicat")

    return course


@router.post("/", response_model=CourseResponse, status_code=201)
def create_course(
    token: str,
    db: Session = Depends(get_db),
    title: str = Form(...),
    short_description: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    category_id: Optional[int] = Form(None),
    difficulty_level: str = Form("beginner"),
    duration_minutes: int = Form(0),
    is_published: bool = Form(False),
    display_order: int = Form(0),
    department_ids: str = Form(""),
    file: Optional[UploadFile] = File(None),
    cover_image: Optional[UploadFile] = File(None),
):
    """Creează curs nou. Admin sau manager."""
    user = get_current_user(token, db)
    PermissionService.require_teacher_or_admin(user)

    # Validare difficulty
    try:
        diff_enum = DifficultyLevel(difficulty_level)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"difficulty_level invalid: {difficulty_level}")

    # Validare category dacă e setat
    if category_id is not None:
        cat = db.query(CourseCategory).filter(CourseCategory.id == category_id).first()
        if not cat:
            raise HTTPException(status_code=404, detail="Categoria nu există")

    # Salvăm fișierele cu logica securizată
    file_path = None
    cover_path = None
    if file and file.filename:
        if not file.filename.lower().endswith(".pdf"):
            raise HTTPException(status_code=400, detail="Doar PDF acceptat pentru fișier curs")
        file_path = _save_upload_secure(file, "courses")

    if cover_image and cover_image.filename:
        allowed = (".jpg", ".jpeg", ".png", ".webp", ".gif")
        if not cover_image.filename.lower().endswith(allowed):
            raise HTTPException(status_code=400, detail="Cover trebuie să fie imagine")
        cover_path = _save_upload_secure(cover_image, "covers")

    course = Course(
        title=title,
        short_description=short_description,
        description=description,
        category_id=category_id,
        difficulty_level=diff_enum,
        duration_minutes=duration_minutes,
        is_published=is_published,
        display_order=display_order,
        file_path=file_path,
        cover_image_path=cover_path,
        created_by=user.id,
    )
    db.add(course)
    db.commit()
    db.refresh(course)

    # Asignează departamente dacă au fost trimise (gol => curs general)
    if department_ids.strip():
        _set_course_departments(db, course.id, department_ids)
        db.commit()
        db.refresh(course)

    return course


@router.put("/{course_id}", response_model=CourseResponse)
def update_course(
    course_id: int,
    token: str,
    db: Session = Depends(get_db),
    title: Optional[str] = Form(None),
    short_description: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    category_id: Optional[int] = Form(None),
    difficulty_level: Optional[str] = Form(None),
    duration_minutes: Optional[int] = Form(None),
    is_published: Optional[bool] = Form(None),
    display_order: Optional[int] = Form(None),
    department_ids: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    cover_image: Optional[UploadFile] = File(None),
):
    """Editează curs. Admin oricare, manager doar propriile."""
    user = get_current_user(token, db)
    course = _get_course_or_404(db, course_id)
    PermissionService.require_can_edit_course(user, course)

    if title is not None:
        course.title = title
    if short_description is not None:
        course.short_description = short_description
    if description is not None:
        course.description = description
    if category_id is not None:
        if category_id == 0:
            course.category_id = None
        else:
            if not db.query(CourseCategory).filter(CourseCategory.id == category_id).first():
                raise HTTPException(status_code=404, detail="Categoria nu există")
            course.category_id = category_id
    if difficulty_level is not None:
        try:
            course.difficulty_level = DifficultyLevel(difficulty_level)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"difficulty_level invalid: {difficulty_level}")
    if duration_minutes is not None:
        course.duration_minutes = duration_minutes
    if is_published is not None:
        course.is_published = is_published
    if display_order is not None:
        course.display_order = display_order

    # Înlocuim fișierele dacă au venit altele noi cu logica securizată
    if file and file.filename:
        if not file.filename.lower().endswith(".pdf"):
            raise HTTPException(status_code=400, detail="Doar PDF acceptat")
        _delete_file_safe(course.file_path)
        course.file_path = _save_upload_secure(file, "courses")

    if cover_image and cover_image.filename:
        allowed = (".jpg", ".jpeg", ".png", ".webp", ".gif")
        if not cover_image.filename.lower().endswith(allowed):
            raise HTTPException(status_code=400, detail="Cover trebuie să fie imagine")
        _delete_file_safe(course.cover_image_path)
        course.cover_image_path = _save_upload_secure(cover_image, "covers")

    # Variant A: actualizează maparea pe departamente dacă a fost trimisă.
    # None  => nu atinge maparea existentă.
    # ""    => curs general (șterge toate mapările).
    # "id"  => mapat pe acel departament.
    if department_ids is not None:
        _set_course_departments(db, course_id, department_ids)

    db.commit()
    db.refresh(course)
    return course


@router.delete("/{course_id}", status_code=204)
def delete_course(course_id: int, token: str, db: Session = Depends(get_db)):
    """Șterge curs. Doar admin."""
    user = get_current_user(token, db)
    course = _get_course_or_404(db, course_id)

    if not PermissionService.can_delete_course(user, course):
        raise HTTPException(status_code=403, detail="Doar adminul poate șterge cursuri")

    # Curăță fișiere
    _delete_file_safe(course.file_path)
    _delete_file_safe(course.cover_image_path)

    # Șterge mapările cu departamentele
    db.query(DepartmentCourse).filter(DepartmentCourse.course_id == course_id).delete()

    db.delete(course)
    db.commit()


@router.post("/{course_id}/publish", response_model=CourseResponse)
def publish_course(course_id: int, token: str, db: Session = Depends(get_db)):
    user = get_current_user(token, db)
    course = _get_course_or_404(db, course_id)
    PermissionService.require_can_edit_course(user, course)
    course.is_published = True
    db.commit()
    db.refresh(course)
    return course


@router.post("/{course_id}/unpublish", response_model=CourseResponse)
def unpublish_course(course_id: int, token: str, db: Session = Depends(get_db)):
    user = get_current_user(token, db)
    course = _get_course_or_404(db, course_id)
    PermissionService.require_can_edit_course(user, course)
    course.is_published = False
    db.commit()
    db.refresh(course)
    return course


@router.post("/assign-department")
def assign_department(
    course_id: int,
    department_id: int,
    token: str,
    db: Session = Depends(get_db),
):
    """Înlocuiește departamentele cursului cu cel specificat."""
    user = get_current_user(token, db)
    course = _get_course_or_404(db, course_id)
    PermissionService.require_can_edit_course(user, course)

    if not db.query(Department).filter(Department.id == department_id).first():
        raise HTTPException(status_code=404, detail="Departamentul nu există")

    db.query(DepartmentCourse).filter(DepartmentCourse.course_id == course_id).delete()
    db.add(DepartmentCourse(course_id=course_id, department_id=department_id))
    db.commit()
    return {"message": "Departament asignat cu succes"}