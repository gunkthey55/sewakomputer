"""Add composite indexes for scheduler query patterns

Revision ID: 003
Revises: 002
Create Date: 2026-10-21 00:55:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '003'
down_revision = '002'
branch_labels = None
depends_on = None


def upgrade() -> None:
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

    # Reminders: pending reminders for 15min send job
    op.create_index(
        'ix_reminders_pending_v2',
        'reminders',
        ['is_sent', 'scheduled_for'],
        unique=False
    )


def downgrade() -> None:
    op.drop_index('ix_reminders_pending_v2', table_name='reminders')
    op.drop_index('ix_components_type_active', table_name='components')
    op.drop_index('ix_schedules_computer_active_time', table_name='schedules')
    op.drop_index('ix_notifications_user_unread', table_name='notifications')
    op.drop_index('ix_rentals_active_overdue', table_name='rentals')
    op.drop_index('ix_rentals_active_end_today', table_name='rentals')
    op.drop_index('ix_rentals_status_end_date', table_name='rentals')
