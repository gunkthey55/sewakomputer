import pytest
from httpx import AsyncClient


class TestHealth:
    """Health check tests."""

    @pytest.mark.asyncio
    async def test_health_check(self, client: AsyncClient):
        response = await client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"


class TestAuth:
    """Authentication tests."""

    @pytest.mark.asyncio
    async def test_register(self, client: AsyncClient):
        response = await client.post(
            "/auth/register",
            json={"email": "newuser@example.com", "password": "password123", "full_name": "New User", "role": "customer"},
        )
        assert response.status_code == 201
        data = response.json()
        assert data["email"] == "newuser@example.com"
        assert data["full_name"] == "New User"
        assert "id" in data

    @pytest.mark.asyncio
    async def test_register_duplicate_email(self, client: AsyncClient, test_user):
        response = await client.post(
            "/auth/register",
            json={"email": test_user.email, "password": "password123", "full_name": "Test"},
        )
        assert response.status_code == 400

    @pytest.mark.asyncio
    async def test_login_success(self, client: AsyncClient, test_user):
        # Login uses OAuth2PasswordRequestForm (form data)
        response = await client.post(
            "/auth/login",
            data={"username": test_user.email, "password": "testpass123"},
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"

    @pytest.mark.asyncio
    async def test_login_invalid_credentials(self, client: AsyncClient, test_user):
        response = await client.post(
            "/auth/login",
            data={"username": test_user.email, "password": "wrongpassword"},
        )
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_refresh_token(self, client: AsyncClient, test_user):
        # Login first
        login_response = await client.post(
            "/auth/login",
            data={"username": test_user.email, "password": "testpass123"},
        )
        refresh_token = login_response.json()["refresh_token"]

        # Refresh
        response = await client.post(
            "/auth/refresh",
            json={"refresh_token": refresh_token},
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data

    @pytest.mark.asyncio
    async def test_me_endpoint(self, client: AsyncClient, auth_headers):
        response = await client.get("/auth/me", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "test@example.com"

    @pytest.mark.asyncio
    async def test_me_unauthorized(self, client: AsyncClient):
        response = await client.get("/auth/me")
        assert response.status_code == 401


class TestComputers:
    """Computer CRUD tests."""

    @pytest.mark.asyncio
    async def test_create_computer(self, client: AsyncClient, auth_headers):
        response = await client.post(
            "/computers",
            json={
                "name": "Test PC",
                "serial_number": "PC-TEST-001",
                "brand": "TestBrand",
                "model": "TestModel",
                "rental_price_per_day": 50000,
                "rental_price_per_week": 300000,
                "rental_price_per_month": 1000000,
            },
            headers=auth_headers,
        )
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "Test PC"
        assert data["serial_number"] == "PC-TEST-001"

    @pytest.mark.asyncio
    async def test_list_computers(self, client: AsyncClient, auth_headers):
        response = await client.get("/computers", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    @pytest.mark.asyncio
    async def test_get_computer(self, client: AsyncClient, auth_headers):
        # Create first
        create_resp = await client.post(
            "/computers",
            json={
                "name": "Test PC 2",
                "serial_number": "PC-TEST-002",
                "brand": "TestBrand",
                "model": "TestModel",
                "rental_price_per_day": 50000,
                "rental_price_per_week": 300000,
                "rental_price_per_month": 1000000,
            },
            headers=auth_headers,
        )
        computer_id = create_resp.json()["id"]

        # Get
        response = await client.get(f"/computers/{computer_id}", headers=auth_headers)
        assert response.status_code == 200
        assert response.json()["id"] == computer_id

    @pytest.mark.asyncio
    async def test_update_computer(self, client: AsyncClient, auth_headers):
        create_resp = await client.post(
            "/computers",
            json={
                "name": "Test PC 3",
                "serial_number": "PC-TEST-003",
                "brand": "TestBrand",
                "model": "TestModel",
                "rental_price_per_day": 50000,
                "rental_price_per_week": 300000,
                "rental_price_per_month": 1000000,
            },
            headers=auth_headers,
        )
        computer_id = create_resp.json()["id"]

        response = await client.patch(
            f"/computers/{computer_id}",
            json={"rental_price_per_day": 60000},
            headers=auth_headers,
        )
        assert response.status_code == 200
        assert response.json()["rental_price_per_day"] == 60000


class TestComponents:
    """Component CRUD tests."""

    @pytest.mark.asyncio
    async def test_create_component(self, client: AsyncClient, auth_headers):
        # Need a computer first
        comp_resp = await client.post(
            "/computers",
            json={
                "name": "Test Computer for Components",
                "serial_number": "PC-COMP-001",
                "brand": "Test",
                "model": "Test",
                "rental_price_per_day": 50000,
                "rental_price_per_week": 300000,
                "rental_price_per_month": 1000000,
            },
            headers=auth_headers,
        )
        computer_id = comp_resp.json()["id"]

        response = await client.post(
            "/components",
            json={
                "computer_id": computer_id,
                "name": "Test Monitor",
                "component_type": "monitor",
                "brand": "TestBrand",
                "model": "TestModel",
            },
            headers=auth_headers,
        )
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "Test Monitor"
        assert data["component_type"] == "monitor"

    @pytest.mark.asyncio
    async def test_list_components(self, client: AsyncClient, auth_headers):
        response = await client.get("/components", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


class TestRentals:
    """Rental tests."""

    @pytest.mark.asyncio
    async def test_create_rental(self, client: AsyncClient, auth_headers):
        # Need a computer first
        comp_resp = await client.post(
            "/computers",
            json={
                "name": "Test Computer for Rental",
                "serial_number": "PC-RENT-001",
                "brand": "Test",
                "model": "Test",
                "rental_price_per_day": 50000,
                "rental_price_per_week": 300000,
                "rental_price_per_month": 1000000,
            },
            headers=auth_headers,
        )
        computer_id = comp_resp.json()["id"]

        from datetime import datetime, timedelta
        start = datetime.utcnow() + timedelta(days=1)
        end = datetime.utcnow() + timedelta(days=5)

        response = await client.post(
            "/rentals",
            json={
                "start_date": start.isoformat(),
                "end_date": end.isoformat(),
                "deposit": 50000,
                "items": [{"computer_id": computer_id, "quantity": 1, "unit_price": 50000}],
            },
            headers=auth_headers,
        )
        assert response.status_code == 201
        data = response.json()
        assert data["status"] == "pending"
        assert len(data["items"]) == 1

    @pytest.mark.asyncio
    async def test_list_rentals(self, client: AsyncClient, auth_headers):
        response = await client.get("/rentals", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "total" in data