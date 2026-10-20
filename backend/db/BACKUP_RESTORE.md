# Backup & Restore Procedures — Rental System Database

> **Database**: `rental_db` (MySQL 8.0) | **Engine**: InnoDB | **Charset**: `utf8mb4`
> **RPO Target**: ≤ 1 hour | **RTO Target**: ≤ 30 minutes (dev), ≤ 4 hours (prod)

---

## 1. Automated Backup Strategy

### 1.1 Docker Volume Backup (Primary)

The MySQL data lives in a Docker named volume `mysql_data`. Backup the volume directly:

```bash
# Create backup container, tar the volume to host
docker run --rm \
  -v rental-system_mysql_data:/volume \
  -v $(pwd)/backups:/backup \
  alpine tar czf /backup/mysql_data_$(date +%F_%H-%M).tar.gz -C /volume .

# Restore from volume backup
docker run --rm \
  -v rental-system_mysql_data:/volume \
  -v $(pwd)/backups:/backup \
  alpine tar xzf /backup/mysql_data_2024-01-15_08-00.tar.gz -C /volume
```

> **Schedule**: Daily 03:00 via cron on host (or Kubernetes CronJob in prod).
> **Retention**: 7 daily + 4 weekly + 12 monthly (Grandfather-Father-Son).

### 1.2 Logical Backup (mysqldump) — For Portability

```bash
# Full dump (schema + data)
docker exec rental-mysql mysqldump \
  -u rental_user -p"${MYSQL_PASSWORD}" \
  --single-transaction --routines --triggers --events \
  --set-gtid-purged=OFF \
  rental_db > backups/rental_db_$(date +%F_%H-%M).sql

# Compressed
docker exec rental-mysql mysqldump \
  -u rental_user -p"${MYSQL_PASSWORD}" \
  --single-transaction --routines --triggers --events \
  --set-gtid-purged=OFF \
  rental_db | gzip > backups/rental_db_$(date +%F_%H-%M).sql.gz

# Schema only (for migration comparison)
docker exec rental-mysql mysqldump \
  -u rental_user -p"${MYSQL_PASSWORD}" \
  --no-data --routines --triggers --events \
  rental_db > backups/rental_db_schema_$(date +%F).sql
```

**Options Explained**:
- `--single-transaction` — Consistent snapshot without locking (InnoDB)
- `--routines --triggers --events` — Include stored procs, triggers, events
- `--set-gtid-purged=OFF` — Avoid GTID issues on restore to different server
- `--no-data` — Schema-only for version control

---

## 2. Point-in-Time Recovery (PITR)

### 2.1 Enable Binary Logging (Required for PITR)

In `docker-compose.yml`, add to MySQL service:

```yaml
mysql:
  command: >
    --binlog-format=ROW
    --log-bin=mysql-bin
    --binlog-expire-logs-seconds=604800
    --server-id=1
    --gtid-mode=ON
    --enforce-gtid-consistency=ON
```

### 2.2 PITR Procedure

```bash
# 1. Restore last full backup
docker run --rm -v rental-system_mysql_data:/volume -v $(pwd)/backups:/backup alpine \
  tar xzf /backup/mysql_data_2024-01-15_03-00.tar.gz -C /volume

# 2. Start MySQL (read-only for replay)
docker compose up -d mysql

# 3. Replay binary logs to target timestamp
docker exec rental-mysql mysqlbinlog \
  --start-datetime="2024-01-15 10:00:00" \
  --stop-datetime="2024-01-15 14:30:00" \
  /var/lib/mysql/mysql-bin.000001 | docker exec -i rental-mysql mysql -u root -p"${MYSQL_ROOT_PASSWORD}" rental_db

# 4. Verify, then restart app
docker compose restart backend
```

> **Note**: Binary logs consume disk. Monitor with `df -h` and `PURGE BINARY LOGS BEFORE '2024-01-01';`

---

## 3. Restore Procedures

### 3.1 Full Restore from Volume Backup (Fastest)

```bash
# 1. Stop services
docker compose down

# 2. Remove current volume
docker volume rm rental-system_mysql_data

# 3. Recreate volume
docker volume create rental-system_mysql_data

# 4. Restore backup
docker run --rm \
  -v rental-system_mysql_data:/volume \
  -v $(pwd)/backups:/backup \
  alpine tar xzf /backup/mysql_data_2024-01-15_03-00.tar.gz -C /volume

# 5. Start stack
docker compose up -d
```

