# Data Dictionary — Rental System Database

> **Version**: 1.0 | **Schema**: `rental_db` | **Engine**: MySQL 8.0 (InnoDB) | **Charset**: `utf8mb4` / `utf8mb4_unicode_ci`

---

## Table: `users`

**Purpose**: System operators (admin/staff) and customer records. Authentication + notification targeting.

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| `id` | `INT` | `PK`, `AUTO_INCREMENT`, `NOT NULL` | — | Surrogate key |
| `email` | `VARCHAR(255)` | `UNIQUE`, `NOT NULL`, `INDEX` | — | Login identifier, unique |
| `hashed_password` | `VARCHAR(255)` | `NOT NULL` | — | bcrypt hash (cost 12) |
| `full_name` | `VARCHAR(255)` | `NOT NULL` | — | Display name |
| `phone` | `VARCHAR(50)` | `NULLABLE` | `NULL` | Contact phone |
| `role` | `ENUM('admin','staff','customer')` | `NOT NULL` | `'customer'` | Authorization level |
| `is_active` | `BOOLEAN` | `NOT NULL` | `TRUE` | Soft disable (login blocked) |
| `telegram_chat_id` | `VARCHAR(100)` | `NULLABLE`, `UNIQUE` | `NULL` | For Telegram bot notifications |
| `created_at` | `DATETIME` | `NOT NULL` | `CURRENT_TIMESTAMP` | Record creation (UTC) |
| `updated_at` | `DATETIME` | `NOT NULL` | `CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP` | Last modification (UTC) |

**Indexes**:
- `PRIMARY KEY (id)`
- `UNIQUE KEY ix_users_email (email)`
- `KEY ix_users_id (id)`

**Sample Data**:
```sql
INSERT INTO users (email, hashed_password, full_name, role, is_active, telegram_chat_id) VALUES
('admin@rental.local', '$2b$12$...', 'Admin User', 'admin', TRUE, '123456789'),
('operator@rental.local', '$2b$12$...', 'Operator One', 'staff', TRUE, '987654321');
```

---

## Table: `computers`

**Purpose**: Rentable computer units (laptop/desktop/server). Each has pricing tiers and availability status.

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| `id` | `INT` | `PK`, `AUTO_INCREMENT`, `NOT NULL` | — | Surrogate key |
| `name` | `VARCHAR(255)` | `NOT NULL` | — | Human-readable name (e.g. "Gaming PC #01") |
| `description` | `TEXT` | `NULLABLE` | `NULL` | Free-form notes |
| `serial_number` | `VARCHAR(100)` | `UNIQUE`, `NOT NULL`, `INDEX` | — | Asset tag / serial |
| `brand` | `VARCHAR(100)` | `NOT NULL` | — | Manufacturer (Dell, HP, Lenovo, Custom) |
| `model` | `VARCHAR(100)` | `NOT NULL` | — | Model identifier |
| `purchase_date` | `DATETIME` | `NULLABLE` | `NULL` | Acquisition date |
| `purchase_price` | `DECIMAL(10,2)` | `NULLABLE` | `NULL` | Capital cost |
| `rental_price_per_day` | `DECIMAL(10,2)` | `NOT NULL` | — | Daily rate (IDR) |
| `rental_price_per_week` | `DECIMAL(10,2)` | `NOT NULL` | — | Weekly rate (7 days) |
| `rental_price_per_month` | `DECIMAL(10,2)` | `NOT NULL` | — | Monthly rate (30 days) |
| `is_available` | `BOOLEAN` | `NOT NULL`, `INDEX` | `TRUE` | Currently rentable |
| `is_active` | `BOOLEAN` | `NOT NULL`, `INDEX` | `TRUE` | Not retired/decommissioned |
| `location` | `VARCHAR(255)` | `NULLABLE` | `NULL` | Physical location (shelf, branch) |
| `created_at` | `DATETIME` | `NOT NULL` | `CURRENT_TIMESTAMP` | Record creation |
| `updated_at` | `DATETIME` | `NOT NULL` | `CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP` | Last modification |

