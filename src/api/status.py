from datetime import datetime, timedelta
from typing import Optional
from pydantic import BaseModel, Field, field_validator
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Request
from src.core.security import verify_merchant_key
from src.core.rate_limiter import check_rate_limit_async
from src.database import get_db
from src.services.blockchain import verify_onchain_transaction, auto_scan_session_payment
from src.services.webhook_dispatcher import dispatch_webhook

router = APIRouter()

VALID_COINS = {"USDT", "USDT_BEP20", "USDT_TRC20", "USDT_POLY", "USDT_ARB", "TON", "LTC", "BTC", "POL"}


class VerifyRequest(BaseModel):
    session_id: str = Field(..., min_length=8, max_length=64, description="Checkout session ID")
    coin: str       = Field(..., min_length=2, max_length=20, description="Network/Token (USDT_BEP20, USDT_TRC20, etc.)")
    txid: Optional[str] = Field(None, min_length=8, max_length=128, description="Blockchain transaction hash")

    @field_validator("coin")
    @classmethod
    def coin_must_be_valid(cls, v):
        if v.upper() not in VALID_COINS:
            raise ValueError(f"Unsupported coin '{v}'. Must be one of: {', '.join(sorted(VALID_COINS))}")
        return v.upper()

    @field_validator("txid")
    @classmethod
    def txid_no_whitespace(cls, v):
        if v is not None:
            return v.strip()
        return v


@router.get("/status/{session_id}", summary="Get Session Status")
async def get_session_status(session_id: str, merchant: dict = Depends(verify_merchant_key)):
    """
    Retrieve real-time payment status and blockchain settlement info.
    """
    merchant_id = merchant.get("telegram_id") or merchant.get("merchant_id")
    db = get_db()
    session = await db.payment_sessions.find_one({"session_id": session_id})
    if not session:
        raise HTTPException(status_code=404, detail="Checkout session not found")

    if session["merchant_id"] != merchant_id:
        raise HTTPException(status_code=403, detail="Access denied to this checkout session")

    return {
        "session_id": session["session_id"],
        "status":     session.get("status", "pending"),
        "amount":     session.get("amount"),
        "base_amount": session.get("base_amount"),
        "currency":   session.get("currency", "USD"),
        "custom_id":  session.get("custom_id"),
        "coin":       session.get("coin"),
        "tx_hash":    session.get("tx_hash"),
        "created_at": session["created_at"].isoformat() + "Z" if session.get("created_at") else None,
        "expires_at": session["expires_at"].isoformat() + "Z" if session.get("expires_at") else None,
        "paid_at":    session["paid_at"].isoformat() + "Z" if session.get("paid_at") else None
    }


@router.get("/gateway/status/{session_id}", summary="Public Checkout Status Poll", include_in_schema=False)
async def get_gateway_session_status(session_id: str, bg: BackgroundTasks):
    db = get_db()
    session = await db.payment_sessions.find_one({"session_id": session_id})
    if not session:
        raise HTTPException(status_code=404, detail="Checkout session not found")
    
    now = datetime.utcnow()
    expires_at = session.get("expires_at", now)
    time_left = max(0, int((expires_at - now).total_seconds()))
    status = session.get("status", "pending")
    
    # Real-Time Automatic Blockchain Scanner on Poll
    if status == "pending" and time_left > 0:
        found, network, txid, amt = await auto_scan_session_payment(session)
        if found and txid:
            # Check claim
            claim = await db.payment_tx_claims.find_one({"network": network, "txid": txid})
            if not claim:
                try:
                    await db.payment_tx_claims.insert_one({
                        "network": network,
                        "txid": txid,
                        "session_id": session_id,
                        "amount": amt,
                        "claimed_at": now
                    })
                except Exception:
                    pass
                
                await db.payment_sessions.update_one(
                    {"session_id": session_id, "status": "pending"},
                    {
                        "$set": {
                            "status": "paid",
                            "coin": network,
                            "tx_hash": txid,
                            "txid": txid,
                            "amount_received": amt,
                            "paid_at": now
                        }
                    }
                )
                session["status"] = "paid"
                session["coin"] = network
                session["tx_hash"] = txid
                session["paid_at"] = now
                session["amount_received"] = amt
                status = "paid"

                # Trigger webhook
                if session.get("callback_url"):
                    bg.add_task(dispatch_webhook, session, "payment.paid")

    if time_left == 0 and status == "pending":
        status = "expired"

    return {
        "success": True,
        "session_id": session["session_id"],
        "status": status,
        "amount": session.get("amount"),
        "currency": session.get("currency", "USD"),
        "coin": session.get("coin"),
        "tx_hash": session.get("tx_hash"),
        "txid": session.get("tx_hash") or session.get("txid"),
        "amount_received": session.get("amount_received") or session.get("amount"),
        "time_left": time_left,
        "paid_at": session["paid_at"].isoformat() + "Z" if session.get("paid_at") else None
    }


