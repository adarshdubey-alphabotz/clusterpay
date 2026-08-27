import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    HOST: str = "0.0.0.0"
    PORT: int = 8085
    BASE_URL: str = os.getenv("BASE_URL", "https://pay.rapidx.me")
    ENVIRONMENT: str = "production"
    DEBUG: bool = False

    # MongoDB
    MONGO_URI: str = os.getenv("MONGO_URI", "mongodb://127.0.0.1:27017")
    MONGO_DB_NAME: str = os.getenv("MONGO_DB_NAME", "clusterpay_db")

    # Anti-theft & Invoicing
    INVOICE_EXPIRATION_MINUTES: int = 15
    MAX_TX_AGE_SECONDS: int = 7200
    RATE_LIMIT_PER_MINUTE: int = 60

    # Default Wallets
    DEFAULT_USDT_BEP20_WALLET: str = os.getenv("DEFAULT_USDT_BEP20_WALLET", "0x4288f46725514671d3CA0974A4869d88ecbCE150")
    DEFAULT_USDT_TRC20_WALLET: str = os.getenv("DEFAULT_USDT_TRC20_WALLET", "TZE6RPaSQkECYpPkqKgE4DTTcjyneMCXpw")
    DEFAULT_USDT_POLY_WALLET: str = os.getenv("DEFAULT_USDT_POLY_WALLET", "0x4288f46725514671d3CA0974A4869d88ecbCE150")
    DEFAULT_USDT_ARB_WALLET: str = os.getenv("DEFAULT_USDT_ARB_WALLET", "0x4288f46725514671d3CA0974A4869d88ecbCE150")
    DEFAULT_TON_WALLET: str = os.getenv("DEFAULT_TON_WALLET", "")
    DEFAULT_LTC_WALLET: str = os.getenv("DEFAULT_LTC_WALLET", "")
    DEFAULT_BTC_WALLET: str = os.getenv("DEFAULT_BTC_WALLET", "")
    DEFAULT_POL_WALLET: str = os.getenv("DEFAULT_POL_WALLET", "0x4288f46725514671d3CA0974A4869d88ecbCE150")

    class Config:
        env_file = ".env"
        extra = "allow"

settings = Settings()
