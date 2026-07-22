from pydantic import BaseModel
from typing import List
from uuid import UUID

class SHAPFeatureImpact(BaseModel):
    feature_name: str
    shap_value: float
    percentage_weight: float
    is_risk_factor: bool

class DiagnosticsResponse(BaseModel):
    account_id: UUID
    account_name: str
    health_score: int
    shap_features: List[SHAPFeatureImpact]