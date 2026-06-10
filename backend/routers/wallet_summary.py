from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from db import get_db
from auth import get_current_user
from envelope import success, paginated
import services

router = APIRouter(prefix="/wallet", tags=["Wallet"])

@router.get("/summary")
def get_wallet_summary(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    return success(services.get_wallet_summary(db, current_user))

@router.get("/transactions")
def get_transactions(
    type: Optional[str] = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    return success(services.get_transaction_history(
        db, current_user, type, page, page_size
    ))