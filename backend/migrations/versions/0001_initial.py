"""initial

Revision ID: 0001
Revises:
Create Date: 2025-01-01 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'folders',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('name', sa.Text, nullable=False),
        sa.Column('parent_id', sa.String(36), sa.ForeignKey('folders.id', ondelete='CASCADE'), nullable=True),
        sa.Column('owner_id', sa.Text, nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_folders_owner_id', 'folders', ['owner_id'])

    op.create_table(
        'files',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('name', sa.Text, nullable=False),
        sa.Column('mime_type', sa.Text, nullable=True),
        sa.Column('size', sa.BigInteger, nullable=True),
        sa.Column('folder_id', sa.String(36), sa.ForeignKey('folders.id', ondelete='SET NULL'), nullable=True),
        sa.Column('owner_id', sa.Text, nullable=False),
        sa.Column('gdrive_file_id', sa.Text, nullable=True),
        sa.Column('gdrive_web_url', sa.Text, nullable=True),
        sa.Column('storage_path', sa.Text, nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_files_owner_id', 'files', ['owner_id'])
    op.create_index('ix_files_folder_id', 'files', ['folder_id'])

    op.create_table(
        'oauth_tokens',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('owner_id', sa.Text, nullable=False),
        sa.Column('provider', sa.Text, nullable=False),
        sa.Column('access_token', sa.Text, nullable=False),
        sa.Column('refresh_token', sa.Text, nullable=True),
        sa.Column('token_expiry', sa.DateTime(timezone=True), nullable=True),
        sa.Column('scopes', sa.Text, nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint('owner_id', 'provider', name='uq_oauth_owner_provider'),
    )
    op.create_index('ix_oauth_tokens_owner_id', 'oauth_tokens', ['owner_id'])


def downgrade() -> None:
    op.drop_table('oauth_tokens')
    op.drop_index('ix_files_folder_id', 'files')
    op.drop_index('ix_files_owner_id', 'files')
    op.drop_table('files')
    op.drop_index('ix_folders_owner_id', 'folders')
    op.drop_table('folders')
