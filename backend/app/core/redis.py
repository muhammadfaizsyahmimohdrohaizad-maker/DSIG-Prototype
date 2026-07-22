import redis
from app.core.config import settings

# Initialize sync Redis client
redis_client = redis.Redis.from_url(
    settings.REDIS_URL,
    decode_responses=True,
    socket_timeout=5
)

def get_redis():
    """Dependency provider for Redis connection."""
    return redis_client