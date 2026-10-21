#!/usr/bin/env python3
"""
Development Seed Script — Rental System

Populates MySQL with realistic dev data:
- 2 users (admin + operator)
- 5 computers with varied specs/pricing
- 12 components (attached to computers)
- 6 rentals across different statuses
- 8 notifications (in-app + telegram)
- 3 schedules (calendar bookings)

Usage:
    python seed.py                    # Run against local MySQL (Docker)
    python seed.py --drop             # Drop all tables first (DANGEROUS)
    python seed.py --only-users       # Seed only users table

Environment (from .env or docker-compose):
    DATABASE_URL=mysql+pymysql://rental_user:rental_password@localhost:3306/rental_db
"""

import os
import sys
import argparse
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from pathlib import Path

# Add backend to path
BACKEND_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(BACKEND_ROOT))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from passlib.context import CryptContext

# Import models
from app.models import (
    Base, User, Computer, Component, Rental, RentalItem,
    Notification, Schedule,
    RoleEnum, RentalStatusEnum, NotificationTypeEnum, NotificationStatusEnum
)
from app.core.config import get_settings

settings = get_settings()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ──────────────────────────────────────────────────────────────
# Seed Data Definitions
# ──────────────────────────────────────────────────────────────

USERS = [
    {
        "email": "admin@rental.local",
        "password": "admin123",
        "full_name": "Admin User",
        "phone": "+62-811-0000-0001",
        "role": RoleEnum.ADMIN,
        "is_active": True,
        "telegram_chat_id": "100000001",  # Replace with real chat ID for testing
    },
    {
        "email": "operator@rental.local",
        "password": "operator123",
        "full_name": "Operator Satu",
        "phone": "+62-811-0000-0002",
        "role": RoleEnum.STAFF,
        "is_active": True,
        "telegram_chat_id": "100000002",
    },
]

COMPUTERS = [
    {
        "name": "Gaming PC #01",
        "description": "High-end gaming rig for esports events",
        "serial_number": "GPC-2024-001",
        "brand": "Custom",
        "model": "RTX 4090 Build",
        "purchase_date": datetime(2024, 1, 15),
        "purchase_price": Decimal("45000000"),
        "rental_price_per_day": Decimal("500000"),
        "rental_price_per_week": Decimal("3000000"),
        "rental_price_per_month": Decimal("10000000"),
        "is_available": True,
        "is_active": True,
        "location": "Rak A-1",
    },
    {
        "name": "Workstation #01",
        "description": "Video editing / 3D rendering workstation",
        "serial_number": "WS-2024-001",
        "brand": "Dell",
        "model": "Precision 7920",
        "purchase_date": datetime(2024, 2, 1),
        "purchase_price": Decimal("65000000"),
        "rental_price_per_day": Decimal("750000"),
        "rental_price_per_week": Decimal("4500000"),
        "rental_price_per_month": Decimal("15000000"),
        "is_available": True,
        "is_active": True,
        "location": "Rak A-2",
    },
    {
        "name": "Office Laptop #01",
        "description": "General purpose office laptop",
        "serial_number": "OL-2024-001",
        "brand": "Lenovo",
        "model": "ThinkPad X1 Carbon Gen 11",
        "purchase_date": datetime(2024, 3, 10),
        "purchase_price": Decimal("28000000"),
        "rental_price_per_day": Decimal("200000"),
        "rental_price_per_week": Decimal("1200000"),
        "rental_price_per_month": Decimal("4000000"),
        "is_available": True,
        "is_active": True,
        "location": "Rak B-1",
    },
    {
        "name": "Office Laptop #02",
        "description": "General purpose office laptop",
        "serial_number": "OL-2024-002",
        "brand": "HP",
        "model": "EliteBook 840 G10",
        "purchase_date": datetime(2024, 3, 10),
        "purchase_price": Decimal("25000000"),
        "rental_price_per_day": Decimal("180000"),
        "rental_price_per_week": Decimal("1100000"),
        "rental_price_per_month": Decimal("3600000"),
        "is_available": True,
        "is_active": True,
        "location": "Rak B-2",
    },
    {
        "name": "Mini PC #01",
        "description": "Compact desktop for kiosk/display",
        "serial_number": "MPC-2024-001",
        "brand": "Intel",
        "model": "NUC 13 Pro",
        "purchase_date": datetime(2024, 4, 1),
        "purchase_price": Decimal("12000000"),
        "rental_price_per_day": Decimal("100000"),
        "rental_price_per_week": Decimal("600000"),
        "rental_price_per_month": Decimal("2000000"),
        "is_available": False,  # Currently rented
        "is_active": True,
        "location": "Rak C-1",
    },
]

