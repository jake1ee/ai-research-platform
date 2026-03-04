from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
from models import PlanTier, Role

class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    is_active: bool

    class Config:
        orm_mode = True

class UsageStats(BaseModel):
    total_evaluations: int
    total_cost_usd: float
    total_tokens: int