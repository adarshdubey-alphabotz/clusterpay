import os

class Settings:
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8085"))
    BASE_URL: str = os.getenv("BASE_URL", "https://pay.rapidx.me").rstrip("/")
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "production")
    DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"

    # MongoDB
    MONGO_URI: str = os.getenv("MONGO_URI", "mongodb://127.0.0.1:27017")
    MONGO_DB_NAME: str = os.getenv("MONGO_DB_NAME", "clusterpay_db")

    # Security & Admin Authentication
    ADMIN_MASTER_KEY: str = os.getenv("ADMIN_MASTER_KEY", "cpay_master_admin_secret_key_change_me")
    RATE_LIMIT_PER_MINUTE: int = int(os.getenv("RATE_LIMIT_PER_MINUTE", "60"))

    # Default Wallets (Configured via .env or per-checkout request)
    DEFAULT_USDT_BEP20_WALLET: str = os.getenv("DEFAULT_USDT_BEP20_WALLET", "")
    DEFAULT_USDT_TRC20_WALLET: str = os.getenv("DEFAULT_USDT_TRC20_WALLET", "")
    DEFAULT_USDT_POLY_WALLET: str = os.getenv("DEFAULT_USDT_POLY_WALLET", "")
    DEFAULT_USDT_ARB_WALLET: str = os.getenv("DEFAULT_USDT_ARB_WALLET", "")
    DEFAULT_TON_WALLET: str = os.getenv("DEFAULT_TON_WALLET", "")
    DEFAULT_LTC_WALLET: str = os.getenv("DEFAULT_LTC_WALLET", "")
    DEFAULT_BTC_WALLET: str = os.getenv("DEFAULT_BTC_WALLET", "")
    DEFAULT_POL_WALLET: str = os.getenv("DEFAULT_POL_WALLET", "")

settings = Settings()
