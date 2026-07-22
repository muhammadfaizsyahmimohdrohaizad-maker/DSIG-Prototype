import uuid
from sqlalchemy import Column, String, Integer, Float, DateTime, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.core.database import Base

class Account(Base):
    __tablename__ = "accounts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    mrr = Column(Float, nullable=False, default=0.0)
    
    # Health Scoring Metrics (0 to 100)
    health_score = Column(Integer, nullable=False, default=100)
    risk_level = Column(String(50), default="Low risk")
    
    # Behavioral Telemetry Aggregates
    login_frequency_drop = Column(Float, default=0.0)
    api_error_rate = Column(Float, default=0.0)
    open_tickets_count = Column(Integer, default=0)
    
    # Cached SHAP values for XAI explanations
    shap_explanation = Column(JSON, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())