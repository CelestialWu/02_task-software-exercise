"""
单元测试：食堂仿真系统核心功能测试
"""

import sys
import os

# 添加 backend 目录到路径，以便导入 simulation 模块
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from simulation.config import SimulationConfig
from simulation.engine import CafeteriaSimulator

# 测试1：座位分配逻辑

def test_seat_allocation():
    """
    测试用例1：座位分配逻辑
    验证当配置不同类型和数量的餐桌时，系统能正确计算总座位数。
    """
    
    print("测试用例1：座位分配逻辑")
    
    # ----- 场景A：只有四人桌 -----
    print("\n【场景A】只有四人桌")
    print(f"  输入: 四人桌 = 10张 (每张4座)")
    
    config_a = SimulationConfig(
        four_person_table_count=10,  # 10张四人桌
        two_person_table_count=0,
        six_person_table_count=0,
        bar_seat_count=0,
        sofa_seat_count=0
    )
    
    expected_a = 10 * 4  # 10张 × 4座 = 40
    actual_a = config_a.get_total_seat_count()
    
    print(f"  预期输出: {expected_a} 个座位")
    print(f"  实际输出: {actual_a} 个座位")
    
    assert actual_a == expected_a, f"场景A失败: 预期{expected_a}, 实际{actual_a}"
    print(f" 场景A通过")
    
    # ----- 场景B：混合座位类型 -----
    print("\n【场景B】混合座位类型")
    print(f"  输入:")
    print(f"    - 四人桌: 5张 (每张4座) → 5×4 = 20座")
    print(f"    - 双人桌: 5张 (每张2座) → 5×2 = 10座")
    print(f"    - 六人桌: 2张 (每张6座) → 2×6 = 12座")
    print(f"    - 吧台:   4个 (每个1座) → 4×1 = 4座")
    print(f"    - 沙发:   2张 (每张3座) → 2×3 = 6座")
    
    config_b = SimulationConfig(
        two_person_table_count=5,
        four_person_table_count=5,
        six_person_table_count=2,
        bar_seat_count=4,
        sofa_seat_count=2
    )
    
    expected_b = 5*4 + 5*2 + 2*6 + 4*1 + 2*3
    expected_b = 20 + 10 + 12 + 4 + 6
    expected_b = 52
    
    actual_b = config_b.get_total_seat_count()
    
    print(f"  预期输出: {expected_b} 个座位 (计算过程: 20+10+12+4+6=52)")
    print(f"  实际输出: {actual_b} 个座位")
    
    assert actual_b == expected_b, f"场景B失败: 预期{expected_b}, 实际{actual_b}"
    print(f" 场景B通过")
    
    print("\n" + "-" * 40)
    print("测试用例1全部通过")
    return True


# 测试2：窗口分配逻辑

def test_queue_allocation():
    """
    测试用例2：窗口分配逻辑
    验证仿真器能正确初始化指定数量的窗口，并返回正确的窗口状态。
    """
    
    print("测试用例2：窗口分配逻辑")
    
    # ----- 场景A：3个窗口 -----
    print("\n【场景A】3个窗口")
    print(f"  输入: initial_window_count = 3")
    
    config_a = SimulationConfig(
        initial_window_count=3,
        window_base_speed=2.0
    )
    simulator_a = CafeteriaSimulator(config_a)
    state_a = simulator_a.get_state_for_frontend()
    windows_a = state_a["windows"]
    
    print(f"  预期窗口数量: 3")
    print(f"  实际窗口数量: {len(windows_a)}")
    
    assert len(windows_a) == 3, f"场景A失败: 预期3个窗口, 实际{len(windows_a)}个"
    
    # 验证每个窗口的初始状态
    for i, window in enumerate(windows_a):
        print(f"  窗口{i}: queue_length={window['queue_length']}, cumulative_served={window['cumulative_served']}, is_open={window['is_open']}")
        assert window['queue_length'] == 0, f"窗口{i}队列应为空"
        assert window['cumulative_served'] == 0, f"窗口{i}服务人数应为0"
        assert window['is_open'] == True, f"窗口{i}应为开放状态"
    
    print(f" 场景A通过")
    
    # ----- 场景B：5个窗口 -----
    print("\n【场景B】5个窗口")
    print(f"  输入: initial_window_count = 5")
    
    config_b = SimulationConfig(
        initial_window_count=5,
        window_base_speed=2.0
    )
    simulator_b = CafeteriaSimulator(config_b)
    state_b = simulator_b.get_state_for_frontend()
    windows_b = state_b["windows"]
    
    print(f"  预期窗口数量: 5")
    print(f"  实际窗口数量: {len(windows_b)}")
    
    assert len(windows_b) == 5, f"场景B失败: 预期5个窗口, 实际{len(windows_b)}个"
    print(f" 场景B通过")
    
    print("\n" + "-" * 40)
    print("测试用例2全部通过")
    return True


