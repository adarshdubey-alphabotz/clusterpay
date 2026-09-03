import uuid
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, Request, HTTPException
from src.models.session import GatewayCheckoutRequest, DonateCheckoutRequest
from src.core.security import verify_merchant_key
from src.core.micro_offset import generate_unique_session_amount
from src.core.currency import convert_to_usd
from src.core.rate_limiter import check_rate_limit
from src.config import settings
from src.database import get_db

router = APIRouter()


@router.post("/checkout", summary="Create Checkout Session")
async def create_checkout_session(req: GatewayCheckoutRequest, request: Request, merchant: dict = Depends(verify_merchant_key)):
    """
    Creates a new high-precision cryptocurrency checkout invoice.
    Generates a micro-offset amount guaranteed unique across all active (non-expired)
    sessions for the same wallet addresses. No two live checkouts can share the same
    exact decimal amount, so a payment can only ever settle one specific invoice.
    """
    merchant_id = merchant.get("telegram_id") or merchant.get("merchant_id")
    check_rate_limit(f"merchant_{merchant_id}")

    # Fiat conversion
    base_usd = await convert_to_usd(req.amount, req.currency or "USD")

    # Optional surcharge
    if req.surcharge_percent and req.surcharge_percent > 0:
        base_usd = round(base_usd * (1 + req.surcharge_percent / 100.0), 2)

    # At least 1 explicit merchant wallet required (ClusterPay is non-custodial)
    wallets = req.wallets or {}
    has_wallet = any(
        isinstance(v, str) and len(v.strip()) > 8
        for v in [wallets.get(k) for k in ("bep20", "opbnb", "trc20", "poly", "arb", "ton", "ltc", "btc", "pol")]
    )
    if not has_wallet:
        raise HTTPException(
            status_code=400,
            detail=(
                "At least 1 destination merchant wallet address is required (e.g. wallets={'bep20': '0x...'}). "
                "ClusterPay is non-custodial and requires explicit merchant recipient addresses."
            )
        )

    db = get_db()

    # ── UNIQUE AMOUNT SLOT ────────────────────────────────────────────────────
    # Generates a micro-offset amount that is provably unique across ALL currently
    # active pending sessions for these wallet addresses. If two checkouts of $10.00
    # are live simultaneously, they will have different exact amounts: $10.003421 and
    # $10.007865. Once one expires its slot is freed and can be reused.
    effective_amount = await generate_unique_session_amount(base_usd, wallets, db)

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
        "wallets": wallets,
        "require_email": bool(req.require_email),
        "require_buyer_name": bool(req.require_buyer_name),
        "customer_email": req.customer_email or "",
        "customer_name": req.customer_name or "",
        "custom_note": req.custom_note or "",
        "custom_fields": req.custom_fields or {},
        "status": "pending",
        "created_at": now,
        "expires_at": expires_at
    }

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


@router.post("/donate/checkout", summary="Create Developer Donation Checkout")
async def create_donate_checkout_session(req: DonateCheckoutRequest, request: Request):
    """
    Creates a direct developer sponsorship checkout session.
    Routes funds directly to developer non-custodial multi-chain addresses.
    """
    dev_wallets = {
        "bep20": settings.DEFAULT_USDT_BEP20_WALLET or "0x4288f46725514671d3CA0974A4869d88ecbCE150",
        "trc20": settings.DEFAULT_USDT_TRC20_WALLET or "TZE6RPaSQkECYpPkqKgE4DTTcjyneMCXpw",
        "poly": settings.DEFAULT_USDT_POLY_WALLET or "0x4288f46725514671d3CA0974A4869d88ecbCE150",
        "arb": settings.DEFAULT_USDT_ARB_WALLET or "0x4288f46725514671d3CA0974A4869d88ecbCE150",
        "ton": settings.DEFAULT_TON_WALLET or "UQCSM55B9z99kTaxGKrrS42DuWlpUpds-lTkQD8Lc0b6Otky",
        "ltc": settings.DEFAULT_LTC_WALLET or "ltc1qlpc2j7ns2qvp67f3vfxmye96tmtmlls0n5dq6h",
        "btc": settings.DEFAULT_BTC_WALLET or "bc1qmfuaulr37cevx2s0rs94mxafgnrel6nekn4w26",
        "pol": settings.DEFAULT_POL_WALLET or "0x4288f46725514671d3CA0974A4869d88ecbCE150",
    }

    db = get_db()
    effective_amount = await generate_unique_session_amount(req.amount, dev_wallets, db)
    session_id = f"cpay_{uuid.uuid4().hex[:20]}"
    now = datetime.utcnow()
    expires_at = now + timedelta(minutes=20)

    doc = {
        "session_id": session_id,
        "merchant_id": "m_developer_sponsor",
        "amount": effective_amount,
        "base_amount": req.amount,
        "currency": "USD",
        "callback_url": "",
        "custom_id": f"SPONSOR-{uuid.uuid4().hex[:6].upper()}",
        "description": f"Developer Contribution from {req.name or 'Supporter'}: {req.message or 'Keep up the great work!'}",
        "merchant_name": "Adarsh Dubey (ClusterPay)",
        "merchant_url": "https://clusterpay.cloud/about-developer",
        "mode": "hosted",
        "wallets": dev_wallets,
        "status": "pending",
        "created_at": now,
        "expires_at": expires_at
    }

    await db.payment_sessions.insert_one(doc)

    payment_url = f"/gateway/pay/{session_id}"
    return {
        "success": True,
        "session_id": session_id,
        "amount": effective_amount,
        "base_amount": req.amount,
        "currency": "USD",
        "payment_url": payment_url
    }
