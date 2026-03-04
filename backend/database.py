"""
Database engine, session factory, and Base for all SQLAlchemy models.

Usage
-----
    from database import Base, get_db, engine

    # In a FastAPI route:
    def my_route(db: Session = Depends(get_db)):
        ...

    # At startup (or in Alembic):
    Base.metadata.create_all(bind=engine)
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from config import settings

# connect_args is only needed for SQLite (disables same-thread check).
connect_args = (
    {"check_same_thread": False} if settings.DATABASE_URL.startswith("sqlite") else {}
)

engine = create_engine(settings.DATABASE_URL, connect_args=connect_args)

# Each request gets its own session, auto-closed in the dependency.
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# All models inherit from this Base so metadata is shared.
Base = declarative_base()


def get_db():
    """FastAPI dependency that yields a DB session and guarantees cleanup."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
