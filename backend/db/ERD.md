# Entity Relationship Diagram (ERD) — Rental System Database

> **Source of Truth**: This ERD reflects the **actual implemented schema** in `alembic/versions/001_initial_migration.py` and `app/models/__init__.py`.
> Generated: 2024-01-15 | MySQL 8.0 | SQLAlchemy 2.0

---

## Mermaid ER Diagram

```mermaid
erDiagram
    USER ||--o{ RENTAL : "creates"
    USER ||--o{ NOTIFICATION : receives
    USER {
        int id PK
        string email UK "unique, index"
        string hashed_password "bcrypt"
        string full_name
        string phone
        enum role "admin|staff|customer"
        boolean is_active
        string telegram_chat_id "nullable, for bot notifications"
        datetime created_at
        datetime updated_at
    }

    COMPUTER ||--o{ COMPONENT : "has parts"
    COMPUTER ||--o{ RENTAL_ITEM : "rented via"
    COMPUTER ||--o{ SCHEDULE : "scheduled in"
    COMPUTER {
        int id PK
        string name "display name"
        string description "nullable"
        string serial_number UK "unique, index"
        string brand
        string model
        datetime purchase_date "nullable"
        decimal purchase_price "nullable, 10,2"
        decimal rental_price_per_day "10,2"
        decimal rental_price_per_week "10,2"
        decimal rental_price_per_month "10,2"
        boolean is_available "default true, index"
        boolean is_active "default true, index"
        string location "nullable"
        datetime created_at
        datetime updated_at
    }

    COMPONENT }|--|| COMPUTER : "belongs to"
    COMPONENT {
        int id PK
        int computer_id FK "CASCADE delete, index"
        string name "component name"
        string component_type "e.g. monitor, keyboard, mouse, headset"
        string brand "nullable"
        string model "nullable"
        string serial_number "nullable"
        string specifications "nullable, free text"
        datetime created_at
        datetime updated_at
    }

    RENTAL ||--o{ RENTAL_ITEM : "contains"
    RENTAL ||--o{ NOTIFICATION : "generates"
    RENTAL {
        int id PK
        int user_id FK "CASCADE delete, index"
        enum status "pending|active|completed|cancelled|overdue"
        datetime start_date
        datetime end_date
        datetime actual_return_date "nullable"
        decimal total_price "10,2"
        decimal deposit "10,2, default 0"
        string notes "nullable"
        datetime created_at
        datetime updated_at
    }

    RENTAL_ITEM }|--|| RENTAL : "belongs to"
    RENTAL_ITEM }|--|| COMPUTER : "references"
    RENTAL_ITEM {
        int id PK
        int rental_id FK "CASCADE delete, index"
        int computer_id FK "RESTRICT delete, index"
        int quantity "default 1"
        decimal unit_price "10,2"
        decimal total_price "10,2"
        datetime created_at
    }

    NOTIFICATION }|--|| USER : "sent to"
    NOTIFICATION }o--|| RENTAL : "related to"
    NOTIFICATION {
        int id PK
        int user_id FK "CASCADE delete, index"
        enum type "email|telegram|in_app"
        string title
        string message
        enum status "pending|sent|failed"
        int related_rental_id FK "SET NULL, index"
        datetime sent_at "nullable"
        string error_message "nullable"
        datetime created_at
    }

    SCHEDULE }|--|| COMPUTER : "for"
    SCHEDULE {
        int id PK
        string name
        string description "nullable"
        int computer_id FK "CASCADE delete, index"
        datetime start_time
        datetime end_time
        boolean is_recurring "default false"
        string recurrence_rule "nullable, RRULE format"
        boolean is_active "default true"
        datetime created_at
        datetime updated_at
    }
```

---

## Relationship Summary

| Parent | Child | Cardinality | On Delete | Notes |
|--------|-------|-------------|-----------|-------|
| `users` | `rentals` | 1 : N | CASCADE | Operator creates rentals |
| `users` | `notifications` | 1 : N | CASCADE | In-app/Telegram notifications |
| `computers` | `components` | 1 : N | CASCADE | Physical parts of a computer unit |
| `computers` | `rental_items` | 1 : N | RESTRICT | Prevent delete if rented |
| `computers` | `schedules` | 1 : N | CASCADE | Calendar bookings |
| `rentals` | `rental_items` | 1 : N | CASCADE | Line items per rental |
| `rentals` | `notifications` | 1 : N | SET NULL | Link rental to notification |
| `rentals` | `users` | N : 1 | — | `user_id` = operator who created |

