"""
Celery application factory for ModelCompare.

Uses Redis as both the broker (task queue) and the result backend.

Configuration is pulled from config.settings so the same .env file governs
both FastAPI and Celery workers.

Starting the worker
-------------------
    # From the backend/ directory:
    celery -A tasks.celery_app worker --loglevel=info --concurrency=4

Starting the beat scheduler (for periodic tasks)
-------------------------------------------------
    celery -A tasks.celery_app beat --loglevel=info
"""

from celery import Celery

from config import settings

celery_app = Celery(
    "modelcompare",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=["tasks.evaluation_tasks"],  # Auto-discover task modules
)

# ── Worker behaviour ──────────────────────────────────────────────────────────
celery_app.conf.update(
    # Serialisation – JSON is safe and human-readable
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],

    # Timezone
    timezone="UTC",
    enable_utc=True,

    # Retry policy defaults (can be overridden per task)
    task_acks_late=True,          # Acknowledge only after task completes (safer retries)
    task_reject_on_worker_lost=True,

    # Result expiry: keep results for 24 h so the API can poll status
    result_expires=86_400,

    # Rate limit: max 100 evaluation tasks per minute per worker
    task_annotations={
        "tasks.evaluation_tasks.run_evaluation": {"rate_limit": "100/m"}
    },

    # Beat schedule – example: clean up old pending evaluations every hour
    beat_schedule={
        "cleanup-stale-evaluations": {
            "task": "tasks.evaluation_tasks.cleanup_stale_evaluations",
            "schedule": 3600.0,  # every hour
        }
    },
)
