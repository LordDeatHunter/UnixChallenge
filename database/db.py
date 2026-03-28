import logging
import os
import uuid
from typing import Optional, List, Dict, Any

import asyncpg

logger = logging.getLogger("uvicorn")

_pool: Optional[asyncpg.Pool] = None


async def get_pool() -> asyncpg.Pool:
    global _pool
    if _pool is None:
        database_url = os.getenv(
            "DATABASE_URL",
            "postgresql://unixchallenge:unixchallenge@127.0.0.1:54320/unixchallenge"
        )
        _pool = await asyncpg.create_pool(database_url, min_size=2, max_size=10)
    return _pool


async def close_pool():
    global _pool
    if _pool is not None:
        await _pool.close()
        _pool = None


async def upsert_user(
        github_user_id: int,
        login: str,
        email: str,
        avatar_url: str,
) -> Dict[str, Any]:
    pool = await get_pool()

    async with pool.acquire() as conn:
        async with conn.transaction():
            # Check if an oauth_account already exists for this GitHub user
            existing = await conn.fetchrow(
                """
                SELECT u.id, u.username, u.email, u.profile_picture_url
                FROM oauth_accounts oa
                JOIN users u ON oa.user_id = u.id
                WHERE oa.provider = 'github' AND oa.provider_user_id = $1
                """,
                str(github_user_id),
            )

            if existing:
                # Update profile picture on every login
                await conn.execute(
                    """
                    UPDATE users SET profile_picture_url = $1, updated_at = NOW()
                    WHERE id = $2
                    """,
                    avatar_url,
                    existing["id"],
                )
                return {
                    "id": str(existing["id"]),
                    "username": existing["username"],
                    "email": existing["email"],
                    "profile_picture_url": avatar_url,
                }

            # No oauth_account found — create a new user and link it
            # Generate a unique username from GitHub login
            base_username = login
            username = base_username
            suffix = 1
            while await conn.fetchval(
                    "SELECT 1 FROM users WHERE username = $1", username
            ):
                username = f"{base_username}_{suffix}"
                suffix += 1

            user_id = await conn.fetchval(
                """
                INSERT INTO users (username, email, profile_picture_url)
                VALUES ($1, $2, $3)
                RETURNING id
                """,
                username,
                email,
                avatar_url,
            )

            await conn.execute(
                """
                INSERT INTO oauth_accounts (user_id, provider, provider_user_id)
                VALUES ($1, 'github', $2)
                """,
                user_id,
                str(github_user_id),
            )

            return {
                "id": str(user_id),
                "username": username,
                "email": email,
                "profile_picture_url": avatar_url,
            }


async def get_user_by_id(user_id: str) -> Optional[Dict[str, Any]]:
    pool = await get_pool()

    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            SELECT id, username, email, profile_picture_url
            FROM users
            WHERE id = $1
            """,
            uuid.UUID(user_id),
        )

    if not row:
        return None
    return {
        "id": str(row["id"]),
        "username": row["username"],
        "email": row["email"],
        "profile_picture_url": row["profile_picture_url"],
    }


async def update_user_username(user_id: str, new_username: str) -> Optional[Dict[str, Any]]:
    pool = await get_pool()

    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            UPDATE users SET username = $1, updated_at = NOW()
            WHERE id = $2
            RETURNING id, username, email, profile_picture_url
            """,
            new_username,
            uuid.UUID(user_id),
        )

    if not row:
        return None
    return {
        "id": str(row["id"]),
        "username": row["username"],
        "email": row["email"],
        "profile_picture_url": row["profile_picture_url"],
    }


async def save_submission(
        challenge_id: str,
        command: str,
        results: List[Dict[str, Any]],
        user_id: Optional[str] = None,
) -> str:
    pool = await get_pool()
    uid = uuid.UUID(user_id) if user_id else None

    async with pool.acquire() as conn:
        async with conn.transaction():
            submission_id = await conn.fetchval(
                """
                INSERT INTO submissions (challenge_id, command, user_id)
                VALUES ($1, $2, $3)
                RETURNING id
                """,
                challenge_id,
                command,
                uid,
            )

            for result in results:
                await conn.execute(
                    """
                    INSERT INTO test_results (
                        submission_id, test_num, exit_code, elapsed_ms,
                        passed, stdout, stderr
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                    """,
                    submission_id,
                    result.get("test_num"),
                    result.get("exit_code"),
                    result.get("elapsed_ms"),
                    result.get("pass"),
                    result.get("stdout", "")[:10000],
                    result.get("stderr", "")[:10000],
                )

            logger.info(f"Saved submission with ID {submission_id}")
            return str(submission_id)


async def get_challenge_stats(challenge_id: str) -> Dict[str, Any]:
    pool = await get_pool()

    async with pool.acquire() as conn:
        stats = await conn.fetchrow(
            """
            SELECT 
                COUNT(*) as total_submissions,
                COUNT(*) FILTER (WHERE failed_tests = 0) as successful_submissions,
                AVG(execution_time_ms) as avg_execution_time,
                COUNT(DISTINCT command) as unique_solutions
            FROM submission_summary
            WHERE challenge_id = $1
            """,
            challenge_id
        )

        if not stats or stats["total_submissions"] == 0:
            return {
                "total_submissions": 0,
                "successful_submissions": 0,
                "success_rate": 0.0,
                "avg_execution_time": 0,
                "unique_solutions": 0
            }

        return {
            "total_submissions": stats["total_submissions"],
            "successful_submissions": stats["successful_submissions"],
            "success_rate": (stats["successful_submissions"] / stats["total_submissions"]) * 100,
            "avg_execution_time": float(stats["avg_execution_time"] or 0),
            "unique_solutions": stats["unique_solutions"]
        }


