from fastapi import APIRouter, Depends
from src.core.security import verify_merchant_key
from src.database import get_db

router = APIRouter()

@router.get("/sessions", summary="List Merchant Sessions")
async def list_merchant_sessions(limit: int = 50, merchant: dict = Depends(verify_merchant_key)):
    """
    List recent checkout sessions generated under your Merchant API key.
    """
    merchant_id = merchant.get("telegram_id") or merchant.get("merchant_id")
    limit = max(1, min(int(limit), 100))
    db = get_db()
    cursor = db.payment_sessions.find(
        {"merchant_id": merchant_id},
        {"_id": 0}
    ).sort("created_at", -1).limit(limit)

    sessions = [doc async for doc in cursor]
    return {
        "count": len(sessions),
        "sessions": sessions
    }