---

## Index Strategy

| Table | Index | Columns | Type | Purpose |
|-------|-------|---------|------|---------|
| `users` | `ix_users_email` | `email` | UNIQUE | Login lookup |
| `users` | `ix_users_id` | `id` | BTREE | PK lookup |
| `computers` | `ix_computers_serial_number` | `serial_number` | UNIQUE | Asset tracking |
| `computers` | `ix_computers_brand_model` | `brand, model` | BTREE | Filter by spec |
| `computers` | `ix_computers_available_active` | `is_available, is_active` | BTREE | Available inventory query |
| `components` | `ix_components_computer_type` | `computer_id, component_type` | BTREE | Parts per computer |
| `rentals` | `ix_rentals_user_status` | `user_id, status` | BTREE | Operator's rentals by status |
| `rentals` | `ix_rentals_dates` | `start_date, end_date` | BTREE | Date range queries |
| `rental_items` | `ix_rental_items_rental` | `rental_id` | BTREE | Items per rental |
| `rental_items` | `ix_rental_items_computer` | `computer_id` | BTREE | Computer rental history |
| `notifications` | `ix_notifications_user_status` | `user_id, status` | BTREE | Unread badge query |
| `notifications` | `ix_notifications_created` | `created_at` | BTREE | Time-ordered list |
| `notifications` | `ix_notifications_rental` | `related_rental_id` | BTREE | Notifications per rental |
| `schedules` | `ix_schedules_computer_time` | `computer_id, start_time, end_time` | BTREE | Conflict detection |

---

## Enum Definitions (MySQL)

```sql
-- Users
CREATE TYPE roleenum AS ENUM ('admin', 'staff', 'customer');

-- Rentals
CREATE TYPE rentalstatusenum AS ENUM ('pending', 'active', 'completed', 'cancelled', 'overdue');

-- Notifications
CREATE TYPE notificationtypeenum AS ENUM ('email', 'telegram', 'in_app');
CREATE TYPE notificationstatusenum AS ENUM ('pending', 'sent', 'failed');
```

---

## Key Design Decisions

1. **`rental_items` links to `computers`, not `components`** — A rental rents whole computer units (with their components). Components are tracked as parts of a computer for inventory/detail purposes.

2. **`components` are tied to a `computer` (CASCADE)** — If a computer is deleted, its component records are removed. Components cannot be rented independently in MVP.

3. **`rental_items.computer_id` uses RESTRICT** — Prevents deleting a computer that has rental history (audit trail).

4. **`notifications.related_rental_id` uses SET NULL** — Notification preserved even if rental is deleted (soft delete pattern).

5. **`users.role` default = 'customer'** — MVP only needs `admin`; `staff`/`customer` reserved for future multi-role.

6. **All timestamps use `CURRENT_TIMESTAMP` + `ON UPDATE`** — MySQL-native, no application timezone ambiguity.

6. **Timezone**: Application uses `Asia/Jakarta` (UTC+7); DB stores UTC. Conversion in app layer.

---

## Scheduler-Relevant Queries (EXPLAIN-friendly)

```sql
-- Daily 08:00: Rentals expiring in 1,3,7 days (T-1, T-3, T-7)
SELECT r.*, u.telegram_chat_id, u.email
FROM rentals r
JOIN users u ON r.user_id = u.id
WHERE r.status = 'active'
  AND r.end_date BETWEEN DATE_ADD(CURDATE(), INTERVAL 1 DAY) AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)
  AND DATE(r.end_date) IN (DATE_ADD(CURDATE(), INTERVAL 1 DAY),
                           DATE_ADD(CURDATE(), INTERVAL 3 DAY),
                           DATE_ADD(CURDATE(), INTERVAL 7 DAY));

-- Hourly: Rentals ending today
SELECT r.*, u.telegram_chat_id
FROM rentals r
JOIN users u ON r.user_id = u.id
WHERE r.status = 'active'
  AND DATE(r.end_date) = CURDATE();

-- Overdue check (every 30 min)
SELECT r.id
FROM rentals r
WHERE r.status = 'active'
  AND r.end_date < NOW();
```

> All queries use composite indexes: `ix_rentals_user_status`, `ix_rentals_dates`.