COMPONENTS = [
    # Gaming PC #01 components
    {"computer_idx": 0, "name": "27\" Gaming Monitor", "component_type": "monitor", "brand": "ASUS", "model": "ROG Swift PG27AQN", "serial_number": "MON-GPC001-01", "specifications": "27\", 360Hz, 1440p, G-Sync"},
    {"computer_idx": 0, "name": "Mechanical Keyboard", "component_type": "keyboard", "brand": "Keychron", "model": "K2 Hot-swappable", "serial_number": "KB-GPC001-01", "specifications": "TKL, Gateron Red, RGB"},
    {"computer_idx": 0, "name": "Gaming Mouse", "component_type": "mouse", "brand": "Logitech", "model": "G Pro X Superlight 2", "serial_number": "MS-GPC001-01", "specifications": "25K DPI, 60g, Lightspeed"},
    {"computer_idx": 0, "name": "Headset", "component_type": "headset", "brand": "SteelSeries", "model": "Arctis Nova Pro Wireless", "serial_number": "HS-GPC001-01", "specifications": "Dual wireless, ANC, GameDAC"},
    # Workstation #01 components
    {"computer_idx": 1, "name": "32\" 4K Monitor", "component_type": "monitor", "brand": "Dell", "model": "UltraSharp U3223QE", "serial_number": "MON-WS001-01", "specifications": "32\", 4K, USB-C hub, 60Hz"},
    {"computer_idx": 1, "name": "32\" 4K Monitor (2nd)", "component_type": "monitor", "brand": "Dell", "model": "UltraSharp U3223QE", "serial_number": "MON-WS001-02", "specifications": "32\", 4K, USB-C hub, 60Hz"},
    {"computer_idx": 1, "name": "Ergonomic Keyboard", "component_type": "keyboard", "brand": "Keychron", "model": "Q1 Pro", "serial_number": "KB-WS001-01", "specifications": "75%, Knob, Gateron G Pro Red"},
    {"computer_idx": 1, "name": "Vertical Mouse", "component_type": "mouse", "brand": "Logitech", "model": "MX Vertical", "serial_number": "MS-WS001-01", "specifications": "Ergonomic, 4000 DPI, USB-C"},
    # Office Laptop #01 components
    {"computer_idx": 2, "name": "Laptop Stand", "component_type": "other", "brand": "Rain Design", "model": "mStand", "serial_number": "LS-OL001-01", "specifications": "Aluminum, cable management"},
    {"computer_idx": 2, "name": "USB-C Hub", "component_type": "other", "brand": "Anker", "model": "PowerExpand 7-in-1", "serial_number": "HUB-OL001-01", "specifications": "HDMI, USB-A x2, SD, PD"},
    # Office Laptop #02 components
    {"computer_idx": 3, "name": "Laptop Stand", "component_type": "other", "brand": "Rain Design", "model": "mStand", "serial_number": "LS-OL002-01", "specifications": "Aluminum, cable management"},
    {"computer_idx": 3, "name": "Wireless Mouse", "component_type": "mouse", "brand": "Logitech", "model": "MX Anywhere 3", "serial_number": "MS-OL002-01", "specifications": "Compact, Darkfield, USB-C"},
    # Mini PC #01 components
    {"computer_idx": 4, "name": "HDMI Cable 2m", "component_type": "cable", "brand": "UGREEN", "model": "HDMI 2.1", "serial_number": "CAB-MPC001-01", "specifications": "48Gbps, 8K@60Hz"},
]

