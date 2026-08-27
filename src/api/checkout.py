import uuid
import secrets
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, Request, HTTPException
from src.models.session import GatewayCheckoutRequest
from src.core.security import verify_merchant_key
from src.core.micro_offset import generate_micro_offset_amount
from src.core.currency import convert_to_usd
from src.core.rate_limiter import check_rate_limit
from src.config import settings
from src.database import get_db

router = APIRouter()

@router.post("/checkout", summary="Create Checkout Session")
async def create_checkout_session(req: GatewayCheckoutRequest, request: Request, merchant: dict = Depends(verify_merchant_key)):
    """
    Creates a new high-precision cryptocurrency checkout invoice.
    Generates a unique 4-decimal anti-theft micro-offset amount.
    """
    merchant_id = merchant.get("telegram_id") or merchant.get("merchant_id")
    check_rate_limit(f"merchant_{merchant_id}")

    # Fiat conversion
    base_usd = await convert_to_usd(req.amount, req.currency or "USD")
    
    # Surcharge
    if req.surcharge_percent and req.surcharge_percent > 0:
        base_usd = round(base_usd * (1 + req.surcharge_percent / 100.0), 2)

    # Ensure at least 1 valid destination crypto wallet address is provided
    wallets = req.wallets or {}
    has_wallet = any(
        isinstance(v, str) and len(v.strip()) > 8
        for v in [
            wallets.get("bep20"),
            wallets.get("trc20"),
            wallets.get("poly"),
            wallets.get("arb"),
            wallets.get("ton"),
            wallets.get("ltc"),
            wallets.get("btc"),
            wallets.get("pol"),
            settings.DEFAULT_USDT_BEP20_WALLET,
            settings.DEFAULT_USDT_TRC20_WALLET,
            settings.DEFAULT_USDT_POLY_WALLET,
            settings.DEFAULT_USDT_ARB_WALLET,
            settings.DEFAULT_TON_WALLET,
            settings.DEFAULT_LTC_WALLET,
            settings.DEFAULT_BTC_WALLET,
            settings.DEFAULT_POL_WALLET,
        ]
    )
    if not has_wallet:
        raise HTTPException(
            status_code=400,
            detail="At least 1 destination crypto wallet address is required before creating a checkout session (e.g. wallets={'bep20': '0x...'} or wallets={'trc20': 'T...'})."
        )

    # 4-decimal anti-theft micro-offset
    effective_amount = generate_micro_offset_amount(base_usd)

    session_id = f"cpay_{uuid.uuid4().hex[:20]}"
    now = datetime.utcnow()
    expires_at = now + timedelta(minutes=req.expires_in_minutes or 15)

    doc = {
        "session_id": session_id,
        "merchant_id": merchant_id,
        "amount": effective_amount,
        "base_amount": req.amount,
        "currency": (req.currency or "USD").upper(),
        "callback_url": req.callback_url,
        "custom_id": req.custom_id,
        "description": req.description,
        "logo_url": req.logo_url,
        "theme_color": req.theme_color,
        "merchant_name": req.merchant_name,
        "merchant_url": req.merchant_url,
        "mode": req.mode or "hosted",
        "allowed_origins": req.allowed_origins or [],
        "allowed_ips": req.allowed_ips or [],
        "wallets": req.wallets or {},
        "status": "pending",
        "created_at": now,
        "expires_at": expires_at
    }

    db = get_db()
    await db.payment_sessions.insert_one(doc)

    payment_url = f"{settings.BASE_URL}/gateway/pay/{session_id}"
    if req.mode == "embedded":
        payment_url += "?embed=true"

    return {
        "success": True,
        "session_id": session_id,
        "amount": effective_amount,
        "base_amount": req.amount,
        "currency": req.currency or "USD",
        "expires_at": expires_at.isoformat() + "Z",
        "payment_url": payment_url,
        "embed_iframe_code": f'<iframe src="{payment_url}" width="100%" height="650" frameborder="0" allow="payment"></iframe>'
    }
