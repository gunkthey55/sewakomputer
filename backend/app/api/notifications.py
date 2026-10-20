from fastapi import APIRouter, Depends, HTTPException, status, Query, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, List

from app.db.session import get_db
from app.schemas import (
    NotificationResponse, NotificationCreate, NotificationUpdate,
    PaginatedResponse, MessageResponse
)
from app.services.notification_crud import NotificationService
from app.services.notification import notification_service as global_notification_service
from app.models import User, NotificationTypeEnum, NotificationStatusEnum
from app.api.auth import get_current_user, get_current_staff_user, get_current_admin_user

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("", response_model=PaginatedResponse)
async def list_notifications(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[NotificationStatusEnum] = Query(None),
    notification_type: Optional[NotificationTypeEnum] = Query(None),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    notification_service = NotificationService(session)

    # Non-admin users can only see their own notifications
    user_id = current_user.id if current_user.role.value == "customer" else None

    return await notification_service.get_all(page, page_size, user_id, status, notification_type)


@router.get("/unread-count", response_model=dict)
async def get_unread_count(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    notification_service = NotificationService(session)
    count = await notification_service.get_unread_count(current_user.id)
    return {"unread_count": count}


@router.get("/{notification_id}", response_model=NotificationResponse)
async def get_notification(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    notification_service = NotificationService(session)
    notification = await notification_service.get_by_id(notification_id)
    if not notification:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")

    if current_user.role.value == "customer" and notification.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    return notification


@router.post("", response_model=NotificationResponse, status_code=status.HTTP_201_CREATED)
async def create_notification(
    notification_data: NotificationCreate,
    current_user: User = Depends(get_current_staff_user),
    session: AsyncSession = Depends(get_db),
):
    notification_service = NotificationService(session)
    try:
        notification = await notification_service.create(notification_data)
        return notification
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.patch("/{notification_id}", response_model=NotificationResponse)
async def update_notification(
    notification_id: int,
    notification_data: NotificationUpdate,
    current_user: User = Depends(get_current_staff_user),
    session: AsyncSession = Depends(get_db),
):
    notification_service = NotificationService(session)
    notification = await notification_service.update(notification_id, notification_data)
    if not notification:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
    return notification


@router.post("/{notification_id}/read", response_model=NotificationResponse)
async def mark_as_read(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    notification_service = NotificationService(session)
    notification = await notification_service.get_by_id(notification_id)
    if not notification:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")

    if current_user.role.value == "customer" and notification.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    return await notification_service.mark_as_read(notification_id)


@router.post("/read-all", response_model=MessageResponse)
async def mark_all_as_read(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    notification_service = NotificationService(session)
    count = await notification_service.mark_all_as_read(current_user.id)
    return MessageResponse(message=f"Marked {count} notifications as read")


@router.delete("/{notification_id}", response_model=MessageResponse)
async def delete_notification(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    notification_service = NotificationService(session)
    notification = await notification_service.get_by_id(notification_id)
    if not notification:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")

    if current_user.role.value == "customer" and notification.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    success = await notification_service.delete(notification_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
    return MessageResponse(message="Notification deleted successfully")


# WebSocket endpoint for real-time notifications
@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    session: AsyncSession = Depends(get_db),
):
    # Authenticate via query parameter token
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=4001, reason="Authentication required")
        return

    from app.services.auth import verify_token
    user_id = verify_token(token, "access")
    if not user_id:
        await websocket.close(code=4001, reason="Invalid token")
        return

    user_service = UserService(session)
    user = await user_service.get_by_id(user_id)
    if not user or not user.is_active:
        await websocket.close(code=4001, reason="User not found or inactive")
        return

    await websocket.accept()
    await global_notification_service.register_websocket(user_id, websocket)

    try:
        while True:
            # Keep connection alive, wait for messages (ping/pong)
            data = await websocket.receive_text()
            # Echo back for keepalive
            await websocket.send_text(data)
    except WebSocketDisconnect:
        pass
    finally:
        await global_notification_service.unregister_websocket(user_id, websocket)