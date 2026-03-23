from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

from fastapi import Cookie, Depends, HTTPException, status
from jose import JWTError, jwt

from api.config import settings
from database.db import get_user_by_id


def create_access_token(user_id: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=settings.jwt_expiry_days)
    payload = {"sub": user_id, "exp": expire}
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> Optional[str]:
    try:
        payload = jwt.decode(
            token, settings.jwt_secret, algorithms=[settings.jwt_algorithm]
        )
        return payload.get("sub")
    except JWTError:
        return None


async def get_current_user(
    session: Optional[str] = Cookie(default=None),
) -> Optional[Dict[str, Any]]:
    if not session:
        return None
    user_id = decode_access_token(session)
    if not user_id:
        return None
    return await get_user_by_id(user_id)


async def require_current_user(
    user: Optional[Dict[str, Any]] = Depends(get_current_user),
) -> Dict[str, Any]:
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )
    return user
