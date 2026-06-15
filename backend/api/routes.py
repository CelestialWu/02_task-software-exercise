"""
FastAPI WebSocket API 路由
"""
import asyncio
import json
import uuid
import traceback
from typing import Dict, Optional
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException, Body, Query
from datetime import datetime

import sys
from pathlib import Path

# 添加父目录到路径
sys.path.insert(0, str(Path(__file__).parent.parent))

from simulation.config import SimulationConfig
from simulation.engine import CafeteriaSimulator
from database.db import DatabaseManager

router = APIRouter()

# 全局仿真管理
class SimulationManager:
    def __init__(self):
        self.simulations: Dict[str, CafeteriaSimulator] = {}
        self.db_manager = DatabaseManager()
    
    def create_simulation(self, config: SimulationConfig, user_id: int) -> str:
        """创建新仿真"""
        sim_id = str(uuid.uuid4())
        simulator = CafeteriaSimulator(config)
        self.simulations[sim_id] = simulator
        self.db_manager.save_config(sim_id, config.__dict__, user_id)
        return sim_id
    
    def get_simulation(self, sim_id: str) -> Optional[CafeteriaSimulator]:
        return self.simulations.get(sim_id)
    
    def delete_simulation(self, sim_id: str):
        if sim_id in self.simulations:
            del self.simulations[sim_id]


sim_manager = SimulationManager()


@router.post("/api/simulation/create")
async def create_simulation(config: dict = Body(...), user_id: int = Query(1)):
    """创建仿真"""
    try:
        config_obj = SimulationConfig(**config)
        sim_id = sim_manager.create_simulation(config_obj, user_id)
        return {"sim_id": sim_id, "status": "success"}
    except Exception as e:
        print(f"ERROR in create_simulation: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/api/simulation/{sim_id}/state")
async def get_simulation_state(sim_id: str):
    """获取仿真当前状态"""
    simulator = sim_manager.get_simulation(sim_id)
    if not simulator:
        raise HTTPException(status_code=404, detail="Simulation not found")
    
    return simulator.get_state_for_frontend()


@router.get("/api/simulation/{sim_id}/statistics")
async def get_simulation_statistics(sim_id: str):
    """获取仿真统计数据"""
    if not sim_manager.get_simulation(sim_id):
        raise HTTPException(status_code=404, detail="Simulation not found")
    
    stats = sim_manager.db_manager.get_simulation_statistics(sim_id)
    return stats


@router.post("/api/simulation/{sim_id}/export")
async def export_simulation(sim_id: str, format: str = "csv"):
    """导出仿真数据"""
    if not sim_manager.get_simulation(sim_id):
        raise HTTPException(status_code=404, detail="Simulation not found")
    
    if format == "csv":
        output_path = f"simulation_{sim_id}.csv"
        sim_manager.db_manager.export_to_csv(sim_id, output_path)
        return {"status": "success", "file": output_path}
    else:
        raise HTTPException(status_code=400, detail="Unsupported format")


