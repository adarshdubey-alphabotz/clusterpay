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

    # Default Fallback Wallets
    DEFAULT_USDT_BEP20_WALLET: str = os.getenv("DEFAULT_USDT_BEP20_WALLET", "")
    DEFAULT_USDT_TRC20_WALLET: str = os.getenv("DEFAULT_USDT_TRC20_WALLET", "")
    DEFAULT_USDT_POLY_WALLET: str = os.getenv("DEFAULT_USDT_POLY_WALLET", "")
    DEFAULT_USDT_ARB_WALLET: str = os.getenv("DEFAULT_USDT_ARB_WALLET", "")
    DEFAULT_TON_WALLET: str = os.getenv("DEFAULT_TON_WALLET", "")
    DEFAULT_LTC_WALLET: str = os.getenv("DEFAULT_LTC_WALLET", "")
    DEFAULT_BTC_WALLET: str = os.getenv("DEFAULT_BTC_WALLET", "")
    DEFAULT_POL_WALLET: str = os.getenv("DEFAULT_POL_WALLET", "")

settings = Settings()
