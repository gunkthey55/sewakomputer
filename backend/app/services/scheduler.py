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
from app.services.reminder import reminder_service

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler(timezone="Asia/Kuala_Lumpur")


async def create_reminders_for_active_rentals():
    """Create reminder records for all active/pending rentals."""
    logger.info("Creating reminders for active rentals...")
    async with async_session_maker() as session:
        stmt = select(Rental).where(
            and_(
                Rental.status.in_([RentalStatusEnum.ACTIVE, RentalStatusEnum.PENDING]),
                Rental.end_date > datetime.utcnow(),
            )
        )
        result = await session.execute(stmt)
        rentals = result.scalars().all()

        for rental in rentals:
            await reminder_service.create_reminders_for_rental(rental)

    logger.info(f"Created reminders for {len(rentals)} rentals")


async def send_pending_reminders():
    """Send all pending reminders."""
    logger.info("Sending pending reminders...")
    sent = await reminder_service.send_pending_reminders()
    logger.info(f"Sent {sent} reminders")


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
    # Daily at 08:00 - create reminders for active rentals
    scheduler.add_job(
        create_reminders_for_active_rentals,
        CronTrigger(hour=8, minute=0),
        id="daily_create_reminders",
        name="Daily Create Reminders for Active Rentals",
        replace_existing=True,
    )

    # Every 15 minutes - send pending reminders
    scheduler.add_job(
        send_pending_reminders,
        IntervalTrigger(minutes=15),
        id="send_pending_reminders",
        name="Send Pending Reminders",
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