**Indexes**:
- `PRIMARY KEY (id)`
- `UNIQUE KEY ix_computers_serial_number (serial_number)`
- `KEY ix_computers_brand_model (brand, model)`
- `KEY ix_computers_available_active (is_available, is_active)`
- `KEY ix_computers_id (id)`

**Business Rules**:
- `rental_price_per_week` ≈ `rental_price_per_day * 6.5` (bulk discount)
- `rental_price_per_month` ≈ `rental_price_per_day * 25` (bulk discount)
- Only `is_available = TRUE AND is_active = TRUE` computers can be rented
- `serial_number` must be unique across all assets

---

## Table: `components`

**Purpose**: Physical components attached to a computer (monitor, keyboard, mouse, headset, webcam, etc.). Inventory/detail tracking.

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| `id` | `INT` | `PK`, `AUTO_INCREMENT`, `NOT NULL` | — | Surrogate key |
| `computer_id` | `INT` | `FK → computers.id`, `NOT NULL`, `INDEX` | — | Parent computer (CASCADE delete) |
| `name` | `VARCHAR(255)` | `NOT NULL` | — | Component name (e.g. "24\" Monitor") |
| `component_type` | `VARCHAR(100)` | `NOT NULL` | — | Category: monitor, keyboard, mouse, headset, webcam, cable, other |
| `brand` | `VARCHAR(100)` | `NULLABLE` | `NULL` | Manufacturer |
| `model` | `VARCHAR(100)` | `NULLABLE` | `NULL` | Model number |
| `serial_number` | `VARCHAR(100)` | `NULLABLE` | `NULL` | Component serial (if tracked) |
| `specifications` | `TEXT` | `NULLABLE` | `NULL` | Free-form specs (resolution, switch type, etc.) |
| `created_at` | `DATETIME` | `NOT NULL` | `CURRENT_TIMESTAMP` | Record creation |
| `updated_at` | `DATETIME` | `NOT NULL` | `CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP` | Last modification |

**Indexes**:
- `PRIMARY KEY (id)`
- `KEY ix_components_computer_type (computer_id, component_type)`
- `KEY ix_components_id (id)`
- `FOREIGN KEY (computer_id) REFERENCES computers(id) ON DELETE CASCADE`

**Business Rules**:
- Components are **not independently rentable** in MVP (tied to computer)
- Multiple components of same type allowed per computer (e.g. dual monitor)
- `component_type` should use controlled vocabulary (see seed data)

---

## Table: `rentals`

**Purpose**: Rental transactions — header record linking operator, customer, dates, pricing, status.

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| `id` | `INT` | `PK`, `AUTO_INCREMENT`, `NOT NULL` | — | Surrogate key |
| `user_id` | `INT` | `FK → users.id`, `NOT NULL`, `INDEX` | — | Operator who created rental |
| `status` | `ENUM('pending','active','completed','cancelled','overdue')` | `NOT NULL` | `'pending'` | Lifecycle state |
| `start_date` | `DATETIME` | `NOT NULL`, `INDEX` | — | Rental period start (UTC) |
| `end_date` | `DATETIME` | `NOT NULL`, `INDEX` | — | Rental period end (UTC) |
| `actual_return_date` | `DATETIME` | `NULLABLE` | `NULL` | When items physically returned |
| `total_price` | `DECIMAL(10,2)` | `NOT NULL` | — | Calculated total (sum of items) |
| `deposit` | `DECIMAL(10,2)` | `NOT NULL` | `0.00` | Security deposit collected |
| `notes` | `TEXT` | `NULLABLE` | `NULL` | Free-form notes |
| `created_at` | `DATETIME` | `NOT NULL` | `CURRENT_TIMESTAMP` | Record creation |
| `updated_at` | `DATETIME` | `NOT NULL` | `CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP` | Last modification |

**Indexes**:
- `PRIMARY KEY (id)`
- `KEY ix_rentals_user_status (user_id, status)`
- `KEY ix_rentals_dates (start_date, end_date)`
- `KEY ix_rentals_id (id)`
- `FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE`

