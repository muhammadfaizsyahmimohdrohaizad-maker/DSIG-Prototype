from typing import List, Dict, Any
import numpy as np
import pandas as pd
from app.schemas.diagnostics import SHAPFeatureImpact

FEATURE_NAME_MAP = {
    "login_frequency_drop": "Login frequency",
    "api_error_rate": "API error rate",
    "open_tickets_count": "Open support tickets",
    "feature_adoption_rate": "Feature adoption",
    "account_tenure_months": "Account tenure",
}


def compute_shap_diagnostics(
    explainer: Any, feature_vector: pd.DataFrame
) -> List[SHAPFeatureImpact]:
    """
    Computes SHAP values for an account and formats them for the frontend panel.
    """
    # Calculate SHAP values for the single instance
    shap_values = explainer.shap_values(feature_vector)

    if isinstance(shap_values, list):
        # Handle binary output list format
        values = shap_values[1][0]
    elif len(shap_values.shape) == 2:
        values = shap_values[0]
    else:
        values = shap_values

    # Determine maximum absolute impact to normalize bar lengths for CSS
    max_abs_impact = max(np.abs(values)) if max(np.abs(values)) > 0 else 1.0

    diagnostics: List[SHAPFeatureImpact] = []

    for idx, feature_raw_name in enumerate(feature_vector.columns):
        raw_val = float(values[idx])
        # Invert impact sign for visual clarity: positive value = risk factor
        # Negative impact value reduces score (indicates churn threat)
        impact_score = round(-raw_val * 10, 1)
        percentage_weight = min(
            round((abs(raw_val) / max_abs_impact) * 100, 1), 100.0
        )
        is_risk = raw_val > 0

        friendly_name = FEATURE_NAME_MAP.get(
            feature_raw_name, feature_raw_name
        )

        diagnostics.append(
            SHAPFeatureImpact(
                feature_name=friendly_name,
                shap_value=impact_score,
                percentage_weight=percentage_weight,
                is_risk_factor=is_risk,
            )
        )

    # Sort so highest risk factors appear first in the UI
    diagnostics.sort(key=lambda x: x.shap_value)
    return diagnostics