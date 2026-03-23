import os


class Settings:
    github_client_id: str = os.getenv("GITHUB_CLIENT_ID", "")
    github_client_secret: str = os.getenv("GITHUB_CLIENT_SECRET", "")
    github_callback_url: str = os.getenv(
        "GITHUB_CALLBACK_URL",
        "http://localhost:8000/auth/github/callback",
    )

    jwt_secret: str = os.getenv("JWT_SECRET", "CHANGE_ME_IN_PRODUCTION")
    jwt_algorithm: str = "HS256"
    jwt_expiry_days: int = 30

    cookie_name: str = "session"
    cookie_secure: bool = os.getenv("COOKIE_SECURE", "false").lower() == "true"
    cookie_samesite: str = "lax"

    frontend_url: str = os.getenv("FRONTEND_URL", "http://localhost:5173")


settings = Settings()
