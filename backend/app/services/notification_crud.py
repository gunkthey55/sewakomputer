from typing import Optional, List
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import Notification, NotificationTypeEnum, NotificationStatusEnum, User, Rental
from app.schemas import NotificationCreate, NotificationUpdate, PaginatedResponse


class NotificationService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_id(self, notification_id: int) -> Optional[Notification]:
        stmt = select(Notification).where(Notification.id == notification_id).options(
            selectinload(Notification.user), selectinload(Notification.rental)
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_all(
        self,
        page: int = 1,
        page_size: int = 20,
        user_id: Optional[int] = None,
        status: Optional[NotificationStatusEnum] = None,
        notification_type: Optional[NotificationTypeEnum] = None,
    ) -> PaginatedResponse:
        stmt = select(Notification).options(selectinload(Notification.user), selectinload(Notification.rental))
        count_stmt = select(func.count(Notification.id))

        conditions = []
        if user_id:
            conditions.append(Notification.user_id == user_id)
        if status:
            conditions.append(Notification.status == status)
        if notification_type:
            conditions.append(Notification.type == notification_type)

        if conditions:
            stmt = stmt.where(*conditions)
            count_stmt = count_stmt.where(*conditions)

        total_result = await self.session.execute(count_stmt)
        total = total_result.scalar()

        stmt = stmt.order_by(Notification.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
        result = await self.session.execute(stmt)
        items = result.scalars().all()

        return PaginatedResponse(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=(total + page_size - 1) // page_size,
        )

    async def create(self, notification_data: NotificationCreate) -> Notification:
        user_stmt = select(User).where(User.id == notification_data.user_id)
        user_result = await self.session.execute(user_stmt)
        user = user_result.scalar_one_or_none()
        if not user:
            raise ValueError("User not found")

        if notification_data.related_rental_id:
            rental_stmt = select(Rental).where(Rental.id == notification_data.related_rental_id)
            rental_result = await self.session.execute(rental_stmt)
            rental = rental_result.scalar_one_or_none()
            if not rental:
                raise ValueError("Related rental not found")

        notification = Notification(**notification_data.model_dump())
        self.session.add(notification)
        await self.session.commit()
        await self.session.refresh(notification)
        return notification

    async def update(self, notification_id: int, notification_data: NotificationUpdate) -> Optional[Notification]:
        notification = await self.get_by_id(notification_id)
        if not notification:
            return None

        update_data = notification_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(notification, field, value)

        await self.session.commit()
        await self.session.refresh(notification)
        return notification

    async def mark_as_read(self, notification_id: int) -> Optional[Notification]:
        return await self.update(notification_id, NotificationUpdate(status=NotificationStatusEnum.SENT))

    async def mark_all_as_read(self, user_id: int) -> int:
        stmt = select(Notification).where(
            and_(
                Notification.user_id == user_id,
                Notification.status == NotificationStatusEnum.PENDING,
            )
        )
        result = await self.session.execute(stmt)
        notifications = result.scalars().all()

        for notification in notifications:
            notification.status = NotificationStatusEnum.SENT

        await self.session.commit()
        return len(notifications)

    async def delete(self, notification_id: int) -> bool:
        notification = await self.get_by_id(notification_id)
        if not notification:
            return False
        await self.session.delete(notification)
        await self.session.commit()
        return True

    async def get_unread_count(self, user_id: int) -> int:
        stmt = select(func.count(Notification.id)).where(
            and_(
                Notification.user_id == user_id,
                Notification.status == NotificationStatusEnum.PENDING,
            )
        )
        result = await self.session.execute(stmt)
        return result.scalar() or 0