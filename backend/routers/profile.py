from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from db import get_db
from auth import get_current_user
from envelope import success
import services

router = APIRouter(prefix="/profile", tags=["Profile"])

@router.get("/me")
def get_profile(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    return success(services.get_my_profile(db, current_user))