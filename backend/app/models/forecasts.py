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

class Forecast(Base):
    __tablename__ = "forecast_values"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey('projects.id', ondelete='CASCADE'), nullable=False)
    forecast_type = Column(String, nullable=False)
    year = Column(Integer, nullable=False)
    month = Column(Integer, nullable=False)
    amount = Column(Numeric(precision=12, scale=3), nullable=False)
    forecast_usd = Column(Numeric(precision=12, scale=3), nullable=False)
    actuals = Column(Numeric(precision=12, scale=3), default=0)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    updated_at = Column(TIMESTAMP, onupdate=func.now())


    class Config:
        from_attributes = True
