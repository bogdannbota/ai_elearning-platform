from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import Department, User, RoleEnum
from app.schemas.auth import DepartmentResponse, DepartmentBase
from app.routers.auth import get_current_user
from typing import List

router = APIRouter(prefix="/departments", tags=["Departments"])

def get_token(token: str, db: Session = Depends(get_db)):
    return get_current_user(token, db)

@router.post("/", response_model=DepartmentResponse, status_code=201)
def create_department(data: DepartmentBase, token: str, db: Session = Depends(get_db)):
    user = get_current_user(token, db)
    if user.role != RoleEnum.admin:
        raise HTTPException(status_code=403, detail="Doar adminul poate crea departamente")
    
    existing = db.query(Department).filter(Department.name == data.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Departamentul există deja")
    
    dept = Department(name=data.name)
    db.add(dept)
    db.commit()
    db.refresh(dept)
    return dept

@router.get("/", response_model=List[DepartmentResponse])
def get_departments(token: str, db: Session = Depends(get_db)):
    get_current_user(token, db)
    return db.query(Department).all()

@router.delete("/{dept_id}", status_code=204)
def delete_department(dept_id: int, token: str, db: Session = Depends(get_db)):
    user = get_current_user(token, db)
    if user.role != RoleEnum.admin:
        raise HTTPException(status_code=403, detail="Doar adminul poate șterge departamente")
    
    dept = db.query(Department).filter(Department.id == dept_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Departamentul nu există")
    
    db.delete(dept)
    db.commit()