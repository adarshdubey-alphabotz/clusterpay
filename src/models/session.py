from typing import Optional, List, Dict
from pydantic import BaseModel, Field, field_validator
from datetime import datetime


# Maximum wallet address lengths per chain (generous but bounded)
_WALLET_MAX_LEN = {
    "bep20": 42,   # EVM 0x + 40 hex
    "trc20": 34,   # TRON base58
    "poly":  42,   # EVM
    "arb":   42,   # EVM
    "ton":   66,   # TON base64url
    "ltc":   35,   # Litecoin
    "btc":   62,   # Bitcoin (bech32 is longest at ~62)
    "pol":   42,   # EVM (native POL)
    "bnb":   42,   # BNB native
}
_DEFAULT_WALLET_MAX = 128   # Fallback cap for any unknown key


class GatewayCheckoutRequest(BaseModel):
    amount: float = Field(..., gt=0, lt=10_000_000, description="Payment amount in specified currency (e.g. 15.00)")
    callback_url: str = Field(..., min_length=8, max_length=512, description="Webhook URL triggered on payment settlement")
    custom_id: Optional[str] = Field(None, max_length=256, description="Merchant internal tracking ID")
    description: Optional[str] = Field(None, max_length=512, description="Product/service description shown on checkout")
    expires_in_minutes: Optional[int] = Field(15, ge=5, le=1440, description="Session lifespan in minutes (default: 15)")
    surcharge_percent: Optional[float] = Field(0.0, ge=0.0, le=50.0, description="Optional fee % added to invoice amount")
    logo_url: Optional[str] = Field(None, max_length=512, description="HTTPS URL of merchant branding logo")
    theme_color: Optional[str] = Field(None, max_length=9, description="Hex color code e.g. #3b82f6")
    currency: Optional[str] = Field("USD", min_length=2, max_length=8, description="Currency code: USD, INR, EUR, GBP, etc.")
    merchant_name: Optional[str] = Field(None, max_length=128, description="Merchant display title")
    merchant_url: Optional[str] = Field(None, max_length=512, description="Back-link to merchant website")
    redirect_url: Optional[str] = Field(None, max_length=512, description="Customer redirect URL after successful payment")
    allowed_origins: Optional[List[str]] = Field(default_factory=list, max_length=10, description="Origins allowed for iframe embedding")
    allowed_ips: Optional[List[str]] = Field(default_factory=list, max_length=20, description="IP allowlist for API requests")
    wallets: Optional[Dict[str, str]] = Field(default_factory=dict, description="Merchant crypto wallet addresses per chain")

    @field_validator("wallets")
    @classmethod
    def validate_wallets(cls, v):
        if not v:
            return v
        if len(v) > 12:
            raise ValueError("Too many wallet entries (max 12 chains).")
        for key, addr in v.items():
            if not isinstance(addr, str):
                raise ValueError(f"Wallet address for '{key}' must be a string.")
            max_len = _WALLET_MAX_LEN.get(key.lower(), _DEFAULT_WALLET_MAX)
            if len(addr) > max_len:
                raise ValueError(
                    f"Wallet address for '{key}' is too long "
                    f"(got {len(addr)}, max {max_len})."
                )
            if len(addr) > 0 and len(addr) < 8:
                raise ValueError(f"Wallet address for '{key}' is too short to be valid.")
        return v

    @field_validator("theme_color")
    @classmethod
    def validate_theme_color(cls, v):
        if v and not v.startswith("#"):
            raise ValueError("theme_color must be a hex color starting with # (e.g. #3b82f6)")
        return v

    @field_validator("currency")
    @classmethod
    def currency_uppercase(cls, v):
        return v.upper() if v else "USD"


class SessionStatusResponse(BaseModel):
    session_id: str
    status: str
    amount: float
    currency: str
    custom_id: Optional[str]
    created_at: str
    expires_at: str
    paid_at: Optional[str] = None
    tx_hash: Optional[str] = None
    coin: Optional[str] = None