# Rentals: (user_idx, computer_idx, start_offset_days, end_offset_days, status, deposit, notes)
RENTALS = [
    # Active rental (Mini PC #01) - ends tomorrow
    {"user_idx": 1, "computer_idx": 4, "start_offset": -5, "end_offset": 1, "status": RentalStatusEnum.ACTIVE, "deposit": Decimal("500000"), "notes": "Kiosk display for expo"},
    # Active rental (Gaming PC #01) - ends in 3 days
    {"user_idx": 1, "computer_idx": 0, "start_offset": -2, "end_offset": 3, "status": RentalStatusEnum.ACTIVE, "deposit": Decimal("1000000"), "notes": "Tournament weekend"},
    # Active rental (Workstation #01) - ends in 7 days
    {"user_idx": 1, "computer_idx": 1, "start_offset": 0, "end_offset": 7, "status": RentalStatusEnum.ACTIVE, "deposit": Decimal("2000000"), "notes": "Video project deadline"},
    # Completed rental (Office Laptop #01) - returned yesterday
    {"user_idx": 1, "computer_idx": 2, "start_offset": -10, "end_offset": -1, "status": RentalStatusEnum.COMPLETED, "deposit": Decimal("500000"), "notes": "Client presentation"},
    # Cancelled rental (Office Laptop #02)
    {"user_idx": 1, "computer_idx": 3, "start_offset": 5, "end_offset": 10, "status": RentalStatusEnum.CANCELLED, "deposit": Decimal("0"), "notes": "Client cancelled project"},
    # Pending rental (Gaming PC #01) - starts in 2 days
    {"user_idx": 1, "computer_idx": 0, "start_offset": 2, "end_offset": 5, "status": RentalStatusEnum.PENDING, "deposit": Decimal("1000000"), "notes": "Upcoming LAN party"},
]

NOTIFICATIONS = [
    # For active rentals - reminders
    {"user_idx": 1, "rental_idx": 0, "type": NotificationTypeEnum.IN_APP, "title": "Rental Ending Soon", "message": "Rental #1 (Mini PC #01) ends tomorrow. Please arrange return.", "status": NotificationStatusEnum.PENDING},
    {"user_idx": 1, "rental_idx": 0, "type": NotificationTypeEnum.TELEGRAM, "title": "Rental Ending Soon", "message": "Rental #1 (Mini PC #01) ends tomorrow. Please arrange return.", "status": NotificationStatusEnum.PENDING},
    {"user_idx": 1, "rental_idx": 1, "type": NotificationTypeEnum.IN_APP, "title": "Rental Ending in 3 Days", "message": "Rental #2 (Gaming PC #01) ends in 3 days.", "status": NotificationStatusEnum.PENDING},
    {"user_idx": 1, "rental_idx": 1, "type": NotificationTypeEnum.TELEGRAM, "title": "Rental Ending in 3 Days", "message": "Rental #2 (Gaming PC #01) ends in 3 days.", "status": NotificationStatusEnum.PENDING},
    {"user_idx": 1, "rental_idx": 2, "type": NotificationTypeEnum.IN_APP, "title": "Rental Ending in 7 Days", "message": "Rental #3 (Workstation #01) ends in 7 days.", "status": NotificationStatusEnum.PENDING},
    # For completed rental
    {"user_idx": 1, "rental_idx": 3, "type": NotificationTypeEnum.IN_APP, "title": "Rental Completed", "message": "Rental #4 (Office Laptop #01) has been completed. Deposit refunded.", "status": NotificationStatusEnum.SENT, "sent_at_offset": -1},
    # For cancelled rental
    {"user_idx": 1, "rental_idx": 4, "type": NotificationTypeEnum.IN_APP, "title": "Rental Cancelled", "message": "Rental #5 (Office Laptop #02) was cancelled.", "status": NotificationStatusEnum.SENT, "sent_at_offset": -2},
]

