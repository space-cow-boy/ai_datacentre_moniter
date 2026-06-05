from fastapi import FastAPI, Depends, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from . import models, schemas, database
import json
import asyncio

models.Base.metadata.create_all(bind=database.engine)

app = FastAPI(title="AI Data Center Empact API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception:
                pass

manager = ConnectionManager()

@app.get("/servers", response_model=list[schemas.Server])
def get_servers(db: Session = Depends(database.get_db)):
    return db.query(models.Server).all()

@app.get("/metrics/latest", response_model=list[schemas.Metric])
def get_latest_metrics(db: Session = Depends(database.get_db)):
    # In SQLite, getting greatest per group can be tricky without window functions.
    # We will just fetch all and group in python for simplicity in MVP.
    metrics = db.query(models.Metric).order_by(models.Metric.timestamp.desc()).all()
    latest = {}
    for m in metrics:
        if m.server_id not in latest:
            latest[m.server_id] = m
    return list(latest.values())

@app.websocket("/ws/metrics")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)

@app.post("/metrics", response_model=schemas.Metric)
async def create_metric(metric: schemas.MetricCreate, db: Session = Depends(database.get_db)):
    db_metric = models.Metric(**metric.dict())
    db.add(db_metric)
    db.commit()
    db.refresh(db_metric)
    
    await manager.broadcast(json.dumps({
        "server_id": db_metric.server_id,
        "cpu_usage": db_metric.cpu_usage,
        "gpu_usage": db_metric.gpu_usage,
        "memory_usage": db_metric.memory_usage,
        "temperature": db_metric.temperature,
        "power_consumption": db_metric.power_consumption,
        "cooling_efficiency": db_metric.cooling_efficiency,
        "emissions": db_metric.emissions,
        "timestamp": db_metric.timestamp.isoformat()
    }))
    return db_metric