async def get_user_submissions(
        user_id: str,
        limit: int = 50,
        offset: int = 0,
) -> List[Dict[str, Any]]:
    pool = await get_pool()

    async with pool.acquire() as conn:
        submissions = await conn.fetch(
            """
            SELECT *
            FROM submission_summary
            WHERE user_id = $1
            ORDER BY created_at DESC
            LIMIT $2 OFFSET $3
            """,
            uuid.UUID(user_id),
            limit,
            offset,
        )

        return [
            {
                "id": str(s["id"]),
                "challenge_id": s["challenge_id"],
                "command": s["command"],
                "created_at": s["created_at"].isoformat(),
                "total_tests": s["total_tests"],
                "passed": s["passed_tests"],
                "failed": s["failed_tests"],
                "all_pass": s["all_passed"],
                "execution_time_ms": s["execution_time_ms"],
            }
            for s in submissions
        ]


async def get_user_challenge_submissions(
        user_id: str,
        challenge_id: str,
        limit: int = 50,
        offset: int = 0,
) -> List[Dict[str, Any]]:
    pool = await get_pool()

    async with pool.acquire() as conn:
        submissions = await conn.fetch(
            """
            SELECT *
            FROM submission_summary
            WHERE user_id = $1 AND challenge_id = $2
            ORDER BY created_at DESC
            LIMIT $3 OFFSET $4
            """,
            uuid.UUID(user_id),
            challenge_id,
            limit,
            offset,
        )

        return [
            {
                "id": str(s["id"]),
                "challenge_id": s["challenge_id"],
                "command": s["command"],
                "created_at": s["created_at"].isoformat(),
                "total_tests": s["total_tests"],
                "passed": s["passed_tests"],
                "failed": s["failed_tests"],
                "all_pass": s["all_passed"],
                "execution_time_ms": s["execution_time_ms"],
            }
            for s in submissions
        ]


async def get_user_submission_by_id(
        user_id: str,
        submission_id: str,
) -> Optional[Dict[str, Any]]:
    pool = await get_pool()

    async with pool.acquire() as conn:
        submission = await conn.fetchrow(
            """
            SELECT id, challenge_id, command, created_at
            FROM submissions
            WHERE id = $1 AND user_id = $2
            """,
            uuid.UUID(submission_id),
            uuid.UUID(user_id),
        )

        if not submission:
            return None

        test_results = await conn.fetch(
            """
            SELECT test_num, exit_code, elapsed_ms, passed, stdout, stderr
            FROM test_results
            WHERE submission_id = $1
            ORDER BY test_num
            """,
            submission["id"],
        )

        total_tests = len(test_results)
        passed_tests = sum(1 for r in test_results if r["passed"])
        failed_tests = total_tests - passed_tests
        execution_time_ms = sum(r["elapsed_ms"] for r in test_results)

        return {
            "id": str(submission["id"]),
            "challenge_id": submission["challenge_id"],
            "command": submission["command"],
            "created_at": submission["created_at"].isoformat(),
            "total_tests": total_tests,
            "passed": passed_tests,
            "failed": failed_tests,
            "all_pass": failed_tests == 0,
            "execution_time_ms": execution_time_ms,
            "results": [
                {
                    "test_num": r["test_num"],
                    "exit_code": r["exit_code"],
                    "elapsed_ms": r["elapsed_ms"],
                    "pass": r["passed"],
                    "stdout": r["stdout"],
                    "stderr": r["stderr"],
                }
                for r in test_results
            ],
        }


async def get_user_completed_challenge_ids(user_id: str) -> List[str]:
    pool = await get_pool()

    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT DISTINCT challenge_id
            FROM submission_summary
            WHERE user_id = $1
              AND all_passed = true
            """,
            uuid.UUID(user_id),
        )

    return [row["challenge_id"] for row in rows]


async def get_user_challenge_progress(user_id: str) -> Dict[str, str]:
    pool = await get_pool()

    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT challenge_id, BOOL_OR(all_passed) AS is_completed
            FROM submission_summary
            WHERE user_id = $1
            GROUP BY challenge_id
            """,
            uuid.UUID(user_id),
        )

    progress: Dict[str, str] = {}
    for row in rows:
        progress[row["challenge_id"]] = "completed" if row["is_completed"] else "attempted"

    return progress


async def get_duplicate_submission(
        user_id: str,
        challenge_id: str,
        command: str,
) -> Optional[str]:
    pool = await get_pool()

    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            SELECT id
            FROM submissions
            WHERE user_id = $1
              AND challenge_id = $2
              AND command = $3
            LIMIT 1
            """,
            uuid.UUID(user_id),
            challenge_id,
            command,
        )

    return str(row["id"]) if row else None