SCHEDULES = [
    {"computer_idx": 0, "name": "Weekly Maintenance", "description": "Dust cleaning + driver updates", "start_time_offset": 1, "end_time_offset": 2, "is_recurring": True, "recurrence_rule": "FREQ=WEEKLY;BYDAY=MO;BYHOUR=9;BYMINUTE=0"},
    {"computer_idx": 1, "name": "Reserved: Client ABC Corp", "description": "Month-long rendering project", "start_time_offset": 5, "end_time_offset": 35, "is_recurring": False, "recurrence_rule": None},
    {"computer_idx": 2, "name": "Team Meeting Room Setup", "description": "Laptop for presentation", "start_time_offset": 2, "end_time_offset": 3, "is_recurring": False, "recurrence_rule": None},
]

# ──────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────

def get_engine():
    """Create engine from settings."""
    return create_engine(settings.DATABASE_URL, echo=False, pool_pre_ping=True)


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def offset_dt(days: int, hours: int = 0) -> datetime:
    """UTC now + offset."""
    return utcnow() + timedelta(days=days, hours=hours)


# ──────────────────────────────────────────────────────────────
# Seed Functions
# ──────────────────────────────────────────────────────────────

def seed_users(session) -> list[User]:
    print("🌱 Seeding users...")
    users = []
    for u in USERS:
        existing = session.query(User).filter_by(email=u["email"]).first()
        if existing:
            print(f"  ⏭  User {u['email']} exists, skipping")
            users.append(existing)
            continue
        user = User(
            email=u["email"],
            hashed_password=hash_password(u["password"]),
            full_name=u["full_name"],
            phone=u["phone"],
            role=u["role"],
            is_active=u["is_active"],
            telegram_chat_id=u["telegram_chat_id"],
        )
        session.add(user)
        users.append(user)
    session.flush()
    print(f"  ✅ {len(users)} users ready")
    return users


def seed_computers(session) -> list[Computer]:
    print("🌱 Seeding computers...")
    computers = []
    for c in COMPUTERS:
        existing = session.query(Computer).filter_by(serial_number=c["serial_number"]).first()
        if existing:
            print(f"  ⏭  Computer {c['serial_number']} exists, skipping")
            computers.append(existing)
            continue
        computer = Computer(**c)
        session.add(computer)
        computers.append(computer)
    session.flush()
    print(f"  ✅ {len(computers)} computers ready")
    return computers


def seed_components(session, computers: list[Computer]) -> list[Component]:
    print("🌱 Seeding components...")
    components = []
    for c in COMPONENTS:
        computer = computers[c["computer_idx"]]
        existing = session.query(Component).filter_by(
            computer_id=computer.id,
            serial_number=c["serial_number"]
        ).first()
        if existing:
            print(f"  ⏭  Component {c['serial_number']} exists, skipping")
            components.append(existing)
            continue
        component = Component(
            computer_id=computer.id,
            name=c["name"],
            component_type=c["component_type"],
            brand=c["brand"],
            model=c["model"],
            serial_number=c["serial_number"],
            specifications=c["specifications"],
        )
        session.add(component)
        components.append(component)
    session.flush()
    print(f"  ✅ {len(components)} components ready")
    return components


def seed_rentals(session, users: list[User], computers: list[Computer]) -> list[Rental]:
    print("🌱 Seeding rentals...")
    rentals = []
    now = utcnow()
    for i, r in enumerate(RENTALS):
        user = users[r["user_idx"]]
        computer = computers[r["computer_idx"]]
        
        start_date = offset_dt(r["start_offset"])
        end_date = offset_dt(r["end_offset"])
        days = max(1, (end_date - start_date).days)
        
        unit_price = computer.rental_price_per_day
        total_price = unit_price * days  # quantity = 1 for all seed rentals
        
        rental = Rental(
            user_id=user.id,
            status=r["status"],
            start_date=start_date,
            end_date=end_date,
            actual_return_date=offset_dt(r["end_offset"]) if r["status"] == RentalStatusEnum.COMPLETED else None,
            total_price=total_price,
            deposit=r["deposit"],
            notes=r["notes"],
        )
        session.add(rental)
        session.flush()  # Get rental.id
        
        # Create rental_item
        rental_item = RentalItem(
            rental_id=rental.id,
            computer_id=computer.id,
            quantity=1,
            unit_price=unit_price,
            total_price=total_price,
        )
        session.add(rental_item)
        
        # Update computer availability
        if r["status"] == RentalStatusEnum.ACTIVE:
            computer.is_available = False
        elif r["status"] in (RentalStatusEnum.COMPLETED, RentalStatusEnum.CANCELLED):
            computer.is_available = True
        
        rentals.append(rental)
        print(f"  📝 Rental #{rental.id}: {computer.name} | {r['status'].value} | {days} days | Rp {total_price:,.0f}")
    
    session.flush()
    print(f"  ✅ {len(rentals)} rentals ready")
    return rentals


