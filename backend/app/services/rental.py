from typing import Optional, List
from datetime import datetime
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import Rental, RentalItem, Computer, RentalStatusEnum
from app.schemas import RentalCreate, RentalUpdate, RentalItemCreate, PaginatedResponse
from app.services.notification import notification_service
from decimal import Decimal


class RentalService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_id(self, rental_id: int, with_items: bool = True) -> Optional[Rental]:
        stmt = select(Rental).where(Rental.id == rental_id)
        if with_items:
            stmt = stmt.options(selectinload(Rental.items).selectinload(RentalItem.computer))
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_all(
        self,
        page: int = 1,
        page_size: int = 20,
        user_id: Optional[int] = None,
        status: Optional[RentalStatusEnum] = None,
        search: Optional[str] = None,
    ) -> PaginatedResponse:
        stmt = select(Rental).options(selectinload(Rental.items).selectinload(RentalItem.computer))
        count_stmt = select(func.count(Rental.id))

        conditions = []
        if user_id:
            conditions.append(Rental.user_id == user_id)
        if status:
            conditions.append(Rental.status == status)
        if search:
            conditions.append(Rental.id == int(search) if search.isdigit() else False)

        if conditions:
            stmt = stmt.where(*conditions)
            count_stmt = count_stmt.where(*conditions)

        total_result = await self.session.execute(count_stmt)
        total = total_result.scalar()

        stmt = stmt.order_by(Rental.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
        result = await self.session.execute(stmt)
        items = result.scalars().all()

        return PaginatedResponse(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=(total + page_size - 1) // page_size,
        )

    async def create(self, rental_data: RentalCreate) -> Rental:
        # Verify user exists
        from app.models import User
        user_stmt = select(User).where(User.id == rental_data.user_id)
        user_result = await self.session.execute(user_stmt)
        user = user_result.scalar_one_or_none()
        if not user:
            raise ValueError("User not found")

        # Verify computers exist and are available
        total_price = Decimal("0")
        rental_items = []

        for item_data in rental_data.items:
            computer_stmt = select(Computer).where(Computer.id == item_data.computer_id)
            computer_result = await self.session.execute(computer_stmt)
            computer = computer_result.scalar_one_or_none()
            if not computer:
                raise ValueError(f"Computer with id {item_data.computer_id} not found")
            if not computer.is_available or not computer.is_active:
                raise ValueError(f"Computer {computer.name} is not available for rental")

            total_price += item_data.unit_price * item_data.quantity
            rental_items.append({
                "computer_id": item_data.computer_id,
                "quantity": item_data.quantity,
                "unit_price": item_data.unit_price,
                "total_price": item_data.unit_price * item_data.quantity,
            })

        rental = Rental(
            user_id=rental_data.user_id,
            start_date=rental_data.start_date,
            end_date=rental_data.end_date,
            total_price=total_price + rental_data.deposit,
            deposit=rental_data.deposit,
            notes=rental_data.notes,
            status=RentalStatusEnum.PENDING,
        )
        self.session.add(rental)
        await self.session.flush()

        for item_data in rental_items:
            item = RentalItem(rental_id=rental.id, **item_data)
            self.session.add(item)

        # Update computer availability
        for item_data in rental_items:
            computer_stmt = select(Computer).where(Computer.id == item_data["computer_id"])
            computer_result = await self.session.execute(computer_stmt)
            computer = computer_result.scalar_one_or_none()
            if computer:
                computer.is_available = False

        await self.session.commit()
        await self.session.refresh(rental)

        # Send notification
        await notification_service.send_rental_created(rental)

        return rental

    async def update(self, rental_id: int, rental_data: RentalUpdate) -> Optional[Rental]:
        rental = await self.get_by_id(rental_id)
        if not rental:
            return None

        update_data = rental_data.model_dump(exclude_unset=True)
        old_status = rental.status

        for field, value in update_data.items():
            setattr(rental, field, value)

        # Handle status changes
        if "status" in update_data and rental.status != old_status:
            if rental.status == RentalStatusEnum.ACTIVE:
                # Mark computers as unavailable
                for item in rental.items:
                    item.computer.is_available = False
            elif rental.status in [RentalStatusEnum.COMPLETED, RentalStatusEnum.CANCELLED]:
                # Mark computers as available
                for item in rental.items:
                    item.computer.is_available = True

        await self.session.commit()
        await self.session.refresh(rental)
        return rental

    async def return_rental(self, rental_id: int, actual_return_date: Optional[datetime] = None) -> Optional[Rental]:
        rental = await self.get_by_id(rental_id)
        if not rental:
            return None

        if rental.status not in [RentalStatusEnum.ACTIVE, RentalStatusEnum.OVERDUE]:
            raise ValueError("Rental is not active or overdue")

        rental.actual_return_date = actual_return_date or datetime.utcnow()
        rental.status = RentalStatusEnum.COMPLETED

        # Mark computers as available
        for item in rental.items:
            item.computer.is_available = True

        await self.session.commit()
        await self.session.refresh(rental)

        await notification_service.send_rental_completed(rental)
        return rental

    async def cancel_rental(self, rental_id: int) -> Optional[Rental]:
        rental = await self.get_by_id(rental_id)
        if not rental:
            return None

        if rental.status not in [RentalStatusEnum.PENDING, RentalStatusEnum.ACTIVE]:
            raise ValueError("Rental cannot be cancelled")

        rental.status = RentalStatusEnum.CANCELLED

        # Mark computers as available
        for item in rental.items:
            item.computer.is_available = True

        await self.session.commit()
        await self.session.refresh(rental)
        return rental

    async def delete(self, rental_id: int) -> bool:
        rental = await self.get_by_id(rental_id, with_items=False)
        if not rental:
            return False
        await self.session.delete(rental)
        await self.session.commit()
        return True

    async def get_user_active_rentals(self, user_id: int) -> List[Rental]:
        stmt = select(Rental).where(
            and_(
                Rental.user_id == user_id,
                Rental.status.in_([RentalStatusEnum.ACTIVE, RentalStatusEnum.OVERDUE]),
            )
        ).options(selectinload(Rental.items).selectinload(RentalItem.computer))
        result = await self.session.execute(stmt)
        return result.scalars().all()