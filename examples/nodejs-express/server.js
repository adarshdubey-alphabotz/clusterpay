const express = require('express');
const crypto = require('crypto');
const axios = require('axios');

const app = express();
const PORT = 3000;
const CLUSTERPAY_API_KEY = process.env.CLUSTERPAY_API_KEY || 'CS_key_YOUR_KEY';
const CLUSTERPAY_BASE_URL = 'https://pay.rapidx.me';

// Express raw body parser for signature verification
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));

// 1. Create a checkout session
app.post('/api/create-order', async (req, res) => {
  try {
    const response = await axios.post(
      `${CLUSTERPAY_BASE_URL}/api/v1/checkout`,
      {
        amount: 19.99,
        currency: 'USD',
        callback_url: 'https://yourstore.com/api/webhook/clusterpay',
        custom_id: 'order_98124',
        description: 'Premium SaaS Subscription - 1 Month',
        redirect_url: 'https://yourstore.com/order-success'
      },
      {
        headers: {
          'Authorization': `Bearer ${CLUSTERPAY_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.response?.data || error.message });
  }
});

// 2. Webhook listener with HMAC-SHA256 signature verification
app.post('/api/webhook/clusterpay', (req, res) => {
  const signature = req.headers['x-clusterpay-signature'];
  if (!signature) {
    return res.status(401).send('Missing signature');
  }

  // Cryptographic verification
  const expectedSignature = crypto
    .createHmac('sha256', CLUSTERPAY_API_KEY)
    .update(req.rawBody)
    .digest('hex');

  const isValid = crypto.timingSafeEqual(
    Buffer.from(expectedSignature),
    Buffer.from(signature)
  );

  if (!isValid) {
    return res.status(403).send('Invalid signature');
  }

  const { event, session_id, custom_id, status, amount, coin, tx_hash } = req.body;
  console.log(`[Webhook Verified] ${event} for ${custom_id} (${session_id}): ${status}, tx: ${tx_hash}`);

  if (status === 'paid') {
    // Fulfill customer order in your database
    console.log(`Order ${custom_id} fulfilled!`);
  }

  res.status(200).send('OK');
});

app.listen(PORT, () => {
  console.log(`Merchant store server running on http://localhost:${PORT}`);
});
