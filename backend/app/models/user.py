"""
Modele pentru utilizatori și departamente.
"""
import enum
from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Enum, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class RoleEnum(str, enum.Enum):
    """
    Rolurile disponibile în platformă:
    - admin   = administratorul platformei (acces total)
    - manager = profesor (creează cursuri, examene, planuri, corectează)
    - student = cursant (parcurge cursuri, susține examene)
    """
    admin = "admin"
    manager = "manager"
    student = "student"


class Department(Base):
    __tablename__ = "departments"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    users = relationship("User", back_populates="department")


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(Enum(RoleEnum), default=RoleEnum.student, nullable=False)
    is_active = Column(Boolean, default=True)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    department = relationship("Department", back_populates="users")
    
    # Helper properties pentru verificare rol
    @property
    def is_admin(self) -> bool:
        return self.role == RoleEnum.admin
    
    @property
    def is_teacher(self) -> bool:
        return self.role == RoleEnum.manager
    
    @property
    def is_student(self) -> bool:
        return self.role == RoleEnum.student
    
    @property
    def can_create_content(self) -> bool:
        """Admin și Profesor pot crea cursuri, examene, planuri."""
        return self.role in (RoleEnum.admin, RoleEnum.manager)
