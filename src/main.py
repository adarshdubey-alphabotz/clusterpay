import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, PlainTextResponse
from src.database import init_db
from src.api.checkout import router as checkout_router
from src.api.status import router as status_router
from src.api.sessions import router as sessions_router
from src.api.webhooks import router as webhooks_router

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("clusterpay")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing ClusterPay Gateway...")
    await init_db()
    yield
    logger.info("Shutting down ClusterPay Gateway...")

app = FastAPI(
    title="ClusterPay Merchant Gateway API",
    version="2.0.0",
    description="High-performance, non-custodial cryptocurrency checkout and payment gateway API.",
    docs_url=None,
    redoc_url=None,
    openapi_url="/api/v1/openapi.json",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from src.api.merchants import router as merchants_router

# Mount API Routers
app.include_router(checkout_router, prefix="/api/v1", tags=["Merchant Checkout"])
app.include_router(status_router, prefix="/api/v1", tags=["Payment Verification"])
app.include_router(sessions_router, prefix="/api/v1", tags=["Merchant Sessions"])
app.include_router(webhooks_router, prefix="/api/v1", tags=["Webhooks"])
app.include_router(merchants_router, prefix="/api/v1", tags=["Admin API"])

@app.get("/health", tags=["System"])
async def health_check():
    return {"status": "ok", "service": "ClusterPay Gateway", "version": "2.0.0"}

@app.get("/admin", include_in_schema=False)
async def admin_portal():
    html = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>ClusterPay · Admin & Merchant Control Portal</title>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    :root { --bg: #0b0f19; --card: #111827; --border: #1f2937; --primary: #3b82f6; --text: #f3f4f6; --muted: #9ca3af; --green: #10b981; --red: #ef4444; }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Plus Jakarta Sans', sans-serif; }
    body { background: var(--bg); color: var(--text); padding: 20px; min-height: 100vh; display: flex; justify-content: center; }
    .container { width: 100%; max-width: 960px; }
    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border); padding-bottom: 16px; margin-bottom: 24px; }
    .logo-wrap { display: flex; align-items: center; gap: 12px; }
    .logo { width: 38px; height: 38px; background: linear-gradient(135deg, #3b82f6, #8b5cf6); border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 20px; box-shadow: 0 0 15px rgba(59,130,246,0.4); }
    .title { font-size: 18px; font-weight: 800; }
    .card { background: var(--card); border: 1px solid var(--border); border-radius: 16px; padding: 24px; margin-bottom: 24px; }
    .auth-box { max-width: 420px; margin: 60px auto; text-align: center; }
    .input { width: 100%; padding: 12px 16px; background: #0d131f; border: 1px solid var(--border); border-radius: 10px; color: #fff; font-size: 14px; margin-top: 8px; margin-bottom: 16px; outline: none; }
    .input:focus { border-color: var(--primary); }
    .btn { background: var(--primary); color: #fff; border: none; border-radius: 10px; padding: 12px 20px; font-weight: 700; cursor: pointer; transition: 0.2s; width: 100%; }
    .btn:hover { opacity: 0.9; }
    .btn-danger { background: var(--red); }
    .btn-sm { padding: 6px 12px; font-size: 12px; width: auto; }
    .table-wrap { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 13px; }
    th { text-align: left; padding: 12px; color: var(--muted); border-bottom: 1px solid var(--border); font-weight: 600; }
    td { padding: 12px; border-bottom: 1px solid rgba(255,255,255,0.05); }
    .font-mono { font-family: 'JetBrains Mono', monospace; }
    .badge { padding: 3px 8px; border-radius: 6px; font-size: 11px; font-weight: 700; }
    .badge-green { background: rgba(16,185,129,0.15); color: var(--green); border: 1px solid rgba(16,185,129,0.3); }
    .badge-red { background: rgba(239,68,68,0.15); color: var(--red); border: 1px solid rgba(239,68,68,0.3); }
  </style>
</head>
<body>
  <div class="container">
    <div id="authSection" class="card auth-box">
      <div class="logo" style="margin: 0 auto 16px;">⚡</div>
      <h2 style="font-weight: 800;">ClusterPay Admin Portal</h2>
      <p style="color: var(--muted); font-size: 13px; margin: 8px 0 20px;">Enter your server's ADMIN_MASTER_KEY to manage API credentials.</p>
      <input type="password" id="adminKeyInput" class="input font-mono" placeholder="Enter ADMIN_MASTER_KEY">
      <button class="btn" onclick="login()">Authenticate</button>
      <div id="authError" style="color: var(--red); font-size: 12px; margin-top: 12px; display: none;">Invalid Admin Master Key</div>
    </div>

    <div id="dashboardSection" style="display: none;">
      <div class="header">
        <div class="logo-wrap">
          <div class="logo">⚡</div>
          <div>
            <div class="title">ClusterPay Self-Hosted Control Panel</div>
            <div style="font-size: 12px; color: var(--muted);">Multi-Merchant Management & Security Hub</div>
          </div>
        </div>
        <button class="btn btn-sm btn-danger" onclick="logout()">Logout</button>
      </div>

      <div class="card">
        <h3 style="font-size: 16px; font-weight: 700; margin-bottom: 12px;">➕ Issue New Merchant API Key</h3>
        <div style="display: flex; gap: 12px; flex-wrap: wrap;">
          <input type="text" id="newMerchantName" class="input" style="flex: 2; margin: 0;" placeholder="Store / Merchant Name">
          <input type="text" id="newMerchantIps" class="input font-mono" style="flex: 2; margin: 0;" placeholder="Allowed IPs (optional, comma-separated)">
          <button class="btn" style="flex: 1; min-width: 140px; margin: 0;" onclick="createMerchant()">Generate Key</button>
        </div>
      </div>

      <div class="card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <h3 style="font-size: 16px; font-weight: 700;">🔑 Registered Merchants & API Keys</h3>
          <button class="btn btn-sm" onclick="loadMerchants()">🔄 Refresh</button>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>API Key (Bearer Token)</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody id="merchantTableBody">
              <tr><td colspan="5" style="text-align: center; color: var(--muted);">Loading...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>

  <script>
    function getStoredKey() { return sessionStorage.getItem('cpay_admin_key'); }
    function login() {
      const key = document.getElementById('adminKeyInput').value.trim();
      if (!key) return;
      sessionStorage.setItem('cpay_admin_key', key);
      loadMerchants();
    }
    function logout() {
      sessionStorage.removeItem('cpay_admin_key');
      document.getElementById('dashboardSection').style.display = 'none';
      document.getElementById('authSection').style.display = 'block';
    }
    async function loadMerchants() {
      const key = getStoredKey();
      if (!key) { logout(); return; }
      try {
        const res = await fetch('/api/v1/admin/merchants', { headers: { 'X-Admin-Key': key } });
        if (!res.ok) throw new Error('Auth failed');
        const data = await res.json();
        document.getElementById('authSection').style.display = 'none';
        document.getElementById('dashboardSection').style.display = 'block';
        renderTable(data.merchants || []);
      } catch (e) {
        document.getElementById('authError').style.display = 'block';
        logout();
      }
    }
    function renderTable(merchants) {
      const tbody = document.getElementById('merchantTableBody');
      if (merchants.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color: var(--muted);">No merchants registered yet. Create your first key above!</td></tr>';
        return;
      }
      tbody.innerHTML = merchants.map(m => `
        <tr>
          <td class="font-mono">#${m.merchant_id}</td>
          <td style="font-weight: 600;">${m.name}</td>
          <td><code class="font-mono" style="background:#0d131f; padding: 4px 8px; border-radius: 6px; border: 1px solid #1f2937;">${m.api_key}</code></td>
          <td><span class="badge ${m.api_enabled ? 'badge-green' : 'badge-red'}">${m.api_enabled ? 'Active' : 'Revoked'}</span></td>
          <td>
            ${m.api_enabled ? `
              <button class="btn btn-sm btn-danger" onclick="revokeKey('${m.api_key}')">Revoke</button>
              <button class="btn btn-sm" style="background: #4b5563; margin-left: 6px;" onclick="rotateKey(${m.merchant_id})">Rotate</button>
            ` : '<span style="color: var(--muted); font-size: 11px;">Disabled</span>'}
          </td>
        </tr>
      `).join('');
    }
    async function createMerchant() {
      const name = document.getElementById('newMerchantName').value.trim();
      const ips = document.getElementById('newMerchantIps').value.trim();
      if (!name) return alert('Please enter a merchant name');
      const key = getStoredKey();
      const payload = { name: name, allowed_ips: ips ? ips.split(',').map(s=>s.trim()) : [] };
      const res = await fetch('/api/v1/admin/merchants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': key },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        document.getElementById('newMerchantName').value = '';
        document.getElementById('newMerchantIps').value = '';
        loadMerchants();
      } else {
        alert('Failed to generate key');
      }
    }
    async function revokeKey(apiKey) {
      if (!confirm('Are you sure you want to permanently revoke this API key?')) return;
      const key = getStoredKey();
      await fetch('/api/v1/admin/merchants/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': key },
        body: JSON.stringify({ api_key: apiKey })
      });
      loadMerchants();
    }
    async function rotateKey(merchantId) {
      if (!confirm('Rotate key? The old key will stop working immediately.')) return;
      const key = getStoredKey();
      await fetch('/api/v1/admin/merchants/rotate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': key },
        body: JSON.stringify({ merchant_id: merchantId })
      });
      loadMerchants();
    }
    if (getStoredKey()) loadMerchants();
  </script>
