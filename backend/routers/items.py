from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional

import schemas
import services
from db import get_db

router = APIRouter(
    prefix="/items",
    tags=["Items"]
)


@router.post(
    "/",
    response_model=schemas.ItemResponse,
    status_code=201,
    summary="List a new item for sale"
)
def create_item(
    payload: schemas.ItemCreate,
    seller_id: int = Query(..., description="ID of the seller"),
    db: Session = Depends(get_db)
):
    return services.create_item(db, seller_id, payload)


@router.get(
    "/",
    response_model=list[schemas.ItemResponse],
    summary="Get all available items"
)
def get_items(
    channel: Optional[schemas.ListingChannel] = Query(
        default=None,
        description="Filter by channel: marketplace or thrift_store"
    ),
    db: Session = Depends(get_db)
):
    return services.get_items(db, channel)


@router.get(
    "/{item_id}",
    response_model=schemas.ItemResponse,
    summary="Get a single item by ID"
)
def get_item(
    item_id: int,
    db: Session = Depends(get_db)
):
    return services.get_item_by_id(db, item_id)