import uuid
from sqlalchemy import (
    TIMESTAMP, Column, Text, String, ForeignKey, Numeric, Integer, 
    DateTime, CheckConstraint, JSON, Enum
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.ext.declarative import declarative_base
from core.database import Base

class ExchangeRates(Base):
    __tablename__ = "exchange_rates"
    currency_code = Column(String(10), primary_key=True)
    rate_to_usd = Column(Numeric(precision=10, scale=9), nullable=False)
    last_updated = Column(TIMESTAMP, server_default=func.now())
        
    class Config:
        from_attributes = True