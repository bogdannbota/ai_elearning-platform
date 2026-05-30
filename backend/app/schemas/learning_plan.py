"""
Schemas Pydantic pentru planuri de învățare.
"""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, validator


# ============================================================
# LearningPlanItem
# ============================================================

class LearningPlanItemBase(BaseModel):
    course_id: Optional[int] = None
    exam_id: Optional[int] = None
    display_order: int = 0
    is_required: bool = True
    unlock_after_item_id: Optional[int] = None

    @validator("exam_id", always=True)
    def validate_one_of_course_or_exam(cls, v, values):
        course_id = values.get("course_id")
        if course_id is None and v is None:
            raise ValueError("Trebuie specificat fie course_id, fie exam_id.")
        if course_id is not None and v is not None:
            raise ValueError("Un item poate fi DOAR curs SAU examen, nu ambele.")
        return v


class LearningPlanItemCreate(LearningPlanItemBase):
    pass


class LearningPlanItemUpdate(BaseModel):
    display_order: Optional[int] = None
    is_required: Optional[bool] = None
    unlock_after_item_id: Optional[int] = None


class LearningPlanItemResponse(LearningPlanItemBase):
    id: int
    learning_plan_id: int

    class Config:
        from_attributes = True


# ============================================================
# LearningPlan
# ============================================================

class LearningPlanBase(BaseModel):
    title: str = Field(..., min_length=3, max_length=255)
    description: Optional[str] = None
    target_department_id: Optional[int] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    is_mandatory: bool = False
    is_published: bool = False


class LearningPlanCreate(LearningPlanBase):
    pass


class LearningPlanUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    target_department_id: Optional[int] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    is_mandatory: Optional[bool] = None
    is_published: Optional[bool] = None


class LearningPlanResponse(LearningPlanBase):
    id: int
    created_by: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class LearningPlanDetailResponse(LearningPlanResponse):
    """Plan cu toate items-urile incluse."""
    items: List[LearningPlanItemResponse] = []

    class Config:
        from_attributes = True


# ============================================================
# Assignments
# ============================================================

class LearningPlanAssignmentCreate(BaseModel):
    """Asignează un plan unui student (sau mai multor studenți)."""
    learning_plan_id: int
    student_ids: List[int] = Field(..., min_items=1)


class LearningPlanAssignmentResponse(BaseModel):
    id: int
    learning_plan_id: int
    student_id: int
    assigned_by: int
    progress_percent: float
    completed: bool
    assigned_at: datetime
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True




# ============================================================
# STUDENT - vizualizare plan cu progres real
# ============================================================

class MyPlanItemDetail(BaseModel):
    id: int                          # id-ul item-ului din plan
    type: str                        # "course" sau "exam"
    ref_id: int                      # course_id sau exam_id
    title: str
    is_required: bool
    display_order: int
    status: str                      # not_started | in_progress | done | failed
    progress_percent: float = 0.0    # relevant pentru cursuri
    score: Optional[float] = None    # relevant pentru examene

    class Config:
        from_attributes = True


class MyPlanSummary(BaseModel):
    assignment_id: int
    plan_id: int
    title: str
    description: Optional[str] = None
    is_mandatory: bool
    progress_percent: float
    completed: bool
    items_total: int
    items_done: int
    assigned_at: datetime

    class Config:
        from_attributes = True


class MyPlanDetail(MyPlanSummary):
    items: List[MyPlanItemDetail] = []