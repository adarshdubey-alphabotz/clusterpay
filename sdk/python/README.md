# ⚡ ClusterPay Python SDK

Official Python library for **ClusterPay** — the open-source, non-custodial cryptocurrency checkout and merchant settlement engine.

[![PyPI version](https://img.shields.io/pypi/v/clusterpay.svg?style=flat-square)](https://pypi.org/project/clusterpay/)
[![Python 3.8+](https://img.shields.io/badge/python-3.8+-blue.svg?style=flat-square)](https://www.python.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg?style=flat-square)](https://opensource.org/licenses/MIT)

---

## 📦 Installation

```bash
pip install clusterpay
```

---

## 🚀 Quick Start

### 1. Initialize Client

```python
from clusterpay import ClusterPay

client = ClusterPay(
    api_key="CS_key_live_9f8a2b3c4d5e6f7a8b9c0d1e2f3a4b5c",
    base_url="https://pay.yourstore.com"  # Or your self-hosted instance
)
```

---

### 2. Create a Checkout Invoice (Async / FastAPI / aiogram)

```python
import asyncio
from clusterpay import ClusterPay

async def main():
    client = ClusterPay(api_key="CS_key_live_...", base_url="https://pay.yourstore.com")
    
    invoice = await client.create_checkout_async(
        amount=25.00,
        currency="USD",
        callback_url="https://yourstore.com/api/webhooks/clusterpay",
        custom_id="ORDER-98214",
        description="1 Year Pro Subscription",
        redirect_url="https://yourstore.com/orders/success",
        wallets={
            "bep20": "0x71C8418013511110293C7C432929424838192834",
            "trc20": "TYDzsYUE2989Xwz4T2L7e2V9J38hXj4kLm8921",
            "poly":  "0x892a764f3e91b2c45d8f99a012e8749bc38e9124"
        }
    )
    
    print("Payment URL:", invoice["payment_url"])
    print("Exact Amount (USDT):", invoice["amount"])  # e.g. 25.004829
    print("Session ID:", invoice["session_id"])

asyncio.run(main())
```

---

### 3. Verify Incoming Webhook Signatures (FastAPI)

```python
from fastapi import FastAPI, Request, Header, HTTPException
from clusterpay import verify_webhook_signature

app = FastAPI()
CLUSTERPAY_API_KEY = "CS_key_live_..."

@app.post("/api/webhooks/clusterpay")
async def handle_clusterpay_webhook(
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
        api_key=CLUSTERPAY_API_KEY
    )
    
    if not is_valid:
        raise HTTPException(status_code=403, detail="Invalid cryptographic webhook signature")
    
    data = await request.json()
    if data.get("event") == "payment.settled":
        order_id = data.get("custom_id")
        amount = data.get("amount")
        txid = data.get("tx_hash")
        print(f"✅ Order {order_id} paid with {amount} on-chain! TxID: {txid}")
        # Fulfill order / deliver product
    
    return {"status": "ok"}
```

---

### 4. Query Settlement Status

```python
status = client.get_status("cpay_982f1b63e91a4b82")
print("Status:", status["status"])       # 'paid', 'pending', or 'expired'
print("TxID:", status.get("tx_hash"))
```

---

## 🛡️ Supported Networks & Chains

* **USDT:** BNB Smart Chain (BEP-20), TRON (TRC-20), Polygon PoS, Arbitrum One, TON
* **Native:** Bitcoin (BTC SegWit), Litecoin (LTC), TON, Polygon (POL), BNB

---

## 📜 License

MIT License. Copyright (c) 2026 ClusterPay Technologies.
