"""Make designer_name optional

Revision ID: 002
Revises: 001
Create Date: 2026-09-22
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '002'
down_revision = '001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column('pcid_records', 'designer_name', existing_type=sa.String(length=100), nullable=True)


def downgrade() -> None:
    op.execute("UPDATE pcid_records SET designer_name = '' WHERE designer_name IS NULL")
    op.alter_column('pcid_records', 'designer_name', existing_type=sa.String(length=100), nullable=False)
