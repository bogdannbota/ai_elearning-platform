from pydantic import BaseModel, EmailStr
from typing import Optional
from app.models import RoleEnum

class DepartmentBase(BaseModel):
    name: str

class DepartmentResponse(DepartmentBase):
    id: int

    class Config:
        from_attributes = True

class UserRegister(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    role: RoleEnum = RoleEnum.student
    department_id: Optional[int] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: int
    full_name: str
    email: str
    role: RoleEnum
    is_active: bool
    department_id: Optional[int] = None
    department: Optional[DepartmentResponse] = None

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse

class TokenData(BaseModel):
    user_id: Optional[int] = None
    role: Optional[str] = None
