from pydantic import BaseModel
from pydantic import ConfigDict
from datetime import datetime
from typing import Optional

class MetricBase(BaseModel):
    server_id: str
    cpu_usage: float
    gpu_usage: float
    memory_usage: float
    temperature: float
    power_consumption: float
    cooling_efficiency: float
    emissions: float

class MetricCreate(MetricBase):
    pass

class Metric(MetricBase):
    id: int
    timestamp: datetime
    model_config = ConfigDict(from_attributes=True)

class ServerBase(BaseModel):
    id: str
    name: str
    status: str

class Server(ServerBase):
    model_config = ConfigDict(from_attributes=True)
