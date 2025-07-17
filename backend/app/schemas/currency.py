from decimal import Decimal
from fastapi import HTTPException, Depends
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List, Dict
from pydantic import BaseModel

# Data models
class CurrencyRateUpdate(BaseModel):
    currency_code: str
    rate_to_usd: Decimal

class CurrencyRatesUpdateRequest(BaseModel):
    rates: List[CurrencyRateUpdate]