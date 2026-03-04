"""
JWT-based authentication helpers for ModelCompare.

Public API
----------
  get_password_hash(plain)      → hashed string
  verify_password(plain, hashed) → bool
  create_access_token(data)     → JWT string
  get_current_user              → FastAPI dependency → User ORM object
  require_role([Role, ...])     → FastAPI dependency factory → WorkspaceMember ORM object
"""

from datetime import datetime, timedelta, timezone

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from config import settings
from database import get_db
import models

# ─────────────────────────────────────────────────────────────────────────────
# Password hashing (bcrypt)
# ─────────────────────────────────────────────────────────────────────────────

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def get_password_hash(plain_password: str) -> str:
    return pwd_context.hash(plain_password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


# ─────────────────────────────────────────────────────────────────────────────
# JWT creation & decoding
# ─────────────────────────────────────────────────────────────────────────────

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def create_access_token(data: dict) -> str:
    """
    Sign a JWT carrying the supplied claims.
    The token expires after settings.ACCESS_TOKEN_EXPIRE_MINUTES.
    """
    payload = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    payload["exp"] = expire
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


# ─────────────────────────────────────────────────────────────────────────────
# FastAPI dependencies
# ─────────────────────────────────────────────────────────────────────────────

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> models.User:
    """
    Decode the Bearer token and return the corresponding User row.
    Raises 401 if the token is missing, expired, or tampered with.
    """
    credentials_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exc
    except JWTError:
        raise credentials_exc

    user = db.query(models.User).filter(models.User.id == user_id).first()
    if user is None or not user.is_active:
        raise credentials_exc
    return user


def require_role(required_roles: list[models.Role]):
    """
    Dependency factory for workspace-level RBAC.

    Usage example
    -------------
        @app.get("/workspaces/{workspace_id}/settings")
        def get_settings(
            workspace_id: str,
            member: WorkspaceMember = Depends(require_role([Role.ADMIN]))
        ):
            ...

    Returns the WorkspaceMember row (so callers know the user's role).
    Raises 403 if the user is not a member or their role is insufficient.
    """
    async def _check(
        workspace_id: str,
        current_user: models.User = Depends(get_current_user),
        db: Session = Depends(get_db),
    ) -> models.WorkspaceMember:
        member = (
            db.query(models.WorkspaceMember)
            .filter(
                models.WorkspaceMember.workspace_id == workspace_id,
                models.WorkspaceMember.user_id == current_user.id,
            )
            .first()
        )
        if not member or member.role not in required_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions for this workspace",
            )
        return member

    return _check
