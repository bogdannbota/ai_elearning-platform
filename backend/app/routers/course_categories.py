"""
Router pentru categorii de cursuri.

Endpoint-uri:
- GET    /course-categories/         listă (toți utilizatorii autentificați)
- POST   /course-categories/         creează (admin/manager)
- GET    /course-categories/{id}     detalii
- PUT    /course-categories/{id}     editează (admin/manager)
- DELETE /course-categories/{id}     șterge (admin)
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import CourseCategory, Course
from app.routers.auth import get_current_user
from app.schemas.course import (
    CourseCategoryCreate,
    CourseCategoryUpdate,
    CourseCategoryResponse,
)
from app.services.permission_service import PermissionService

router = APIRouter(prefix="/course-categories", tags=["Course Categories"])


@router.get("/", response_model=List[CourseCategoryResponse])
def list_categories(token: str, db: Session = Depends(get_db)):
    """Listă categorii - oricine autentificat."""
    get_current_user(token, db)
    return (
        db.query(CourseCategory)
        .order_by(CourseCategory.display_order, CourseCategory.name)
        .all()
    )


@router.get("/{category_id}", response_model=CourseCategoryResponse)
def get_category(category_id: int, token: str, db: Session = Depends(get_db)):
    get_current_user(token, db)
    cat = db.query(CourseCategory).filter(CourseCategory.id == category_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Categoria nu există")
    return cat


@router.post("/", response_model=CourseCategoryResponse, status_code=201)
def create_category(
    data: CourseCategoryCreate,
    token: str,
    db: Session = Depends(get_db),
):
    user = get_current_user(token, db)
    PermissionService.require_teacher_or_admin(user)

    existing = db.query(CourseCategory).filter(CourseCategory.name == data.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Există deja o categorie cu acest nume")

    cat = CourseCategory(**data.model_dump())
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return cat


@router.put("/{category_id}", response_model=CourseCategoryResponse)
def update_category(
    category_id: int,
    data: CourseCategoryUpdate,
    token: str,
    db: Session = Depends(get_db),
):
    user = get_current_user(token, db)
    PermissionService.require_teacher_or_admin(user)

    cat = db.query(CourseCategory).filter(CourseCategory.id == category_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Categoria nu există")

    update_data = data.model_dump(exclude_unset=True)

    # Verificăm unicitatea numelui dacă se schimbă
    if "name" in update_data and update_data["name"] != cat.name:
        existing = (
            db.query(CourseCategory)
            .filter(CourseCategory.name == update_data["name"])
            .first()
        )
        if existing:
            raise HTTPException(status_code=400, detail="Există deja o categorie cu acest nume")

    for key, value in update_data.items():
        setattr(cat, key, value)

    db.commit()
    db.refresh(cat)
    return cat


@router.delete("/{category_id}", status_code=204)
def delete_category(category_id: int, token: str, db: Session = Depends(get_db)):
    """Șterge categorie. Doar admin. Cursurile asociate rămân, dar category_id devine null."""
    user = get_current_user(token, db)
    PermissionService.require_admin(user)

    cat = db.query(CourseCategory).filter(CourseCategory.id == category_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Categoria nu există")

    # Curățăm referințele din cursuri
    db.query(Course).filter(Course.category_id == category_id).update(
        {"category_id": None}
    )

    db.delete(cat)
    db.commit()