# Rental Computer Management System

Sistem manajemen sewa komputer untuk rental shop — tracking rental, komponen, jadwal reminder, dan notifikasi otomatis.

## Stack
- **Backend**: FastAPI + SQLAlchemy 2.0 + MySQL 8.0 + APScheduler
- **Frontend**: React 18 + TypeScript + Tailwind + Vite + TanStack Query
- **Infra**: Docker Compose (MySQL, Redis, Backend, Frontend, Telegram Bot)
- **CI/CD**: GitHub Actions (lint, test, contract, e2e, docker)

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 20+ (for local frontend dev)
- Python 3.11+ (for local backend dev)

### Environment
Copy `.env.example` to `.env` and fill values:
```bash
cp .env.example .env
# Edit .env with your values
```

Required vars:
- `MYSQL_ROOT_PASSWORD`, `MYSQL_DATABASE`, `MYSQL_USER`, `MYSQL_PASSWORD`
- `SECRET_KEY` (min 32 chars)
- `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` (optional for dev)

### Run with Docker Compose (Recommended)
```bash
docker compose up --build
```
Services:
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs / http://localhost:8000/redoc
- MySQL: localhost:3306
- Redis: localhost:6379

### Local Development

#### Backend
```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # adjust DATABASE_URL to local MySQL
alembic upgrade head
python seed.py  # optional dev data
uvicorn app.main:app --reload
```

#### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Testing

#### Backend
```bash
cd backend
pytest --cov=app --cov-report=term-missing
```

#### Frontend
```bash
cd frontend
npm run test        # unit (Vitest)
npm run test:e2e    # Playwright (needs services running)
```

#### Contract
```bash
pip install schemathesis
schemathesis run http://localhost:8000/openapi.json --base-url=http://localhost:8000
```

#### Load (smoke)
```bash
cd backend
locust -f tests/load_test.py --host=http://localhost:8000
```

### Project Structure
```
rental-system/
├── .github/workflows/ci.yml      # CI pipeline
├── backend/
│   ├── app/
│   │   ├── api/v1/               # Routes (auth, computers, components, rentals, reminders, notifications)
│   │   ├── core/                 # Config, DB, security
│   │   ├── models/               # SQLAlchemy models
│   │   ├── schemas/              # Pydantic schemas
│   │   ├── services/             # Business logic (telegram, reminders)
│   │   ├── tasks/                # APScheduler jobs
│   │   └── main.py               # FastAPI app
│   ├── alembic/                  # Migrations
│   ├── tests/                    # pytest fixtures + tests
│   ├── seed.py                   # Dev seed data
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── api/                  # Generated from OpenAPI
│   │   ├── components/           # UI, forms, layout, calendar
│   │   ├── pages/                # Page components
│   │   ├── hooks/                # Custom hooks
│   │   └── stores/               # Zustand stores
│   ├── tests/                    # Vitest + Playwright
│   └── Dockerfile
├── bot/                          # Telegram bot service
├── docker-compose.yml            # Full stack
├── TEST_PLAN.md                  # QA test plan
├── ARCHITECTURE.md               # ADR + ERD
└── README.md
```

### API Endpoints (v1)

| Resource | Endpoints |
|----------|-----------|
| Auth | `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `GET /auth/me` |
| Users | `GET /users`, `GET /users/{id}`, `PUT /users/{id}` |
| Computers | `POST /computers`, `GET /computers`, `GET /computers/{id}`, `PUT /computers/{id}`, `DELETE /computers/{id}` |
| Components | `POST /components`, `GET /components`, `GET /components/{id}`, `PUT /components/{id}`, `DELETE /components/{id}` |
| Rentals | `POST /rentals`, `GET /rentals`, `GET /rentals/{id}`, `POST /rentals/{id}/start`, `POST /rentals/{id}/complete`, `POST /rentals/{id}/cancel` |
| Reminders | `GET /reminders/pending` |
| Notifications | `GET /notifications`, `GET /notifications/unread-count`, `POST /notifications/{id}/read` |

### Scheduler Jobs
- **Daily 08:00 (Asia/Jakarta)**: Check rentals ending in 7/3/1/0 days → create in-app notification + Telegram message
- **Hourly**: Process pending reminders → send Telegram → mark sent

### Telegram Bot
Bot receives rental expiry notifications. Set `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` in `.env`.

### License
Internal use only.
