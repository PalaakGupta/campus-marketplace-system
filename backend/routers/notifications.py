from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from db import get_db
from auth import get_current_user
from envelope import success
import services

router = APIRouter(prefix="/notifications", tags=["Notifications"])

@router.get("")
def get_notifications(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=50),
    unread_only: bool = Query(default=False),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    return success(services.get_notifications(
        db, current_user, page, page_size, unread_only
    ))

@router.patch("/read")
def mark_read(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    return success(services.mark_notifications_read(db, current_user))