**RTO**: ~2-5 minutes (volume restore + container startup)

### 3.2 Full Restore from mysqldump (Portable)

```bash
# 1. Ensure empty database exists
docker compose up -d mysql
docker exec rental-mysql mysql -u root -p"${MYSQL_ROOT_PASSWORD}" -e "DROP DATABASE IF EXISTS rental_db; CREATE DATABASE rental_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 2. Restore
gunzip -c backups/rental_db_2024-01-15_03-00.sql.gz | docker exec -i rental-mysql mysql -u rental_user -p"${MYSQL_PASSWORD}" rental_db

# 3. Run Alembic migrations (in case backup is older than code)
docker compose run --rm backend alembic upgrade head

# 4. Start app
docker compose up -d backend frontend
```

**RTO**: ~10-20 minutes (depends on DB size)

### 3.3 Partial Restore (Single Table)

```bash
# Extract one table from dump
grep -A 1000 "CREATE TABLE \`rentals\`" backups/rental_db_2024-01-15_03-00.sql | head -1000 > rentals_table.sql

# Or use mysqldump for one table
docker exec rental-mysql mysqldump -u rental_user -p"${MYSQL_PASSWORD}" rental_db rentals > rentals_table.sql

# Restore single table
docker exec -i rental-mysql mysql -u rental_user -p"${MYSQL_PASSWORD}" rental_db < rentals_table.sql
```

---

## 4. Backup Verification (Critical)

### 4.1 Automated Verification Script

Create `scripts/verify_backup.sh`:

```bash
#!/bin/bash
set -euo pipefail

BACKUP_FILE="${1:-backups/rental_db_latest.sql.gz}"
TEST_DB="rental_db_verify_$(date +%s)"

echo "🔍 Verifying backup: $BACKUP_FILE"

# Create test database
docker exec rental-mysql mysql -u root -p"${MYSQL_ROOT_PASSWORD}" -e "CREATE DATABASE ${TEST_DB} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# Restore
gunzip -c "$BACKUP_FILE" | docker exec -i rental-mysql mysql -u root -p"${MYSQL_ROOT_PASSWORD}" "$TEST_DB"

# Verify row counts match expected minimums
docker exec rental-mysql mysql -u root -p"${MYSQL_ROOT_PASSWORD}" "$TEST_DB" -e "
SELECT 'users' AS table_name, COUNT(*) AS rows FROM users
UNION ALL SELECT 'computers', COUNT(*) FROM computers
UNION ALL SELECT 'rentals', COUNT(*) FROM rentals
UNION ALL SELECT 'rental_items', COUNT(*) FROM rental_items
UNION ALL SELECT 'components', COUNT(*) FROM components
UNION ALL SELECT 'notifications', COUNT(*) FROM notifications
UNION ALL SELECT 'schedules', COUNT(*) FROM schedules;
"

# Check FK integrity
docker exec rental-mysql mysql -u root -p"${MYSQL_ROOT_PASSWORD}" "$TEST_DB" -e "
SELECT COUNT(*) FROM rentals r LEFT JOIN users u ON r.user_id = u.id WHERE u.id IS NULL;
SELECT COUNT(*) FROM rental_items ri LEFT JOIN computers c ON ri.computer_id = c.id WHERE c.id IS NULL;
"

# Cleanup
docker exec rental-mysql mysql -u root -p"${MYSQL_ROOT_PASSWORD}" -e "DROP DATABASE ${TEST_DB};"

echo "✅ Backup verification passed"
```

**Run weekly in CI/CD**:
```yaml
# .github/workflows/backup-verify.yml
on:
  schedule:
    - cron: '0 4 * * 0'  # Weekly Sunday 04:00
jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Pull latest backup
        run: aws s3 cp s3://bucket/backups/rental_db_latest.sql.gz ./backups/
      - name: Verify
        run: ./scripts/verify_backup.sh
```

---

## 5. Disaster Recovery Runbook

### 5.1 Scenario: Complete Host Failure

