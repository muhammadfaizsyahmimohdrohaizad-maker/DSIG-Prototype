import uuid
from sqlalchemy import Column, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.core.database import Base

class TelemetryLog(Base):
    __tablename__ = "telemetry_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    account_id = Column(UUID(as_uuid=True), ForeignKey("accounts.id"), nullable=False, index=True)
    
    # Event Types: 'clickstream', 'api_call', 'support_ticket'
    event_type = Column(String(50), nullable=False)
    event_name = Column(String(100), nullable=False)
    
    # Metric payload values (e.g., latency, error count, ticket message)
    value = Column(Float, nullable=True)
    message_text = Column(Text, nullable=True)
    sentiment_score = Column(Float, nullable=True)
    
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), index=True)