#!/usr/bin/env python3
"""
Backend AppSewa - Background Service
Standalone daemon untuk menjalankan scheduler & notifikasi otomatis
"""

import os
import sys
import signal
import logging
import asyncio
from pathlib import Path
from datetime import datetime, timedelta

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.db.session import async_session_maker, init_db
from backend.app.models import Rental, RentalStatusEnum, User
from backend.app.services.notification import notification_service
from backend.app.core.config import get_settings

settings = get_settings()

# Setup logging
log_level = getattr(logging, os.getenv("SERVICE_LOG_LEVEL", "INFO").upper())
logging.basicConfig(
    level=log_level,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler("backend-appsewa.log"),
    ],
)
logger = logging.getLogger("backend-appsewa")

scheduler = AsyncIOScheduler(timezone=settings.SCHEDULER_TIMEZONE)
shutdown_event = asyncio.Event()


async def check_expiring_rentals():
    """Check for rentals expiring in 1-7 days and send reminders."""
    logger.info("Running daily expiring rentals check...")
    async with async_session_maker() as session:
        now = datetime.utcnow()
        for days in range(1, 8):
            target_date = now + timedelta(days=days)
            start_of_day = target_date.replace(hour=0, minute=0, second=0, microsecond=0)
            end_of_day = target_date.replace(hour=23, minute=59, second=59, microsecond=999999)

            stmt = select(Rental).where(
                and_(
                    Rental.status == RentalStatusEnum.ACTIVE,
                    Rental.end_date >= start_of_day,
                    Rental.end_date <= end_of_day,
                )
            )
            result = await session.execute(stmt)
            rentals = result.scalars().all()

            for rental in rentals:
                await notification_service.send_rental_reminder(rental, days)
                logger.info(f"Sent {days}-day reminder for rental {rental.id}")


async def check_today_rentals():
    """Check for rentals due today (hourly)."""
    logger.info("Running hourly today rentals check...")
    async with async_session_maker() as session:
        now = datetime.utcnow()
        start_of_day = now.replace(hour=0, minute=0, second=0, microsecond=0)
        end_of_day = now.replace(hour=23, minute=59, second=59, microsecond=999999)

        stmt = select(Rental).where(
            and_(
                Rental.status == RentalStatusEnum.ACTIVE,
                Rental.end_date >= start_of_day,
                Rental.end_date <= end_of_day,
            )
        )
        result = await session.execute(stmt)
        rentals = result.scalars().all()

        for rental in rentals:
            await notification_service.send_rental_reminder(rental, 0)
            logger.info(f"Sent today reminder for rental {rental.id}")


async def check_overdue_rentals():
    """Check for overdue rentals and update status + send notifications."""
    logger.info("Running overdue rentals check...")
    async with async_session_maker() as session:
        now = datetime.utcnow()

        stmt = select(Rental).where(
            and_(
                Rental.status == RentalStatusEnum.ACTIVE,
                Rental.end_date < now,
            )
        )
        result = await session.execute(stmt)
        rentals = result.scalars().all()

        for rental in rentals:
            rental.status = RentalStatusEnum.OVERDUE
            await notification_service.send_rental_overdue(rental)
            logger.info(f"Marked rental {rental.id} as overdue")

        await session.commit()


async def auto_complete_rentals():
    """Auto-complete rentals that have been returned."""
    logger.info("Running auto-complete check...")
    async with async_session_maker() as session:
        stmt = select(Rental).where(
            and_(
                Rental.status.in_([RentalStatusEnum.ACTIVE, RentalStatusEnum.OVERDUE]),
                Rental.actual_return_date.is_not(None),
            )
        )
        result = await session.execute(stmt)
        rentals = result.scalars().all()

        for rental in rentals:
            rental.status = RentalStatusEnum.COMPLETED
            await notification_service.send_rental_completed(rental)
            logger.info(f"Auto-completed rental {rental.id}")

        await session.commit()


def setup_scheduler():
    """Configure all scheduled jobs."""
    # Daily at 08:00 - check expiring rentals (1-7 days)
    scheduler.add_job(
        check_expiring_rentals,
        CronTrigger(hour=8, minute=0),
        id="daily_expiring_check",
        name="Daily Expiring Rentals Check",
        replace_existing=True,
    )

    # Hourly - check today's rentals
    scheduler.add_job(
        check_today_rentals,
        IntervalTrigger(hours=1),
        id="hourly_today_check",
        name="Hourly Today Rentals Check",
        replace_existing=True,
    )

    # Every 30 minutes - check overdue
    scheduler.add_job(
        check_overdue_rentals,
        IntervalTrigger(minutes=30),
        id="overdue_check",
        name="Overdue Rentals Check",
        replace_existing=True,
    )

    # Every hour - auto complete
    scheduler.add_job(
        auto_complete_rentals,
        IntervalTrigger(hours=1),
        id="auto_complete_check",
        name="Auto Complete Rentals Check",
        replace_existing=True,
    )


async def run_service():
    """Main service loop."""
    logger.info("=" * 50)
    logger.info("Starting Backend AppSewa Background Service")
    logger.info("=" * 50)

    # Initialize database
    await init_db()
    logger.info("Database initialized")

    # Setup scheduler
    setup_scheduler()
    scheduler.start()
    logger.info("Scheduler started with all jobs:")
    for job in scheduler.get_jobs():
        logger.info(f"  - {job.name}: {job.trigger}")

    # Wait for shutdown signal
    await shutdown_event.wait()

    # Graceful shutdown
    logger.info("Shutting down...")
    scheduler.shutdown(wait=True)
    logger.info("Scheduler stopped")
    logger.info("Backend AppSewa stopped")


def signal_handler(signum, frame):
    logger.info(f"Received signal {signum}, initiating shutdown...")
    shutdown_event.set()


def write_pid_file():
    pid_file = os.getenv("SERVICE_PID_FILE", "/var/run/backend-appsewa.pid")
    try:
        Path(pid_file).parent.mkdir(parents=True, exist_ok=True)
        with open(pid_file, "w") as f:
            f.write(str(os.getpid()))
        logger.info(f"PID file written to {pid_file}")
    except Exception as e:
        logger.warning(f"Could not write PID file: {e}")


def remove_pid_file():
    pid_file = os.getenv("SERVICE_PID_FILE", "/var/run/backend-appsewa.pid")
    try:
        Path(pid_file).unlink(missing_ok=True)
    except Exception:
        pass


def main():
    # Handle signals
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    write_pid_file()

    try:
        asyncio.run(run_service())
    except KeyboardInterrupt:
        logger.info("Interrupted")
    finally:
        remove_pid_file()


if __name__ == "__main__":
    main()