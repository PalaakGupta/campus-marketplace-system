from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect, Query
from sqlalchemy.orm import Session
from typing import Dict, List
import json

import schemas
import services
from db import get_db, SessionLocal
from logger import get_logger

logger = get_logger(__name__)

router = APIRouter(
    prefix="/chat",
    tags=["Chat"]
)

# Connection Manager
# Tracks all active WebSocket connections grouped by item_id.
# When a message arrives for item 5, we broadcast it to every
# connected client in item 5's room.

class ConnectionManager:
    def __init__(self):
        # { item_id: [websocket, websocket, ...] }
        self.active: Dict[int, List[WebSocket]] = {}

    async def connect(self, item_id: str, websocket: WebSocket):
        await websocket.accept()
        if item_id not in self.active:
            self.active[item_id] = []
        self.active[item_id].append(websocket)
        logger.info(
            f"WebSocket connected: item_id={item_id} "
            f"total_connections={len(self.active[item_id])}"
        )

    def disconnect(self, item_id: str, websocket: WebSocket):
        if item_id in self.active:
            self.active[item_id].remove(websocket)
        logger.info(f"WebSocket disconnected: item_id={item_id}")

    async def broadcast(self, item_id: str, message: dict):
        if item_id not in self.active:
            return
        for connection in self.active[item_id]:
            await connection.send_text(json.dumps(message))


manager = ConnectionManager()

# WebSocket endpoint — real-time chat

@router.websocket("/ws/{item_id}")
async def websocket_chat(
    item_id: str,
    websocket: WebSocket,
    sender_id: str = Query(..., gt=0)
):
    """
    Connect to the chat room for a specific item.
    ws://localhost:8000/chat/ws/{item_id}?sender_id={user_id}
    """
    db = SessionLocal()

    try:
        # Validate participant before accepting connection
        allowed = services.validate_chat_participant(db, item_id, sender_id)
        if not allowed:
            await websocket.close(code=4003)
            return

        await manager.connect(item_id, websocket)

        while True:
            data = await websocket.receive_text()

            payload = schemas.MessageCreate(
                sender_id = sender_id,
                content   = data
            )
            message = services.save_message(db, item_id, payload)

            await manager.broadcast(item_id, {
                "message_id" : message.id,
                "item_id"    : message.item_id,
                "sender_id"  : message.sender_id,
                "content"    : message.content,
                "created_at" : message.created_at.isoformat()
            })

    except WebSocketDisconnect:
        manager.disconnect(item_id, websocket)

    finally:
        db.close()

# REST endpoint — chat history

@router.get(
    "/{item_id}/history",
    response_model=list[schemas.MessageResponse],
    summary="Get chat history for an item"
)
def get_chat_history(
    item_id:  str,
    user_id:  str = Query(..., gt=0),
    db: Session = Depends(get_db)
):
    return services.get_chat_history(db, item_id, user_id)