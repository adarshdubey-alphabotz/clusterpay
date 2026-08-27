<div align="center">

# ⚡ ClusterPay

### High-Performance, Non-Custodial Cryptocurrency Payment Gateway

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)
[![Python 3.12](https://img.shields.io/badge/Python-3.12-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
[![OpenAPI 3.1](https://img.shields.io/badge/OpenAPI-3.1-6BA539?style=for-the-badge&logo=openapi-initiative&logoColor=white)](https://swagger.io/)

**ClusterPay** is an open-source, non-custodial cryptocurrency checkout engine and payment gateway. It allows merchants, Telegram bots, SaaS platforms, and digital storefronts to accept direct on-chain crypto payments directly into their own wallets with zero intermediate holding and zero transaction fees taken by third parties.

---

</div>

## 📌 Core Architectural Principles

1. **100% Non-Custodial Direct Settlement:** Funds never sit in a hot wallet on the server. Customer transfers route directly on-chain into the merchant's personal cold/hot wallet (Binance, Ledger, Trust Wallet, etc.). Server breach risk = **$0.00 fund exposure**.
2. **CSPRNG 4-Decimal Micro-Offsets:** Every checkout invoice generates a unique 4-decimal precision payment amount (e.g. `$10.0073`). This mathematically guarantees 1-to-1 matching between incoming blockchain transactions and merchant invoices, completely neutralizing BscScan/TronScan scanner sniffing and front-running exploits.
3. **Atomic Multi-Chain Compound Claim Locks:** Transactions are claimed using an atomic unique compound database index on `(network, txid)`. Double-spending or replaying the same blockchain transaction across multiple invoices is physically impossible at the database engine level.
4. **Replay-Proof Webhook Protocol:** Outgoing webhooks are signed using `HMAC-SHA256(timestamp.nonce.payload, secret)` and dispatched with `X-ClusterPay-Timestamp`, `X-ClusterPay-Nonce`, and `X-ClusterPay-Idempotency-Key` headers.
5. **Anti-SSRF Network Shield:** Webhook dispatchers resolve all callback hostnames before execution, actively blocking private subnets (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `127.0.0.0/8`) and AWS cloud metadata (`169.254.169.254`).

---

## 🪙 Supported Blockchains & Token Contracts

ClusterPay validates incoming transactions against official verified smart contracts:

| Network | Token / Coin | Decimals | Verified Contract Address / Protocol |
| :--- | :--- | :---: | :--- |
| **BSC** (BNB Smart Chain) | USDT (BEP-20) | 18 | `0x55d398326f99059fF775485246999027B3197955` |
| **Tron** (TRX) | USDT (TRC-20) | 6 | `TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t` |
| **Polygon** (PoS) | USDT (Polygon) | 6 | `0xc2132D05D31c914a87C6611C10748AEb04B58e8F` |
| **Arbitrum** (One) | USDT (Arbitrum) | 6 | `0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9` |
| **TON** (The Open Network) | TON (Native) | 9 | Native Transfer Verification |
| **Litecoin** | LTC (Native) | 8 | Native UTXO Verification |
| **Bitcoin** | BTC (Native) | 8 | Native UTXO Verification |
| **Polygon** | POL (Native) | 18 | Native EVM Value Transfer |

---

## ⚙️ How It Works (End-to-End Lifecycle)

```mermaid
sequenceDiagram
    autonumber
    actor Customer as Customer / Buyer
    participant Store as Merchant Store / Bot
    participant CP as ClusterPay Gateway
    participant Chain as Blockchain RPC / Network
    participant Wallet as Merchant Cold Wallet

    Store->>CP: POST /api/v1/checkout (amount: 10.00, wallets: {...})
    CP-->>Store: Returns session_id & payment_url ($10.0073 USDT)
    Store-->>Customer: Render Checkout Modal or Redirect to URL
    Customer->>Chain: Broadcasts on-chain transfer of exact $10.0073 USDT
    Chain-->>Wallet: Funds arrive immediately in Merchant Wallet!
    Customer->>CP: Submits TxID or Watcher auto-detects transfer
    CP->>Chain: Verifies Receipt Status == 1 & Decodes ERC20 Transfer Log
    CP->>CP: Atomic claim lock in MongoDB (network:txid)
    CP->>Store: POST callback_url (Signed with HMAC-SHA256)
    Store->>Store: Validates HMAC signature, timestamp drift & nonce
    Store-->>Customer: Deliver digital goods / activate subscription
```

---

## 🚀 Self-Hosting Setup

### 1. Requirements
* Docker & Docker Compose (or Python 3.12+ & MongoDB 6.0+)
* A domain or subdomain with SSL (e.g. `pay.yourstore.com`)

### 2. Clone and Configure
```bash
git clone https://github.com/adarshdubey-alphabotz/clusterpay.git
cd clusterpay

# Copy environment template
cp .env.example .env
```

### 3. Edit `.env`
```env
# Server Configuration
HOST=0.0.0.0
PORT=8085
BASE_URL=https://pay.yourstore.com
ENVIRONMENT=production

# Database
MONGO_URI=mongodb://mongo:27017
MONGO_DB_NAME=clusterpay_db

# Default Recipient Wallets (Used if not overridden per checkout request)
DEFAULT_USDT_BEP20_WALLET=0xYourBscWalletAddress
DEFAULT_USDT_TRC20_WALLET=TYourTronWalletAddress
DEFAULT_USDT_POLY_WALLET=0xYourPolygonWalletAddress
DEFAULT_USDT_ARB_WALLET=0xYourArbitrumWalletAddress
DEFAULT_TON_WALLET=UQYourTonWalletAddress
DEFAULT_LTC_WALLET=ltc1qYourLitecoinAddress
DEFAULT_BTC_WALLET=bc1qYourBitcoinAddress
DEFAULT_POL_WALLET=0xYourPolygonWalletAddress

# Security Parameters
RATE_LIMIT_PER_MINUTE=60
INVOICE_EXPIRATION_MINUTES=15
MAX_TX_AGE_SECONDS=7200
```

### 4. Start the Service
```bash
docker compose up -d
```
Your gateway is now live at `http://localhost:8085` (or behind your Nginx reverse proxy at `https://pay.yourstore.com`).

---

## 📖 API Documentation & Integration

### Authentication
All merchant endpoints authenticate via the `Authorization` header:
```http
Authorization: Bearer CS_key_YOUR_API_KEY
```

---

### 1. Create Checkout Session
Creates a new payment invoice with a CSPRNG 4-decimal micro-offset.

* **Endpoint:** `POST /api/v1/checkout`
* **Headers:** `Content-Type: application/json`, `Authorization: Bearer <API_KEY>`

#### Request Parameters:
| Parameter | Type | Required | Description |
| :--- | :---: | :---: | :--- |
| `amount` | `float` | **Yes** | Invoice amount (e.g. `25.00`) |
| `currency` | `string` | No | Currency code: `USD`, `INR`, `EUR`, `GBP`, `CAD`, `AUD`, `AED`, `RUB` (Default: `USD`) |
| `callback_url` | `string` | **Yes** | Webhook URL triggered upon payment confirmation |
| `wallets` | `object` | **Yes\*** | Recipient crypto addresses (`bep20`, `trc20`, `poly`, `arb`, `ton`, `ltc`, `btc`, `pol`). \*Required if no default server wallet is set in `.env`. |
| `custom_id` | `string` | No | Internal tracking ID (order ID, user ID, invoice ID) |
| `description` | `string` | No | Product / order description shown to customer |
| `expires_in_minutes` | `int` | No | Invoice lifespan in minutes (Default: `15`, Range: `5` to `1440`) |
| `allowed_origins` | `array` | No | Domains allowed to iframe/embed the checkout modal (Prevents phishing) |
| `allowed_ips` | `array` | No | IP whitelist for API calls and verification |
| `logo_url` | `string` | No | HTTPS link to merchant logo |
| `theme_color` | `string` | No | Hex accent color (e.g. `#3b82f6`) |
| `merchant_name` | `string` | No | Store display title |
| `redirect_url` | `string` | No | Redirect URL after customer completes payment |
| `mode` | `string` | No | `hosted` (default) or `embedded` |

#### cURL Example:
```bash
curl -X POST https://pay.yourstore.com/api/v1/checkout \
  -H "Authorization: Bearer CS_key_104928_8f9a2e..." \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 25.00,
    "currency": "USD",
    "callback_url": "https://mystore.com/api/webhooks/clusterpay",
    "custom_id": "ORDER_78491",
    "description": "Annual Pro Membership",
    "allowed_origins": ["https://mystore.com"],
    "redirect_url": "https://mystore.com/orders/success",
    "wallets": {
      "bep20": "0x4288f46725514671d3CA0974A4869d88ecbCE150",
      "trc20": "TZE6RPaSQkECYpPkqKgE4DTTcjyneMCXpw",
      "poly": "0x4288f46725514671d3CA0974A4869d88ecbCE150"
    }
  }'
```

#### JSON Response (200 OK):
```json
{
  "success": true,
  "session_id": "cpay_982f1b63e91a4b82c091",
  "amount": 25.0073,
  "base_amount": 25.0,
  "currency": "USD",
  "payment_url": "https://pay.yourstore.com/gateway/pay/cpay_982f1b63e91a4b82c091",
  "embed_url": "https://pay.yourstore.com/gateway/pay/cpay_982f1b63e91a4b82c091?embed=true",
  "expires_at": "2026-08-27T17:45:00.000000Z",
  "status": "pending"
}
```

---

### 2. Check Session Status
Query the real-time settlement status of any checkout session.

* **Endpoint:** `GET /api/v1/status/{session_id}`
* **Headers:** `Authorization: Bearer <API_KEY>`

```bash
curl -X GET https://pay.yourstore.com/api/v1/status/cpay_982f1b63e91a4b82c091 \
  -H "Authorization: Bearer CS_key_104928_8f9a2e..."
```

#### Response:
```json
{
  "session_id": "cpay_982f1b63e91a4b82c091",
  "status": "paid",
  "amount": 25.0073,
  "base_amount": 25.0,
  "currency": "USD",
  "custom_id": "ORDER_78491",
  "coin": "USDT_BEP20",
  "tx_hash": "0x8f2a1b9e83c7...",
  "created_at": "2026-08-27T17:30:00Z",
  "expires_at": "2026-08-27T17:45:00Z",
  "paid_at": "2026-08-27T17:34:12Z"
}
```

---

## 🖼️ Embedded Modal (JavaScript SDK)

Embed the checkout directly into your existing website without redirecting users away:

```html
<!-- 1. Include the ClusterPay SDK -->
<script src="https://pay.yourstore.com/js/v1/clusterpay.js"></script>

<!-- 2. Target Container -->
<div id="clusterpay-modal"></div>

<!-- 3. Mount Modal -->
<script>
  const cp = ClusterPay();
  cp.mount('#clusterpay-modal', {
    session_id: 'cpay_982f1b63e91a4b82c091',
    baseUrl: 'https://pay.yourstore.com',
    height: 680,
    onSuccess: function(payload) {
      console.log('Payment Confirmed!', payload);
      window.location.href = '/orders/thank-you';
    },
    onExpire: function() {
      alert('Invoice expired. Please re-generate checkout.');
    }
  });
</script>
```

---

## 🔐 Webhook Signature Verification

When a payment settles, ClusterPay sends an HTTP POST request to your `callback_url`.

### Incoming Webhook Headers:
* `X-ClusterPay-Signature`: Hex-encoded HMAC-SHA256 signature
* `X-ClusterPay-Timestamp`: Epoch timestamp string
* `X-ClusterPay-Nonce`: Single-use cryptographic random hex
* `X-ClusterPay-Idempotency-Key`: `evt_{session_id}_{event}_{timestamp}`

### Signature Formula:
$$\text{Signature} = \text{HMAC-SHA256}(\text{Timestamp} + "." + \text{Nonce} + "." + \text{RawBodyBytes}, \text{API\_KEY})$$

---

### Code Examples for Verification

#### Python (FastAPI / Flask / Django)
```python
import hmac
import hashlib
import time

def verify_clusterpay_webhook(raw_body: bytes, signature: str, timestamp: str, nonce: str, api_key: str) -> bool:
    # 1. Reject if timestamp drift exceeds 5 minutes (Replay Defense)
    if abs(int(time.time()) - int(timestamp)) > 300:
        return False

    # 2. Recompute expected HMAC-SHA256 signature
    payload = f"{timestamp}.{nonce}.".encode("utf-8") + raw_body
    expected_sig = hmac.new(api_key.encode("utf-8"), payload, hashlib.sha256).hexdigest()

    # 3. Constant-time comparison
    return hmac.compare_digest(expected_sig, signature)
```

#### Node.js (Express)
```javascript
const crypto = require('crypto');

function verifyClusterPayWebhook(rawBodyBuffer, signature, timestamp, nonce, apiKey) {
  // 1. Check timestamp drift (5 mins)
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parseInt(timestamp, 10)) > 300) {
    return false;
  }

  // 2. Recompute HMAC-SHA256
  const payload = Buffer.concat([
    Buffer.from(`${timestamp}.${nonce}.`, 'utf8'),
    rawBodyBuffer
  ]);
  const expectedSig = crypto.createHmac('sha256', apiKey).update(payload).digest('hex');

  // 3. Timing-safe comparison
  return crypto.timingSafeEqual(Buffer.from(expectedSig), Buffer.from(signature));
}
```

#### PHP (Laravel / Pure PHP)
```php
function verifyClusterPayWebhook($rawBody, $signature, $timestamp, $nonce, $apiKey) {
    if (abs(time() - intval($timestamp)) > 300) {
        return false;
    }
    $payload = $timestamp . "." . $nonce . "." . $rawBody;
    $expectedSig = hash_hmac("sha256", $payload, $apiKey);
    return hash_equals($expectedSig, $signature);
}
```

---

## 🛡️ Security Best Practices

1. **Always verify `allowed_origins`:** Set your production domain in `allowed_origins` during checkout creation to prevent unauthorized sites from iframing your checkout modal.
2. **Always verify `X-ClusterPay-Signature`:** Never mark an order fulfilled on your backend without validating the HMAC-SHA256 signature.
3. **Use HTTPS:** Run ClusterPay behind an SSL-enabled reverse proxy (Nginx / Caddy / Cloudflare).

---

## 📜 License & Disclaimers

ClusterPay is open-source software licensed under the **[MIT License](LICENSE)**.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE.
