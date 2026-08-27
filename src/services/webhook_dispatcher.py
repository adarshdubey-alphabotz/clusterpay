import hmac
import hashlib
import json
import logging
import asyncio
import secrets
import time
import httpx
from datetime import datetime
from src.database import get_db
from src.core.security import is_safe_webhook_url

logger = logging.getLogger(__name__)

async def dispatch_signed_webhook(session: dict, merchant: dict, event: str = "payment.settled") -> bool:
    """
    Sends an HMAC-SHA256 signed webhook notification with:
    - X-ClusterPay-Timestamp (Replay attack defense)
    - X-ClusterPay-Nonce (Single-use entropy)
    - X-ClusterPay-Idempotency-Key
    - SSRF prevention
    """
    callback_url = session.get("callback_url")
    if not callback_url or not is_safe_webhook_url(callback_url):
        logger.warning(f"Invalid or unsafe callback URL: {callback_url}")
        return False

    api_key = merchant.get("api_key", "")
    timestamp = str(int(time.time()))
    nonce = secrets.token_hex(16)
    idempotency_key = f"evt_{session.get('session_id')}_{event}_{timestamp}"

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
        "paid_at": str(session.get("paid_at", "")),
        "timestamp": timestamp,
        "nonce": nonce
    }

    raw_body = json.dumps(payload, separators=(',', ':'), ensure_ascii=False).encode('utf-8')
    # Sign timestamp.nonce.raw_body to completely neutralize replay and tampering
    signature_payload = f"{timestamp}.{nonce}.".encode('utf-8') + raw_body
    signature = hmac.new(api_key.encode('utf-8'), signature_payload, hashlib.sha256).hexdigest()

    headers = {
        "Content-Type": "application/json",
        "User-Agent": "ClusterPay-Webhook/2.0",
        "X-ClusterPay-Signature": signature,
        "X-ClusterPay-Timestamp": timestamp,
        "X-ClusterPay-Nonce": nonce,
        "X-ClusterPay-Idempotency-Key": idempotency_key,
        "X-ClusterPay-Event": event,
        "X-ClusterPay-Session-Id": session.get("session_id", "")
    }

    success = False
    last_error = None

    for attempt in range(1, 4):
        try:
            async with httpx.AsyncClient(timeout=10.0, follow_redirects=False) as client:
                res = await client.post(callback_url, content=raw_body, headers=headers)
                if res.status_code in (200, 201, 202, 204):
                    success = True
                    logger.info(f"Webhook delivered to {callback_url} (HTTP {res.status_code})")
                    break
                else:
                    last_error = f"HTTP {res.status_code}: {res.text[:100]}"
        except Exception as e:
            last_error = str(e)
            await asyncio.sleep(2 ** attempt)

    db = get_db()
    if db is not None:
        try:
            await db.webhook_logs.insert_one({
                "session_id": session.get("session_id"),
                "merchant_id": merchant.get("telegram_id") or merchant.get("merchant_id"),
                "callback_url": callback_url,
                "idempotency_key": idempotency_key,
                "timestamp": timestamp,
                "nonce": nonce,
                "success": success,
                "error": last_error,
                "signature": signature,
                "created_at": datetime.utcnow()
            })
        except Exception as e:
            logger.warning(f"Failed to log webhook event: {e}")

    return success

async def dispatch_webhook(session: dict, api_key: str = "", event: str = "payment.settled") -> bool:
    merchant = {"api_key": api_key, "merchant_id": session.get("merchant_id")}
    return await dispatch_signed_webhook(session, merchant, event)
