import os
import joblib
import pandas as pd
from typing import Dict, Any, Tuple, List
from app.ml.explainer import compute_shap_diagnostics
from app.schemas.diagnostics import SHAPFeatureImpact

ARTIFACT_DIR = os.path.join(os.path.dirname(__file__), "artifacts")
MODEL_PATH = os.path.join(ARTIFACT_DIR, "xgboost_model.joblib")
EXPLAINER_PATH = os.path.join(ARTIFACT_DIR, "shap_explainer.joblib")


class HealthScorePipeline:
    """Inference engine converting raw telemetry metrics into Customer Health Scores."""

    def __init__(self):
        self.model = None
        self.explainer = None
        self._load_artifacts()

    def _load_artifacts(self):
        """Loads XGBoost and SHAP artifacts if present; handles missing model gracefully."""
        if os.path.exists(MODEL_PATH) and os.path.exists(EXPLAINER_PATH):
            self.model = joblib.load(MODEL_PATH)
            self.explainer = joblib.load(EXPLAINER_PATH)
        else:
            self.model = None
            self.explainer = None

    def predict_health_score(
        self, metrics: Dict[str, Any]
    ) -> Tuple[int, str, List[SHAPFeatureImpact]]:
        """
        Calculates Health Score (0-100) and SHAP risk factors from customer telemetry.
        Formula: Health Score = 100 * (1 - Churn Probability)
        """
        # Feature DataFrame construction
        df = pd.DataFrame(
            [
                {
                    "login_frequency_drop": metrics.get(
                        "login_frequency_drop", 0.0
                    ),
                    "api_error_rate": metrics.get("api_error_rate", 0.0),
                    "open_tickets_count": metrics.get("open_tickets_count", 0),
                    "feature_adoption_rate": metrics.get(
                        "feature_adoption_rate", 50.0
                    ),
                    "account_tenure_months": metrics.get(
                        "account_tenure_months", 12.0
                    ),
                }
            ]
        )

        if self.model is None:
            # Fallback heuristic calculation if model artifact has not been compiled yet
            churn_prob = min(
                (
                    metrics.get("login_frequency_drop", 0) * 0.4
                    + metrics.get("api_error_rate", 0) * 0.8
                    + metrics.get("open_tickets_count", 0) * 10
                )
                / 100.0,
                1.0,
            )
            shap_diagnostics = []
        else:
            # Inference via XGBoost Model
            churn_prob = float(self.model.predict_proba(df)[0][1])
            shap_diagnostics = compute_shap_diagnostics(self.explainer, df)

        # Health Score computation
        health_score = int(max(0, min(100, round((1.0 - churn_prob) * 100))))

        # Determine Risk Level Category
        if health_score < 40:
            risk_level = "High risk"
        elif health_score < 65:
            risk_level = "Medium risk"
        else:
            risk_level = "Low risk"

        return health_score, risk_level, shap_diagnostics


# Global Singleton Instance for API usage
ml_pipeline = HealthScorePipeline()