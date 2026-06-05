from sqlalchemy import Column, Integer, String, Float, DateTime
from .database import Base
import datetime

class Server(Base):
    __tablename__ = "servers"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, index=True)
    status = Column(String, default="active")

class Metric(Base):
    __tablename__ = "metrics"

    id = Column(Integer, primary_key=True, index=True)
    server_id = Column(String, index=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    
    cpu_usage = Column(Float)
    gpu_usage = Column(Float)
    memory_usage = Column(Float)
    temperature = Column(Float)
    power_consumption = Column(Float)
    cooling_efficiency = Column(Float)
    emissions = Column(Float, default=0.0)

class Workload(Base):
    __tablename__ = "workloads"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    server_id = Column(String)
    start_time = Column(DateTime, default=datetime.datetime.utcnow)
    end_time = Column(DateTime, nullable=True)
    estimated_carbon = Column(Float)
