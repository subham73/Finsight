import uuid
from sqlalchemy import (
    TIMESTAMP, Column, Text, String, ForeignKey, Numeric, Integer, 
    DateTime, CheckConstraint, JSON, Enum
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.ext.declarative import declarative_base
from core.database import Base

class ActivityLog(Base):
    __tablename__ = "activity_logs"
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'))
    action = Column(Text, nullable=False)
    entity = Column(Text, nullable=False)
    entity_id = Column(UUID(as_uuid=True))
    meta = Column(JSON)
    timestamp = Column(TIMESTAMP, server_default=func.now())
        
    class Config:
        from_attributes = True