"""
食堂仿真核心引擎
"""
import random
import math
from typing import List, Dict, Optional, Tuple
from datetime import datetime
import numpy as np
from .config import SimulationConfig
from .entity import (
    Person, Table, Seat, Window, SimSnapshot,
    PersonState, SeatType, sin_wave, TABLE_DISPLAY_NAME
)


class ArrivalSimulator:
    """人员到达模拟器 - 基于泊松分布"""
    
    def __init__(self, config: SimulationConfig, simulator: Optional['CafeteriaSimulator'] = None):
        self.config = config
        self.simulator = simulator  # 用于动态平衡偏好
        self.person_id_counter = 0
        self.group_id_counter = 0
    
    def generate_arrivals(self, time_step: int) -> List[Person]:
        """根据泊松分布生成本时间步到达的人员"""
        lambda_param = self.config.get_lambda(time_step)

        # 生成到达人数（泊松分布 + 指数平滑）
        base_count = np.random.poisson(lambda_param)
        # 指数移动平均平滑，减少剧烈波动
        if not hasattr(self, '_smoothed_arrival'):
            self._smoothed_arrival = float(lambda_param)
        alpha = 0.25
        smoothed = alpha * base_count + (1 - alpha) * self._smoothed_arrival
        self._smoothed_arrival = smoothed
        arrival_count = int(round(smoothed))
        arrival_count = min(arrival_count, 15)

        # Hard global cap: max 150 concurrent active people in the system
        if self.simulator:
            active_count = sum(1 for p in self.simulator.people_dict.values()
                               if p.state != PersonState.LEFT)
            max_active = 150
            available = max(0, max_active - active_count)
            arrival_count = min(arrival_count, available)

        arrivals = []
        i = 0
        while i < arrival_count:
            group_size = self.config.get_group_size()
            actual_group_size = min(group_size, arrival_count - i)

            group_id = self.group_id_counter if actual_group_size > 1 else -1
            if actual_group_size > 1:
                self.group_id_counter += 1

            # 同组成员使用相同的停留时长（最少12分钟）
            shared_stay = max(12, int(random.gauss(self.config.avg_meal_duration, self.config.meal_duration_variance)))
            shared_pref_windows = self._get_preferred_windows()
            shared_pref_seat = self._get_preferred_seat_type()

            for _ in range(actual_group_size):
                person = Person(
                    id=self.person_id_counter,
                    entry_time=time_step,
                    avg_stay_duration=shared_stay,
                    preferred_windows=shared_pref_windows,
                    preferred_seat_type=shared_pref_seat,
                    group_id=group_id,
                )
                arrivals.append(person)
                self.person_id_counter += 1
                i += 1

        return arrivals
    
    def _get_preferred_windows(self) -> List[int]:
        """获取用户偏好窗口（动态适应窗口数变化）"""
        window_count = len(self.simulator.windows) if self.simulator else self.config.initial_window_count
        if random.random() < 0.3:
            # 随机挑一个窗口
            return [random.randint(0, window_count - 1)]
        else:
            # 随机挑 2~3 个偏好窗口
            num_prefs = random.randint(2, min(3, window_count))
            return random.sample(range(window_count), num_prefs)
    
    def _get_preferred_seat_type(self) -> SeatType:
        """更平衡的座位类型偏好分配"""
        if self.simulator:
            return self.simulator._get_balanced_preference()
        
        r = random.random()
        if r < 0.25:
            return SeatType.TWO_PERSON
        elif r < 0.45:
            return SeatType.FOUR_PERSON
        elif r < 0.60:
            return SeatType.SIX_PERSON
        elif r < 0.80:
            return SeatType.BAR
        else:
            return SeatType.SOFA


