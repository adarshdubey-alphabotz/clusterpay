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
  ChevronDown,
  ChevronUp,
  Sparkles,
  Zap,
  Info,
  CheckCircle,
  XCircle,
  HelpCircle
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import StoreApp from './StoreApp';
import { 
  UsdtIcon, 
  BnbIcon, 
  TrxIcon, 
  PolygonIcon, 
  TonIcon, 
  ArbitrumIcon, 
  BtcIcon, 
  EthIcon, 
  LtcIcon 
} from './CoinIcons';

export default function App() {
  if (window.location.pathname.includes("/store")) {
    return <StoreApp />;
  }

  const pData = window.paymentData || {};
  const initialAmount = parseFloat(pData.amount || '10.004829') || 10.004829;
  const sessionId = pData.session_id || 'cpay_sandbox_session';
  const merchantName = pData.merchant_name || 'ClusterPay Merchant';
  const merchantUrl = pData.merchant_url || '';
  const logoUrl = pData.logo_url || '';
  const redirectUrl = pData.redirect_url || '';
  const customId = pData.custom_id || '';
  const embed = pData.embed === 'true';

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
      network: 'BEP-20 (BSC)',
      chainName: 'BNB Smart Chain',
      name: 'Tether USDT',
      address: pData.USDT_WALLET_BEP20 || '',
      icon: UsdtIcon,
      tag: 'Fast & Low Gas',
      calcAmount: () => initialAmount.toFixed(6),
      explorerUrl: (tx) => `https://bscscan.com/tx/${tx}`,
      scheme: (addr, amt) => `ethereum:${addr}?value=0&amount=${amt}`
    },
    {
      id: 'USDT_TRC20',
      symbol: 'USDT',
      network: 'TRC-20 (TRON)',
      chainName: 'TRON Network',
      name: 'Tether USDT',
      address: pData.USDT_WALLET_TRC20 || '',
      icon: TrxIcon,
      tag: 'Popular',
      calcAmount: () => initialAmount.toFixed(6),
      explorerUrl: (tx) => `https://tronscan.org/#/transaction/${tx}`,
      scheme: (addr, amt) => `tron:${addr}?amount=${amt}`
    },
    {
      id: 'USDT_POLY',
      symbol: 'USDT',
      network: 'Polygon PoS',
      chainName: 'Polygon Network',
      name: 'Tether USDT',
      address: pData.USDT_WALLET_POLY || '',
      icon: PolygonIcon,
      tag: 'Micro Gas',
      calcAmount: () => initialAmount.toFixed(6),
      explorerUrl: (tx) => `https://polygonscan.com/tx/${tx}`,
      scheme: (addr, amt) => `ethereum:${addr}?value=0&amount=${amt}`
    },
    {
      id: 'USDT_ARB',
      symbol: 'USDT',
      network: 'Arbitrum One',
      chainName: 'Arbitrum L2',
      name: 'Tether USDT',
      address: pData.USDT_WALLET_ARBITRUM || '',
      icon: ArbitrumIcon,
      tag: 'Arbitrum L2',
      calcAmount: () => initialAmount.toFixed(6),
      explorerUrl: (tx) => `https://arbiscan.io/tx/${tx}`,
      scheme: (addr, amt) => `ethereum:${addr}?value=0&amount=${amt}`
    },
    {
      id: 'TON',
      symbol: 'TON',
      network: 'TON Network',
      chainName: 'The Open Network',
      name: 'Toncoin',
      address: pData.TON_WALLET || '',
      icon: TonIcon,
      tag: 'Telegram Wallet',
      calcAmount: () => (tonPrice > 0 ? (initialAmount / tonPrice).toFixed(4) : '0.0000'),
      explorerUrl: (tx) => `https://tonscan.org/tx/${tx}`,
      scheme: (addr, amt) => `ton://transfer/${addr}?amount=${Math.round(amt * 1e9)}`
    },
    {
      id: 'BNB',
      symbol: 'BNB',
      network: 'BNB Chain',
      chainName: 'BNB Smart Chain',
      name: 'BNB Native',
      address: pData.USDT_WALLET_BEP20 || '',
      icon: BnbIcon,
      tag: 'Native Coin',
      calcAmount: () => (bnbPrice > 0 ? (initialAmount / bnbPrice).toFixed(6) : '0.000000'),
      explorerUrl: (tx) => `https://bscscan.com/tx/${tx}`,
      scheme: (addr, amt) => `ethereum:${addr}?value=${amt}`
    },
    {
      id: 'LTC',
      symbol: 'LTC',
      network: 'Litecoin',
      chainName: 'Litecoin Network',
      name: 'Litecoin',
      address: pData.LTC_WALLET || '',
      icon: LtcIcon,
      tag: 'Low Fee UTXO',
      calcAmount: () => (ltcPrice > 0 ? (initialAmount / ltcPrice).toFixed(6) : '0.000000'),
      explorerUrl: (tx) => `https://live.blockcypher.com/ltc/tx/${tx}`,
      scheme: (addr, amt) => `litecoin:${addr}?amount=${amt}`
    },
    {
      id: 'BTC',
      symbol: 'BTC',
      network: 'Bitcoin',
      chainName: 'Bitcoin Network',
      name: 'Bitcoin',
      address: pData.BTC_WALLET || '',
      icon: BtcIcon,
      tag: 'Native UTXO',
      calcAmount: () => (btcPrice > 0 ? (initialAmount / btcPrice).toFixed(6) : '0.000000'),
      explorerUrl: (tx) => `https://mempool.space/tx/${tx}`,
      scheme: (addr, amt) => `bitcoin:${addr}?amount=${amt}`
    }
  ];

  // Filter available coins that have valid address configured
  const activeCoins = rawCoins.filter(c => c.address && c.address.trim().length > 5);
  const availableCoins = activeCoins.length > 0 ? activeCoins : [rawCoins[0]];

  const [selectedCoin, setSelectedCoin] = useState(availableCoins[0]);
  const [timeLeft, setTimeLeft] = useState(parseInt(pData.time_left || '900', 10) || 900);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [copiedAmount, setCopiedAmount] = useState(false);
  const [status, setStatus] = useState('pending'); // 'pending' | 'verifying' | 'paid' | 'expired'
  const [txDetails, setTxDetails] = useState({ txid: '', amount_received: 0, paid_at: '' });
  const [redirectCountdown, setRedirectCountdown] = useState(5);

  // 15-Minute Countdown Timer
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

  // Real-Time Background Multi-RPC Mempool Observer Polling
  const checkPaymentStatus = async () => {
    if (!sessionId || sessionId.includes('sandbox')) return;
    try {
      const res = await fetch(`/api/v1/gateway/status/${sessionId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'paid') {
          setStatus('paid');
          setTxDetails({
            txid: data.txid || data.tx_hash || '0xOnChainVerified',
            amount_received: data.amount_received || initialAmount,
            paid_at: data.paid_at || new Date().toISOString()
          });
          if (window.Telegram?.WebApp) {
            window.Telegram.WebApp.HapticFeedback?.notificationOccurred('success');
          }
          if (embed && window.parent) {
            window.parent.postMessage({
              type: 'CLUSTERPAY_SUCCESS',
              payload: { sessionId, amount: data.amount_received || initialAmount, txid: data.txid }
            }, '*');
          }
        } else if (data.status === 'expired') {
          setStatus('expired');
          if (embed && window.parent) {
            window.parent.postMessage({ type: 'CLUSTERPAY_EXPIRED', payload: { sessionId } }, '*');
          }
        }
      }
    } catch (err) {
      // silent background poll
    }
  };

  useEffect(() => {
    if (status === 'paid' || status === 'expired') return;
    const pollInterval = setInterval(checkPaymentStatus, 3000);
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

  // Copy Helpers
  const handleCopyAddress = (text) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 2000);
    }
  };

  const handleCopyAmount = (text) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedAmount(true);
      setTimeout(() => setCopiedAmount(false), 2000);
    }
  };

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const CoinIcon = selectedCoin.icon;
  const currentAmount = selectedCoin.calcAmount();

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-3 sm:p-6 bg-[#F4F6F8] font-sans text-zinc-900 selection:bg-black selection:text-white">
      
      {/* ── MAIN RAZORPAY / STRIPE GRADE CHECKOUT CONTAINER ── */}
      <div className="w-full max-w-xl bg-white rounded-2xl sm:rounded-3xl border border-zinc-200/90 shadow-[0_10px_35px_-10px_rgba(0,0,0,0.08)] overflow-hidden transition-all">
        
        {/* ══════════════════════════════════════════════════════════════════
            HEADER: RAZORPAY STYLE BRAND & TRUST BAR
            ══════════════════════════════════════════════════════════════════ */}
        <div className="px-5 py-4 sm:px-6 sm:py-5 border-b border-zinc-100 bg-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <img src={logoUrl} alt={merchantName} className="w-9 h-9 rounded-xl object-contain border border-zinc-200/80 p-0.5 bg-white shadow-2xs" />
            ) : (
              <div className="w-9 h-9 rounded-xl bg-zinc-950 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                ⚡
              </div>
            )}
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="font-bold text-xs sm:text-sm text-zinc-950 leading-none">
                  {merchantName}
                </h1>
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-mono text-[9px] font-semibold border border-emerald-200/60">
                  <CheckCircle className="w-2.5 h-2.5 text-emerald-600" />
                  <span>Verified</span>
                </span>
              </div>
              <div className="text-[10px] font-mono text-zinc-400 mt-1">
                {customId ? `Order #${customId}` : `Ref #${sessionId.slice(-8).toUpperCase()}`}
              </div>
            </div>
          </div>

          {/* 15-Minute Expiry Countdown Pill */}
          <div className="flex flex-col items-end">
            <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-mono font-bold border transition-colors ${
              timeLeft < 180 
                ? 'bg-rose-50 text-rose-700 border-rose-200' 
                : 'bg-zinc-50 text-zinc-800 border-zinc-200'
            }`}>
              <Clock className="w-3.5 h-3.5 text-zinc-500 animate-pulse" />
              <span>{formatTimer(timeLeft)}</span>
            </div>
            <span className="text-[9px] font-mono text-zinc-400 mt-0.5">Session Expires</span>
          </div>
        </div>


        {/* ══════════════════════════════════════════════════════════════════
            STATE 1: ACTIVE PAYMENT CHECKOUT
            ══════════════════════════════════════════════════════════════════ */}
        {status === 'pending' && (
          <div className="p-5 sm:p-7 space-y-6">
            
            {/* 1. AMOUNT DUE SUMMARY CARD (RAZORPAY STYLE) */}
            <div className="p-4 rounded-2xl bg-zinc-950 text-white flex items-center justify-between shadow-xs">
              <div>
                <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">
                  Amount Due
                </div>
                <div className="text-2xl sm:text-3xl font-bold font-sans tracking-tight text-white mt-0.5">
                  ${initialAmount.toFixed(2)} <span className="text-xs font-mono text-zinc-400 font-normal">USD</span>
                </div>
              </div>

              <div className="text-right">
                <div className="text-[10px] font-mono text-emerald-400 font-semibold uppercase">
                  Exact Transfer
                </div>
                <div className="text-sm sm:text-base font-bold font-mono text-emerald-300">
                  {currentAmount} {selectedCoin.symbol}
                </div>
                <div className="text-[9px] font-mono text-zinc-400">
                  6-Dec Micro-Offset
                </div>
              </div>
            </div>


            {/* 2. CHOOSE PAYMENT ASSET & NETWORK (RAZORPAY ACCORDION/GRID) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-mono font-bold text-zinc-500 uppercase tracking-wider">
                  Select Payment Asset &amp; Network
                </label>
                <span className="text-[10px] font-mono text-zinc-400">
                  {availableCoins.length} Networks Available
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {availableCoins.map((coinItem) => {
                  const Icon = coinItem.icon;
                  const isSelected = selectedCoin.id === coinItem.id;
                  return (
                    <button
                      key={coinItem.id}
                      onClick={() => {
                        setSelectedCoin(coinItem);
                        setVerifyError('');
                      }}
                      className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-zinc-900 text-white border-zinc-900 shadow-xs ring-2 ring-zinc-950/20'
                          : 'bg-white text-zinc-800 border-zinc-200/90 hover:border-zinc-300 hover:bg-zinc-50'
                      }`}
                    >
                      <Icon className="w-5 h-5 shrink-0" />
                      <div className="truncate min-w-0">
                        <div className="font-bold text-xs leading-tight truncate">{coinItem.symbol}</div>
                        <div className={`text-[9px] font-mono truncate ${isSelected ? 'text-zinc-300' : 'text-zinc-400'}`}>
                          {coinItem.network.split(' ')[0]}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>


            {/* 3. DEPOSIT BOX WITH QR CODE & COPY FIELDS */}
            <div className="p-4 sm:p-5 rounded-2xl bg-zinc-50 border border-zinc-200/80 space-y-4">
              
              {/* QR Code & Scan Instructions */}
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="w-28 h-28 sm:w-32 sm:h-32 p-2 bg-white rounded-xl border border-zinc-200/90 shadow-2xs shrink-0 flex items-center justify-center">
                  <QRCodeSVG
                    value={selectedCoin.address || '0x0'}
                    size={110}
                    level="M"
                    includeMargin={false}
                  />
                </div>

                <div className="space-y-2 flex-1 text-center sm:text-left min-w-0">
                  <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-zinc-200 text-[10px] font-mono text-zinc-600">
                    <Zap className="w-3 h-3 text-amber-500" />
                    <span>{selectedCoin.chainName}</span>
                  </div>

                  <div className="font-mono text-xs font-bold text-zinc-950 break-all leading-snug">
                    {selectedCoin.address}
                  </div>

                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-0.5">
                    <button
                      onClick={() => handleCopyAddress(selectedCoin.address)}
                      className="px-3 py-1.5 rounded-lg bg-white border border-zinc-200 text-xs font-mono font-semibold text-zinc-800 hover:bg-zinc-100 transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
                    >
                      {copiedAddress ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-zinc-400" />}
                      <span>{copiedAddress ? 'Address Copied!' : 'Copy Address'}</span>
                    </button>

                    <a
                      href={selectedCoin.scheme(selectedCoin.address, currentAmount)}
                      className="px-3 py-1.5 rounded-lg bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-mono font-medium transition-colors flex items-center gap-1 shadow-2xs"
                    >
                      <span>Open Wallet</span>
                      <ExternalLink className="w-3 h-3 text-zinc-400" />
                    </a>
                  </div>
                </div>
              </div>

              {/* Exact Amount Send Instruction */}
              <div className="p-3 bg-white rounded-xl border border-zinc-200 flex items-center justify-between gap-3 text-xs font-mono">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="text-zinc-600 text-[11px]">Send Exact:</span>
                  <span className="font-bold text-zinc-950">{currentAmount} {selectedCoin.symbol}</span>
                </div>
                <button
                  onClick={() => handleCopyAmount(currentAmount)}
                  className="px-2.5 py-1 rounded-md bg-zinc-50 border border-zinc-200 text-[11px] font-semibold text-zinc-800 hover:bg-zinc-100 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  {copiedAmount ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-zinc-400" />}
                  <span>{copiedAmount ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

            </div>


            {/* 4. REAL-TIME OBSERVATION RADAR (RAZORPAY STYLE) */}
            <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200/80 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="relative flex h-2.5 w-2.5 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-600"></span>
                </span>
                <div>
                  <div className="text-xs font-semibold text-emerald-950 font-mono leading-none">
                    Listening for On-Chain Transfer...
                  </div>
                  <div className="text-[10px] text-emerald-800 font-sans mt-0.5">
                    Zero-confirmation auto-detection active across multi-RPC nodes.
                  </div>
                </div>
              </div>

              <button
                onClick={checkPaymentStatus}
                className="p-1.5 rounded-lg bg-white border border-emerald-200 text-emerald-900 hover:bg-emerald-50 transition-colors shrink-0 cursor-pointer shadow-2xs"
                title="Scan Mempool Now"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

          </div>
        )}


        {/* ══════════════════════════════════════════════════════════════════
            STATE 2: RAZORPAY-STYLE CELEBRATORY SUCCESS / RECEIPT
            ══════════════════════════════════════════════════════════════════ */}
        {status === 'paid' && (
          <div className="p-6 sm:p-8 space-y-6 text-center">
            
            {/* Celebratory Checkmark Badge */}
            <div className="w-16 h-16 rounded-full bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center mx-auto text-emerald-600 shadow-sm animate-bounce">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div className="space-y-1">
              <h2 className="font-sans text-2xl sm:text-3xl font-bold text-zinc-950 tracking-tight">
                Payment Confirmed &amp; Settled!
              </h2>
              <p className="text-xs sm:text-sm text-zinc-600 font-sans max-w-sm mx-auto">
                On-chain verification completed. Settled directly into merchant cold storage.
              </p>
            </div>

            {/* Itemized On-Chain Receipt Box */}
            <div className="p-4 sm:p-5 rounded-2xl bg-zinc-50 border border-zinc-200 font-mono text-xs space-y-2.5 text-left">
              <div className="flex justify-between items-center pb-2 border-b border-zinc-200/60">
                <span className="text-zinc-500 font-sans">Payment Status:</span>
                <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded-md">
                  <Check className="w-3 h-3 text-emerald-600" />
                  <span>SETTLED (0x1 Success)</span>
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-zinc-500 font-sans">Amount Settled:</span>
                <span className="font-bold text-zinc-950">{txDetails.amount_received} {selectedCoin.symbol}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-zinc-500 font-sans">Network:</span>
                <span className="font-semibold text-zinc-800">{selectedCoin.chainName}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-zinc-500 font-sans">Transaction Hash:</span>
                <a
                  href={selectedCoin.explorerUrl(txDetails.txid)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-700 hover:text-emerald-900 font-bold truncate max-w-[170px] sm:max-w-[220px] flex items-center gap-1 underline"
                >
                  <span className="truncate">{txDetails.txid}</span>
                  <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                </a>
              </div>
            </div>

            {/* Redirect Action / Continue */}
            {redirectUrl ? (
              <div className="space-y-2 pt-2">
                <button
                  onClick={() => window.location.href = redirectUrl}
                  className="w-full py-3.5 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white font-mono text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
                >
                  <span>Continue to {merchantName}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <div className="text-[11px] font-mono text-zinc-400">
                  Redirecting automatically in {redirectCountdown}s...
                </div>
              </div>
            ) : (
              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 text-xs font-mono text-zinc-600">
                You may now safely close this payment window.
              </div>
            )}

          </div>
        )}


        {/* ══════════════════════════════════════════════════════════════════
            STATE 3: INVOICE EXPIRED
            ══════════════════════════════════════════════════════════════════ */}
        {status === 'expired' && (
          <div className="p-6 sm:p-8 space-y-6 text-center">
            <div className="w-16 h-16 rounded-full bg-rose-50 border-2 border-rose-200 flex items-center justify-center mx-auto text-rose-600 shadow-sm">
              <Clock className="w-9 h-9" />
            </div>

            <div className="space-y-1">
              <h2 className="font-sans text-2xl sm:text-3xl font-bold text-zinc-950 tracking-tight">
                Invoice Expired
              </h2>
              <p className="text-xs sm:text-sm text-zinc-600 font-sans max-w-sm mx-auto">
                The 15-minute payment window has elapsed.
              </p>
            </div>

            <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-200 text-xs font-mono text-zinc-600 leading-relaxed text-left">
              To prevent address collisions and exchange-rate drift, payment invoices expire after 15 minutes. Please return to the merchant to generate a fresh invoice.
            </div>

            {redirectUrl && (
              <button
                onClick={() => window.location.href = redirectUrl}
                className="w-full py-3 rounded-xl bg-zinc-950 text-white text-xs font-mono font-bold flex items-center justify-center gap-1.5 shadow-xs hover:bg-zinc-800 transition-colors"
              >
                <span>Return to Storefront</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}


        {/* ══════════════════════════════════════════════════════════════════
            FOOTER: RAZORPAY / STRIPE TRUST & SECURITY BADGE
            ══════════════════════════════════════════════════════════════════ */}
        <div className="px-5 py-3.5 bg-zinc-50 border-t border-zinc-100 flex items-center justify-between text-[11px] font-mono text-zinc-500">
          <div className="flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-emerald-600" />
            <span>100% Non-Custodial Direct Settlement</span>
          </div>
          <span className="font-bold text-zinc-800">ClusterPay Gateway</span>
        </div>

      </div>


      {/* ── SINGLE ATTRIBUTION FOOTER ── */}
      <div className="mt-5 text-center text-xs font-mono text-zinc-400 space-y-1">
        <div>
          Powered by{' '}
          <a href="https://clusterpay.cloud" target="_blank" rel="noreferrer" className="text-zinc-700 font-semibold hover:underline">
            ClusterPay Open Source Protocol
          </a>
        </div>
        <div className="text-[10px] text-zinc-400">
          0% Platform Fee · Direct Cold Storage Settlement
        </div>
      </div>

    </div>
  );
}
