"""Add reminders table + enhanced indexes for scheduler queries

Revision ID: 002
Revises: 001
Create Date: 2024-01-15 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mysql

# revision identifiers, used by Alembic.
revision = '002'
down_revision = '001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create reminders table for scheduled reminder tracking
    op.create_table(
        'reminders',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('rental_id', sa.Integer(), nullable=False),
        sa.Column('channel', sa.Enum('email', 'telegram', 'in_app', name='reminderchannelenum'), nullable=False),
        sa.Column('remind_at', sa.DateTime(), nullable=False),
        sa.Column('days_before', sa.Integer(), nullable=False, comment='Negative = after end_date (overdue)'),
        sa.Column('is_sent', sa.Boolean(), nullable=False, server_default='0'),
        sa.Column('sent_at', sa.DateTime(), nullable=True),
        sa.Column('notification_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.ForeignKeyConstraint(['notification_id'], ['notifications.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['rental_id'], ['rentals.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_reminders_rental_channel', 'reminders', ['rental_id', 'channel'], unique=False)
    op.create_index('ix_reminders_pending', 'reminders', ['is_sent', 'remind_at'], unique=False)
    op.create_index('ix_reminders_rental_days', 'reminders', ['rental_id', 'days_before'], unique=True)  # Idempotency guard

    # Enhanced composite indexes for scheduler query patterns
    # Daily 08:00 job: rentals ending in 1,3,7 days + today
    op.create_index(
        'ix_rentals_status_end_date',
        'rentals',
        ['status', 'end_date'],
        unique=False
    )
    
    # Hourly job: active rentals ending today
    op.create_index(
        'ix_rentals_active_end_today',
        'rentals',
        ['status', 'end_date'],
        unique=False,
        mysql_prefix='COMMENT "For hourly today check"'
    )
    
    # Overdue check: active rentals past end_date
    op.create_index(
        'ix_rentals_active_overdue',
        'rentals',
        ['status', 'end_date'],
        unique=False,
        mysql_prefix='COMMENT "For overdue check"'
    )

    # Notifications: user unread count (frequent query)
    op.create_index(
        'ix_notifications_user_unread',
        'notifications',
        ['user_id', 'status'],
        unique=False,
        mysql_where=sa.text("status = 'pending'")
    )

    # Schedules: active schedules for a computer in time range
    op.create_index(
        'ix_schedules_computer_active_time',
        'schedules',
        ['computer_id', 'is_active', 'start_time', 'end_time'],
        unique=False
    )

    # Components: by type for inventory queries
    op.create_index(
        'ix_components_type_active',
        'components',
        ['component_type', 'computer_id'],
        unique=False
    )


def downgrade() -> None:
    # Drop indexes
    op.drop_index('ix_components_type_active', table_name='components')
    op.drop_index('ix_schedules_computer_active_time', table_name='schedules')
    op.drop_index('ix_notifications_user_unread', table_name='notifications')
    op.drop_index('ix_rentals_active_overdue', table_name='rentals')
    op.drop_index('ix_rentals_active_end_today', table_name='rentals')
    op.drop_index('ix_rentals_status_end_date', table_name='rentals')
    
    # Drop reminders table
    op.drop_index('ix_reminders_rental_days', table_name='reminders')
    op.drop_index('ix_reminders_pending', table_name='reminders')
    op.drop_index('ix_reminders_rental_channel', table_name='reminders')
    op.drop_table('reminders')