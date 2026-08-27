<div align="center">

# ⚡ ClusterPay

### High-Performance, Non-Custodial Cryptocurrency Payment Gateway

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)
[![Python 3.10+](https://img.shields.io/badge/Python-3.10%2B-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
[![OpenAPI 3.1](https://img.shields.io/badge/OpenAPI-3.1-6BA539?style=for-the-badge&logo=openapi-initiative&logoColor=white)](https://swagger.io/)

**ClusterPay** is an enterprise-grade, non-custodial cryptocurrency checkout and payment gateway designed for digital merchants, Telegram bots, SaaS platforms, and Web3 storefronts.

[Interactive Swagger Docs](https://pay.rapidx.me/api/gateway/cpay_sec_99182/docs) · [OpenAPI Spec](https://pay.rapidx.me/api/gateway/cpay_sec_99182/openapi.json) · [JavaScript SDK](https://pay.rapidx.me/js/v1/clusterpay.js)

---

</div>

## 🚀 Key Features

* **⚡ Anti-Theft 4-Decimal Micro-Offsets:** Every checkout generates a unique 4-decimal precision payment amount (e.g. `$10.0034`). This cryptographically guarantees 1-to-1 matching between incoming blockchain transactions and merchant invoices, completely preventing transaction replay and BscScan front-running exploits.
* **🪙 Multi-Chain Direct Settlement:** Funds route **directly to your own self-custody wallets** without intermediary lockups or centralized holding.
  * **USDT** (BEP-20 / Binance Smart Chain)
  * **USDT** (TRC-20 / Tron Network)
  * **USDT** (Polygon PoS)
  * **USDT** (Arbitrum One)
  * **TON** (The Open Network)
  * **Litecoin** (LTC)
  * **Bitcoin** (BTC)
  * **Polygon** (POL Native)
* **💱 Dynamic Multi-Currency Fiat Conversion:** Accept payments in `USD`, `INR`, `EUR`, `GBP`, `CAD`, `AUD`, `AED`, or `RUB`. Real-time conversion engine handles rate calculations automatically.
* **🎨 100% White-Label Branding:** Customize checkout pages with custom `logo_url`, hex `theme_color`, `merchant_name`, `merchant_url`, and auto-redirect `redirect_url`.
* **🖼️ Hosted & Embedded Modes:** Host checkout on our cloud or embed inside your app/site via our 1-line JavaScript SDK.
* **🔐 Cryptographically Signed Webhooks:** Immediate HMAC-SHA256 signature verification on payment confirmation and expiry.

---

## 🏛️ Architecture & Payment Lifecycle

```mermaid
sequenceDiagram
    autonumber
    actor Customer
    participant Merchant as Merchant Backend
    participant CP as ClusterPay Gateway
    participant Chain as Multi-Chain Blockchain
    participant Wallet as Merchant Cold/Hot Wallet

    Customer->>Merchant: Click "Checkout / Pay"
    Merchant->>CP: POST /api/v1/checkout (amount, currency, callback_url)
    CP-->>Merchant: Returns session_id & payment_url ($10.0028 USDT)
    Merchant-->>Customer: Display Hosted Page or Embedded Modal
    Customer->>Chain: Broadcasts $10.0028 USDT Transfer
    Chain-->>Wallet: Funds arrive directly in Merchant Wallet!
    Chain->>CP: On-chain Watcher detects exact 4-decimal amount
    CP->>CP: Atomic claim in DB (Prevents Replay Attacks)
    CP->>Merchant: POST callback_url (Signed with X-ClusterPay-Signature)
    Merchant->>Customer: Fulfill digital goods or subscription
```

---

## ⚡ Quickstart

### 1. Run with Docker Compose (Recommended)

```bash
git clone https://github.com/adarshdubey-alphabotz/clusterpay.git
cd clusterpay

# Copy environment template
cp .env.example .env

# Launch Gateway and MongoDB
docker compose up -d
```

Your gateway is now live at `http://localhost:8085`!
* **API Documentation:** `http://localhost:8085/docs`
* **OpenAPI Schema:** `http://localhost:8085/api/v1/openapi.json`

---

## 📖 API Reference

All gateway endpoints require standard Bearer token authentication:
```http
Authorization: Bearer CS_key_YOUR_MERCHANT_API_KEY
```

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/v1/checkout` | Create a new cryptocurrency checkout session |
| `GET` | `/api/v1/status/{session_id}` | Check real-time payment settlement status |
| `GET` | `/api/v1/sessions` | List recent merchant sessions |
| `POST` | `/api/v1/webhook/resend/{session_id}` | Manually trigger signed webhook re-delivery |
| `GET` | `/js/v1/clusterpay.js` | 1-line JavaScript SDK for embedded modals |

---

## 💻 Integration Examples

### 1. Python (Sync / Async)

```python
import httpx

API_KEY = "CS_key_YOUR_SECRET_KEY"
GATEWAY_URL = "https://pay.rapidx.me"

# Create a checkout session
response = httpx.post(
    f"{GATEWAY_URL}/api/v1/checkout",
    json={
        "amount": 25.00,
        "currency": "USD",
        "callback_url": "https://yourdomain.com/webhook/clusterpay",
        "custom_id": "order_78491",
        "description": "Annual Pro License",
        "redirect_url": "https://yourdomain.com/success"
    },
    headers={"Authorization": f"Bearer {API_KEY}"}
)

data = response.json()
print("Payment URL:", data["payment_url"])
```

### 2. Node.js (Express / Axios)

```javascript
const axios = require('axios');

async function createInvoice() {
  const response = await axios.post(
    'https://pay.rapidx.me/api/v1/checkout',
    {
      amount: 15.50,
      currency: 'EUR',
      callback_url: 'https://mystore.com/api/webhook',
      custom_id: 'user_45812'
    },
    {
      headers: {
        'Authorization': 'Bearer CS_key_YOUR_SECRET_KEY',
        'Content-Type': 'application/json'
      }
    }
  );

  console.log('Session Created:', response.data.session_id);
}
```

### 3. 1-Line JavaScript SDK (Embedded Modal)

```html
<!-- Include SDK -->
<script src="https://pay.rapidx.me/js/v1/clusterpay.js"></script>

<!-- Target Container -->
<div id="checkout-container"></div>

<script>
  const cp = ClusterPay();
  cp.mount('#checkout-container', {
    session_id: 'cpay_xxxxxxxxxxxxxxxxxxxx',
    height: 650,
    onSuccess: function(payload) {
      console.log('Payment Successful!', payload);
      window.location.href = '/success';
    }
  });
</script>
```

---

## 🔐 Webhook Signature Verification

ClusterPay signs all webhook payloads using HMAC-SHA256 with your API key. Always verify the `X-ClusterPay-Signature` header in your backend before fulfilling orders.

### Python Verification
```python
import hmac, hashlib

def verify_webhook(raw_payload_bytes: bytes, signature_header: str, api_key: str) -> bool:
    expected_sig = hmac.new(api_key.encode('utf-8'), raw_payload_bytes, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected_sig, signature_header)
```

### Node.js Verification
```javascript
const crypto = require('crypto');

function verifyWebhook(rawBodyBuffer, signatureHeader, apiKey) {
  const expectedSig = crypto.createHmac('sha256', apiKey).update(rawBodyBuffer).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(expectedSig), Buffer.from(signatureHeader));
}
```

---

## 🛡️ Security & Anti-Fraud Architecture

1. **Non-Custodial Design:** Zero merchant funds are stored on ClusterPay servers. Payments settle directly on-chain into the merchant's private cold/hot wallets.
2. **Replay & Scanner Immunity:** Every invoice has a unique 4-decimal precision micro-offset and an atomic single-use claim lock in MongoDB (`payment_tx_claims`).
3. **Timing-Safe Cryptography:** Webhook signatures use constant-time comparisons to prevent side-channel timing attacks.
4. **Sliding-Window Rate Limiting:** 60 requests/minute per merchant token prevents scraping and API spam.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
