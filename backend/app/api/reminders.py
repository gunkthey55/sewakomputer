from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, List
from datetime import datetime

from app.db.session import get_db
from app.services.reminder import ReminderService
from app.services.rental import RentalService
from app.models import Reminder, ReminderChannelEnum, User
from app.schemas import ReminderResponse, PaginatedResponse, MessageResponse
from app.api.auth import get_current_user, get_current_staff_user

router = APIRouter(prefix="/reminders", tags=["Reminders"])


@router.get("", response_model=PaginatedResponse)
async def list_reminders(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    rental_id: Optional[int] = Query(None),
    channel: Optional[ReminderChannelEnum] = Query(None),
    is_sent: Optional[bool] = Query(None),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    """List reminders with filters."""
    reminder_service = ReminderService()
    # For now, return pending reminders - can be extended with full filtering
    reminders = await reminder_service.get_pending_reminders(limit=page_size)
    return PaginatedResponse(
        items=reminders,
        total=len(reminders),
        page=page,
        page_size=page_size,
        total_pages=1,
    )


@router.get("/pending", response_model=List[ReminderResponse])
async def get_pending_reminders(
    limit: int = Query(100, ge=1, le=500),
    current_user: User = Depends(get_current_staff_user),
):
    """Get all pending reminders (staff only)."""
    reminder_service = ReminderService()
    return await reminder_service.get_pending_reminders(limit=limit)


@router.post("/process", response_model=MessageResponse)
async def process_reminders(
    current_user: User = Depends(get_current_staff_user),
):
    """Manually trigger reminder processing (staff only)."""
    reminder_service = ReminderService()
    sent = await reminder_service.send_pending_reminders()
    return MessageResponse(message=f"Processed reminders: {sent} sent")


@router.post("/rental/{rental_id}/create", response_model=List[ReminderResponse])
async def create_rental_reminders(
    rental_id: int,
    current_user: User = Depends(get_current_staff_user),
    session: AsyncSession = Depends(get_db),
):
    """Create reminder records for a rental (staff only)."""
    rental_service = RentalService(session)
    rental = await rental_service.get_by_id(rental_id)
    if not rental:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rental not found")

    reminder_service = ReminderService()
    reminders = await reminder_service.create_reminders_for_rental(rental)
    return reminders


@router.patch("/{reminder_id}/sent", response_model=MessageResponse)
async def mark_reminder_sent(
    reminder_id: int,
    current_user: User = Depends(get_current_staff_user),
):
    """Mark a reminder as sent (staff only)."""
    reminder_service = ReminderService()
    success = await reminder_service.mark_reminder_sent(reminder_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reminder not found")
    return MessageResponse(message="Reminder marked as sent")