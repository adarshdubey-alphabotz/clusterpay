from fastapi import APIRouter, Depends, HTTPException
from src.core.security import verify_merchant_key
from src.services.webhook_dispatcher import dispatch_signed_webhook
from src.database import get_db

router = APIRouter()

@router.post("/webhook/resend/{session_id}", summary="Resend Webhook Notification")
async def resend_webhook(session_id: str, merchant: dict = Depends(verify_merchant_key)):
    """
    Manually re-triggers the cryptographic HMAC-SHA256 webhook to your callback_url.
    """
    merchant_id = merchant.get("telegram_id") or merchant.get("merchant_id")
    db = get_db()
    session = await db.payment_sessions.find_one({"session_id": session_id})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if session["merchant_id"] != merchant_id:
        raise HTTPException(status_code=403, detail="Access denied")

    success = await dispatch_signed_webhook(session, merchant, event="payment.resend")
    return {
        "success": success,
        "message": "Webhook dispatched successfully" if success else "Webhook delivery failed"
    }
