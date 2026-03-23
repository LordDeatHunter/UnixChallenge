CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    profile_picture_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS oauth_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,
    provider_user_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (provider, provider_user_id)
);

CREATE TABLE IF NOT EXISTS submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    challenge_id VARCHAR(255) NOT NULL,
    command TEXT NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS test_results (
    id SERIAL PRIMARY KEY,
    submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    test_num VARCHAR(50) NOT NULL,
    exit_code INTEGER NOT NULL,
    elapsed_ms INTEGER NOT NULL,
    passed BOOLEAN NOT NULL,
    stdout TEXT,
    stderr TEXT
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_oauth_accounts_provider_user_id ON oauth_accounts(provider, provider_user_id);
CREATE INDEX IF NOT EXISTS idx_oauth_accounts_user_id ON oauth_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_submissions_challenge_id ON submissions(challenge_id);
CREATE INDEX IF NOT EXISTS idx_submissions_created_at ON submissions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_submissions_user_id ON submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_test_results_submission_id ON test_results(submission_id);

CREATE OR REPLACE VIEW submission_summary AS
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
GROUP BY s.id, s.challenge_id, s.command, s.created_at, s.user_id;
