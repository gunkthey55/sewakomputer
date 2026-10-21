# Database Deliverables — Rental System

> **Location**: `backend/db/` | **Owner**: @rental-db | **Status**: Sprint 1 Complete

---

## 📁 Folder Structure

```
backend/db/
├── ERD.md                    # Entity Relationship Diagram (Mermaid)
├── DATA_DICTIONARY.md        # Complete column-level documentation
├── BACKUP_RESTORE.md         # Backup & restore procedures + runbook
├── seed.py                   # Development seed script
└── README.md                 # This file
```

---

## 📋 Deliverables Summary

| # | Deliverable | File | Status | Description |
|---|-------------|------|--------|-------------|
| **DB-1** | ERD | `ERD.md` | ✅ Done | Mermaid diagram + relationship summary + index strategy |
| **DB-1** | Data Dictionary | `DATA_DICTIONARY.md` | ✅ Done | 7 tables × all columns with types, constraints, business rules |
| **DB-2** | Migrations | `../alembic/versions/001_initial_migration.py` + `002_reminders_and_indexes.py` | ✅ Done | Initial schema + reminders table + scheduler-optimized indexes |
| **DB-1** | Seed Script | `seed.py` | ✅ Done | Idempotent dev data: users, computers, components, rentals, notifications, schedules |
| **DB-3** | Backup/Restore | `BACKUP_RESTORE.md` | ✅ Done | Volume backup, mysqldump, PITR, DR runbook, verification script |

---

## 🗄️ Schema Overview (7 Tables)

| Table | Purpose | Rows (Seed) |
|-------|---------|-------------|
| `users` | Operators + customers (auth + notifications) | 2 |
| `computers` | Rentable computer units (laptop/desktop) | 5 |
| `components` | Physical parts per computer (monitor, KB, mouse) | 12 |
| `rentals` | Rental transactions (header) | 6 |
| `rental_items` | Line items per rental (computer + qty + price) | 6 |
| `notifications` | In-app + Telegram notification log | 8 |
| `schedules` | Calendar bookings / maintenance windows | 3 |
| `reminders` | Scheduled reminder tracking (T-7, T-3, T-1, T+0) | — (created by scheduler) |

---

## 🔑 Key Design Decisions

1. **`rental_items` → `computers` (not `components`)** — Rent whole units; components are inventory detail
2. **`components` CASCADE delete with `computers`** — Parts belong to a unit
3. **`rental_items.computer_id` RESTRICT** — Preserve rental history if computer decommissioned
4. **`notifications.related_rental_id` SET NULL** — Keep notification log even if rental deleted
5. **Price snapshot** — `rental_items.unit_price` = `computer.rental_price_per_day` at rental time
6. **Reminders table (v2)** — Idempotent scheduler tracking with unique `(rental_id, days_before)`

---

## 🚀 Quick Start

### Run Migrations
```bash
cd backend
alembic upgrade head
```

### Seed Development Data
```bash
cd backend
python db/seed.py
# Or with fresh DB:
python db/seed.py --drop
```

### Verify Schema
```bash
cd backend
python -c "
from app.db.session import engine
from sqlalchemy import inspect
insp = inspect(engine)
for t in insp.get_table_names():
    cols = [c['name'] for c in insp.get_columns(t)]
    print(f'{t}: {cols}')
"
```

---

## 📊 Index Strategy for Scheduler Queries

| Query Pattern | Index | Table |
|---------------|-------|-------|
| Daily 08:00: rentals ending in 1/3/7 days | `ix_rentals_status_end_date (status, end_date)` | `rentals` |
| Hourly: active rentals ending today | `ix_rentals_status_end_date` (same) | `rentals` |
| Overdue check: active + past end_date | `ix_rentals_status_end_date` (same) | `rentals` |
| Unread notification badge | `ix_notifications_user_unread (user_id, status) WHERE status='pending'` | `notifications` |
| Pending reminders | `ix_reminders_pending (is_sent, remind_at)` | `reminders` |
| Schedule conflict detection | `ix_schedules_computer_active_time (computer_id, is_active, start_time, end_time)` | `schedules` |

---

## 🔄 Migration History

| Revision | Description | Tables Affected |
|----------|-------------|-----------------|
| `001` | Initial schema (7 tables) | users, computers, components, rentals, rental_items, notifications, schedules |
| `002` | Reminders table + scheduler indexes | reminders (new), rentals, notifications, schedules, components |

```bash
# View migration history
alembic history --verbose

# Downgrade if needed
alembic downgrade -1
```

---

## 🧪 Seed Data Details

**Users**: `admin@rental.local` (admin), `operator@rental.local` (staff) — password = email prefix + `123`

**Computers**: 5 units (Gaming PC, Workstation, 2× Office Laptop, Mini PC) with tiered pricing

**Rentals**: 6 rentals covering all statuses (pending, active×3, completed, cancelled) with date offsets for scheduler testing

**Notifications**: 8 notifications (pending in-app/telegram for active rentals, sent for completed/cancelled)

**Schedules**: Weekly maintenance (recurring), client reservation, meeting room setup

---

## 🛡️ Backup Quick Reference

```bash
# Volume backup (fastest restore)
docker run --rm -v rental-system_mysql_data:/volume -v $(pwd)/backups:/backup alpine tar czf /backup/mysql_data_$(date +%F_%H-%M).tar.gz -C /volume .

# Logical backup (portable)
docker exec rental-mysql mysqldump -u rental_user -p"${MYSQL_PASSWORD}" --single-transaction rental_db | gzip > backups/rental_db_$(date +%F_%H-%M).sql.gz

# Verify backup
./scripts/verify_backup.sh backups/rental_db_latest.sql.gz
```

---

## 📝 Next Steps (Post-Sprint 1)

- [ ] Add soft delete columns (`deleted_at`) to all tables for audit compliance
- [ ] Partition `notifications` by month (high volume)
- [ ] Add `CHECK` constraints: `end_date >= start_date`, `quantity > 0`, `total_price >= 0`
- [ ] Materialized view for revenue analytics
- [ ] Read replica for reporting queries

---

## 📞 Contact

| Role | Contact |
|------|---------|
| **@rental-db** | Schema design, migrations, performance, backup/restore |
| **@rental-backend** | ORM models, repositories, query optimization |
| **@rental-qa** | Data integrity tests, migration rollback tests |

---

> **Last Updated**: 2024-01-15 | **Sprint**: 1 | **Version**: 1.0.0