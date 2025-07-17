from pydantic import BaseModel, EmailStr
from typing import Optional
from uuid import UUID
from datetime import datetime

class UserBase(BaseModel):
    name: str
    email: EmailStr
    role: str
    cluster_id: Optional[UUID]

class UserCreate(UserBase):
    password: str  # Raw password for creation

class UserResponse(UserBase):
    id: UUID
    created_by: Optional[UUID]
    created_at: datetime

    class Config:
        from_attributes = True