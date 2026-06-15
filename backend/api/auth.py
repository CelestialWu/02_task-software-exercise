from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
import database.db as db

router = APIRouter(prefix="/auth", tags=["认证"])

# 密码和JWT配置
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET_KEY = "your-secret-key-here"  
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# 请求模型
class LoginRequest(BaseModel):
    username: str
    password: str

class RegisterRequest(BaseModel):
    username: str
    password: str
    email: str

# 辅助函数
def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_token(user_id: int) -> str:
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode = {"sub": str(user_id), "exp": expire}
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def decode_token(token: str) -> int:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="无效的token")
        return int(user_id)
    except JWTError:
        raise HTTPException(status_code=401, detail="无效的token")

# 接口
@router.post("/login")
async def login(req: LoginRequest):
    user = db.get_user(req.username)
    if not user or not verify_password(req.password, user.password):
        raise HTTPException(status_code=401, detail="用户名或密码错误")
    
    token = create_token(user.id)
    return {"token": token, "username": user.username}

@router.post("/register")
async def register(req: RegisterRequest):
    if db.user_exists(req.username):
        raise HTTPException(status_code=400, detail="用户名已存在")
    
    hashed_pw = hash_password(req.password)
    db.create_user(req.username, hashed_pw, req.email)
    return {"message": "注册成功"}

@router.get("/me")
async def get_current_user(token: str):
    user_id = decode_token(token)
    user = db.get_user_by_id(user_id)
    return {"username": user.username, "email": user.email}