"""Initial migration

Revision ID: 001
Revises: 
Create Date: 2024-01-01 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create users table
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("hashed_password", sa.String(length=255), nullable=False),
        sa.Column("full_name", sa.String(length=255), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, default=True),
        sa.Column("is_superuser", sa.Boolean(), nullable=False, default=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP")),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email"),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    # Create computers table
    op.create_table(
        "computers",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("code", sa.String(length=50), nullable=False),
        sa.Column("spec_json", sa.JSON(), nullable=False, default={}),
        sa.Column("price_per_day", sa.Integer(), nullable=False, default=0),
        sa.Column("is_available", sa.Boolean(), nullable=False, default=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP")),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("code"),
    )
    op.create_index("ix_computers_name_code", "computers", ["name", "code"])
    op.create_index("ix_computers_code", "computers", ["code"], unique=True)

    # Create components table
    op.create_table(
        "components",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("code", sa.String(length=50), nullable=False),
        sa.Column("category", sa.String(length=100), nullable=False),
        sa.Column("spec_json", sa.JSON(), nullable=False, default={}),
        sa.Column("price_per_day", sa.Integer(), nullable=False, default=0),
        sa.Column("stock_quantity", sa.Integer(), nullable=False, default=0),
        sa.Column("min_stock_alert", sa.Integer(), nullable=False, default=5),
        sa.Column("is_active", sa.Boolean(), nullable=False, default=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP")),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("code"),
    )
    op.create_index("ix_components_category_active", "components", ["category", "is_active"])
    op.create_index("ix_components_code", "components", ["code"], unique=True)

    # Create rentals table
    op.create_table(
        "rentals",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("rental_code", sa.String(length=50), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("customer_name", sa.String(length=255), nullable=False),
        sa.Column("customer_phone", sa.String(length=20), nullable=True),
        sa.Column("customer_email", sa.String(length=255), nullable=True),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("end_date", sa.Date(), nullable=False),
        sa.Column("actual_return_date", sa.Date(), nullable=True),
        sa.Column("status", sa.Enum("draft", "active", "completed", "cancelled", "overdue", name="rentalstatus", native_enum=False), nullable=False, default="draft"),
        sa.Column("total_price", sa.Integer(), nullable=False, default=0),
        sa.Column("paid_amount", sa.Integer(), nullable=False, default=0),
        sa.Column("deposit_amount", sa.Integer(), nullable=False, default=0),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP")),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("rental_code"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="RESTRICT"),
    )
    op.create_index("ix_rentals_dates_status", "rentals", ["start_date", "end_date", "status"])
    op.create_index("ix_rentals_customer_dates", "rentals", ["customer_name", "start_date", "end_date"])
    op.create_index("ix_rentals_rental_code", "rentals", ["rental_code"], unique=True)
    op.create_index("ix_rentals_user_id", "rentals", ["user_id"])

    # Create rental_components table
    op.create_table(
        "rental_components",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("rental_id", sa.Integer(), nullable=False),
        sa.Column("computer_id", sa.Integer(), nullable=True),
        sa.Column("component_id", sa.Integer(), nullable=True),
        sa.Column("quantity", sa.Integer(), nullable=False, default=1),
        sa.Column("price_per_day", sa.Integer(), nullable=False, default=0),
        sa.Column("condition_at_start", sa.Text(), nullable=True),
        sa.Column("condition_at_return", sa.Text(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["rental_id"], ["rentals.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["computer_id"], ["computers.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["component_id"], ["components.id"], ondelete="RESTRICT"),
    )
    op.create_index("ix_rental_components_rental_computer", "rental_components", ["rental_id", "computer_id"])
    op.create_index("ix_rental_components_rental_component", "rental_components", ["rental_id", "component_id"])
    op.create_index("ix_rental_components_rental_id", "rental_components", ["rental_id"])

    # Create reminders table
    op.create_table(
        "reminders",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("rental_id", sa.Integer(), nullable=False),
        sa.Column("channel", sa.Enum("in_app", "telegram", name="reminderchannel", native_enum=False), nullable=False),
        sa.Column("scheduled_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("is_sent", sa.Boolean(), nullable=False, default=False),
        sa.Column("retry_count", sa.Integer(), nullable=False, default=0),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["rental_id"], ["rentals.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_reminders_scheduled_sent", "reminders", ["scheduled_at", "is_sent"])
    op.create_index("ix_reminders_rental_id", "reminders", ["rental_id"])
    op.create_unique_constraint("uq_reminder_rental_channel_time", "reminders", ["rental_id", "channel", "scheduled_at"])

    # Create notifications table
    op.create_table(
        "notifications",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("type", sa.String(length=50), nullable=False),
        sa.Column("reference_id", sa.Integer(), nullable=True),
        sa.Column("is_read", sa.Boolean(), nullable=False, default=False),
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_notifications_user_read_created", "notifications", ["user_id", "is_read", "created_at"])
    op.create_index("ix_notifications_user_id", "notifications", ["user_id"])


def downgrade() -> None:
    op.drop_table("notifications")
    op.drop_table("reminders")
    op.drop_table("rental_components")
    op.drop_table("rentals")
    op.drop_table("components")
    op.drop_table("computers")
    op.drop_table("users")