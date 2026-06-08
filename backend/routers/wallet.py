from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

import schemas
import services
from db import get_db

router = APIRouter(
    prefix="/wallet",
    tags=["Wallet"]
)


@router.get(
    "/{user_id}",
    response_model=schemas.WalletResponse,
    summary="Get wallet balance for a user"
)
def get_wallet(
    user_id: int,
    db: Session = Depends(get_db)
):
    return services.get_wallet(db, user_id)


@router.post(
    "/{user_id}/sync",
    response_model=schemas.WalletResponse,
    summary="Sync wallet balance from campus card"
)
def sync_wallet(
    user_id: int,
    db: Session = Depends(get_db)
):
    return services.sync_wallet_from_card(db, user_id)