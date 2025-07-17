from decimal import Decimal
from pydantic import BaseModel, Field
from typing import List, Optional, Dict
from uuid import UUID
from enum import Enum
from datetime import datetime

class ForecastIn(BaseModel):
    forecast_type: str
    source_country: Optional[str] = None
    year: int
    month: int
    amount: Decimal

class ForecastCreate(BaseModel):
    forecast_type: str
    source_country: Optional[str] = None
    year: int
    month: int
    amount: Decimal

class ForecastUpdate(BaseModel):
    forecast_type: Optional[str] = None
    source_country: Optional[str] = None
    year: Optional[int] = None
    month: Optional[int] = None
    amount: Optional[Decimal] = None
    
class ProjectBase(BaseModel):
    source_country: str
    project_number: Optional[str]
    op_ids: Optional[str]
    project_name: str
    region: str
    cluster_id: Optional[UUID]
    manager_id: Optional[UUID]
    customer_name: Optional[str]
    customer_group: Optional[str]
    vertical: Optional[str]
    project_type: Optional[str]
    project_group: Optional[str]
    execution_country: Optional[str]
    currency: Optional[str]
    remarks: Optional[str]
    status: Optional[str]

class ProjectCreate(BaseModel):
    source_country: str
    project_number: Optional[str] = None
    op_ids: Optional[str] = None
    project_name: str
    region: str
    cluster_id: Optional[UUID]
    manager_id: Optional[UUID]
    customer_name: Optional[str]
    customer_group: Optional[str]
    vertical: Optional[str]
    project_type: Optional[str]
    project_group: Optional[str]
    execution_country: Optional[str]
    currency: Optional[str]
    remarks: Optional[str]
    status: Optional[str]
    forecasts: Optional[List[ForecastIn]] = []

class ProjectUpdate(ProjectCreate):
    pass

class ProjectResponse(ProjectBase):
    id: UUID
    created_at: datetime

    class Config:
        from_attributes = True