class WindowQueueManager:
    """窗口排队管理器"""
    
    def __init__(self, windows: List[Window], config: SimulationConfig):
        self.windows = windows
        self.config = config
        self.window_open_time = {}
    
    def assign_to_best_window(self, person: Person) -> Optional[int]:
        """为人员分配到排队最短的窗口（单窗口队列上限20人，超限拒绝；动态开窗阈值15人由config控制）"""
        open_windows = [(i, w) for i, w in enumerate(self.windows) if w.is_open]
        if not open_windows:
            return None

        # 过滤掉已满的窗口（队列>=20人）
        not_full = [(i, w) for i, w in open_windows if w.get_queue_length() < 20]

        # 如果所有窗口都满了，拒绝该人员（直接离开，不加入队列）
        if not not_full:
            person.state = PersonState.LEFT
            person.leave_time = 0
            return None

        # 优先偏好窗口，否则所有未满窗口
        valid = [(i, w) for i, w in not_full if i in person.preferred_windows]
        if not valid:
            valid = not_full

        best_idx, best_window = min(valid, key=lambda iw: iw[1].get_queue_length())

        best_window.add_to_queue(person.id)
        person.state = PersonState.QUEUING
        if person.queue_start_time is None:
            person.queue_start_time = 0  # Will be set by caller
        person.window_id = best_idx

        return best_idx
    
    def get_current_service_time(self, time_step: int, window_base_speed: float) -> float:
        """获取当前打饭所需时间（分钟）"""
        wave_component = sin_wave(time_step, 60, 0.3)
        random_noise = random.gauss(0, self.config.window_speed_variance)
        service_time = window_base_speed * (1 + wave_component + random_noise)
        return max(0.8, service_time)  # 最低 0.8 分钟
    
    def process_windows(self, people_dict: Dict[int, Person], time_step: int) -> List[int]:
        """处理所有窗口的打饭工作，返回完成服务的人员ID列表"""
        served_people = []
        
        for window in self.windows:
            if not window.is_open:
                continue
            
            # 当前步骤可以服务多人（如果速度够快）
            steps_available = 1.0  # 每步有1分钟可用
            
            # 1. 先完成当前正在服务的人
            if window.serving_person_id is not None:
                window.current_service_time -= steps_available
                steps_available = 0
                if window.current_service_time <= 0:
                    person = people_dict[window.serving_person_id]
                    person.state = PersonState.SERVING
                    served_people.append(window.serving_person_id)
                    window.cumulative_served += 1
                    window.serving_person_id = None
                    # 剩余时间继续服务下一个人
                    steps_available = -window.current_service_time
                    window.current_service_time = 0
            
            # 2. 继续服务队列中的人（利用剩余时间）
            while steps_available > 0 and window.queue:
                next_person_id = window.queue.pop(0)
                person = people_dict.get(next_person_id)
                if not person:
                    continue

                # 跳过刚入队的人（同一步内到达的不应被立即服务）
                if person.queue_start_time == time_step:
                    window.queue.insert(0, next_person_id)  # 放回队首
                    steps_available = 0
                    break

                window.serving_person_id = next_person_id
                person.serve_start_time = time_step
                service_time = self.get_current_service_time(time_step, window.window_base_speed)
                
                if service_time <= steps_available:
                    # 可以在本步内完成
                    person.state = PersonState.SERVING
                    served_people.append(window.serving_person_id)
                    window.cumulative_served += 1
                    window.serving_person_id = None
                    steps_available -= service_time
                else:
                    # 不能完成，留到下一步
                    window.current_service_time = service_time - steps_available
                    steps_available = 0
                    break
        
        return served_people

    def rebalance_queues(self, new_window_id: int):
        """新窗口激活后，从最长队列迁移部分人员到新窗口"""
        new_window = next((w for w in self.windows if w.id == new_window_id), None)
        if not new_window or not new_window.is_open:
            return

        open_windows = [w for w in self.windows if w.is_open and w.id != new_window_id]
        if not open_windows:
            return

        longest = max(open_windows, key=lambda w: w.get_queue_length())
        overflow = max(0, longest.get_queue_length() - 5)
        to_move = min(overflow, 5)

        for _ in range(to_move):
            if longest.queue:
                moved_id = longest.queue.pop()
                new_window.add_to_queue(moved_id)

