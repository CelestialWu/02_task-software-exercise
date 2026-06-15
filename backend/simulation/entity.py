"""person、windows、seats实体定义"""
from enum import Enum
from dataclasses import dataclass, field
from datetime import datetime
from typing import List, Optional, Tuple, Dict
import math
import random

class PersonState(Enum): # 定义一组固定的有限的选项
    """人员状态枚举"""
    ARRIVED = "arrived"  # 刚到达
    QUEUING = "queuing"  # 排队中
    SERVING = "serving"  # 正在打饭
    SEATED = "seated"  # 就座中
    LEFT = "left"  # 已离场

class SeatType(Enum):
    """座位类型"""
    TWO_PERSON = "two_person"      # 双人桌
    FOUR_PERSON = "four_person"    # 四人桌
    SIX_PERSON = "six_person"      # 六人桌
    BAR = "bar"                    # 吧台（1人）
    SOFA = "sofa"                  # 沙发（4人）

# 桌型容量映射
TABLE_CAPACITY = {
    SeatType.TWO_PERSON: 2,
    SeatType.FOUR_PERSON: 4,
    SeatType.SIX_PERSON: 6,
    SeatType.BAR: 1,
    SeatType.SOFA: 3,  # 4 改成 3
}

# 桌型显示名称
TABLE_DISPLAY_NAME = {
    SeatType.TWO_PERSON: "双人桌",
    SeatType.FOUR_PERSON: "四人桌", 
    SeatType.SIX_PERSON: "六人桌",
    SeatType.BAR: "吧台",
    SeatType.SOFA: "沙发",
}

@dataclass
class Person:
    """人员记录"""
    id: int
    entry_time: int  # 相对于仿真开始的分钟数
    state: PersonState = PersonState.ARRIVED
    preferred_windows: List[int] = field(default_factory=lambda: [0])  # 偏好窗口列表
    preferred_seat_type: SeatType = SeatType.FOUR_PERSON
    group_id: int = -1  # 小组ID (-1表示独行)
    seat_id: Optional[int] = None
    seat_index: Optional[int] = None  # ← 加这一行
    window_id: Optional[int] = None
    
    # 时间戳记录
    queue_start_time: Optional[int] = None
    serve_start_time: Optional[int] = None
    seat_start_time: Optional[int] = None
    leave_time: Optional[int] = None
    
    # 平均停留时长
    avg_stay_duration: int = 30
    
    def get_queue_wait_time(self, current_time: int) -> int:
        """获取当前排队等待时长"""
        if self.queue_start_time is None:
            return 0
        if self.state == PersonState.LEFT:
            return self.serve_start_time - self.queue_start_time if self.serve_start_time else 0
        return current_time - self.queue_start_time


@dataclass
class Seat:
    """单个座位（一张桌子里的一个位置）"""
    position: int                    # 座位编号 0,1,2,3...
    occupied_by: Optional[str] = None  # None表示空，否则存person_id
    
    @property
    def is_occupied(self) -> bool:
        return self.occupied_by is not None
    
    @property
    def is_empty(self) -> bool:
        return self.occupied_by is None
    
    def occupy(self, person_id: str) -> bool:
        """占用座位"""
        if self.is_empty:
            self.occupied_by = person_id
            return True
        return False
    
    def release(self) -> bool:
        """释放座位"""
        if self.is_occupied:
            self.occupied_by = None
            return True
        return False


