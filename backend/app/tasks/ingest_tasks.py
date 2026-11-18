"""Scheduled live-data refreshes (see beat_schedule in celery_app.py)."""

from dataclasses import asdict
from typing import Any

from app.ingest import pipeline
from app.tasks.celery_app import celery_app


@celery_app.task(name="app.tasks.ingest_tasks.refresh_metadata")
def refresh_metadata() -> dict[str, Any]:
    return asdict(pipeline.refresh_metadata())


@celery_app.task(name="app.tasks.ingest_tasks.refresh_speed")
def refresh_speed() -> dict[str, Any]:
    return asdict(pipeline.refresh_speed())
