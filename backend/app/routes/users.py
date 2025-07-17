from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from uuid import UUID
from typing import List
from sqlalchemy.orm import Session
from core.database import SessionLocal
from models.users import User
import uuid

router = APIRouter()

# Dependency to get the database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Pydantic models for request/response validation
class UserBase(BaseModel):
    name: str
    email: str

class User(UserBase):
    id: UUID
    role: str

# Route to fetch all users
@router.get("/users", response_model=List[User])
async def get_users(db: Session = Depends(get_db)):
    users = db.query(User).all()
    return users

# Route to create a new user
@router.post("/users", response_model=User)
async def create_user(user: UserBase, db: Session = Depends(get_db)):
    db_user = User(name=user.name, email=user.email, password_hash="hashed_password", role="PM", id=uuid.uuid4())  # Replace with actual password hashing logic
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

# Route to get a specific user by ID
@router.get("/users/{user_id}", response_model=User)
async def get_user(user_id: UUID, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.id == user_id).first()
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return db_user