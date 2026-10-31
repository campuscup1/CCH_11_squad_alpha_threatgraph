from datetime import datetime
from pydantic import BaseModel


class EventCreate(BaseModel):
    user_id: str
    ip_address: str
    failed_attempts: int = 0
    unusual_time: bool = False
    unfamiliar_ip: bool = False
    success_after_failures: bool = False


class LoginEventCreate(BaseModel):
    user_id: str
    ip_address: str
    timestamp: datetime
    success: bool