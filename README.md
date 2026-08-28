<div align="center">
  <img src="https://raw.githubusercontent.com/adarshdubey-alphabotz/clusterpay/main/frontend/public/assets/clusterpay-logo.png" alt="ClusterPay" width="72" height="72" />
  <h1>ClusterPay</h1>
  <p>Open-source crypto payment gateway. Non-custodial. Self-hosted. No fees.</p>

  <p>
    <a href="https://clusterpay.cloud/docs"><img src="https://img.shields.io/badge/docs-clusterpay.cloud-0f172a?style=flat-square&logo=gitbook&logoColor=white" alt="Docs" /></a>
    <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/license-MIT-22c55e?style=flat-square" alt="MIT License" /></a>
    <img src="https://img.shields.io/badge/python-3.12-3b82f6?style=flat-square&logo=python&logoColor=white" alt="Python 3.12" />
    <img src="https://img.shields.io/badge/fastapi-latest-009688?style=flat-square&logo=fastapi&logoColor=white" alt="FastAPI" />
    <img src="https://img.shields.io/badge/mongodb-6.0-47a248?style=flat-square&logo=mongodb&logoColor=white" alt="MongoDB" />
    <img src="https://img.shields.io/badge/docker-ready-2496ed?style=flat-square&logo=docker&logoColor=white" alt="Docker" />
    <img src="https://img.shields.io/badge/chains-8-f97316?style=flat-square" alt="8 Chains" />
  </p>

  <br />

  <p>
    <a href="https://clusterpay.cloud/docs">Documentation</a> ·
    <a href="https://pay.rapidx.me/admin">Live Demo</a> ·
    <a href="https://clusterpay.cloud/docs/quickstart">Quick Start</a> ·
    <a href="https://github.com/adarshdubey-alphabotz/clusterpay/issues">Report a Bug</a>
  </p>
</div>

<br />

---

## What it does

ClusterPay creates hosted payment pages and API checkout sessions for crypto. Funds go **directly to your wallet** — the server never holds money. You deploy it, you own it.

```
Customer pays → Blockchain → Your wallet
                    ↓
             ClusterPay verifies the TxID
                    ↓
             Sends HMAC-signed webhook to your backend
```

---

## Chains & tokens

