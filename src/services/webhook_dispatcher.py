import hmac
import hashlib
import json
import logging
import asyncio
import httpx
from datetime import datetime
from src.database import get_db

logger = logging.getLogger(__name__)

async def dispatch_signed_webhook(session: dict, merchant: dict, event: str = "payment.settled") -> bool:
    """
    Sends an HMAC-SHA256 signed webhook notification to the merchant's callback_url.
    """
    callback_url = session.get("callback_url")
    if not callback_url:
        return False

    api_key = merchant.get("api_key", "")
    payload = {
        "event": event,
        "session_id": session.get("session_id"),
        "custom_id": session.get("custom_id"),
        "status": session.get("status"),
        "amount": session.get("amount"),
        "base_amount": session.get("base_amount"),
        "currency": session.get("currency", "USD"),
        "coin": session.get("coin"),
        "tx_hash": session.get("tx_hash"),
        "created_at": str(session.get("created_at")),
        "paid_at": str(session.get("paid_at", ""))
    }

    raw_body = json.dumps(payload, separators=(',', ':'), ensure_ascii=False).encode('utf-8')
    signature = hmac.new(api_key.encode('utf-8'), raw_body, hashlib.sha256).hexdigest()

    headers = {
        "Content-Type": "application/json",
        "User-Agent": "ClusterPay-Webhook/2.0",
        "X-ClusterPay-Signature": signature,
        "X-ClusterPay-Event": event,
        "X-ClusterPay-Session-Id": session.get("session_id", "")
    }

    success = False
    last_error = None

    # Retry loop with backoff
    for attempt in range(1, 4):
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(callback_url, content=raw_body, headers=headers)
                if res.status_code in (200, 201, 202, 204):
                    success = True
                    logger.info(f"Webhook dispatched successfully to {callback_url} for session {session.get('session_id')}")
                    break
                else:
                    last_error = f"HTTP {res.status_code}: {res.text[:100]}"
        except Exception as e:
            last_error = str(e)
            await asyncio.sleep(2 ** attempt)

    # Log webhook attempt to DB
    db = get_db()
    if db:
        await db.webhook_logs.insert_one({
            "session_id": session.get("session_id"),
            "merchant_id": merchant.get("telegram_id") or merchant.get("merchant_id"),
            "callback_url": callback_url,
            "success": success,
            "error": last_error,
            "signature": signature,
            "created_at": datetime.utcnow()
        })

    return success
