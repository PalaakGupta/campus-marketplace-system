from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect, Query
from sqlalchemy.orm import Session
from typing import Dict, List
from datetime import datetime
import json

import schemas
import services
import models
from db import get_db, SessionLocal
from auth import get_current_user
from envelope import success
from logger import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/chat", tags=["Chat"])

class ConnectionManager:
    def __init__(self):
        self.active: Dict[str, List[WebSocket]] = {}

    async def connect(self, item_id: str, websocket: WebSocket):
        await websocket.accept()
        if item_id not in self.active:
            self.active[item_id] = []
        self.active[item_id].append(websocket)

    def disconnect(self, item_id: str, websocket: WebSocket):
        if item_id in self.active:
            self.active[item_id].remove(websocket)

    async def broadcast(self, item_id: str, message: dict):
        if item_id not in self.active:
            return
        for connection in self.active[item_id]:
            await connection.send_text(json.dumps(message))

manager = ConnectionManager()

@router.get("/{item_id}/history", response_model=list[schemas.MessageResponse])
def get_chat_history(
    item_id: str,
    user_id: str = Query(...),
    db: Session = Depends(get_db)
):
    return services.get_chat_history(db, item_id, user_id)

@router.get("/conversations")
def get_conversations(
    user_id: str = Query(...),
    db: Session = Depends(get_db)
):
    # Get all items where user has messages
    items_with_msgs = db.query(models.Message.item_id).filter(
        (models.Message.sender_id == user_id)
    ).distinct().all()
    
    result = []
    for (item_id,) in items_with_msgs:
        item = db.query(models.Item).filter(models.Item.id == item_id).first()
        if not item: continue
        last_msg = db.query(models.Message).filter(
            models.Message.item_id == item_id
        ).order_by(models.Message.created_at.desc()).first()
        other_id = item.seller_id if item.seller_id != user_id else user_id
        other = db.query(models.User).filter(models.User.id == other_id).first()
        unread = db.query(models.Message).filter(
            models.Message.item_id == item_id,
            models.Message.sender_id != user_id,
            models.Message.is_read == False
        ).count()
        result.append({
            "id": item_id,
            "withName": other.name if other else "Unknown",
            "withRole": other.role if other else "",
            "listingTitle": item.title,
            "lastMessage": last_msg.content if last_msg else "",
            "lastMessageTime": last_msg.created_at.isoformat() if last_msg else "",
            "unreadCount": unread,
            "online": False
        })
    return success(result)

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
    return success({"item_id": item_id, "marked_count": len(unread)})

@router.websocket("/ws/{item_id}")
async def websocket_chat(
    item_id: str,
    websocket: WebSocket,
    sender_id: str = Query(...)
):
    db = SessionLocal()
    try:
        allowed = services.validate_chat_participant(db, item_id, sender_id)
        if not allowed:
            await websocket.close(code=4003)
            return
        await manager.connect(item_id, websocket)
        while True:
            data = await websocket.receive_text()
            payload = schemas.MessageCreate(sender_id=sender_id, content=data)
            message = services.save_message(db, item_id, payload)
            await manager.broadcast(item_id, {
                "message_id": message.id,
                "item_id":    message.item_id,
                "sender_id":  message.sender_id,
                "content":    message.content,
                "created_at": message.created_at.isoformat()
            })
    except WebSocketDisconnect:
        manager.disconnect(item_id, websocket)
    finally:
        db.close()

