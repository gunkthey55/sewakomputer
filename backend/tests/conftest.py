import pytest
import pytest_asyncio
from datetime import datetime, timedelta, date
from decimal import Decimal
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.pool import StaticPool
from sqlalchemy import select, delete

from app.main import app
from app.db.session import get_db, Base
from app.core.security import get_password_hash, create_access_token
from app.models import (
    User, Computer, Component, Rental, RentalItem,
    Reminder, Notification, RentalStatusEnum, ReminderChannelEnum, RoleEnum
)

# Test database - use SQLite in memory for unit tests
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

test_engine = create_async_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

TestAsyncSessionLocal = async_sessionmaker(
    test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


@pytest_asyncio.fixture(scope="session", autouse=True)
async def init_test_db():
    """Initialize test database."""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture
async def db_session():
    """Create a test database session."""
    async with TestAsyncSessionLocal() as session:
        yield session


@pytest_asyncio.fixture
async def client(db_session: AsyncSession):
    """Create test client with overridden DB dependency."""
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


# --- User Fixtures ---

@pytest_asyncio.fixture
async def test_user(db_session: AsyncSession):
    """Create a test user."""
    user = User(
        email="test@example.com",
        hashed_password=get_password_hash("testpass123"),
        full_name="Test User",
        role=RoleEnum.CUSTOMER,
        is_active=True,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture
async def admin_user(db_session: AsyncSession):
    """Create an admin test user."""
    user = User(
        email="admin@example.com",
        hashed_password=get_password_hash("adminpass123"),
        full_name="Admin User",
        role=RoleEnum.ADMIN,
        is_active=True,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture
async def staff_user(db_session: AsyncSession):
    """Create a staff test user."""
    user = User(
        email="staff@example.com",
        hashed_password=get_password_hash("staffpass123"),
        full_name="Staff User",
        role=RoleEnum.STAFF,
        is_active=True,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture
async def auth_headers(test_user: User):
    """Get auth headers for test user."""
    token = create_access_token({"sub": test_user.id, "email": test_user.email})
    return {"Authorization": f"Bearer {token}"}


@pytest_asyncio.fixture
async def admin_headers(admin_user: User):
    """Get auth headers for admin user."""
    token = create_access_token({"sub": admin_user.id, "email": admin_user.email})
    return {"Authorization": f"Bearer {token}"}


@pytest_asyncio.fixture
async def staff_headers(staff_user: User):
    """Get auth headers for staff user."""
    token = create_access_token({"sub": staff_user.id, "email": staff_user.email})
    return {"Authorization": f"Bearer {token}"}


# --- Computer Fixtures ---

@pytest_asyncio.fixture
async def sample_computer(db_session: AsyncSession):
    """Create a sample computer."""
    computer = Computer(
        name="Test PC",
        serial_number="PC-TEST-001",
        brand="TestBrand",
        model="TestModel",
        rental_price_per_day=50000,
        rental_price_per_week=300000,
        rental_price_per_month=1000000,
        is_available=True,
        is_active=True,
    )
    db_session.add(computer)
    await db_session.commit()
    await db_session.refresh(computer)
    return computer


@pytest_asyncio.fixture
async def available_computers(db_session: AsyncSession):
    """Create multiple available computers."""
    computers = [
        Computer(
            name=f"PC-{i}",
            serial_number=f"PC-{i:03d}",
            brand="TestBrand",
            model="TestModel",
            rental_price_per_day=50000,
            rental_price_per_week=300000,
            rental_price_per_month=1000000,
            is_available=True,
            is_active=True,
        )
        for i in range(1, 6)
    ]
    db_session.add_all(computers)
    await db_session.commit()
    for c in computers:
        await db_session.refresh(c)
    return computers


@pytest_asyncio.fixture
async def unavailable_computer(db_session: AsyncSession):
    """Create an unavailable computer."""
    computer = Computer(
        name="Unavailable PC",
        serial_number="PC-UNAVAIL-001",
        brand="TestBrand",
        model="TestModel",
        rental_price_per_day=50000,
        rental_price_per_week=300000,
        rental_price_per_month=1000000,
        is_available=False,
        is_active=True,
        notes="Under maintenance",
    )
    db_session.add(computer)
    await db_session.commit()
    await db_session.refresh(computer)
    return computer


# --- Component Fixtures ---

@pytest_asyncio.fixture
async def sample_component(db_session: AsyncSession, sample_computer: Computer):
    """Create a sample component attached to a computer."""
    component = Component(
        computer_id=sample_computer.id,
        name="Test Monitor",
        component_type="monitor",
        brand="TestBrand",
        model="TestModel",
        specifications="24 inch, 1080p",
    )
    db_session.add(component)
    await db_session.commit()
    await db_session.refresh(component)
    return component


@pytest_asyncio.fixture
async def sample_components(db_session: AsyncSession, sample_computer: Computer):
    """Create multiple sample components."""
    components = [
        Component(computer_id=sample_computer.id, name="Monitor 24\"", component_type="monitor", brand="Dell", model="P2419H", specifications="24 inch"),
        Component(computer_id=sample_computer.id, name="Keyboard", component_type="keyboard", brand="Logitech", model="K120", specifications="USB"),
        Component(computer_id=sample_computer.id, name="Mouse", component_type="mouse", brand="Logitech", model="M100", specifications="USB"),
        Component(computer_id=sample_computer.id, name="Headset", component_type="headset", brand="Logitech", model="H390", specifications="USB"),
        Component(computer_id=sample_computer.id, name="Webcam", component_type="webcam", brand="Logitech", model="C920", specifications="1080p"),
    ]
    db_session.add_all(components)
    await db_session.commit()
    for c in components:
        await db_session.refresh(c)
    return components


# --- Rental Fixtures ---

@pytest_asyncio.fixture
async def sample_rental(db_session: AsyncSession, test_user: User, sample_computer: Computer):
    """Create a sample rental in pending status."""
    rental = Rental(
        user_id=test_user.id,
        status=RentalStatusEnum.PENDING,
        start_date=datetime.now() + timedelta(days=1),
        end_date=datetime.now() + timedelta(days=5),
        total_price=250000,
        deposit=50000,
        notes="Test rental",
    )
    db_session.add(rental)
    await db_session.commit()
    await db_session.refresh(rental)
    
    # Add rental item
    rental_item = RentalItem(
        rental_id=rental.id,
        computer_id=sample_computer.id,
        quantity=1,
        unit_price=50000,
        total_price=250000,
    )
    db_session.add(rental_item)
    await db_session.commit()
    
    return rental


@pytest_asyncio.fixture
async def active_rental(db_session: AsyncSession, test_user: User, sample_computer: Computer):
    """Create an active rental."""
    rental = Rental(
        user_id=test_user.id,
        status=RentalStatusEnum.ACTIVE,
        start_date=datetime.now() - timedelta(days=1),
        end_date=datetime.now() + timedelta(days=3),
        total_price=250000,
        deposit=50000,
    )
    db_session.add(rental)
    await db_session.commit()
    await db_session.refresh(rental)
    
    rental_item = RentalItem(
        rental_id=rental.id,
        computer_id=sample_computer.id,
        quantity=1,
        unit_price=50000,
        total_price=250000,
    )
    db_session.add(rental_item)
    # Mark computer as unavailable
    sample_computer.is_available = False
    await db_session.commit()
    
    return rental


@pytest_asyncio.fixture
async def rental_ending_today(db_session: AsyncSession, test_user: User, sample_computer: Computer):
    """Create a rental ending today (for T+0 reminder)."""
    rental = Rental(
        user_id=test_user.id,
        status=RentalStatusEnum.ACTIVE,
        start_date=datetime.now() - timedelta(days=5),
        end_date=datetime.now().replace(hour=23, minute=59, second=59),
        total_price=250000,
        deposit=50000,
    )
    db_session.add(rental)
    await db_session.commit()
    await db_session.refresh(rental)
    
    rental_item = RentalItem(
        rental_id=rental.id,
        computer_id=sample_computer.id,
        quantity=1,
        unit_price=50000,
        total_price=250000,
    )
    db_session.add(rental_item)
    sample_computer.is_available = False
    await db_session.commit()
    
    return rental


@pytest_asyncio.fixture
async def rental_ending_in_days(db_session: AsyncSession, test_user: User, sample_computer: Computer):
    """Factory to create rental ending in N days."""
    async def _create(days: int):
        rental = Rental(
            user_id=test_user.id,
            status=RentalStatusEnum.ACTIVE,
            start_date=datetime.now() - timedelta(days=2),
            end_date=datetime.now() + timedelta(days=days),
            total_price=250000,
            deposit=50000,
        )
        db_session.add(rental)
        await db_session.commit()
        await db_session.refresh(rental)
        
        rental_item = RentalItem(
            rental_id=rental.id,
            computer_id=sample_computer.id,
            quantity=1,
            unit_price=50000,
            total_price=250000,
        )
        db_session.add(rental_item)
        sample_computer.is_available = False
        await db_session.commit()
        return rental
    return _create


@pytest_asyncio.fixture
async def overdue_rental(db_session: AsyncSession, test_user: User, sample_computer: Computer):
    """Create an overdue rental."""
    rental = Rental(
        user_id=test_user.id,
        status=RentalStatusEnum.OVERDUE,
        start_date=datetime.now() - timedelta(days=10),
        end_date=datetime.now() - timedelta(days=2),
        total_price=250000,
        deposit=50000,
    )
    db_session.add(rental)
    await db_session.commit()
    await db_session.refresh(rental)
    
    rental_item = RentalItem(
        rental_id=rental.id,
        computer_id=sample_computer.id,
        quantity=1,
        unit_price=50000,
        total_price=250000,
    )
    db_session.add(rental_item)
    sample_computer.is_available = False
    await db_session.commit()
    
    return rental


@pytest_asyncio.fixture
async def completed_rental(db_session: AsyncSession, test_user: User, sample_computer: Computer):
    """Create a completed rental."""
    rental = Rental(
        user_id=test_user.id,
        status=RentalStatusEnum.COMPLETED,
        start_date=datetime.now() - timedelta(days=10),
        end_date=datetime.now() - timedelta(days=3),
        actual_return_date=datetime.now() - timedelta(days=3),
        total_price=250000,
        deposit=50000,
    )
    db_session.add(rental)
    await db_session.commit()
    await db_session.refresh(rental)
    
    rental_item = RentalItem(
        rental_id=rental.id,
        computer_id=sample_computer.id,
        quantity=1,
        unit_price=50000,
        total_price=250000,
    )
    db_session.add(rental_item)
    sample_computer.is_available = True
    await db_session.commit()
    
    return rental


@pytest_asyncio.fixture
async def cancelled_rental(db_session: AsyncSession, test_user: User, sample_computer: Computer):
    """Create a cancelled rental."""
    rental = Rental(
        user_id=test_user.id,
        status=RentalStatusEnum.CANCELLED,
        start_date=datetime.now() + timedelta(days=1),
        end_date=datetime.now() + timedelta(days=5),
        total_price=250000,
        deposit=50000,
    )
    db_session.add(rental)
    await db_session.commit()
    await db_session.refresh(rental)
    
    rental_item = RentalItem(
        rental_id=rental.id,
        computer_id=sample_computer.id,
        quantity=1,
        unit_price=50000,
        total_price=250000,
    )
    db_session.add(rental_item)
    sample_computer.is_available = True
    await db_session.commit()
    
    return rental


# --- Reminder Fixtures ---

@pytest_asyncio.fixture
async def sample_reminder(db_session: AsyncSession, active_rental: Rental):
    """Create a sample reminder."""
    reminder = Reminder(
        rental_id=active_rental.id,
        channel=ReminderChannelEnum.IN_APP,
        days_before=1,
        scheduled_for=datetime.now() + timedelta(hours=1),
        is_sent=False,
        retry_count=0,
    )
    db_session.add(reminder)
    await db_session.commit()
    await db_session.refresh(reminder)
    return reminder


@pytest_asyncio.fixture
async def reminder_due_now(db_session: AsyncSession, active_rental: Rental):
    """Create a reminder due now (for scheduler testing)."""
    reminder = Reminder(
        rental_id=active_rental.id,
        channel=ReminderChannelEnum.IN_APP,
        days_before=1,
        scheduled_for=datetime.now() - timedelta(minutes=5),
        is_sent=False,
        retry_count=0,
    )
    db_session.add(reminder)
    await db_session.commit()
    await db_session.refresh(reminder)
    return reminder


@pytest_asyncio.fixture
async def reminder_sent(db_session: AsyncSession, active_rental: Rental):
    """Create a sent reminder."""
    reminder = Reminder(
        rental_id=active_rental.id,
        channel=ReminderChannelEnum.TELEGRAM,
        days_before=3,
        scheduled_for=datetime.now() - timedelta(hours=1),
        sent_at=datetime.now() - timedelta(minutes=30),
        is_sent=True,
        retry_count=0,
    )
    db_session.add(reminder)
    await db_session.commit()
    await db_session.refresh(reminder)
    return reminder


@pytest_asyncio.fixture
async def reminders_for_rental(db_session: AsyncSession, active_rental: Rental):
    """Create reminders for T-7, T-3, T-1, T+0 for a rental."""
    reminders = []
    for days, channel in [(7, ReminderChannelEnum.IN_APP), (3, ReminderChannelEnum.TELEGRAM), 
                           (1, ReminderChannelEnum.IN_APP), (0, ReminderChannelEnum.TELEGRAM)]:
        reminder = Reminder(
            rental_id=active_rental.id,
            channel=channel,
            days_before=days,
            scheduled_for=datetime.now() + timedelta(days=1) if days > 0 else datetime.now() - timedelta(hours=1),
            is_sent=days > 1,  # T-7, T-3 already sent, T-1, T+0 pending
            retry_count=0,
        )
        db_session.add(reminder)
        reminders.append(reminder)
    await db_session.commit()
    for r in reminders:
        await db_session.refresh(r)
    return reminders


# --- Notification Fixtures ---

@pytest_asyncio.fixture
async def sample_notification(db_session: AsyncSession, test_user: User, sample_rental: Rental):
    """Create a sample notification."""
    notification = Notification(
        user_id=test_user.id,
        type="in_app",
        title="Test Notification",
        message="This is a test notification",
        status="pending",
        related_rental_id=sample_rental.id,
    )
    db_session.add(notification)
    await db_session.commit()
    await db_session.refresh(notification)
    return notification


@pytest_asyncio.fixture
async def unread_notifications(db_session: AsyncSession, test_user: User, sample_rental: Rental):
    """Create multiple unread notifications."""
    notifications = [
        Notification(
            user_id=test_user.id,
            type="in_app",
            title=f"Notification {i}",
            message=f"Message {i}",
            status="pending",
            related_rental_id=sample_rental.id,
        )
        for i in range(3)
    ]
    db_session.add_all(notifications)
    await db_session.commit()
    for n in notifications:
        await db_session.refresh(n)
    return notifications


# --- Factory Fixtures ---

@pytest_asyncio.fixture
async def rental_factory(db_session: AsyncSession, test_user: User):
    """Factory to create rentals with custom parameters."""
    async def _create(
        status: RentalStatusEnum = RentalStatusEnum.PENDING,
        start_offset: int = 1,
        end_offset: int = 5,
        computer: Computer = None,
        **kwargs
    ):
        if computer is None:
            computer = Computer(
                name="Factory PC",
                serial_number=f"PC-FACTORY-{datetime.now().timestamp()}",
                brand="FactoryBrand",
                model="FactoryModel",
                rental_price_per_day=50000,
                rental_price_per_week=300000,
                rental_price_per_month=1000000,
                is_available=True,
                is_active=True,
            )
            db_session.add(computer)
            await db_session.commit()
            await db_session.refresh(computer)
        
        rental = Rental(
            user_id=test_user.id,
            status=status,
            start_date=datetime.now() + timedelta(days=start_offset),
            end_date=datetime.now() + timedelta(days=end_offset),
            total_price=kwargs.get("total_price", 250000),
            deposit=kwargs.get("deposit", 50000),
            notes=kwargs.get("notes"),
        )
        db_session.add(rental)
        await db_session.commit()
        await db_session.refresh(rental)
        
        if status in [RentalStatusEnum.ACTIVE, RentalStatusEnum.OVERDUE]:
            computer.is_available = False
        elif status == RentalStatusEnum.COMPLETED:
            computer.is_available = True
        
        rental_item = RentalItem(
            rental_id=rental.id,
            computer_id=computer.id,
            quantity=kwargs.get("quantity", 1),
            unit_price=kwargs.get("unit_price", 50000),
            total_price=kwargs.get("total_price", 250000),
        )
        db_session.add(rental_item)
        await db_session.commit()
        await db_session.refresh(rental)
        return rental
    return _create


@pytest_asyncio.fixture
async def computer_factory(db_session: AsyncSession):
    """Factory to create computers."""
    async def _create(**kwargs):
        computer = Computer(
            name=kwargs.get("name", "Factory Computer"),
            serial_number=kwargs.get("serial_number", f"PC-FACTORY-{datetime.now().timestamp()}"),
            brand=kwargs.get("brand", "FactoryBrand"),
            model=kwargs.get("model", "FactoryModel"),
            rental_price_per_day=kwargs.get("price_per_day", 50000),
            rental_price_per_week=kwargs.get("price_per_week", 300000),
            rental_price_per_month=kwargs.get("price_per_month", 1000000),
            is_available=kwargs.get("is_available", True),
            is_active=kwargs.get("is_active", True),
            notes=kwargs.get("notes"),
        )
        db_session.add(computer)
        await db_session.commit()
        await db_session.refresh(computer)
        return computer
    return _create


# --- Test Client with Auth ---

@pytest_asyncio.fixture
async def authed_client(client: AsyncClient, auth_headers: dict):
    """Test client with auth headers pre-set."""
    client.headers.update(auth_headers)
    yield client
    for key in list(auth_headers.keys()):
        client.headers.pop(key, None)


@pytest_asyncio.fixture
async def admin_client(client: AsyncClient, admin_headers: dict):
    """Test client with admin auth headers pre-set."""
    client.headers.update(admin_headers)
    yield client
    for key in list(admin_headers.keys()):
        client.headers.pop(key, None)


# --- Parametrized Fixtures ---

@pytest.fixture(params=[
    RentalStatusEnum.PENDING, 
    RentalStatusEnum.ACTIVE, 
    RentalStatusEnum.COMPLETED, 
    RentalStatusEnum.CANCELLED, 
    RentalStatusEnum.OVERDUE
])
def rental_status(request):
    """Parametrized rental status for testing all statuses."""
    return request.param


@pytest.fixture(params=[ReminderChannelEnum.IN_APP, ReminderChannelEnum.TELEGRAM, ReminderChannelEnum.EMAIL])
def reminder_channel(request):
    """Parametrized reminder channel."""
    return request.param


# --- Cleanup Helper ---

@pytest_asyncio.fixture(autouse=True)
async def cleanup_db(db_session: AsyncSession):
    """Cleanup fixture - runs after each test to ensure isolation."""
    yield
    # Clean up all tables in reverse order of dependencies
    for model in [Reminder, Notification, RentalItem, Rental, Component, Computer, User]:
        await db_session.execute(delete(model))
    await db_session.commit()


# --- Scheduler Test Helpers ---

class SchedulerTestHelper:
    """Helper for testing scheduler jobs with time control."""
    
    def __init__(self, db_session: AsyncSession):
        self.db_session = db_session
    
    async def create_rental_with_reminders(self, user: User, computer: Computer, days_from_now: int):
        """Create a rental with reminders for testing scheduler."""
        rental = Rental(
            user_id=user.id,
            status=RentalStatusEnum.ACTIVE,
            start_date=datetime.now() - timedelta(days=2),
            end_date=datetime.now() + timedelta(days=days_from_now),
            total_price=250000,
            deposit=50000,
        )
        self.db_session.add(rental)
        await self.db_session.commit()
        await self.db_session.refresh(rental)
        
        rental_item = RentalItem(
            rental_id=rental.id,
            computer_id=computer.id,
            quantity=1,
            unit_price=50000,
            total_price=250000,
        )
        self.db_session.add(rental_item)
        computer.is_available = False
        
        # Create reminders for T-7, T-3, T-1, T+0
        for days_before in [7, 3, 1, 0]:
            scheduled = datetime.now() + timedelta(days=days_from_now - days_before)
            if days_from_now - days_before < 0:
                scheduled = datetime.now() - timedelta(hours=1)
            
            for channel in [ReminderChannelEnum.IN_APP, ReminderChannelEnum.TELEGRAM]:
                reminder = Reminder(
                    rental_id=rental.id,
                    channel=channel,
                    days_before=days_before,
                    scheduled_for=scheduled,
                    is_sent=False,
                    retry_count=0,
                )
                self.db_session.add(reminder)
        
        await self.db_session.commit()
        return rental


@pytest_asyncio.fixture
async def scheduler_helper(db_session: AsyncSession):
    """Provide scheduler test helper."""
    return SchedulerTestHelper(db_session)
