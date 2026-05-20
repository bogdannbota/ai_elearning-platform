"""
Modele pentru planurile de învățare:
- LearningPlan: planul în sine (creat de admin/profesor)
- LearningPlanItem: item în plan (curs sau examen, ordonat)
- LearningPlanAssignment: asignarea planului unui student
"""
from sqlalchemy import (
    Column, Integer, String, Boolean, ForeignKey,
    DateTime, Float, Text
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class LearningPlan(Base):
    """
    Plan de învățare - colecție de cursuri și examene ordonată,
    creată de admin/profesor și asignată studenților.
    """
    __tablename__ = "learning_plans"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    
    # Pentru cine este planul (departament țintă - opțional)
    target_department_id = Column(
        Integer,
        ForeignKey("departments.id"),
        nullable=True
    )
    
    # Date opționale de începere/sfârșit
    start_date = Column(DateTime(timezone=True), nullable=True)
    end_date = Column(DateTime(timezone=True), nullable=True)
    
    is_mandatory = Column(Boolean, default=False)
    is_published = Column(Boolean, default=False, nullable=False)
    
    # Audit
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now()
    )

    # Relationships
    creator = relationship("User", foreign_keys=[created_by])
    target_department = relationship("Department", foreign_keys=[target_department_id])
    items = relationship(
        "LearningPlanItem",
        back_populates="learning_plan",
        cascade="all, delete-orphan",
        order_by="LearningPlanItem.display_order"
    )
    assignments = relationship(
        "LearningPlanAssignment",
        back_populates="learning_plan",
        cascade="all, delete-orphan"
    )


class LearningPlanItem(Base):
    """
    Item în plan - poate fi un curs SAU un examen (nu ambele).
    Items pot fi ordonate și opțional dependente unul de altul.
    """
    __tablename__ = "learning_plan_items"

    id = Column(Integer, primary_key=True, index=True)
    learning_plan_id = Column(
        Integer,
        ForeignKey("learning_plans.id"),
        nullable=False
    )
    
    # Unul din astea două va fi setat, NU ambele
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=True)
    exam_id = Column(Integer, ForeignKey("exams.id"), nullable=True)
    
    display_order = Column(Integer, default=0, nullable=False)
    is_required = Column(Boolean, default=True)
    
    # Dependență de un alt item (acesta se deblochează după finalizarea celuilalt)
    unlock_after_item_id = Column(
        Integer,
        ForeignKey("learning_plan_items.id"),
        nullable=True
    )

    # Relationships
    learning_plan = relationship("LearningPlan", back_populates="items")
    course = relationship("Course", foreign_keys=[course_id])
    exam = relationship("Exam", foreign_keys=[exam_id])
    unlock_after = relationship(
        "LearningPlanItem",
        remote_side="LearningPlanItem.id",
        foreign_keys=[unlock_after_item_id]
    )


class LearningPlanAssignment(Base):
    """Asignarea unui plan de învățare la un student."""
    __tablename__ = "learning_plan_assignments"

    id = Column(Integer, primary_key=True, index=True)
    learning_plan_id = Column(
        Integer,
        ForeignKey("learning_plans.id"),
        nullable=False
    )
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    assigned_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    progress_percent = Column(Float, default=0.0)
    completed = Column(Boolean, default=False)
    
    assigned_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    learning_plan = relationship("LearningPlan", back_populates="assignments")
    student = relationship("User", foreign_keys=[student_id])
    assigner = relationship("User", foreign_keys=[assigned_by])
