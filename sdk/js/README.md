# ⚡ @clusterpay/sdk

Official Node.js, TypeScript & Browser client for **ClusterPay** — the open-source, non-custodial cryptocurrency checkout and payment gateway.

[![npm version](https://img.shields.io/npm/v/@clusterpay/sdk.svg?style=flat-square)](https://www.npmjs.com/package/@clusterpay/sdk)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg?style=flat-square)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg?style=flat-square)](https://opensource.org/licenses/MIT)

---

## 📦 Installation

```bash
npm install @clusterpay/sdk
# or
yarn add @clusterpay/sdk
# or
pnpm add @clusterpay/sdk
```

---

## 🚀 Server-Side Usage (Node.js / Express / Next.js)

### 1. Initialize Client

```typescript
import { ClusterPay } from '@clusterpay/sdk';

const clusterpay = new ClusterPay({
  apiKey: process.env.CLUSTERPAY_API_KEY!, // 'CS_key_live_...'
  baseUrl: 'https://pay.yourstore.com'     // Or your self-hosted gateway URL
});
```

---

### 2. Create a Checkout Session

```typescript
const invoice = await clusterpay.createCheckout({
  amount: 49.99,
  currency: 'USD',
  callback_url: 'https://yourstore.com/api/webhooks/clusterpay',
  custom_id: 'ORDER_98214',
  description: 'Pro Annual Plan',
  redirect_url: 'https://yourstore.com/orders/success',
  wallets: {
    bep20: '0x71C8418013511110293C7C432929424838192834',
    trc20: 'TYDzsYUE2989Xwz4T2L7e2V9J38hXj4kLm8921',
    poly:  '0x892a764f3e91b2c45d8f99a012e8749bc38e9124'
  }
});

console.log(invoice.payment_url); // https://pay.yourstore.com/gateway/pay/cpay_...
console.log(invoice.amount);      // 49.994829 (6-decimal micro-offset)
```

---

### 3. Verify Webhooks (Express / Next.js API Routes)

```typescript
import express from 'express';
import { verifyWebhookSignature } from '@clusterpay/sdk';

const app = express();

// Important: Capture raw body for signature verification
app.post(
  '/api/webhooks/clusterpay',
  express.raw({ type: 'application/json' }),
  (req, res) => {
    const signature = req.headers['x-clusterpay-signature'] as string;
    const timestamp = req.headers['x-clusterpay-timestamp'] as string;
    const nonce = req.headers['x-clusterpay-nonce'] as string;

    const isValid = verifyWebhookSignature({
      rawBody: req.body, // Buffer or raw string
      signature,
      timestamp,
      nonce,
      apiKey: process.env.CLUSTERPAY_API_KEY!
    });

    if (!isValid) {
      return res.status(403).json({ error: 'Invalid HMAC signature' });
    }

    const event = JSON.parse(req.body.toString('utf8'));
    if (event.event === 'payment.settled') {
      console.log(`✅ Order ${event.custom_id} settled with tx ${event.tx_hash}`);
      // Deliver digital goods / grant access
    }

    res.json({ status: 'ok' });
  }
);
```

---

## 🌐 Frontend & In-App Modal (Browser)

```html
<!-- Include SDK Script -->
<script src="https://pay.yourstore.com/js/v1/clusterpay.js"></script>

<script>
  const cp = ClusterPay({ baseUrl: 'https://pay.yourstore.com' });

  // Open responsive Web3 payment modal
  cp.openModal({
    session_id: 'cpay_982f1b63e91a4b82',
    onSuccess: (payload) => {
      console.log('Payment confirmed on-chain!', payload);
      window.location.href = '/orders/success';
    },
    onExpire: () => {
      alert('Invoice expired. Please generate a new order.');
    }
  });
</script>
```

---

## 📜 License

MIT License. Copyright (c) 2026 ClusterPay Technologies.
