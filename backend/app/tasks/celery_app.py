"""
Celery application factory for ModelCompare.

Starting the worker (from backend/ directory):
    celery -A app.tasks.celery_app worker --loglevel=info --concurrency=4

Starting beat scheduler (periodic tasks):
    celery -A app.tasks.celery_app beat --loglevel=info
"""

from celery import Celery

from app.core.config import settings

celery_app = Celery(
    "modelcompare",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=["app.tasks.evaluation_tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    result_expires=86_400,
    task_annotations={
        "app.tasks.evaluation_tasks.run_evaluation": {"rate_limit": "100/m"}
    },
    beat_schedule={
        "cleanup-stale-evaluations": {
            "task": "app.tasks.evaluation_tasks.cleanup_stale_evaluations",
            "schedule": 3600.0,
        }
    },
)
