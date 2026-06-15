from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

import schemas
import services
from db import get_db

router = APIRouter(
    prefix="/transactions",
    tags=["Transactions"]
)


@router.post(
    "/purchase",
    response_model=schemas.PurchaseResponse,
    status_code=201,
    summary="Purchase an item — locks tokens in vault"
)
def purchase_item(
    payload: schemas.PurchaseRequest,
    db: Session = Depends(get_db)
):
    holding = services.purchase_item(db, payload)
    return schemas.PurchaseResponse(
        message           = "Purchase successful. Tokens locked in vault.",
        holding_record_id = holding.id,
        item_id           = holding.item_id,
        amount            = holding.amount,
        status            = holding.status
    )


@router.post(
    "/confirm-delivery",
    response_model=schemas.DeliveryConfirmResponse,
    summary="Confirm delivery — releases tokens to seller"
)
def confirm_delivery(
    payload: schemas.DeliveryConfirmRequest,
    db: Session = Depends(get_db)
):
    result = services.confirm_delivery(db, payload)
    return schemas.DeliveryConfirmResponse(**result)


@router.get(
    "/holding-records/{user_id}",
    response_model=list[schemas.HoldingRecordResponse],
    summary="Get all holding records for a user"
)
def get_holding_records(
    user_id: str,
    db: Session = Depends(get_db)
):
    return services.get_holding_records(db, user_id)