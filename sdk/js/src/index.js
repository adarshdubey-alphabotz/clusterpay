const crypto = require('crypto');

/**
 * ⚡ ClusterPay Node.js & TypeScript SDK
 */
class ClusterPay {
  constructor(config = {}) {
    const apiKey = typeof config === 'string' ? config : config.apiKey;
    if (!apiKey || typeof apiKey !== 'string') {
      throw new Error("ClusterPay: A valid API Key starting with 'CS_key_' is required.");
    }
    this.apiKey = apiKey.trim();
    this.baseUrl = (config.baseUrl || 'https://pay.rapidx.me').replace(/\/+$/, '');
    this.timeout = config.timeout || 15000;
  }

  async _request(path, options = {}) {
    const url = `${this.baseUrl}${path}`;
    const headers = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      'User-Agent': 'ClusterPay-Node-SDK/2.1.0',
      ...(options.headers || {})
    };

    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeoutId = controller ? setTimeout(() => controller.abort(), this.timeout) : null;

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller ? controller.signal : undefined
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const errorMsg = data.detail || `HTTP ${response.status} ${response.statusText}`;
        const error = new Error(`ClusterPay Error: ${errorMsg}`);
        error.status = response.status;
        error.data = data;
        throw error;
      }
      return data;
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  }

  /**
   * Creates a new 6-decimal cryptocurrency checkout session.
   */
  async createCheckout(options) {
    if (!options || typeof options !== 'object') {
      throw new Error('ClusterPay: Checkout options must be an object.');
    }
    if (!options.amount || options.amount <= 0) {
      throw new Error('ClusterPay: Checkout amount must be greater than 0.');
    }
    if (!options.callback_url) {
      throw new Error('ClusterPay: callback_url is required for webhook settlement.');
    }

    const payload = {
      amount: Number(options.amount),
      currency: (options.currency || 'USD').toUpperCase(),
      callback_url: options.callback_url,
      custom_id: options.custom_id,
      description: options.description,
      wallets: options.wallets || {},
      allowed_origins: options.allowed_origins || [],
      allowed_ips: options.allowed_ips || [],
      redirect_url: options.redirect_url,
      expires_in_minutes: options.expires_in_minutes || 15,
      surcharge_percent: options.surcharge_percent || 0.0,
      merchant_name: options.merchant_name,
      merchant_url: options.merchant_url,
      logo_url: options.logo_url,
      theme_color: options.theme_color,
      mode: options.mode || 'hosted'
    };

    return this._request('/api/v1/checkout', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  /**
   * Checks the real-time on-chain settlement status of a checkout session.
   */
  async getStatus(sessionId) {
    if (!sessionId) throw new Error('ClusterPay: sessionId is required.');
    return this._request(`/api/v1/status/${encodeURIComponent(sessionId)}`, {
      method: 'GET'
    });
  }

  /**
   * Triggers a signed HMAC webhook retry to your callback_url.
   */
  async resendWebhook(sessionId) {
    if (!sessionId) throw new Error('ClusterPay: sessionId is required.');
    return this._request(`/api/v1/webhook/resend/${encodeURIComponent(sessionId)}`, {
      method: 'POST'
    });
  }
}

/**
 * Timing-safe HMAC-SHA256 signature verifier with 5-minute replay defense.
 */
function verifyWebhookSignature({ rawBody, signature, timestamp, nonce, apiKey, maxDriftSeconds = 300 }) {
  if (!signature || !apiKey) return false;

  // 1. Replay defense timestamp drift check
  if (timestamp) {
    const ts = parseInt(timestamp, 10);
    const now = Math.floor(Date.now() / 1000);
    if (isNaN(ts) || Math.abs(now - ts) > maxDriftSeconds) {
      return false;
    }
  }

  // 2. Normalize raw body buffer
  let bodyBuffer;
  if (Buffer.isBuffer(rawBody)) {
    bodyBuffer = rawBody;
  } else if (typeof rawBody === 'string') {
    bodyBuffer = Buffer.from(rawBody, 'utf8');
  } else {
    return false;
  }

  // 3. Recompute HMAC-SHA256 signature
  const signedPayload = (timestamp && nonce)
    ? Buffer.concat([Buffer.from(`${timestamp}.${nonce}.`, 'utf8'), bodyBuffer])
    : bodyBuffer;

  const expectedSignature = crypto
    .createHmac('sha256', apiKey)
    .update(signedPayload)
    .digest('hex');

  // 4. Constant-time timing-safe buffer comparison
  const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
  const signatureBuffer = Buffer.from(signature.trim(), 'utf8');

  if (expectedBuffer.length !== signatureBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, signatureBuffer);
}

module.exports = {
  ClusterPay,
  verifyWebhookSignature,
  default: ClusterPay
};
