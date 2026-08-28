export interface ClusterPayConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
}

export interface WalletAddresses {
  bep20?: string;
  trc20?: string;
  poly?: string;
  arb?: string;
  ton?: string;
  ltc?: string;
  btc?: string;
  pol?: string;
  [key: string]: string | undefined;
}

export interface CreateCheckoutOptions {
  amount: number;
  callback_url: string;
  currency?: string;
  custom_id?: string;
  description?: string;
  wallets?: WalletAddresses;
  allowed_origins?: string[];
  allowed_ips?: string[];
  redirect_url?: string;
  expires_in_minutes?: number;
  surcharge_percent?: number;
  merchant_name?: string;
  merchant_url?: string;
  logo_url?: string;
  theme_color?: string;
  mode?: 'hosted' | 'modal' | 'inline';
}

export interface CheckoutResponse {
  success: boolean;
  session_id: string;
  amount: number;
  base_amount: number;
  currency: string;
  payment_url: string;
  embed_url: string;
  expires_at: string;
  status: 'pending' | 'paid' | 'expired';
}

export interface SessionStatusResponse {
  session_id: string;
  status: 'pending' | 'paid' | 'expired';
  amount: number;
  base_amount: number;
  currency: string;
  custom_id?: string;
  coin?: string;
  tx_hash?: string;
  created_at: string;
  expires_at: string;
  paid_at?: string;
}

export interface VerifyWebhookOptions {
  rawBody: Buffer | string;
  signature: string;
  timestamp?: string;
  nonce?: string;
  apiKey: string;
  maxDriftSeconds?: number;
}

export declare class ClusterPay {
  constructor(config: string | ClusterPayConfig);
  createCheckout(options: CreateCheckoutOptions): Promise<CheckoutResponse>;
  getStatus(sessionId: string): Promise<SessionStatusResponse>;
  resendWebhook(sessionId: string): Promise<{ success: boolean; message: string }>;
}

export declare function verifyWebhookSignature(options: VerifyWebhookOptions): boolean;

export default ClusterPay;
