import logging
from celery import shared_task
from app.core.database import SessionLocal
from app.models.account import Account
from app.ml.pipeline import ml_pipeline

logger = logging.getLogger(__name__)


@shared_task(name="app.tasks.batch_scoring.recalculate_all_health_scores")
def recalculate_all_health_scores():
    """
    Nightly batch job: Iterates through all customer accounts, feeds latest telemetry
    into the ML model, recalculates scores, and persists updates to PostgreSQL.
    """
    db = SessionLocal()
    try:
        accounts = db.query(Account).all()
        updated_count = 0

        for account in accounts:
            metrics = {
                "login_frequency_drop": account.login_frequency_drop,
                "api_error_rate": account.api_error_rate,
                "open_tickets_count": account.open_tickets_count,
            }

            # Predict health score & derive SHAP explanations
            health_score, risk_level, shap_diagnostics = ml_pipeline.predict_health_score(
                metrics
            )

            # Persist update to account record
            account.health_score = health_score
            account.risk_level = risk_level
            account.shap_explanation = [diag.model_dump() for diag in shap_diagnostics]

            updated_count += 1

        db.commit()
        logger.info(f"Successfully updated health scores for {updated_count} accounts.")
        return {"status": "SUCCESS", "accounts_processed": updated_count}

    except Exception as e:
        db.rollback()
        logger.error(f"Error during batch health score processing: {str(e)}")
        raise e
    finally:
        db.close()