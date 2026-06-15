"""完整仿真运行并验证"""
import json, sys, asyncio
sys.path.insert(0, '.')
import websockets
import requests

async def run_full_sim():
    results = {}

    # 1. Create simulation
    config = {
        'scenario': 'lunch', 'total_duration': 120,
        'initial_window_count': 4, 'window_base_speed': 1.8,
        'arrival_rate_base': 8.0,
        'solo_ratio': 0.4, 'pair_ratio': 0.35, 'group_ratio': 0.25,
        'dynamic_windows_enabled': True,
        'two_person_table_count': 6, 'four_person_table_count': 10,
        'six_person_table_count': 6, 'bar_seat_count': 6, 'sofa_seat_count': 4,
    }
    r = requests.post('http://localhost:8000/api/simulation/create', json=config, params={'user_id': 1})
    sim_id = r.json()['sim_id']
    print(f'仿真ID: {sim_id}')
    print(f'配置: lunch场景, 120分钟, 4窗口, 104座位')

    # 2. Run all 120 steps via WebSocket
    milestones = {}
    async with websockets.connect(f'ws://localhost:8000/ws/simulation/{sim_id}') as ws:
        for batch_start in range(0, 120, 30):
            steps = min(30, 120 - batch_start)
            await ws.send(json.dumps({'action': 'steps', 'num_steps': steps}))
            resp = json.loads(await ws.recv())
            s = resp.get('state', {})
            t = s.get('timestep', 0)
            milestones[t] = {
                'arrived': s.get('total_arrived', 0),
                'left': s.get('total_left', 0),
                'queuing': s.get('queuing_count', 0),
                'seated': s.get('seated_count', 0),
                'active': s.get('queuing_count', 0) + s.get('seated_count', 0),
                'avg_wait': round(s.get('avg_wait_time', 0), 2),
                'windows': len([w for w in s.get('windows', []) if w.get('is_open')]),
                'activating': len(s.get('activating_windows', [])),
            }
            print(f'  t={t:3d}: arrived={milestones[t]["arrived"]:4d}, left={milestones[t]["left"]:4d}, queuing={milestones[t]["queuing"]:3d}, seated={milestones[t]["seated"]:3d}, active={milestones[t]["active"]:3d}, wait={milestones[t]["avg_wait"]:5.1f}, windows={milestones[t]["windows"]}+{milestones[t]["activating"]}act')

    # 3. Get final state via REST API
    r = requests.get(f'http://localhost:8000/api/simulation/{sim_id}/state')
    final = r.json()

    # 4. Calculate statistics
    print('\n=== 仿真结果摘要 ===')
    final_t = final.get('timestep', 0)
    final_arrived = final.get('total_arrived', 0)
    final_left = final.get('total_left', 0)
    final_queuing = final.get('queuing_count', 0)
    final_seated = final.get('seated_count', 0)
    final_wait = final.get('avg_wait_time', 0)

    active = final_queuing + final_seated
    total_seats = sum(t.get('capacity', 0) for t in final.get('tables', []))
    occupied_seats = sum(t.get('occupied', 0) for t in final.get('tables', []))
    occupancy = 100 * occupied_seats / total_seats if total_seats > 0 else 0

    print(f'  仿真时长: {final_t} 分钟')
    print(f'  累计到达: {final_arrived} 人')
    print(f'  累计离开: {final_left} 人')
    print(f'  仍在排队: {final_queuing} 人')
    print(f'  正在就餐: {final_seated} 人')
    print(f'  活跃人数: {active} 人')
    print(f'  平均等待: {final_wait:.1f} 分钟')
    print(f'  座位占用: {occupied_seats}/{total_seats} ({occupancy:.1f}%)')
    print(f'  总窗口数: {len(final.get("windows", []))}')

    # Per-window stats
    print('\n  窗口详情:')
    for w in final.get('windows', []):
        ql = w.get('queue_length', 0)
        cs = w.get('cumulative_served', 0)
        speed = w.get('current_service_speed', 0)
        open_stat = '开放' if w.get('is_open') else '关闭'
        print(f'    窗口{w["id"]}: 队列={ql}, 累计服务={cs}, 速度={speed:.1f}, {open_stat}')

    # Seat occupancy by type
    print('\n  座位占用详情:')
    type_stats = {}
    for t in final.get('tables', []):
        tt = t.get('type', 'unknown')
        if tt not in type_stats:
            type_stats[tt] = {'capacity': 0, 'occupied': 0, 'count': 0}
        type_stats[tt]['capacity'] += t.get('capacity', 0)
        type_stats[tt]['occupied'] += t.get('occupied', 0)
        type_stats[tt]['count'] += 1

    for tt, stats in sorted(type_stats.items()):
        occ_pct = 100 * stats['occupied'] / stats['capacity'] if stats['capacity'] > 0 else 0
        print(f'    {tt}: {stats["occupied"]}/{stats["capacity"]} ({occ_pct:.1f}%), {stats["count"]}张')

    # Verify key properties
    print('\n=== 关键验证 ===')
    checks = []
    checks.append(('仿真运行到设定时长(120分钟)', final_t == 120, f't={final_t}'))
    checks.append(('累计到达 > 离开人数', final_arrived > final_left, f'{final_arrived} > {final_left}'))
    checks.append(('有人员离开(系统吞吐正常)', final_left > 0, f'left={final_left}'))
    checks.append(('活跃人数 ≤ 150上限', active <= 150, f'active={active}'))
    checks.append(('座位占用率 > 50%', occupancy > 50, f'{occupancy:.1f}%'))
    checks.append(('平均等待时间 ≥ 0', final_wait >= 0, f'{final_wait:.1f}'))

    all_pass = True
    for name, cond, detail in checks:
        status = 'PASS' if cond else 'FAIL'
        if not cond: all_pass = False
        print(f'  [{status}] {name}: {detail}')

    # 5. Get statistics from DB
    r = requests.get(f'http://localhost:8000/api/simulation/{sim_id}/statistics')
    stats = r.json()
    print(f'\n=== 数据库统计 ===')
    print(f'  快照数: {len(stats.get("timesteps", []))}')
    print(f'  峰值到达: {stats.get("peak_arrival", "N/A")}')
    print(f'  最大等待: {stats.get("max_avg_wait_time", "N/A")}')
    print(f'  最少空座: {stats.get("min_empty_seats", "N/A")}')

    # 6. CSV export
    r = requests.post(f'http://localhost:8000/api/simulation/{sim_id}/export', params={'format': 'csv'})
    print(f'\n  CSV导出: {"成功" if r.status_code == 200 else "失败"}')

    return all_pass

if __name__ == '__main__':
    ok = asyncio.run(run_full_sim())
    print(f'\n{"="*50}')
    print(f'  端到端测试: {"全部通过" if ok else "存在失败"}')
    print(f'{"="*50}')
    sys.exit(0 if ok else 1)
