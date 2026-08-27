from fastapi import Request, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from src.database import get_db

security = HTTPBearer()

async def verify_merchant_key(request: Request, credentials: HTTPAuthorizationCredentials = Depends(security)):
    api_key = credentials.credentials
    if not isinstance(api_key, str) or len(api_key) < 12 or not api_key.startswith("CS_key_"):
        raise HTTPException(status_code=401, detail="Invalid API key format")

    db = get_db()
    merchant = await db.merchants.find_one({"api_key": api_key})
    if not merchant:
        # Check users collection if shared
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
