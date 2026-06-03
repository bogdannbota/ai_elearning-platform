"""
Modele pentru cursuri:
- CourseCategory: categorii (Tehnic, Business, etc.)
- Course: cursul propriu-zis (extins față de versiunea inițială)
- CourseModule: lecții/capitole în curs
- DepartmentCourse: link many-to-many curs <-> departament
- CourseStudent: vizibilitate explicită pe elevi (subset al departamentului)
- Enrollment: înscrierea unui student la un curs
- CourseModuleProgress: tracking per modul per student
"""
import enum
from sqlalchemy import (
    Column, Integer, String, Boolean, ForeignKey, Enum,
    DateTime, Float, Text
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class DifficultyLevel(str, enum.Enum):
    beginner = "beginner"
    intermediate = "intermediate"
    advanced = "advanced"
    expert = "expert"


class CourseCategory(Base):
    """Categorii de cursuri (Tehnic, Business, Office365, etc.)."""
    __tablename__ = "course_categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    description = Column(String, nullable=True)
    display_order = Column(Integer, default=0)
    is_published = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    courses = relationship("Course", back_populates="category")


class Course(Base):
    """Cursul - extins față de versiunea inițială."""
    __tablename__ = "courses"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    short_description = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    
    # Categoria și nivelul
    category_id = Column(Integer, ForeignKey("course_categories.id"), nullable=True)
    difficulty_level = Column(
        Enum(DifficultyLevel),
        default=DifficultyLevel.beginner,
        nullable=False
    )
    
    # Resurse (fișier general atașat cursului - opțional, lecțiile au și ele resurse)
    file_path = Column(String, nullable=True)
    cover_image_path = Column(String, nullable=True)
    
    # Durată estimată
    duration_minutes = Column(Integer, default=0)
    
    # Stare publicare
    is_published = Column(Boolean, default=False, nullable=False)
    display_order = Column(Integer, default=0)
    
    # Audit
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now()
    )

    # Relationships
    category = relationship("CourseCategory", back_populates="courses")
    creator = relationship("User", foreign_keys=[created_by])
    modules = relationship(
        "CourseModule",
        back_populates="course",
        cascade="all, delete-orphan",
        order_by="CourseModule.display_order"
    )

    @property
    def department_id(self):
        """Primul departament mapat (Variant A: un curs = un departament)."""
        return self.departments[0].department_id if self.departments else None

    @property
    def student_ids(self):
        """Elevii cu vizibilitate explicită. Gol => tot departamentul mapat vede cursul."""
        return [cs.student_id for cs in self.student_visibility]

    departments = relationship("DepartmentCourse", back_populates="course")
    student_visibility = relationship("CourseStudent", back_populates="course")
    enrollments = relationship("Enrollment", back_populates="course")


class CourseModule(Base):
    """
    Lecție/capitol în curs.
    Un curs poate avea mai multe module ordonate.
    """
    __tablename__ = "course_modules"

    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    
    title = Column(String, nullable=False)
    content = Column(Text, nullable=True)        # HTML content / rich text
    video_url = Column(String, nullable=True)    # link video YouTube/Vimeo/etc.
    attachment_path = Column(String, nullable=True)  # PDF/document atașat
    
    display_order = Column(Integer, default=0, nullable=False)
    duration_minutes = Column(Integer, default=0)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now()
    )

    # Relationships
    course = relationship("Course", back_populates="modules")
    progress_records = relationship(
        "CourseModuleProgress",
        back_populates="module",
        cascade="all, delete-orphan"
    )


class DepartmentCourse(Base):
    """Many-to-many între cursuri și departamente."""
    __tablename__ = "department_courses"

    id = Column(Integer, primary_key=True, index=True)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=False)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)

    # Relationships
    department = relationship("Department", foreign_keys=[department_id])
    course = relationship("Course", back_populates="departments")


class CourseStudent(Base):
    """
    Vizibilitate explicită pe elevi: doar acești elevi văd cursul (subset al departamentului).
    Dacă un curs nu are nicio intrare aici, îl vede tot departamentul mapat (comportament implicit).
    """
    __tablename__ = "course_students"

    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Relationships
    course = relationship("Course", back_populates="student_visibility")
    student = relationship("User", foreign_keys=[student_id])


class Enrollment(Base):
    """Înscrierea unui student la un curs."""
    __tablename__ = "enrollments"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    
    progress_percent = Column(Float, default=0.0)
    completed = Column(Boolean, default=False)
    
    # Tracking
    last_accessed_module_id = Column(
        Integer,
        ForeignKey("course_modules.id"),
        nullable=True
    )
    
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)
    last_accessed_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    user = relationship("User", foreign_keys=[user_id])
    course = relationship("Course", back_populates="enrollments")
    module_progress = relationship(
        "CourseModuleProgress",
        back_populates="enrollment",
        cascade="all, delete-orphan"
    )


class CourseModuleProgress(Base):
    """Tracking progres per modul per student."""
    __tablename__ = "course_module_progress"

    id = Column(Integer, primary_key=True, index=True)
    enrollment_id = Column(Integer, ForeignKey("enrollments.id"), nullable=False)
    module_id = Column(Integer, ForeignKey("course_modules.id"), nullable=False)
    
    is_completed = Column(Boolean, default=False)
    time_spent_seconds = Column(Integer, default=0)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    enrollment = relationship("Enrollment", back_populates="module_progress")
    module = relationship("CourseModule", back_populates="progress_records")