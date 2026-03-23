"""Add users, oauth_accounts, and user_id on submissions

Revision ID: 002
Revises: 001
Create Date: 2026-03-23

"""
from typing import Sequence, Union

from alembic import op

revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS users (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            username VARCHAR(255) NOT NULL UNIQUE,
            email VARCHAR(255) NOT NULL UNIQUE,
            profile_picture_url TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
        """
    )

    op.execute(
        """
        CREATE TABLE IF NOT EXISTS oauth_accounts (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            provider VARCHAR(50) NOT NULL,
            provider_user_id VARCHAR(255) NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            UNIQUE (provider, provider_user_id)
        )
        """
    )

    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_oauth_accounts_provider_user_id ON oauth_accounts(provider, provider_user_id)"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_oauth_accounts_user_id ON oauth_accounts(user_id)"
    )

    op.execute(
        "ALTER TABLE submissions ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_submissions_user_id ON submissions(user_id)"
    )

    # Recreate the view to include user_id
    op.execute("DROP VIEW IF EXISTS submission_summary")
    op.execute(
        """
        CREATE VIEW submission_summary AS
        SELECT
            s.id,
            s.challenge_id,
            s.command,
            s.created_at,
            s.user_id,
            COUNT(tr.id)::INTEGER as total_tests,
            COUNT(tr.id) FILTER (WHERE tr.passed = true)::INTEGER as passed_tests,
            COUNT(tr.id) FILTER (WHERE tr.passed = false)::INTEGER as failed_tests,
            COUNT(tr.id) FILTER (WHERE tr.passed = false) = 0 as all_passed,
            COALESCE(SUM(tr.elapsed_ms), 0)::INTEGER as execution_time_ms
        FROM submissions s
        LEFT JOIN test_results tr ON s.id = tr.submission_id
        GROUP BY s.id, s.challenge_id, s.command, s.created_at, s.user_id
        """
    )


def downgrade() -> None:
    op.execute("DROP VIEW IF EXISTS submission_summary")
    op.execute("DROP INDEX IF EXISTS idx_submissions_user_id")
    op.execute("ALTER TABLE submissions DROP COLUMN IF EXISTS user_id")
    op.execute("DROP INDEX IF EXISTS idx_oauth_accounts_user_id")
    op.execute("DROP INDEX IF EXISTS idx_oauth_accounts_provider_user_id")
    op.execute("DROP INDEX IF EXISTS idx_users_username")
    op.execute("DROP TABLE IF EXISTS oauth_accounts")
    op.execute("DROP TABLE IF EXISTS users")

    # Restore original view without user_id
    op.execute(
        """
        CREATE VIEW submission_summary AS
        SELECT
            s.id,
            s.challenge_id,
            s.command,
            s.created_at,
            COUNT(tr.id)::INTEGER as total_tests,
            COUNT(tr.id) FILTER (WHERE tr.passed = true)::INTEGER as passed_tests,
            COUNT(tr.id) FILTER (WHERE tr.passed = false)::INTEGER as failed_tests,
            COUNT(tr.id) FILTER (WHERE tr.passed = false) = 0 as all_passed,
            COALESCE(SUM(tr.elapsed_ms), 0)::INTEGER as execution_time_ms
        FROM submissions s
        LEFT JOIN test_results tr ON s.id = tr.submission_id
        GROUP BY s.id, s.challenge_id, s.command, s.created_at
        """
    )
