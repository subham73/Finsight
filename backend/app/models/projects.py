import uuid
from sqlalchemy import (
    TIMESTAMP, Column, Text, String, ForeignKey, Numeric, Integer, 
    DateTime, CheckConstraint, JSON, Enum
)
from datetime import datetime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.ext.declarative import declarative_base
from core.database import Base
from sqlalchemy.orm import relationship

class Project(Base):
    __tablename__ = "projects"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    source_country = Column(Text, nullable=False)
    project_number = Column(Text)
    op_ids = Column(Text)
    project_name = Column(Text, nullable=False)
    region = Column(Text, CheckConstraint("region IN ('APAC', 'NA', 'EU')"), nullable=False)
    cluster_id = Column(UUID(as_uuid=True), ForeignKey('clusters.id', ondelete='SET NULL'))
    manager_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='SET NULL'))
    customer_name = Column(Text)
    customer_group = Column(Text)
    vertical = Column(Text)
    project_type = Column(Text)
    project_group = Column(Text)
    execution_country = Column(Text)
    currency = Column(Text)
    remarks = Column(Text)
    status = Column(Text)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    updated_at = Column(TIMESTAMP, onupdate=func.now())
        
    class Config:
        from_attributes = True