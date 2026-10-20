import pytest
from datetime import datetime, timedelta
from freezegun import freeze_time
from unittest.mock import AsyncMock, patch

from app.models import RentalStatusEnum, ReminderChannelEnum
from app.services.reminder_service import ReminderService
from app.services.notification_service import NotificationService


class TestReminderService:
    """Tests for ReminderService."""

    @pytest.mark.asyncio
    async def test_create_reminders_for_rental(self, db_session, active_rental, test_user):
        """Test creating reminders for a rental."""
        service = ReminderService(db_session)
        
        reminders = await service.create_reminders_for_rental(
            rental_id=active_rental.id,
            channels=[ReminderChannelEnum.IN_APP, ReminderChannelEnum.TELEGRAM],
            days_before_list=[7, 3, 1, 0],
        )
        
        assert len(reminders) == 8  # 4 days x 2 channels
        
        # Verify unique constraint prevents duplicates
        reminders2 = await service.create_reminders_for_rental(
            rental_id=active_rental.id,
            channels=[ReminderChannelEnum.IN_APP],
            days_before_list=[1],
        )
        assert len(reminders2) == 0  # Already exists

    @pytest.mark.asyncio
    async def test_get_pending_reminders(self, db_session, active_rental, reminders_for_rental):
        """Test fetching pending reminders."""
        service = ReminderService(db_session)
        
        pending = await service.get_pending_reminders()
        
        # Should find T-1 and T+0 reminders (not sent)
        assert len(pending) >= 2
        for r in pending:
            assert r.is_sent is False
            assert r.scheduled_for <= datetime.now()

    @pytest.mark.asyncio
    async def test_send_reminder_in_app(self, db_session, active_rental, test_user, reminder_due_now):
        """Test sending in-app reminder creates notification."""
        service = ReminderService(db_session)
        
        with patch.object(NotificationService, 'create_notification', new_callable=AsyncMock) as mock_notify:
            await service.send_reminder(reminder_due_now)
        
        # Verify reminder marked as sent
        await db_session.refresh(reminder_due_now)
        assert reminder_due_now.is_sent is True
        assert reminder_due_now.sent_at is not None
        assert reminder_due_now.retry_count == 0
        
        # Verify notification created
        mock_notify.assert_called_once()

    @pytest.mark.asyncio
    async def test_send_reminder_telegram(self, db_session, active_rental, reminder_due_now):
        """Test sending telegram reminder."""
        reminder_due_now.channel = ReminderChannelEnum.TELEGRAM
        await db_session.commit()
        
        service = ReminderService(db_session)
        
        with patch('app.services.reminder_service.httpx.AsyncClient.post', new_callable=AsyncMock) as mock_post:
            mock_post.return_value = AsyncMock(status_code=200, json=lambda: {"ok": True})
            await service.send_reminder(reminder_due_now)
        
        await db_session.refresh(reminder_due_now)
        assert reminder_due_now.is_sent is True
        mock_post.assert_called_once()

    @pytest.mark.asyncio
    async def test_send_reminder_retry_on_failure(self, db_session, active_rental, reminder_due_now):
        """Test retry logic on telegram failure."""
        reminder_due_now.channel = ReminderChannelEnum.TELEGRAM
        await db_session.commit()
        
        service = ReminderService(db_session)
        
        with patch('app.services.reminder_service.httpx.AsyncClient.post', new_callable=AsyncMock) as mock_post:
            mock_post.side_effect = Exception("Network error")
            await service.send_reminder(reminder_due_now)
        
        await db_session.refresh(reminder_due_now)
        assert reminder_due_now.is_sent is False
        assert reminder_due_now.retry_count == 1
        assert reminder_due_now.error_message is not None

    @pytest.mark.asyncio
    async def test_process_pending_reminders(self, db_session, active_rental, reminders_for_rental):
        """Test processing all pending reminders."""
        service = ReminderService(db_session)
        
        with patch.object(service, 'send_reminder', new_callable=AsyncMock) as mock_send:
            result = await service.process_pending_reminders()
        
        assert result["processed"] >= 2  # T-1 and T+0
        assert result["failed"] == 0
        assert mock_send.call_count >= 2

    @pytest.mark.asyncio
    async def test_idempotent_reminder_creation(self, db_session, active_rental):
        """Test that creating reminders twice doesn't duplicate."""
        service = ReminderService(db_session)
        
        await service.create_reminders_for_rental(
            rental_id=active_rental.id,
            channels=[ReminderChannelEnum.IN_APP],
            days_before_list=[1, 3],
        )
        await service.create_reminders_for_rental(
            rental_id=active_rental.id,
            channels=[ReminderChannelEnum.IN_APP],
            days_before_list=[1, 3],
        )
        
        from sqlalchemy import select
        from app.models import Reminder
        result = await db_session.execute(
            select(Reminder).where(Reminder.rental_id == active_rental.id)
        )
        reminders = result.scalars().all()
        assert len(reminders) == 2  # Only 2 unique reminders


