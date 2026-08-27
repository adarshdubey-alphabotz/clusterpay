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

# Mount API Routers
app.include_router(checkout_router, prefix="/api/v1", tags=["Merchant Checkout"])
app.include_router(status_router, prefix="/api/v1", tags=["Payment Verification"])
app.include_router(sessions_router, prefix="/api/v1", tags=["Merchant Sessions"])
app.include_router(webhooks_router, prefix="/api/v1", tags=["Webhooks"])

@app.get("/health", tags=["System"])
async def health_check():
    return {"status": "ok", "service": "ClusterPay Gateway", "version": "2.0.0"}

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
    
    html = html.replace("{amount}", f"{session.get('amount', 0.0):.6f}")
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
