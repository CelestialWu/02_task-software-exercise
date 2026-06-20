import sys
import io
from pathlib import Path
from fastapi import FastAPI
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
    allow_origins=["*"],        # 允许所有域名访问（开发环境用）
    allow_credentials=True,     # 允许携带 cookie
    allow_methods=["*"],        # 允许所有 HTTP 方法
    allow_headers=["*"],        # 允许所有请求头
)

app.include_router(api_router)  # 把 api/routes.py 里定义的路由接口加进来

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