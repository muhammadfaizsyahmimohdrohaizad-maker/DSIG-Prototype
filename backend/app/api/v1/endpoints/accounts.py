from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.account import Account
from app.schemas.account import AccountResponse, AccountRadarSummary, AccountCreate
from app.ml.pipeline import ml_pipeline

router = APIRouter()


@router.get("/radar", response_model=List[AccountRadarSummary])
def get_at_risk_radar(db: Session = Depends(get_db)):
    """Retrieves all accounts ordered by health score ascending (highest risk first)."""
    accounts = db.query(Account).order_by(Account.health_score.asc()).all()

    results = []
    for acc in accounts:
        # Generate initials for visual display
        name_parts = acc.name.split()
        initials = "".join([p[0].upper() for p in name_parts[:2]]) if name_parts else "AC"

        results.append(
            AccountRadarSummary(
                id=acc.id,
                name=acc.name,
                initials=initials,
                health_score=acc.health_score,
                risk_level=acc.risk_level,
                subtitle_summary=f"MRR: ${acc.mrr:,.2f} | Open Tickets: {acc.open_tickets_count}",
                mrr=acc.mrr,
            )
        )
    return results


@router.get("/{account_id}", response_model=AccountResponse)
def get_account_details(account_id: UUID, db: Session = Depends(get_db)):
    """Fetches full telemetry and health state for a single account."""
    account = db.query(Account).filter(Account.id == account_id).first()
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Account not found"
        )
    return account


@router.post("/", response_model=AccountResponse, status_code=status.HTTP_201_CREATED)
def create_account(account_in: AccountCreate, db: Session = Depends(get_db)):
    """Creates a new customer account and runs initial ML health score prediction."""
    # Compute initial prediction
    initial_metrics = {
        "login_frequency_drop": 0.0,
        "api_error_rate": 0.0,
        "open_tickets_count": 0,
    }
    health_score, risk_level, _ = ml_pipeline.predict_health_score(initial_metrics)

    new_account = Account(
        name=account_in.name,
        mrr=account_in.mrr,
        health_score=health_score,
        risk_level=risk_level,
    )
    db.add(new_account)
    db.commit()
    db.refresh(new_account)
    return new_account