**Status Flow**:
```
pending → active → completed
    ↓         ↓
cancelled  overdue → completed (auto-complete on return)
```

**Business Rules**:
- `total_price` = SUM(`rental_items.total_price`) — computed at create/update
- `start_date` ≤ `end_date` enforced in application layer
- `actual_return_date` set by operator on return; triggers auto-complete job
- `deposit` refunded on `completed` (business logic in app)

---

## Table: `rental_items`

**Purpose**: Line items per rental — which computers, qty, price snapshot at rental time.

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| `id` | `INT` | `PK`, `AUTO_INCREMENT`, `NOT NULL` | — | Surrogate key |
| `rental_id` | `INT` | `FK → rentals.id`, `NOT NULL`, `INDEX` | — | Parent rental (CASCADE delete) |
| `computer_id` | `INT` | `FK → computers.id`, `NOT NULL`, `INDEX` | — | Rented computer (RESTRICT delete) |
| `quantity` | `INT` | `NOT NULL` | `1` | Qty of this computer model |
| `unit_price` | `DECIMAL(10,2)` | `NOT NULL` | — | Price/day at rental time (snapshot) |
| `total_price` | `DECIMAL(10,2)` | `NOT NULL` | — | `unit_price * quantity * days` |
| `created_at` | `DATETIME` | `NOT NULL` | `CURRENT_TIMESTAMP` | Record creation |

**Indexes**:
- `PRIMARY KEY (id)`
- `KEY ix_rental_items_rental (rental_id)`
- `KEY ix_rental_items_computer (computer_id)`
- `KEY ix_rental_items_id (id)`
- `FOREIGN KEY (rental_id) REFERENCES rentals(id) ON DELETE CASCADE`
- `FOREIGN KEY (computer_id) REFERENCES computers(id) ON DELETE RESTRICT`

**Business Rules**:
- `unit_price` = `computer.rental_price_per_day` **at time of rental** (price snapshot)
- `total_price` = `unit_price * quantity * DATEDIFF(rental.end_date, rental.start_date)`
- `computer_id` RESTRICT delete → preserves rental history if computer decommissioned
- One rental can have multiple items (different computers)

---

## Table: `notifications`

**Purpose**: In-app + Telegram notification log. Sent status tracking for idempotent retries.

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| `id` | `INT` | `PK`, `AUTO_INCREMENT`, `NOT NULL` | — | Surrogate key |
| `user_id` | `INT` | `FK → users.id`, `NOT NULL`, `INDEX` | — | Recipient operator |
| `type` | `ENUM('email','telegram','in_app')` | `NOT NULL` | — | Delivery channel |
| `title` | `VARCHAR(255)` | `NOT NULL` | — | Notification title |
| `message` | `TEXT` | `NOT NULL` | — | Full message body |
| `status` | `ENUM('pending','sent','failed')` | `NOT NULL` | `'pending'` | Delivery status |
| `related_rental_id` | `INT` | `FK → rentals.id`, `NULLABLE`, `INDEX` | `NULL` | Link to rental (SET NULL) |
| `sent_at` | `DATETIME` | `NULLABLE` | `NULL` | Timestamp when sent |
| `error_message` | `TEXT` | `NULLABLE` | `NULL` | Last error if failed |
| `created_at` | `DATETIME` | `NOT NULL` | `CURRENT_TIMESTAMP` | Record creation |

**Indexes**:
- `PRIMARY KEY (id)`
- `KEY ix_notifications_user_status (user_id, status)`
- `KEY ix_notifications_created (created_at)`
- `KEY ix_notifications_rental (related_rental_id)`
- `KEY ix_notifications_id (id)`
- `FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE`
- `FOREIGN KEY (related_rental_id) REFERENCES rentals(id) ON DELETE SET NULL`

