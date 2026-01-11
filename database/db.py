from typing import Optional, List, Dict, Any
import asyncpg
import logging
import os

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


async def save_submission(
    challenge_id: str,
    command: str,
    results: List[Dict[str, Any]]
) -> str:
    pool = await get_pool()

    async with pool.acquire() as conn:
        async with conn.transaction():
            submission_id = await conn.fetchval(
                """
                INSERT INTO submissions (challenge_id, command)
                VALUES ($1, $2)
                RETURNING id
                """,
                challenge_id,
                command
            )

            for result in results:
                await conn.execute(
                    """
                    INSERT INTO test_results (
                        submission_id, test_num, exit_code, elapsed_ms,
                        passed, stdout, stderr
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
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


async def get_submission_by_id(submission_id: str) -> Optional[Dict[str, Any]]:
    pool = await get_pool()

    async with pool.acquire() as conn:
        submission = await conn.fetchrow(
            """
            SELECT id, challenge_id, command, created_at
            FROM submissions
            WHERE id = $1
            """,
            submission_id
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
            submission["id"]
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
            ]
        }


async def get_submissions_by_challenge(
    challenge_id: str,
    limit: int = 100,
    offset: int = 0
) -> List[Dict[str, Any]]:
    pool = await get_pool()

    async with pool.acquire() as conn:
        submissions = await conn.fetch(
            """
            SELECT *
            FROM submission_summary
            WHERE challenge_id = $1
            ORDER BY created_at DESC
            LIMIT $2 OFFSET $3
            """,
            challenge_id,
            limit,
            offset
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
                "execution_time_ms": s["execution_time_ms"]
            }
            for s in submissions
        ]


async def get_recent_submissions(limit: int = 50) -> List[Dict[str, Any]]:
    pool = await get_pool()

    async with pool.acquire() as conn:
        submissions = await conn.fetch(
            """
            SELECT *
            FROM submission_summary
            ORDER BY created_at DESC
            LIMIT $1
            """,
            limit
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
                "execution_time_ms": s["execution_time_ms"]
            }
            for s in submissions
        ]


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