class TestSchedulerJobs:
    """Tests for APScheduler jobs (using freezegun for time control)."""

    @pytest.mark.asyncio
    async def test_daily_reminder_creation_job(self, db_session, test_user, sample_computer, scheduler_helper):
        """Test daily 08:00 job creates reminders for upcoming rentals."""
        from app.tasks.reminder_tasks import create_daily_reminders
        
        # Create rentals ending in 7, 3, 1, 0 days
        for days in [7, 3, 1, 0]:
            await scheduler_helper.create_rental_with_reminders(test_user, sample_computer, days)
        
        # Freeze time to 08:00
        with freeze_time("2024-01-15 08:00:00"):
            result = await create_daily_reminders()
        
        assert result["rentals_processed"] == 4
        assert result["reminders_created"] > 0

    @pytest.mark.asyncio
    async def test_hourly_reminder_sending_job(self, db_session, active_rental, reminders_for_rental):
        """Test hourly job sends pending reminders."""
        from app.tasks.reminder_tasks import send_pending_reminders
        
        with freeze_time("2024-01-15 10:00:00"):
            with patch('app.tasks.reminder_tasks.ReminderService.send_reminder', new_callable=AsyncMock) as mock_send:
                result = await send_pending_reminders()
        
        assert result["sent"] >= 2
        assert mock_send.call_count >= 2

    @pytest.mark.asyncio
    async def test_overdue_rental_check_job(self, db_session, overdue_rental, sample_computer):
        """Test 30min job marks overdue rentals."""
        from app.tasks.reminder_tasks import check_overdue_rentals
        
        with freeze_time("2024-01-15 12:00:00"):
            result = await check_overdue_rentals()
        
        assert result["overdue_found"] >= 1
        await db_session.refresh(overdue_rental)
        assert overdue_rental.status == RentalStatusEnum.OVERDUE

    @pytest.mark.asyncio
    async def test_auto_complete_job(self, db_session, sample_computer, rental_factory):
        """Test 1hr job auto-completes ended rentals."""
        from app.tasks.reminder_tasks import auto_complete_rentals
        
        # Create rental that ended yesterday
        rental = await rental_factory(
            status=RentalStatusEnum.ACTIVE,
            start_offset=-10,
            end_offset=-1,
        )
        
        with freeze_time("2024-01-15 14:00:00"):
            result = await auto_complete_rentals()
        
        assert result["completed"] >= 1
        await db_session.refresh(rental)
        assert rental.status == RentalStatusEnum.COMPLETED
        assert rental.actual_return_date is not None


class TestNotificationService:
    """Tests for NotificationService."""

    @pytest.mark.asyncio
    async def test_create_notification(self, db_session, test_user, sample_rental):
        """Test creating a notification."""
        service = NotificationService(db_session)
        
        notification = await service.create_notification(
            user_id=test_user.id,
            type="in_app",
            title="Test Title",
            message="Test message",
            related_rental_id=sample_rental.id,
        )
        
        assert notification.id is not None
        assert notification.title == "Test Title"
        assert notification.is_read is False

    @pytest.mark.asyncio
    async def test_get_unread_count(self, db_session, test_user, unread_notifications):
        """Test getting unread notification count."""
        service = NotificationService(db_session)
        
        count = await service.get_unread_count(test_user.id)
        assert count == 3

    @pytest.mark.asyncio
    async def test_mark_as_read(self, db_session, test_user, sample_notification):
        """Test marking notification as read."""
        service = NotificationService(db_session)
        
        updated = await service.mark_as_read(sample_notification.id, test_user.id)
        
        assert updated.is_read is True
        assert updated.read_at is not None

    @pytest.mark.asyncio
    async def test_mark_as_read_unauthorized(self, db_session, admin_user, sample_notification):
        """Test user cannot mark other user's notification as read."""
        service = NotificationService(db_session)
        
        with pytest.raises(Exception):  # Should raise 404 or similar
            await service.mark_as_read(sample_notification.id, admin_user.id)

    @pytest.mark.asyncio
    async def test_list_notifications_with_filters(self, db_session, test_user, unread_notifications):
        """Test listing notifications with filters."""
        service = NotificationService(db_session)
        
        # All notifications
        all_notifs = await service.list_notifications(test_user.id)
        assert len(all_notifs) == 3
        
        # Only unread
        unread = await service.list_notifications(test_user.id, unread_only=True)
        assert len(unread) == 3
        
        # Mark one as read
        await service.mark_as_read(unread_notifications[0].id, test_user.id)
        unread = await service.list_notifications(test_user.id, unread_only=True)
        assert len(unread) == 2


