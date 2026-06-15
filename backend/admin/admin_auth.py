from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import Optional
from db import get_db
from admin.admin_models import AdminUser
from admin.admin_service import decode_admin_token

_bearer = HTTPBearer(auto_error=False)


def get_admin_user(
    creds: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
    db: Session = Depends(get_db),
) -> AdminUser:
    if not creds:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "UNAUTHORIZED", "message": "Admin token required."},
            headers={"WWW-Authenticate": "Bearer"},
        )
    payload = decode_admin_token(creds.credentials)
    admin_id = payload.get("sub")
    admin = db.query(AdminUser).filter(AdminUser.id == admin_id).first()
    if not admin or not admin.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "UNAUTHORIZED", "message": "Admin account invalid."},
        )
    return admin