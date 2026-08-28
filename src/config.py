import os


class Settings:
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8085"))
    BASE_URL: str = os.getenv("BASE_URL", "https://pay.rapidx.me").rstrip("/")
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "production")
    DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"

    # MongoDB — always enable auth in production (see docker-compose.yml)
    MONGO_URI: str = os.getenv("MONGO_URI", "mongodb://127.0.0.1:27017")
    MONGO_DB_NAME: str = os.getenv("MONGO_DB_NAME", "clusterpay_db")

    # Admin Authentication — generate both with: python scripts/generate_secrets.py
    ADMIN_MASTER_KEY: str = os.getenv("ADMIN_MASTER_KEY", "change_me_immediately")
    ADMIN_TOTP_SECRET: str = os.getenv("ADMIN_TOTP_SECRET", "")
    # ADMIN_TOTP_SECRET = "" means 2FA is bypassed (development mode only).
    # In production always set this: python scripts/generate_secrets.py

    # Rate limiting — use Redis in production for multi-worker accuracy
    RATE_LIMIT_PER_MINUTE: int = int(os.getenv("RATE_LIMIT_PER_MINUTE", "60"))
    REDIS_URL: str = os.getenv("REDIS_URL", "")
    # Set REDIS_URL=redis://localhost:6379 to enable Redis-backed rate limiting.
    # Without it, limits are per-process only (fine for single-worker, not for multi-worker).


settings = Settings()