@router.post("/verify", summary="Verify On-Chain Transfer (Checkout UI)", include_in_schema=False)
@router.post("/gateway/verify", summary="Verify On-Chain Transfer (Checkout UI)", include_in_schema=False)
async def verify_payment(req: VerifyRequest, request: Request, bg: BackgroundTasks):
    """
    Public Checkout Verification:
    Atomic validation of on-chain transactions, micro-decimal offset matching,
    anti-replay claim locking, and background HMAC webhook dispatching.

    Rate limited: 10 requests per minute per IP to prevent TxID enumeration.
    """
    # Rate limit: 10 verify attempts per IP per minute (prevents TxID brute-force / enumeration)
    client_ip = (
        request.headers.get("x-forwarded-for", "").split(",")[0].strip()
        or getattr(request.client, "host", "unknown")
    )
    await check_rate_limit_async(f"verify:{client_ip}", limit=10, window_seconds=60)

    db = get_db()
    session = await db.payment_sessions.find_one({"session_id": req.session_id})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found or expired")

    if session.get("status") == "paid":
        return {
            "success":    True,
            "status":     "paid",
            "message":    "Payment already confirmed and settled",
            "session_id": req.session_id,
            "tx_hash":    session.get("tx_hash")
        }

    now = datetime.utcnow()
    grace_period = timedelta(minutes=60)
    if session.get("expires_at") and now > (session["expires_at"] + grace_period):
        await db.payment_sessions.update_one(
            {"session_id": req.session_id, "status": "pending"},
            {"$set": {"status": "expired"}}
        )
        raise HTTPException(status_code=400, detail="This invoice has expired. Please create a new checkout session.")

    if not req.txid:
        raise HTTPException(status_code=400, detail="Transaction Hash (TxID) is required for verification")

    clean_txid = req.txid.strip()
    coin = req.coin.upper()

    # 1. Anti-Replay: Check if txid has already been claimed on this network
    existing_claim = await db.payment_tx_claims.find_one({"network": coin, "txid": clean_txid})
    if existing_claim:
        raise HTTPException(status_code=400, detail="This blockchain transaction has already been claimed by another invoice.")

    # 2. Get Merchant Destination Wallet
    wallets = session.get("wallets", {})
    recipient_map = {
        "USDT":       wallets.get("bep20", ""),
        "USDT_BEP20": wallets.get("bep20", ""),
        "USDT_TRC20": wallets.get("trc20", ""),
        "USDT_POLY":  wallets.get("poly", ""),
        "USDT_ARB":   wallets.get("arb", ""),
        "TON":        wallets.get("ton", ""),
        "LTC":        wallets.get("ltc", ""),
        "BTC":        wallets.get("btc", ""),
        "POL":        wallets.get("pol", "")
    }
    recipient_address = recipient_map.get(coin, "") or session.get("recipient_address", "")
    expected_amount   = float(session.get("amount", 0.0))

    # 3. Verify on-chain execution, contract whitelist, recipient, and amount
    is_valid, msg, amount_received = await verify_onchain_transaction(
        network=coin,
        txid=clean_txid,
        recipient_address=recipient_address,
        expected_amount=expected_amount
    )

    if not is_valid:
        raise HTTPException(status_code=400, detail=msg)

    # 4. Atomic Claim Insertion (unique index prevents race condition double-spend)
    try:
        await db.payment_tx_claims.insert_one({
            "network":    coin,
            "txid":       clean_txid,
            "session_id": req.session_id,
            "claimed_at": now,
            "amount":     amount_received
        })
    except Exception:
        raise HTTPException(status_code=400, detail="Concurrency conflict: Transaction was just claimed by a concurrent request.")

    # 5. Atomic Session State Transition (Only if status is still pending)
    updated = await db.payment_sessions.find_one_and_update(
        {"session_id": req.session_id, "status": "pending"},
        {"$set": {
            "status":          "paid",
            "coin":            coin,
            "tx_hash":         clean_txid,
            "amount_received": amount_received,
            "paid_at":         now
        }},
        return_document=True
    )

    if not updated:
        raise HTTPException(status_code=400, detail="Could not mark session as paid (already settled or expired)")

    # 6. Background Webhook Dispatch with HMAC-SHA256 Signature
    if updated.get("callback_url"):
        merchant = await db.merchants.find_one({"merchant_id": updated.get("merchant_id")})
        api_key  = merchant.get("api_key", "") if merchant else ""
        bg.add_task(dispatch_webhook, updated, api_key)

    return {
        "success":         True,
        "status":          "paid",
        "message":         "Payment verified and settled successfully",
        "session_id":      req.session_id,
        "amount_received": amount_received,
        "tx_hash":         clean_txid
    }
