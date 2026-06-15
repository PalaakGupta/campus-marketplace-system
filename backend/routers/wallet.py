from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

import schemas
import services
from db import get_db
from auth import get_current_user
from envelope import success

router = APIRouter(prefix="/wallet", tags=["Wallet"])


@router.get("/{user_id}")
def get_wallet(
    user_id: str,
    db: Session = Depends(get_db),
    _=Depends(get_current_user)
):
    return success(services.get_wallet(db, user_id))


@router.post("/{user_id}/topup")
def topup_wallet(
    user_id: str,
    payload: schemas.WalletTopUp,
    db: Session = Depends(get_db),
    _=Depends(get_current_user)
):
    return success(services.topup_wallet(db, user_id, payload))