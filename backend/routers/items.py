from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from auth import get_current_user
from envelope import success
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
    seller_id: str = Query(..., description="ID of the seller"),
    db: Session = Depends(get_db)
):
    return services.create_item(db, seller_id, payload)



@router.get(
    "/{item_id}",
    response_model=schemas.ItemResponse,
    summary="Get a single item by ID"
)
def get_item(
    item_id: str,
    db: Session = Depends(get_db)
):
    return services.get_item_by_id(db, item_id)

@router.get("/")
def get_items(
    channel: Optional[str] = Query(default=None),
    status: Optional[str] = Query(default=None),
    category: Optional[str] = Query(default=None),
    search: Optional[str] = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, alias="pageSize"),
    db: Session = Depends(get_db),
    _=Depends(get_current_user)
):
    # Normalize channel value from frontend
    if channel:
        channel = channel.lower().replace(" ", "_")
    return success(services.get_items(db, channel))


@router.post("/{item_id}/images")
async def upload_images(
    item_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    # Return success without doing anything for now
    # Images will be added in Phase 2
    return success({"message": "Images received", "item_id": item_id})