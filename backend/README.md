# Rental Computer Backend API

FastAPI backend for computer rental management system.

## Tech Stack

- **Framework**: FastAPI 0.115+
- **ORM**: SQLAlchemy 2.0 (async)
- **Database**: MySQL 8.0 (via aiomysql/pymysql)
- **Migrations**: Alembic
- **Auth**: JWT (python-jose) + bcrypt
- **Scheduler**: APScheduler
- **Notifications**: Telegram Bot API + In-app
- **Validation**: Pydantic v2
- **Logging**: structlog

## Project Structure

```
backend/
├── app/
│   ├── api/v1/           # API routes
│   │   ├── auth.py       # Authentication endpoints
│   │   ├── users.py      # User management
│   │   ├── computers.py  # Computer CRUD
│   │   ├── components.py # Component CRUD
│   │   ├── rentals.py    # Rental CRUD + workflow
│   │   ├── reminders.py  # Reminder management
│   │   ├── notifications.py # In-app notifications
│   │   └── health.py     # Health checks
│   ├── core/             # Core configuration
│   │   ├── config.py     # Settings (pydantic-settings)
│   │   ├── database.py   # DB engine & session
│   │   └── security.py   # JWT & password hashing
│   ├── models/           # SQLAlchemy models
│   ├── schemas/          # Pydantic schemas (request/response)
│   ├── services/         # Business logic
│   │   ├── telegram.py   # Telegram Bot integration
│   │   └── reminders.py  # Reminder & notification logic
│   ├── tasks/            # Background jobs
│   │   └── scheduler.py  # APScheduler jobs
│   └── main.py           # FastAPI app entry point
├── alembic/              # Database migrations
├── tests/                # Test files
├── Dockerfile
├── docker-compose.yml
├── requirements.txt
├── pyproject.toml
├── seed.py               # Development seed script
└── .env                  # Environment variables
```

## Quick Start

### Prerequisites

- Python 3.11+
- MySQL 8.0+
- Redis 7+

### Local Development

1. **Clone and navigate to backend:**
   ```bash
   cd backend
   ```

2. **Create virtual environment:**
   ```bash
   python -m venv venv
   source venv/bin/activate  # Windows: venv\Scripts\activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your settings
   ```

5. **Start MySQL and Redis (via Docker):**
   ```bash
   docker compose up -d mysql redis
   ```

6. **Run migrations:**
   ```bash
   alembic upgrade head
   ```

7. **Seed development data:**
   ```bash
   python seed.py
   ```

8. **Start the server:**
   ```bash
   uvicorn app.main:app --reload
   ```

   Server runs at `http://localhost:8000`
   - API Docs: `http://localhost:8000/docs`
   - ReDoc: `http://localhost:8000/redoc`
   - OpenAPI: `http://localhost:8000/openapi.json`

### Docker Compose (Full Stack)

```bash
docker compose up --build
```

This starts:
- Backend API (port 8000)
- MySQL (port 3306)
- Redis (port 6379)

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/register` | Register new user |
| POST | `/api/v1/auth/login` | Login (returns access + refresh tokens) |
| POST | `/api/v1/auth/refresh` | Refresh access token |
| GET | `/api/v1/auth/me` | Get current user profile |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/users` | List users |
| GET | `/api/v1/users/{id}` | Get user by ID |
| PATCH | `/api/v1/users/{id}` | Update user |
| DELETE | `/api/v1/users/{id}` | Delete user |

### Computers
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/computers` | Create computer |
| GET | `/api/v1/computers` | List computers |
| GET | `/api/v1/computers/{id}` | Get computer by ID |
| PATCH | `/api/v1/computers/{id}` | Update computer |
| DELETE | `/api/v1/computers/{id}` | Delete computer |

### Components
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/components` | Create component |
| GET | `/api/v1/components` | List components |
| GET | `/api/v1/components/categories` | Get all categories |
| GET | `/api/v1/components/{id}` | Get component by ID |
| PATCH | `/api/v1/components/{id}` | Update component |
| DELETE | `/api/v1/components/{id}` | Delete component |

### Rentals
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/rentals` | Create rental with components |
| GET | `/api/v1/rentals` | List rentals (with filters) |
| GET | `/api/v1/rentals/{id}` | Get rental by ID |
| PATCH | `/api/v1/rentals/{id}` | Update rental |
| POST | `/api/v1/rentals/{id}/start` | Start rental (draft → active) |
| POST | `/api/v1/rentals/{id}/complete` | Complete rental (active → completed) |
| POST | `/api/v1/rentals/{id}/cancel` | Cancel rental |
| DELETE | `/api/v1/rentals/{id}` | Delete rental (draft only) |

**Rental Filters:** `status`, `customer_name`, `start_date_from`, `start_date_to`, `end_date_from`, `end_date_to`, `page`, `page_size`, `sort_by`, `sort_order`

### Reminders
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/reminders` | Create reminder |
| GET | `/api/v1/reminders` | List reminders |
| GET | `/api/v1/reminders/pending` | Get pending reminders |
| GET | `/api/v1/reminders/{id}` | Get reminder by ID |
| PATCH | `/api/v1/reminders/{id}/mark-sent` | Mark reminder as sent |

### Notifications
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/notifications` | List notifications (with pagination) |
| GET | `/api/v1/notifications/unread-count` | Get unread count |
| PATCH | `/api/v1/notifications/{id}/read` | Mark as read |
| PATCH | `/api/v1/notifications/read-all` | Mark all as read |
| DELETE | `/api/v1/notifications/{id}` | Delete notification |

### Health
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/health` | Basic health check |
| GET | `/api/v1/health/db` | Database connectivity check |

## Background Jobs

The scheduler runs two jobs:

1. **Daily at 08:00 (Asia/Jakarta)**: Send reminders (T-7, T-3, T-1, T+0) + check overdue rentals
2. **Hourly at minute 0**: Check and send pending reminders

Reminders are sent via:
- **In-app**: Creates notification record
- **Telegram**: Sends message via Bot API (if configured)

## Development

### Running Tests

```bash
pytest tests/ -v --cov=app
```

### Linting & Formatting

```bash
ruff check .
ruff format .
mypy app/
```

### Creating Migrations

```bash
alembic revision --autogenerate -m "description"
alembic upgrade head
```

### Generating OpenAPI Spec

```bash
curl http://localhost:8000/openapi.json > openapi.json
```

## Default Credentials (after seeding)

- **Admin**: `admin@rental.local` / `admin123`
- **Operator**: `operator@rental.local` / `operator123`

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | MySQL connection string | Required |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379/0` |
| `SECRET_KEY` | JWT signing key | Required (32+ chars) |
| `ALGORITHM` | JWT algorithm | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Access token TTL | `30` |
| `REFRESH_TOKEN_EXPIRE_DAYS` | Refresh token TTL | `7` |
| `TELEGRAM_BOT_TOKEN` | Telegram bot token | Optional |
| `TELEGRAM_CHAT_ID` | Default chat ID for notifications | Optional |
| `CORS_ORIGINS` | Allowed CORS origins | `["http://localhost:5173"]` |
| `ENVIRONMENT` | Environment name | `development` |

## License

MIT