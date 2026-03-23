from fastapi.responses import JSONResponse, PlainTextResponse, RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from pydantic import BaseModel
from fastapi import FastAPI, Depends, Response
import urllib.request
import urllib.error
import logging
import uvicorn
import pathlib
import httpx
import yaml
import sys

logger = logging.getLogger("uvicorn")

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from api.config import settings
from api.auth import create_access_token, get_current_user, require_current_user
from worker.run import judge
from database.db import (
    close_pool,
    get_submission_by_id,
    get_submissions_by_challenge,
    get_recent_submissions,
    get_challenge_stats,
    get_user_by_id,
    update_user_username,
    get_user_submissions,
    get_user_challenge_submissions,
    upsert_user,
)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    logger.info("Application starting up")
    yield

    logger.info("Application shutting down")
    await close_pool()


app = FastAPI(lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class SubmitReq(BaseModel):
    challenge_id: str
    cmd: str


class UpdateUsernameReq(BaseModel):
    username: str


# ---------------------------------------------------------------------------
# GitHub OAuth
# ---------------------------------------------------------------------------

@app.get("/auth/github")
def auth_github():
    params = (
        f"client_id={settings.github_client_id}"
        f"&redirect_uri={settings.github_callback_url}"
        f"&scope=user:email"
    )
    return RedirectResponse(f"https://github.com/login/oauth/authorize?{params}")


@app.get("/auth/github/callback")
async def auth_github_callback(code: str, response: Response):
    # Exchange code for access token
    async with httpx.AsyncClient() as client:
        token_res = await client.post(
            "https://github.com/login/oauth/access_token",
            json={
                "client_id": settings.github_client_id,
                "client_secret": settings.github_client_secret,
                "code": code,
                "redirect_uri": settings.github_callback_url,
            },
            headers={"Accept": "application/json"},
            timeout=10,
        )
        token_data = token_res.json()

    access_token = token_data.get("access_token")
    if not access_token:
        return RedirectResponse(
            f"{settings.frontend_url}?auth_error=token_exchange_failed"
        )

    auth_headers = {"Authorization": f"Bearer {access_token}", "Accept": "application/json"}

    async with httpx.AsyncClient() as client:
        user_res = await client.get(
            "https://api.github.com/user", headers=auth_headers, timeout=10
        )
        emails_res = await client.get(
            "https://api.github.com/user/emails", headers=auth_headers, timeout=10
        )

    if user_res.status_code != 200:
        return RedirectResponse(
            f"{settings.frontend_url}?auth_error=github_user_fetch_failed"
        )

    gh_user = user_res.json()
    gh_emails = emails_res.json() if emails_res.status_code == 200 else []

    # Require a primary verified email
    primary_email = next(
        (e["email"] for e in gh_emails if e.get("primary") and e.get("verified")),
        None,
    )
    if not primary_email:
        return RedirectResponse(
            f"{settings.frontend_url}?auth_error=no_verified_email"
        )

    try:
        user = await upsert_user(
            github_user_id=gh_user["id"],
            login=gh_user["login"],
            email=primary_email,
            avatar_url=gh_user.get("avatar_url", ""),
        )
    except Exception as e:
        logger.error(f"Failed to upsert user: {e}")
        return RedirectResponse(
            f"{settings.frontend_url}?auth_error=user_creation_failed"
        )

    jwt_token = create_access_token(user["id"])
    redirect = RedirectResponse(settings.frontend_url, status_code=302)
    redirect.set_cookie(
        key=settings.cookie_name,
        value=jwt_token,
        httponly=True,
        secure=settings.cookie_secure,
        samesite=settings.cookie_samesite,
        max_age=settings.jwt_expiry_days * 86400,
        path="/",
    )
    return redirect


@app.post("/auth/logout")
def auth_logout(response: Response):
    response.delete_cookie(
        key=settings.cookie_name,
        httponly=True,
        secure=settings.cookie_secure,
        samesite=settings.cookie_samesite,
        path="/",
    )
    return JSONResponse({"ok": True})


# ---------------------------------------------------------------------------
# Current user (/me)
# ---------------------------------------------------------------------------

@app.get("/me")
async def me(user=Depends(get_current_user)):
    if user is None:
        return JSONResponse(None)
    return JSONResponse(user)


@app.put("/me/username")
async def update_username(req: UpdateUsernameReq, user=Depends(require_current_user)):
    username = req.username.strip()
    if not username or not username.replace("-", "").replace("_", "").isalnum():
        return JSONResponse(
            {"error": "Username must be alphanumeric (dashes and underscores allowed)"},
            status_code=400,
        )
    if len(username) > 39:
        return JSONResponse({"error": "Username too long (max 39 characters)"}, status_code=400)

    try:
        updated = await update_user_username(user["id"], username)
        if updated is None:
            return JSONResponse({"error": "User not found"}, status_code=404)
        return JSONResponse(updated)
    except Exception as e:
        if "unique" in str(e).lower() or "duplicate" in str(e).lower():
            return JSONResponse({"error": "Username already taken"}, status_code=409)
        logger.error(f"Error updating username: {e}")
        return JSONResponse({"error": "Failed to update username"}, status_code=500)


@app.get("/me/submissions")
async def me_submissions(limit: int = 50, offset: int = 0, user=Depends(require_current_user)):
    try:
        submissions = await get_user_submissions(user["id"], limit, offset)
        return JSONResponse({"submissions": submissions})
    except Exception as e:
        logger.error(f"Error fetching user submissions: {e}")
        return JSONResponse({"error": "Failed to fetch submissions"}, status_code=500)


@app.get("/me/challenges/{challenge_id}/submissions")
async def me_challenge_submissions(
    challenge_id: str,
    limit: int = 50,
    offset: int = 0,
    user=Depends(require_current_user),
):
    try:
        submissions = await get_user_challenge_submissions(
            user["id"], challenge_id, limit, offset
        )
        return JSONResponse({"submissions": submissions})
    except Exception as e:
        logger.error(f"Error fetching user challenge submissions: {e}")
        return JSONResponse({"error": "Failed to fetch submissions"}, status_code=500)

@app.get("/challenges")
def challenges():
    out = []
    chal_dir = ROOT / "challenges"
    for d in chal_dir.iterdir():
        y = d / "challenge.yaml"
        if not y.exists():
            continue

        with y.open("r") as f:
            data = yaml.safe_load(f)
            title = data.get("title", "")
            description = data.get("description", "")
            tags = data.get("tags", [])

        out.append({
            "id": d.name,
            "title": title or d.name,
            "description": description,
            "tags": tags
        })

    return out

@app.post("/submit")
async def submit(req: SubmitReq, user=Depends(get_current_user)):
    if not req.challenge_id or not req.challenge_id.replace('-', '').replace('_', '').isalnum():
        return JSONResponse(
            {"error": "Invalid challenge ID"}, status_code=400
        )

    chal_path = (ROOT / "challenges" / req.challenge_id).resolve()
    challenges_dir = (ROOT / "challenges").resolve()

    try:
        chal_path.relative_to(challenges_dir)
    except ValueError:
        return JSONResponse(
            {"error": "Invalid challenge ID"}, status_code=400
        )

    if not chal_path.exists():
        return JSONResponse(
            {"error": "Challenge not found"}, status_code=404
        )

    try:
        summary = await judge(str(chal_path), req.cmd, user_id=user["id"] if user else None)

        if summary and "error" in summary:
            return JSONResponse(
                {"error": summary["error"]}, status_code=400
            )

        return JSONResponse({"summary": summary})

    except Exception as e:
        logger.error(f"Error during submission: {str(e)}")

        return JSONResponse(
            {"error": f"Internal server error"}, status_code=500
        )

@app.get("/cheatsheet/{query:path}")
def cheatsheet(query: str):
    try:
        url = f"https://cheat.sh/{query}"
        req = urllib.request.Request(
            url,
            headers={
                'User-Agent': 'curl/7.68.0'
            }
        )

        with urllib.request.urlopen(req, timeout=10) as response:
            content = response.read().decode('utf-8')
            return PlainTextResponse(content)

    except urllib.error.HTTPError as e:
        if e.code == 404:
            return PlainTextResponse(
                "Command or topic not found. Try searching for a different term.",
                status_code=404
            )
        return PlainTextResponse(
            f"Failed to fetch documentation: HTTP {e.code}",
            status_code=e.code
        )
    except urllib.error.URLError as e:
        return PlainTextResponse(
            "Request timed out or failed. Please try again.",
            status_code=504
        )
    except Exception as e:
        return PlainTextResponse(
            f"Failed to fetch documentation: {str(e)}",
            status_code=500
        )


@app.get("/submissions/{submission_id}")
async def get_submission(submission_id: str):
    try:
        submission = await get_submission_by_id(submission_id)
        if submission is None:
            return JSONResponse(
                {"error": "Submission not found"}, status_code=404
            )
        return JSONResponse(submission)
    except Exception as e:
        logger.error(f"Error fetching submission: {str(e)}")
        return JSONResponse(
            {"error": "Failed to fetch submission"}, status_code=500
        )


@app.get("/challenges/{challenge_id}/submissions")
async def get_challenge_submissions(challenge_id: str, limit: int = 100, offset: int = 0):
    try:
        submissions = await get_submissions_by_challenge(challenge_id, limit, offset)
        return JSONResponse({"submissions": submissions})
    except Exception as e:
        logger.error(f"Error fetching submissions: {str(e)}")
        return JSONResponse(
            {"error": "Failed to fetch submissions"}, status_code=500
        )


@app.get("/challenges/{challenge_id}/stats")
async def get_challenge_statistics(challenge_id: str):
    try:
        stats = await get_challenge_stats(challenge_id)
        return JSONResponse(stats)
    except Exception as e:
        logger.error(f"Error fetching challenge stats: {str(e)}")
        return JSONResponse(
            {"error": "Failed to fetch challenge statistics"}, status_code=500
        )


@app.get("/submissions")
async def get_submissions(limit: int = 50):
    try:
        submissions = await get_recent_submissions(limit)
        return JSONResponse({"submissions": submissions})
    except Exception as e:
        logger.error(f"Error fetching recent submissions: {str(e)}")
        return JSONResponse(
            {"error": "Failed to fetch submissions"}, status_code=500
        )


if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)
