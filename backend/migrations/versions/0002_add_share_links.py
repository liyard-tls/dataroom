"""add share_links table

Revision ID: 0002
Revises: 0001
Create Date: 2025-01-02 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '0002'
down_revision: Union[str, None] = '0001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'share_links',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('token', sa.String(36), nullable=False, unique=True),
        sa.Column('resource_type', sa.String(10), nullable=False),
        sa.Column('resource_id', sa.String(36), nullable=False),
        sa.Column('owner_id', sa.Text, nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_share_links_owner_id', 'share_links', ['owner_id'])
    op.create_index('ix_share_links_token', 'share_links', ['token'], unique=True)
    op.create_index('ix_share_links_resource', 'share_links', ['resource_type', 'resource_id'])


def downgrade() -> None:
    op.drop_index('ix_share_links_resource', 'share_links')
    op.drop_index('ix_share_links_token', 'share_links')
    op.drop_index('ix_share_links_owner_id', 'share_links')
    op.drop_table('share_links')