</body>
</html>"""
    return HTMLResponse(content=html)

@app.get("/js/v1/clusterpay.js", include_in_schema=False)
async def serve_sdk_js():
    js_code = """(function(window){window.ClusterPay=function(publicKey){return{mount:function(selector,options){var container=document.querySelector(selector);if(!container){console.error('Target not found:',selector);return;}var sessionId=options.session_id||'';var height=options.height||650;var baseUrl=options.baseUrl||'https://pay.rapidx.me';var iframe=document.createElement('iframe');iframe.src=baseUrl+'/gateway/pay/'+sessionId+'?embed=true';iframe.style.width='100%';iframe.style.height=height+'px';iframe.style.border='none';iframe.style.borderRadius='16px';iframe.style.boxShadow='0 10px 30px rgba(0,0,0,0.3)';iframe.allow='payment';container.innerHTML='';container.appendChild(iframe);window.addEventListener('message',function(e){if(e.data&&e.data.type==='CLUSTERPAY_SUCCESS'){if(typeof options.onSuccess==='function'){options.onSuccess(e.data.payload);}}if(e.data&&e.data.type==='CLUSTERPAY_EXPIRED'){if(typeof options.onExpire==='function'){options.onExpire(e.data.payload);}}});}};};})(window);"""
    return PlainTextResponse(js_code, media_type="application/javascript")

@app.get("/docs", include_in_schema=False)
@app.get("/api/v1/docs", include_in_schema=False)
async def get_mobile_docs():
    html_content = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">
  <title>ClusterPay Merchant Gateway · API Documentation</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css">
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg-color: #0b0f19;
      --card-bg: #111827;
      --card-border: #1f2937;
      --primary: #3b82f6;
      --text-main: #f3f4f6;
      --text-muted: #9ca3af;
      --font-sans: 'Plus Jakarta Sans', sans-serif;
      --font-mono: 'JetBrains Mono', monospace;
    }
    * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
    body { margin: 0; padding: 0; background-color: var(--bg-color); color: var(--text-main); font-family: var(--font-sans); -webkit-font-smoothing: antialiased; overflow-x: hidden; width: 100%; }
    .custom-header { background: rgba(17, 24, 39, 0.9); backdrop-filter: blur(12px); border-bottom: 1px solid var(--card-border); padding: 12px 16px; display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; z-index: 100; }
    .header-brand { display: flex; align-items: center; gap: 10px; text-decoration: none; color: #fff; }
    .header-logo { width: 32px; height: 32px; background: linear-gradient(135deg, #3b82f6, #8b5cf6); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 16px; box-shadow: 0 0 15px rgba(59, 130, 246, 0.4); }
    .header-title { font-size: 15px; font-weight: 700; }
    .header-badge { background: rgba(59, 130, 246, 0.15); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.3); padding: 3px 8px; border-radius: 999px; font-size: 11px; font-weight: 600; }
    .swagger-ui { color: var(--text-main) !important; font-family: var(--font-sans) !important; width: 100% !important; max-width: 100% !important; overflow-x: hidden !important; }
    .swagger-ui .wrapper { max-width: 1000px !important; padding: 16px !important; margin: 0 auto !important; width: 100% !important; box-sizing: border-box !important; }
    .swagger-ui .topbar { display: none !important; }
    .swagger-ui .info { margin: 16px 0 24px !important; padding: 20px !important; background: var(--card-bg) !important; border: 1px solid var(--card-border) !important; border-radius: 16px !important; }
    .swagger-ui .info .title { color: #ffffff !important; font-size: 22px !important; font-weight: 800 !important; }
    .swagger-ui .opblock { border-radius: 14px !important; margin-bottom: 14px !important; border-width: 1px !important; border-style: solid !important; }
    .swagger-ui .opblock.opblock-post { background: rgba(16, 185, 129, 0.04) !important; border-color: rgba(16, 185, 129, 0.25) !important; }
    .swagger-ui .opblock.opblock-get { background: rgba(59, 130, 246, 0.04) !important; border-color: rgba(59, 130, 246, 0.25) !important; }
    .swagger-ui .opblock-body { background: #0d131f !important; padding: 16px !important; border-top: 1px solid var(--card-border) !important; }
    .swagger-ui pre { background: #0d1117 !important; border: 1px solid #30363d !important; border-radius: 10px !important; padding: 12px !important; color: #e6edf3 !important; font-family: var(--font-mono) !important; font-size: 12px !important; overflow-x: auto !important; white-space: pre-wrap !important; word-break: break-word !important; }
    .swagger-ui input[type=text], .swagger-ui textarea, .swagger-ui select { background: #111827 !important; border: 1px solid #374151 !important; color: #f9fafb !important; border-radius: 8px !important; padding: 8px 12px !important; font-size: 13px !important; width: 100% !important; }
    .swagger-ui section.models { border-radius: 16px !important; border: 1px solid var(--card-border) !important; background: var(--card-bg) !important; margin-top: 24px !important; }
    @media (max-width: 640px) {
      .swagger-ui .wrapper { padding: 8px !important; }
      .swagger-ui .info { padding: 14px !important; border-radius: 12px !important; }
      .custom-header { padding: 10px 12px; }
      .header-title { font-size: 13px; }
    }
  </style>
</head>
<body>
  <header class="custom-header">
    <a href="/docs" class="header-brand">
      <div class="header-logo">⚡</div>
      <span class="header-title">ClusterPay Merchant Gateway</span>
    </a>
    <span class="header-badge">v2.0 · Live</span>
  </header>
  <div id="swagger-ui"></div>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    window.onload = () => {
      window.ui = SwaggerUIBundle({
        url: '/api/v1/openapi.json',
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [SwaggerUIBundle.presets.apis, SwaggerUIBundle.SwaggerUIStandalonePreset],
        layout: "BaseLayout",
        defaultModelsExpandDepth: 1,
        docExpansion: "list"
      });
    };
  </script>
</body>
</html>"""
    return HTMLResponse(content=html_content)

