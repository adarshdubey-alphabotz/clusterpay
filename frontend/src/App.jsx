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
  ChevronRight,
  Sparkles,
  Zap,
  Info,
  CheckCircle,
  XCircle,
  Wallet,
  ArrowUpRight
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

  // Base list of options
  const usdtNetworks = [
    {
      id: 'USDT_BEP20',
      networkName: 'BNB Smart Chain',
      badge: 'BSC',
      address: pData.USDT_WALLET_BEP20 || '',
      icon: UsdtIcon,
      networkIcon: BnbIcon,
      calcAmount: () => initialAmount.toFixed(6),
      explorerUrl: (tx) => `https://bscscan.com/tx/${tx}`,
      scheme: (addr, amt) => `ethereum:${addr}?value=0&amount=${amt}`
    },
    {
      id: 'USDT_TRC20',
      networkName: 'TRON Network',
      badge: 'TRON',
      address: pData.USDT_WALLET_TRC20 || '',
      icon: UsdtIcon,
      networkIcon: TrxIcon,
      calcAmount: () => initialAmount.toFixed(6),
      explorerUrl: (tx) => `https://tronscan.org/#/transaction/${tx}`,
      scheme: (addr, amt) => `tron:${addr}?amount=${amt}`
    },
    {
      id: 'USDT_POLY',
      networkName: 'Polygon PoS',
      badge: 'Polygon',
      address: pData.USDT_WALLET_POLY || '',
      icon: UsdtIcon,
      networkIcon: PolygonIcon,
      calcAmount: () => initialAmount.toFixed(6),
      explorerUrl: (tx) => `https://polygonscan.com/tx/${tx}`,
      scheme: (addr, amt) => `ethereum:${addr}?value=0&amount=${amt}`
    },
    {
      id: 'USDT_ARB',
      networkName: 'Arbitrum One',
      badge: 'Arbitrum',
      address: pData.USDT_WALLET_ARBITRUM || '',
      icon: UsdtIcon,
      networkIcon: ArbitrumIcon,
      calcAmount: () => initialAmount.toFixed(6),
      explorerUrl: (tx) => `https://arbiscan.io/tx/${tx}`,
      scheme: (addr, amt) => `ethereum:${addr}?value=0&amount=${amt}`
    }
  ].filter(n => Boolean(n.address));

  const nativeCoins = [
    {
      id: 'TON',
      symbol: 'TON',
      name: 'Toncoin',
      networkName: 'The Open Network',
      badge: 'TON',
      address: pData.TON_WALLET || '',
      icon: TonIcon,
      calcAmount: () => (tonPrice > 0 ? (initialAmount / tonPrice).toFixed(4) : '0.0000'),
      explorerUrl: (tx) => `https://tonscan.org/tx/${tx}`,
      scheme: (addr, amt) => `ton://transfer/${addr}?amount=${Math.round(amt * 1e9)}`
    },
    {
      id: 'BNB',
      symbol: 'BNB',
      name: 'BNB Coin',
      networkName: 'BNB Smart Chain',
      badge: 'BSC',
      address: pData.USDT_WALLET_BEP20 || '',
      icon: BnbIcon,
      calcAmount: () => (bnbPrice > 0 ? (initialAmount / bnbPrice).toFixed(6) : '0.000000'),
      explorerUrl: (tx) => `https://bscscan.com/tx/${tx}`,
      scheme: (addr, amt) => `ethereum:${addr}?value=${amt}`
    },
    {
      id: 'LTC',
      symbol: 'LTC',
      name: 'Litecoin',
      networkName: 'Litecoin Network',
      badge: 'LTC',
      address: pData.LTC_WALLET || '',
      icon: LtcIcon,
      calcAmount: () => (ltcPrice > 0 ? (initialAmount / ltcPrice).toFixed(6) : '0.000000'),
      explorerUrl: (tx) => `https://live.blockcypher.com/ltc/tx/${tx}`,
      scheme: (addr, amt) => `litecoin:${addr}?amount=${amt}`
    },
    {
      id: 'BTC',
      symbol: 'BTC',
      name: 'Bitcoin',
      networkName: 'Bitcoin Network',
      badge: 'BTC',
      address: pData.BTC_WALLET || '',
      icon: BtcIcon,
      calcAmount: () => (btcPrice > 0 ? (initialAmount / btcPrice).toFixed(8) : '0.00000000'),
      explorerUrl: (tx) => `https://mempool.space/tx/${tx}`,
      scheme: (addr, amt) => `bitcoin:${addr}?amount=${amt}`
    }
  ].filter(c => Boolean(c.address));

  // State Management
  const [selectedAsset, setSelectedAsset] = useState(usdtNetworks.length > 0 ? 'USDT' : (nativeCoins[0]?.symbol || 'USDT'));
  const [selectedUsdtNetwork, setSelectedUsdtNetwork] = useState(usdtNetworks[0] || null);
  const [selectedNativeCoin, setSelectedNativeCoin] = useState(nativeCoins[0] || null);

  const activeOption = selectedAsset === 'USDT' ? selectedUsdtNetwork : selectedNativeCoin;

  const [timeLeft, setTimeLeft] = useState(parseInt(pData.time_left || '900', 10) || 900);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [copiedAmount, setCopiedAmount] = useState(false);
  const [status, setStatus] = useState('pending'); // 'pending' | 'paid' | 'expired'
  const [txDetails, setTxDetails] = useState({ txid: '', amount_received: 0, paid_at: '' });
  const [redirectCountdown, setRedirectCountdown] = useState(5);

  // 15-Minute Countdown Timer
  useEffect(() => {
    if (status !== 'pending') return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setStatus('expired');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [status]);

  // Automated Mempool Status Polling (Every 3.5 seconds)
  const checkPaymentStatus = async () => {
    try {
      const res = await fetch(`/api/v1/gateway/status/${sessionId}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.status === 'paid' || data.success) {
        setStatus('paid');
        setTxDetails({
          txid: data.txid || data.tx_hash || '0xOnChainSettled',
          amount_received: data.amount_received || initialAmount,
          paid_at: data.paid_at || new Date().toISOString()
        });
      } else if (data.status === 'expired') {
        setStatus('expired');
      }
    } catch (err) {
      // Background retry
    }
  };

  useEffect(() => {
    if (status !== 'pending') return;
    const interval = setInterval(checkPaymentStatus, 3500);
    return () => clearInterval(interval);
  }, [status, sessionId]);

  // Auto Redirect Countdown on Paid
  useEffect(() => {
    if (status !== 'paid' || !redirectUrl) return;
    const timer = setInterval(() => {
      setRedirectCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          window.location.href = redirectUrl;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [status, redirectUrl]);

  const handleCopyAddress = (addr) => {
    if (!addr) return;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(addr);
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 2000);
    }
  };

  const handleCopyAmount = (amt) => {
    if (!amt) return;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(amt);
      setCopiedAmount(true);
      setTimeout(() => setCopiedAmount(false), 2000);
    }
  };

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const currentExactAmount = activeOption ? activeOption.calcAmount() : initialAmount.toFixed(6);
  const currentSymbol = selectedAsset === 'USDT' ? 'USDT' : activeOption?.symbol || 'CRYPTO';

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-3 sm:p-6 bg-[#F8FAFC] font-sans text-zinc-900 selection:bg-black selection:text-white">
      
      {/* ── MAIN CHECKOUT CONTAINER ── */}
      <div className="w-full max-w-[490px] bg-white rounded-3xl border border-zinc-200/80 shadow-[0_12px_40px_-8px_rgba(0,0,0,0.06)] overflow-hidden transition-all">
        
        {/* ══════════════════════════════════════════════════════════════════
            HEADER: MERCHANT BRANDING & COUNTDOWN
            ══════════════════════════════════════════════════════════════════ */}
        <div className="px-6 py-5 border-b border-zinc-100 flex items-center justify-between">
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
                <h1 className="font-semibold text-sm text-zinc-950 tracking-tight leading-tight">
                  {merchantName}
                </h1>
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-medium border border-emerald-200/60">
                  <CheckCircle className="w-2.5 h-2.5 text-emerald-600" />
                  <span>Verified</span>
                </span>
              </div>
              <div className="text-[11px] text-zinc-400 font-mono mt-0.5">
                {customId ? `Order #${customId}` : `Ref #${sessionId.slice(-8).toUpperCase()}`}
              </div>
            </div>
          </div>

          {/* Clean Countdown Badge */}
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-medium border transition-colors ${
            timeLeft < 180 
              ? 'bg-rose-50 text-rose-700 border-rose-200/80' 
              : 'bg-zinc-50 text-zinc-600 border-zinc-200/80'
          }`}>
            <Clock className="w-3 h-3 text-zinc-400" />
            <span>{formatTimer(timeLeft)}</span>
          </div>
        </div>


        {/* ══════════════════════════════════════════════════════════════════
            STATE 1: ACTIVE PAYMENT CHECKOUT
            ══════════════════════════════════════════════════════════════════ */}
        {status === 'pending' && (
          <div className="p-6 sm:p-7 space-y-6">
            
            {/* 1. ELEGANT AMOUNT HERO */}
            <div className="text-center space-y-1">
              <div className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                Total to Pay
              </div>
              <div className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-950">
                ${initialAmount.toFixed(2)} <span className="text-sm font-normal text-zinc-400">USD</span>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-100 text-zinc-700 font-mono text-xs font-semibold">
                <span>Send Exactly:</span>
                <span className="text-zinc-950 font-bold">{currentExactAmount} {currentSymbol}</span>
              </div>
            </div>


            {/* 2. MODERN CURRENCY SELECTOR TABS */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-medium text-zinc-500">
                <span>Payment Asset</span>
                {activeOption && (
                  <span className="text-zinc-400 text-[11px] font-mono">{activeOption.networkName}</span>
                )}
              </div>

              {/* Primary Asset Pill Tabs */}
              <div className="grid grid-cols-5 gap-1.5 p-1 bg-zinc-100/80 rounded-2xl border border-zinc-200/60">
                {usdtNetworks.length > 0 && (
                  <button
                    onClick={() => setSelectedAsset('USDT')}
                    className={`py-2 px-1 rounded-xl flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                      selectedAsset === 'USDT'
                        ? 'bg-white text-zinc-950 font-semibold shadow-xs'
                        : 'text-zinc-500 hover:text-zinc-900 font-normal'
                    }`}
                  >
                    <UsdtIcon className="w-5 h-5" />
                    <span className="text-[11px] leading-none">USDT</span>
                  </button>
                )}

                {nativeCoins.map((coin) => {
                  const Icon = coin.icon;
                  const isSelected = selectedAsset === coin.symbol;
                  return (
                    <button
                      key={coin.id}
                      onClick={() => {
                        setSelectedAsset(coin.symbol);
                        setSelectedNativeCoin(coin);
                      }}
                      className={`py-2 px-1 rounded-xl flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-white text-zinc-950 font-semibold shadow-xs'
                          : 'text-zinc-500 hover:text-zinc-900 font-normal'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-[11px] leading-none">{coin.symbol}</span>
                    </button>
                  );
                })}
              </div>

              {/* Secondary Sub-Network Selector for USDT */}
              {selectedAsset === 'USDT' && usdtNetworks.length > 1 && (
                <div className="grid grid-cols-4 gap-1.5 pt-1">
                  {usdtNetworks.map((net) => {
                    const isSelected = selectedUsdtNetwork?.id === net.id;
                    const NetIcon = net.networkIcon;
                    return (
                      <button
                        key={net.id}
                        onClick={() => setSelectedUsdtNetwork(net)}
                        className={`py-1.5 px-2 rounded-xl border text-[11px] font-medium transition-all flex items-center justify-center gap-1 cursor-pointer ${
                          isSelected
                            ? 'bg-zinc-950 border-zinc-950 text-white shadow-2xs'
                            : 'bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50'
                        }`}
                      >
                        <NetIcon className="w-3 h-3" />
                        <span>{net.badge}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>


            {/* 3. QR CODE & WALLET ADDRESS CARD */}
            {activeOption && (
              <div className="p-5 rounded-2xl bg-zinc-50/70 border border-zinc-200/80 space-y-4">
                
                {/* Clean QR Code Center */}
                <div className="flex flex-col items-center justify-center pt-1 pb-1">
                  <div className="p-3 bg-white rounded-2xl border border-zinc-200/80 shadow-2xs">
                    <QRCodeSVG 
                      value={activeOption.address}
                      size={168}
                      level="M"
                      includeMargin={false}
                    />
                  </div>
                  <div className="text-[11px] text-zinc-400 font-mono mt-2">
                    Scan with any {activeOption.networkName} wallet
                  </div>
                </div>

                {/* Address Bar with Embedded Copy */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-zinc-500 flex items-center justify-between">
                    <span>Deposit Address</span>
                    <span className="text-[10px] font-mono text-zinc-400">{activeOption.badge || activeOption.networkName}</span>
                  </label>

                  <div className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-zinc-200 shadow-2xs">
                    <div className="font-mono text-xs font-medium text-zinc-900 truncate pr-2">
                      {activeOption.address}
                    </div>
                    <button
                      onClick={() => handleCopyAddress(activeOption.address)}
                      className="px-3 py-1 rounded-lg bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-mono font-medium transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
                    >
                      {copiedAddress ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedAddress ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>

                {/* Amount Copy Row + Deeplink Button */}
                <div className="flex items-center gap-2 pt-1">
                  <div className="flex-1 flex items-center justify-between p-2.5 bg-white rounded-xl border border-zinc-200 shadow-2xs">
                    <div className="text-xs font-mono text-zinc-600">
                      <span className="text-zinc-400 text-[11px]">Exact: </span>
                      <span className="font-bold text-zinc-950">{currentExactAmount} {currentSymbol}</span>
                    </div>
                    <button
                      onClick={() => handleCopyAmount(currentExactAmount)}
                      className="text-xs font-mono font-semibold text-zinc-700 hover:text-zinc-950 transition-colors flex items-center gap-1 cursor-pointer pl-2"
                    >
                      {copiedAmount ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-zinc-400" />}
                      <span>{copiedAmount ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>

                  <a
                    href={activeOption.scheme(activeOption.address, currentExactAmount)}
                    className="p-2.5 px-3.5 rounded-xl bg-white border border-zinc-200 hover:bg-zinc-100 text-zinc-800 text-xs font-medium transition-colors flex items-center gap-1 shadow-2xs cursor-pointer"
                  >
                    <span>Open Wallet</span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-zinc-400" />
                  </a>
                </div>

              </div>
            )}


            {/* 4. REAL-TIME MULTI-RPC RADAR STATUS */}
            <div className="p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200/80 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="relative flex h-2.5 w-2.5 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <div>
                  <div className="text-xs font-medium text-zinc-900 leading-tight">
                    Listening to blockchain mempool...
                  </div>
                  <div className="text-[11px] text-zinc-400 mt-0.5">
                    Zero-confirmation auto-settlement active
                  </div>
                </div>
              </div>

              <button
                onClick={checkPaymentStatus}
                className="p-1.5 rounded-lg bg-white border border-zinc-200 text-zinc-500 hover:text-zinc-950 transition-colors shrink-0 cursor-pointer shadow-2xs"
                title="Refresh Mempool"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

          </div>
        )}


        {/* ══════════════════════════════════════════════════════════════════
            STATE 2: CELEBRATORY SUCCESS & RECEIPT
            ══════════════════════════════════════════════════════════════════ */}
        {status === 'paid' && (
          <div className="p-7 sm:p-9 text-center space-y-6">
            
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto shadow-sm animate-bounce">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div className="space-y-1">
              <h2 className="text-2xl font-bold text-zinc-950 tracking-tight">
                Payment Settled!
              </h2>
              <p className="text-xs text-zinc-500">
                Zero-confirmation transaction verified on-chain.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-zinc-50 border border-zinc-200 text-left space-y-3 font-mono text-xs">
              <div className="flex justify-between border-b border-zinc-200/60 pb-2">
                <span className="text-zinc-500">Merchant</span>
                <span className="font-semibold text-zinc-900">{merchantName}</span>
              </div>
              <div className="flex justify-between border-b border-zinc-200/60 pb-2">
                <span className="text-zinc-500">Amount Paid</span>
                <span className="font-bold text-emerald-600">${initialAmount.toFixed(2)} USD</span>
              </div>
              <div className="flex justify-between border-b border-zinc-200/60 pb-2">
                <span className="text-zinc-500">Asset</span>
                <span className="font-semibold text-zinc-900">{activeOption?.networkName || selectedAsset}</span>
              </div>
              <div className="flex justify-between items-center pt-1">
                <span className="text-zinc-500">Tx Hash</span>
                {txDetails.txid && activeOption?.explorerUrl ? (
                  <a 
                    href={activeOption.explorerUrl(txDetails.txid)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
                  >
                    <span>{txDetails.txid.slice(0, 8)}...{txDetails.txid.slice(-6)}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                ) : (
                  <span className="text-zinc-700">Verified</span>
                )}
              </div>
            </div>

            {redirectUrl ? (
              <a
                href={redirectUrl}
                className="w-full py-3.5 px-4 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white font-medium text-xs transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer"
              >
                <span>Return to Merchant ({redirectCountdown}s)</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            ) : (
              <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-medium border border-emerald-200/60">
                You may now safely close this window.
              </div>
            )}

          </div>
        )}


        {/* ══════════════════════════════════════════════════════════════════
            STATE 3: EXPIRED INVOICE
            ══════════════════════════════════════════════════════════════════ */}
        {status === 'expired' && (
          <div className="p-8 text-center space-y-5">
            <div className="w-14 h-14 rounded-full bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center mx-auto">
              <XCircle className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-zinc-950">Invoice Expired</h2>
              <p className="text-xs text-zinc-500 max-w-xs mx-auto">
                The 15-minute payment window has elapsed. Please request a new checkout link from the merchant.
              </p>
            </div>
            {merchantUrl && (
              <a
                href={merchantUrl}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-950 text-white text-xs font-medium"
              >
                <span>Return to Store</span>
                <ArrowRight className="w-3 h-3" />
              </a>
            )}
          </div>
        )}


        {/* ══════════════════════════════════════════════════════════════════
            FOOTER: NON-CUSTODIAL COMPLIANCE & BRANDING
            ══════════════════════════════════════════════════════════════════ */}
        <div className="px-6 py-3.5 bg-zinc-50 border-t border-zinc-100 flex items-center justify-between text-[11px] text-zinc-500">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Non-Custodial Direct Settlement</span>
          </div>
          <div className="font-mono text-[10px] text-zinc-400">
            ClusterPay Gateway
          </div>
        </div>

      </div>

      {/* Subtle Bottom Credit */}
      <div className="mt-4 text-center text-[11px] text-zinc-400 space-y-0.5">
        <div>Powered by <span className="font-medium text-zinc-600">ClusterPay Open Source Protocol</span></div>
        <div className="text-[10px] text-zinc-400">0% Platform Fee • Direct Cold Storage Settlement</div>
      </div>

    </div>
  );
}
