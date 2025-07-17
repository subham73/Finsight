
import uuid
from sqlalchemy import (
    TIMESTAMP, Column, Text, String, ForeignKey, Numeric, Integer, 
    DateTime, CheckConstraint, JSON, Enum
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.ext.declarative import declarative_base
from core.database import Base

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True, autoincrement=True)
    table_name = Column(Text, nullable=False)
    record_id = Column(UUID(as_uuid=True))
    field_changed = Column(Text, nullable=False)
    old_value = Column(Text)
    new_value = Column(Text)
    changed_by = Column(UUID(as_uuid=True), ForeignKey('users.id'))
    changed_at = Column(TIMESTAMP, server_default=func.now())
        
    class Config:
        from_attributes = True