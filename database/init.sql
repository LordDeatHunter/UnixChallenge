CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    challenge_id VARCHAR(255) NOT NULL,
    command TEXT NOT NULL,
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
    stderr TEXT,
);

CREATE INDEX IF NOT EXISTS idx_submissions_challenge_id ON submissions(challenge_id);
CREATE INDEX IF NOT EXISTS idx_submissions_created_at ON submissions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_test_results_submission_id ON test_results(submission_id);

CREATE OR REPLACE VIEW submission_summary AS
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
GROUP BY s.id, s.challenge_id, s.command, s.created_at;