class DynamicWindowManager:
    """动态窗口开关管理器 - 实际增减窗口数量"""

    def __init__(self, windows: List[Window], config: SimulationConfig, simulator: Optional['CafeteriaSimulator'] = None):
        self.windows = windows
        self.config = config
        self.simulator = simulator
        self.queue_threshold_open = config.window_open_threshold
        self.queue_threshold_close = config.window_close_threshold
        self.cooldown_period = 15  # 冷却时间（分钟）
        self.last_change_time = 0  # prevent immediate changes at simulation start
        self.activating_windows: Dict[int, Tuple[Window, int]] = {}  # 待激活窗口 {id: (window, ready_time)}
        self.next_window_id = len(windows)

    def update_window_status(self, time_step: int):
        """根据单窗口排队长度动态增减窗口"""
        # 如果未启用动态窗口管理，仅处理待激活窗口后返回
        if not self.config.dynamic_windows_enabled:
            activated = []
            for wid, (win, ready_time) in list(self.activating_windows.items()):
                if time_step >= ready_time:
                    win.is_open = True
                    self.windows.append(win)
                    activated.append(wid)
                    print(f"  [OK] Window {wid} activated (5min prep done)")
                    if self.simulator:
                        self.simulator.queue_manager.rebalance_queues(wid)
            for wid in activated:
                del self.activating_windows[wid]
            return

        # 先处理待激活窗口
        activated = []
        for wid, (win, ready_time) in list(self.activating_windows.items()):
            if time_step >= ready_time:
                win.is_open = True
                self.windows.append(win)
                activated.append(wid)
                print(f"  [OK] Window {wid} activated (5min prep done)")
                if self.simulator:
                    self.simulator.queue_manager.rebalance_queues(wid)
        for wid in activated:
            del self.activating_windows[wid]

        # Only consider active windows (not activating ones)
        all_windows = self.windows + [w for w, _ in self.activating_windows.values()]
        open_windows = [w for w in self.windows if w.is_open]
        if not open_windows:
            return

        # Startup grace period for window management
        if time_step < 10:
            return

        # 开窗条件：任一窗口排队 > 15，且总窗口数（含准备中）未达上限
        total_active_or_activating = len(all_windows)
        any_overloaded = any(w.get_queue_length() > self.queue_threshold_open for w in open_windows)
        if any_overloaded and total_active_or_activating < self.config.max_windows:
            self._add_window(time_step)
            self.last_change_time = time_step

    def _add_window(self, time_step: int):
        """新增窗口（5分钟激活等待）"""
        new_win = Window(
            id=self.next_window_id,
            is_open=False,  # 暂时关闭，等待激活
            window_base_speed=self.config.window_base_speed,
        )
        ready_time = time_step + 5  # 5分钟准备期
        self.activating_windows[self.next_window_id] = (new_win, ready_time)
        print(f"  [ADD] New window {self.next_window_id} ready at step {ready_time}")
        self.next_window_id += 1

