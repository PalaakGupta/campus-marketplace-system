from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from db import get_db
from auth import get_current_user
from envelope import success
import services

router = APIRouter(prefix="/items", tags=["Saved Items"])

@router.post("/{item_id}/save")
def save_item(
    item_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    return success(services.save_item(db, item_id, current_user))

@router.delete("/{item_id}/save")
def unsave_item(
    item_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    return success(services.unsave_item(db, item_id, current_user))

@router.get("/saved")
def get_saved_items(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    return success(services.get_saved_items(db, current_user))