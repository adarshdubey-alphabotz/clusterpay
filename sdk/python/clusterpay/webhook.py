import hmac
import hashlib
import time

def verify_webhook_signature(
    raw_payload_bytes: bytes,
    signature: str,
    timestamp: str = "",
    nonce: str = "",
    api_key: str = "",
    max_drift_seconds: int = 300
) -> bool:
    """
    Cryptographically verify incoming X-ClusterPay-Signature header using timing-safe HMAC-SHA256
    over timestamp.nonce.raw_body with 5-minute replay defense.
    """
    if not signature or not api_key:
        return False
    if timestamp:
        try:
            if abs(int(time.time()) - int(timestamp)) > max_drift_seconds:
                return False
        except (ValueError, TypeError):
            return False

    payload = f"{timestamp}.{nonce}.".encode("utf-8") + raw_payload_bytes if (timestamp and nonce) else raw_payload_bytes
    expected_signature = hmac.new(api_key.encode("utf-8"), payload, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected_signature, signature)
