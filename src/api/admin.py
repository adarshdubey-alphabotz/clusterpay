import os
import time
import uuid
import base64
import secrets
import hmac
import hashlib
import httpx
from datetime import datetime, timedelta
from typing import Optional, List
from pydantic import BaseModel
from fastapi import APIRouter, Request, HTTPException, Depends, Header, Query
from src.config import settings
from src.database import get_db

try:
    import pyotp
    _PYOTP_AVAILABLE = True
except ImportError:
    _PYOTP_AVAILABLE = False

router = APIRouter()


# ─── Models ──────────────────────────────────────────────────────────────────

class AdminAuthRequest(BaseModel):
    master_key: str
    totp_code: str  # 6-digit code from Google Authenticator / 2fa.live

class AdminChangePasswordRequest(BaseModel):
    totp_code: str        # current 2FA code — required to authorise change
    new_master_key: str   # minimum 16 characters

class AdminCreateSessionRequest(BaseModel):
    amount: float
    currency: Optional[str] = "USD"
    custom_id: Optional[str] = None
    description: Optional[str] = None
    callback_url: Optional[str] = None
    redirect_url: Optional[str] = None
    merchant_name: Optional[str] = None
    merchant_url: Optional[str] = None
    logo_url: Optional[str] = None
    theme_color: Optional[str] = None
    expiry_minutes: Optional[int] = 15
    require_email: Optional[bool] = False
    require_buyer_name: Optional[bool] = False
    customer_email: Optional[str] = None
    customer_name: Optional[str] = None
    custom_note: Optional[str] = None
    wallets: dict

class AdminCreateMerchantRequest(BaseModel):
    name: str
    allowed_ips: Optional[List[str]] = []


# ─── Session Token Engine ─────────────────────────────────────────────────────
# The master key NEVER leaves the server. On successful login we issue a
# short-lived HMAC-signed session token.  Format:
#   base64( unix_expiry_ts : HMAC-SHA256(unix_expiry_ts + ":" + MASTER_KEY) )

ADMIN_SESSION_TTL_HOURS = 8     # session lifetime
ADMIN_MAX_ATTEMPTS      = 8     # brute-force attempts before lockout
ADMIN_LOCKOUT_SECONDS   = 900   # 15-minute lockout window
_admin_fail_log: dict   = {}    # in-memory  ip -> (count, first_fail_ts)

# Runtime-mutable password — overrides settings.ADMIN_MASTER_KEY until restart.
# Changed via the /admin/change-password endpoint inside the dashboard.
_runtime_master_key: str = ""


def _get_master_key() -> str:
    return _runtime_master_key or settings.ADMIN_MASTER_KEY


def _sign_session_token(ts: int) -> str:
    key = _get_master_key()
    msg = f"{ts}:{key}"
    mac = hmac.new(key.encode(), msg.encode(), hashlib.sha256).hexdigest()
    return base64.urlsafe_b64encode(f"{ts}:{mac}".encode()).decode()


def _verify_session_token(token: str) -> bool:
    try:
        raw       = base64.urlsafe_b64decode(token.encode()).decode()
        ts_str, mac = raw.split(":", 1)
        ts        = int(ts_str)
    except Exception:
        return False
    if time.time() > ts:
        return False                        # expired
    key          = _get_master_key()
    msg          = f"{ts}:{key}"
    expected_mac = hmac.new(key.encode(), msg.encode(), hashlib.sha256).hexdigest()
    return hmac.compare_digest(mac, expected_mac)


def _verify_totp(code: str) -> bool:
    """Verify a 6-digit TOTP code.  Returns True unconditionally if ADMIN_TOTP_SECRET is unset (dev mode)."""
    secret = settings.ADMIN_TOTP_SECRET
    if not secret:
        return True     # dev-mode bypass — set ADMIN_TOTP_SECRET in production!
    if not _PYOTP_AVAILABLE:
        raise HTTPException(status_code=500, detail="pyotp not installed. Run: pip install pyotp")
    return pyotp.TOTP(secret).verify(code.strip(), valid_window=1)  # ±30 s clock drift allowed


