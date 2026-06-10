from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel
from db import get_db
from auth import get_current_user
from envelope import success
import services

router = APIRouter(prefix="/items", tags=["My Listings"])

class StatusUpdate(BaseModel):
    status: str

@router.get("/me")
def get_my_listings(
    status: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    return success(services.get_my_listings(db, current_user, status))

@router.patch("/{item_id}/status")
def update_item_status(
    item_id: str,
    payload: StatusUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    return success(services.update_item_status(
        db, item_id, payload.status, current_user
    ))

@router.delete("/{item_id}")
def delete_item(
    item_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    item = services.get_item_by_id(db, item_id)
    if item.seller_id != current_user.id:
        from fastapi import HTTPException, status
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "FORBIDDEN",
                    "message": "You do not own this listing."}
        )
    db.delete(item)
    db.commit()
    return success({"message": "Listing deleted."})