@router.websocket("/ws/simulation/{sim_id}")
async def websocket_endpoint(websocket: WebSocket, sim_id: str):
    """WebSocket端点用于实时仿真推送"""
    await websocket.accept()
    print(f"[WebSocket] Connection accepted for sim_id: {sim_id}")
    
    simulator = sim_manager.get_simulation(sim_id)
    if not simulator:
        print(f"[WebSocket] ERROR: Simulation {sim_id} not found")
        await websocket.close(code=1008, reason="Simulation not found")
        return
    
    print(f"[WebSocket] Simulation {sim_id} found, starting main loop")
    
    try:
        while True:
            # 接收客户端消息
            data = await websocket.receive_text()
            command = json.loads(data)
            print(f"[WebSocket] Received command: {command.get('action')}")
            
            if command.get("action") == "step":
                try:
                    print(f"[WebSocket] Executing step for sim {sim_id}")
                    
                    # 执行一个仿真步骤
                    snapshot = simulator.step()
                    print(f"[WebSocket] Step completed, timestep: {snapshot.timestep}")
                    
                    state = simulator.get_state_for_frontend()
                    
                    # 保存快照（不再传 user_id，从配置表自动获取）
                    try:
                        sim_manager.db_manager.save_snapshot(sim_id, snapshot)
                        print(f"[WebSocket] Snapshot saved successfully")
                    except Exception as db_error:
                        print(f"[WebSocket] Database error: {db_error}")
                        traceback.print_exc()
                        await websocket.send_json({
                            "type": "error",
                            "message": f"Database error: {str(db_error)}"
                        })
                        continue
                    
                    await websocket.send_json({
                        "type": "step_complete",
                        "state": state,
                        "snapshot": {
                            "timestep": snapshot.timestep,
                            "total_arrived": snapshot.total_arrived,
                            "total_seated": snapshot.total_seated,
                            "total_left": snapshot.total_left,
                            "avg_wait_time": snapshot.avg_wait_time,
                            "empty_seats": snapshot.empty_seats,
                            "window_queue_lengths": snapshot.window_queue_lengths
                        }
                    })
                    print(f"[WebSocket] Response sent for step")

                    # Auto-finish when simulation reaches total_duration
                    if simulator.time_step >= simulator.config.total_duration:
                        print(f"[WebSocket] Simulation {sim_id} completed (timestep={simulator.time_step})")
                        await websocket.send_json({
                            "type": "finished",
                            "sim_id": sim_id,
                            "state": state
                        })
                        break
                    
                except Exception as step_error:
                    print(f"[WebSocket] ERROR in step execution:")
                    traceback.print_exc()
                    await websocket.send_json({
                        "type": "error",
                        "message": f"Step error: {str(step_error)}"
                    })
            
            elif command.get("action") == "steps":
                try:
                    num_steps = command.get("num_steps", 10)
                    print(f"[WebSocket] Executing {num_steps} steps for sim {sim_id}")
                    
                    for i in range(num_steps):
                        snapshot = simulator.step()
                        sim_manager.db_manager.save_snapshot(sim_id, snapshot)
                        if (i + 1) % 10 == 0:
                            print(f"[WebSocket] Completed {i + 1}/{num_steps} steps")
                    
                    state = simulator.get_state_for_frontend()
                    await websocket.send_json({
                        "type": "steps_complete",
                        "state": state,
                        "timestep": simulator.time_step
                    })
                    print(f"[WebSocket] Steps completed, final timestep: {simulator.time_step}")

                    if simulator.time_step >= simulator.config.total_duration:
                        print(f"[WebSocket] Simulation {sim_id} completed (timestep={simulator.time_step})")
                        await websocket.send_json({
                            "type": "finished",
                            "sim_id": sim_id,
                            "state": state
                        })
                        break
                    
                except Exception as steps_error:
                    print(f"[WebSocket] ERROR in steps execution:")
                    traceback.print_exc()
                    await websocket.send_json({
                        "type": "error",
                        "message": f"Steps error: {str(steps_error)}"
                    })
            
            elif command.get("action") == "get_state":
                try:
                    state = simulator.get_state_for_frontend()
                    await websocket.send_json({
                        "type": "state",
                        "state": state
                    })
                    print(f"[WebSocket] State sent, timestep: {state.get('timestep')}")
                    
                except Exception as state_error:
                    print(f"[WebSocket] ERROR getting state:")
                    traceback.print_exc()
                    await websocket.send_json({
                        "type": "error",
                        "message": f"State error: {str(state_error)}"
                    })
            
            elif command.get("action") == "finish":
                print(f"[WebSocket] Finishing simulation {sim_id}")
                await websocket.send_json({
                    "type": "finished",
                    "sim_id": sim_id
                })
                break
    
    except WebSocketDisconnect:
        print(f"[WebSocket] Client disconnected for sim {sim_id}")
    except Exception as e:
        print(f"[WebSocket] Unexpected error in main loop:")
        traceback.print_exc()
        try:
            await websocket.send_json({
                "type": "error",
                "message": f"Unexpected error: {str(e)}"
            })
        except:
            pass