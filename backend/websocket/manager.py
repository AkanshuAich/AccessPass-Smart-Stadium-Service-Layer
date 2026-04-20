from fastapi import WebSocket, WebSocketDisconnect
import json


class ConnectionManager:
    """Manages active WebSocket connections and broadcasts updates."""

    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        """Send a JSON message to all connected clients."""
        dead = []
        for conn in self.active_connections:
            try:
                await conn.send_json(message)
            except Exception:
                dead.append(conn)
        for d in dead:
            self.disconnect(d)

    async def send_to_user(self, user_id: int, message: dict):
        """Send to a specific user — simplified broadcast for hackathon."""
        await self.broadcast(message)

    @property
    def count(self):
        return len(self.active_connections)


# Singleton instance
manager = ConnectionManager()
