# ⚡ ClusterPay

### Official Python SDK & CLI Toolkit for ClusterPay Payment Gateway

[![PyPI version](https://img.shields.io/pypi/v/clusterpay.svg?style=flat-square)](https://pypi.org/project/clusterpay/)
[![Python 3.8+](https://img.shields.io/badge/python-3.8+-blue.svg?style=flat-square)](https://www.python.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg?style=flat-square)](https://opensource.org/licenses/MIT)

**ClusterPay** is a high-performance, non-custodial cryptocurrency checkout and merchant payment gateway. Funds settle **100% directly into your personal cold or exchange wallet** with zero intermediate custody, zero chargebacks, and zero third-party skimming.

---

## 📦 Installation

```bash
pip install clusterpay
```

---

## 🔐 1. Built-in Security & 2FA Setup CLI

When you install `clusterpay`, you get the `clusterpay` CLI tool directly in your terminal. Use it to generate cryptographically secure credentials, TOTP 2FA keys, ASCII QR codes, and `.env` files for your self-hosted instance:

```bash
clusterpay setup
```

### What this does:
1. Generates 256-bit `ADMIN_MASTER_KEY` (admin console password).
2. Generates Base32 `ADMIN_TOTP_SECRET` and prints an **ASCII QR Code** directly in your terminal for Google Authenticator, Authy, or [2fa.live](https://2fa.live).
3. Generates least-privilege `MONGO_ROOT_PASSWORD` and `MONGO_PASSWORD`.
4. Automatically creates or updates your `.env` configuration file.

---

## 🚀 2. Python Integration SDK

Use the built-in Python client in your FastAPI backends, Django platforms, Flask stores, or Telegram bots (aiogram / Python-Telegram-Bot):

### A. Initialize Client
```python
from clusterpay import ClusterPay

client = ClusterPay(
    api_key="CS_key_live_...",            # 256-bit API key from Admin Console
    base_url="https://pay.yourstore.com"  # Your self-hosted gateway URL
)
```

---

### B. Create a Checkout Session (Async / FastAPI / aiogram)

```python
import asyncio
from clusterpay import ClusterPay

async def create_payment():
    client = ClusterPay(api_key="CS_key_live_...", base_url="https://pay.yourstore.com")
    
    invoice = await client.create_checkout_async(
        amount=49.99,
        currency="USD",
        callback_url="https://yourstore.com/api/webhooks/clusterpay",
        custom_id="ORDER_98214",
        description="Annual Pro Membership",
        redirect_url="https://yourstore.com/orders/success",
        wallets={
            "bep20": "0x71C8418013511110293C7C432929424838192834",
            "trc20": "TYDzsYUE2989Xwz4T2L7e2V9J38hXj4kLm8921",
            "poly":  "0x892a764f3e91b2c45d8f99a012e8749bc38e9124",
            "arb":   "0x43892c9f3e91b2c45d8f99a012e8749bc38e9124",
            "ton":   "EQBvW8Z5huBkMJYdnfTOYv5KKcvce_qwS1bAA340"
        }
    )
    
    print("Payment URL:", invoice["payment_url"])
    print("Exact 6-Decimal USDT:", invoice["amount"])  # e.g. 49.994829
    print("Session ID:", invoice["session_id"])

asyncio.run(create_payment())
```

---

### C. Timing-Safe Webhook Signature Verification (FastAPI)

```python
from fastapi import FastAPI, Request, Header, HTTPException
from clusterpay import verify_webhook_signature

app = FastAPI()
API_KEY = "CS_key_live_..."

@app.post("/api/webhooks/clusterpay")
async def handle_webhook(
    request: Request,
    x_clusterpay_signature: str = Header(...),
    x_clusterpay_timestamp: str = Header(""),
    x_clusterpay_nonce: str = Header("")
):
    raw_body = await request.body()
    
    # Timing-safe HMAC-SHA256 verification with 5-minute replay defense
    is_valid = verify_webhook_signature(
        raw_payload=raw_body,
        signature=x_clusterpay_signature,
        timestamp=x_clusterpay_timestamp,
        nonce=x_clusterpay_nonce,
        api_key=API_KEY
    )
    
    if not is_valid:
        raise HTTPException(status_code=403, detail="Invalid HMAC signature")
    
    payload = await request.json()
    if payload.get("event") == "payment.settled":
        order_id = payload.get("custom_id")
        amount = payload.get("amount")
        txid = payload.get("tx_hash")
        print(f"✅ Order {order_id} verified on-chain ({amount} USDT, TxID: {txid})")
        # Deliver digital goods or upgrade subscription
    
    return {"status": "ok"}
```

---

### D. Check Status & Resend Webhook

```python
# Query settlement status
status = client.get_status("cpay_982f1b63e91a4b82")
print("Status:", status["status"])       # 'paid', 'pending', or 'expired'

# Manually trigger signed webhook re-dispatch
client.resend_webhook("cpay_982f1b63e91a4b82")
```

---

## 🐳 3. Full Self-Hosted Server Setup

To deploy your own complete gateway server with MongoDB and Web Admin Console:

```bash
git clone https://github.com/adarshdubey-alphabotz/clusterpay.git
cd clusterpay

# Generate all credentials and .env configuration
clusterpay setup

# Start gateway and database
docker compose up -d
```

* **Admin Console:** `https://your-domain.com/admin` (Log in with `ADMIN_MASTER_KEY` + 6-digit TOTP code).

---

## 🪙 Supported Blockchains & Tokens

| Network | Token / Coin | Decimals | Standard |
|:---|:---|:---:|:---|
| **BSC** (BNB Smart Chain) | USDT | 18 | BEP-20 |
| **Tron** (TRX) | USDT | 6 | TRC-20 |
| **Polygon** (PoS) | USDT | 6 | Native EVM |
| **Arbitrum** (One) | USDT | 6 | Rollup |
| **TON** (The Open Network) | TON / USDT | 9 | Native |
| **Bitcoin** | BTC | 8 | Native SegWit |
| **Litecoin** | LTC | 8 | Native UTXO |
| **Polygon** | POL | 18 | Native EVM |

---

## 📜 License

MIT License. Copyright (c) 2026 ClusterPay Technologies.
