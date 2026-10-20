from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, List
from datetime import datetime

from app.db.session import get_db
from app.schemas import ScheduleResponse, ScheduleCreate, ScheduleUpdate, PaginatedResponse, MessageResponse
from app.services.schedule import ScheduleService
from app.models import User, RoleEnum
from app.api.auth import get_current_user, get_current_staff_user, get_current_admin_user

router = APIRouter(prefix="/schedules", tags=["Schedules"])


@router.get("", response_model=PaginatedResponse)
async def list_schedules(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    computer_id: Optional[int] = Query(None),
    is_active: Optional[bool] = Query(None),
    start_from: Optional[datetime] = Query(None),
    end_before: Optional[datetime] = Query(None),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    schedule_service = ScheduleService(session)
    return await schedule_service.get_all(page, page_size, computer_id, is_active, start_from, end_before)


@router.get("/computer/{computer_id}", response_model=List[ScheduleResponse])
async def get_computer_schedule(
    computer_id: int,
    start: datetime = Query(...),
    end: datetime = Query(...),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    schedule_service = ScheduleService(session)
    return await schedule_service.get_computer_schedule(computer_id, start, end)


@router.get("/{schedule_id}", response_model=ScheduleResponse)
async def get_schedule(
    schedule_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    schedule_service = ScheduleService(session)
    schedule = await schedule_service.get_by_id(schedule_id)
    if not schedule:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Schedule not found")
    return schedule


@router.post("", response_model=ScheduleResponse, status_code=status.HTTP_201_CREATED)
async def create_schedule(
    schedule_data: ScheduleCreate,
    current_user: User = Depends(get_current_staff_user),
    session: AsyncSession = Depends(get_db),
):
    schedule_service = ScheduleService(session)
    try:
        schedule = await schedule_service.create(schedule_data)
        return schedule
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.patch("/{schedule_id}", response_model=ScheduleResponse)
async def update_schedule(
    schedule_id: int,
    schedule_data: ScheduleUpdate,
    current_user: User = Depends(get_current_staff_user),
    session: AsyncSession = Depends(get_db),
):
    schedule_service = ScheduleService(session)
    try:
        schedule = await schedule_service.update(schedule_id, schedule_data)
        if not schedule:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Schedule not found")
        return schedule
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.delete("/{schedule_id}", response_model=MessageResponse)
async def delete_schedule(
    schedule_id: int,
    current_user: User = Depends(get_current_admin_user),
    session: AsyncSession = Depends(get_db),
):
    schedule_service = ScheduleService(session)
    success = await schedule_service.delete(schedule_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Schedule not found")
    return MessageResponse(message="Schedule deleted successfully")