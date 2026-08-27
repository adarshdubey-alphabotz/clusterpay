from fastapi import APIRouter, Depends, HTTPException
from src.core.security import verify_merchant_key
from src.database import get_db

router = APIRouter()

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