def seed_notifications(session, users: list[User], rentals: list[Rental]) -> list[Notification]:
    print("🌱 Seeding notifications...")
    notifications = []
    for n in NOTIFICATIONS:
        user = users[n["user_idx"]]
        rental = rentals[n["rental_idx"]] if "rental_idx" in n else None
        
        sent_at = None
        if n.get("sent_at_offset") is not None:
            sent_at = offset_dt(n["sent_at_offset"])
        
        notification = Notification(
            user_id=user.id,
            type=n["type"],
            title=n["title"],
            message=n["message"],
            status=n["status"],
            related_rental_id=rental.id if rental else None,
            sent_at=sent_at,
            error_message=None if n["status"] != NotificationStatusEnum.FAILED else "Simulated failure",
        )
        session.add(notification)
        notifications.append(notification)
    session.flush()
    print(f"  ✅ {len(notifications)} notifications ready")
    return notifications


def seed_schedules(session, computers: list[Computer]) -> list[Schedule]:
    print("🌱 Seeding schedules...")
    schedules = []
    for s in SCHEDULES:
        computer = computers[s["computer_idx"]]
        start_time = offset_dt(s["start_time_offset"], 9)  # 09:00
        end_time = offset_dt(s["end_time_offset"], 17)     # 17:00
        
        schedule = Schedule(
            name=s["name"],
            description=s["description"],
            computer_id=computer.id,
            start_time=start_time,
            end_time=end_time,
            is_recurring=s["is_recurring"],
            recurrence_rule=s["recurrence_rule"],
            is_active=True,
        )
        session.add(schedule)
        schedules.append(schedule)
    session.flush()
    print(f"  ✅ {len(schedules)} schedules ready")
    return schedules


# ──────────────────────────────────────────────────────────────
# Main
# ──────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Seed rental database")
    parser.add_argument("--drop", action="store_true", help="Drop all tables first (DANGEROUS)")
    parser.add_argument("--only-users", action="store_true", help="Seed only users")
    args = parser.parse_args()

    engine = get_engine()
    SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)
    session = SessionLocal()

    try:
        if args.drop:
            print("⚠️  Dropping all tables...")
            Base.metadata.drop_all(bind=engine)
            print("  ✅ Tables dropped")

        # Create tables
        Base.metadata.create_all(bind=engine)
        print("✅ Tables created/verified")

        # Seed in dependency order
        users = seed_users(session)
        
        if not args.only_users:
            computers = seed_computers(session)
            components = seed_components(session, computers)
            rentals = seed_rentals(session, users, computers)
            notifications = seed_notifications(session, users, rentals)
            schedules = seed_schedules(session, computers)

        session.commit()
        print("\n🎉 Seed completed successfully!")
        
        # Summary
        print("\n📊 Summary:")
        print(f"  Users:        {session.query(User).count()}")
        print(f"  Computers:    {session.query(Computer).count()}")
        print(f"  Components:   {session.query(Component).count()}")
        print(f"  Rentals:      {session.query(Rental).count()}")
        print(f"  Rental Items: {session.query(RentalItem).count()}")
        print(f"  Notifications: {session.query(Notification).count()}")
        print(f"  Schedules:    {session.query(Schedule).count()}")
        
    except Exception as e:
        session.rollback()
        print(f"\n❌ Seed failed: {e}")
        raise
    finally:
        session.close()


if __name__ == "__main__":
    main()