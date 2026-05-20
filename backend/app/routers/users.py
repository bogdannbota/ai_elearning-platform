from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models import User, RoleEnum, Department
from app.schemas.auth import UserResponse
from app.routers.auth import get_current_user

router = APIRouter(prefix="/users", tags=["Users"])

@router.get("/", response_model=List[UserResponse])
def get_users(token: str, db: Session = Depends(get_db)):
    user = get_current_user(token, db)
    if user.role == RoleEnum.admin:
        return db.query(User).all()
    elif user.role == RoleEnum.manager:
        return db.query(User).filter(User.department_id == user.department_id).all()
    else:
        raise HTTPException(status_code=403, detail="Acces interzis")

@router.get("/{user_id}", response_model=UserResponse)
def get_user(user_id: int, token: str, db: Session = Depends(get_db)):
    current_user = get_current_user(token, db)
    if current_user.role == RoleEnum.student and current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Acces interzis")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Userul nu există")
    return user

@router.put("/{user_id}/reactivate")
def reactivate_user(user_id: int, token: str, db: Session = Depends(get_db)):
    current_user = get_current_user(token, db)
    if current_user.role != RoleEnum.admin:
        raise HTTPException(status_code=403, detail="Acces interzis")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Userul nu există")
    user.is_active = True
    db.commit()
    return {"message": "User reactivat"}

@router.put("/{user_id}")
def update_user(user_id: int, token: str, role: Optional[str] = None,
                department_id: Optional[int] = None, db: Session = Depends(get_db)):
    current_user = get_current_user(token, db)
    if current_user.role != RoleEnum.admin:
        raise HTTPException(status_code=403, detail="Doar adminul poate edita useri")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Userul nu există")
    if role is not None:
        user.role = role
    if department_id is not None:
        user.department_id = department_id
    db.commit()
    db.refresh(user)
    return user

@router.delete("/{user_id}")
def deactivate_user(user_id: int, token: str, db: Session = Depends(get_db)):
    current_user = get_current_user(token, db)
    if current_user.role != RoleEnum.admin:
        raise HTTPException(status_code=403, detail="Acces interzis")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Userul nu există")
    user.is_active = False
    db.commit()
    return {"message": "User dezactivat"}
