import time
import uuid
import secrets
import hmac
import hashlib
import httpx
from datetime import datetime, timedelta
from typing import Optional, List
from pydantic import BaseModel
from fastapi import APIRouter, Request, Response, HTTPException, Depends, Header
from fastapi.responses import HTMLResponse, JSONResponse
from src.config import settings
from src.database import get_db
from src.services.webhook_dispatcher import dispatch_webhook

router = APIRouter()

# ── AUTH HELPERS ─────────────────────────────────────────────────────────────

class AdminAuthRequest(BaseModel):
    master_key: str

class AdminCreateSessionRequest(BaseModel):
    amount: float
    currency: Optional[str] = "USD"
    custom_id: Optional[str] = None
    callback_url: Optional[str] = "https://yourstore.com/api/webhook"
    description: Optional[str] = None
    wallets: dict

class AdminCreateMerchantRequest(BaseModel):
    name: str
    allowed_ips: Optional[List[str]] = []

def verify_admin_token(authorization: Optional[str] = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Admin master key authorization header missing")
    token = authorization.replace("Bearer ", "").strip()
    # Timing-safe comparison with configured master key
    if not hmac.compare_digest(token, settings.ADMIN_MASTER_KEY):
        raise HTTPException(status_code=403, detail="Invalid admin master key")
    return True

# ── ADMIN API ENDPOINTS ──────────────────────────────────────────────────────

@router.post("/admin/auth", summary="Validate Master Key")
async def admin_auth(req: AdminAuthRequest):
    if not hmac.compare_digest(req.master_key.strip(), settings.ADMIN_MASTER_KEY):
        raise HTTPException(status_code=403, detail="Invalid master admin key")
    return {"success": True, "token": req.master_key.strip()}

@router.get("/admin/stats", summary="Platform Statistics")
async def admin_stats(_: bool = Depends(verify_admin_token)):
    db = get_db()
    
    total_sessions = await db.payment_sessions.count_documents({})
    paid_sessions = await db.payment_sessions.count_documents({"status": "paid"})
    pending_sessions = await db.payment_sessions.count_documents({"status": "pending"})
    expired_sessions = await db.payment_sessions.count_documents({"status": "expired"})
    
    # Calculate total volume paid
    pipeline = [
        {"$match": {"status": "paid"}},
        {"$group": {"_id": None, "total_usd": {"$sum": "$amount"}}}
    ]
    vol_cursor = db.payment_sessions.aggregate(pipeline)
    vol_res = await vol_cursor.to_list(1)
    total_volume_usd = round(vol_res[0]["total_usd"], 2) if vol_res else 0.0

    merchants_count = await db.merchants.count_documents({})

    return {
        "success": True,
        "total_volume_usd": total_volume_usd,
        "total_sessions": total_sessions,
        "paid_sessions": paid_sessions,
        "pending_sessions": pending_sessions,
        "expired_sessions": expired_sessions,
        "success_rate": round((paid_sessions / max(1, total_sessions)) * 100, 1),
        "total_merchants": merchants_count
    }

@router.get("/admin/sessions", summary="List All Sessions")
async def admin_list_sessions(
    limit: int = 50, 
    status: Optional[str] = None, 
    search: Optional[str] = None,
    _: bool = Depends(verify_admin_token)
):
    db = get_db()
    query = {}
    if status and status != "all":
        query["status"] = status
    if search:
        query["$or"] = [
            {"session_id": {"$regex": search, "$options": "i"}},
            {"custom_id": {"$regex": search, "$options": "i"}},
            {"txid": {"$regex": search, "$options": "i"}}
        ]

    cursor = db.payment_sessions.find(query).sort("created_at", -1).limit(min(limit, 200))
    docs = await cursor.to_list(min(limit, 200))

    results = []
    for d in docs:
        results.append({
            "session_id": d.get("session_id"),
            "amount": d.get("amount"),
            "currency": d.get("currency", "USD"),
            "status": d.get("status", "pending"),
            "custom_id": d.get("custom_id"),
            "txid": d.get("txid"),
            "coin": d.get("coin"),
            "callback_url": d.get("callback_url"),
            "wallets": d.get("wallets", {}),
            "created_at": d.get("created_at").isoformat() if d.get("created_at") else None,
            "expires_at": d.get("expires_at").isoformat() if d.get("expires_at") else None
        })

    return {"success": True, "sessions": results}

@router.post("/admin/sessions/create", summary="Create Invoice from Admin UI")
async def admin_create_session(req: AdminCreateSessionRequest, _: bool = Depends(verify_admin_token)):
    from src.core.micro_offset import generate_micro_offset_amount
    
    if req.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be > 0")
    if not req.wallets:
        raise HTTPException(status_code=400, detail="At least 1 wallet address required")

    effective_amount = generate_micro_offset_amount(req.amount)
    session_id = f"cpay_{uuid.uuid4().hex[:20]}"
    now = datetime.utcnow()
    expires_at = now + timedelta(minutes=15)

    doc = {
        "session_id": session_id,
        "merchant_id": "admin_portal",
        "amount": effective_amount,
        "base_amount": req.amount,
        "currency": (req.currency or "USD").upper(),
        "callback_url": req.callback_url,
        "custom_id": req.custom_id or f"ADMIN-{secrets.token_hex(4).upper()}",
        "description": req.description or "Created from Admin Console",
        "wallets": req.wallets,
        "status": "pending",
        "created_at": now,
        "expires_at": expires_at
    }

    db = get_db()
    await db.payment_sessions.insert_one(doc)

    return {
        "success": True,
        "session_id": session_id,
        "payment_url": f"{settings.BASE_URL}/gateway/pay/{session_id}",
        "amount": effective_amount,
        "expires_at": expires_at.isoformat()
    }

@router.post("/admin/webhooks/resend/{session_id}", summary="Re-dispatch Webhook")
async def admin_resend_webhook(session_id: str, _: bool = Depends(verify_admin_token)):
    db = get_db()
    session = await db.payment_sessions.find_one({"session_id": session_id})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    callback_url = session.get("callback_url")
    if not callback_url:
        raise HTTPException(status_code=400, detail="No callback_url configured for this session")

    payload = {
        "event": "payment.settled",
        "session_id": session["session_id"],
        "custom_id": session.get("custom_id"),
        "amount_expected": session.get("amount"),
        "amount_received": session.get("amount_received", session.get("amount")),
        "currency": session.get("currency", "USDT"),
        "txid": session.get("txid", "0xManualResend"),
        "status": session.get("status", "paid"),
        "timestamp": int(datetime.utcnow().timestamp())
    }

    secret = settings.ADMIN_MASTER_KEY
    success, status_code, err = await dispatch_webhook(callback_url, payload, secret)
    return {"success": success, "http_status": status_code, "error": err}

@router.get("/admin/merchants", summary="List Merchants & API Keys")
async def admin_list_merchants(_: bool = Depends(verify_admin_token)):
    db = get_db()
    cursor = db.merchants.find({}).sort("created_at", -1)
    merchants = await cursor.to_list(100)
    
    res = []
    for m in merchants:
        res.append({
            "merchant_id": m.get("merchant_id"),
            "name": m.get("name"),
            "api_key": m.get("api_key"),
            "allowed_ips": m.get("allowed_ips", []),
            "created_at": m.get("created_at").isoformat() if m.get("created_at") else None
        })
    return {"success": True, "merchants": res}

@router.post("/admin/merchants", summary="Create New API Key")
async def admin_create_merchant(req: AdminCreateMerchantRequest, _: bool = Depends(verify_admin_token)):
    db = get_db()
    merchant_id = secrets.token_hex(4).upper()
    api_key = f"CS_key_live_{secrets.token_hex(20)}"
    
    doc = {
        "merchant_id": merchant_id,
        "name": req.name,
        "api_key": api_key,
        "allowed_ips": req.allowed_ips or [],
        "created_at": datetime.utcnow()
    }
    await db.merchants.insert_one(doc)
    return {"success": True, "merchant": doc}

@router.get("/admin/rpc-health", summary="Test Blockchain RPC Latency")
async def admin_rpc_health(_: bool = Depends(verify_admin_token)):
    nodes = {
        "BNB Smart Chain": "https://bsc-dataseed.binance.org",
        "Polygon PoS": "https://polygon-rpc.com",
        "Arbitrum One": "https://arb1.arbitrum.io/rpc",
        "TRON Grid": "https://api.trongrid.io"
    }

    results = []
    async with httpx.AsyncClient(timeout=4.0) as client:
        for name, url in nodes.items():
            start = time.time()
            try:
                if "trongrid" in url:
                    r = await client.get(f"{url}/v1/node/info")
                else:
                    r = await client.post(url, json={"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1})
                latency_ms = int((time.time() - start) * 1000)
                status = "healthy" if r.status_code == 200 else "degraded"
            except Exception as e:
                latency_ms = -1
                status = "unreachable"
            
            results.append({
                "network": name,
                "url": url,
                "latency_ms": latency_ms,
                "status": status
            })

    return {"success": True, "nodes": results}
