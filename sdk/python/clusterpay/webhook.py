import hmac
import hashlib
import time
from typing import Union

def verify_webhook_signature(
    raw_payload: Union[bytes, str],
    signature: str,
    timestamp: str = "",
    nonce: str = "",
    api_key: str = "",
    max_drift_seconds: int = 300
) -> bool:
    """
    Cryptographically verifies an incoming ClusterPay webhook notification.

    Parameters:
        raw_payload (bytes or str): The raw HTTP request body bytes (do NOT parse JSON before verifying).
        signature (str): Value of the 'X-ClusterPay-Signature' header.
        timestamp (str): Value of the 'X-ClusterPay-Timestamp' header.
        nonce (str): Value of the 'X-ClusterPay-Nonce' header.
        api_key (str): Your ClusterPay Merchant API Key (e.g. 'CS_key_live_...').
        max_drift_seconds (int): Maximum allowed clock drift in seconds (default: 300 = 5 minutes).

    Returns:
        bool: True if signature is cryptographically valid and within acceptable timestamp window.
    """
    if not signature or not api_key:
        return False

    # 1. Anti-Replay Timestamp Drift Defense
    if timestamp:
        try:
            ts_int = int(timestamp)
            current_time = int(time.time())
            if abs(current_time - ts_int) > max_drift_seconds:
                return False
        except (ValueError, TypeError):
            return False

    # 2. Normalize Payload Bytes
    if isinstance(raw_payload, str):
        payload_bytes = raw_payload.encode("utf-8")
    else:
        payload_bytes = raw_payload

    # 3. Compute Expected HMAC-SHA256 Signature
    if timestamp and nonce:
        signed_bytes = f"{timestamp}.{nonce}.".encode("utf-8") + payload_bytes
    else:
        signed_bytes = payload_bytes

    expected_sig = hmac.new(
        api_key.encode("utf-8"),
        signed_bytes,
        hashlib.sha256
    ).hexdigest()

    # 4. Constant-Time Timing-Safe Comparison
    return hmac.compare_digest(expected_sig, signature.strip())
