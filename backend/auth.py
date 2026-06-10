import os
from datetime import datetime, timedelta, date
from typing import Optional

from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from db import get_db

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
bearer_scheme = HTTPBearer()

SECRET_KEY  = os.getenv("SECRET_KEY", "changeme")
ALGORITHM   = "HS256"
EXPIRE_MINS = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 480))


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def default_password(date_of_birth: date) -> str:
    return date_of_birth.strftime("%d%m%Y")


def create_access_token(user_id: str, role: str) -> str:
    expire = datetime.utcnow() + timedelta(minutes=EXPIRE_MINS)
    payload = {
        "sub"  : user_id,
        "role" : role,
        "exp"  : expire
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db)
):
    """
    FastAPI dependency. Validates the Bearer token and returns
    the current user object. Inject into any protected route.
    """
    import models

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail={"code": "UNAUTHORIZED",
                "message": "Invalid or expired token."},
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(
            credentials.credentials,
            SECRET_KEY,
            algorithms=[ALGORITHM]
        )
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = db.query(models.User).filter(
        models.User.id == user_id
    ).first()

    if not user or not user.is_active:
        raise credentials_exception

    # Update last_seen_at on every authenticated request
    user.last_seen_at = datetime.utcnow()
    db.commit()

    return user


def require_admin(current_user=Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "FORBIDDEN",
                    "message": "Admin access required."}
        )
    return current_user