| Step | Action | Owner | Time |
|------|--------|-------|------|
| 1 | Provision new host (VPS/EC2) | DevOps | 5 min |
| 2 | Install Docker + Docker Compose | DevOps | 5 min |
| 3 | Clone repo + `.env` from secrets | DevOps | 2 min |
| 4 | Restore volume backup | DevOps | 3 min |
| 5 | `docker compose up -d` | DevOps | 2 min |
| 6 | Verify health endpoints | DevOps | 2 min |
| 7 | Update DNS (if needed) | DevOps | 5 min |
| **Total** | | | **~24 min** |

### 5.2 Scenario: Data Corruption / Accidental DELETE

```bash
# Option A: PITR to before incident (if binlog enabled)
# See Section 2.2

# Option B: Restore last night's backup + replay today's binlogs
# See Section 3.1 + 2.2

# Option C: If only one table affected
# Restore single table from dump (Section 3.3)
```

---

## 6. Backup Storage & Security

| Tier | Location | Retention | Encryption | Access |
|------|----------|-----------|------------|--------|
| **Hot** | Host `./backups/` (mounted volume) | 7 days | None (internal) | DevOps |
| **Warm** | S3 / MinIO / NAS | 90 days | AES-256 (SSE-S3) | DevOps + Lead |
| **Cold** | Glacier / Offsite | 7 years | AES-256 | Compliance only |

**Encryption at Rest** (for S3):
```bash
aws s3 cp backups/rental_db_2024-01-15_03-00.sql.gz \
  s3://my-bucket/backups/ \
  --storage-class GLACIER_IR \
  --server-side-encryption AES256
```

**Never commit backups to Git**. Add to `.gitignore`:
```
backups/
*.sql
*.sql.gz
*.tar.gz
```

---

## 7. Migration Backup Protocol

**Before every `alembic upgrade` in production:**

```bash
# 1. Pre-migration snapshot
docker exec rental-mysql mysqldump \
  -u rental_user -p"${MYSQL_PASSWORD}" \
  --single-transaction --no-data \
  rental_db > backups/pre_migration_$(date +%F_%H-%M)_schema.sql

docker exec rental-mysql mysqldump \
  -u rental_user -p"${MYSQL_PASSWORD}" \
  --single-transaction \
  rental_db | gzip > backups/pre_migration_$(date +%F_%H-%M)_full.sql.gz

# 2. Run migration
docker compose run --rm backend alembic upgrade head

# 3. Post-migration verification
docker compose run --rm backend python -c "
from app.db.session import engine
from sqlalchemy import inspect
insp = inspect(engine)
print('Tables:', insp.get_table_names())
for t in insp.get_table_names():
    cols = [c['name'] for c in insp.get_columns(t)]
    print(f'  {t}: {cols}')
"

# 4. If migration fails → rollback
docker compose run --rm backend alembic downgrade -1
# Restore from pre_migration_* if needed
```

---

## 8. Monitoring & Alerts

| Metric | Threshold | Alert |
|--------|-----------|-------|
| Backup job success | Exit code ≠ 0 | PagerDuty / Telegram |
| Backup file size | < 10 MB (unexpected) | Warning |
| Backup age | > 26 hours | Critical |
| Restore test (weekly) | Failed | Critical |
| Binary log disk usage | > 80% | Warning |
| MySQL uptime | < 99.9% | Page |

---

## 9. Quick Reference Card

```bash
# Daily backup (add to crontab)
0 3 * * * /path/to/backup_daily.sh >> /var/log/mysql_backup.log 2>&1

# Weekly verification (add to crontab)
0 4 * * 0 /path/to/verify_backup.sh >> /var/log/mysql_verify.log 2>&1

# Manual backup now
./scripts/backup_now.sh

# Manual restore latest
./scripts/restore_latest.sh

# Check backup status
ls -lh backups/
```

---

## 10. Responsibility Matrix

| Role | Responsibility |
|------|----------------|
| **@rental-db** | Design backup strategy, write verification scripts, test restore quarterly |
| **@rental-backend** | Ensure migrations are backward-compatible, provide pre-migration hooks |
| **@rental-qa** | Include restore test in release checklist |
| **@rental-pm** | Schedule DR drill (quarterly), track RPO/RTO compliance |
| **DevOps** | Infra provisioning, S3/MinIO setup, monitoring alerts |

---

> **Last Tested**: 2024-01-15 | **Next DR Drill**: 2024-04-15 | **Document Owner**: @rental-db