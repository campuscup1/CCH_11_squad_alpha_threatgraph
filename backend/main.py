from schemas import EventCreate, LoginEventCreate
from graph_engine import build_attack_graph
from datetime import datetime, timedelta
import json
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import desc

from database import engine, SessionLocal, Base
from models import Event, LoginEvent
from schemas import EventCreate, LoginEventCreate

Base.metadata.create_all(bind=engine)

app = FastAPI(title="ThreatGraph API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def calculate_risk(data):
    score = 0
    reasons = []

    failed = data.failed_attempts

    if failed >= 10:
        score += 30
        reasons.append({
            "rule": "Repeated failed attempts",
            "points": 30,
            "explanation": f"{failed} failed login attempts detected."
        })
    elif failed >= 5:
        score += 15
        reasons.append({
            "rule": "Multiple failed attempts",
            "points": 15,
            "explanation": f"{failed} failed login attempts detected."
        })

    if data.unusual_time:
        score += 15
        reasons.append({
            "rule": "Unusual login time",
            "points": 15,
            "explanation": "Login occurred outside normal hours."
        })

    if data.unfamiliar_ip:
        score += 20
        reasons.append({
            "rule": "Unfamiliar IP",
            "points": 20,
            "explanation": "IP address is not in known login history."
        })

    if data.success_after_failures:
        score += 15
        reasons.append({
            "rule": "Successful login after failures",
            "points": 15,
            "explanation": "A successful login followed failed attempts."
        })

    score = min(score, 100)

    if score >= 80:
        level = "Critical"
    elif score >= 60:
        level = "High"
    elif score >= 30:
        level = "Medium"
    else:
        level = "Low"

    explanation = (
        "Suspicious activity detected based on: "
        + ", ".join(r["rule"] for r in reasons)
        if reasons else "No suspicious patterns detected."
    )

    if score >= 80:
        recommendation = "Immediately investigate and secure the affected account."
    elif score >= 60:
        recommendation = "Investigate the account and review recent login activity."
    elif score >= 30:
        recommendation = "Monitor this account for further unusual activity."
    else:
        recommendation = "No immediate action required."

    return score, level, reasons, explanation, recommendation


def save_event(db, data):
    score, level, reasons, explanation, recommendation = calculate_risk(data)

    event = Event(
        user_id=data.user_id,
        ip_address=data.ip_address,
        risk_score=score,
        risk_level=level,
        reasons=json.dumps(reasons),
        explanation=explanation,
        recommendation=recommendation,
        review_status="Pending"
    )

    db.add(event)
    db.commit()
    db.refresh(event)

    return event


def format_event(event):
    return {
        "id": event.id,
        "user_id": event.user_id,
        "ip_address": event.ip_address,
        "risk_score": event.risk_score,
        "risk_level": event.risk_level,
        "reasons": json.loads(event.reasons),
        "explanation": event.explanation,
        "recommendation": event.recommendation,
        "review_status": event.review_status,
        "created_at": str(event.created_at)
    }


@app.get("/")
def home():
    return {"message": "ThreatGraph Backend Running"}


@app.post("/api/analyze")
def analyze(data: EventCreate, db: Session = Depends(get_db)):
    event = save_event(db, data)
    return format_event(event)


@app.get("/api/dashboard")
def dashboard(db: Session = Depends(get_db)):
    all_events = db.query(Event).all()
    total = len(all_events)
    suspicious = sum(1 for e in all_events if e.risk_score >= 30)

    return {
        "total_events": total,
        "suspicious_events": suspicious,
        "normal_events": total - suspicious,
        "critical_events": sum(1 for e in all_events if e.risk_score >= 80),
        "high_events": sum(1 for e in all_events if 60 <= e.risk_score < 80),
        "medium_events": sum(1 for e in all_events if 30 <= e.risk_score < 60)
    }


@app.get("/api/events")
def get_events(db: Session = Depends(get_db)):
    events = db.query(Event).order_by(desc(Event.id)).all()
    return [format_event(e) for e in events]


@app.get("/api/alerts")
def get_alerts(db: Session = Depends(get_db)):
    events = (
        db.query(Event)
        .filter(Event.risk_score >= 30)
        .order_by(desc(Event.id))
        .all()
    )
    return [format_event(e) for e in events]


@app.get("/api/alerts/filter")
def filter_alerts(
    risk_level: str = None,
    review_status: str = None,
    db: Session = Depends(get_db)
):
    query = db.query(Event).filter(Event.risk_score >= 30)

    if risk_level:
        query = query.filter(Event.risk_level.ilike(risk_level))

    if review_status:
        query = query.filter(Event.review_status.ilike(review_status))

    events = query.order_by(desc(Event.id)).all()
    return [format_event(e) for e in events]


@app.patch("/api/alerts/{event_id}/review")
def review_alert(
    event_id: int,
    status: str = "Reviewed",
    db: Session = Depends(get_db)
):
    event = db.query(Event).filter(Event.id == event_id).first()

    if not event:
        return {"error": "Event not found"}

    if status not in ["Reviewed", "Pending", "False Positive"]:
        return {"error": "Invalid review status"}

    event.review_status = status
    db.commit()
    db.refresh(event)

    return format_event(event)


@app.post("/api/simulate")
def simulate_attack(data: EventCreate):
    score, level, reasons, explanation, recommendation = calculate_risk(data)

    return {
        "user_id": data.user_id,
        "ip_address": data.ip_address,
        "risk_score": score,
        "risk_level": level,
        "reasons": reasons,
        "explanation": explanation,
        "recommendation": recommendation,
        "simulation": True
    }


@app.get("/api/alerts/{event_id}/response")
def get_response_advice(
    event_id: int,
    db: Session = Depends(get_db)
):
    event = db.query(Event).filter(Event.id == event_id).first()

    if not event:
        return {"error": "Event not found"}

    score = event.risk_score

    if score >= 80:
        actions = [
            "Temporarily lock the affected account.",
            "Reset the user's password.",
            "Review recent login activity.",
            "Notify the security administrator."
        ]
    elif score >= 60:
        actions = [
            "Investigate the unfamiliar IP address.",
            "Verify the user's identity.",
            "Review recent login attempts."
        ]
    elif score >= 30:
        actions = [
            "Monitor the account for unusual activity.",
            "Check failed login attempts."
        ]
    else:
        actions = ["No immediate action required."]

    return {
        "event_id": event_id,
        "risk_level": event.risk_level,
        "recommended_actions": actions
    }



@app.get("/api/timeline")
def attack_timeline(db: Session = Depends(get_db)):
    events = (
        db.query(Event)
        .filter(Event.risk_score >= 30)
        .order_by(Event.created_at.asc(), Event.id.asc())
        .all()
    )

    timeline = []

    for e in events:
        timeline.append({
            "event_id": e.id,
            "user_id": e.user_id,
            "ip_address": e.ip_address,
            "risk_score": e.risk_score,
            "risk_level": e.risk_level,
            "explanation": e.explanation,
            "created_at": str(e.created_at),
            "incident_type": (
                "Critical Security Incident"
                if e.risk_score >= 80
                else "Suspicious Login Activity"
            )
        })

    return {
        "total_incidents": len(timeline),
        "timeline": timeline
    }


@app.get("/api/investigate/{ip_address}")
def investigate_ip(ip_address: str, db: Session = Depends(get_db)):
    events = (
        db.query(Event)
        .filter(Event.ip_address == ip_address)
        .order_by(Event.created_at.asc(), Event.id.asc())
        .all()
    )

    if not events:
        return {"message": "No activity found for this IP address."}

    accounts = list(set(e.user_id for e in events))

    return {
        "ip_address": ip_address,
        "accounts_targeted": len(accounts),
        "targeted_accounts": accounts,
        "total_events": len(events),
        "suspicious_events": sum(1 for e in events if e.risk_score >= 30),
        "highest_risk_score": max(e.risk_score for e in events),
        "events": [
            {
                "event_id": e.id,
                "user_id": e.user_id,
                "risk_score": e.risk_score,
                "risk_level": e.risk_level,
                "explanation": e.explanation,
                "created_at": str(e.created_at)
            }
            for e in events
        ]
    }



@app.post("/api/seed")
def seed_data(db: Session = Depends(get_db)):
    samples = [
        EventCreate(
            user_id="user_201",
            ip_address="192.168.1.20",
            failed_attempts=1
        ),
        EventCreate(
            user_id="user_305",
            ip_address="45.22.18.90",
            failed_attempts=7,
            unusual_time=True
        ),
        EventCreate(
            user_id="user_410",
            ip_address="103.44.21.8",
            failed_attempts=15,
            unusual_time=True,
            unfamiliar_ip=True,
            success_after_failures=True
        )
    ]

    results = [format_event(save_event(db, sample)) for sample in samples]

    return {
        "message": "Sample events saved to SQLite",
        "events_added": len(results),
        "events": results
    }


@app.get("/api/graph")
def get_attack_graph(db: Session = Depends(get_db)):
    events = db.query(Event).all()
    return build_attack_graph(events)


@app.get("/api/correlation")
def cross_account_correlation(
    window_minutes: int = 60,
    db: Session = Depends(get_db)
):
    cutoff = datetime.now() - timedelta(minutes=window_minutes)

    events = (
        db.query(Event)
        .filter(Event.created_at >= cutoff)
        .all()
    )

    ip_groups = {}

    for event in events:
        ip = event.ip_address

        if ip not in ip_groups:
            ip_groups[ip] = {
                "accounts": set(),
                "total_events": 0,
                "suspicious_events": 0,
                "failed_activity_risk": 0,
                "highest_risk_score": 0
            }

        group = ip_groups[ip]
        group["accounts"].add(event.user_id)
        group["total_events"] += 1
        group["highest_risk_score"] = max(
            group["highest_risk_score"],
            event.risk_score
        )

        if event.risk_score >= 30:
            group["suspicious_events"] += 1

        reasons = json.loads(event.reasons)

        if any(
            "failed attempts" in reason["rule"].lower()
            for reason in reasons
        ):
            group["failed_activity_risk"] += 1

    results = []

    for ip, data in ip_groups.items():
        account_count = len(data["accounts"])

        results.append({
            "ip_address": ip,
            "accounts_targeted": account_count,
            "targeted_accounts": sorted(data["accounts"]),
            "total_events": data["total_events"],
            "suspicious_events": data["suspicious_events"],
            "failed_activity_events": data["failed_activity_risk"],
            "highest_risk_score": data["highest_risk_score"],
            "possible_password_spraying": (
                account_count >= 3
                and data["failed_activity_risk"] >= 3
            )
        })

    results.sort(
        key=lambda item: (
            item["accounts_targeted"],
            item["highest_risk_score"]
        ),
        reverse=True
    )

    return {
        "time_window_minutes": window_minutes,
        "total_ips_analyzed": len(results),
        "correlations": results
    }

@app.post("/api/login-event")
def add_login_event(
    data: LoginEventCreate,
    db: Session = Depends(get_db)
):
    event = LoginEvent(
        user_id=data.user_id,
        ip_address=data.ip_address,
        timestamp=data.timestamp,
        success=1 if data.success else 0
    )

    db.add(event)
    db.commit()
    db.refresh(event)

    return {
        "message": "Login event saved successfully",
        "event_id": event.id,
        "user_id": event.user_id,
        "ip_address": event.ip_address,
        "timestamp": str(event.timestamp),
        "success": bool(event.success)
    }


@app.get("/api/login-timeline")
def get_login_timeline(db: Session = Depends(get_db)):
    events = (
        db.query(LoginEvent)
        .order_by(LoginEvent.timestamp.asc(), LoginEvent.id.asc())
        .all()
    )

    return {
        "total_login_events": len(events),
        "successful_logins": sum(1 for e in events if e.success == 1),
        "failed_logins": sum(1 for e in events if e.success == 0),
        "timeline": [
            {
                "event_id": e.id,
                "user_id": e.user_id,
                "ip_address": e.ip_address,
                "timestamp": str(e.timestamp),
                "status": "Success" if e.success else "Failed"
            }
            for e in events
        ]
    }


@app.get("/api/attack-patterns")
def detect_attack_patterns(
    window_minutes: int = 60,
    db: Session = Depends(get_db)
):
    cutoff = datetime.now() - timedelta(minutes=window_minutes)

    events = (
        db.query(LoginEvent)
        .filter(LoginEvent.timestamp >= cutoff)
        .all()
    )

    ip_data = {}
    user_data = {}

    for event in events:
        if event.success == 0:
            ip_data.setdefault(event.ip_address, {
                "accounts": set(),
                "failed_attempts": 0
            })
            ip_data[event.ip_address]["accounts"].add(event.user_id)
            ip_data[event.ip_address]["failed_attempts"] += 1

            user_data.setdefault(event.user_id, {
                "failed_attempts": 0,
                "ip_addresses": set()
            })
            user_data[event.user_id]["failed_attempts"] += 1
            user_data[event.user_id]["ip_addresses"].add(event.ip_address)

    alerts = []

    for ip, data in ip_data.items():
        if data["failed_attempts"] >= 5 and len(data["accounts"]) == 1:
            alerts.append({
                "type": "Possible Brute Force",
                "ip_address": ip,
                "accounts_targeted": len(data["accounts"]),
                "failed_attempts": data["failed_attempts"]
            })

        if len(data["accounts"]) >= 3 and data["failed_attempts"] >= 3:
            alerts.append({
                "type": "Possible Password Spraying",
                "ip_address": ip,
                "accounts_targeted": len(data["accounts"]),
                "failed_attempts": data["failed_attempts"]
            })

    return {
        "time_window_minutes": window_minutes,
        "total_login_events_analyzed": len(events),
        "detected_patterns": alerts
    }