# 测试3：小组人数分布逻辑

def test_group_size_distribution():
    """
    测试用例3：小组人数分布逻辑
    验证 get_group_size() 函数能根据随机值和配置的比例正确返回小组人数。
    """
    
    print("测试用例3：小组人数分布逻辑")

    # 配置比例
    config = SimulationConfig(
        solo_ratio=0.5,   # 50% 概率：1人
        pair_ratio=0.3,   # 30% 概率：2人
        group_ratio=0.2   # 20% 概率：3-5人
    )
    
    print("\n【配置说明】")
    print(f"  solo_ratio = {config.solo_ratio} (50% → 返回1人)")
    print(f"  pair_ratio = {config.pair_ratio} (30% → 返回2人)")
    print(f"  group_ratio = {config.group_ratio} (20% → 返回3-5人)")
    
    print("\n【随机值映射测试】")
    
    # 测试1：随机值0.1 → 应该返回1人
    print("\n  测试1: random_val = 0.1")
    print(f"    输入: random_val = 0.1")
    result1 = config.get_group_size(0.1)
    print(f"    预期输出: 1 (因为 0.1 < 0.5)")
    print(f"    实际输出: {result1}")
    assert result1 == 1, f"失败: 预期1, 实际{result1}"
    print(f"    通过")
    
    # 测试2：随机值0.5 → 边界值，应该返回1人
    print("\n  测试2: random_val = 0.5")
    print(f"    输入: random_val = 0.5")
    result2 = config.get_group_size(0.5)
    print(f"    预期输出: 1 (边界值包含在 solo 范围)")
    print(f"    实际输出: {result2}")
    assert result2 == 1, f"失败: 预期1, 实际{result2}"
    print(f"    通过")
    
    # 测试3：随机值0.6 → 应该返回2人
    print("\n  测试3: random_val = 0.6")
    print(f"    输入: random_val = 0.6")
    result3 = config.get_group_size(0.6)
    print(f"    预期输出: 2 (因为 0.5 ≤ 0.6 < 0.8)")
    print(f"    实际输出: {result3}")
    assert result3 == 2, f"失败: 预期2, 实际{result3}"
    print(f"    通过")
    
    # 测试4：随机值0.8 → 边界值，应该返回2人
    print("\n  测试4: random_val = 0.8")
    print(f"    输入: random_val = 0.8")
    result4 = config.get_group_size(0.8)
    print(f"    预期输出: 2 (边界值包含在 pair 范围)")
    print(f"    实际输出: {result4}")
    assert result4 == 2, f"失败: 预期2, 实际{result4}"
    print(f"    通过")
    
    # 测试5：随机值0.9 → 应该返回3-5人
    print("\n  测试5: random_val = 0.9")
    print(f"    输入: random_val = 0.9")
    result5 = config.get_group_size(0.9)
    print(f"    预期输出: 3-5 之间的整数")
    print(f"    实际输出: {result5}")
    assert 3 <= result5 <= 5, f"失败: 预期3-5, 实际{result5}"
    print(f"    通过")
    
    print("\n【概率分布验证】")
    print("  模拟1000次随机调用，验证比例是否接近配置值")
    
    # 统计1000次调用的分布
    counts = {1: 0, 2: 0, "3-5": 0}
    for _ in range(1000):
        import random
        size = config.get_group_size(random.random())
        if size == 1:
            counts[1] += 1
        elif size == 2:
            counts[2] += 1
        else:
            counts["3-5"] += 1
    
    total = sum(counts.values())
    print(f"\n  1000次调用的实际分布:")
    print(f"    1人小组: {counts[1]}次 ({counts[1]/total*100:.1f}%)")
    print(f"    2人小组: {counts[2]}次 ({counts[2]/total*100:.1f}%)")
    print(f"    3-5人小组: {counts['3-5']}次 ({counts['3-5']/total*100:.1f}%)")
    print(f"  预期分布: 1人(50%), 2人(30%), 3-5人(20%)")
    
    # 允许5%的误差
    assert 45 <= counts[1]/total*100 <= 55, "1人小组比例偏差过大"
    assert 25 <= counts[2]/total*100 <= 35, "2人小组比例偏差过大"
    assert 15 <= counts["3-5"]/total*100 <= 25, "3-5人小组比例偏差过大"
    print(f"  概率分布符合预期")
    
    print("\n" + "-" * 40)
    print("测试用例3全部通过")
    return True

