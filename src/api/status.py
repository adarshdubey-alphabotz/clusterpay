from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from src.core.security import verify_merchant_key
from src.database import get_db
from src.services.blockchain import verify_onchain_transaction
from src.services.webhook_dispatcher import dispatch_webhook

router = APIRouter()

class VerifyRequest(BaseModel):
    session_id: str = Field(..., description="Checkout session ID")
    coin: str = Field(..., description="Network/Token code (USDT, USDT_TRC20, USDT_POLY, etc.)")
    txid: Optional[str] = Field(None, description="Blockchain transaction hash (optional for auto-indexers)")

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
        "status": session.get("status", "pending"),
        "amount": session.get("amount"),
        "base_amount": session.get("base_amount"),
        "currency": session.get("currency", "USD"),
        "custom_id": session.get("custom_id"),
        "coin": session.get("coin"),
        "tx_hash": session.get("tx_hash"),
        "created_at": session["created_at"].isoformat() + "Z" if session.get("created_at") else None,
        "expires_at": session["expires_at"].isoformat() + "Z" if session.get("expires_at") else None,
        "paid_at": session["paid_at"].isoformat() + "Z" if session.get("paid_at") else None
    }

@router.post("/verify", summary="Verify On-Chain Transfer (Checkout UI)", include_in_schema=False)
async def verify_payment(req: VerifyRequest, bg: BackgroundTasks):
    """
    Public Checkout Verification:
    Atomic validation of on-chain transactions, micro-decimal offset matching,
    anti-replay claim locking, and background HMAC webhook dispatching.
    """
    db = get_db()
    session = await db.payment_sessions.find_one({"session_id": req.session_id})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found or expired")

    if session.get("status") == "paid":
        return {
            "success": True,
            "status": "paid",
            "message": "Payment already confirmed and settled",
            "session_id": req.session_id,
            "tx_hash": session.get("tx_hash")
        }

    now = datetime.utcnow()
    if session.get("expires_at") and now > session["expires_at"]:
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
        "USDT": wallets.get("bep20", ""),
        "USDT_BEP20": wallets.get("bep20", ""),
        "USDT_TRC20": wallets.get("trc20", ""),
        "USDT_POLY": wallets.get("poly", ""),
        "USDT_ARB": wallets.get("arb", ""),
        "TON": wallets.get("ton", ""),
        "LTC": wallets.get("ltc", ""),
        "BTC": wallets.get("btc", ""),
        "POL": wallets.get("pol", "")
    }
    recipient_address = recipient_map.get(coin, "")
    if not recipient_address:
        recipient_address = session.get("recipient_address", "")

    expected_amount = float(session.get("amount", 0.0))

    # 3. Verify on-chain execution, contract whitelist, recipient, and amount
    is_valid, msg, amount_received = await verify_onchain_transaction(
        network=coin,
        txid=clean_txid,
        recipient_address=recipient_address,
        expected_amount=expected_amount
    )

    if not is_valid:
        raise HTTPException(status_code=400, detail=msg)

    # 4. Atomic Claim Insertion
    try:
        await db.payment_tx_claims.insert_one({
            "network": coin,
            "txid": clean_txid,
            "session_id": req.session_id,
            "claimed_at": now,
            "amount": amount_received
        })
    except Exception:
        raise HTTPException(status_code=400, detail="Concurrency conflict: Transaction was just claimed by a concurrent request.")

    # 5. Atomic Session State Transition (Only if status is still pending)
    updated = await db.payment_sessions.find_one_and_update(
        {"session_id": req.session_id, "status": "pending"},
        {
            "$set": {
                "status": "paid",
                "coin": coin,
                "tx_hash": clean_txid,
                "amount_received": amount_received,
                "paid_at": now
            }
        },
        return_document=True
    )

    if not updated:
        raise HTTPException(status_code=400, detail="Could not mark session as paid (already settled or expired)")

    # 6. Background Webhook Dispatch with HMAC-SHA256 Signature
    if updated.get("callback_url"):
        merchant = await db.merchants.find_one({"merchant_id": updated.get("merchant_id")})
        api_key = merchant.get("api_key", "") if merchant else ""
        bg.add_task(dispatch_webhook, updated, api_key)

    return {
        "success": True,
        "status": "paid",
        "message": "Payment verified and settled successfully",
        "session_id": req.session_id,
        "amount_received": amount_received,
        "tx_hash": clean_txid
    }
