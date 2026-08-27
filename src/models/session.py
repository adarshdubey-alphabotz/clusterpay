from typing import Optional, List, Dict
from pydantic import BaseModel, Field
from datetime import datetime

class GatewayCheckoutRequest(BaseModel):
    amount: float = Field(..., gt=0, description="Payment amount in specified currency (e.g. 15.00)")
    callback_url: str = Field(..., description="Webhook URL triggered on payment settlement or expiration")
    custom_id: Optional[str] = Field(None, description="Merchant internal tracking ID (order_id, user_id, invoice_id)")
    description: Optional[str] = Field(None, description="Product or service description displayed on checkout")
    expires_in_minutes: Optional[int] = Field(15, ge=5, le=1440, description="Session lifespan in minutes (default: 15)")
    surcharge_percent: Optional[float] = Field(0.0, ge=0.0, le=50.0, description="Optional fee percentage added to invoice")
    logo_url: Optional[str] = Field(None, description="HTTPS URL of merchant branding logo")
    theme_color: Optional[str] = Field(None, description="Hex color code for branding accent (e.g. #3b82f6)")
    currency: Optional[str] = Field("USD", description="Currency code: USD, INR, EUR, GBP, CAD, AUD, AED, RUB")
    merchant_name: Optional[str] = Field(None, description="Merchant display title")
    merchant_url: Optional[str] = Field(None, description="Back link to merchant website")
    redirect_url: Optional[str] = Field(None, description="Customer redirection URL after successful payment")
    mode: Optional[str] = Field("hosted", description="Checkout mode: 'hosted' (default) or 'embedded'")
    allowed_origins: Optional[List[str]] = Field(default_factory=list, description="Origins allowed for iframe embedding")
    wallets: Optional[Dict[str, str]] = Field(default_factory=dict, description="Custom wallet overrides for this session")

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