# 测试4：总座位数计算

def test_total_seat_calculation():
    """
    测试用例4：总座位数计算
    验证 get_total_seat_count() 函数能正确计算所有类型座位的总数。
    """
    
    print("测试用例4：总座位数计算")
    
    # 创建配置
    config = SimulationConfig(
        two_person_table_count=8,    # 8张双人桌
        four_person_table_count=10,  # 10张四人桌
        six_person_table_count=5,    # 5张六人桌
        bar_seat_count=6,            # 6个吧台位
        sofa_seat_count=4            # 4张沙发
    )
    
    print("\n【输入数据】")
    print(f"  双人桌: {config.two_person_table_count} 张 × 2 = {config.two_person_table_count * 2} 座")
    print(f"  四人桌: {config.four_person_table_count} 张 × 4 = {config.four_person_table_count * 4} 座")
    print(f"  六人桌: {config.six_person_table_count} 张 × 6 = {config.six_person_table_count * 6} 座")
    print(f"  吧台:   {config.bar_seat_count} 个 × 1 = {config.bar_seat_count * 1} 座")
    print(f"  沙发:   {config.sofa_seat_count} 张 × 3 = {config.sofa_seat_count * 3} 座")
    
    expected = (8*2) + (10*4) + (5*6) + (6*1) + (4*3)
    actual = config.get_total_seat_count()
    
    print(f"\n【计算过程】")
    print(f"  双人桌: 8 × 2 = 16")
    print(f"  四人桌: 10 × 4 = 40")
    print(f"  六人桌: 5 × 6 = 30")
    print(f"  吧台:   6 × 1 = 6")
    print(f"  沙发:   4 × 3 = 12")
    print(f"  总和: 16 + 40 + 30 + 6 + 12 = {expected}")
    
    print(f"\n【验证结果】")
    print(f"  预期输出: {expected} 个座位")
    print(f"  实际输出: {actual} 个座位")
    
    assert actual == expected, f"失败: 预期{expected}, 实际{actual}"
    print(f"  通过")
    
    # 额外测试：最少座位的情况
    print("\n【边界测试】最少座位（1个吧台座位）")
    config_min = SimulationConfig(
        two_person_table_count=0,
        four_person_table_count=0,
        six_person_table_count=0,
        bar_seat_count=1,
        sofa_seat_count=0
    )
    result_min = config_min.get_total_seat_count()
    print(f"  预期输出: 1")
    print(f"  实际输出: {result_min}")
    assert result_min == 1, f"边界测试失败: 预期1, 实际{result_min}"
    print(f"  边界测试通过")
    
    print("\n" + "-" * 40)
    print("测试用例4全部通过")
    return True


# 测试5：仿真器初始状态

