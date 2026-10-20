import logging
from datetime import datetime, timedelta
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import async_session_maker
from app.models import Rental, RentalStatusEnum, User
from app.services.notification import notification_service

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler(timezone="Asia/Kuala_Lumpur")


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


def start_scheduler():
    """Start the APScheduler with all jobs."""
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

    scheduler.start()
    logger.info("Scheduler started with all jobs")


def stop_scheduler():
    """Stop the scheduler."""
    scheduler.shutdown()
    logger.info("Scheduler stopped")