import ipaddress
import socket
from urllib.parse import urlparse
from fastapi import Request, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from src.database import get_db

security = HTTPBearer()

BLOCKED_SUBNETS = [
    ipaddress.ip_network("127.0.0.0/8"),
    ipaddress.ip_network("10.0.0.0/8"),
    ipaddress.ip_network("172.16.0.0/12"),
    ipaddress.ip_network("192.168.0.0/16"),
    ipaddress.ip_network("169.254.0.0/16"),
    ipaddress.ip_network("::1/128"),
    ipaddress.ip_network("fc00::/7"),
    ipaddress.ip_network("fe80::/10"),
]

def is_safe_webhook_url(url: str) -> bool:
    """
    Anti-SSRF Protection: Prevents malicious merchants/attackers
    from providing callback URLs targeting internal infrastructure or cloud metadata.
    """
    try:
        parsed = urlparse(url)
        if parsed.scheme not in ("http", "https"):
            return False
        hostname = parsed.hostname
        if not hostname:
            return False
        if hostname.lower() in ("localhost", "127.0.0.1", "0.0.0.0"):
            return False

        # Resolve IP to ensure it does not route to internal/loopback subnets
        ip_str = socket.gethostbyname(hostname)
        ip = ipaddress.ip_address(ip_str)
        for subnet in BLOCKED_SUBNETS:
            if ip in subnet:
                return False
        return True
    except Exception:
        return False

async def verify_merchant_key(request: Request, credentials: HTTPAuthorizationCredentials = Depends(security)):
    api_key = credentials.credentials
    if not isinstance(api_key, str) or len(api_key) < 12 or not (api_key.startswith("CS_key_") or api_key.startswith("cp_live_") or api_key.startswith("cpay_") or api_key.startswith("cp_test_")):
        raise HTTPException(status_code=401, detail="Invalid API key format (must start with cp_live_, cp_test_, cpay_, or CS_key_)")

    db = get_db()
    merchant = await db.merchants.find_one({"api_key": api_key})
    if not merchant:
        merchant = await db.users.find_one({"api_key": api_key})
        if not merchant:
            raise HTTPException(status_code=401, detail="Unauthorized: Invalid Merchant API Key")

    if merchant.get("is_banned"):
        raise HTTPException(status_code=403, detail="Merchant account is suspended")
    if not merchant.get("api_enabled", True):
        raise HTTPException(status_code=403, detail="API Key is disabled")

    # IP Whitelist validation
    allowed_ips = merchant.get("allowed_ips", [])
    if allowed_ips:
        client_ip = request.client.host
        forwarded_for = request.headers.get("x-forwarded-for")
        if forwarded_for:
            client_ip = forwarded_for.split(",")[0].strip()
        if client_ip not in allowed_ips:
            raise HTTPException(status_code=403, detail=f"Access denied: Client IP {client_ip} is not whitelisted")

    return merchant
