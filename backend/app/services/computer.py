from typing import Optional, List
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import Computer, Component
from app.schemas import ComputerCreate, ComputerUpdate, ComponentCreate, ComponentUpdate, PaginatedResponse
from decimal import Decimal


class ComputerService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_id(self, computer_id: int, with_components: bool = False) -> Optional[Computer]:
        stmt = select(Computer).where(Computer.id == computer_id)
        if with_components:
            stmt = stmt.options(selectinload(Computer.components))
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_serial(self, serial_number: str) -> Optional[Computer]:
        stmt = select(Computer).where(Computer.serial_number == serial_number)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_all(
        self,
        page: int = 1,
        page_size: int = 20,
        search: Optional[str] = None,
        is_available: Optional[bool] = None,
        is_active: Optional[bool] = None,
        brand: Optional[str] = None,
    ) -> PaginatedResponse:
        stmt = select(Computer)
        count_stmt = select(func.count(Computer.id))

        conditions = []
        if search:
            conditions.append(or_(
                Computer.name.ilike(f"%{search}%"),
                Computer.serial_number.ilike(f"%{search}%"),
                Computer.brand.ilike(f"%{search}%"),
                Computer.model.ilike(f"%{search}%"),
            ))
        if is_available is not None:
            conditions.append(Computer.is_available == is_available)
        if is_active is not None:
            conditions.append(Computer.is_active == is_active)
        if brand:
            conditions.append(Computer.brand == brand)

        if conditions:
            stmt = stmt.where(*conditions)
            count_stmt = count_stmt.where(*conditions)

        total_result = await self.session.execute(count_stmt)
        total = total_result.scalar()

        stmt = stmt.order_by(Computer.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
        result = await self.session.execute(stmt)
        items = result.scalars().all()

        return PaginatedResponse(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=(total + page_size - 1) // page_size,
        )

    async def create(self, computer_data: ComputerCreate) -> Computer:
        existing = await self.get_by_serial(computer_data.serial_number)
        if existing:
            raise ValueError("Computer with this serial number already exists")

        computer = Computer(**computer_data.model_dump())
        self.session.add(computer)
        await self.session.commit()
        await self.session.refresh(computer)
        return computer

    async def update(self, computer_id: int, computer_data: ComputerUpdate) -> Optional[Computer]:
        computer = await self.get_by_id(computer_id)
        if not computer:
            return None

        update_data = computer_data.model_dump(exclude_unset=True)
        if "serial_number" in update_data:
            existing = await self.get_by_serial(update_data["serial_number"])
            if existing and existing.id != computer_id:
                raise ValueError("Computer with this serial number already exists")

        for field, value in update_data.items():
            setattr(computer, field, value)

        await self.session.commit()
        await self.session.refresh(computer)
        return computer

    async def delete(self, computer_id: int) -> bool:
        computer = await self.get_by_id(computer_id)
        if not computer:
            return False
        await self.session.delete(computer)
        await self.session.commit()
        return True

    async def set_availability(self, computer_id: int, is_available: bool) -> Optional[Computer]:
        computer = await self.get_by_id(computer_id)
        if not computer:
            return None
        computer.is_available = is_available
        await self.session.commit()
        await self.session.refresh(computer)
        return computer


class ComponentService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_id(self, component_id: int) -> Optional[Component]:
        stmt = select(Component).where(Component.id == component_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_computer(self, computer_id: int) -> List[Component]:
        stmt = select(Component).where(Component.computer_id == computer_id)
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def create(self, component_data: ComponentCreate) -> Component:
        computer_stmt = select(Computer).where(Computer.id == component_data.computer_id)
        computer_result = await self.session.execute(computer_stmt)
        computer = computer_result.scalar_one_or_none()
        if not computer:
            raise ValueError("Computer not found")

        component = Component(**component_data.model_dump())
        self.session.add(component)
        await self.session.commit()
        await self.session.refresh(component)
        return component

    async def update(self, component_id: int, component_data: ComponentUpdate) -> Optional[Component]:
        component = await self.get_by_id(component_id)
        if not component:
            return None

        update_data = component_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(component, field, value)

        await self.session.commit()
        await self.session.refresh(component)
        return component

    async def delete(self, component_id: int) -> bool:
        component = await self.get_by_id(component_id)
        if not component:
            return False
        await self.session.delete(component)
        await self.session.commit()
        return True