@dataclass
class Table:
    """一张餐桌，包含多个座位"""
    id: int
    seat_type: SeatType
    seats: List[Seat] = field(default_factory=list)
    
    def __post_init__(self):
        """根据桌型初始化座位"""
        if not self.seats:
            capacity = TABLE_CAPACITY[self.seat_type]
            self.seats = [Seat(position=i) for i in range(capacity)]

    @property
    def capacity(self) -> int:
        """桌子总容量"""
        return len(self.seats)
    
    @property
    def occupied_count(self) -> int:
        """当前占用人数"""
        return sum(1 for seat in self.seats if seat.is_occupied)
    
    @property
    def free_seats_count(self) -> int:
        """空座位数量"""
        return self.capacity - self.occupied_count
    
    @property
    def occupancy_rate(self) -> float:
        """占用率 0.0~1.0"""
        if self.capacity == 0:
            return 0
        return self.occupied_count / self.capacity
    
    @property
    def is_full(self) -> bool:
        """是否满座"""
        return self.free_seats_count == 0
    
    @property
    def is_empty(self) -> bool:
        """是否空桌"""
        return self.occupied_count == 0
    
    @property
    def occupied_by(self) -> List[str]:
        """获取所有占用人员的ID列表"""
        return [seat.occupied_by for seat in self.seats if seat.is_occupied]
    
    # ========== 座位信息查询 ==========
    
    def get_free_positions(self) -> List[int]:
        """获取所有空座位的编号"""
        return [seat.position for seat in self.seats if seat.is_empty]
    
    def get_occupied_positions(self) -> List[int]:
        """获取所有被占用的座位编号"""
        return [seat.position for seat in self.seats if seat.is_occupied]
    
    def get_seat_status(self) -> List[bool]:
        """获取座位占用状态列表 [True=占用, False=空闲]"""
        return [seat.is_occupied for seat in self.seats]

    def occupy_seat(self, position: int, person_id: str) -> bool:
        """指定位置坐下"""
        if 0 <= position < self.capacity:
            return self.seats[position].occupy(person_id)
        return False
    
    def occupy_first_free(self, person_id: str) -> bool:
        """坐第一个空位"""
        for seat in self.seats:
            if seat.is_empty:
                return seat.occupy(person_id)
        return False
    
    def occupy_free_positions(self, person_ids: List[str]) -> bool:
        """
        按顺序占用空位（用于小组）
        返回是否全部成功
        """
        if len(person_ids) > self.free_seats_count:
            return False
        
        free_seats = [seat for seat in self.seats if seat.is_empty]
        for i, person_id in enumerate(person_ids):
            free_seats[i].occupy(person_id)
        return True
    
    def occupy_adjacent(self, person_ids: List[str]) -> bool:
        """
        小组坐在一起（找连续空位）
        返回是否成功
        """
        needed = len(person_ids)
        if needed > self.free_seats_count:
            return False
        
        # 找连续空位
        for i in range(self.capacity - needed + 1):
            if all(self.seats[i+j].is_empty for j in range(needed)):
                for j, person_id in enumerate(person_ids):
                    self.seats[i+j].occupy(person_id)
                return True
        
        return False
    
    def release_seat(self, person_id: str) -> bool:
        """释放指定人员占用的座位"""
        for seat in self.seats:
            if seat.occupied_by == person_id:
                return seat.release()
        return False
    
    def release_all(self):
        """释放所有座位"""
        for seat in self.seats:
            seat.release()



@dataclass
class Window:
    """取餐窗口"""
    id: int
    is_open: bool = True
    queue: List[int] = field(default_factory=list)  # 排队人员ID列表
    cumulative_served: int = 0  # 累计服务人数
    current_service_time: float = 0.0  # 当前正在服务的人需要的时间
    serving_person_id: Optional[int] = None
    window_base_speed: float = 2.0  # 打饭速度基准值（分钟/人）
    
    def get_queue_length(self) -> int:
        return len(self.queue) + (1 if self.serving_person_id is not None else 0)
    
    def add_to_queue(self, person_id: int):
        self.queue.append(person_id)
    
    def remove_from_queue(self, person_id: int):
        if person_id in self.queue:
            self.queue.remove(person_id)

@dataclass
class SimSnapshot:
    timestep: int
    total_arrived: int
    total_seated: int
    total_left: int
    avg_wait_time: float
    empty_seats: int
    window_queue_lengths: List[int]
    
    # 新增字段（加上默认值）
    window_cumulative_served: List[int] = field(default_factory=list)
    window_current_speed: List[float] = field(default_factory=list)
    seat_occupancy_by_type: Dict[str, int] = field(default_factory=dict)
    simulation_config: dict = field(default_factory=dict)


def sin_wave(t: float, period: float = 50, amplitude: float = 1) -> float:
    """正弦波函数"""
    import math
    return amplitude * math.sin(2 * math.pi * t / period)