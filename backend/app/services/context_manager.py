import time
from typing import Tuple, Dict, Any
from redis import Redis
from app.core.redis import redis_client


class ContextManagerService:
    """Handles Redis sliding-window rate limiting and modal throttling safeguards."""

    def __init__(self, redis_conn: Redis = redis_client):
        self.redis = redis_conn

    def check_rate_limit(
        self, account_id: str, max_requests: int = 100, window_seconds: int = 60
    ) -> Tuple[bool, int, int]:
        """
        Implements a sliding window rate-limiter using Redis.
        Returns: (is_allowed, current_count, retry_after_seconds)
        """
        current_time = int(time.time())
        key = f"rate_limit:{account_id}:{current_time // window_seconds}"

        # Atomic increment in Redis
        pipeline = self.redis.pipeline()
        pipeline.incr(key)
        pipeline.expire(key, window_seconds + 1)
        results = pipeline.execute()

        request_count = results[0]
        is_allowed = request_count <= max_requests
        retry_after = window_seconds - (current_time % window_seconds)

        return is_allowed, request_count, retry_after

    def should_trigger_downsell_modal(
        self, account_id: str, health_score: int, cooldown_hours: int = 24
    ) -> bool:
        """
        Determines whether a downsell / retention modal should be shown.
        Prevents prompt fatigue by enforcing a Redis cooldown period.
        """
        # Only offer downsells to accounts experiencing health degradation (score < 50)
        if health_score >= 50:
            return False

        cooldown_key = f"downsell_shown:{account_id}"

        # Check if modal was already rendered during the cooldown window
        if self.redis.exists(cooldown_key):
            return False

        # Set cooldown key with expiration
        self.redis.setex(cooldown_key, cooldown_hours * 3600, "1")
        return True


# Global singleton service instance
context_manager = ContextManagerService()