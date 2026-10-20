from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, List

from app.db.session import get_db
from app.schemas import (
    RentalResponse, RentalCreate, RentalUpdate, RentalItemResponse,
    PaginatedResponse, MessageResponse
)
from app.services.rental import RentalService
from app.models import User, RentalStatusEnum
from app.api.auth import get_current_user, get_current_staff_user, get_current_admin_user

router = APIRouter(prefix="/rentals", tags=["Rentals"])


@router.get("", response_model=PaginatedResponse)
async def list_rentals(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    user_id: Optional[int] = Query(None),
    status: Optional[RentalStatusEnum] = Query(None),
    search: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    rental_service = RentalService(session)

    # Non-admin users can only see their own rentals
    if current_user.role.value == "customer":
        user_id = current_user.id

    return await rental_service.get_all(page, page_size, user_id, status, search)


@router.get("/my/active", response_model=List[RentalResponse])
async def get_my_active_rentals(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    rental_service = RentalService(session)
    return await rental_service.get_user_active_rentals(current_user.id)


@router.get("/{rental_id}", response_model=RentalResponse)
async def get_rental(
    rental_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    rental_service = RentalService(session)
    rental = await rental_service.get_by_id(rental_id)
    if not rental:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rental not found")

    # Check permission
    if current_user.role.value == "customer" and rental.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    return rental


@router.post("", response_model=RentalResponse, status_code=status.HTTP_201_CREATED)
async def create_rental(
    rental_data: RentalCreate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    # Customers can only create rentals for themselves
    if current_user.role.value == "customer":
        rental_data.user_id = current_user.id

    rental_service = RentalService(session)
    try:
        rental = await rental_service.create(rental_data)
        return rental
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.patch("/{rental_id}", response_model=RentalResponse)
async def update_rental(
    rental_id: int,
    rental_data: RentalUpdate,
    current_user: User = Depends(get_current_staff_user),
    session: AsyncSession = Depends(get_db),
):
    rental_service = RentalService(session)
    try:
        rental = await rental_service.update(rental_id, rental_data)
        if not rental:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rental not found")
        return rental
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/{rental_id}/return", response_model=RentalResponse)
async def return_rental(
    rental_id: int,
    current_user: User = Depends(get_current_staff_user),
    session: AsyncSession = Depends(get_db),
):
    rental_service = RentalService(session)
    try:
        rental = await rental_service.return_rental(rental_id)
        if not rental:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rental not found")
        return rental
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/{rental_id}/cancel", response_model=RentalResponse)
async def cancel_rental(
    rental_id: int,
    current_user: User = Depends(get_current_staff_user),
    session: AsyncSession = Depends(get_db),
):
    rental_service = RentalService(session)
    rental = await rental_service.cancel_rental(rental_id)
    if not rental:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rental not found")
    return rental


@router.delete("/{rental_id}", response_model=MessageResponse)
async def delete_rental(
    rental_id: int,
    current_user: User = Depends(get_current_admin_user),
    session: AsyncSession = Depends(get_db),
):
    rental_service = RentalService(session)
    success = await rental_service.delete(rental_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rental not found")
    return MessageResponse(message="Rental deleted successfully")