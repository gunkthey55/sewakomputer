# Computer Rental System - FastAPI Backend

A complete FastAPI backend for a computer rental management system with MySQL, JWT authentication, APScheduler for reminders, and multi-channel notifications.

## Features

- **Authentication & Authorization**: JWT with bcrypt password hashing, role-based access (Admin, Staff, Customer)
- **Computer Management**: CRUD for computers, components, availability tracking
- **Rental Management**: Full rental lifecycle (create, active, return, cancel, overdue)
- **Notifications**: Multi-channel (Email SMTP, Telegram Bot, In-app WebSocket)
- **Scheduling**: APScheduler for automated reminders (daily 08:00 for 1-7 days, hourly for today)
- **Database**: SQLAlchemy 2.0 with async MySQL, Alembic migrations
- **Configuration**: Pydantic Settings with .env support
- **Docker**: Dockerfile and docker-compose for easy deployment

## Project Structure

```
backend/
├── app/
│   ├── api/           # FastAPI routers
│   │   ├── auth.py    # Authentication endpoints
│   │   ├── users.py   # User management
│   │   ├── computers.py # Computer & component management
│   │   ├── rentals.py # Rental management
│   │   ├── notifications.py # Notifications & WebSocket
│   │   └── schedules.py # Schedule management
│   ├── core/          # Core configuration
│   │   └── config.py  # Pydantic Settings
│   ├── db/            # Database setup
│   │   └── session.py # Async session management
│   ├── models/        # SQLAlchemy 2.0 models
│   │   └── __init__.py
│   ├── schemas/       # Pydantic v2 schemas
│   │   └── __init__.py
│   ├── services/      # Business logic
│   │   ├── auth.py    # JWT & password handling
│   │   ├── user.py    # User service
│   │   ├── computer.py # Computer & component service
│   │   ├── rental.py  # Rental service
│   │   ├── notification.py # Notification service (Email, Telegram, WebSocket)
│   │   ├── notification_crud.py # Notification CRUD
│   │   ├── schedule.py # Schedule service
│   │   └── scheduler.py # APScheduler jobs
│   ├── main.py        # FastAPI app entry point
│   └── __init__.py
├── alembic/           # Database migrations
├── requirements.txt   # Python dependencies
├── Dockerfile         # Docker image
├── .env.example       # Environment template
└── .env              # Local environment (not in git)
```

## Quick Start

### Prerequisites

- Python 3.12+
- MySQL 8.0+
- Docker & Docker Compose (optional)

### Local Development

1. **Clone and navigate to backend**:
   ```bash
   cd backend
   ```

2. **Create virtual environment**:
   ```bash
   python -m venv venv
   source venv/bin/activate  # Windows: venv\Scripts\activate
   ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your settings
   ```

5. **Start MySQL** (or use Docker):
   ```bash
   docker-compose up -d mysql
   ```

6. **Run migrations**:
   ```bash
   alembic upgrade head
   ```

7. **Start the server**:
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

### Docker Deployment

```bash
# From project root
docker-compose up -d --build
```

## API Documentation

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## API Endpoints

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login (OAuth2 form)
- `POST /auth/refresh` - Refresh access token
- `POST /auth/change-password` - Change password
- `GET /auth/me` - Get current user info
- `PATCH /auth/me` - Update current user

### Users (Admin only)
- `GET /users` - List users with pagination
- `GET /users/{id}` - Get user by ID
- `POST /users` - Create user
- `PATCH /users/{id}` - Update user
- `DELETE /users/{id}` - Delete user
- `POST /users/{id}/activate` - Activate user
- `POST /users/{id}/deactivate` - Deactivate user

### Computers
- `GET /computers` - List computers with filters
- `GET /computers/{id}` - Get computer details
- `POST /computers` - Create computer (Staff+)
- `PATCH /computers/{id}` - Update computer (Staff+)
- `DELETE /computers/{id}` - Delete computer (Admin)
- `POST /computers/{id}/availability` - Set availability (Staff+)
- `GET /computers/{id}/components` - List components
- `POST /computers/{id}/components` - Add component (Staff+)
- `PATCH /computers/components/{id}` - Update component (Staff+)
- `DELETE /computers/components/{id}` - Delete component (Staff+)

### Rentals
- `GET /rentals` - List rentals with filters
- `GET /rentals/my/active` - Get current user's active rentals
- `GET /rentals/{id}` - Get rental details
- `POST /rentals` - Create rental
- `PATCH /rentals/{id}` - Update rental (Staff+)
- `POST /rentals/{id}/return` - Return rental (Staff+)
- `POST /rentals/{id}/cancel` - Cancel rental (Staff+)
- `DELETE /rentals/{id}` - Delete rental (Admin)

### Notifications
- `GET /notifications` - List notifications
- `GET /notifications/unread-count` - Get unread count
- `GET /notifications/{id}` - Get notification
- `POST /notifications` - Create notification (Staff+)
- `PATCH /notifications/{id}` - Update notification (Staff+)
- `POST /notifications/{id}/read` - Mark as read
- `POST /notifications/read-all` - Mark all as read
- `DELETE /notifications/{id}` - Delete notification
- `WS /notifications/ws` - WebSocket for real-time notifications

### Schedules
- `GET /schedules` - List schedules
- `GET /schedules/computer/{id}` - Get computer schedule for date range
- `GET /schedules/{id}` - Get schedule
- `POST /schedules` - Create schedule (Staff+)
- `PATCH /schedules/{id}` - Update schedule (Staff+)
- `DELETE /schedules/{id}` - Delete schedule (Admin)

## Scheduler Jobs

The following background jobs run automatically:

| Job | Schedule | Description |
|-----|----------|-------------|
| Daily Expiring Check | 08:00 daily | Check rentals expiring in 1-7 days |
| Hourly Today Check | Every hour | Check rentals due today |
| Overdue Check | Every 30 min | Mark overdue rentals, send notifications |
| Auto Complete | Every hour | Auto-complete returned rentals |

## Notification Channels

1. **Email** - SMTP (configured via .env)
2. **Telegram** - Bot API (requires TELEGRAM_BOT_TOKEN)
3. **In-App** - WebSocket real-time notifications

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| DATABASE_URL | MySQL connection string | mysql+aiomysql://root:password@localhost:3306/rental_system |
| SECRET_KEY | JWT secret key (min 32 chars) | Required |
| ALGORITHM | JWT algorithm | HS256 |
| ACCESS_TOKEN_EXPIRE_MINUTES | Access token TTL | 30 |
| REFRESH_TOKEN_EXPIRE_DAYS | Refresh token TTL | 7 |
| SMTP_HOST | SMTP server | smtp.gmail.com |
| SMTP_PORT | SMTP port | 587 |
| SMTP_USER | SMTP username | Required |
| SMTP_PASSWORD | SMTP password | Required |
| TELEGRAM_BOT_TOKEN | Telegram bot token | Optional |
| TELEGRAM_CHAT_ID | Default chat ID | Optional |
| SCHEDULER_TIMEZONE | Scheduler timezone | Asia/Kuala_Lumpur |

## Database Schema

- **users** - User accounts with roles
- **computers** - Computer inventory
- **components** - Computer components
- **rentals** - Rental orders
- **rental_items** - Items in each rental
- **notifications** - Notification log
- **schedules** - Computer schedules

## Testing

```bash
pytest --cov=app --cov-report=term-missing
```

## License

MIT