def test_simulator_initial_state():
    """
    测试用例5：仿真器初始状态
    验证仿真器在刚创建时（未执行任何步骤）的各项参数是否正确初始化为0。
    """
    print("测试用例5：仿真器初始状态")
    
    # 创建仿真器
    config = SimulationConfig(
        total_duration=100,
        initial_window_count=4
    )
    simulator = CafeteriaSimulator(config)
    state = simulator.get_state_for_frontend()
    
    print("\n【输入配置】")
    print(f"  total_duration = {config.total_duration}")
    print(f"  initial_window_count = {config.initial_window_count}")
    
    print("\n【状态验证】")
    
    # 验证 timestep
    print(f"  │ timestep       预期: 0         实际: {state['timestep']:<10}      │", end="")
    assert state['timestep'] == 0, f"timestep错误: 预期0, 实际{state['timestep']}"
    print(" ✅")
    
    # 验证 total_arrived
    print(f"  │ total_arrived  预期: 0         实际: {state['total_arrived']:<10}      │", end="")
    assert state['total_arrived'] == 0, f"total_arrived错误: 预期0, 实际{state['total_arrived']}"
    print(" ✅")
    
    # 验证 total_left
    print(f"  │ total_left     预期: 0         实际: {state['total_left']:<10}      │", end="")
    assert state['total_left'] == 0, f"total_left错误: 预期0, 实际{state['total_left']}"
    print(" ✅")
    
    # 验证 queuing_count
    print(f"  │ queuing_count  预期: 0         实际: {state['queuing_count']:<10}      │", end="")
    assert state['queuing_count'] == 0, f"queuing_count错误: 预期0, 实际{state['queuing_count']}"
    print(" ✅")
    
    # 验证 seated_count
    print(f"  │ seated_count   预期: 0         实际: {state['seated_count']:<10}      │", end="")
    assert state['seated_count'] == 0, f"seated_count错误: 预期0, 实际{state['seated_count']}"
    print(" ✅")
    
    # 验证 avg_wait_time
    print(f"  │ avg_wait_time  预期: 0         实际: {state['avg_wait_time']:<10}      │", end="")
    assert state['avg_wait_time'] == 0, f"avg_wait_time错误: 预期0, 实际{state['avg_wait_time']}"
    print(" ✅")
    
    # 验证窗口数量
    windows_count = len(state['windows'])
    print(f"  │ windows数量    预期: 4         实际: {windows_count:<10}      │", end="")
    assert windows_count == 4, f"窗口数量错误: 预期4, 实际{windows_count}"
    print(" ✅")
    
    # 验证每个窗口的队列长度为0
    for i, window in enumerate(state['windows']):
        if window['queue_length'] != 0:
            print(f"  │ 窗口{i}队列长度  预期: 0         实际: {window['queue_length']:<10}      │ ❌")
        assert window['queue_length'] == 0, f"窗口{i}队列长度错误: 预期0, 实际{window['queue_length']}"
    
    
    print("\n【验证结果】")
    print("  ✅ 所有初始状态验证通过")
    print("  ✅ 仿真器已就绪，可以开始仿真")
    
    print("\n" + "-" * 40)
    print("✅ 测试用例5全部通过")
    return True


# 主程序：运行所有测试

if __name__ == "__main__":
    print("\n")

    print(" " * 30 + "食堂仿真系统 - 单元测试" + " " * 30)
 
    
    print("\n开始时间: " + __import__('datetime').datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
    
    # 运行所有测试
    results = []
    
    try:
        results.append(("座位分配逻辑", test_seat_allocation()))
    except AssertionError as e:
        print(f"\n❌ 座位分配逻辑测试失败: {e}")
        results.append(("座位分配逻辑", False))
    
    try:
        results.append(("窗口分配逻辑", test_queue_allocation()))
    except AssertionError as e:
        print(f"\n❌ 窗口分配逻辑测试失败: {e}")
        results.append(("窗口分配逻辑", False))
    
    try:
        results.append(("小组人数分布", test_group_size_distribution()))
    except AssertionError as e:
        print(f"\n❌ 小组人数分布测试失败: {e}")
        results.append(("小组人数分布", False))
    
    try:
        results.append(("总座位数计算", test_total_seat_calculation()))
    except AssertionError as e:
        print(f"\n❌ 总座位数计算测试失败: {e}")
        results.append(("总座位数计算", False))
    
    try:
        results.append(("仿真器初始状态", test_simulator_initial_state()))
    except AssertionError as e:
        print(f"\n❌ 仿真器初始状态测试失败: {e}")
        results.append(("仿真器初始状态", False))
    
    # 输出总结
    print("\n")
    print( " " * 34+"测试结果汇总" + " " * 34)

    passed = sum(1 for _, status in results if status)
    total = len(results)
    
    for name, status in results:
        symbol = "✅" if status else "❌"
        print(f"  {symbol} {name}")
    
    print("-" * 40)
    print(f"  总计: {passed}/{total} 个测试通过")
    
    if passed == total:
        print("\n所有单元测试通过！")
    else:
        print(f"\n 有 {total - passed} 个测试失败，请检查代码")
    
    print("\n结束时间: " + __import__('datetime').datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
    print()