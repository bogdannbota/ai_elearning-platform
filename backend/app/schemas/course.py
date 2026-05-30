"""
Schemas Pydantic pentru cursuri.
"""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field

from app.models import DifficultyLevel


# ============================================================
# CourseCategory
# ============================================================

class CourseCategoryBase(BaseModel):
    name: str
    description: Optional[str] = None
    display_order: int = 0
    is_published: bool = True


class CourseCategoryCreate(CourseCategoryBase):
    pass


class CourseCategoryUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    display_order: Optional[int] = None
    is_published: Optional[bool] = None


class CourseCategoryResponse(CourseCategoryBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


# ============================================================
# CourseModule (lecții în curs)
# ============================================================

class CourseModuleBase(BaseModel):
    title: str
    content: Optional[str] = None
    video_url: Optional[str] = None
    attachment_path: Optional[str] = None
    display_order: int = 0
    duration_minutes: int = 0


class CourseModuleCreate(CourseModuleBase):
    pass


class CourseModuleUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    video_url: Optional[str] = None
    attachment_path: Optional[str] = None
    display_order: Optional[int] = None
    duration_minutes: Optional[int] = None


class CourseModuleResponse(CourseModuleBase):
    id: int
    course_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ============================================================
# Course
# ============================================================

class CourseBase(BaseModel):
    title: str = Field(..., min_length=3, max_length=255)
    short_description: Optional[str] = None
    description: Optional[str] = None
    category_id: Optional[int] = None
    difficulty_level: DifficultyLevel = DifficultyLevel.beginner
    duration_minutes: int = 0
    is_published: bool = False
    display_order: int = 0


class CourseCreate(CourseBase):
    pass


class CourseUpdate(BaseModel):
    title: Optional[str] = None
    short_description: Optional[str] = None
    description: Optional[str] = None
    category_id: Optional[int] = None
    difficulty_level: Optional[DifficultyLevel] = None
    duration_minutes: Optional[int] = None
    is_published: Optional[bool] = None
    display_order: Optional[int] = None


class CourseResponse(CourseBase):
    id: int
    file_path: Optional[str] = None
    cover_image_path: Optional[str] = None
    created_by: int
    created_at: datetime
    updated_at: datetime
    # Variant A: departamentul mapat (None = curs general, vizibil tuturor).
    # Citit din proprietatea Course.department_id (vezi models/course.py).
    department_id: Optional[int] = None

    class Config:
        from_attributes = True


class CourseDetailResponse(CourseResponse):
    """Curs cu lista de module incluse."""
    modules: List[CourseModuleResponse] = []
    category: Optional[CourseCategoryResponse] = None

    class Config:
        from_attributes = True


# ============================================================
# Enrollment & Progress
# ============================================================

class EnrollmentResponse(BaseModel):
    id: int
    user_id: int
    course_id: int
    progress_percent: float
    completed: bool
    started_at: datetime
    completed_at: Optional[datetime] = None
    last_accessed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ModuleProgressUpdate(BaseModel):
    """Pentru a marca un modul ca finalizat."""
    is_completed: bool = True
    time_spent_seconds: int = 0


class ModuleProgressResponse(BaseModel):
    id: int
    enrollment_id: int
    module_id: int
    is_completed: bool
    time_spent_seconds: int
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True