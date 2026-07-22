import os
import joblib
import numpy as np
import pandas as pd
from xgboost import XGBClassifier
import shap

# Artifact output paths
ARTIFACT_DIR = os.path.join(os.path.dirname(__file__), "artifacts")
MODEL_PATH = os.path.join(ARTIFACT_DIR, "xgboost_model.joblib")
EXPLAINER_PATH = os.path.join(ARTIFACT_DIR, "shap_explainer.joblib")

# Feature Column Definitions
FEATURE_COLUMNS = [
    "login_frequency_drop",  # % drop in logins over 30 days
    "api_error_rate",        # % API request failure rate
    "open_tickets_count",    # Number of active unresolved support tickets
    "feature_adoption_rate", # % of key software features used (0 to 100)
    "account_tenure_months"  # Months customer has been subscribed
]


def generate_synthetic_data(samples: int = 2000):
    """Generates synthetic customer telemetry logs correlated to churn."""
    np.random.seed(42)

    login_drop = np.random.uniform(0, 100, samples)
    api_errors = np.random.uniform(0, 50, samples)
    open_tickets = np.random.poisson(2, samples)
    feature_adoption = np.random.uniform(10, 100, samples)
    tenure = np.random.exponential(12, samples)

    # Churn logit calculation based on telemetry friction
    churn_logit = (
        0.05 * login_drop
        + 0.08 * api_errors
        + 0.4 * open_tickets
        - 0.03 * feature_adoption
        - 0.02 * tenure
        - 2.5
    )

    churn_prob = 1 / (1 + np.exp(-churn_logit))
    churned = (churn_prob > 0.5).astype(int)

    df = pd.DataFrame(
        {
            "login_frequency_drop": login_drop,
            "api_error_rate": api_errors,
            "open_tickets_count": open_tickets,
            "feature_adoption_rate": feature_adoption,
            "account_tenure_months": tenure,
            "churned": churned,
        }
    )
    return df


def train_and_export_model():
    """Trains XGBoost Classifier and saves model + SHAP explainer artifacts."""
    os.makedirs(ARTIFACT_DIR, exist_ok=True)
    print("🔄 Generating telemetry dataset...")
    df = generate_synthetic_data()

    X = df[FEATURE_COLUMNS]
    y = df["churned"]

    print("⚡ Training XGBoost binary classification model...")
    model = XGBClassifier(
        n_estimators=100,
        max_depth=4,
        learning_rate=0.05,
        random_state=42,
        eval_metric="logloss",
    )
    model.fit(X, y)

    print("🧠 Initializing Tree SHAP explainer...")
    explainer = shap.TreeExplainer(model)

    # Serialize Artifacts
    joblib.dump(model, MODEL_PATH)
    joblib.dump(explainer, EXPLAINER_PATH)

    print(f" Model saved successfully to: {MODEL_PATH}")
    print(f" SHAP Explainer saved to: {EXPLAINER_PATH}")


if __name__ == "__main__":
    train_and_export_model()