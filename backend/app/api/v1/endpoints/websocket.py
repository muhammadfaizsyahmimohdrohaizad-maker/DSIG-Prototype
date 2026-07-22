from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import List, Dict
import json
from app.services.sentiment_router import sentiment_router

router = APIRouter()


class ConnectionManager:
    """Tracks active client WebSockets for real-time broadcasts."""

    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, data: Dict):
        for connection in self.active_connections:
            await connection.send_text(json.dumps(data))


manager = ConnectionManager()


@router.websocket("/ws/chat/{account_id}")
async def websocket_chat_endpoint(websocket: WebSocket, account_id: str):
    """Real-time chat endpoint with immediate sentiment routing and agent escalation."""
    await manager.connect(websocket)
    try:
        while True:
            raw_data = await websocket.receive_text()
            data = json.loads(raw_data)
            message_text = data.get("text", "")

            # Run low-latency sentiment evaluation
            analysis = sentiment_router.analyze_message(message_text)

            response_payload = {
                "account_id": account_id,
                "text": message_text,
                "sentiment_score": analysis["sentiment_score"],
                "should_escalate": analysis["should_escalate"],
                "priority_level": analysis["priority_level"],
                "intent": analysis["detected_intent"],
            }

            # Echo analysis result back to connected clients
            await manager.broadcast(response_payload)

    except WebSocketDisconnect:
        manager.disconnect(websocket)