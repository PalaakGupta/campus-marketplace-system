from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime
from db import get_db
from auth import get_current_user
from envelope import success
import models

router = APIRouter(prefix="/chat", tags=["Chat"])

@router.patch("/{item_id}/read")
def mark_chat_read(
    item_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    unread = db.query(models.Message).filter(
        models.Message.item_id   == item_id,
        models.Message.sender_id != current_user.id,
        models.Message.is_read   == False
    ).all()

    now = datetime.utcnow()
    for msg in unread:
        msg.is_read = True
        msg.read_at = now
    db.commit()

    return success({"item_id": item_id,
                    "marked_count": len(unread)})