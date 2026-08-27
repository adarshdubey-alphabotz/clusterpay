import React, { useState, useEffect, useRef } from 'react';
import { 
  Clock, 
  Copy, 
  Check, 
  ExternalLink, 
  CheckCircle2, 
  ArrowRight, 
  ShieldCheck, 
  RefreshCw, 
  AlertCircle, 
  Lock,
  Radio,
  Zap
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import StoreApp from './StoreApp';

// ── ACCURATE CRYPTO LOGOS (1.5PX FINTECH STYLE) ─────────────────────────
const UsdtIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 32 32" fill="none">
    <circle cx="16" cy="16" r="16" fill="#26A17B" />
    <path d="M17.8 14.5c-.1 0-.7.1-1.8.1-1 0-1.6-.1-1.8-.1v-2.3h7.4V8.5H10.4v3.7h3.8v2.3c-1.1 0-1.7-.1-1.8-.1-4.2-.2-7.4-1-7.4-2 0-1.1 3.2-1.9 7.4-2.1V7.1C7.8 7.3 4 8.5 4 10.1c0 1.9 5.4 3.4 12 3.4s12-1.5 12-3.4c0-1.6-3.8-2.8-8.4-3v3.2c4.2.2 7.4 1 7.4 2.1 0 1-3.2 1.8-7.2 2.1v7.6h-2V14.5z" fill="#FFFFFF" />
  </svg>
);

const BnbIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 32 32" fill="none">
    <circle cx="16" cy="16" r="16" fill="#F3BA2F" />
    <path d="M16 6L20.5 10.5L18.4 12.6L16 10.2L13.6 12.6L11.5 10.5L16 6ZM8.5 13.5L10.6 11.4L13 13.8L10.6 16.2L8.5 14.1V13.5ZM23.5 13.5L25.6 15.6L23.5 17.7L21.1 15.3L23.5 12.9V13.5ZM16 13.8L18.4 16.2L16 18.6L13.6 16.2L16 13.8ZM16 22.2L18.4 19.8L20.5 21.9L16 26.4L11.5 21.9L13.6 19.8L16 22.2Z" fill="#1E2026" />
  </svg>
);

const TrxIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 32 32" fill="none">
    <circle cx="16" cy="16" r="16" fill="#EF0027" />
    <path d="M7 8.5L25.5 6L23 26L7 8.5ZM19.5 11L10.5 10L20.5 21L19.5 11ZM21.5 10L13.5 18.5L22 22.5L21.5 10Z" fill="#FFFFFF" />
  </svg>
);

const PolygonIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 32 32" fill="none">
    <circle cx="16" cy="16" r="16" fill="#8247E5" />
    <path d="M21.5 13.5L17.5 11.2V15.7L21.5 18V13.5ZM14.5 11.2L10.5 13.5V18L14.5 15.7V11.2ZM10.5 19.5L14.5 21.8V17.3L10.5 15V19.5ZM17.5 21.8L21.5 19.5V15L17.5 17.3V21.8Z" fill="#FFFFFF" />
  </svg>
);

const TonIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 32 32" fill="none">
    <circle cx="16" cy="16" r="16" fill="#0098EA" />
    <path d="M16 6L25 11V21L16 26L7 21V11L16 6ZM16 9.5L10 13V19L16 22.5L22 19V13L16 9.5Z" fill="#FFFFFF" />
  </svg>
);

const LtcIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 32 32" fill="none">
    <circle cx="16" cy="16" r="16" fill="#345D9D" />
    <path d="M13 8H16.5L14.8 14.5H18L17.3 17.5H14L12.5 24H21V26H10.5L13 8Z" fill="#FFFFFF" />
  </svg>
);

const BtcIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 32 32" fill="none">
    <circle cx="16" cy="16" r="16" fill="#F7931A" />
    <path d="M19 14.5C20.5 14 21 13 21 11.5C21 9.5 19.5 8.5 17 8.5H12V23.5H17.5C20.5 23.5 22 22 22 19.5C22 17.5 21 15.5 19 14.5ZM15 11H17C18 11 18.5 11.5 18.5 12.5C18.5 13.5 18 14 17 14H15V11ZM17.5 21H15V16.5H17.5C18.5 16.5 19.5 17 19.5 18.5C19.5 20 18.5 21 17.5 21Z" fill="#FFFFFF" />
  </svg>
);

const ArbIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 32 32" fill="none">
    <circle cx="16" cy="16" r="16" fill="#28A0F0" />
    <path d="M16 6L24.5 11V21L16 26L7.5 21V11L16 6Z" stroke="#FFFFFF" strokeWidth="2" strokeLinejoin="round" />
    <path d="M16 11L21 21H18L16 15L14 21H11L16 11Z" fill="#FFFFFF" />
  </svg>
);

export default function App() {
  if (window.location.pathname.includes("/store")) {
    return <StoreApp />;
  }

  const pData = window.paymentData || {};
  const initialAmount = parseFloat(pData.amount || '10.004829') || 10.004829;
  const sessionId = pData.session_id || 'cpay_sandbox_session';
  const merchantName = pData.merchant_name || 'ClusterPay Store';
  const logoUrl = pData.logo_url || '';
  const redirectUrl = pData.redirect_url || '';
  const customId = pData.custom_id || '';

  // Pricing feeds
  const bnbPrice = parseFloat(pData.bnb_price || '600') || 600;
  const ltcPrice = parseFloat(pData.ltc_price || '85') || 85;
  const tonPrice = parseFloat(pData.ton_price || '5.5') || 5.5;
  const polPrice = parseFloat(pData.pol_price || '0.45') || 0.45;
  const btcPrice = parseFloat(pData.btc_price || '65000') || 65000;

  // Build Coin List based on available addresses
  const rawCoins = [
    {
      id: 'USDT_BEP20',
      symbol: 'USDT',
      network: 'BEP-20 (BNB Chain)',
      name: 'Tether (BEP-20)',
      address: pData.USDT_WALLET_BEP20 || '',
      icon: UsdtIcon,
      decimals: 4,
      calcAmount: () => initialAmount.toFixed(4),
      explorerUrl: (tx) => `https://bscscan.com/tx/${tx}`
    },
    {
      id: 'USDT_TRC20',
      symbol: 'USDT',
      network: 'TRC-20 (TRON)',
      name: 'Tether (TRC-20)',
      address: pData.USDT_WALLET_TRC20 || '',
      icon: UsdtIcon,
      decimals: 4,
      calcAmount: () => initialAmount.toFixed(4),
      explorerUrl: (tx) => `https://tronscan.org/#/transaction/${tx}`
    },
    {
      id: 'USDT_POLY',
      symbol: 'USDT',
      network: 'Polygon PoS',
      name: 'Tether (Polygon)',
      address: pData.USDT_WALLET_POLY || '',
      icon: UsdtIcon,
      decimals: 4,
      calcAmount: () => initialAmount.toFixed(4),
      explorerUrl: (tx) => `https://polygonscan.com/tx/${tx}`
    },
    {
      id: 'USDT_ARB',
      symbol: 'USDT',
      network: 'Arbitrum One',
      name: 'Tether (Arbitrum)',
      address: pData.USDT_WALLET_ARBITRUM || '',
      icon: UsdtIcon,
      decimals: 4,
      calcAmount: () => initialAmount.toFixed(4),
      explorerUrl: (tx) => `https://arbiscan.io/tx/${tx}`
    },
    {
      id: 'TON',
      symbol: 'TON',
      network: 'TON Network',
      name: 'The Open Network',
      address: pData.TON_WALLET || '',
      icon: TonIcon,
      decimals: 4,
      calcAmount: () => (tonPrice > 0 ? (initialAmount / tonPrice).toFixed(4) : '0.0000'),
      explorerUrl: (tx) => `https://tonscan.org/tx/${tx}`
    },
    {
      id: 'BNB',
      symbol: 'BNB',
      network: 'BNB Chain Native',
      name: 'BNB',
      address: pData.USDT_WALLET_BEP20 || '',
      icon: BnbIcon,
      decimals: 4,
      calcAmount: () => (bnbPrice > 0 ? (initialAmount / bnbPrice).toFixed(4) : '0.0000'),
      explorerUrl: (tx) => `https://bscscan.com/tx/${tx}`
    },
    {
      id: 'LTC',
      symbol: 'LTC',
      network: 'Litecoin Network',
      name: 'Litecoin',
      address: pData.LTC_WALLET || '',
      icon: LtcIcon,
      decimals: 4,
      calcAmount: () => (ltcPrice > 0 ? (initialAmount / ltcPrice).toFixed(4) : '0.0000'),
      explorerUrl: (tx) => `https://live.blockcypher.com/ltc/tx/${tx}`
    },
    {
      id: 'BTC',
      symbol: 'BTC',
      network: 'Bitcoin Network',
      name: 'Bitcoin',
      address: pData.BTC_WALLET || '',
      icon: BtcIcon,
      decimals: 6,
      calcAmount: () => (btcPrice > 0 ? (initialAmount / btcPrice).toFixed(6) : '0.000000'),
      explorerUrl: (tx) => `https://mempool.space/tx/${tx}`
    }
  ];

  // Filter available coins that have non-empty address
  const activeCoins = rawCoins.filter(c => c.address && c.address.trim().length > 5);
  const availableCoins = activeCoins.length > 0 ? activeCoins : [rawCoins[0]]; // fallback

  const [selectedCoin, setSelectedCoin] = useState(availableCoins[0]);
  const [timeLeft, setTimeLeft] = useState(parseInt(pData.time_left || '900', 10) || 900);
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState('pending'); // 'pending' | 'verifying' | 'paid' | 'expired'
  const [txDetails, setTxDetails] = useState({ txid: '', amount_received: 0 });
  const [isManualChecking, setIsManualChecking] = useState(false);
  const [redirectCountdown, setRedirectCountdown] = useState(5);

  // Countdown timer effect
  useEffect(() => {
    if (timeLeft <= 0) {
      setStatus('expired');
      return;
    }
    if (status === 'paid') return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setStatus('expired');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, status]);

  // Background 100% Automated Multi-RPC Polling
  const checkPaymentStatus = async () => {
    if (!sessionId || sessionId.includes('sandbox')) return;
    try {
      const res = await fetch(`/api/v1/gateway/status/${sessionId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'paid') {
          setStatus('paid');
          setTxDetails({
            txid: data.txid || '0xOnChainVerified',
            amount_received: data.amount_received || initialAmount
          });
          if (window.Telegram?.WebApp) {
            window.Telegram.WebApp.HapticFeedback?.notificationOccurred('success');
          }
        } else if (data.status === 'expired') {
          setStatus('expired');
        }
      }
    } catch (err) {
      // silent background check
    }
  };

  useEffect(() => {
    if (status === 'paid' || status === 'expired') return;
    const pollInterval = setInterval(checkPaymentStatus, 3500);
    return () => clearInterval(pollInterval);
  }, [sessionId, status, initialAmount]);

  // Auto-Redirect on Payment Confirmation
  useEffect(() => {
    if (status === 'paid' && redirectUrl) {
      const redirectTimer = setInterval(() => {
        setRedirectCountdown(prev => {
          if (prev <= 1) {
            clearInterval(redirectTimer);
            window.location.href = redirectUrl;
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(redirectTimer);
    }
  }, [status, redirectUrl]);

  const handleCopy = (text) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCheckNow = async () => {
    setIsManualChecking(true);
    await checkPaymentStatus();
    setTimeout(() => setIsManualChecking(false), 1500);
  };

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const CoinIcon = selectedCoin.icon;
  const currentAmount = selectedCoin.calcAmount();

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 sm:p-6 bg-[#FAFAFA] font-sans text-zinc-900 selection:bg-black selection:text-white">
      
      {/* Central Modern Card Container */}
      <div className="w-full max-w-md bg-white rounded-3xl border border-zinc-200 shadow-sm overflow-hidden transition-all">
        
        {/* TOP BAR: Merchant Info & Expiry Timer */}
        <div className="p-5 sm:p-6 border-b border-zinc-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="w-8 h-8 rounded-xl object-contain border border-zinc-200" />
            ) : (
              <div className="w-8 h-8 rounded-xl bg-black text-white flex items-center justify-center font-mono font-bold text-xs shadow-2xs">
                CP
              </div>
            )}
            <div>
              <h1 className="font-semibold text-xs text-black leading-tight">
                {merchantName}
              </h1>
              <div className="text-[10px] font-mono text-zinc-400 mt-0.5">
                {customId ? `Order #${customId}` : `Invoice #${sessionId.slice(-8).toUpperCase()}`}
              </div>
            </div>
          </div>

          {/* Expiry Pill */}
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-medium border ${
            timeLeft < 180 
              ? 'bg-rose-50 text-rose-600 border-rose-200' 
              : 'bg-zinc-50 text-zinc-700 border-zinc-200'
          }`}>
            <Clock className="w-3.5 h-3.5" strokeWidth={1.5} />
            <span>{formatTimer(timeLeft)}</span>
          </div>
        </div>

        {/* ── STATE 1: PENDING PAYMENT ── */}
        {status === 'pending' && (
          <div className="p-5 sm:p-6 space-y-6">
            
            {/* Amount Banner */}
            <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200 text-center space-y-0.5">
              <div className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 font-medium">
                Exact Amount Due
              </div>
              <div className="text-3xl sm:text-4xl font-bold font-mono text-black tracking-tight">
                {currentAmount} <span className="text-base font-semibold text-zinc-500">{selectedCoin.symbol}</span>
              </div>
              <div className="text-[10px] font-mono text-zinc-400">
                Direct settlement to merchant cold wallet
              </div>
            </div>

            {/* Network Selector (Pills Grid) */}
            <div className="space-y-2">
              <div className="text-[11px] font-mono font-semibold uppercase text-zinc-400">
                Select Network
              </div>
              <div className="grid grid-cols-2 gap-2">
                {availableCoins.map((coinItem) => {
                  const Icon = coinItem.icon;
                  const isSelected = selectedCoin.id === coinItem.id;
                  return (
                    <button
                      key={coinItem.id}
                      onClick={() => setSelectedCoin(coinItem)}
                      className={`p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition-all ${
                        isSelected
                          ? 'bg-black text-white border-black shadow-2xs'
                          : 'bg-white text-zinc-700 border-zinc-200 hover:border-zinc-300'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <div className="truncate">
                        <div className="font-semibold text-xs leading-none">{coinItem.name}</div>
                        <div className={`text-[10px] font-mono mt-0.5 ${isSelected ? 'text-zinc-300' : 'text-zinc-400'}`}>
                          {coinItem.symbol}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* QR Code Container */}
            <div className="flex flex-col items-center justify-center p-5 bg-white rounded-2xl border border-zinc-200 shadow-2xs space-y-3">
              <div className="p-2 bg-white rounded-xl border border-zinc-100">
                <QRCodeSVG
                  value={selectedCoin.address || 'empty'}
                  size={140}
                  level="H"
                  includeMargin={false}
                />
              </div>
              <div className="text-[11px] font-mono text-zinc-500 text-center">
                Scan with Binance, Trust Wallet, MetaMask, OKX, or Telegram Wallet
              </div>
            </div>

            {/* Destination Address Box */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
                <span>Receiving Address:</span>
                <span>{selectedCoin.network}</span>
              </div>
              <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200 font-mono text-xs text-zinc-800 flex items-center justify-between gap-2">
                <span className="truncate select-all">{selectedCoin.address}</span>
                <button
                  onClick={() => handleCopy(selectedCoin.address)}
                  className="px-2.5 py-1 rounded-lg bg-white border border-zinc-200 hover:bg-zinc-100 text-zinc-700 text-xs font-semibold flex items-center gap-1 shrink-0 transition-colors shadow-2xs"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-[#26A17B]" strokeWidth={1.5} /> : <Copy className="w-3.5 h-3.5" strokeWidth={1.5} />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            {/* 100% AUTOMATED OBSERVATION RADAR */}
            <div className="pt-2 border-t border-zinc-100 space-y-3">
              <div className="p-3 rounded-2xl bg-zinc-50 border border-zinc-200 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#26A17B] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#26A17B]"></span>
                  </span>
                  <div className="text-[11px] font-mono text-zinc-600">
                    Auto-detecting transfer on-chain...
                  </div>
                </div>
                <button
                  onClick={handleCheckNow}
                  disabled={isManualChecking}
                  className="px-3 py-1.5 rounded-xl bg-white border border-zinc-200 text-xs font-semibold font-mono text-zinc-800 hover:bg-zinc-100 flex items-center gap-1.5 shadow-2xs transition-all disabled:opacity-50"
                >
                  <RefreshCw className={`w-3 h-3 text-zinc-500 ${isManualChecking ? 'animate-spin text-black' : ''}`} strokeWidth={1.5} />
                  <span>{isManualChecking ? 'Scanning...' : 'Check Status'}</span>
                </button>
              </div>

              <div className="text-[10px] font-mono text-zinc-400 text-center">
                Send the exact amount above. The gateway verifies automatically without requiring a TxID.
              </div>
            </div>

          </div>
        )}

        {/* ── STATE 2: PAYMENT CONFIRMED / SETTLED ── */}
        {status === 'paid' && (
          <div className="p-8 space-y-6 text-center">
            
            <div className="w-14 h-14 rounded-full bg-emerald-50 text-[#26A17B] border border-emerald-200 flex items-center justify-center mx-auto shadow-2xs">
              <CheckCircle2 className="w-7 h-7" strokeWidth={1.5} />
            </div>

            <div>
              <h2 className="font-serif text-3xl text-black font-normal">Payment Confirmed</h2>
              <p className="text-xs text-zinc-500 font-mono mt-1">
                Settlement verified directly on-chain.
              </p>
            </div>

            {/* Receipt Box */}
            <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200 font-mono text-xs space-y-2.5 text-left">
              <div className="flex justify-between">
                <span className="text-zinc-500">Status:</span>
                <span className="text-[#26A17B] font-bold uppercase">Settled (0x1 Success)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Amount Received:</span>
                <span className="text-black font-semibold">{txDetails.amount_received} USDT</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">TxID:</span>
                <span className="text-zinc-800 truncate max-w-[180px]">{txDetails.txid}</span>
              </div>
            </div>

            {/* Redirect Action */}
            {redirectUrl ? (
              <div className="space-y-2">
                <button
                  onClick={() => window.location.href = redirectUrl}
                  className="w-full py-3 rounded-xl bg-black text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-2xs hover:bg-zinc-800 transition-colors"
                >
                  <span>Continue to Merchant</span>
                  <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.5} />
                </button>
                <div className="text-[11px] font-mono text-zinc-400">
                  Redirecting automatically in {redirectCountdown}s...
                </div>
              </div>
            ) : (
              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 text-xs font-mono text-zinc-600">
                You may now close this window and return to your merchant.
              </div>
            )}

          </div>
        )}

        {/* ── STATE 3: INVOICE EXPIRED ── */}
        {status === 'expired' && (
          <div className="p-8 space-y-6 text-center">
            
            <div className="w-14 h-14 rounded-full bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center mx-auto shadow-2xs">
              <Clock className="w-7 h-7" strokeWidth={1.5} />
            </div>

            <div>
              <h2 className="font-serif text-3xl text-black font-normal">Invoice Expired</h2>
              <p className="text-xs text-zinc-500 font-mono mt-1">
                The 15-minute payment window has elapsed.
              </p>
            </div>

            <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-200 text-xs font-mono text-zinc-600 leading-relaxed text-left">
              To prevent transaction collisions, invoices are automatically invalidated after 15 minutes. Please return to the merchant storefront to initiate a fresh checkout.
            </div>

            {redirectUrl && (
              <button
                onClick={() => window.location.href = redirectUrl}
                className="w-full py-3 rounded-xl bg-black text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-2xs hover:bg-zinc-800 transition-colors"
              >
                <span>Return to Merchant</span>
                <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.5} />
              </button>
            )}

          </div>
        )}

        {/* FOOTER BAR: Security Badge */}
        <div className="px-6 py-3 bg-zinc-50 border-t border-zinc-100 flex items-center justify-between text-[11px] font-mono text-zinc-400">
          <div className="flex items-center gap-1.5">
            <Lock className="w-3 h-3 text-zinc-400" strokeWidth={1.5} />
            <span>Non-Custodial Direct Settlement</span>
          </div>
          <span className="font-semibold text-zinc-600">ClusterPay</span>
        </div>

      </div>

    </div>
  );
}
