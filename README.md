# Cozy Cafeteria — 食堂就餐仿真系统

基于 React Three.js 的交互式 3D 食堂人流仿真，搭配 Python 后端进行离散事件模拟，通过 WebSocket 实时推送状态并在前端渲染动画。

## 技术栈

| 层 | 技术 |
|---|---|
| 3D 渲染 | React 18 + TypeScript + Three.js (@react-three/fiber) |
| 状态管理 | Zustand |
| 样式 | Tailwind CSS |
| 后端 | Python FastAPI + WebSocket |
| 仿真引擎 | 离散事件模拟（泊松到达、高斯需求曲线、动态窗口） |
| 数据库 | SQLite（快照持久化） |

## 项目结构

```
.
├── backend/
│   ├── main.py                  # FastAPI 入口，端口 8000
│   ├── api/
│   │   ├── routes.py            # REST + WebSocket 路由
│   │   └── auth.py              # JWT 认证
│   ├── database/
│   │   └── db.py                # SQLite 快照存储
│   ├── simulation/
│   │   ├── config.py            # 仿真参数配置 + 预设场景
│   │   ├── engine.py            # 仿真主引擎（到达、排队、座位、窗口管理）
│   │   ├── entity.py            # 实体定义（Person, Table, Window, Seat）
│   │   └── users.py             # 用户管理
│   └── test/
│       └── test_simulation.py   # 单元测试
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── scene/           # 3D 场景组件（Floor, Walls, Table, Window, Person...）
│   │   │   ├── overlay/         # 2D UI 覆盖层（ControlBar, HUD, EndDialog）
│   │   │   ├── postprocessing/  # 水彩风格后处理特效
│   │   │   └── ui/              # 通用 UI 组件（Button, Card, Input）
│   │   ├── engine/              # 前端布局引擎 + 寻路
│   │   ├── store/               # Zustand 状态管理
│   │   ├── hooks/               # React hooks（WebSocket, 动画循环）
│   │   ├── lib/                 # API 客户端 + 类型定义
│   │   └── pages/               # HomePage, Simulation3DPage
│   ├── vite.config.ts           # Vite 配置（端口 3000，代理 /api → 8000）
│   └── package.json
└── sim_data.db                  # 仿真快照数据库
```

## 快速开始

### 环境要求

- Python 3.10+
- Node.js 18+
- npm 9+

### 1. 安装后端依赖

```bash
pip install fastapi uvicorn numpy pydantic python-jose passlib[bcrypt]
```

### 2. 启动后端

```bash
cd backend
python main.py
```

后端运行在 `http://localhost:8000`，WebSocket 路径为 `ws://localhost:8000/ws/simulation/{sim_id}`。

### 3. 安装前端依赖

```bash
cd frontend
npm install
```

### 4. 启动前端

```bash
npm run dev
```

前端运行在 `http://localhost:3000`，通过 Vite 代理自动将 `/api` 和 `/ws` 请求转发到后端。

### 5. 运行测试

```bash
cd backend
python test/test_simulation.py
```

## 仿真配置

三种预设场景，可在启动界面切换：

| 场景 | 时长 | 窗口 | 到达率 | 特点 |
|---|---|---|---|---|
| 早餐 | 90 分钟 | 3 | 4.0 人/分钟 | 均匀低峰 |
| 午餐 | 120 分钟 | 4 | 8.0 人/分钟 | 双峰高斯分布 |
| 晚餐 | 120 分钟 | 3 | 6.0 人/分钟 | 逐渐递减 |

支持自定义调整：窗口数、各类型餐桌/吧台/沙发座位数、动态窗口管理开关。

## 核心机制

### 仿真引擎
- **到达模型**: 泊松分布 + EMA 平滑（alpha=0.25），单步最大 15 人
- **需求曲线**: 午餐使用双峰高斯（11:30 + 12:00），早餐均匀，晚餐递减
- **全局上限**: 150 人硬限制，防止队列爆炸
- **窗口管理**: 队列超过 15 人自动开启新窗口（5 分钟预热），窗口永不关闭
- **座位分配**: 按偏好权重随机分配桌型，同组成员优先相邻座位
- **用餐时长**: 高斯分布 N(25, 8)，最短 5 分钟

### 3D 渲染
- 水彩风格后处理（色阶量化 + 纸纹 + 边缘检测）
- 相机轨道控制（旋转/平移/缩放）
- 行人动画：easeInOutQuad 缓动 + 行走 bob 效果
- 路径可视化线条
- 窗口状态指示灯（绿色=服务中，黄色=排队中，红色=关闭）

### 数据导出
- **CSV**: 6 个章节（基本信息、人员统计、窗口详情、座位占用、时间序列、配置参数）
- **PDF**: 带样式的打印报告，含汇总卡片和详细表格

## API 概览

| 端点 | 方法 | 说明 |
|---|---|---|
| `/health` | GET | 健康检查 |
| `/api/auth/register` | POST | 用户注册 |
| `/api/auth/login` | POST | 用户登录 |
| `/api/simulation/create` | POST | 创建仿真会话 |
| `/api/simulation/{sim_id}/state` | GET | 获取当前状态快照 |
| `/api/simulation/{sim_id}/export` | GET | 导出 CSV |
| `/ws/simulation/{sim_id}` | WebSocket | 实时步进（action: step / steps / finish） |

## 设计说明

- 前端使用 Zustand 管理全局状态，`AnimatedPerson` 支持 deferred state transition：行人走路期间后端状态变更会排队等待动画完成
- 窗口位置使用 center-outward 映射（ID 0、1、2、3 → 物理位置从中心向两侧展开）
- 吧台和沙发使用 per-table seat_index → global index 转换，与餐桌统一管理在 `tables` 数组中
