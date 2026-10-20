import os
import logging
from typing import Optional
from dataclasses import dataclass
from datetime import datetime

import httpx
from pydantic_settings import BaseSettings, SettingsConfigDict
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import (
    Application,
    CommandHandler,
    CallbackQueryHandler,
    ContextTypes,
    MessageHandler,
    filters,
)

logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    level=logging.INFO,
)
logger = logging.getLogger(__name__)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    BOT_TOKEN: str
    BACKEND_API_URL: str = "http://localhost:8000"
    WEBHOOK_URL: Optional[str] = None
    LOG_LEVEL: str = "INFO"


settings = Settings()

API_BASE = settings.BACKEND_API_URL.rstrip("/")


@dataclass
class UserSession:
    telegram_id: int
    access_token: Optional[str] = None
    user_data: Optional[dict] = None


user_sessions: dict[int, UserSession] = {}


async def api_request(
    method: str,
    endpoint: str,
    token: Optional[str] = None,
    json_data: Optional[dict] = None,
    params: Optional[dict] = None,
) -> dict:
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.request(
            method, f"{API_BASE}{endpoint}", headers=headers, json=json_data, params=params
        )
        response.raise_for_status()
        return response.json()


def get_main_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup([
        [
            InlineKeyboardButton("📋 Sewa Aktif", callback_data="my_rentals"),
            InlineKeyboardButton("📅 Kalender", callback_data="calendar"),
        ],
        [
            InlineKeyboardButton("🖥️ Komputer Saya", callback_data="my_computers"),
            InlineKeyboardButton("🔔 Notifikasi", callback_data="notifications"),
        ],
        [
            InlineKeyboardButton("⚙️ Pengaturan", callback_data="settings"),
            InlineKeyboardButton("❓ Bantuan", callback_data="help"),
        ],
    ])


def get_rental_keyboard(rental_id: int) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup([
        [
            InlineKeyboardButton("📦 Detail", callback_data=f"rental_detail:{rental_id}"),
            InlineKeyboardButton("🔧 Komponen", callback_data=f"rental_components:{rental_id}"),
        ],
        [
            InlineKeyboardButton("↩️ Kembalikan", callback_data=f"rental_return:{rental_id}"),
            InlineKeyboardButton("🔙 Kembali", callback_data="my_rentals"),
        ],
    ])


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    user_sessions[user.id] = UserSession(telegram_id=user.id)

    welcome_text = (
        f"👋 Halo {user.first_name}!\n\n"
        f"Selamat datang di *Computer Rental System Bot*.\n"
        f"Kelola sewa komputer Anda langsung dari Telegram.\n\n"
        f"🔐 Silakan login terlebih dahulu dengan perintah:\n"
        f"`/login email password`\n\n"
        f"Atau daftar akun baru via web: {API_BASE}/docs"
    )

    await update.message.reply_markdown(welcome_text, reply_markup=get_main_keyboard())


async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    help_text = (
        "📖 *Bantuan Computer Rental Bot*\n\n"
        "*Perintah Utama:*\n"
        "/start - Mulai bot & tampilkan menu\n"
        "/login <email> <password> - Login ke akun\n"
        "/logout - Logout dari akun\n"
        "/rentals - Lihat sewa aktif\n"
        "/profile - Info profil & token\n\n"
        "*Fitur Menu:*\n"
        "• 📋 Sewa Aktif - Daftar sewa yang sedang berjalan\n"
        "• 📅 Kalender - Lihat jadwal sewa\n"
        "• 🖥️ Komputer Saya - Komputer yang disewa\n"
        "• 🔔 Notifikasi - Riwayat notifikasi\n"
        "• ⚙️ Pengaturan - Ubah preferensi notifikasi\n\n"
        "*Catatan:* Bot ini terhubung ke backend API. "
        "Pastikan backend berjalan di `http://localhost:8000`."
    )
    await update.message.reply_markdown(help_text)


