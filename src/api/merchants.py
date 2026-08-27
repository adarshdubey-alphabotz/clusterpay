import secrets
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field
from fastapi import APIRouter, Header, HTTPException, Depends
from src.config import settings
from src.database import get_db

router = APIRouter()

def verify_admin_master_key(x_admin_key: str = Header(None)):
    if not x_admin_key or not secrets.compare_digest(x_admin_key, settings.ADMIN_MASTER_KEY):
        raise HTTPException(status_code=401, detail="Unauthorized: Invalid Admin Master Key (X-Admin-Key)")
    return True

class CreateMerchantRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100, description="Merchant or store name")
    allowed_ips: Optional[List[str]] = Field(default_factory=list, description="Optional IP whitelists for API calls")

class RevokeKeyRequest(BaseModel):
    api_key: str = Field(..., description="Full CS_key_... to revoke")

class RotateKeyRequest(BaseModel):
    merchant_id: int = Field(..., description="Merchant ID to rotate key for")

@router.post("/admin/merchants", summary="Create Merchant Account & API Key", tags=["Admin API"])
async def admin_create_merchant(req: CreateMerchantRequest, auth: bool = Depends(verify_admin_master_key)):
    """
    Generate a new merchant account and issue a secure 256-bit entropy API Key.
    Protected by your server's ADMIN_MASTER_KEY.
    """
    db = get_db()
    merchant_id = secrets.randbelow(899999) + 100000
    secret_hash = secrets.token_hex(16)
    api_key = f"CS_key_{merchant_id}_{secret_hash}"

    doc = {
        "merchant_id": merchant_id,
        "name": req.name,
        "api_key": api_key,
        "api_enabled": True,
        "allowed_ips": req.allowed_ips or [],
        "created_at": datetime.utcnow()
    }
    await db.merchants.insert_one(doc)

    return {
        "success": True,
        "merchant_id": merchant_id,
        "name": req.name,
        "api_key": api_key,
        "allowed_ips": req.allowed_ips or [],
        "created_at": doc["created_at"].isoformat() + "Z"
    }

@router.get("/admin/merchants", summary="List All Registered Merchants", tags=["Admin API"])
async def admin_list_merchants(auth: bool = Depends(verify_admin_master_key)):
    """
    List all registered merchants and their active API keys.
    """
    db = get_db()
    cursor = db.merchants.find({}, {"_id": 0}).sort("created_at", -1)
    merchants = [m async for m in cursor]
    return {
        "count": len(merchants),
        "merchants": merchants
    }

@router.post("/admin/merchants/revoke", summary="Revoke / Disable API Key", tags=["Admin API"])
async def admin_revoke_merchant(req: RevokeKeyRequest, auth: bool = Depends(verify_admin_master_key)):
    """
    Instantly revoke and disable a compromised or decommissioned merchant API Key.
    """
    db = get_db()
    res = await db.merchants.update_one({"api_key": req.api_key}, {"$set": {"api_enabled": False}})
    if res.modified_count == 0:
        raise HTTPException(status_code=404, detail="Merchant API key not found")
    return {"success": True, "message": "API key revoked and disabled successfully"}

@router.post("/admin/merchants/rotate", summary="Rotate / Regenerate API Key", tags=["Admin API"])
async def admin_rotate_key(req: RotateKeyRequest, auth: bool = Depends(verify_admin_master_key)):
    """
    Generate a fresh API Key for an existing merchant, invalidating the old key.
    """
    db = get_db()
    merchant = await db.merchants.find_one({"merchant_id": req.merchant_id})
    if not merchant:
        raise HTTPException(status_code=404, detail="Merchant ID not found")

    new_hash = secrets.token_hex(16)
    new_api_key = f"CS_key_{req.merchant_id}_{new_hash}"

    await db.merchants.update_one(
        {"merchant_id": req.merchant_id},
        {"$set": {"api_key": new_api_key, "api_enabled": True, "rotated_at": datetime.utcnow()}}
    )

    return {
        "success": True,
        "merchant_id": req.merchant_id,
        "name": merchant.get("name"),
        "new_api_key": new_api_key
    }