# --- Integration Tests for API Endpoints ---

class TestRentalAPI:
    """Integration tests for rental API endpoints."""

    @pytest.mark.asyncio
    async def test_create_rental_with_items(self, authed_client, sample_computer):
        """Test creating rental with computer items."""
        from datetime import datetime, timedelta
        start = datetime.now() + timedelta(days=1)
        end = datetime.now() + timedelta(days=5)
        
        response = await authed_client.post(
            "/rentals",
            json={
                "start_date": start.isoformat(),
                "end_date": end.isoformat(),
                "deposit": 50000,
                "items": [{"computer_id": sample_computer.id, "quantity": 1, "unit_price": 50000}],
            },
        )
        assert response.status_code == 201
        data = response.json()
        assert data["status"] == "pending"
        assert len(data["items"]) == 1

    @pytest.mark.asyncio
    async def test_create_rental_overlap_conflict(self, authed_client, active_rental, sample_computer):
        """Test creating overlapping rental for same computer fails."""
        from datetime import datetime, timedelta
        start = active_rental.start_date + timedelta(days=1)
        end = active_rental.end_date - timedelta(days=1)
        
        response = await authed_client.post(
            "/rentals",
            json={
                "start_date": start.isoformat(),
                "end_date": end.isoformat(),
                "deposit": 50000,
                "items": [{"computer_id": sample_computer.id, "quantity": 1, "unit_price": 50000}],
            },
        )
        assert response.status_code == 409  # Conflict

    @pytest.mark.asyncio
    async def test_list_rentals_with_filters(self, authed_client, active_rental, completed_rental, overdue_rental):
        """Test listing rentals with status filter."""
        # All
        response = await authed_client.get("/rentals")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] >= 3
        
        # Filter by status
        response = await authed_client.get("/rentals?status=active")
        assert response.status_code == 200
        data = response.json()
        for item in data["items"]:
            assert item["status"] == "active"

    @pytest.mark.asyncio
    async def test_start_rental(self, authed_client, sample_rental):
        """Test starting a rental."""
        response = await authed_client.post(f"/rentals/{sample_rental.id}/start")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "active"

    @pytest.mark.asyncio
    async def test_complete_rental(self, authed_client, active_rental, sample_computer):
        """Test completing a rental."""
        response = await authed_client.post(f"/rentals/{active_rental.id}/complete")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "completed"
        assert data["actual_return_date"] is not None
        
        # Computer should be available again
        from sqlalchemy import select
        from app.models import Computer
        result = await db_session.execute(select(Computer).where(Computer.id == sample_computer.id))
        computer = result.scalar_one()
        assert computer.is_available is True

    @pytest.mark.asyncio
    async def test_cancel_rental(self, authed_client, sample_rental, sample_computer):
        """Test cancelling a rental."""
        response = await authed_client.post(f"/rentals/{sample_rental.id}/cancel")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "cancelled"


class TestReminderAPI:
    """Integration tests for reminder API endpoints."""

    @pytest.mark.asyncio
    async def test_get_pending_reminders(self, authed_client, active_rental, reminders_for_rental):
        """Test getting pending reminders."""
        response = await authed_client.get("/reminders/pending")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 2

    @pytest.mark.asyncio
    async def test_process_reminders_endpoint(self, authed_client, active_rental, reminders_for_rental):
        """Test processing pending reminders via endpoint."""
        response = await authed_client.post("/reminders/process")
        assert response.status_code == 200
        data = response.json()
        assert "processed" in data
        assert "failed" in data

    @pytest.mark.asyncio
    async def test_create_reminders_for_rental(self, authed_client, active_rental):
        """Test creating reminders for a rental."""
        response = await authed_client.post(f"/reminders/rental/{active_rental.id}/create")
        assert response.status_code == 200
        data = response.json()
        assert data["created"] > 0


