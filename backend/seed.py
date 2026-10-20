#!/usr/bin/env python3
"""Seed script for development database."""

import asyncio
from datetime import datetime, timedelta
from sqlalchemy import select
from app.db.session import async_session_maker, init_db
from app.core.security import get_password_hash
from app.models import User, Computer, Component, Rental, RentalItem, RentalStatusEnum, RoleEnum


async def seed():
    async with async_session_maker() as db:
        # Create admin user
        result = await db.execute(select(User).where(User.email == "admin@rental.local"))
        if not result.scalar_one_or_none():
            admin = User(
                email="admin@rental.local",
                hashed_password=get_password_hash("admin123"),
                full_name="Admin User",
                role=RoleEnum.ADMIN,
                phone="081234567890",
            )
            db.add(admin)
            print("Created admin user: admin@rental.local / admin123")

        # Create staff user
        result = await db.execute(select(User).where(User.email == "staff@rental.local"))
        if not result.scalar_one_or_none():
            staff = User(
                email="staff@rental.local",
                hashed_password=get_password_hash("staff123"),
                full_name="Staff User",
                role=RoleEnum.STAFF,
                phone="081234567891",
            )
            db.add(staff)
            print("Created staff user: staff@rental.local / staff123")

        # Create customer user
        result = await db.execute(select(User).where(User.email == "customer@rental.local"))
        if not result.scalar_one_or_none():
            customer = User(
                email="customer@rental.local",
                hashed_password=get_password_hash("customer123"),
                full_name="Customer User",
                role=RoleEnum.CUSTOMER,
                phone="081234567892",
            )
            db.add(customer)
            print("Created customer user: customer@rental.local / customer123")

        await db.flush()

        # Get users
        result = await db.execute(select(User))
        users = result.scalars().all()
        admin_user = next((u for u in users if u.role == RoleEnum.ADMIN), users[0])
        staff_user = next((u for u in users if u.role == RoleEnum.STAFF), users[0])

        # Create computers
        computers_data = [
            {
                "name": "PC Gaming RTX 3080",
                "description": "High-end gaming PC with RTX 3080",
                "serial_number": "PC-GAM-001",
                "brand": "Custom Build",
                "model": "RTX 3080 Gaming",
                "purchase_price": 25000000,
                "rental_price_per_day": 150000,
                "rental_price_per_week": 900000,
                "rental_price_per_month": 3000000,
                "is_available": True,
                "is_active": True,
                "location": "Store Front",
            },
            {
                "name": "PC Office i5",
                "description": "Standard office PC",
                "serial_number": "PC-OFF-001",
                "brand": "Dell",
                "model": "OptiPlex 7090",
                "purchase_price": 8000000,
                "rental_price_per_day": 50000,
                "rental_price_per_week": 300000,
                "rental_price_per_month": 1000000,
                "is_available": True,
                "is_active": True,
                "location": "Store Back",
            },
            {
                "name": "PC Workstation",
                "description": "Professional workstation for rendering",
                "serial_number": "PC-WKS-001",
                "brand": "HP",
                "model": "Z8 G4",
                "purchase_price": 45000000,
                "rental_price_per_day": 300000,
                "rental_price_per_week": 1800000,
                "rental_price_per_month": 6000000,
                "is_available": True,
                "is_active": True,
                "location": "VIP Room",
            },
        ]

        for comp_data in computers_data:
            result = await db.execute(select(Computer).where(Computer.serial_number == comp_data["serial_number"]))
            if not result.scalar_one_or_none():
                computer = Computer(**comp_data)
                db.add(computer)
                print(f"Created computer: {comp_data['name']}")

        await db.flush()

        # Get created computers
        result = await db.execute(select(Computer))
        computers = result.scalars().all()

        # Create components for each computer
        components_data = [
            # Gaming PC components
            {"computer_id": computers[0].id, "name": "NVIDIA RTX 3080 10GB", "component_type": "gpu", "brand": "NVIDIA", "model": "RTX 3080", "serial_number": "GPU-3080-001", "specifications": "10GB GDDR6X, 8704 CUDA cores"},
            {"computer_id": computers[0].id, "name": "Intel i7-12700K", "component_type": "cpu", "brand": "Intel", "model": "Core i7-12700K", "serial_number": "CPU-12700K-001", "specifications": "12 cores, 20 threads, up to 5.0 GHz"},
            {"computer_id": computers[0].id, "name": "32GB DDR5-5600", "component_type": "ram", "brand": "Corsair", "model": "Vengeance DDR5", "serial_number": "RAM-DDR5-001", "specifications": "2x16GB, 5600MHz"},
            {"computer_id": computers[0].id, "name": "1TB NVMe SSD", "component_type": "storage", "brand": "Samsung", "model": "980 PRO", "serial_number": "SSD-980-001", "specifications": "PCIe 4.0, 7000 MB/s"},
            # Office PC components
            {"computer_id": computers[1].id, "name": "Intel UHD 730", "component_type": "gpu", "brand": "Intel", "model": "Integrated", "serial_number": "GPU-UHD-001", "specifications": "Integrated graphics"},
            {"computer_id": computers[1].id, "name": "Intel i5-12400", "component_type": "cpu", "brand": "Intel", "model": "Core i5-12400", "serial_number": "CPU-12400-001", "specifications": "6 cores, 12 threads, up to 4.4 GHz"},
            {"computer_id": computers[1].id, "name": "16GB DDR4-3200", "component_type": "ram", "brand": "Kingston", "model": "FURY Beast", "serial_number": "RAM-DDR4-001", "specifications": "2x8GB, 3200MHz"},
            {"computer_id": computers[1].id, "name": "512GB SSD", "component_type": "storage", "brand": "WD", "model": "Blue SN570", "serial_number": "SSD-SN570-001", "specifications": "PCIe 3.0, 3500 MB/s"},
            # Workstation components
            {"computer_id": computers[2].id, "name": "NVIDIA RTX 4090 24GB", "component_type": "gpu", "brand": "NVIDIA", "model": "RTX 4090", "serial_number": "GPU-4090-001", "specifications": "24GB GDDR6X, 16384 CUDA cores"},
            {"computer_id": computers[2].id, "name": "AMD Ryzen 9 7950X", "component_type": "cpu", "brand": "AMD", "model": "Ryzen 9 7950X", "serial_number": "CPU-7950X-001", "specifications": "16 cores, 32 threads, up to 5.7 GHz"},
            {"computer_id": computers[2].id, "name": "64GB DDR5-5600", "component_type": "ram", "brand": "G.Skill", "model": "Trident Z5", "serial_number": "RAM-DDR5-002", "specifications": "4x16GB, 5600MHz"},
            {"computer_id": computers[2].id, "name": "2TB NVMe SSD", "component_type": "storage", "brand": "Samsung", "model": "990 PRO", "serial_number": "SSD-990-001", "specifications": "PCIe 4.0, 7450 MB/s"},
        ]

        for comp_data in components_data:
            result = await db.execute(select(Component).where(Component.serial_number == comp_data["serial_number"]))
            if not result.scalar_one_or_none():
                component = Component(**comp_data)
                db.add(component)
                print(f"Created component: {comp_data['name']}")

        await db.flush()

        # Create sample rentals
        if len(computers) >= 3:
            # Rental 1: Active (customer renting gaming PC)
            customer_user = next((u for u in users if u.role == RoleEnum.CUSTOMER), users[0])
            rental1 = Rental(
                user_id=customer_user.id,
                status=RentalStatusEnum.ACTIVE,
                start_date=datetime.utcnow() - timedelta(days=2),
                end_date=datetime.utcnow() + timedelta(days=3),
                total_price=750000,  # 150000 * 5 days
                deposit=500000,
                notes="Gaming PC rental for tournament",
            )
            db.add(rental1)
            await db.flush()

            item1 = RentalItem(
                rental_id=rental1.id,
                computer_id=computers[0].id,
                quantity=1,
                unit_price=150000,
                total_price=750000,
            )
            db.add(item1)

            # Mark computer as unavailable
            computers[0].is_available = False

            # Rental 2: Pending (staff renting office PC)
            rental2 = Rental(
                user_id=staff_user.id,
                status=RentalStatusEnum.PENDING,
                start_date=datetime.utcnow() + timedelta(days=1),
                end_date=datetime.utcnow() + timedelta(days=7),
                total_price=350000,  # 50000 * 7 days
                deposit=300000,
                notes="Office PC for training week",
            )
            db.add(rental2)
            await db.flush()

            item2 = RentalItem(
                rental_id=rental2.id,
                computer_id=computers[1].id,
                quantity=1,
                unit_price=50000,
                total_price=350000,
            )
            db.add(item2)

            # Rental 3: Completed (past rental)
            rental3 = Rental(
                user_id=customer_user.id,
                status=RentalStatusEnum.COMPLETED,
                start_date=datetime.utcnow() - timedelta(days=10),
                end_date=datetime.utcnow() - timedelta(days=3),
                actual_return_date=datetime.utcnow() - timedelta(days=3),
                total_price=2100000,  # 300000 * 7 days
                deposit=1000000,
                notes="Workstation for video rendering project",
            )
            db.add(rental3)
            await db.flush()

            item3 = RentalItem(
                rental_id=rental3.id,
                computer_id=computers[2].id,
                quantity=1,
                unit_price=300000,
                total_price=2100000,
            )
            db.add(item3)

            # Rental 4: Overdue (for testing overdue logic)
            rental4 = Rental(
                user_id=customer_user.id,
                status=RentalStatusEnum.OVERDUE,
                start_date=datetime.utcnow() - timedelta(days=10),
                end_date=datetime.utcnow() - timedelta(days=2),
                total_price=500000,
                deposit=300000,
                notes="Overdue test rental",
            )
            db.add(rental4)
            await db.flush()

            item4 = RentalItem(
                rental_id=rental4.id,
                computer_id=computers[1].id,  # Same computer as rental2 but overdue
                quantity=1,
                unit_price=50000,
                total_price=500000,
            )
            db.add(item4)

            # Rental 5: Cancelled
            rental5 = Rental(
                user_id=customer_user.id,
                status=RentalStatusEnum.CANCELLED,
                start_date=datetime.utcnow() + timedelta(days=5),
                end_date=datetime.utcnow() + timedelta(days=10),
                total_price=1000000,
                deposit=500000,
                notes="Cancelled due to schedule change",
            )
            db.add(rental5)
            await db.flush()

            item5 = RentalItem(
                rental_id=rental5.id,
                computer_id=computers[0].id,
                quantity=1,
                unit_price=150000,
                total_price=1000000,
            )
            db.add(item5)

            print("Created sample rentals with items")

        await db.commit()
        print("Seed completed successfully!")


if __name__ == "__main__":
    asyncio.run(init_db())
    asyncio.run(seed())