from sqlalchemy import Column, String, Integer, ForeignKey, TIMESTAMP, Text, Numeric, JSON, CheckConstraint, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func
import uuid
from core.database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(Text, nullable=False)
    email = Column(Text, nullable=False)
    password_hash = Column(Text, nullable=False)
    role = Column(Text, CheckConstraint("role IN ('PM', 'CH', 'SH')"), nullable=False)
    cluster_id = Column(UUID(as_uuid=True), ForeignKey('clusters.id'))
    created_by = Column(UUID(as_uuid=True), ForeignKey('users.id'))
    created_at = Column(TIMESTAMP, server_default=func.now())

    
    class Config:
        from_attributes = True 

