import logging
from datetime import datetime, timedelta
from typing import Optional, List
from sqlalchemy import select, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import async_session_maker
from app.models import Reminder, ReminderChannelEnum, Rental, RentalStatusEnum, User
from app.services.notification import notification_service

logger = logging.getLogger(__name__)

REMINDER_DAYS = [7, 3, 1, 0]  # 7 days, 3 days, 1 day, due today


class ReminderService:
    def __init__(self):
        pass

    async def create_reminders_for_rental(self, rental: Rental, channels: Optional[List[ReminderChannelEnum]] = None) -> List[Reminder]:
        """Create reminder records for a rental at specified days before end_date."""
        if channels is None:
            channels = [ReminderChannelEnum.IN_APP, ReminderChannelEnum.TELEGRAM]

        reminders = []
        async with async_session_maker() as session:
            for days_before in REMINDER_DAYS:
                scheduled_for = rental.end_date - timedelta(days=days_before)

                # Only create if in the future
                if scheduled_for > datetime.utcnow():
                    for channel in channels:
                        # Check if already exists (idempotent)
                        stmt = select(Reminder).where(
                            and_(
                                Reminder.rental_id == rental.id,
                                Reminder.days_before == days_before,
                                Reminder.channel == channel
                            )
                        )
                        result = await session.execute(stmt)
                        existing = result.scalar_one_or_none()

                        if not existing:
                            reminder = Reminder(
                                rental_id=rental.id,
                                channel=channel,
                                days_before=days_before,
                                scheduled_for=scheduled_for,
                                is_sent=False,
                            )
                            session.add(reminder)
                            reminders.append(reminder)

            if reminders:
                await session.commit()
                for r in reminders:
                    await session.refresh(r)

        return reminders

    async def get_pending_reminders(self, limit: int = 100) -> List[Reminder]:
        """Get reminders that are due to be sent."""
        async with async_session_maker() as session:
            now = datetime.utcnow()
            stmt = select(Reminder).where(
                and_(
                    Reminder.is_sent == False,
                    Reminder.scheduled_for <= now
                )
            ).order_by(Reminder.scheduled_for).limit(limit)

            result = await session.execute(stmt)
            return result.scalars().all()

    async def send_pending_reminders(self) -> int:
        """Process and send all pending reminders."""
        reminders = await self.get_pending_reminders()
        sent_count = 0

        for reminder in reminders:
            try:
                async with async_session_maker() as session:
                    rental = await session.get(Rental, reminder.rental_id)
                    if not rental or rental.status not in [RentalStatusEnum.ACTIVE, RentalStatusEnum.PENDING]:
                        reminder.is_sent = True  # Skip if rental not active
                        await session.commit()
                        continue

                    user = await session.get(User, rental.user_id)
                    if not user:
                        reminder.retry_count += 1
                        reminder.error_message = "User not found"
                        await session.commit()
                        continue

                # Send based on channel
                success = False
                if reminder.channel == ReminderChannelEnum.TELEGRAM:
                    success = await notification_service.send_telegram(
                        chat_id=user.telegram_chat_id or "",
                        message=self._format_reminder_message(rental, reminder.days_before)
                    )
                elif reminder.channel == ReminderChannelEnum.IN_APP:
                    await notification_service.send_in_app(
                        user_id=user.id,
                        title=self._format_reminder_title(rental, reminder.days_before),
                        message=self._format_reminder_message(rental, reminder.days_before),
                        data={"rental_id": rental.id, "days_before": reminder.days_before}
                    )
                    success = True
                elif reminder.channel == ReminderChannelEnum.EMAIL:
                    # Email sending would go here
                    success = False

                async with async_session_maker() as session:
                    reminder = await session.get(Reminder, reminder.id)
                    if reminder:
                        if success:
                            reminder.is_sent = True
                            reminder.sent_at = datetime.utcnow()
                            sent_count += 1
                        else:
                            reminder.retry_count += 1
                            reminder.error_message = "Failed to send"
                            if reminder.retry_count >= 3:
                                reminder.is_sent = True  # Give up after 3 retries
                        await session.commit()

            except Exception as e:
                logger.error(f"Failed to send reminder {reminder.id}: {e}")
                async with async_session_maker() as session:
                    reminder = await session.get(Reminder, reminder.id)
                    if reminder:
                        reminder.retry_count += 1
                        reminder.error_message = str(e)
                        if reminder.retry_count >= 3:
                            reminder.is_sent = True
                        await session.commit()

        logger.info(f"Reminder job completed: {sent_count}/{len(reminders)} sent")
        return sent_count

    async def mark_reminder_sent(self, reminder_id: int) -> bool:
        """Manually mark a reminder as sent."""
        async with async_session_maker() as session:
            reminder = await session.get(Reminder, reminder_id)
            if reminder:
                reminder.is_sent = True
                reminder.sent_at = datetime.utcnow()
                await session.commit()
                return True
        return False

    def _format_reminder_title(self, rental: Rental, days_before: int) -> str:
        if days_before == 0:
            return "Rental Due Today"
        elif days_before == 1:
            return "Rental Due Tomorrow"
        else:
            return f"Rental Due in {days_before} Days"

    def _format_reminder_message(self, rental: Rental, days_before: int) -> str:
        if days_before == 0:
            return f"Your rental #{rental.id} is due for return today. Please return the equipment."
        elif days_before == 1:
            return f"Your rental #{rental.id} is due for return tomorrow. Please prepare for return."
        else:
            return f"Your rental #{rental.id} is due for return in {days_before} days."

    async def cleanup_old_reminders(self, days_old: int = 30) -> int:
        """Clean up old sent reminders."""
        async with async_session_maker() as session:
            cutoff = datetime.utcnow() - timedelta(days=days_old)
            stmt = select(Reminder).where(
                and_(
                    Reminder.is_sent == True,
                    Reminder.sent_at < cutoff
                )
            )
            result = await session.execute(stmt)
            reminders = result.scalars().all()

            for r in reminders:
                await session.delete(r)

            await session.commit()
            return len(reminders)


reminder_service = ReminderService()