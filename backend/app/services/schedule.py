from typing import Optional, List
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import Schedule, Computer
from app.schemas import ScheduleCreate, ScheduleUpdate, PaginatedResponse
from datetime import datetime


class ScheduleService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_id(self, schedule_id: int) -> Optional[Schedule]:
        stmt = select(Schedule).where(Schedule.id == schedule_id).options(selectinload(Schedule.computer))
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_all(
        self,
        page: int = 1,
        page_size: int = 20,
        computer_id: Optional[int] = None,
        is_active: Optional[bool] = None,
        start_from: Optional[datetime] = None,
        end_before: Optional[datetime] = None,
    ) -> PaginatedResponse:
        stmt = select(Schedule).options(selectinload(Schedule.computer))
        count_stmt = select(func.count(Schedule.id))

        conditions = []
        if computer_id:
            conditions.append(Schedule.computer_id == computer_id)
        if is_active is not None:
            conditions.append(Schedule.is_active == is_active)
        if start_from:
            conditions.append(Schedule.start_time >= start_from)
        if end_before:
            conditions.append(Schedule.end_time <= end_before)

        if conditions:
            stmt = stmt.where(*conditions)
            count_stmt = count_stmt.where(*conditions)

        total_result = await self.session.execute(count_stmt)
        total = total_result.scalar()

        stmt = stmt.order_by(Schedule.start_time.asc()).offset((page - 1) * page_size).limit(page_size)
        result = await self.session.execute(stmt)
        items = result.scalars().all()

        return PaginatedResponse(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=(total + page_size - 1) // page_size,
        )

    async def get_computer_schedule(self, computer_id: int, start: datetime, end: datetime) -> List[Schedule]:
        stmt = select(Schedule).where(
            and_(
                Schedule.computer_id == computer_id,
                Schedule.start_time < end,
                Schedule.end_time > start,
                Schedule.is_active == True,
            )
        ).order_by(Schedule.start_time.asc())
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def check_conflict(self, computer_id: int, start_time: datetime, end_time: datetime, exclude_id: Optional[int] = None) -> bool:
        conditions = [
            Schedule.computer_id == computer_id,
            Schedule.start_time < end_time,
            Schedule.end_time > start_time,
            Schedule.is_active == True,
        ]
        if exclude_id:
            conditions.append(Schedule.id != exclude_id)

        stmt = select(Schedule).where(and_(*conditions))
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none() is not None

    async def create(self, schedule_data: ScheduleCreate) -> Schedule:
        computer_stmt = select(Computer).where(Computer.id == schedule_data.computer_id)
        computer_result = await self.session.execute(computer_stmt)
        computer = computer_result.scalar_one_or_none()
        if not computer:
            raise ValueError("Computer not found")

        if await self.check_conflict(schedule_data.computer_id, schedule_data.start_time, schedule_data.end_time):
            raise ValueError("Schedule conflicts with existing schedule")

        schedule = Schedule(**schedule_data.model_dump())
        self.session.add(schedule)
        await self.session.commit()
        await self.session.refresh(schedule)
        return schedule

    async def update(self, schedule_id: int, schedule_data: ScheduleUpdate) -> Optional[Schedule]:
        schedule = await self.get_by_id(schedule_id)
        if not schedule:
            return None

        update_data = schedule_data.model_dump(exclude_unset=True)

        computer_id = update_data.get("computer_id", schedule.computer_id)
        start_time = update_data.get("start_time", schedule.start_time)
        end_time = update_data.get("end_time", schedule.end_time)

        if await self.check_conflict(computer_id, start_time, end_time, exclude_id=schedule_id):
            raise ValueError("Schedule conflicts with existing schedule")

        if "computer_id" in update_data:
            computer_stmt = select(Computer).where(Computer.id == update_data["computer_id"])
            computer_result = await self.session.execute(computer_stmt)
            computer = computer_result.scalar_one_or_none()
            if not computer:
                raise ValueError("Computer not found")

        for field, value in update_data.items():
            setattr(schedule, field, value)

        await self.session.commit()
        await self.session.refresh(schedule)
        return schedule

    async def delete(self, schedule_id: int) -> bool:
        schedule = await self.get_by_id(schedule_id)
        if not schedule:
            return False
        await self.session.delete(schedule)
        await self.session.commit()
        return True