import hmac
import hashlib

def verify_webhook_signature(raw_payload_bytes: bytes, signature_header: str, api_key: str) -> bool:
    """
    Cryptographically verify incoming X-ClusterPay-Signature header using timing-safe HMAC-SHA256.
    """
    if not signature_header or not api_key:
        return False
    expected_signature = hmac.new(api_key.encode('utf-8'), raw_payload_bytes, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected_signature, signature_header)
