"""
仿真参数全局配置
"""
from dataclasses import dataclass, field
from typing import List, Dict, Optional
from enum import Enum
import math
import random as py_random


class Scenario(Enum):
    """仿真场景"""
    BREAKFAST = "breakfast"   # 早餐：相对均匀
    LUNCH = "lunch"           # 午餐：双峰分布
    DINNER = "dinner"         # 晚餐：长尾分布


class SeatTypeForConfig(Enum):
    """配置中使用的座位类型（避免循环导入）"""
    TWO_PERSON = "two_person"
    FOUR_PERSON = "four_person"
    SIX_PERSON = "six_person"
    BAR = "bar"
    SOFA = "sofa"


@dataclass
class SimulationConfig:
    """仿真配置 - 与座位、人员、窗口等各模块对齐"""
    
    # 基础仿真参数 
    scenario: str = "lunch"                    # 仿真场景 (breakfast/lunch/dinner)
    total_duration: int = 240                  # 总仿真时长（分钟）
    random_seed: int = 42                      # 随机种子（便于重现）
    enable_logging: bool = True                # 是否启用详细日志
    
    # 窗口配置
    initial_window_count: int = 4              # 初始窗口数量
    min_windows: int = 2                       # 最少窗口数
    max_windows: int = 8                       # 最多窗口数
    window_open_threshold: int = 15            # 单窗口排队 > 此值开新窗口
    window_close_threshold: int = 3            # 单窗口排队 < 此值关窗口
    window_base_speed: float = 2.0             # 窗口打饭速度（分钟/人，越小越快）
    window_speed_variance: float = 0.2         # 速度波动方差
    dynamic_windows_enabled: bool = True       # 是否启用动态窗口管理

    # 座位配置
    two_person_table_count: int = 8            # 双人桌数量（容量2人/桌）
    four_person_table_count: int = 10          # 四人桌数量（容量4人/桌）
    six_person_table_count: int = 5            # 六人桌数量（容量6人/桌）
    bar_seat_count: int = 6                    # 吧台座位数（1人/座）
    sofa_seat_count: int = 4                   # 沙发座位数（3人/座）

    # 人员行为参数
    avg_service_time: float = 1.0              # 平均打饭时间（分钟/人）
    avg_meal_duration: int = 25                # 平均就餐时长（分钟）
    meal_duration_variance: float = 8.0        # 就餐时长标准差（分钟）

    # 到达率参数
    arrival_rate_base: float = 6.0             # 基础到达率（人/分钟）
    
    #  小组分布参数
    solo_ratio: float = 0.5                    # 独行者占比（50%）
    pair_ratio: float = 0.3                    # 两人小组占比（30%）
    group_ratio: float = 0.2                   # 3-5人小组占比（20%）
    avg_group_size: int = 4                    # 小组平均人数
    
    # 座位类型偏好
    seat_type_preference: Dict[str, float] = field(default_factory=lambda: {
        "four_person": 0.5,    # 50% 偏好四人桌
        "six_person": 0.2,     # 20% 偏好六人桌
        "two_person": 0.15,    # 15% 偏好双人桌
        "sofa": 0.1,           # 10% 偏好沙发
        "bar": 0.05,           # 5% 偏好吧台
    })
    
    # 窗口偏好（None表示均匀分布）
    window_popularity: Optional[List[float]] = None
    
    def __post_init__(self):
        """初始化后的验证和处理"""
        self._validate_config()
        self._normalize_preferences()
    
    def _validate_config(self):
        """验证配置参数的合法性"""
        errors = []
        
        # 场景验证
        valid_scenes = ["breakfast", "lunch", "dinner"]
        if self.scenario not in valid_scenes:
            errors.append(f"scenario 必须是 {valid_scenes} 之一，当前: {self.scenario}")
        
        # 时长验证
        if self.total_duration <= 0:
            errors.append(f"total_duration 必须 > 0，当前: {self.total_duration}")
        
        # 窗口数量验证
        if self.initial_window_count <= 0:
            errors.append(f"initial_window_count 必须 > 0，当前: {self.initial_window_count}")
        if self.min_windows < 1:
            errors.append(f"min_windows 至少为1，当前: {self.min_windows}")
        if self.max_windows < self.min_windows:
            errors.append(f"max_windows ({self.max_windows}) 不能小于 min_windows ({self.min_windows})")
        
        # 阈值验证
        if self.window_open_threshold <= self.window_close_threshold:
            errors.append(f"open_threshold ({self.window_open_threshold}) 应大于 close_threshold ({self.window_close_threshold})")
        
        # 速度验证
        if self.window_base_speed <= 0:
            errors.append(f"window_base_speed 必须 > 0，当前: {self.window_base_speed}")
        
        # 座位数验证
        if self.two_person_table_count < 0:
            errors.append(f"two_person_table_count 不能为负数")
        if self.four_person_table_count < 0:
            errors.append(f"four_person_table_count 不能为负数")
        if self.six_person_table_count < 0:
            errors.append(f"six_person_table_count 不能为负数")
        if self.bar_seat_count < 0:
            errors.append(f"bar_seat_count 不能为负数")
        if self.sofa_seat_count < 0:
            errors.append(f"sofa_seat_count 不能为负数")
        
        # 总座位数为0警告（不报错，只是警告）
        if self.get_total_seat_count() == 0:
            errors.append(f"总座位数为0，请至少配置一种座位")
        
        # 就餐时长验证
        if self.avg_meal_duration <= 0:
            errors.append(f"avg_meal_duration 必须 > 0")
        
        # 小组比例和验证
        ratio_sum = self.solo_ratio + self.pair_ratio + self.group_ratio
        if not (0.99 <= ratio_sum <= 1.01):
            errors.append(f"小组比例和应接近1.0，当前: {ratio_sum}")
        
        # 各比例范围验证
        for name, val in [("solo_ratio", self.solo_ratio), 
                          ("pair_ratio", self.pair_ratio), 
                          ("group_ratio", self.group_ratio)]:
            if not (0 <= val <= 1):
                errors.append(f"{name} 必须在0-1之间，当前: {val}")
        
        if errors:
            raise ValueError("\n".join(errors))
    
    def _normalize_preferences(self):
        """标准化偏好比例（确保和为1）"""
        total = sum(self.seat_type_preference.values())
        if total > 0 and abs(total - 1.0) > 0.01:
            for key in self.seat_type_preference:
                self.seat_type_preference[key] /= total
    
    # 查询方法 
    
    def get_total_seat_count(self) -> int:
        """获取总座位数"""
        return (2 * self.two_person_table_count +
                4 * self.four_person_table_count +
                6 * self.six_person_table_count +
                1 * self.bar_seat_count +
                3 * self.sofa_seat_count)
    
    def get_lambda(self, timestep: int) -> float:
        """
        根据时间和场景获取到达率λ（泊松分布参数）
        返回：当前时间步的平均到达人数（人/分钟）
        """
        if self.scenario == "breakfast":
            # 早餐：均匀低流量
            return self.arrival_rate_base * 0.6

        elif self.scenario == "lunch":
            # 午餐：真实双峰分布
            # 第一波：11:00前后，峰值在 t=40
            # 第二波：12:30前后，峰值在 t=65
            t = float(timestep)
            peak1_center = 40.0
            peak1_amp = 3.0
            peak1_sigma = 22.0

            peak2_center = 65.0
            peak2_amp = 4.5
            peak2_sigma = 18.0

            baseline = 2.0

            gauss1 = peak1_amp * math.exp(-((t - peak1_center) ** 2) / (2 * peak1_sigma ** 2))
            gauss2 = peak2_amp * math.exp(-((t - peak2_center) ** 2) / (2 * peak2_sigma ** 2))

            return baseline + gauss1 + gauss2

        elif self.scenario == "dinner":
            # 晚餐：逐渐递减
            decay = max(0, 1 - timestep / self.total_duration)
            return self.arrival_rate_base * 0.7 * decay

        else:
            return self.arrival_rate_base
    
    def get_seat_distribution(self) -> Dict[str, int]:
        """获取座位配置字典（便于初始化）"""
        return {
            "two_person": self.two_person_table_count,
            "four_person": self.four_person_table_count,
            "six_person": self.six_person_table_count,
            "bar": self.bar_seat_count,
            "sofa": self.sofa_seat_count,
        }
    
    def get_preferred_seat_type(self, random_val: float = None) -> str:
        """
        根据偏好分布随机选择座位类型
        返回字符串类型，便于前端使用
        """
        if random_val is None:
            random_val = py_random.random()
        
        cumulative = 0
        # 按优先级顺序
        for seat_type_str in ["four_person", "six_person", "two_person", "sofa", "bar"]:
            cumulative += self.seat_type_preference.get(seat_type_str, 0)
            if random_val <= cumulative:
                return seat_type_str
        
        return "four_person"
    
    def get_group_size(self, random_val: float = None) -> int:
        """
        根据小组分布随机生成小组人数
        """
        if random_val is None:
            random_val = py_random.random()
        
        if random_val <= self.solo_ratio:
            return 1
        elif random_val <= self.solo_ratio + self.pair_ratio:
            return 2
        else:
            # 3-5人小组，偏向平均值
            # 使用简单分布：3人40%，4人40%，5人20%
            r = py_random.random()
            if r < 0.4:
                return 3
            elif r < 0.8:
                return 4
            else:
                return 5
    
    # 配置输出 
    
    def to_dict(self) -> Dict:
        """转为字典（便于JSON序列化和数据库存储）"""
        return {
            "scenario": self.scenario,
            "total_duration": self.total_duration,
            "initial_window_count": self.initial_window_count,
            "min_windows": self.min_windows,
            "max_windows": self.max_windows,
            "window_open_threshold": self.window_open_threshold,
            "window_close_threshold": self.window_close_threshold,
            "window_base_speed": self.window_base_speed,
            "window_speed_variance": self.window_speed_variance,
            "two_person_table_count": self.two_person_table_count,
            "four_person_table_count": self.four_person_table_count,
            "six_person_table_count": self.six_person_table_count,
            "bar_seat_count": self.bar_seat_count,
            "sofa_seat_count": self.sofa_seat_count,
            "avg_service_time": self.avg_service_time,
            "avg_meal_duration": self.avg_meal_duration,
            "meal_duration_variance": self.meal_duration_variance,
            "arrival_rate_base": self.arrival_rate_base,
            "solo_ratio": self.solo_ratio,
            "pair_ratio": self.pair_ratio,
            "group_ratio": self.group_ratio,
            "avg_group_size": self.avg_group_size,
            "seat_type_preference": self.seat_type_preference,
            "window_popularity": self.window_popularity,
            "random_seed": self.random_seed,
            "enable_logging": self.enable_logging,
            "dynamic_windows_enabled": self.dynamic_windows_enabled,
            "total_seat_count": self.get_total_seat_count(),
        }
    
    def __str__(self) -> str:
        """友好的字符串输出"""
        return f"""
【仿真配置】
场景: {self.scenario}
时长: {self.total_duration} 分钟
随机种子: {self.random_seed}

【窗口配置】
  初始窗口: {self.initial_window_count} 个
  窗口范围: {self.min_windows} ~ {self.max_windows} 个
  开窗阈值: 队列 > {self.window_open_threshold}
  关窗阈值: 队列 < {self.window_close_threshold}
  打饭速度: {self.window_base_speed} 人/分钟 ±{self.window_speed_variance}

【座位配置】
  总座位数: {self.get_total_seat_count()} 个
  - 双人桌: {self.two_person_table_count} 张 (容量 {self.two_person_table_count * 2})
  - 四人桌: {self.four_person_table_count} 张 (容量 {self.four_person_table_count * 4})
  - 六人桌: {self.six_person_table_count} 张 (容量 {self.six_person_table_count * 6})
  - 吧台: {self.bar_seat_count} 个
  - 沙发: {self.sofa_seat_count} 个 (容量 {self.sofa_seat_count * 3})

【人员行为】
  平均打饭时间: {self.avg_service_time} 分钟/人
  平均就餐时间: {self.avg_meal_duration} ± {self.meal_duration_variance} 分钟
  基础到达率: {self.arrival_rate_base} 人/分钟

【小组分布】
  独行者: {self.solo_ratio * 100:.0f}%
  两人小组: {self.pair_ratio * 100:.0f}%
  三人以上: {self.group_ratio * 100:.0f}%

【座位偏好】
  四人桌: {self.seat_type_preference.get('four_person', 0) * 100:.0f}%
  六人桌: {self.seat_type_preference.get('six_person', 0) * 100:.0f}%
  双人桌: {self.seat_type_preference.get('two_person', 0) * 100:.0f}%
  沙发: {self.seat_type_preference.get('sofa', 0) * 100:.0f}%
  吧台: {self.seat_type_preference.get('bar', 0) * 100:.0f}%
"""


# 预设配置 

def get_lunch_config() -> SimulationConfig:
    """午餐场景默认配置"""
    return SimulationConfig(
        scenario="lunch",
        total_duration=120,
        initial_window_count=4,
        window_base_speed=1.0,
        arrival_rate_base=4.0,
        solo_ratio=0.4,
        pair_ratio=0.35,
        group_ratio=0.25,
    )


def get_breakfast_config() -> SimulationConfig:
    """早餐场景默认配置"""
    return SimulationConfig(
        scenario="breakfast",
        total_duration=90,
        initial_window_count=3,
        window_base_speed=1.2,
        arrival_rate_base=2.5,
        solo_ratio=0.7,
        pair_ratio=0.25,
        group_ratio=0.05,
    )


def get_dinner_config() -> SimulationConfig:
    """晚餐场景默认配置"""
    return SimulationConfig(
        scenario="dinner",
        total_duration=120,
        initial_window_count=3,
        window_base_speed=1.2,
        arrival_rate_base=3.5,
        solo_ratio=0.5,
        pair_ratio=0.3,
        group_ratio=0.2,
    )