from celery import Celery
from celery.schedules import crontab
from app.core.config import settings

celery_app = Celery(
    "havlook_tasks",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
)

# Configure Celery Beat periodic background schedules
celery_app.conf.beat_schedule = {
    "recalculate-health-scores-nightly": {
        "task": "app.tasks.batch_scoring.recalculate_all_health_scores",
        "schedule": crontab(hour=0, minute=0),  # Runs every night at 00:00 UTC
    },
}

# Auto-discover tasks in the app.tasks package
celery_app.autodiscover_tasks(["app.tasks"])