async def login(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    args = context.args

    if len(args) != 2:
        await update.message.reply_markdown(
            "❌ Format: `/login email password`\nContoh: `/login user@example.com password123`"
        )
        return

    email, password = args

    try:
        data = await api_request("POST", "/auth/login", json_data={"username": email, "password": password})
        access_token = data.get("access_token")

        if not access_token:
            await update.message.reply_text("❌ Login gagal: Token tidak ditemukan")
            return

        user_data = await api_request("GET", "/users/me", token=access_token)

        session = user_sessions.get(user.id, UserSession(telegram_id=user.id))
        session.access_token = access_token
        session.user_data = user_data
        user_sessions[user.id] = session

        await update.message.reply_markdown(
            f"✅ *Login berhasil!*\n\n"
            f"👤 Nama: {user_data.get('full_name', 'N/A')}\n"
            f"📧 Email: {user_data.get('email', 'N/A')}\n"
            f"🎭 Role: {user_data.get('role', 'customer').capitalize()}\n\n"
            f"Sekarang Anda bisa menggunakan semua fitur bot.",
            reply_markup=get_main_keyboard(),
        )

    except httpx.HTTPStatusError as e:
        if e.response.status_code == 401:
            await update.message.reply_text("❌ Email atau password salah")
        else:
            await update.message.reply_text(f"❌ Error: {e.response.text}")
    except Exception as e:
        logger.error(f"Login error: {e}")
        await update.message.reply_text(f"❌ Terjadi kesalahan: {str(e)}")


async def logout(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    if user.id in user_sessions:
        del user_sessions[user.id]
    await update.message.reply_text("✅ Berhasil logout", reply_markup=get_main_keyboard())


async def rentals_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await show_my_rentals(update, context, update.effective_user.id)


async def profile_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    session = user_sessions.get(user.id)

    if not session or not session.access_token:
        await update.message.reply_text("❌ Belum login. Gunakan `/login email password`")
        return

    try:
        user_data = await api_request("GET", "/users/me", token=session.access_token)
        profile_text = (
            f"👤 *Profil Anda*\n\n"
            f"ID: `{user_data.get('id')}`\n"
            f"Nama: {user_data.get('full_name', 'N/A')}\n"
            f"Email: {user_data.get('email', 'N/A')}\n"
            f"Telepon: {user_data.get('phone', 'N/A')}\n"
            f"Role: {user_data.get('role', 'N/A').capitalize()}\n"
            f"Telegram Chat ID: {user_data.get('telegram_chat_id', 'Belum diset')}\n"
            f"Status: {'Aktif' if user_data.get('is_active') else 'Nonaktif'}\n"
            f"Dibuat: {user_data.get('created_at', 'N/A')}"
        )
        await update.message.reply_markdown(profile_text)
    except Exception as e:
        await update.message.reply_text(f"❌ Error: {str(e)}")


async def show_my_rentals(update: Update, context: ContextTypes.DEFAULT_TYPE, user_id: int):
    session = user_sessions.get(user_id)

    if not session or not session.access_token:
        text = "❌ Belum login. Gunakan `/login email password`"
        if update.callback_query:
            await update.callback_query.edit_message_text(text)
        else:
            await update.message.reply_text(text)
        return

    try:
        rentals = await api_request("GET", "/rentals/", token=session.access_token, params={"status": "active"})

        if not rentals:
            text = "📭 Tidak ada sewa aktif saat ini."
            keyboard = InlineKeyboardMarkup([[
                InlineKeyboardButton("🔙 Kembali", callback_data="main_menu")
            ]])
        else:
            text = "📋 *Sewa Aktif Anda:*\n\n"
            keyboard_buttons = []
            for rental in rentals:
                end_date = datetime.fromisoformat(rental["end_date"].replace("Z", "+00:00"))
                days_left = (end_date - datetime.utcnow()).days
                status_emoji = "🟢" if days_left > 1 else "🟡" if days_left == 1 else "🔴"
                text += (
                    f"{status_emoji} *Sewa #{rental['id']}*\n"
                    f"   📅 {rental['start_date'][:10]} → {rental['end_date'][:10]} "
                    f"({days_left} hari lagi)\n"
                    f"   💰 Total: Rp {rental['total_price']:,.0f}\n\n"
                )
                keyboard_buttons.append([
                    InlineKeyboardButton(f"Sewa #{rental['id']} - {days_left} hari", callback_data=f"rental_detail:{rental['id']}")
                ])
            keyboard_buttons.append([InlineKeyboardButton("🔙 Kembali", callback_data="main_menu")])
            keyboard = InlineKeyboardMarkup(keyboard_buttons)

        if update.callback_query:
            await update.callback_query.edit_message_text(text, parse_mode="Markdown", reply_markup=keyboard)
        else:
            await update.message.reply_markdown(text, reply_markup=keyboard)

    except Exception as e:
        logger.error(f"Error fetching rentals: {e}")
        error_text = f"❌ Gagal memuat sewa: {str(e)}"
        if update.callback_query:
            await update.callback_query.edit_message_text(error_text)
        else:
            await update.message.reply_text(error_text)


async def show_rental_detail(update: Update, context: ContextTypes.DEFAULT_TYPE, rental_id: int):
    query = update.callback_query
    user_id = query.from_user.id
    session = user_sessions.get(user_id)

    if not session or not session.access_token:
        await query.edit_message_text("❌ Belum login")
        return

    try:
        rental = await api_request("GET", f"/rentals/{rental_id}", token=session.access_token)

        end_date = datetime.fromisoformat(rental["end_date"].replace("Z", "+00:00"))
        days_left = (end_date - datetime.utcnow()).days
        status_emoji = {
            "pending": "⏳",
            "active": "🟢",
            "completed": "✅",
            "cancelled": "❌",
            "overdue": "🔴",
        }.get(rental["status"], "❓")

        items_text = ""
        for item in rental.get("rental_items", []):
            computer = item.get("computer", {})
            items_text += f"   • {computer.get('name', 'N/A')} ({computer.get('brand', '')} {computer.get('model', '')}) x{item['quantity']}\n"

        text = (
            f"📦 *Detail Sewa #{rental['id']}*\n\n"
            f"Status: {status_emoji} {rental['status'].capitalize()}\n"
            f"📅 Periode: {rental['start_date'][:10]} → {rental['end_date'][:10]}\n"
            f"⏳ Sisa: {days_left} hari\n"
            f"💰 Total: Rp {rental['total_price']:,.0f}\n"
            f"🔐 Deposit: Rp {rental['deposit']:,.0f}\n"
            f"📝 Catatan: {rental.get('notes', '-')}\n\n"
            f"🖥️ *Komputer Disewa:*\n{items_text or '   (tidak ada)'}"
        )

        await query.edit_message_text(text, parse_mode="Markdown", reply_markup=get_rental_keyboard(rental_id))

    except httpx.HTTPStatusError as e:
        if e.response.status_code == 404:
            await query.edit_message_text("❌ Sewa tidak ditemukan")
        else:
            await query.edit_message_text(f"❌ Error: {e.response.text}")
    except Exception as e:
        logger.error(f"Error fetching rental detail: {e}")
        await query.edit_message_text(f"❌ Terjadi kesalahan: {str(e)}")


async def show_rental_components(update: Update, context: ContextTypes.DEFAULT_TYPE, rental_id: int):
    query = update.callback_query
    user_id = query.from_user.id
    session = user_sessions.get(user_id)

    if not session or not session.access_token:
        await query.edit_message_text("❌ Belum login")
        return

    try:
        rental = await api_request("GET", f"/rentals/{rental_id}", token=session.access_token)

        text = f"🔧 *Komponen Sewa #{rental_id}*\n\n"
        for item in rental.get("rental_items", []):
            computer = item.get("computer", {})
            text += f"🖥️ *{computer.get('name', 'N/A')}*\n"
            text += f"   Brand: {computer.get('brand', 'N/A')}\n"
            text += f"   Model: {computer.get('model', 'N/A')}\n"
            text += f"   Serial: {computer.get('serial_number', 'N/A')}\n"
            text += f"   Harga/hari: Rp {item['unit_price']:,.0f}\n"

            components = computer.get("components", [])
            if components:
                text += "   🔩 *Komponen:*\n"
                for comp in components:
                    text += f"      • {comp['name']} ({comp['component_type']}) - {comp.get('brand', '')} {comp.get('model', '')}\n"
            else:
                text += "   🔩 *Komponen:* (belum terdaftar)\n"
            text += "\n"

        keyboard = InlineKeyboardMarkup([[
            InlineKeyboardButton("🔙 Kembali", callback_data=f"rental_detail:{rental_id}")
        ]])

        await query.edit_message_text(text, parse_mode="Markdown", reply_markup=keyboard)

    except Exception as e:
        logger.error(f"Error fetching components: {e}")
        await query.edit_message_text(f"❌ Terjadi kesalahan: {str(e)}")


async def show_calendar(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    user_id = query.from_user.id
    session = user_sessions.get(user_id)

    if not session or not session.access_token:
        await query.edit_message_text("❌ Belum login")
        return

    try:
        rentals = await api_request("GET", "/rentals/", token=session.access_token)

        if not rentals:
            text = "📅 *Kalender Sewa*\n\nBelum ada jadwal sewa."
        else:
            text = "📅 *Kalender Sewa Anda*\n\n"
            for rental in rentals:
                status_emoji = {
                    "pending": "⏳",
                    "active": "🟢",
                    "completed": "✅",
                    "cancelled": "❌",
                    "overdue": "🔴",
                }.get(rental["status"], "❓")
                text += (
                    f"{status_emoji} *Sewa #{rental['id']}*\n"
                    f"   {rental['start_date'][:10]} → {rental['end_date'][:10]}\n"
                    f"   Status: {rental['status'].capitalize()}\n\n"
                )

        keyboard = InlineKeyboardMarkup([[
            InlineKeyboardButton("🔙 Kembali", callback_data="main_menu")
        ]])

        await query.edit_message_text(text, parse_mode="Markdown", reply_markup=keyboard)

    except Exception as e:
        logger.error(f"Error fetching calendar: {e}")
        await query.edit_message_text(f"❌ Terjadi kesalahan: {str(e)}")


async def show_notifications(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    user_id = query.from_user.id
    session = user_sessions.get(user_id)

    if not session or not session.access_token:
        await query.edit_message_text("❌ Belum login")
        return

    try:
        notifications = await api_request("GET", "/notifications/", token=session.access_token, params={"limit": 10})

        if not notifications:
            text = "🔔 *Notifikasi*\n\nBelum ada notifikasi."
        else:
            text = "🔔 *Notifikasi Terbaru (10 terakhir)*\n\n"
            for notif in notifications:
                type_emoji = {"email": "📧", "telegram": "📱", "in_app": "🔔"}.get(notif["type"], "📌")
                status_emoji = {"pending": "⏳", "sent": "✅", "failed": "❌"}.get(notif["status"], "❓")
                text += (
                    f"{type_emoji} {status_emoji} *{notif['title']}*\n"
                    f"   {notif['message'][:100]}{'...' if len(notif['message']) > 100 else ''}\n"
                    f"   📅 {notif['created_at'][:16].replace('T', ' ')}\n\n"
                )

        keyboard = InlineKeyboardMarkup([[
            InlineKeyboardButton("🔙 Kembali", callback_data="main_menu")
        ]])

        await query.edit_message_text(text, parse_mode="Markdown", reply_markup=keyboard)

    except Exception as e:
        logger.error(f"Error fetching notifications: {e}")
        await query.edit_message_text(f"❌ Terjadi kesalahan: {str(e)}")


async def show_settings(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    user_id = query.from_user.id
    session = user_sessions.get(user_id)

    if not session or not session.access_token:
        await query.edit_message_text("❌ Belum login")
        return

    try:
        user_data = await api_request("GET", "/users/me", token=session.access_token)

        keyboard = InlineKeyboardMarkup([
            [
                InlineKeyboardButton(
                    f"📱 Telegram: {'✅' if user_data.get('telegram_chat_id') else '❌'}",
                    callback_data="settings_telegram"
                ),
            ],
            [
                InlineKeyboardButton("🔔 Notif In-App: ✅", callback_data="settings_inapp"),
                InlineKeyboardButton("📧 Notif Email: ✅", callback_data="settings_email"),
            ],
            [
                InlineKeyboardButton("🔙 Kembali", callback_data="main_menu"),
            ],
        ])

        text = (
            f"⚙️ *Pengaturan Notifikasi*\n\n"
            f"👤 Akun: {user_data.get('full_name', 'N/A')}\n"
            f"📧 Email: {user_data.get('email', 'N/A')}\n"
            f"📱 Telegram Chat ID: {user_data.get('telegram_chat_id', 'Belum diset')}\n\n"
            f"Klik tombol untuk mengubah preferensi:"
        )

        await query.edit_message_text(text, parse_mode="Markdown", reply_markup=keyboard)

    except Exception as e:
        logger.error(f"Error fetching settings: {e}")
        await query.edit_message_text(f"❌ Terjadi kesalahan: {str(e)}")


async def handle_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    data = query.data

    if data == "main_menu":
        await query.edit_message_text(
            "🏠 *Menu Utama*\n\nPilih menu di bawah:",
            parse_mode="Markdown",
            reply_markup=get_main_keyboard(),
        )
    elif data == "my_rentals":
        await show_my_rentals(update, context, query.from_user.id)
    elif data == "calendar":
        await show_calendar(update, context)
    elif data == "notifications":
        await show_notifications(update, context)
    elif data == "settings":
        await show_settings(update, context)
    elif data == "help":
        await query.edit_message_text(
            "📖 *Bantuan*\n\n"
            "Gunakan menu di bawah atau ketik perintah:\n"
            "/rentals - Lihat sewa aktif\n"
            "/profile - Info profil\n"
            "/logout - Keluar\n\n"
            "Butuh bantuan? Hubungi admin.",
            parse_mode="Markdown",
            reply_markup=InlineKeyboardMarkup([[
                InlineKeyboardButton("🔙 Kembali", callback_data="main_menu")
            ]]),
        )
    elif data.startswith("rental_detail:"):
        rental_id = int(data.split(":")[1])
        await show_rental_detail(update, context, rental_id)
    elif data.startswith("rental_components:"):
        rental_id = int(data.split(":")[1])
        await show_rental_components(update, context, rental_id)
    elif data.startswith("rental_return:"):
        rental_id = int(data.split(":")[1])
        await query.edit_message_text(
            f"↩️ *Pengembalian Sewa #{rental_id}*\n\n"
            f"Fitur pengembalian via bot belum tersedia.\n"
            f"Silakan hubungi staff atau gunakan web dashboard.",
            parse_mode="Markdown",
            reply_markup=InlineKeyboardMarkup([[
                InlineKeyboardButton("🔙 Kembali", callback_data=f"rental_detail:{rental_id}")
            ]]),
        )
    else:
        await query.edit_message_text(f"❓ Menu tidak dikenal: {data}")


async def unknown_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "❓ Perintah tidak dikenali. Ketik /help untuk bantuan."
    )


def main():
    if not settings.BOT_TOKEN or settings.BOT_TOKEN == "your-telegram-bot-token-here":
        logger.error("BOT_TOKEN not set in .env file")
        return

    application = Application.builder().token(settings.BOT_TOKEN).build()

    application.add_handler(CommandHandler("start", start))
    application.add_handler(CommandHandler("help", help_command))
    application.add_handler(CommandHandler("login", login))
    application.add_handler(CommandHandler("logout", logout))
    application.add_handler(CommandHandler("rentals", rentals_command))
    application.add_handler(CommandHandler("profile", profile_command))
    application.add_handler(CallbackQueryHandler(handle_callback))
    application.add_handler(MessageHandler(filters.COMMAND, unknown_command))

    logger.info("Starting bot...")

    if settings.WEBHOOK_URL:
        application.run_webhook(
            listen="0.0.0.0",
            port=8443,
            url_path=settings.BOT_TOKEN,
            webhook_url=f"{settings.WEBHOOK_URL}/{settings.BOT_TOKEN}",
        )
    else:
        application.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == "__main__":
    main()