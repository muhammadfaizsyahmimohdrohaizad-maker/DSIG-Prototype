import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "HavLook SaaS Analytics Engine"
    API_V1_STR: str = "/api/v1"
    
    # Infrastructure Connections
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "postgresql://havlook_user:havlook_password@localhost:5432/havlook_db"
    )
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    
    # Churn Prediction Thresholds
    HIGH_RISK_THRESHOLD: int = 40
    MEDIUM_RISK_THRESHOLD: int = 65

    class Config:
        case_sensitive = True

settings = Settings()