| | Network | Token | Contract |
|:---:|:---|:---|:---|
| ![BSC](https://img.shields.io/badge/-BSC-F0B90B?style=flat-square&logo=binance&logoColor=black) | BNB Smart Chain | USDT BEP-20 | `0x55d398...197955` |
| ![TRX](https://img.shields.io/badge/-TRON-FF0013?style=flat-square) | Tron | USDT TRC-20 | `TR7NHq...Lj6t` |
| ![POLY](https://img.shields.io/badge/-Polygon-8247E5?style=flat-square&logo=polygon&logoColor=white) | Polygon PoS | USDT | `0xc2132D...58e8F` |
| ![ARB](https://img.shields.io/badge/-Arbitrum-28A0F0?style=flat-square) | Arbitrum One | USDT | `0xFd086b...Cbb9` |
| ![TON](https://img.shields.io/badge/-TON-0098EA?style=flat-square) | The Open Network | TON | Native |
| ![BTC](https://img.shields.io/badge/-Bitcoin-F7931A?style=flat-square&logo=bitcoin&logoColor=white) | Bitcoin | BTC | UTXO |
| ![LTC](https://img.shields.io/badge/-Litecoin-345D9D?style=flat-square) | Litecoin | LTC | UTXO |
| ![POL](https://img.shields.io/badge/-Polygon-8247E5?style=flat-square&logo=polygon&logoColor=white) | Polygon | POL | Native EVM |

---

## How a payment works

```
┌─────────────┐     POST /checkout      ┌─────────────────┐
│  Your Store │ ──────────────────────► │  ClusterPay API │
│  or Bot     │ ◄────────────────────── │                 │
└─────────────┘   payment_url + amount  └────────┬────────┘
                                                  │ verifies on-chain:
        ┌──────────────┐   exact USDT   ┌────────▼────────┐
        │   Customer   │ ─────────────► │   Blockchain    │
        └──────────────┘                │ RPC / Explorer  │
                                        └────────┬────────┘
                                                  │ receipt confirmed
                                        ┌────────▼────────┐
                                        │  Your Wallet ✓  │
                                        └─────────────────┘
                                                  │
                                        ┌────────▼────────┐
                                        │  Signed Webhook │
                                        │  → Your backend │
                                        └─────────────────┘
```

Each invoice has a **micro-offset amount** (e.g. `$25.0047`) — every payment is unique down to 4 decimals so the scanner can match it exactly. No shared wallet, no collision, no guessing.

---

## Security model

| Layer | What it does |
|:---|:---|
| **Non-custodial** | Zero funds on the server. Even a full breach = $0 loss |
| **Contract whitelist** | Only official USDT contracts accepted — fake tokens rejected |
| **Receipt status check** | `status == 0x1` required — reverted txs are rejected |
| **Atomic DB claim lock** | Unique index on `(network, txid)` — same tx can't pay two invoices |
| **Admin 2FA** | TOTP (Google Authenticator / 2fa.live) + HMAC session tokens |
| **SSRF shield** | Webhook URLs are IP-resolved; RFC1918 / loopback / metadata IPs blocked |
| **Rate limiting** | Sliding window per IP, Redis-backed for multi-worker accuracy |
| **Signed webhooks** | `HMAC-SHA256(timestamp.nonce.body, api_key)` — replay-safe |
| **IP brute-force lockout** | 8 failed admin logins → 15-min IP ban |
| **Input validation** | Wallet address length caps per chain; coin allowlist enforced |

---

## Quick start

**Requires:** Docker, Docker Compose, a domain with HTTPS

```bash
git clone https://github.com/adarshdubey-alphabotz/clusterpay.git
cd clusterpay

# 1. Generate all credentials (admin key, 2FA secret, MongoDB passwords)
python scripts/generate_secrets.py

# 2. Scan the QR code with Google Authenticator or paste the key on 2fa.live
# 3. .env is written automatically

# 4. Start
docker compose up -d
```

Admin console: `https://your-domain.com/admin`  
Login with your `ADMIN_MASTER_KEY` + 6-digit 2FA code.

---

## API

> All merchant API routes require `Authorization: Bearer CS_key_live_...`  
> Get your API key from the admin console → API Keys tab.

### Create a checkout session

```bash
POST /api/v1/checkout
```

```bash
curl -X POST https://pay.yourstore.com/api/v1/checkout \
  -H "Authorization: Bearer CS_key_live_..." \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 25.00,
    "currency": "USD",
    "callback_url": "https://yourstore.com/api/webhooks/cpay",
    "custom_id": "ORDER-78491",
    "redirect_url": "https://yourstore.com/orders/success",
    "wallets": {
      "bep20": "0xYourBSCWallet",
      "trc20": "TYourTronWallet",
      "poly":  "0xYourPolygonWallet"
    }
  }'
```

```json
{
  "success": true,
  "session_id": "cpay_982f1b63e91a4b82",
  "amount": 25.0047,
  "payment_url": "https://pay.yourstore.com/gateway/pay/cpay_982f1b63e91a4b82",
  "expires_at": "2026-08-28T12:45:00Z",
  "status": "pending"
}
```

### Check status

```bash
GET /api/v1/status/{session_id}
Authorization: Bearer CS_key_live_...
```

```json
{
  "status": "paid",
  "coin": "USDT_BEP20",
  "tx_hash": "0x8f2a1b9e83c7...",
  "amount": 25.0047,
  "paid_at": "2026-08-28T12:34:12Z"
}
```

---

## Webhook verification

When a payment settles, ClusterPay posts to your `callback_url` with these headers:

```
X-ClusterPay-Signature:      <hex>
X-ClusterPay-Timestamp:      <unix>
X-ClusterPay-Nonce:          <hex>
X-ClusterPay-Idempotency-Key: evt_<session_id>_payment.settled_<ts>
```

Signature formula: `HMAC-SHA256(timestamp + "." + nonce + "." + raw_body, api_key)`

**Python**
```python
import hmac, hashlib, time

def verify(raw_body: bytes, sig: str, ts: str, nonce: str, api_key: str) -> bool:
    if abs(time.time() - int(ts)) > 300:   # reject if older than 5 min
        return False
    payload = f"{ts}.{nonce}.".encode() + raw_body
    expected = hmac.new(api_key.encode(), payload, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, sig)
```

**Node.js**
```js
const crypto = require('crypto');

function verify(rawBody, sig, ts, nonce, apiKey) {
  if (Math.abs(Date.now() / 1000 - parseInt(ts)) > 300) return false;
  const payload = Buffer.concat([Buffer.from(`${ts}.${nonce}.`), rawBody]);
  const expected = crypto.createHmac('sha256', apiKey).update(payload).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig));
}
```

**PHP**
```php
function verify($body, $sig, $ts, $nonce, $apiKey) {
  if (abs(time() - intval($ts)) > 300) return false;
  $expected = hash_hmac('sha256', "$ts.$nonce.$body", $apiKey);
  return hash_equals($expected, $sig);
}
```

## SDKs & In-App Checkout

<div align="center">
  <img src="https://raw.githubusercontent.com/adarshdubey-alphabotz/clusterpay/main/frontend/public/assets/checkout-sdk-desktop.png" alt="ClusterPay In-App Checkout SDK Modal" width="850" />
</div>

<br />

| Language | Import |
|:---|:---|
| JavaScript / TypeScript | `<script src="https://pay.yourstore.com/js/v1/clusterpay.js">` |
| Python | `from clusterpay import ClusterPay` |
| PHP | `use ClusterPay\Client` |

**JS modal**
```js
const cp = ClusterPay({ baseUrl: 'https://pay.yourstore.com' });
cp.openModal({
  session_id: 'cpay_982f1b63e91a4b82',
  onSuccess: (p) => window.location.href = '/thanks',
  onExpire:  ()  => alert('Invoice expired'),
});
```

**Python async**
```python
from clusterpay import ClusterPay

client = ClusterPay(api_key="CS_key_live_...", base_url="https://pay.yourstore.com")
invoice = await client.create_checkout_async(
    amount=25.00,
    currency="USD",
    callback_url="https://yourstore.com/webhook",
    custom_id="ORDER-991",
    wallets={"bep20": "0xYourWallet"},
)
print(invoice["payment_url"])
```

---

## Admin console

<div align="center">
  <img src="https://raw.githubusercontent.com/adarshdubey-alphabotz/clusterpay/main/frontend/public/assets/admin-console-real.png" alt="ClusterPay Self-Hosted Admin Console" width="850" />
</div>

<br />

Go to `https://your-domain.com/admin`. Login requires:
- **Password** — your `ADMIN_MASTER_KEY`
- **2FA code** — from Google Authenticator, Authy, or [2fa.live](https://2fa.live)

<table>
<tr>
<td><strong>📊 Revenue</strong><br/>Filter by day/week/month/custom. Multi-currency display (USD, INR, EUR, GBP, AED...).</td>
<td><strong>🧾 Transactions</strong><br/>Search by session ID, order ref, TxID. Webhook re-dispatch.</td>
</tr>
<tr>
<td><strong>🔑 API Keys</strong><br/>Issue 256-bit merchant keys. Per-key IP allowlisting.</td>
<td><strong>🛡️ Security</strong><br/>Change admin password (2FA gated). Session expiry info.</td>
</tr>
<tr>
<td><strong>🛰️ RPC Nodes</strong><br/>Live latency pings to BSC, TRON, Polygon, Arbitrum.</td>
<td><strong>+ Invoice</strong><br/>Generate a hosted payment link without writing code.</td>
</tr>
</table>

---

## Environment variables

| Variable | Required | Description |
|:---|:---:|:---|
| `ADMIN_MASTER_KEY` | ✅ | Admin console password |
| `ADMIN_TOTP_SECRET` | ✅ | Base32 TOTP secret (generated by setup script) |
| `MONGO_PASSWORD` | ✅ | MongoDB app user password |
| `MONGO_ROOT_PASSWORD` | ✅ | MongoDB root password |
| `BASE_URL` | ✅ | Your public domain e.g. `https://pay.yourstore.com` |
| `MONGO_URI` | — | Defaults to Docker internal URI |
| `RATE_LIMIT_PER_MINUTE` | — | Default: `60` |
| `REDIS_URL` | — | e.g. `redis://localhost:6379` — enables multi-worker rate limiting |
| `DEBUG` | — | `false` in production |

> Generate `ADMIN_MASTER_KEY`, `ADMIN_TOTP_SECRET`, `MONGO_PASSWORD`, `MONGO_ROOT_PASSWORD` in one step:
> ```bash
> python scripts/generate_secrets.py
> ```

---

## Self-hosting checklist

```
✅  python scripts/generate_secrets.py     → generates .env with all 4 secrets
✅  Scan QR code with authenticator app    → sets up 2FA
✅  docker compose up -d                   → starts gateway + MongoDB (auth enabled)
✅  Nginx HTTPS reverse proxy              → see docs/deploy-nginx
✅  ufw deny 27017 && ufw deny 8085        → MongoDB and gateway not exposed
✅  /admin → login with password + 2FA    → create first merchant API key
```

---

## Stack

- **Runtime:** Python 3.12, FastAPI, Uvicorn
- **Database:** MongoDB 6.0 (Motor async driver)
- **Auth:** HMAC-SHA256 session tokens + RFC 6238 TOTP
- **Blockchain:** Direct JSON-RPC (no third-party indexer dependency)
- **Container:** Docker Compose
- **Rate limiting:** In-process sliding window / Redis (optional)

---

## License

MIT — do whatever you want with it. See [LICENSE](LICENSE).

---

<div align="center">
  <sub>Built by <a href="https://github.com/adarshdubey-alphabotz">adarshdubey-alphabotz</a> · <a href="https://clusterpay.cloud/docs">clusterpay.cloud/docs</a></sub>
</div>
