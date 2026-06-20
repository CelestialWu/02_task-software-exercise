import sys
import io
from pathlib import Path
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

# Fix Unicode encoding on Windows
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

sys.path.insert(0, str(Path(__file__).parent))
from api.routes import router as api_router

app = FastAPI(
    title="食堂仿真系统",
    description="北京交通大学食堂就餐仿真系统",
    version="1.0.0"
)

# 添加CORS中间件
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册 REST API 路由
app.include_router(api_router)

# ============================================================
# 测试 WebSocket 端点（直接定义在 app 上，绕过 router）
# ============================================================
@app.websocket("/ws/simulation/{sim_id}")
async def websocket_test(websocket: WebSocket, sim_id: str):
    await websocket.accept()
    print(f"[WebSocket] Test connection accepted for sim_id: {sim_id}")
    try:
        while True:
            data = await websocket.receive_text()
            print(f"[WebSocket] Received: {data}")
            # 简单回显，用于测试
            await websocket.send_text(f"Echo: {data}")
    except WebSocketDisconnect:
        print(f"[WebSocket] Test client disconnected")

# ============================================================

# 挂载静态文件（前端），托管前端
frontend_path = Path(__file__).parent.parent.parent / "frontend"
if frontend_path.exists():
    app.mount("/", StaticFiles(directory=str(frontend_path), html=True), name="frontend")

# 健康检查接口
@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "cafeteria-simulator"}

if __name__ == "__main__":
    import uvicorn
    import os
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)