# ═══════════════════════════════════════════════
#             CHECKOUT FRONTEND PAGE
# ═══════════════════════════════════════════════

import os
from datetime import datetime
from fastapi.staticfiles import StaticFiles
from src.config import settings
from src.database import get_db

DIST_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend", "dist")
if os.path.exists(os.path.join(DIST_DIR, "assets")):
    app.mount("/assets", StaticFiles(directory=os.path.join(DIST_DIR, "assets")), name="assets")

@app.get("/gateway/pay/{session_id}", include_in_schema=False)
@app.get("/pay/{session_id}", include_in_schema=False)
async def serve_checkout_page(session_id: str, embed: bool = False):
    db = get_db()
    session = await db.payment_sessions.find_one({"session_id": session_id})
    if not session:
        return HTMLResponse("<div style='font-family:sans-serif;text-align:center;padding:50px;'><h2>404 - Payment Session Not Found or Expired</h2></div>", status_code=404)
        
    index_file = os.path.join(DIST_DIR, "index.html")
    if not os.path.exists(index_file):
        return HTMLResponse("<div style='font-family:sans-serif;text-align:center;padding:50px;'><h2>Checkout bundle missing. Please run 'npm run build' in frontend/</h2></div>", status_code=500)
        
    with open(index_file, "r", encoding="utf-8") as f:
        html = f.read()
        
    now = datetime.utcnow()
    expires_at = session.get("expires_at", now)
    time_left = max(0, int((expires_at - now).total_seconds()))
    
    wallets = session.get("wallets", {})
    bep20 = wallets.get("bep20", settings.DEFAULT_USDT_BEP20_WALLET)
    trc20 = wallets.get("trc20", settings.DEFAULT_USDT_TRC20_WALLET)
    poly = wallets.get("poly", settings.DEFAULT_USDT_POLY_WALLET)
    arb = wallets.get("arb", settings.DEFAULT_USDT_ARB_WALLET)
    ton = wallets.get("ton", settings.DEFAULT_TON_WALLET)
    ltc = wallets.get("ltc", settings.DEFAULT_LTC_WALLET)
    btc = wallets.get("btc", settings.DEFAULT_BTC_WALLET)
    pol = wallets.get("pol", settings.DEFAULT_POL_WALLET)
    
    html = html.replace("{amount}", f"{session.get('amount', 0.0):.4f}")
    html = html.replace("{session_id}", session_id)
    html = html.replace("{time_left}", str(time_left))
    
    inject_data = (
        f'time_left: "{time_left}", '
        f'USDT_WALLET_BEP20: "{bep20}", '
        f'USDT_WALLET_TRC20: "{trc20}", '
        f'USDT_WALLET_POLY: "{poly}", '
        f'USDT_WALLET_ARBITRUM: "{arb}", '
        f'TON_WALLET: "{ton}", '
        f'LTC_WALLET: "{ltc}", '
        f'BTC_WALLET: "{btc}", '
        f'POL_WALLET: "{pol}", '
        f'BINANCE_ID: "", '
        f'is_gateway: "true", '
        f'logo_url: "{session.get("logo_url", "")}", '
        f'theme_color: "{session.get("theme_color", "")}", '
        f'merchant_name: "{session.get("merchant_name", "")}", '
        f'merchant_url: "{session.get("merchant_url", "")}", '
        f'redirect_url: "{session.get("redirect_url", "")}", '
        f'custom_id: "{session.get("custom_id", "")}", '
        f'embed: "{"true" if embed else "false"}"'
    )
    html = html.replace(f'time_left: "{time_left}"', inject_data)
    
    origins = " ".join(session.get("allowed_origins", []))
    frame_ancestors = f"'self' {origins}" if origins else "*"
    headers = {
        "Content-Security-Policy": f"frame-ancestors {frame_ancestors}",
        "X-Frame-Options": "ALLOWALL"
    }
    return HTMLResponse(html, headers=headers)
