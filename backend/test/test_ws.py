"""WebSocket 联调测试"""
import asyncio
import json
import sys
sys.path.insert(0, '.')
import websockets

async def test_ws():
    # Create a sim first
    import requests
    r = requests.post('http://localhost:8000/api/simulation/create', json={
        'scenario': 'lunch', 'total_duration': 30,
        'initial_window_count': 4, 'window_base_speed': 1.8,
        'arrival_rate_base': 8.0,
        'solo_ratio': 0.4, 'pair_ratio': 0.35, 'group_ratio': 0.25,
        'dynamic_windows_enabled': True,
        'two_person_table_count': 6, 'four_person_table_count': 10,
        'six_person_table_count': 6, 'bar_seat_count': 6, 'sofa_seat_count': 4,
    }, params={'user_id': 1})
    sim_id = r.json()['sim_id']
    print(f'sim_id: {sim_id}')

    passed = 0
    failed = 0
    def test(name, condition, detail=''):
        nonlocal passed, failed
        if condition:
            passed += 1; print(f'  [PASS] {name}')
        else:
            failed += 1; print(f'  [FAIL] {name} - {detail}')

    print('\n=== WebSocket 联调测试 ===')

    # Test 1: valid connection
    async with websockets.connect(f'ws://localhost:8000/ws/simulation/{sim_id}') as ws:
        test('WebSocket连接成功', True)

        # Test 2: get_state
        await ws.send(json.dumps({'action': 'get_state'}))
        resp = json.loads(await ws.recv())
        test('get_state返回type=state', resp['type'] == 'state')
        test('state含timestep=0', resp['state']['timestep'] == 0)
        test('state含4个窗口', len(resp['state']['windows']) == 4)
        test('state含tables数组', isinstance(resp['state']['tables'], list))
        test('state含queuing_count等统计', 'queuing_count' in resp['state'])
        print(f'    初始状态: timestep={resp["state"]["timestep"]}, windows={len(resp["state"]["windows"])}, tables={len(resp["state"]["tables"])}')

        # Test 3: single step
        await ws.send(json.dumps({'action': 'step'}))
        resp = json.loads(await ws.recv())
        test('step后type=step_complete', resp['type'] == 'step_complete')
        test('step后timestep=1', resp['state']['timestep'] == 1)
        print(f'    step后: timestep={resp["state"]["timestep"]}, arrived={resp["state"]["total_arrived"]}, queuing={resp["state"]["queuing_count"]}')

        # Test 4: batch steps
        await ws.send(json.dumps({'action': 'steps', 'num_steps': 10}))
        resp = json.loads(await ws.recv())
        test('10步后type=steps_complete', resp['type'] == 'steps_complete')
        test('10步后timestep=11', resp['state']['timestep'] == 11)
        test('有人员到达(total_arrived>0)', resp['state']['total_arrived'] > 0)
        test('有人员排队(queuing_count>0)', resp['state']['queuing_count'] > 0)
        print(f'    10步后: timestep={resp["state"]["timestep"]}, arrived={resp["state"]["total_arrived"]}, queuing={resp["state"]["queuing_count"]}, seated={resp["state"]["seated_count"]}')

        # Test 5: run to finish
        remaining = 30 - 11
        await ws.send(json.dumps({'action': 'steps', 'num_steps': remaining}))
        resp = json.loads(await ws.recv())
        if resp['type'] == 'finished':
            test('仿真完成收到finished消息', True)
        else:
            test('仿真完成收到finished消息', resp['type'] == 'finished', f'got type={resp["type"]}')
        if 'state' in resp:
            final = resp['state']
            print(f'    最终状态: timestep={final["timestep"]}, arrived={final["total_arrived"]}, left={final["total_left"]}, avg_wait={final["avg_wait_time"]:.1f}')
            test('最终timestep=30', final['timestep'] == 30, str(final['timestep']))
            test('total_arrived>0', final['total_arrived'] > 0)
            test('total_left>0', final['total_left'] > 0, str(final['total_left']))
            test('avg_wait_time>=0', final['avg_wait_time'] >= 0)

    # Test 6: invalid sim_id rejected
    try:
        async with websockets.connect('ws://localhost:8000/ws/simulation/nonexistent-id-12345') as ws:
            await ws.recv()
        test('无效sim_id被拒绝', False, 'expected close')
    except websockets.exceptions.ConnectionClosed as e:
        test('无效sim_id被拒绝(1008)', e.code == 1008, f'code={e.code}')
    except Exception as e:
        test('无效sim_id被拒绝', True, str(e)[:60])

    # Test 7: multiple connections to same sim
    async with websockets.connect(f'ws://localhost:8000/ws/simulation/{sim_id}') as ws1:
        async with websockets.connect(f'ws://localhost:8000/ws/simulation/{sim_id}') as ws2:
            await ws1.send(json.dumps({'action': 'get_state'}))
            r1 = json.loads(await ws1.recv())
            await ws2.send(json.dumps({'action': 'get_state'}))
            r2 = json.loads(await ws2.recv())
            test('多个连接可同时获取相同状态', r1['state']['timestep'] == r2['state']['timestep'])

    # Summary
    print(f'\n=== WebSocket测试: {passed}通过, {failed}失败, {passed+failed}总计 ===')
    return passed, failed

if __name__ == '__main__':
    p, f = asyncio.run(test_ws())
    sys.exit(0 if f == 0 else 1)
