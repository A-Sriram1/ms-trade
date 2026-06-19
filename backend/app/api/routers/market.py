from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import List
import asyncio
import random

router = APIRouter()

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            await connection.send_text(message)

manager = ConnectionManager()

@router.websocket("/ws/stream")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Simulate real-time market data to be replaced by Redis pub-sub
            data = {
                "type": "MARKET_UPDATE",
                "nifty": 24350 + random.uniform(-10, 10),
                "banknifty": 52140 + random.uniform(-20, 20),
                "vix": 13.42 + random.uniform(-0.1, 0.1),
                "stocks": [
                    {"symbol": "RELIANCE", "ltp": 2942.50 + random.uniform(-5, 5)},
                    {"symbol": "HDFCBANK", "ltp": 1650.20 + random.uniform(-2, 2)}
                ]
            }
            await websocket.send_json(data)
            await asyncio.sleep(1.0)
    except WebSocketDisconnect:
        manager.disconnect(websocket)
