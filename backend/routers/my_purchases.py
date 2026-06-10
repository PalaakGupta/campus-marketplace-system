from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from db import get_db
from auth import get_current_user
from envelope import success
import services

router = APIRouter(prefix="/purchases", tags=["Purchases"])

@router.get("/me")
def get_my_purchases(
    payment_status: Optional[str] = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    return success(services.get_my_purchases(
        db, current_user, payment_status, page, page_size
    ))