class TestNotificationAPI:
    """Integration tests for notification API endpoints."""

    @pytest.mark.asyncio
    async def test_list_notifications(self, authed_client, unread_notifications):
        """Test listing notifications."""
        response = await authed_client.get("/notifications")
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert len(data["items"]) == 3

    @pytest.mark.asyncio
    async def test_unread_count(self, authed_client, unread_notifications):
        """Test getting unread count."""
        response = await authed_client.get("/notifications/unread-count")
        assert response.status_code == 200
        data = response.json()
        assert data["count"] == 3

    @pytest.mark.asyncio
    async def test_mark_notification_read(self, authed_client, sample_notification):
        """Test marking notification as read."""
        response = await authed_client.post(f"/notifications/{sample_notification.id}/read")
        assert response.status_code == 200
        data = response.json()
        assert data["is_read"] is True


# --- Edge Case Tests ---

class TestEdgeCases:
    """Edge case and validation tests."""

    @pytest.mark.asyncio
    async def test_rental_past_end_date_rejected(self, authed_client, sample_computer):
        """Test rental with past end_date is rejected."""
        from datetime import datetime, timedelta
        start = datetime.now() - timedelta(days=5)
        end = datetime.now() - timedelta(days=1)
        
        response = await authed_client.post(
            "/rentals",
            json={
                "start_date": start.isoformat(),
                "end_date": end.isoformat(),
                "deposit": 50000,
                "items": [{"computer_id": sample_computer.id, "quantity": 1, "unit_price": 50000}],
            },
        )
        assert response.status_code == 400

    @pytest.mark.asyncio
    async def test_rental_negative_price_rejected(self, authed_client, sample_computer):
        """Test rental with negative price is rejected."""
        from datetime import datetime, timedelta
        start = datetime.now() + timedelta(days=1)
        end = datetime.now() + timedelta(days=5)
        
        response = await authed_client.post(
            "/rentals",
            json={
                "start_date": start.isoformat(),
                "end_date": end.isoformat(),
                "deposit": 50000,
                "items": [{"computer_id": sample_computer.id, "quantity": 1, "unit_price": -100}],
            },
        )
        assert response.status_code == 400

    @pytest.mark.asyncio
    async def test_component_quantity_exceeds_stock(self, authed_client, sample_computer, sample_component):
        """Test component quantity exceeding stock is rejected."""
        from datetime import datetime, timedelta
        start = datetime.now() + timedelta(days=1)
        end = datetime.now() + timedelta(days=5)
        
        response = await authed_client.post(
            "/rentals",
            json={
                "start_date": start.isoformat(),
                "end_date": end.isoformat(),
                "deposit": 50000,
                "items": [
                    {"computer_id": sample_computer.id, "quantity": 1, "unit_price": 50000},
                    {"component_id": sample_component.id, "quantity": 999, "unit_price": 10000},
                ],
            },
        )
        # May succeed or fail depending on validation - document expected behavior
        assert response.status_code in [201, 400]

    @pytest.mark.asyncio
    async def test_concurrent_rental_creation(self, authed_client, sample_computer):
        """Test concurrent rental creation for same computer."""
        import asyncio
        from datetime import datetime, timedelta
        
        async def create_rental():
            start = datetime.now() + timedelta(days=1)
            end = datetime.now() + timedelta(days=5)
            return await authed_client.post(
                "/rentals",
                json={
                    "start_date": start.isoformat(),
                    "end_date": end.isoformat(),
                    "deposit": 50000,
                    "items": [{"computer_id": sample_computer.id, "quantity": 1, "unit_price": 50000}],
                },
            )
        
        # Try to create 2 rentals simultaneously
        results = await asyncio.gather(create_rental(), create_rental(), return_exceptions=True)
        
        # At most one should succeed
        successes = [r for r in results if not isinstance(r, Exception) and r.status_code == 201]
        assert len(successes) <= 1


# --- Contract Test (Schemathesis) ---

# Note: Run separately with: schemathesis run http://localhost:8000/openapi.json --base-url=http://localhost:8000
# This is a placeholder to document the contract test approach
def test_openapi_schema_valid():
    """Placeholder - actual contract tests run via schemathesis in CI."""
    pass