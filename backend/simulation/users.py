# models/user.py
from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime

class RegisterRequest(BaseModel):
    """注册请求"""
    username: str = Field(..., min_length=3, max_length=50, description="用户名")
    password: str = Field(..., min_length=6, description="密码")
    email: str = Field(..., description="邮箱")
    # Field(...) 中的 ... 表示必填

class LoginRequest(BaseModel):
    """登录请求"""
    username: str
    password: str

class UserResponse(BaseModel):
    """用户信息返回（不包含密码）"""
    id: int
    username: str
    email: str
    created_at: datetime
    
    class Config:
        from_attributes = True  # 支持从数据库对象转换

class TokenResponse(BaseModel):
    """登录成功返回的 token"""
    access_token: str
    token_type: str = "bearer"
    user: UserResponse