"""Add reminders table

Revision ID: 002
Revises: 001
Create Date: 2026-10-20 10:02:35.507184

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '002'
down_revision = '001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'reminders',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('rental_id', sa.Integer(), nullable=False),
        sa.Column('channel', sa.Enum('in_app', 'telegram', 'email', name='reminderchannelenum'), nullable=False),
        sa.Column('days_before', sa.Integer(), nullable=False),
        sa.Column('scheduled_for', sa.DateTime(), nullable=False),
        sa.Column('sent_at', sa.DateTime(), nullable=True),
        sa.Column('is_sent', sa.Boolean(), nullable=False, server_default='0'),
        sa.Column('retry_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.ForeignKeyConstraint(['rental_id'], ['rentals.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_reminders_rental_id', 'reminders', ['rental_id'])
    op.create_index('ix_reminders_scheduled_sent', 'reminders', ['scheduled_for', 'is_sent'])
    op.create_unique_constraint('uq_reminder_rental_days_channel', 'reminders', ['rental_id', 'days_before', 'channel'])


def downgrade() -> None:
    op.drop_table('reminders')
