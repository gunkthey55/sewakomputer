# Backend AppSewa - Background Service

Standalone daemon service bernama **"backend appsewa"** untuk menjalankan scheduler & notifikasi otomatis sistem sewa komputer.

## Fitur

| Job | Schedule | Deskripsi |
|-----|----------|-----------|
| **Daily Expiring Check** | 08:00 setiap hari | Cek sewa yang akan habis 1-7 hari, kirim reminder |
| **Hourly Today Check** | Setiap jam | Cek sewa yang habis hari ini, kirim reminder |
| **Overdue Check** | Setiap 30 menit | Cek sewa overdue, update status & kirim notifikasi |
| **Auto Complete** | Setiap jam | Auto-complete sewa yang sudah dikembalikan |

## Notifikasi Multi-Channel
- 📧 **Email** (SMTP/Gmail)
- 📱 **Telegram Bot** (kirim ke chat_id user)
- 🔔 **In-App WebSocket** (real-time ke frontend)

## Struktur
```
backend-appsewa/
├── main.py              # Service entry point
├── requirements.txt     # Dependencies
├── Dockerfile           # Container image
├── .env.example         # Environment template
└── README.md            # This file
```

## Quick Start

### 1. Konfigurasi Environment
```bash
cd C:/Users/Ygs Corp/rental-system
cp .env.example .env
# Edit .env dengan kredensial asli:
# - SECRET_KEY (generate: python -c "import secrets; print(secrets.token_urlsafe(32))")
# - SMTP_* (Gmail App Password)
# - TELEGRAM_BOT_TOKEN (dari @BotFather)
# - TELEGRAM_CHAT_ID (chat ID user/group)
```

### 2. Jalankan dengan Docker (Production)
```bash
# Build & start semua service termasuk appsewa
docker compose up -d --build

# Atau hanya appsewa
docker compose up -d --build appsewa
```

### 3. Jalankan Development (Hot Reload)
```bash
docker compose -f docker-compose.yml -f docker-compose.override.yml up -d --build appsewa
```

### 4. Jalankan Manual (Tanpa Docker)
```bash
cd backend-appsewa
pip install -r requirements.txt
cp .env.example .env
# Edit .env
python main.py
```

## Management Commands

```bash
# Lihat logs
docker compose logs -f appsewa

# Restart service
docker compose restart appsewa

# Stop service
docker compose stop appsewa

# Masuk container
docker compose exec appsewa bash
```

## Arsitektur
```
┌─────────────────┐     ┌──────────────┐
│   MySQL DB      │ ←── │  backend-    │
│  (rental_system)│     │  appsewa     │
└─────────────────┘     └──────────────┘
                                │
                    ┌───────────┼───────────┐
                    ▼           ▼           ▼
               ┌─────────┐ ┌──────────┐ ┌──────────┐
               │  Email  │ │ Telegram │ │ WebSocket│
               │  (SMTP) │ │   Bot    │ │ (In-App) │
               └─────────┘ └──────────┘ └──────────┘
```

## Service Lifecycle
1. **Startup** → Init DB connection → Setup scheduler → Start jobs
2. **Running** → APScheduler executes jobs on schedule
3. **Shutdown** (SIGINT/SIGTERM) → Stop scheduler → Close DB → Exit

## Logs
- Console: stdout/stderr
- File: `backend-appsewa.log` (di working directory)
- Docker: `docker compose logs appsewa`

## PID File
Lokasi: `/var/run/backend-appsewa.pid` (di container) atau sesuai `SERVICE_PID_FILE` env var.

## Dependencies
Service ini **menggunakan kode backend yang sudah ada** (`backend/app/services/scheduler.py`, `backend/app/services/notification.py`) via import path. Pastikan backend code tersedia di `../backend`.