"""
Router pentru module/lecții într-un curs.

Endpoint-uri:
- GET    /courses/{course_id}/modules            listă module
- POST   /courses/{course_id}/modules            creează modul (multipart - opțional cu attachment)
- GET    /courses/modules/{module_id}            detalii modul
- PUT    /courses/modules/{module_id}            editează modul (multipart)
- DELETE /courses/modules/{module_id}            șterge modul
- POST   /courses/modules/{module_id}/reorder    schimbă display_order
"""
import os
import shutil
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Course, CourseModule
from app.routers.auth import get_current_user
from app.schemas.course import CourseModuleResponse
from app.services.permission_service import PermissionService

router = APIRouter(prefix="/courses", tags=["Course Modules"])

UPLOAD_DIR = "uploads"
MODULES_DIR = os.path.join(UPLOAD_DIR, "modules")
os.makedirs(MODULES_DIR, exist_ok=True)


# ============================================================
# Helpers
# ============================================================

def _save_module_attachment(file: UploadFile, module_id: int) -> str:
    safe_name = file.filename.replace(" ", "_")
    rel_path = os.path.join("modules", f"mod{module_id}_{safe_name}")
    full_path = os.path.join(UPLOAD_DIR, rel_path)
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


def _get_module_or_404(db: Session, module_id: int) -> CourseModule:
    mod = db.query(CourseModule).filter(CourseModule.id == module_id).first()
    if not mod:
        raise HTTPException(status_code=404, detail="Modulul nu există")
    return mod


# ============================================================
# Endpoint-uri
# ============================================================

@router.get("/{course_id}/modules", response_model=List[CourseModuleResponse])
def list_modules(course_id: int, token: str, db: Session = Depends(get_db)):
    """Listă module pentru un curs."""
    user = get_current_user(token, db)
    course = _get_course_or_404(db, course_id)

    # Studentul vede module doar dacă cursul e publicat
    if PermissionService.is_student(user) and not course.is_published:
        raise HTTPException(status_code=403, detail="Cursul nu este publicat")

    return (
        db.query(CourseModule)
        .filter(CourseModule.course_id == course_id)
        .order_by(CourseModule.display_order)
        .all()
    )


@router.get("/modules/{module_id}", response_model=CourseModuleResponse)
def get_module(module_id: int, token: str, db: Session = Depends(get_db)):
    user = get_current_user(token, db)
    mod = _get_module_or_404(db, module_id)

    course = _get_course_or_404(db, mod.course_id)
    if PermissionService.is_student(user) and not course.is_published:
        raise HTTPException(status_code=403, detail="Cursul nu este publicat")

    return mod


@router.post(
    "/{course_id}/modules",
    response_model=CourseModuleResponse,
    status_code=201,
)
def create_module(
    course_id: int,
    token: str,
    db: Session = Depends(get_db),
    title: str = Form(...),
    content: Optional[str] = Form(None),
    video_url: Optional[str] = Form(None),
    display_order: Optional[int] = Form(None),
    duration_minutes: int = Form(0),
    attachment: Optional[UploadFile] = File(None),
):
    user = get_current_user(token, db)
    course = _get_course_or_404(db, course_id)
    PermissionService.require_can_edit_course(user, course)

    # Calculează display_order automat dacă nu e setat
    if display_order is None:
        last_order = (
            db.query(CourseModule)
            .filter(CourseModule.course_id == course_id)
            .count()
        )
        display_order = last_order + 1

    mod = CourseModule(
        course_id=course_id,
        title=title,
        content=content,
        video_url=video_url,
        display_order=display_order,
        duration_minutes=duration_minutes,
    )
    db.add(mod)
    db.flush()  # avem mod.id pentru attachment

    if attachment and attachment.filename:
        mod.attachment_path = _save_module_attachment(attachment, mod.id)

    db.commit()
    db.refresh(mod)
    return mod


@router.put("/modules/{module_id}", response_model=CourseModuleResponse)
def update_module(
    module_id: int,
    token: str,
    db: Session = Depends(get_db),
    title: Optional[str] = Form(None),
    content: Optional[str] = Form(None),
    video_url: Optional[str] = Form(None),
    display_order: Optional[int] = Form(None),
    duration_minutes: Optional[int] = Form(None),
    attachment: Optional[UploadFile] = File(None),
    remove_attachment: bool = Form(False),
):
    user = get_current_user(token, db)
    mod = _get_module_or_404(db, module_id)
    course = _get_course_or_404(db, mod.course_id)
    PermissionService.require_can_edit_course(user, course)

    if title is not None:
        mod.title = title
    if content is not None:
        mod.content = content
    if video_url is not None:
        # Pentru a permite ștergerea video_url-ului, frontend-ul trimite string gol
        mod.video_url = video_url if video_url else None
    if display_order is not None:
        mod.display_order = display_order
    if duration_minutes is not None:
        mod.duration_minutes = duration_minutes

    if remove_attachment:
        _delete_file_safe(mod.attachment_path)
        mod.attachment_path = None

    if attachment and attachment.filename:
        _delete_file_safe(mod.attachment_path)
        mod.attachment_path = _save_module_attachment(attachment, mod.id)

    db.commit()
    db.refresh(mod)
    return mod


@router.delete("/modules/{module_id}", status_code=204)
def delete_module(module_id: int, token: str, db: Session = Depends(get_db)):
    user = get_current_user(token, db)
    mod = _get_module_or_404(db, module_id)
    course = _get_course_or_404(db, mod.course_id)
    PermissionService.require_can_edit_course(user, course)

    _delete_file_safe(mod.attachment_path)
    db.delete(mod)
    db.commit()


@router.post("/modules/{module_id}/reorder", response_model=CourseModuleResponse)
def reorder_module(
    module_id: int,
    new_order: int,
    token: str,
    db: Session = Depends(get_db),
):
    """Schimbă display_order al unui modul."""
    user = get_current_user(token, db)
    mod = _get_module_or_404(db, module_id)
    course = _get_course_or_404(db, mod.course_id)
    PermissionService.require_can_edit_course(user, course)

    mod.display_order = new_order
    db.commit()
    db.refresh(mod)
    return mod