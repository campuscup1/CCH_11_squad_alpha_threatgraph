
from sqlalchemy import Column, Integer, String, Text, DateTime
from sqlalchemy.sql import func
from database import Base

class Event(Base):
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True)
    ip_address = Column(String, index=True)
    risk_score = Column(Integer)
    risk_level = Column(String)
    reasons = Column(Text)
    explanation = Column(Text)
    recommendation = Column(Text)
    review_status = Column(String, default="Pending")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class LoginEvent(Base):
    __tablename__ = "login_events"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True)
    ip_address = Column(String, index=True)
    timestamp = Column(DateTime, index=True)
    success = Column(Integer)