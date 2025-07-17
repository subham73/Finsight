import uuid
from sqlalchemy import (
    TIMESTAMP, Column, Text, String, ForeignKey, Numeric, Integer, 
    DateTime, CheckConstraint, JSON, Enum
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.ext.declarative import declarative_base
from core.database import Base

class UserInvitation(Base):
    __tablename__ = "user_invitations"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    invited_email = Column(Text, nullable=False)
    invited_role = Column(Text, CheckConstraint("invited_role IN ('PM', 'CH')"), nullable=False)
    cluster_id = Column(UUID(as_uuid=True), ForeignKey('clusters.id'))
    invited_by = Column(UUID(as_uuid=True), ForeignKey('users.id'))
    status = Column(Text, CheckConstraint("status IN ('pending', 'accepted', 'rejected')"), server_default='pending')
    created_at = Column(TIMESTAMP, server_default=func.now())
    accepted_at = Column(TIMESTAMP)
        
    class Config:
        from_attributes = True