def _check_brute_force(client_ip: str) -> bool:
    now = time.time()
    entry = _admin_fail_log.get(client_ip)
    if not entry:
        return False
    count, first_ts = entry
    if now - first_ts > ADMIN_LOCKOUT_SECONDS:
        _admin_fail_log.pop(client_ip, None)
        return False
    return count >= ADMIN_MAX_ATTEMPTS


def _record_fail(client_ip: str):
    now   = time.time()
    entry = _admin_fail_log.get(client_ip)
    if not entry or (now - entry[1]) > ADMIN_LOCKOUT_SECONDS:
        _admin_fail_log[client_ip] = (1, now)
    else:
        _admin_fail_log[client_ip] = (entry[0] + 1, entry[1])


def _clear_fail(client_ip: str):
    _admin_fail_log.pop(client_ip, None)


def verify_admin_token(authorization: Optional[str] = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Unauthorized")
    token = authorization.replace("Bearer ", "").strip()
    if not _verify_session_token(token):
        raise HTTPException(status_code=403, detail="Session expired or invalid. Re-authenticate.")
    return True


# ─── Auth Routes ──────────────────────────────────────────────────────────────

@router.post("/admin/auth", summary="Admin Login — Password + 2FA TOTP", tags=["Admin"])
async def admin_auth(req: AdminAuthRequest, request: Request):
    """
    Authenticate with your ADMIN_MASTER_KEY (password) and a 6-digit TOTP code
    from Google Authenticator, Authy, or https://2fa.live.

    Returns a short-lived signed session token valid for 8 hours.
    The master key is never returned in any response.
    """
    client_ip = (
        request.headers.get("x-forwarded-for", "")
        .split(",")[0].strip()
        or getattr(request.client, "host", "unknown")
    )

    if _check_brute_force(client_ip):
        raise HTTPException(
            status_code=429,
            detail=f"Too many failed attempts. Try again in {ADMIN_LOCKOUT_SECONDS // 60} minutes."
        )

    master_key = _get_master_key()
    submitted  = req.master_key.strip()

    # Both checks always run to prevent timing oracle — result combined at end
    pw_ok   = len(submitted) == len(master_key) and hmac.compare_digest(
        submitted.encode(), master_key.encode()
    )
    totp_ok = _verify_totp(req.totp_code)

    if not pw_ok or not totp_ok:
        _record_fail(client_ip)
        remaining = max(0, ADMIN_MAX_ATTEMPTS - _admin_fail_log.get(client_ip, (0, 0))[0])
        msg = "Invalid password or 2FA code."
        if remaining <= 3:
            msg += f" {remaining} attempt(s) remaining before lockout."
        raise HTTPException(status_code=403, detail=msg)

    _clear_fail(client_ip)
    expiry_ts    = int(time.time()) + (ADMIN_SESSION_TTL_HOURS * 3600)
    session_token = _sign_session_token(expiry_ts)

    return {
        "success":          True,
        "token":            session_token,
        "expires_in_seconds": ADMIN_SESSION_TTL_HOURS * 3600,
        "expires_at":       datetime.utcfromtimestamp(expiry_ts).isoformat() + "Z",
        "totp_enabled":     bool(settings.ADMIN_TOTP_SECRET),
    }


@router.post("/admin/change-password", summary="Change Admin Password (requires 2FA)", tags=["Admin"])
async def admin_change_password(req: AdminChangePasswordRequest, _: bool = Depends(verify_admin_token)):
    """
    Change the admin password at runtime without restarting the server.
    Requires a valid current 2FA code to authorise the change.

    Note: The change persists until the server restarts. To make it permanent,
    update ADMIN_MASTER_KEY in your .env file.
    """
    global _runtime_master_key

    if not _verify_totp(req.totp_code):
        raise HTTPException(status_code=403, detail="Invalid 2FA code. Password not changed.")

    new_key = req.new_master_key.strip()
    if len(new_key) < 16:
        raise HTTPException(status_code=400, detail="New password must be at least 16 characters.")

    _runtime_master_key = new_key
    return {
        "success": True,
        "message": "Password updated. All existing sessions are now invalid. Update ADMIN_MASTER_KEY in .env to persist after restart."
    }


# ─── Stats ────────────────────────────────────────────────────────────────────

@router.get("/admin/stats", summary="Platform Statistics & Earnings", tags=["Admin"])
async def admin_stats(
    start_date: Optional[str] = Query(None, description="YYYY-MM-DD"),
    end_date:   Optional[str] = Query(None, description="YYYY-MM-DD"),
    _: bool = Depends(verify_admin_token)
):
    db  = get_db()
    now = datetime.utcnow()
    today_start     = datetime(now.year, now.month, now.day)
    yesterday_start = today_start - timedelta(days=1)
    seven_days_ago  = today_start - timedelta(days=7)
    thirty_days_ago = today_start - timedelta(days=30)
    month_start     = datetime(now.year, now.month, 1)

    total_sessions   = await db.payment_sessions.count_documents({})
    paid_sessions    = await db.payment_sessions.count_documents({"status": "paid"})
    pending_sessions = await db.payment_sessions.count_documents({"status": "pending"})
    expired_sessions = await db.payment_sessions.count_documents({"status": "expired"})

    async def get_volume(extra_filter: dict):
        pipeline = [
            {"$match": {"status": "paid", **extra_filter}},
            {"$group": {"_id": None, "total": {"$sum": "$amount"}, "count": {"$sum": 1}}}
        ]
        res = await db.payment_sessions.aggregate(pipeline).to_list(1)
        return (round(res[0]["total"], 2), res[0]["count"]) if res else (0.0, 0)

    total_volume_usd,       _                    = await get_volume({})
    today_volume_usd,       today_paid_count     = await get_volume({"created_at": {"$gte": today_start}})
    yesterday_volume_usd,   yesterday_paid_count = await get_volume({"created_at": {"$gte": yesterday_start, "$lt": today_start}})
    last_7d_volume_usd,     last_7d_paid_count   = await get_volume({"created_at": {"$gte": seven_days_ago}})
    last_30d_volume_usd,    last_30d_paid_count  = await get_volume({"created_at": {"$gte": thirty_days_ago}})
    this_month_volume_usd,  this_month_paid_count = await get_volume({"created_at": {"$gte": month_start}})

    custom_volume_usd = 0.0
    custom_paid_count = 0
    if start_date:
        try:
            s_dt = datetime.strptime(start_date, "%Y-%m-%d")
            e_dt = datetime.strptime(end_date, "%Y-%m-%d") + timedelta(days=1) if end_date else now
            custom_volume_usd, custom_paid_count = await get_volume({"created_at": {"$gte": s_dt, "$lte": e_dt}})
        except Exception:
            pass

    daily_pipeline = [
        {"$match": {"created_at": {"$gte": now - timedelta(days=14)}}},
        {"$group": {
            "_id":          {"$dateToString": {"format": "%Y-%m-%d", "date": "$created_at"}},
            "total_volume": {"$sum": {"$cond": [{"$eq": ["$status", "paid"]}, "$amount", 0]}},
            "paid_count":   {"$sum": {"$cond": [{"$eq": ["$status", "paid"]}, 1, 0]}},
            "total_count":  {"$sum": 1}
        }},
        {"$sort": {"_id": 1}}
    ]
    daily_res = await db.payment_sessions.aggregate(daily_pipeline).to_list(30)
    daily_breakdown = [
        {
            "date":        d["_id"],
            "volume_usd":  round(d.get("total_volume", 0.0), 2),
            "paid_count":  d.get("paid_count", 0),
            "total_count": d.get("total_count", 0)
        }
        for d in daily_res if d.get("_id")
    ]

    forex_rates = {
        "USD": 1.0,    "INR": 86.85, "EUR": 0.92,  "GBP": 0.78,
        "AED": 3.67,   "CAD": 1.36,  "AUD": 1.52,  "JPY": 154.2,
        "BRL": 5.65,   "SGD": 1.34,  "USDT": 1.0
    }

    merchants_count = await db.merchants.count_documents({})

    return {
        "success":               True,
        "total_volume_usd":      total_volume_usd,
        "today_volume_usd":      today_volume_usd,       "today_paid_count":      today_paid_count,
        "yesterday_volume_usd":  yesterday_volume_usd,   "yesterday_paid_count":  yesterday_paid_count,
        "last_7d_volume_usd":    last_7d_volume_usd,     "last_7d_paid_count":    last_7d_paid_count,
        "last_30d_volume_usd":   last_30d_volume_usd,    "last_30d_paid_count":   last_30d_paid_count,
        "this_month_volume_usd": this_month_volume_usd,  "this_month_paid_count": this_month_paid_count,
        "custom_volume_usd":     custom_volume_usd,      "custom_paid_count":     custom_paid_count,
        "total_sessions":        total_sessions,
        "paid_sessions":         paid_sessions,
        "pending_sessions":      pending_sessions,
        "expired_sessions":      expired_sessions,
        "success_rate":          round((paid_sessions / max(1, total_sessions)) * 100, 1),
        "total_merchants":       merchants_count,
        "daily_breakdown":       daily_breakdown,
        "forex_rates":           forex_rates,
    }


# ─── Sessions ─────────────────────────────────────────────────────────────────

@router.get("/admin/sessions", summary="List Payment Sessions", tags=["Admin"])
async def admin_list_sessions(
    limit:      int            = 50,
    status:     Optional[str]  = None,
    search:     Optional[str]  = None,
    start_date: Optional[str]  = None,
    end_date:   Optional[str]  = None,
    _: bool = Depends(verify_admin_token)
):
    db    = get_db()
    query: dict = {}
    if status and status != "all":
        query["status"] = status
    if search:
        query["$or"] = [
            {"session_id": {"$regex": search, "$options": "i"}},
            {"custom_id":  {"$regex": search, "$options": "i"}},
            {"txid":       {"$regex": search, "$options": "i"}},
        ]
    if start_date:
        try:
            s_dt = datetime.strptime(start_date, "%Y-%m-%d")
            e_dt = datetime.strptime(end_date, "%Y-%m-%d") + timedelta(days=1) if end_date else datetime.utcnow()
            query["created_at"] = {"$gte": s_dt, "$lte": e_dt}
        except Exception:
            pass

    cursor = db.payment_sessions.find(query).sort("created_at", -1).limit(min(limit, 200))
    docs   = await cursor.to_list(min(limit, 200))
    return {
        "success":  True,
        "sessions": [
            {
                "session_id": d.get("session_id"),
                "amount":     d.get("amount"),
                "currency":   d.get("currency", "USD"),
                "status":     d.get("status", "pending"),
                "custom_id":  d.get("custom_id"),
                "txid":       d.get("txid"),
                "coin":       d.get("coin"),
                "callback_url": d.get("callback_url"),
                "wallets":    d.get("wallets", {}),
                "merchant_name": d.get("merchant_name"),
                "created_at": d["created_at"].isoformat() if d.get("created_at") else None,
                "expires_at": d["expires_at"].isoformat() if d.get("expires_at") else None,
            }
            for d in docs
        ]
    }


@router.post("/admin/sessions/create", summary="Create Direct Payment Session", tags=["Admin"])
async def admin_create_session(req: AdminCreateSessionRequest, _: bool = Depends(verify_admin_token)):
    if req.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be > 0")
    from src.core.micro_offset import generate_micro_offset_amount
    effective_amount = generate_micro_offset_amount(req.amount)
    session_id      = f"cpay_{uuid.uuid4().hex[:16]}"
    now             = datetime.utcnow()
    exp_mins        = max(5, min(req.expiry_minutes or 15, 1440))
    expires_at      = now + timedelta(minutes=exp_mins)

    doc = {
        "session_id":         session_id,
        "merchant_id":        "admin_direct",
        "merchant_name":      req.merchant_name  or "ClusterPay Hosted Checkout",
        "merchant_url":       req.merchant_url   or "",
        "logo_url":           req.logo_url        or "",
        "theme_color":        req.theme_color     or "",
        "redirect_url":       req.redirect_url    or "",
        "mode":               "hosted",
        "allowed_origins":    ["*"],
        "amount":             effective_amount,
        "base_amount":        req.amount,
        "original_amount":    req.amount,
        "original_currency":  (req.currency or "USD").upper(),
        "callback_url":       req.callback_url   or "",
        "custom_id":          req.custom_id       or f"ORDER-{secrets.token_hex(3).upper()}",
        "description":        req.description     or "ClusterPay Direct Invoice",
        "wallets":            req.wallets,
        "require_email":      bool(req.require_email),
        "require_buyer_name": bool(req.require_buyer_name),
        "customer_email":     req.customer_email  or "",
        "customer_name":      req.customer_name   or "",
        "custom_note":        req.custom_note     or "",
        "status":             "pending",
        "created_at":         now,
        "expires_at":         expires_at,
    }

    db = get_db()
    await db.payment_sessions.insert_one(doc)

    return {
        "success":     True,
        "session_id":  session_id,
        "payment_url": f"{settings.BASE_URL}/gateway/pay/{session_id}",
        "amount":      effective_amount,
        "expires_at":  expires_at.isoformat(),
    }


# ─── Webhooks ─────────────────────────────────────────────────────────────────

@router.post("/admin/webhooks/resend/{session_id}", summary="Re-dispatch Webhook", tags=["Admin"])
async def admin_resend_webhook(session_id: str, _: bool = Depends(verify_admin_token)):
    db      = get_db()
    session = await db.payment_sessions.find_one({"session_id": session_id})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    callback_url = session.get("callback_url")
    if not callback_url:
        raise HTTPException(status_code=400, detail="No callback_url configured for this session")

    payload = {
        "event":      "payment.settled",
        "session_id": session["session_id"],
        "custom_id":  session.get("custom_id"),
        "amount":     session.get("amount"),
        "txid":       session.get("txid", "0xManualResend"),
        "status":     session.get("status", "paid"),
        "timestamp":  int(datetime.utcnow().timestamp()),
    }

    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.post(callback_url, json=payload)
            return {"success": True, "http_status": resp.status_code}
    except Exception as e:
        return {"success": False, "http_status": 500, "error": str(e)}


# ─── Merchants ────────────────────────────────────────────────────────────────

@router.get("/admin/merchants", summary="List Merchant API Keys", tags=["Admin"])
async def admin_list_merchants(_: bool = Depends(verify_admin_token)):
    db = get_db()
    docs = await db.merchants.find({}).sort("created_at", -1).to_list(100)
    return {
        "success":   True,
        "merchants": [
            {
                "merchant_id":  str(m.get("merchant_id", m.get("_id"))),
                "name":         m.get("name", "Merchant Account"),
                "api_key":      m.get("api_key"),
                "allowed_ips":  m.get("allowed_ips", []),
                "created_at":   m["created_at"].isoformat() if m.get("created_at") else None,
            }
            for m in docs
        ]
    }


@router.post("/admin/merchants", summary="Issue New Merchant API Key", tags=["Admin"])
async def admin_create_merchant(req: AdminCreateMerchantRequest, _: bool = Depends(verify_admin_token)):
    db          = get_db()
    api_key     = f"CS_key_live_{secrets.token_hex(20)}"
    merchant_id = f"m_{uuid.uuid4().hex[:8]}"
    await db.merchants.insert_one({
        "merchant_id":  merchant_id,
        "name":         req.name,
        "api_key":      api_key,
        "allowed_ips":  req.allowed_ips or [],
        "created_at":   datetime.utcnow(),
    })
    return {"success": True, "merchant": {"merchant_id": merchant_id, "name": req.name, "api_key": api_key}}


# ─── RPC Health ───────────────────────────────────────────────────────────────

@router.get("/admin/rpc-health", summary="RPC Node Latency Monitor", tags=["Admin"])
async def admin_rpc_health(_: bool = Depends(verify_admin_token)):
    nodes = {
        "BNB Smart Chain": "https://bsc-dataseed.binance.org",
        "Polygon PoS":     "https://polygon-rpc.com",
        "Arbitrum One":    "https://arb1.arbitrum.io/rpc",
        "TRON Grid":       "https://api.trongrid.io",
    }
    results = []
    async with httpx.AsyncClient(timeout=4.0) as client:
        for name, url in nodes.items():
            start = time.time()
            try:
                if "trongrid" in url:
                    r = await client.get(f"{url}/v1/node/info")
                else:
                    r = await client.post(url, json={"jsonrpc": "2.0", "method": "eth_blockNumber", "params": [], "id": 1})
                latency_ms = int((time.time() - start) * 1000)
                status     = "healthy" if r.status_code == 200 else "degraded"
            except Exception:
                latency_ms = -1
                status     = "unreachable"
            results.append({"network": name, "url": url, "latency_ms": latency_ms, "status": status})

    return {"success": True, "nodes": results}
