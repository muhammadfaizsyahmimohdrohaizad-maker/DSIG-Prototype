from pydantic import BaseModel, Field
from typing import Optional, List
from uuid import UUID
from datetime import datetime

class AccountBase(BaseModel):
    name: str
    mrr: float = Field(..., ge=0, description="Monthly Recurring Revenue in USD")

class AccountCreate(AccountBase):
    pass

class AccountResponse(AccountBase):
    id: UUID
    health_score: int
    risk_level: str
    login_frequency_drop: float
    api_error_rate: float
    open_tickets_count: int
    created_at: datetime

    class Config:
        from_attributes = True

class AccountRadarSummary(BaseModel):
    id: UUID
    name: str
    initials: str
    health_score: int
    risk_level: str
    subtitle_summary: str
    mrr: float

    class Config:
        from_attributes = True