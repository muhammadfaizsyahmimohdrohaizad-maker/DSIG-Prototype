from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.account import Account
from app.schemas.diagnostics import DiagnosticsResponse
from app.ml.pipeline import ml_pipeline

router = APIRouter()


@router.get("/{account_id}", response_model=DiagnosticsResponse)
def get_account_diagnostics(account_id: UUID, db: Session = Depends(get_db)):
    """Computes real-time SHAP values explaining why an account received its health score."""
    account = db.query(Account).filter(Account.id == account_id).first()
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Account not found"
        )

    metrics = {
        "login_frequency_drop": account.login_frequency_drop,
        "api_error_rate": account.api_error_rate,
        "open_tickets_count": account.open_tickets_count,
    }

    health_score, _, shap_features = ml_pipeline.predict_health_score(metrics)

    return DiagnosticsResponse(
        account_id=account.id,
        account_name=account.name,
        health_score=health_score,
        shap_features=shap_features,
    )