class SeatAllocationManager:
    """座位分配管理器（支持小组预留 + 轮询分配）"""
    
    def __init__(self, tables: List[Table]):
        self.tables = tables
        self.group_table: Dict[int, Table] = {}
        self.group_seats: Dict[int, List[int]] = {}
        self._last_table_index = 0
        self.total_attempts = 0      # 调试：总分配尝试次数
        self.success_count = 0       # 调试：成功次数
        self.fail_reasons = {        # 调试：失败原因统计
            "no_free_seat": 0,
            "pref_type_full": 0,
            "all_full": 0
        }
    
    def get_empty_seats_count(self) -> int:
        """获取空座位总数"""
        return sum(table.free_seats_count for table in self.tables)
    
    def allocate_seat(self, person: Person, people_dict: Dict[int, Person]) -> bool:
        """分配座位"""
        self.total_attempts += 1

        # 每100次打印一次统计
        if self.total_attempts % 100 == 0:
            total_seats = sum(t.capacity for t in self.tables)
            occupied_seats = sum(t.occupied_count for t in self.tables)
            print(f"[座位统计 t={self.total_attempts}] 成功={self.success_count}, 空余={total_seats - occupied_seats}/{total_seats}")
        
        # 1. 已有小组：直接坐预留桌子的空位
        if person.group_id >= 0 and person.group_id in self.group_table:
            table = self.group_table[person.group_id]
            for seat in table.seats:
                if seat.is_empty:
                    seat.occupy(str(person.id))
                    person.seat_id = table.id
                    person.seat_index = seat.position
                    self.group_seats[person.group_id].append(seat.position)
                    self.success_count += 1
                    return True
            return False
        
        # 2. 新小组：找能坐下整个小组的桌子
        if person.group_id >= 0:
            group_size = self._get_current_group_size(person.group_id, people_dict)
            for table in self.tables:
                if table.seat_type == person.preferred_seat_type and table.free_seats_count >= group_size:
                    self.group_table[person.group_id] = table
                    self.group_seats[person.group_id] = []
                    for seat in table.seats:
                        if seat.is_empty:
                            seat.occupy(str(person.id))
                            person.seat_id = table.id
                            person.seat_index = seat.position
                            self.group_seats[person.group_id].append(seat.position)
                            self.success_count += 1
                            return True
        
        # 3. 个人分配
        result = self._allocate_individual(person)
        if result:
            self.success_count += 1
        else:
            # 记录失败原因
            total_free = sum(t.free_seats_count for t in self.tables)
            if total_free == 0:
                self.fail_reasons["all_full"] += 1
            else:
                self.fail_reasons["no_free_seat"] += 1
        return result
    
    def _get_current_group_size(self, group_id: int, people_dict: Dict[int, Person]) -> int:
        """获取小组当前活跃人数（排除已离开的）"""
        return sum(1 for p in people_dict.values()
                   if p.group_id == group_id and p.state != PersonState.LEFT)
    
    def _allocate_individual(self, person: Person) -> bool:
        """轮询分配座位"""


        start_index = self._last_table_index
        num_tables = len(self.tables)
        
        # 1. 先按偏好的类型找（轮询）
        for offset in range(num_tables):
            idx = (start_index + offset) % num_tables
            table = self.tables[idx]
            
            if table.seat_type == person.preferred_seat_type and table.free_seats_count > 0:
                if table.occupy_first_free(str(person.id)):
                    person.seat_id = table.id
                    for seat in table.seats:
                        if seat.occupied_by == str(person.id):
                            person.seat_index = seat.position
                            break
                    self._last_table_index = (idx + 1) % num_tables
                    return True
        
        # 2. 计算各类型桌子的占用率
        type_occupancy = {}
        for seat_type in SeatType:
            tables_of_type = [t for t in self.tables if t.seat_type == seat_type]
            if tables_of_type:
                total_seats = sum(t.capacity for t in tables_of_type)
                occupied_seats = sum(t.occupied_count for t in tables_of_type)
                type_occupancy[seat_type] = occupied_seats / total_seats if total_seats > 0 else 1
        
        # 按占用率从低到高排序
        sorted_types = sorted(type_occupancy.items(), key=lambda x: x[1])
        
        # 3. 尝试占用率最低的桌子类型（轮询）
        for seat_type, occ_rate in sorted_types:
            for offset in range(num_tables):
                idx = (start_index + offset) % num_tables
                table = self.tables[idx]
                if table.seat_type == seat_type and table.free_seats_count > 0:
                    if table.occupy_first_free(str(person.id)):
                        person.seat_id = table.id
                        for seat in table.seats:
                            if seat.occupied_by == str(person.id):
                                person.seat_index = seat.position
                                break
                        self._last_table_index = (idx + 1) % num_tables
                        return True

        return False
    
    def release_seat(self, person_id: int) -> bool:
        """释放座位"""
        for table in self.tables:
            if table.release_seat(str(person_id)):
                return True
        return False


