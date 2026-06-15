import sqlite3
import json
from typing import Dict, Any, List, Optional
from simulation.entity import SimSnapshot

class DatabaseManager:
    def __init__(self, db_path: str = "sim_data.db"):
        self.db_path = db_path
        self.init_database()

    def init_database(self):
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            # simulation_snapshot 表
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS simulation_snapshot(
                    id INTEGER PRIMARY KEY AUTOINCREMENT,  
                    user_id INTEGER NOT NULL, 
                    simulation_id TEXT NOT NULL,
                    timestep INTEGER NOT NULL,
                    total_arrived INTEGER,
                    total_seated INTEGER,
                    total_left INTEGER,
                    avg_wait_time REAL,
                    empty_seats INTEGER,
                    window_queue_lengths TEXT,
                    window_cumulative_served TEXT,
                    window_current_speed TEXT,
                    seat_occupancy_by_type TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP                 
                )
            """)

            # 仿真配置表
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS simulation_config (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    simulation_id TEXT UNIQUE NOT NULL,
                    user_id INTEGER NOT NULL,
                    config_json TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)

            # 窗口服务记录表
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS window_log (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    simulation_id TEXT NOT NULL,
                    window_id INTEGER,
                    timestep INTEGER,
                    served_count_delta INTEGER,
                    current_speed REAL,
                    queue_length INTEGER
                )
            """)

            # 就餐人员表
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS person (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    simulation_id TEXT NOT NULL,
                    person_id INTEGER NOT NULL,
                    group_id INTEGER,
                    arrival_time INTEGER NOT NULL,
                    service_window_id INTEGER,
                    service_start_time INTEGER,
                    service_end_time INTEGER,
                    seat_id INTEGER,
                    departure_time INTEGER,
                    wait_time INTEGER,
                    eating_duration INTEGER,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)

            # 座位表
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS seat (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    simulation_id TEXT NOT NULL,
                    seat_id INTEGER NOT NULL,
                    table_type TEXT,
                    capacity INTEGER,
                    current_occupancy INTEGER,
                    occupant_ids TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)

            # 窗口详细日志表
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS window_detail (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    simulation_id TEXT NOT NULL,
                    window_id INTEGER NOT NULL,
                    timestep INTEGER NOT NULL,
                    queue_length INTEGER,
                    cumulative_served INTEGER, 
                    current_service_speed REAL,
                    idle_time INTEGER,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)

            conn.commit()

    def _get_user_id(self, simulation_id: str) -> Optional[int]:
        """从配置表获取 user_id"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT user_id FROM simulation_config WHERE simulation_id = ?", (simulation_id,))
            row = cursor.fetchone()
            if row:
                return row[0]
            return None

    def save_snapshot(self, simulation_id: str, snapshot: SimSnapshot):
        """保存仿真快照（自动从配置表获取 user_id）"""
        # 获取 user_id
        user_id = self._get_user_id(simulation_id)
        if user_id is None:
            raise ValueError(f"未找到 simulation_id {simulation_id} 对应的 user_id")
        
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO simulation_snapshot 
                (user_id, simulation_id, timestep, total_arrived, total_seated, total_left, 
                avg_wait_time, empty_seats, window_queue_lengths,
                window_cumulative_served, window_current_speed, seat_occupancy_by_type)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                user_id,
                simulation_id,
                snapshot.timestep,
                snapshot.total_arrived,
                snapshot.total_seated,
                snapshot.total_left,
                snapshot.avg_wait_time,
                snapshot.empty_seats,
                json.dumps(snapshot.window_queue_lengths),
                json.dumps(snapshot.window_cumulative_served),
                json.dumps(snapshot.window_current_speed),
                json.dumps(snapshot.seat_occupancy_by_type),
            ))
            conn.commit()

    def save_config(self, simulation_id: str, config_dict: Dict[str, Any], user_id: int):
        """保存仿真配置"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO simulation_config (simulation_id, user_id, config_json)
                VALUES (?, ?, ?)
            """, (
                simulation_id,
                user_id,
                json.dumps(config_dict)
            ))
            conn.commit()

    def get_snapshots(self, simulation_id: str) -> List[Dict]:
        """获取指定仿真的所有快照"""
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute("""
                SELECT * FROM simulation_snapshot
                WHERE simulation_id = ?
                ORDER BY timestep ASC
            """, (simulation_id,))
            rows = cursor.fetchall()
            return [dict(row) for row in rows]

    def get_simulation_statistics(self, simulation_id: str) -> Dict:
        """获取仿真统计数据"""
        snapshots = self.get_snapshots(simulation_id)

        if not snapshots:
            return {}

        timesteps = [s['timestep'] for s in snapshots]
        total_arrivals = [s['total_arrived'] for s in snapshots]
        avg_wait_times = [s['avg_wait_time'] for s in snapshots]
        empty_seats = [s['empty_seats'] for s in snapshots]

        return {
            "timesteps": timesteps,
            "total_arrivals": total_arrivals,
            "avg_wait_times": avg_wait_times,
            "empty_seats": empty_seats,
            "peak_arrival": max(total_arrivals) if total_arrivals else 0,
            "max_avg_wait_time": max(avg_wait_times) if avg_wait_times else 0,
            "min_empty_seats": min(empty_seats) if empty_seats else 0
        }

    def export_to_csv(self, simulation_id: str, output_path: str):
        """导出仿真数据为CSV"""
        snapshots = self.get_snapshots(simulation_id)

        if not snapshots:
            return

        import csv

        with open(output_path, 'w', newline='', encoding='utf-8') as f:
            keys = snapshots[0].keys()
            writer = csv.DictWriter(f, fieldnames=keys)
            writer.writeheader()

            for snapshot in snapshots:
                if isinstance(snapshot['window_queue_lengths'], str):
                    snapshot['window_queue_lengths'] = json.loads(snapshot['window_queue_lengths'])
                writer.writerow(snapshot)

    def clear_old_data(self, keep_days: int = 7):
        """清理超过指定天数的数据"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                DELETE FROM simulation_snapshot 
                WHERE created_at < datetime('now', '-' || ? || ' days')
            """, (keep_days,))
            cursor.execute("""
                DELETE FROM simulation_config 
                WHERE created_at < datetime('now', '-' || ? || ' days')
            """, (keep_days,))
            conn.commit()