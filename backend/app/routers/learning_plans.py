"""
Router pentru planuri de învățare.

Endpoint-uri:
- ADMIN/PROFESOR:
    GET    /learning-plans/                       listă (toate / ale lui)
    POST   /learning-plans/                       creează
    GET    /learning-plans/{id}                   detalii (cu items)
    PUT    /learning-plans/{id}                   editează
    DELETE /learning-plans/{id}                   șterge

    POST   /learning-plans/{id}/items             adaugă curs/examen în plan
    PUT    /learning-plans/{id}/items/{iid}       editează item
    DELETE /learning-plans/{id}/items/{iid}       șterge item

    POST   /learning-plans/{id}/assign            asignează plan la studenți

- STUDENT:
    GET    /learning-plans/my                     planurile asignate mie
    GET    /learning-plans/my/{aid}               detalii (cu progres)
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models import (
    LearningPlan,
    LearningPlanItem,
    LearningPlanAssignment,
    User,
    Course,
    Exam,
)
from app.routers.auth import get_current_user
from app.schemas.learning_plan import (
    LearningPlanCreate,
    LearningPlanUpdate,
    LearningPlanResponse,
    LearningPlanDetailResponse,
    LearningPlanItemCreate,
    LearningPlanItemUpdate,
    LearningPlanItemResponse,
    LearningPlanAssignmentCreate,
    LearningPlanAssignmentResponse,
)
from app.services.permission_service import PermissionService

router = APIRouter(prefix="/learning-plans", tags=["learning-plans"])


# ============================================================
# ADMIN / PROFESOR - CRUD planuri
# ============================================================

@router.get("/", response_model=List[LearningPlanResponse])
def list_plans(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    PermissionService.require_teacher_or_admin(current_user)

    query = db.query(LearningPlan)
    if PermissionService.is_teacher(current_user):
        query = query.filter(LearningPlan.created_by == current_user.id)

    return query.order_by(LearningPlan.created_at.desc()).all()


@router.post(
    "/",
    response_model=LearningPlanResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_plan(
    payload: LearningPlanCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    PermissionService.require_teacher_or_admin(current_user)

    plan = LearningPlan(
        **payload.model_dump(),
        created_by=current_user.id,
    )
    db.add(plan)
    db.commit()
    db.refresh(plan)
    return plan


@router.get("/{plan_id}", response_model=LearningPlanDetailResponse)
def get_plan(
    plan_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    PermissionService.require_teacher_or_admin(current_user)

    plan = (
        db.query(LearningPlan)
        .options(joinedload(LearningPlan.items))
        .filter(LearningPlan.id == plan_id)
        .first()
    )
    if not plan:
        raise HTTPException(status_code=404, detail="Plan inexistent.")

    PermissionService.require_can_edit_learning_plan(current_user, plan)
    return plan


@router.put("/{plan_id}", response_model=LearningPlanResponse)
def update_plan(
    plan_id: int,
    payload: LearningPlanUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    plan = db.query(LearningPlan).filter(LearningPlan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan inexistent.")

    PermissionService.require_can_edit_learning_plan(current_user, plan)

    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(plan, key, value)

    db.commit()
    db.refresh(plan)
    return plan


@router.delete("/{plan_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_plan(
    plan_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    plan = db.query(LearningPlan).filter(LearningPlan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan inexistent.")

    PermissionService.require_can_edit_learning_plan(current_user, plan)

    db.delete(plan)  # cascade va șterge items și assignments
    db.commit()
    return None


# ============================================================
# Items în plan
# ============================================================

@router.post(
    "/{plan_id}/items",
    response_model=LearningPlanItemResponse,
    status_code=status.HTTP_201_CREATED,
)
def add_item(
    plan_id: int,
    payload: LearningPlanItemCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    plan = db.query(LearningPlan).filter(LearningPlan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan inexistent.")
    PermissionService.require_can_edit_learning_plan(current_user, plan)

    # Verifică existența cursului/examenului
    if payload.course_id:
        if not db.query(Course).filter(Course.id == payload.course_id).first():
            raise HTTPException(status_code=404, detail="Curs inexistent.")
    if payload.exam_id:
        if not db.query(Exam).filter(Exam.id == payload.exam_id).first():
            raise HTTPException(status_code=404, detail="Examen inexistent.")

    item = LearningPlanItem(learning_plan_id=plan_id, **payload.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.put(
    "/{plan_id}/items/{item_id}",
    response_model=LearningPlanItemResponse,
)
def update_item(
    plan_id: int,
    item_id: int,
    payload: LearningPlanItemUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    plan = db.query(LearningPlan).filter(LearningPlan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan inexistent.")
    PermissionService.require_can_edit_learning_plan(current_user, plan)

    item = (
        db.query(LearningPlanItem)
        .filter(
            LearningPlanItem.id == item_id,
            LearningPlanItem.learning_plan_id == plan_id,
        )
        .first()
    )
    if not item:
        raise HTTPException(status_code=404, detail="Item inexistent.")

    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(item, key, value)

    db.commit()
    db.refresh(item)
    return item


@router.delete(
    "/{plan_id}/items/{item_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_item(
    plan_id: int,
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    plan = db.query(LearningPlan).filter(LearningPlan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan inexistent.")
    PermissionService.require_can_edit_learning_plan(current_user, plan)

    item = (
        db.query(LearningPlanItem)
        .filter(
            LearningPlanItem.id == item_id,
            LearningPlanItem.learning_plan_id == plan_id,
        )
        .first()
    )
    if not item:
        raise HTTPException(status_code=404, detail="Item inexistent.")

    db.delete(item)
    db.commit()
    return None


# ============================================================
# Asignare la studenți
# ============================================================

@router.post(
    "/{plan_id}/assign",
    response_model=List[LearningPlanAssignmentResponse],
    status_code=status.HTTP_201_CREATED,
)
def assign_plan_to_students(
    plan_id: int,
    payload: LearningPlanAssignmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    plan = db.query(LearningPlan).filter(LearningPlan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan inexistent.")
    PermissionService.require_can_edit_learning_plan(current_user, plan)

    assignments = []
    for student_id in payload.student_ids:
        # Verifică că e student
        student = (
            db.query(User)
            .filter(User.id == student_id)
            .first()
        )
        if not student or not PermissionService.is_student(student):
            continue  # ignoră dacă nu există sau nu e student

        # Verifică dacă există deja
        existing = (
            db.query(LearningPlanAssignment)
            .filter(
                LearningPlanAssignment.learning_plan_id == plan_id,
                LearningPlanAssignment.student_id == student_id,
            )
            .first()
        )
        if existing:
            assignments.append(existing)
            continue

        a = LearningPlanAssignment(
            learning_plan_id=plan_id,
            student_id=student_id,
            assigned_by=current_user.id,
        )
        db.add(a)
        assignments.append(a)

    db.commit()
    for a in assignments:
        db.refresh(a)

    return assignments


# ============================================================
# STUDENT - planuri asignate
# ============================================================

@router.get("/my", response_model=List[LearningPlanAssignmentResponse])
def my_plans(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    PermissionService.require_student(current_user)

    return (
        db.query(LearningPlanAssignment)
        .filter(LearningPlanAssignment.student_id == current_user.id)
        .order_by(LearningPlanAssignment.assigned_at.desc())
        .all()
    )