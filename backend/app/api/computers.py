from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, List

from app.db.session import get_db
from app.schemas import (
    ComputerResponse, ComputerCreate, ComputerUpdate,
    ComponentResponse, ComponentCreate, ComponentUpdate,
    PaginatedResponse, MessageResponse
)
from app.services.computer import ComputerService, ComponentService
from app.models import User, RoleEnum
from app.api.auth import get_current_user, get_current_staff_user, get_current_admin_user

router = APIRouter(prefix="/computers", tags=["Computers"])


@router.get("", response_model=PaginatedResponse)
async def list_computers(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    is_available: Optional[bool] = Query(None),
    is_active: Optional[bool] = Query(None),
    brand: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    computer_service = ComputerService(session)
    return await computer_service.get_all(page, page_size, search, is_available, is_active, brand)


@router.get("/{computer_id}", response_model=ComputerResponse)
async def get_computer(
    computer_id: int,
    with_components: bool = Query(False),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    computer_service = ComputerService(session)
    computer = await computer_service.get_by_id(computer_id, with_components)
    if not computer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Computer not found")
    return computer


@router.post("", response_model=ComputerResponse, status_code=status.HTTP_201_CREATED)
async def create_computer(
    computer_data: ComputerCreate,
    current_user: User = Depends(get_current_staff_user),
    session: AsyncSession = Depends(get_db),
):
    computer_service = ComputerService(session)
    try:
        computer = await computer_service.create(computer_data)
        return computer
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.patch("/{computer_id}", response_model=ComputerResponse)
async def update_computer(
    computer_id: int,
    computer_data: ComputerUpdate,
    current_user: User = Depends(get_current_staff_user),
    session: AsyncSession = Depends(get_db),
):
    computer_service = ComputerService(session)
    try:
        computer = await computer_service.update(computer_id, computer_data)
        if not computer:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Computer not found")
        return computer
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.delete("/{computer_id}", response_model=MessageResponse)
async def delete_computer(
    computer_id: int,
    current_user: User = Depends(get_current_admin_user),
    session: AsyncSession = Depends(get_db),
):
    computer_service = ComputerService(session)
    success = await computer_service.delete(computer_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Computer not found")
    return MessageResponse(message="Computer deleted successfully")


@router.post("/{computer_id}/availability", response_model=ComputerResponse)
async def set_availability(
    computer_id: int,
    is_available: bool = Query(...),
    current_user: User = Depends(get_current_staff_user),
    session: AsyncSession = Depends(get_db),
):
    computer_service = ComputerService(session)
    computer = await computer_service.set_availability(computer_id, is_available)
    if not computer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Computer not found")
    return computer


# Component endpoints
@router.get("/{computer_id}/components", response_model=List[ComponentResponse])
async def list_components(
    computer_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    computer_service = ComputerService(session)
    computer = await computer_service.get_by_id(computer_id)
    if not computer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Computer not found")

    component_service = ComponentService(session)
    return await component_service.get_by_computer(computer_id)


@router.post("/{computer_id}/components", response_model=ComponentResponse, status_code=status.HTTP_201_CREATED)
async def create_component(
    computer_id: int,
    component_data: ComponentCreate,
    current_user: User = Depends(get_current_staff_user),
    session: AsyncSession = Depends(get_db),
):
    if component_data.computer_id != computer_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Computer ID mismatch",
        )

    component_service = ComponentService(session)
    try:
        component = await component_service.create(component_data)
        return component
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.patch("/components/{component_id}", response_model=ComponentResponse)
async def update_component(
    component_id: int,
    component_data: ComponentUpdate,
    current_user: User = Depends(get_current_staff_user),
    session: AsyncSession = Depends(get_db),
):
    component_service = ComponentService(session)
    component = await component_service.update(component_id, component_data)
    if not component:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Component not found")
    return component


@router.delete("/components/{component_id}", response_model=MessageResponse)
async def delete_component(
    component_id: int,
    current_user: User = Depends(get_current_staff_user),
    session: AsyncSession = Depends(get_db),
):
    component_service = ComponentService(session)
    success = await component_service.delete(component_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Component not found")
    return MessageResponse(message="Component deleted successfully")