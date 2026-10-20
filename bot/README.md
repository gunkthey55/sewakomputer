# Computer Rental System - Telegram Bot

Standalone interactive Telegram bot for users to manage their computer rentals via chat.

## Features

- 🔐 **Login/Logout** - Authenticate with email/password (JWT tokens)
- 📋 **View Active Rentals** - List all active rentals with status
- 📦 **Rental Details** - View rental period, price, status
- 🔧 **Components** - See all components of rented computers
- 📅 **Calendar** - View rental schedule
- 🔔 **Notifications** - View recent notifications
- ⚙️ **Settings** - Configure notification preferences

## Commands

| Command | Description |
|---------|-------------|
| `/start` | Start bot & show main menu |
| `/help` | Show help message |
| `/login <email> <password>` | Login to account |
| `/logout` | Logout from account |
| `/rentals` | View active rentals |
| `/profile` | View profile info |

## Quick Start

### 1. Create Telegram Bot
1. Message [@BotFather](https://t.me/BotFather) on Telegram
2. Send `/newbot` and follow instructions
3. Copy the **Bot Token**

### 2. Configure Environment
```bash
cd bot
cp .env.example .env
# Edit .env and add your BOT_TOKEN
```

### 3. Run Locally (Development)
```bash
# Install dependencies
pip install -r requirements.txt

# Run bot (requires backend running on localhost:8000)
python main.py
```

### 4. Run with Docker (Production)
```bash
# From project root
cd ..
cp .env.example .env
# Edit .env with BOT_TOKEN and other settings

docker compose up -d --build bot
```

## Architecture

```
┌─────────────┐     HTTPS/API      ┌─────────────┐
│  Telegram   │ ◄─────────────────► │   Backend   │
│   Client    │                     │  (FastAPI)  │
└─────────────┘                     └─────────────┘
       ▲                                    │
       │           Bot API                  │
       └────────────────────────────────────┘
              python-telegram-bot
```

The bot communicates with the backend via REST API (HTTP). It does **not** connect directly to the database.

## Bot Flow

```
User → /start → Main Menu
  │
  ├─→ /login email pass → JWT Token → Authenticated
  │
  ├─→ 📋 Sewa Aktif → List rentals → Click → Detail/Components
  ├─→ 📅 Kalender → View schedule
  ├─→ 🖥️ Komputer Saya → List computers in rentals
  ├─→ 🔔 Notifikasi → Recent notifications
  └─→ ⚙️ Pengaturan → Notification preferences
```

## API Endpoints Used

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/auth/login` | POST | Get JWT token |
| `/users/me` | GET | Current user profile |
| `/rentals/` | GET | List rentals (with status filter) |
| `/rentals/{id}` | GET | Rental detail with items |
| `/notifications/` | GET | User notifications |

## Webhook Mode (Production)

For production, use webhook instead of polling:

```bash
# Set webhook URL in .env
WEBHOOK_URL=https://yourdomain.com

# Telegram will send updates to: https://yourdomain.com/<BOT_TOKEN>
# Configure reverse proxy (nginx) to forward to bot container port 8443
```

## Development

### Project Structure
```
bot/
├── main.py           # Bot entry point & handlers
├── requirements.txt  # Python dependencies
├── pyproject.toml    # Project config
├── Dockerfile        # Container image
├── .env.example      # Environment template
└── README.md         # This file
```

### Adding New Commands
1. Create async handler function in `main.py`
2. Register with `application.add_handler(CommandHandler("command", handler))`
3. Add to help text

### Adding Callback Handlers
1. Add button with `callback_data="action:param"`
2. Handle in `handle_callback()` function
3. Parse `data.split(":")` for parameters

## Troubleshooting

**Bot doesn't respond:**
- Check `BOT_TOKEN` in `.env`
- Verify backend is running (`docker compose ps`)
- Check logs: `docker compose logs bot`

**Login fails:**
- Verify backend API at `http://localhost:8000/docs`
- Check user exists in database
- Ensure password is correct

**API connection errors:**
- In Docker: bot uses `http://backend:8000` (service name)
- Locally: uses `http://localhost:8000` from `.env`

## License

MIT