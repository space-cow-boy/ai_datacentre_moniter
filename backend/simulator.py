import time
import requests
import random
import sys
import os
import psutil
try:
    import GPUtil
except ImportError:
    GPUtil = None

# Allow running from inside /backend or from project root
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.database import SessionLocal, engine
from backend.models import Base, Server

Base.metadata.create_all(bind=engine)

def setup_servers():
    db = SessionLocal()
    servers = db.query(Server).all()
    if not servers:
        print("Initializing servers...")
        initial_servers = [
            Server(id="LOCAL-PC", name="Local PC", status="active"),
            Server(id="SERVER-01", name="Alpha Node (A100x8)", status="active"),
            Server(id="SERVER-02", name="Beta Node (H100x4)",  status="active"),
            Server(id="SERVER-03", name="Gamma Node (V100x8)", status="active"),
            Server(id="SERVER-04", name="Delta Node (RTX8x)",  status="active"),
        ]
        db.add_all(initial_servers)
        db.commit()
        print(f"Created {len(initial_servers)} servers.")
    else:
        print(f"Found {len(servers)} existing servers.")
    db.close()

def simulate_metrics():
    db = SessionLocal()
    servers = db.query(Server).all()
    db.close()

    print(f"Simulating metrics for {len(servers)} servers every 2 seconds...")
    while True:
        for server in servers:
            if server.id == "LOCAL-PC":
                base_cpu = psutil.cpu_percent(interval=None)
                if base_cpu == 0.0:
                    base_cpu = psutil.cpu_percent(interval=0.1) # small interval if 0
                base_mem = psutil.virtual_memory().percent
                base_gpu = 0.0
                base_temp = 45.0
                if GPUtil:
                    gpus = GPUtil.getGPUs()
                    if gpus:
                        base_gpu = gpus[0].load * 100
                        base_temp = gpus[0].temperature

                base_power = 50 + (base_gpu * 1.5) + (base_cpu * 1.2)
                cooling_eff = 100.0
            else:
                base_cpu  = random.uniform(20.0, 85.0)
                base_gpu  = random.uniform(35.0, 95.0)
                base_mem  = random.uniform(45.0, 90.0)
                base_temp = 35.0 + (base_gpu * 0.4) + random.uniform(-2, 2)
                base_power = 180 + (base_gpu * 4.2) + (base_cpu * 1.8)
                cooling_eff = max(0.0, min(100.0, 100.0 - (base_temp - 40.0) * 0.6))
            
            emissions = base_power * 0.4

            metric_data = {
                "server_id":          server.id,
                "cpu_usage":          round(base_cpu,      2),
                "gpu_usage":          round(base_gpu,      2),
                "memory_usage":       round(base_mem,      2),
                "temperature":        round(base_temp,     2),
                "power_consumption":  round(base_power,    2),
                "cooling_efficiency": round(cooling_eff,   2),
                "emissions":          round(emissions,     2),
            }

            try:
                requests.post("http://localhost:8000/metrics", json=metric_data, timeout=2)
            except Exception as e:
                print(f"  [warn] Failed to post metric for {server.id}: {e}")

        time.sleep(2)

if __name__ == "__main__":
    setup_servers()
    print("Starting metrics simulator — press Ctrl+C to stop.")
    psutil.cpu_percent(interval=None) # Initialize psutil
    simulate_metrics()