**Business Rules**:
- `status='pending'` → picked up by scheduler hourly job
- `status='sent'` → `sent_at` populated, idempotent guard
- `status='failed'` → `error_message` logged, retry next scheduler run
- Unique per `(user_id, related_rental_id, type)` enforced in app layer

---

## Table: `schedules`

**Purpose**: Calendar bookings / maintenance windows per computer. Supports recurring (RRULE).

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| `id` | `INT` | `PK`, `AUTO_INCREMENT`, `NOT NULL` | — | Surrogate key |
| `name` | `VARCHAR(255)` | `NOT NULL` | — | Event name (e.g. "Maintenance", "Reserved for Client X") |
| `description` | `TEXT` | `NULLABLE` | `NULL` | Details |
| `computer_id` | `INT` | `FK → computers.id`, `NOT NULL`, `INDEX` | — | Target computer (CASCADE delete) |
| `start_time` | `DATETIME` | `NOT NULL`, `INDEX` | — | Start (UTC) |
| `end_time` | `DATETIME` | `NOT NULL`, `INDEX` | — | End (UTC) |
| `is_recurring` | `BOOLEAN` | `NOT NULL` | `FALSE` | Repeats per RRULE |
| `recurrence_rule` | `VARCHAR(500)` | `NULLABLE` | `NULL` | RFC 5545 RRULE (e.g. `FREQ=WEEKLY;BYDAY=MO,WE,FR`) |
| `is_active` | `BOOLEAN` | `NOT NULL` | `TRUE` | Enable/disable |
| `created_at` | `DATETIME` | `NOT NULL` | `CURRENT_TIMESTAMP` | Record creation |
| `updated_at` | `DATETIME` | `NOT NULL` | `CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP` | Last modification |

**Indexes**:
- `PRIMARY KEY (id)`
- `KEY ix_schedules_computer_time (computer_id, start_time, end_time)`
- `KEY ix_schedules_id (id)`
- `FOREIGN KEY (computer_id) REFERENCES computers(id) ON DELETE CASCADE`

**Business Rules**:
- Overlap detection: `start_time < existing.end_time AND end_time > existing.start_time`
- Recurring schedules expanded in application layer (not materialized)
- Used by frontend calendar (react-big-calendar) and rental conflict check

---

## Enum Reference (MySQL Native)

```sql
-- RoleEnum
CREATE TYPE roleenum AS ENUM ('admin', 'staff', 'customer');

-- RentalStatusEnum
CREATE TYPE rentalstatusenum AS ENUM ('pending', 'active', 'completed', 'cancelled', 'overdue');

-- NotificationTypeEnum
CREATE TYPE notificationtypeenum AS ENUM ('email', 'telegram', 'in_app');

-- NotificationStatusEnum
CREATE TYPE notificationstatusenum AS ENUM ('pending', 'sent', 'failed');
```

> Note: SQLAlchemy creates these as `ENUM` columns inline; MySQL stores as `ENUM` type.

---

## Component Type Vocabulary (Controlled)

| Value | Description | Example |
|-------|-------------|---------|
| `monitor` | Display | Dell 24" P2419H |
| `keyboard` | Keyboard | Logitech K380 |
| `mouse` | Mouse | Logitech MX Master 3 |
| `headset` | Headset | HyperX Cloud II |
| `webcam` | Webcam | Logitech C920 |
| `cable` | Cables/Adapters | HDMI, USB-C hub |
| `other` | Miscellaneous | Laptop stand, cooling pad |

---

## Rental Pricing Formula

```
days = DATEDIFF(rental.end_date, rental.start_date)
IF days <= 0 THEN days = 1

per_item_total = rental_item.unit_price * rental_item.quantity * days
rental.total_price = SUM(per_item_total) over all rental_items
```

> `unit_price` is snapped from `computer.rental_price_per_day` at rental creation.

---

## Soft Delete Pattern (Future)

For audit compliance, consider adding to all tables:
```sql
deleted_at DATETIME NULL DEFAULT NULL,
INDEX ix_{table}_deleted (deleted_at)
```
Application queries: `WHERE deleted_at IS NULL`