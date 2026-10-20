import asyncio
import logging
from typing import Optional, List, Dict, Any
from datetime import datetime
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import aiosmtplib
from telegram import Bot
from telegram.error import TelegramError
import json

from app.core.config import get_settings
from app.models import Notification, NotificationTypeEnum, NotificationStatusEnum, User, Rental
from app.db.session import async_session_maker

settings = get_settings()
logger = logging.getLogger(__name__)


class NotificationService:
    def __init__(self):
        self.telegram_bot: Optional[Bot] = None
        self.websocket_connections: Dict[int, List[Any]] = {}
        self._init_telegram()

    def _init_telegram(self):
        if settings.TELEGRAM_BOT_TOKEN:
            self.telegram_bot = Bot(token=settings.TELEGRAM_BOT_TOKEN)

    async def register_websocket(self, user_id: int, websocket: Any):
        if user_id not in self.websocket_connections:
            self.websocket_connections[user_id] = []
        self.websocket_connections[user_id].append(websocket)

    async def unregister_websocket(self, user_id: int, websocket: Any):
        if user_id in self.websocket_connections:
            self.websocket_connections[user_id].remove(websocket)
            if not self.websocket_connections[user_id]:
                del self.websocket_connections[user_id]

    async def send_in_app(self, user_id: int, title: str, message: str, data: Optional[dict] = None):
        if user_id in self.websocket_connections:
            payload = {
                "type": "notification",
                "title": title,
                "message": message,
                "data": data or {},
                "timestamp": datetime.utcnow().isoformat(),
            }
            disconnected = []
            for ws in self.websocket_connections[user_id]:
                try:
                    await ws.send_text(json.dumps(payload))
                except Exception:
                    disconnected.append(ws)
            for ws in disconnected:
                await self.unregister_websocket(user_id, ws)

    async def send_email(self, to_email: str, subject: str, body: str, html_body: Optional[str] = None) -> bool:
        try:
            message = MIMEMultipart("alternative")
            message["From"] = settings.SMTP_FROM
            message["To"] = to_email
            message["Subject"] = subject

            message.attach(MIMEText(body, "plain"))
            if html_body:
                message.attach(MIMEText(html_body, "html"))

            await aiosmtplib.send(
                message,
                hostname=settings.SMTP_HOST,
                port=settings.SMTP_PORT,
                username=settings.SMTP_USER,
                password=settings.SMTP_PASSWORD,
                start_tls=settings.SMTP_TLS,
            )
            return True
        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {e}")
            return False

    async def send_telegram(self, chat_id: str, message: str) -> bool:
        if not self.telegram_bot:
            logger.warning("Telegram bot not configured")
            return False
        try:
            await self.telegram_bot.send_message(chat_id=chat_id, text=message, parse_mode="HTML")
            return True
        except TelegramError as e:
            logger.error(f"Failed to send Telegram message to {chat_id}: {e}")
            return False

    async def create_notification(
        self,
        user_id: int,
        notification_type: NotificationTypeEnum,
        title: str,
        message: str,
        related_rental_id: Optional[int] = None,
    ) -> Notification:
        async with async_session_maker() as session:
            notification = Notification(
                user_id=user_id,
                type=notification_type,
                title=title,
                message=message,
                related_rental_id=related_rental_id,
                status=NotificationStatusEnum.PENDING,
            )
            session.add(notification)
            await session.commit()
            await session.refresh(notification)
            return notification

    async def send_notification(
        self,
        user_id: int,
        notification_type: NotificationTypeEnum,
        title: str,
        message: str,
        related_rental_id: Optional[int] = None,
        user_email: Optional[str] = None,
        user_telegram_chat_id: Optional[str] = None,
    ) -> Notification:
        notification = await self.create_notification(
            user_id=user_id,
            notification_type=notification_type,
            title=title,
            message=message,
            related_rental_id=related_rental_id,
        )

        success = False
        error_message = None

        try:
            if notification_type == NotificationTypeEnum.EMAIL and user_email:
                success = await self.send_email(user_email, title, message)
            elif notification_type == NotificationTypeEnum.TELEGRAM and user_telegram_chat_id:
                success = await self.send_telegram(user_telegram_chat_id, message)
            elif notification_type == NotificationTypeEnum.IN_APP:
                await self.send_in_app(user_id, title, message, {"rental_id": related_rental_id})
                success = True
        except Exception as e:
            error_message = str(e)
            logger.error(f"Notification send failed: {e}")

        async with async_session_maker() as session:
            notification = await session.get(Notification, notification.id)
            if notification:
                notification.status = NotificationStatusEnum.SENT if success else NotificationStatusEnum.FAILED
                notification.sent_at = datetime.utcnow() if success else None
                notification.error_message = error_message
                await session.commit()

        return notification

    async def send_multi_channel(
        self,
        user: User,
        title: str,
        message: str,
        related_rental_id: Optional[int] = None,
        channels: Optional[List[NotificationTypeEnum]] = None,
    ) -> List[Notification]:
        if channels is None:
            channels = [NotificationTypeEnum.IN_APP]
            if user.email:
                channels.append(NotificationTypeEnum.EMAIL)
            if user.telegram_chat_id:
                channels.append(NotificationTypeEnum.TELEGRAM)

        results = []
        for channel in channels:
            notification = await self.send_notification(
                user_id=user.id,
                notification_type=channel,
                title=title,
                message=message,
                related_rental_id=related_rental_id,
                user_email=user.email if channel == NotificationTypeEnum.EMAIL else None,
                user_telegram_chat_id=user.telegram_chat_id if channel == NotificationTypeEnum.TELEGRAM else None,
            )
            results.append(notification)

        return results

    async def send_rental_reminder(self, rental: Rental, days_until_expiry: int):
        async with async_session_maker() as session:
            user = await session.get(User, rental.user_id)
            if not user:
                return

        if days_until_expiry == 0:
            title = "Rental Due Today"
            message = f"Your rental #{rental.id} is due for return today. Please return the equipment."
        elif days_until_expiry == 1:
            title = "Rental Due Tomorrow"
            message = f"Your rental #{rental.id} is due for return tomorrow. Please prepare for return."
        else:
            title = f"Rental Due in {days_until_expiry} Days"
            message = f"Your rental #{rental.id} is due for return in {days_until_expiry} days."

        await self.send_multi_channel(user, title, message, related_rental_id=rental.id)

    async def send_rental_created(self, rental: Rental):
        async with async_session_maker() as session:
            user = await session.get(User, rental.user_id)
            if not user:
                return

        title = "New Rental Created"
        message = f"Your rental #{rental.id} has been created. Start: {rental.start_date.strftime('%Y-%m-%d')}, End: {rental.end_date.strftime('%Y-%m-%d')}"
        await self.send_multi_channel(user, title, message, related_rental_id=rental.id)

    async def send_rental_completed(self, rental: Rental):
        async with async_session_maker() as session:
            user = await session.get(User, rental.user_id)
            if not user:
                return

        title = "Rental Completed"
        message = f"Your rental #{rental.id} has been completed. Thank you for using our service!"
        await self.send_multi_channel(user, title, message, related_rental_id=rental.id)

    async def send_rental_overdue(self, rental: Rental):
        async with async_session_maker() as session:
            user = await session.get(User, rental.user_id)
            if not user:
                return

        title = "Rental Overdue"
        message = f"Your rental #{rental.id} is overdue. Please return the equipment immediately to avoid additional charges."
        await self.send_multi_channel(user, title, message, related_rental_id=rental.id)


notification_service = NotificationService()