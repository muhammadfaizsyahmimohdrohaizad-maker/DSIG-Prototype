import re
from typing import Dict, Any


class SentimentRouterService:
    """Zero-latency sentiment analysis and support route evaluator."""

    # Lexical trigger dictionaries for high-velocity scoring
    NEGATIVE_KEYWORDS = {
        "cancel", "cancellation", "refund", "broken", "unacceptable",
        "frustrated", "terrible", "worst", "useless", "quit", "competitor",
        "sucks", "fail", "garbage", "overpriced", "billing issue"
    }

    POSITIVE_KEYWORDS = {
        "love", "great", "thanks", "awesome", "helpful", "fixed",
        "resolved", "excellent", "perfect", "appreciate", "good"
    }

    def analyze_message(self, message_text: str) -> Dict[str, Any]:
        """
        Analyzes message text and returns a normalized sentiment score (-1.0 to +1.0)
        along with immediate live-agent escalation directives.
        """
        text_clean = re.sub(r"[^\w\s]", "", message_text.lower())
        tokens = set(text_clean.split())

        pos_count = sum(1 for word in tokens if word in self.POSITIVE_KEYWORDS)
        neg_count = sum(1 for word in tokens if word in self.NEGATIVE_KEYWORDS)

        total_matches = pos_count + neg_count

        if total_matches == 0:
            sentiment_score = 0.0
        else:
            sentiment_score = round((pos_count - neg_count) / total_matches, 2)

        # Flag explicit high-churn intent keywords
        has_cancellation_intent = any(
            word in tokens for word in ["cancel", "cancellation", "refund", "competitor"]
        )

        # Escalation criteria: strong negative sentiment OR direct churn keyword
        should_escalate = (sentiment_score <= -0.4) or has_cancellation_intent

        priority_level = "NORMAL"
        if should_escalate:
            priority_level = "URGENT" if has_cancellation_intent else "HIGH"

        return {
            "sentiment_score": sentiment_score,
            "is_negative": sentiment_score < 0,
            "should_escalate": should_escalate,
            "priority_level": priority_level,
            "detected_intent": "CHURN_RISK" if has_cancellation_intent else "GENERAL_SUPPORT",
        }


# Global singleton service instance
sentiment_router = SentimentRouterService()