class CafeteriaSimulator:
    """食堂仿真主引擎"""
    
    def __init__(self, config: SimulationConfig):
        self.config = config
        self.time_step = 0
        self.people_dict: Dict[int, Person] = {}
        
        # 初始化窗口
        self.windows = [Window(id=i, window_base_speed=config.window_base_speed)
                       for i in range(config.initial_window_count)]
        
        # 初始化座位（顺序与前端 layoutEngine.ts 对齐：six → four → two → bar → sofa）
        self.tables = []
        table_id = 0

        for _ in range(config.six_person_table_count):
            self.tables.append(Table(id=table_id, seat_type=SeatType.SIX_PERSON))
            table_id += 1

        for _ in range(config.four_person_table_count):
            self.tables.append(Table(id=table_id, seat_type=SeatType.FOUR_PERSON))
            table_id += 1

        for _ in range(config.two_person_table_count):
            self.tables.append(Table(id=table_id, seat_type=SeatType.TWO_PERSON))
            table_id += 1

        for _ in range(config.bar_seat_count):
            self.tables.append(Table(id=table_id, seat_type=SeatType.BAR))
            table_id += 1

        for _ in range(config.sofa_seat_count):
            self.tables.append(Table(id=table_id, seat_type=SeatType.SOFA))
            table_id += 1
        
        # 初始化管理器
        self.arrival_simulator = ArrivalSimulator(config, self)
        self.queue_manager = WindowQueueManager(self.windows, config)
        self.seat_manager = SeatAllocationManager(self.tables)
        self.window_manager = DynamicWindowManager(self.windows, config, self)
        
        # 统计数据
        self.snapshots: List[SimSnapshot] = []
    
    def step(self) -> SimSnapshot:
        """执行一个时间步（1分钟）的仿真"""
        
        # 1. 生成新到达的人员
        new_arrivals = self.arrival_simulator.generate_arrivals(self.time_step)
        for person in new_arrivals:
            self.people_dict[person.id] = person
        
        # 2. 为新到达的人员分配窗口（所有新到达的人都应该先排队）
        for person in new_arrivals:
            person.queue_start_time = self.time_step
            self.queue_manager.assign_to_best_window(person)
        
        # 3. 处理窗口打饭
        served_people_ids = self.queue_manager.process_windows(self.people_dict, self.time_step)
        
        # 4. 为完成打饭的人员分配座位
        for person_id in served_people_ids:
            person = self.people_dict[person_id]
            person.seat_start_time = self.time_step
            if self.seat_manager.allocate_seat(person, self.people_dict):
                person.state = PersonState.SEATED
            else:
                person.state = PersonState.SERVING  # 无空位，保持等待

        # 4b. 重试之前分配座位失败的人（被卡在 SERVING 状态）
        for person in self.people_dict.values():
            if person.state == PersonState.SERVING and person.seat_id is None:
                if self.seat_manager.allocate_seat(person, self.people_dict):
                    person.state = PersonState.SEATED
                    person.seat_start_time = self.time_step

        # 5. 检查就餐完成的人员并释放座位
        MIN_EATING_TIME = 5  # 最短用餐时间（分钟），防止入座即离席
        for person in self.people_dict.values():
            if person.state == PersonState.SEATED and person.seat_start_time is not None:
                stay_time = self.time_step - person.seat_start_time
                required_stay = max(person.avg_stay_duration, MIN_EATING_TIME)
                if stay_time >= required_stay:
                    person.state = PersonState.LEFT
                    person.leave_time = self.time_step
                    self.seat_manager.release_seat(person.id)
        
        # 6. 动态窗口管理
        self.window_manager.update_window_status(self.time_step)
        
        # 7. 生成快照
        snapshot = self._create_snapshot()
        self.snapshots.append(snapshot)
        
        self.time_step += 1
        
        return snapshot
    
    def _create_snapshot(self) -> SimSnapshot:
        """创建当前时间步的快照"""
        total_arrived = len(self.people_dict)
        total_seated = sum(1 for p in self.people_dict.values() if p.state == PersonState.SEATED)
        total_left = sum(1 for p in self.people_dict.values() if p.state == PersonState.LEFT)
        
        # 计算平均等待时长
        queued_or_served = [p for p in self.people_dict.values()
                          if p.queue_start_time is not None]
        if queued_or_served:
            wait_times = [p.get_queue_wait_time(self.time_step) for p in queued_or_served]
            avg_wait_time = sum(wait_times) / len(wait_times)
        else:
            avg_wait_time = 0
        
        snapshot = SimSnapshot(
            timestep=self.time_step,
            total_arrived=total_arrived,
            total_seated=total_seated,
            total_left=total_left,
            avg_wait_time=avg_wait_time,
            empty_seats=self.seat_manager.get_empty_seats_count(),
            window_queue_lengths=[w.get_queue_length() for w in self.windows],
            window_cumulative_served=[w.cumulative_served for w in self.windows],
            window_current_speed=[self.queue_manager.get_current_service_time(self.time_step, w.window_base_speed) 
                                  for w in self.windows],
            seat_occupancy_by_type=self._get_seat_occupancy_by_type(),
            simulation_config=self.config.__dict__
        )
        
        return snapshot

    def get_state_for_frontend(self) -> Dict:
        """获取前端渲染所需的当前状态"""

        # 1. 桌子数据（带每个座位的详情）
        tables_data = []
        for table in self.tables:
            seats_data = []
            for seat in table.seats:
                seats_data.append({
                    "position": seat.position,
                    "occupied_by": seat.occupied_by
                })
            tables_data.append({
                "id": table.id,
                "type": table.seat_type.value,
                "capacity": table.capacity,
                "occupied": table.occupied_count,
                "seats": seats_data
            })

        # 2. 窗口数据（含实时打饭速度）
        windows_data = []
        for w in self.windows:
            speed = self.queue_manager.get_current_service_time(self.time_step, w.window_base_speed)
            windows_data.append({
                "id": w.id,
                "queue_length": w.get_queue_length(),
                "cumulative_served": w.cumulative_served,
                "is_open": w.is_open,
                "current_service_speed": round(speed, 2),
            })

        # 3. 所有人员数据（统一列表，前端根据状态自行布局）
        table_type_lookup = {t.id: t.seat_type.value for t in self.tables}
        all_persons = []
        for person in self.people_dict.values():
            # 保留 LEFT 状态的人 10 步以便淡出
            if person.state == PersonState.LEFT and (self.time_step - person.leave_time) > 30:
                continue
            # 计算排队索引
            q_idx = 0
            if person.window_id is not None and person.window_id < len(self.windows):
                try:
                    q_idx = self.windows[person.window_id].queue.index(person.id)
                except ValueError:
                    q_idx = 0
            all_persons.append({
                "id": person.id,
                "state": person.state.value,
                "group_id": person.group_id,
                "window_id": person.window_id,
                "table_id": person.seat_id,
                "table_type": table_type_lookup.get(person.seat_id) if person.seat_id is not None else None,
                "seat_index": getattr(person, 'seat_index', 0),
                "queue_index": q_idx,
            })

        # 4. 准备中窗口
        activating_windows_data = []
        for wid, (_, ready_time) in self.window_manager.activating_windows.items():
            activating_windows_data.append({
                "id": wid,
                "ready_at": ready_time,
            })

        return {
            "timestep": self.time_step,
            "windows": windows_data,
            "activating_windows": activating_windows_data,
            "tables": tables_data,
            "all_persons": all_persons,
            "queuing_count": sum(1 for p in self.people_dict.values() if p.state == PersonState.QUEUING),
            "seated_count": sum(1 for p in self.people_dict.values() if p.state == PersonState.SEATED),
            "total_arrived": len(self.people_dict),
            "total_left": sum(1 for p in self.people_dict.values() if p.state == PersonState.LEFT),
            "avg_wait_time": self._calculate_avg_wait_time()
        }
    
    def _calculate_avg_wait_time(self) -> float:
        queued_or_served = [p for p in self.people_dict.values()
                          if p.queue_start_time is not None]
        if queued_or_served:
            wait_times = [p.get_queue_wait_time(self.time_step) for p in queued_or_served]
            return sum(wait_times) / len(wait_times)
        return 0
    
    def _get_seat_occupancy_by_type(self) -> Dict[str, int]:
        """按座位类型统计占用数"""
        occupancy = {
            "two_person": 0,
            "four_person": 0,
            "six_person": 0,
            "bar": 0,
            "sofa": 0,
        }
        
        for table in self.tables:
            type_key = table.seat_type.value
            occupancy[type_key] += table.occupied_count
        
        return occupancy
    
    def _get_balanced_preference(self) -> SeatType:
        """根据当前座位占用情况动态调整偏好"""
        empty_ratio = {}
        for seat_type in SeatType:
            tables_of_type = [t for t in self.tables if t.seat_type == seat_type]
            if tables_of_type:
                total_seats = sum(t.capacity for t in tables_of_type)
                empty_seats = sum(t.free_seats_count for t in tables_of_type)
                empty_ratio[seat_type] = empty_seats / total_seats if total_seats > 0 else 0
        
        types = list(empty_ratio.keys())
        weights = [max(0.2, empty_ratio[t]) + 0.1 for t in types]
        return random.choices(types, weights=weights, k=1)[0]