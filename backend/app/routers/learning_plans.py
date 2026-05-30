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

NOTĂ: rutele de student (/my) sunt declarate ÎNAINTEA lui /{plan_id},
altfel FastAPI ar potrivi "my" pe {plan_id} și ar pica cu 422.
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
    Enrollment,
)
from app.models.exam import ExamAttempt, ExamAttemptStatus
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
    MyPlanSummary,
    MyPlanDetail,
    MyPlanItemDetail,
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


# ============================================================
# STUDENT - planuri asignate (cu detalii + progres real)
# IMPORTANT: declarate ÎNAINTEA rutelor /{plan_id}
# ============================================================

def _build_plan_items(db: Session, plan: LearningPlan, student_id: int):
    """Construiește lista de items cu status/progres + recalculează totalul."""
    items_detail = []
    done = 0

    for item in plan.items:
        if item.course_id is not None:
            course = db.query(Course).filter(Course.id == item.course_id).first()
            enr = (
                db.query(Enrollment)
                .filter(
                    Enrollment.user_id == student_id,
                    Enrollment.course_id == item.course_id,
                )
                .first()
            )
            prog = float(enr.progress_percent) if enr and enr.progress_percent else 0.0
            if enr and enr.completed:
                status_ = "done"
                done += 1
            elif prog > 0:
                status_ = "in_progress"
            else:
                status_ = "not_started"

            items_detail.append(MyPlanItemDetail(
                id=item.id, type="course", ref_id=item.course_id,
                title=course.title if course else "Curs șters",
                is_required=item.is_required, display_order=item.display_order,
                status=status_, progress_percent=prog,
            ))

        elif item.exam_id is not None:
            exam = db.query(Exam).filter(Exam.id == item.exam_id).first()
            attempt = (
                db.query(ExamAttempt)
                .filter(
                    ExamAttempt.student_id == student_id,
                    ExamAttempt.exam_id == item.exam_id,
                )
                .order_by(ExamAttempt.started_at.desc())
                .first()
            )
            score = (
                float(attempt.score)
                if attempt and attempt.score is not None else None
            )
            if attempt and attempt.status in (
                ExamAttemptStatus.passed, ExamAttemptStatus.graded
            ):
                status_ = "done"
                done += 1
            elif attempt and attempt.status == ExamAttemptStatus.failed:
                status_ = "failed"
            elif attempt and attempt.status in (
                ExamAttemptStatus.in_progress, ExamAttemptStatus.submitted
            ):
                status_ = "in_progress"
            else:
                status_ = "not_started"

            items_detail.append(MyPlanItemDetail(
                id=item.id, type="exam", ref_id=item.exam_id,
                title=exam.title if exam else "Examen șters",
                is_required=item.is_required, display_order=item.display_order,
                status=status_, score=score,
            ))

    items_detail.sort(key=lambda i: i.display_order)
    total = len(items_detail)
    pct = round((done / total) * 100, 1) if total else 0.0
    return items_detail, total, done, pct


@router.get("/my", response_model=List[MyPlanSummary])
def my_plans(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    PermissionService.require_student(current_user)

    # Variant A: auto-asignează planurile PUBLICATE care țintesc departamentul
    # studentului (dacă nu are deja o asignare). Studenții noi din departament
    # le primesc automat la următoarea încărcare.
    if current_user.department_id:
        dept_plans = (
            db.query(LearningPlan)
            .filter(
                LearningPlan.is_published == True,
                LearningPlan.target_department_id == current_user.department_id,
            )
            .all()
        )
        for plan in dept_plans:
            exists = (
                db.query(LearningPlanAssignment)
                .filter(
                    LearningPlanAssignment.learning_plan_id == plan.id,
                    LearningPlanAssignment.student_id == current_user.id,
                )
                .first()
            )
            if not exists:
                db.add(LearningPlanAssignment(
                    learning_plan_id=plan.id,
                    student_id=current_user.id,
                    assigned_by=plan.created_by,
                ))
        db.commit()

    assignments = (
        db.query(LearningPlanAssignment)
        .filter(LearningPlanAssignment.student_id == current_user.id)
        .order_by(LearningPlanAssignment.assigned_at.desc())
        .all()
    )

    result = []
    for a in assignments:
        plan = a.learning_plan
        _, total, done, pct = _build_plan_items(db, plan, current_user.id)
        a.progress_percent = pct
        a.completed = total > 0 and done == total
        result.append(MyPlanSummary(
            assignment_id=a.id, plan_id=plan.id, title=plan.title,
            description=plan.description, is_mandatory=plan.is_mandatory,
            progress_percent=pct, completed=a.completed,
            items_total=total, items_done=done, assigned_at=a.assigned_at,
        ))
    db.commit()
    return result


@router.get("/my/{assignment_id}", response_model=MyPlanDetail)
def my_plan_detail(
    assignment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    PermissionService.require_student(current_user)

    a = (
        db.query(LearningPlanAssignment)
        .filter(
            LearningPlanAssignment.id == assignment_id,
            LearningPlanAssignment.student_id == current_user.id,
        )
        .first()
    )
    if not a:
        raise HTTPException(
            status_code=404,
            detail="Plan inexistent sau nu îți este asignat.",
        )

    plan = a.learning_plan
    items, total, done, pct = _build_plan_items(db, plan, current_user.id)
    a.progress_percent = pct
    a.completed = total > 0 and done == total
    db.commit()

    return MyPlanDetail(
        assignment_id=a.id, plan_id=plan.id, title=plan.title,
        description=plan.description, is_mandatory=plan.is_mandatory,
        progress_percent=pct, completed=a.completed,
        items_total=total, items_done=done, assigned_at=a.assigned_at,
        items=items,
    )


# ============================================================
# ADMIN / PROFESOR - detalii / editare / ștergere plan
# ============================================================

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