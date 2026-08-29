import React, { useState, useEffect } from 'react';
import { 
  Copy, 
  ChevronRight, 
  ChevronDown,
  ChevronUp,
  ArrowLeft, 
  X, 
  Download, 
  XCircle, 
  Check, 
  ExternalLink,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  ArrowUpRight,
  User,
  Zap,
  QrCode,
  Wallet,
  Globe,
  Sun,
  Moon,
  Search,
  Lock,
  Home,
  MoreVertical
} from 'lucide-react';
import { LANGUAGES, getTranslation } from './i18n';
import { QRCodeSVG } from 'qrcode.react';
import StoreApp from './StoreApp';
import { 
  ClusterPayIcon,
  UsdtIcon, 
  UsdtTrc20Icon,
  UsdtPolyIcon,
  UsdtArbIcon,
  UsdtBep20Icon,
  BnbIcon, 
  TrxIcon, 
  PolygonIcon, 
  TonIcon, 
  ArbitrumIcon, 
  BtcIcon, 
  LtcIcon,
  BscBadge,
  TronBadge,
  PolygonBadge,
  TonBadge,
  LtcBadge,
  BtcBadge,
  ArbBadge,
  QrCode3DIcon,
  Crystal3DIcon,
  PaperReceiptGraphic,
  Shield3DIcon,
  Spinning3DCoin
} from './CoinIcons';

export default function App() {
  if (window.location.pathname.includes("/store")) {
    return <StoreApp />;
  }

  const pData = window.paymentData || {};
  const rawAmt = pData.amount && pData.amount !== "{amount}" ? pData.amount : '10.004829';
  const initialAmount = parseFloat(rawAmt) || 10.004829;
  const sessionId = pData.session_id && pData.session_id !== "{session_id}" ? pData.session_id : 'cpay_demo_session';
  const merchantName = pData.merchant_name && pData.merchant_name !== "{merchant_name}" ? pData.merchant_name : 'ClusterPay Merchant';
  const merchantUrl = pData.merchant_url && pData.merchant_url !== "{merchant_url}" ? pData.merchant_url : '';
  const logoUrl = pData.logo_url && pData.logo_url !== "{logo_url}" && pData.logo_url !== "None" ? pData.logo_url : '';
  const redirectUrl = pData.redirect_url && pData.redirect_url !== "{redirect_url}" ? pData.redirect_url : '';
  const customId = pData.custom_id && pData.custom_id !== "{custom_id}" ? pData.custom_id : '';
  const paymentPurpose = pData.description || pData.purpose || 'Wallet credit / merchant order';
  const isEmbed = pData.embed === 'true';

  // Custom customer metadata and notes
  const requireEmail = pData.require_email === 'true';
  const requireBuyerName = pData.require_buyer_name === 'true';
  const initialCustomerEmail = pData.customer_email || '';
  const initialCustomerName = pData.customer_name || '';
  const customNote = pData.custom_note || '';

  const [customerEmail, setCustomerEmail] = useState(initialCustomerEmail);
  const [customerName, setCustomerName] = useState(initialCustomerName);

  // Live or injected price feeds
  const bnbPrice = parseFloat(pData.bnb_price || '600') || 600;
  const ltcPrice = parseFloat(pData.ltc_price || '85') || 85;
  const tonPrice = parseFloat(pData.ton_price || '5.5') || 5.5;
  const polPrice = parseFloat(pData.pol_price || '0.45') || 0.45;
  const btcPrice = parseFloat(pData.btc_price || '90000') || 90000;

  // Real Supported Coins and Networks in ClusterPay
  const allCoins = {
    USDT_BEP20: {
      id: 'USDT_BEP20',
      key: 'USDT_BEP20',
      symbol: 'USDT',
      name: 'USDT (BEP-20)',
      shortName: 'USDT - BEP-20',
      network: 'Binance Smart Chain',
      badge: 'BSC',
      description: 'Binance Smart Chain (0% Surcharge)',
      address: pData.USDT_WALLET_BEP20 || '',
      icon: UsdtBep20Icon,
      netBadge: <BscBadge size={16} />,
      speed: 'Instant',
      fees: '0.1-0.3%',
      type: 'Crypto',
      recommended: true,
      calcAmount: () => initialAmount.toFixed(6),
      explorerUrl: (tx) => `https://bscscan.com/tx/${tx}`,
      scheme: (addr, amt) => `ethereum:${addr}?value=0&amount=${amt}`,
      qrPayload: (addr, amt) => `ethereum:pay-0x55d398326f99059fF775485246999027B3197955@56/transfer?address=${addr}&uint256=${toBaseUnits(amt, 18)}`
    },
    TON: {
      id: 'TON',
      key: 'TON',
      symbol: 'TON',
      name: 'Toncoin (TON)',
      shortName: 'Toncoin (TON)',
      network: 'The Open Network',
      badge: 'TON',
      description: 'The Open Network Native Transfer',
      address: pData.TON_WALLET || '',
      icon: TonIcon,
      netBadge: <TonBadge size={16} />,
      speed: 'Instant',
      fees: 'Micro Fee',
      type: 'Crypto',
      recommended: true,
      calcAmount: () => (tonPrice > 0 ? (initialAmount / tonPrice).toFixed(4) : '0.0000'),
      explorerUrl: (tx) => `https://tonscan.org/tx/${tx}`,
      scheme: (addr, amt) => `ton://transfer/${addr}?amount=${Math.round(amt * 1e9)}`,
      qrPayload: (addr, amt) => `ton://transfer/${addr}?amount=${toBaseUnits(amt, 9)}`
    },
    USDT_TRC20: {
      id: 'USDT_TRC20',
      key: 'USDT_TRC20',
      symbol: 'USDT',
      name: 'USDT (TRC-20)',
      shortName: 'USDT - TRON',
      network: 'TRON Network',
      badge: 'TRON',
      description: 'Tron Network Instant Transfer',
      address: pData.USDT_WALLET_TRC20 || '',
      icon: UsdtTrc20Icon,
      netBadge: <TronBadge size={16} />,
      speed: 'Instant',
      fees: 'Network Fee',
      type: 'Crypto',
      calcAmount: () => initialAmount.toFixed(6),
      explorerUrl: (tx) => `https://tronscan.org/#/transaction/${tx}`,
      scheme: (addr, amt) => `tron:${addr}?amount=${amt}`,
      qrPayload: (addr, amt) => `tron:${addr}?amount=${amt}`
    },
    USDT_POLY: {
      id: 'USDT_POLY',
      key: 'USDT_POLY',
      symbol: 'USDT',
      name: 'USDT (Polygon)',
      shortName: 'USDT - Polygon',
      network: 'Polygon PoS',
      badge: 'Polygon',
      description: 'Polygon Proof of Stake (Near-Zero Fee)',
      address: pData.USDT_WALLET_POLY || '',
      icon: UsdtPolyIcon,
      netBadge: <PolygonBadge size={16} />,
      speed: 'Instant',
      fees: 'Near-Zero',
      type: 'Crypto',
      calcAmount: () => initialAmount.toFixed(6),
      explorerUrl: (tx) => `https://polygonscan.com/tx/${tx}`,
      scheme: (addr, amt) => `ethereum:${addr}?value=0&amount=${amt}`,
      qrPayload: (addr, amt) => `ethereum:pay-0xc2132D05D31c914a87C6611C10748AEb04B58e8F@137/transfer?address=${addr}&uint256=${toBaseUnits(amt, 6)}`
    },
    USDT_ARB: {
      id: 'USDT_ARB',
      key: 'USDT_ARB',
      symbol: 'USDT',
      name: 'USDT (Arbitrum)',
      shortName: 'USDT - Arbitrum',
      network: 'Arbitrum One',
      badge: 'Arbitrum',
      description: 'Arbitrum Layer 2 Instant Transfer',
      address: pData.USDT_WALLET_ARBITRUM || '',
      icon: UsdtArbIcon,
      netBadge: <ArbBadge size={16} />,
      speed: 'Instant',
      fees: 'Low L2 Fee',
      type: 'Crypto',
      calcAmount: () => initialAmount.toFixed(6),
      explorerUrl: (tx) => `https://arbiscan.io/tx/${tx}`,
      scheme: (addr, amt) => `ethereum:${addr}?value=0&amount=${amt}`,
      qrPayload: (addr, amt) => `ethereum:pay-0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9@42161/transfer?address=${addr}&uint256=${toBaseUnits(amt, 6)}`
    },
    LTC: {
      id: 'LTC',
      key: 'LTC',
      symbol: 'LTC',
      name: 'Litecoin (LTC)',
      shortName: 'Litecoin',
      network: 'Litecoin Network',
      badge: 'LTC',
      description: 'Litecoin Blockchain Direct Transfer',
      address: pData.LTC_WALLET || '',
      icon: LtcIcon,
      netBadge: <LtcBadge size={16} />,
      speed: 'Instant',
      fees: 'Micro Fee',
      type: 'Crypto',
      calcAmount: () => (ltcPrice > 0 ? (initialAmount / ltcPrice).toFixed(6) : '0.000000'),
      explorerUrl: (tx) => `https://live.blockcypher.com/ltc/tx/${tx}`,
      scheme: (addr, amt) => `litecoin:${addr}?amount=${amt}`,
      qrPayload: (addr, amt) => `litecoin:${addr}?amount=${amt}`
    },
    BTC: {
      id: 'BTC',
      key: 'BTC',
      symbol: 'BTC',
      name: 'Bitcoin (BTC)',
      shortName: 'Bitcoin',
      network: 'Bitcoin Network',
      badge: 'BTC',
      description: 'Bitcoin Core Network Transfer',
      address: pData.BTC_WALLET || '',
      icon: BtcIcon,
      netBadge: <BtcBadge size={16} />,
      speed: 'Fast (Mempool)',
      fees: 'Standard Fee',
      type: 'Crypto',
      calcAmount: () => (btcPrice > 0 ? (initialAmount / btcPrice).toFixed(8) : '0.00000000'),
      explorerUrl: (tx) => `https://mempool.space/tx/${tx}`,
      scheme: (addr, amt) => `bitcoin:${addr}?amount=${amt}`,
      qrPayload: (addr, amt) => `bitcoin:${addr}?amount=${amt}`
    },
    BNB: {
      id: 'BNB',
      key: 'BNB',
      symbol: 'BNB',
      name: 'BNB Coin (BSC)',
      shortName: 'BNB Coin',
      network: 'BNB Smart Chain',
      badge: 'BSC',
      description: 'Binance Smart Chain Native Coin',
      address: pData.USDT_WALLET_BEP20 || '',
      icon: BnbIcon,
      netBadge: <BscBadge size={16} />,
      speed: 'Instant',
      fees: '0.1-0.2%',
      type: 'Crypto',
      calcAmount: () => (bnbPrice > 0 ? (initialAmount / bnbPrice).toFixed(6) : '0.000000'),
      explorerUrl: (tx) => `https://bscscan.com/tx/${tx}`,
      scheme: (addr, amt) => `ethereum:${addr}?value=${amt}`,
      qrPayload: (addr, amt) => `ethereum:pay-${addr}@56?value=${toBaseUnits(amt, 18)}`
    },
    POL: {
      id: 'POL',
      key: 'POL',
      symbol: 'POL',
      name: 'Polygon (POL)',
      shortName: 'Polygon (POL)',
      network: 'Polygon PoS',
      badge: 'Polygon',
      description: 'Polygon Native Coin Transfer',
      address: pData.POL_WALLET || pData.USDT_WALLET_POLY || '',
      icon: PolygonIcon,
      netBadge: <PolygonBadge size={16} />,
      speed: 'Instant',
      fees: 'Micro Fee',
      type: 'Crypto',
      calcAmount: () => (polPrice > 0 ? (initialAmount / polPrice).toFixed(4) : '0.0000'),
      explorerUrl: (tx) => `https://polygonscan.com/tx/${tx}`,
      scheme: (addr, amt) => `ethereum:${addr}?value=${amt}`,
      qrPayload: (addr, amt) => `ethereum:pay-${addr}@137?value=${toBaseUnits(amt, 18)}`
    }
  };

  // Filter coins to configured wallets
  const availableCoins = Object.values(allCoins).filter(c => Boolean(c.address && c.address.trim().length > 6));
  const displayCoins = availableCoins.length > 0 ? availableCoins : Object.values(allCoins);

  // Flow State Machine
  // Steps: 'select_option' | 'choose_method' | 'payment_details' | 'confirming' | 'success' | 'underpayment' | 'expired'
  const [step, setStep] = useState('select_option');
  const [selectedCoin, setSelectedCoin] = useState(displayCoins[0] || null);
  const [selectedSubMethod, setSelectedSubMethod] = useState('qr'); // 'qr' | 'address'
  const [showDetailsDrawer, setShowDetailsDrawer] = useState(false);
  
  const [timeLeft, setTimeLeft] = useState(parseInt(pData.time_left || '900', 10) || 900);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [copiedAmount, setCopiedAmount] = useState(false);
  const [txDetails, setTxDetails] = useState({ txid: '', amount_received: 0, paid_at: '' });
  const [verifyingStatus, setVerifyingStatus] = useState('Detecting transfer on blockchain mempool...');
  const [underpaidInfo, setUnderpaidInfo] = useState(null);
  const [orderTime, setOrderTime] = useState('');
  const [redirectCountdown, setRedirectCountdown] = useState(5);
  const [manualTxId, setManualTxId] = useState('');
  const [isVerifyingManual, setIsVerifyingManual] = useState(false);
  const [verifyError, setVerifyError] = useState('');

  // 🌐 Multilingual & ☀️/🌙 Theme Switcher State
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem('cpay_theme') || 'dark'; } catch(e) { return 'dark'; }
  });
  const [currentLang, setCurrentLang] = useState(() => {
    try { return localStorage.getItem('cpay_lang') || 'en'; } catch(e) { return 'en'; }
  });
  const [showLangDrawer, setShowLangDrawer] = useState(false);
  const [searchLangQuery, setSearchLangQuery] = useState('');
  const t = (key) => getTranslation(currentLang, key);

  useEffect(() => {
    if (theme === 'light') {
      document.body.classList.add('theme-light');
    } else {
      document.body.classList.remove('theme-light');
    }
  }, [theme]);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    try { localStorage.setItem('cpay_theme', nextTheme); } catch(e) {}
  };

  const handleManualVerify = async (txToVerify) => {
    const tx = (txToVerify || manualTxId || '').trim();
    if (!tx || tx.length < 8) {
      setVerifyError('Please enter a valid Transaction Hash / TxID');
      return;
    }
    setIsVerifyingManual(true);
    setVerifyError('');
    setVerifyingStatus('Verifying transaction hash on-chain...');

    try {
      const res = await fetch('/api/v1/gateway/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          coin: selectedCoin?.id || 'USDT_BEP20',
          txid: tx
        })
      });
      const data = await res.json();
      if (res.ok && (data.success || data.status === 'paid')) {
        setTxDetails({
          txid: data.tx_hash || tx,
          amount_received: data.amount_received || initialAmount,
          paid_at: new Date().toISOString()
        });
        setStep('success');
        handleSuccessRedirect();
      } else {
        setVerifyError(data.detail || data.message || 'Transaction could not be verified on-chain yet. Please ensure the payment is confirmed.');
      }
    } catch (err) {
      setVerifyError('Network error connecting to verification gateway. Please retry.');
    } finally {
      setIsVerifyingManual(false);
    }
  };

  useEffect(() => {
    document.body.classList.add('checkout-body');
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())} ${now.getHours() >= 12 ? 'PM' : 'AM'}, ${now.getDate()} ${months[now.getMonth()]}, ${now.getFullYear()}`;
    setOrderTime(timeStr);
    return () => document.body.classList.remove('checkout-body');
  }, []);

  // 15-Minute Countdown Timer
  useEffect(() => {
    if (step === 'success' || step === 'expired') return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setStep('expired');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [step]);

  // Iframe Auto-Resize
  useEffect(() => {
    if (isEmbed || window.parent !== window) {
      const handleResize = () => {
        const height = document.documentElement.scrollHeight || document.body.scrollHeight;
        window.parent.postMessage({ type: 'clusterpay:resize', height: height }, '*');
      };
      const timeoutId = setTimeout(handleResize, 100);
      window.addEventListener('resize', handleResize);
      return () => {
        clearTimeout(timeoutId);
        window.removeEventListener('resize', handleResize);
      };
    }
  }, [step, selectedSubMethod, selectedCoin, showDetailsDrawer]);

  // Automated Mempool Status Polling (ONLY marks success when status is STRICTLY 'paid')
  const checkPaymentStatus = async () => {
    if (!sessionId || sessionId === 'cpay_demo_session' || step === 'success') return false;
    try {
      const res = await fetch(`/api/v1/gateway/status/${sessionId}`);
      if (!res.ok) return false;
      const data = await res.json();
      
      // CRITICAL FIX: Only trigger success when status === 'paid' (NOT data.success)
      if (data.status === 'paid') {
        setTxDetails({
          txid: data.txid || data.tx_hash || '0xOnChainSettled',
          amount_received: data.amount_received || initialAmount,
          paid_at: data.paid_at || new Date().toISOString()
        });
        setStep('success');
        handleSuccessRedirect();
        return true;
      } else if (data.status === 'expired') {
        setStep('expired');
      } else if (data.status === 'underpayment' || (data.message && data.message.toLowerCase().includes("underpayment"))) {
        setStep('underpayment');
        setUnderpaidInfo({
          expected: initialAmount,
          received: parseFloat(data.amount_received || 0.0)
        });
      }
    } catch (err) {
      // background retry
    }
    return false;
  };

  useEffect(() => {
    if (step === 'success' || step === 'expired') return;
    const interval = setInterval(checkPaymentStatus, 4000);
    return () => clearInterval(interval);
  }, [step, sessionId]);

  // Auto Redirect Countdown on Paid
  useEffect(() => {
    if (step !== 'success' || !redirectUrl) return;
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
  }, [step, redirectUrl]);

  const handleSuccessRedirect = () => {
    if (isEmbed || window.parent !== window) {
      window.parent.postMessage({
        type: 'clusterpay:success',
        session_id: sessionId,
        custom_id: customId
      }, '*');
    }

    if (redirectUrl) {
      const separator = redirectUrl.includes('?') ? '&' : '?';
      const target = `${redirectUrl}${separator}session_id=${encodeURIComponent(sessionId)}&custom_id=${encodeURIComponent(customId)}&status=paid`;
      setTimeout(() => {
        window.location.href = target;
      }, 4000);
    }
  };

  const handlePaidClick = async () => {
    setStep('confirming');
    setVerifyingStatus('Scanning blockchain network for your transfer...');
    
    const verified = await checkPaymentStatus();
    if (verified) return;

    let pollCount = 0;
    const interval = setInterval(async () => {
      pollCount++;
      if (pollCount % 3 === 1) {
        setVerifyingStatus('Scanning mempool and recent blocks...');
      } else if (pollCount % 3 === 2) {
        setVerifyingStatus('Matching exact deposit micro-offset on-chain...');
      } else {
        setVerifyingStatus('Checking zero-confirmation settlement...');
      }

      const done = await checkPaymentStatus();
      if (done || pollCount >= 60 || step === 'underpayment' || step === 'expired') {
        clearInterval(interval);
      }
    }, 2800);
  };

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

  const toBaseUnits = (value, decimals) => {
    try {
      const [whole = '0', fraction = ''] = String(value).split('.');
      const padded = (fraction + '0'.repeat(decimals)).slice(0, decimals);
      return (BigInt(whole || '0') * (10n ** BigInt(decimals)) + BigInt(padded || '0')).toString();
    } catch {
      return '0';
    }
  };

  const getDeepLink = (wallet) => {
    if (!selectedCoin) return '#';
    const address = selectedCoin.address;
    const amountStr = selectedCoin.calcAmount();
    if (wallet === 'trust') {
      if (selectedCoin.key === 'BNB') return `https://link.trustwallet.com/send?asset=c20000714&address=${address}&amount=${amountStr}`;
      if (selectedCoin.key === 'LTC') return `https://link.trustwallet.com/send?asset=c2&address=${address}&amount=${amountStr}`;
      if (selectedCoin.key === 'BTC') return `https://link.trustwallet.com/send?asset=c0&address=${address}&amount=${amountStr}`;
      if (selectedCoin.key === 'TON') return `https://link.trustwallet.com/send?asset=c607&address=${address}&amount=${amountStr}`;
      return `https://link.trustwallet.com/send?asset=c20000714_t0x55d398326f99059fF775485246999027B3197955&address=${address}&amount=${amountStr}`;
    }
    if (wallet === 'metamask') {
      const chainId = ['POL', 'USDT_POLY'].includes(selectedCoin.key) ? '137' : (selectedCoin.key === 'USDT_ARB' ? '42161' : '56');
      return `https://metamask.app.link/send/${address}@${chainId}?value=${amountStr}`;
    }
    if (wallet === 'safepal') return `safepal://send?address=${address}&amount=${amountStr}`;
    return '#';
  };

  const currentExactAmount = selectedCoin ? selectedCoin.calcAmount() : initialAmount.toFixed(6);
  const currentSymbol = selectedCoin ? selectedCoin.symbol : 'USDT';
  const qrPayload = selectedCoin ? selectedCoin.qrPayload(selectedCoin.address, currentExactAmount) : '';
  const invoiceId = customId ? `CPAY-${customId.toUpperCase()}` : `CPAY-${sessionId.slice(-8).toUpperCase()}`;

  const stableCoins = displayCoins.filter(c => c.symbol === 'USDT');
  const nativeCoins = displayCoins.filter(c => c.symbol !== 'USDT');
  const [activeTab, setActiveTab] = useState('quick'); // 'quick' | 'stable' | 'native'

  return (
    <div className={`rzp-wrapper ${isEmbed ? 'embedded' : ''} ${theme === 'light' ? 'theme-light' : ''}`}>

      {/* Top Browser Bar (URL Pill, Language Selector, Dark/Light Mode) */}
      <div className="cf-top-browser-bar">
        <div className="flex items-center gap-2">
          <button className="cf-top-icon-btn" title="ClusterPay Non-Custodial">
            <Home size={15} />
          </button>
        </div>
        
        <div className="cf-url-pill">
          <Lock size={11} className="text-emerald-400" />
          <span>clusterpay.cloud</span>
        </div>

        <div className="flex items-center gap-1.5">
          <button 
            className="cf-top-icon-btn" 
            onClick={() => setShowLangDrawer(true)} 
            title={t('select_language')}
          >
            <Globe size={15} />
          </button>

          <button 
            className="cf-top-icon-btn" 
            onClick={toggleTheme} 
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          >
            {theme === 'dark' ? <Sun size={15} className="text-amber-400" /> : <Moon size={15} className="text-indigo-600" />}
          </button>

          <button className="cf-top-icon-btn" title="Options">
            <MoreVertical size={15} />
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          PAGE 1: CASHFREE / DIGITAL HUB FINTECH SCREEN (REF_IMG2.JPG)
          ══════════════════════════════════════════════════════════════════ */}
      {step === 'select_option' && (
        <div className="cf-screen">
          
          {/* Top Dark Header Card (Exact Ref 2) */}
          <div className="cf-header">
            <div className="cf-header-top">
              <div className="cf-back-placeholder">
                <ClusterPayIcon className="w-5 h-5" />
              </div>
              <div className="cf-secured-badge">
                <span>{t('secured_by')}</span>
                <strong className="text-white flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  ClusterPay
                </strong>
              </div>
            </div>

            {/* Merchant Avatar & Title */}
            <div className="cf-merchant-hero">
              {logoUrl ? (
                <img 
                  src={logoUrl} 
                  alt="" 
                  className="cf-merchant-avatar" 
                  onError={(e) => { e.target.onerror = null; e.target.src = "/assets/clusterpay-icon.png"; }} 
                />
              ) : (
                <ClusterPayIcon className="cf-merchant-avatar" />
              )}
              <h1 className="cf-merchant-name">{merchantName}</h1>
            </div>

            {/* Amount Pill (Dropdown Trigger) */}
            <button 
              className="cf-amount-pill"
              onClick={() => setShowDetailsDrawer(!showDetailsDrawer)}
            >
              <span>${initialAmount.toFixed(2)} USD</span>
              {showDetailsDrawer ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>

          {/* Subheader: Order Meta */}
          <div className="cf-subbar">
            <span className="cf-subbar-text">
              {t('payment_options_for')} <b className="text-zinc-100">{customId ? `Ref #${customId}` : `Inv #${sessionId.slice(-8).toUpperCase()}`}</b>
            </span>
            <button 
              className="cf-edit-btn font-mono"
              onClick={() => setShowDetailsDrawer(true)}
            >
              <Clock size={11} className="inline mr-1" />
              {formatTimer(timeLeft)}
            </button>
          </div>

          {/* Main Body */}
          <div className="cf-body">
            
            {/* Zero Fee & Anti-Theft Protection Promo Card */}
            <div className="cf-offer-card">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-950/20 text-emerald-600 flex items-center justify-center font-bold text-sm">
                  ⚡
                </div>
                <div>
                  <div className="font-bold text-xs text-white">{t('surcharge_applied')}</div>
                  <div className="text-[11px] text-zinc-500">{t('surcharge_desc')}</div>
                </div>
              </div>
              <span className="cf-apply-badge">{t('applied')}</span>
            </div>

            {/* Horizontal Swipeable Carousel (Like Cashfree UPI Row) */}
            <div className="cf-section-header">
              <span className="cf-section-title">{t('select_coin')}</span>
              <span className="text-[11px] text-blue-600 font-semibold flex items-center gap-0.5">
                {t('swipe_choose')}
              </span>
            </div>

            <div className="cf-carousel-wrap">
              <div className="cf-carousel-track">
                {displayCoins.map((c) => {
                  const Icon = c.icon;
                  const isSelected = (selectedCoin?.id === c.id) || (!selectedCoin && c.id === 'USDT_BEP20');
                  const calcAmt = c.calcAmount();
                  return (
                    <div 
                      key={c.id} 
                      className={`cf-carousel-card ${isSelected ? 'selected' : ''}`}
                      onClick={() => setSelectedCoin(c)}
                    >
                      <div className="cf-carousel-icon-box">
                        <Icon className="w-9 h-9" />
                      </div>
                      <span className="cf-carousel-name">{c.symbol}</span>
                      <span className="cf-carousel-badge">{c.badge}</span>
                      <span className="cf-carousel-amount">{calcAmt}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Active Selected Coin Quick Action Panel */}
            {selectedCoin && (
              <div className="cf-active-panel">
                <div className="cf-active-top">
                  <div className="flex items-center gap-3">
                    <selectedCoin.icon className="w-10 h-10 shrink-0" />
                    <div>
                      <h3 className="font-bold text-sm text-white">{selectedCoin.name}</h3>
                      <p className="text-xs text-zinc-500 font-mono">
                        {t('send')}: <b className="text-white">{selectedCoin.calcAmount()} {selectedCoin.symbol}</b> (${initialAmount.toFixed(2)} USD)
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold bg-emerald-950/20 text-emerald-700 border border-emerald-800/40 px-2 py-0.5 rounded-full">
                    {selectedCoin.fees}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/[0.06]">
                  <button 
                    className="cf-btn-primary"
                    onClick={() => {
                      setSelectedSubMethod('qr');
                      setStep('payment_details');
                    }}
                  >
                    <QrCode size={15} />
                    <span>{t('scan_qr')}</span>
                  </button>

                  <button 
                    className="cf-btn-secondary"
                    onClick={() => {
                      setSelectedSubMethod('address');
                      setStep('payment_details');
                    }}
                  >
                    <Copy size={15} />
                    <span>{t('copy_address')}</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Expandable Invoice Details Popup Drawer */}
          {showDetailsDrawer && (
            <div className="rzp-drawer-overlay" onClick={() => setShowDetailsDrawer(false)}>
              <div className="rzp-drawer-card max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center pb-2 border-b border-white/[0.06]">
                  <h3 className="font-bold text-sm text-white">{t('order_summary')}</h3>
                  <button onClick={() => setShowDetailsDrawer(false)} className="text-zinc-400 hover:text-zinc-300 cursor-pointer">
                    <X size={16} />
                  </button>
                </div>
                <div className="space-y-2 py-3 text-xs font-mono">
                  <div className="flex justify-between text-zinc-500">
                    <span>{t('merchant')}</span>
                    <span className="font-bold text-white">{merchantName}</span>
                  </div>
                  <div className="flex justify-between text-zinc-500">
                    <span>{t('purpose')}</span>
                    <span className="text-white">{paymentPurpose}</span>
                  </div>
                  <div className="flex justify-between text-zinc-500">
                    <span>{t('invoice_ref')}</span>
                    <span className="font-bold text-white">{invoiceId}</span>
                  </div>
                  <div className="flex justify-between text-zinc-500">
                    <span>{t('base_amount')}</span>
                    <span className="text-white">${initialAmount.toFixed(2)} USD</span>
                  </div>
                  <div className="flex justify-between text-zinc-500">
                    <span>{t('gateway_fee')}</span>
                    <span className="font-bold text-emerald-600">$0.00 (0%)</span>
                  </div>
                  {customerName && (
                    <div className="flex justify-between text-zinc-500">
                      <span>{t('buyer_name')}</span>
                      <span className="text-white font-semibold">{customerName}</span>
                    </div>
                  )}
                  {customerEmail && (
                    <div className="flex justify-between text-zinc-500">
                      <span>{t('customer_email')}</span>
                      <span className="text-white">{customerEmail}</span>
                    </div>
                  )}
                  {customNote && (
                    <div className="flex justify-between text-zinc-500">
                      <span>{t('custom_note')}</span>
                      <span className="text-white italic max-w-[200px] text-right truncate">{customNote}</span>
                    </div>
                  )}
                </div>
                <div className="pt-2 border-t border-white/[0.06] flex justify-between items-center text-sm font-bold text-white">
                  <span>{t('total_payable')}</span>
                  <span>${initialAmount.toFixed(2)} USD</span>
                </div>
              </div>
            </div>
          )}

          {/* Sticky Bottom Action Bar */}
          <div className="rzp-bottom-bar">
            <div className="rzp-bottom-left">
              <span className="rzp-bottom-price">${initialAmount.toFixed(2)}</span>
              <button 
                className="rzp-details-btn cursor-pointer"
                onClick={() => setShowDetailsDrawer(!showDetailsDrawer)}
              >
                <span>{showDetailsDrawer ? t('hide_details') : t('view_details')}</span>
                {showDetailsDrawer ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
              </button>
            </div>

            <button 
              className="rzp-continue-btn cursor-pointer"
              onClick={() => {
                setSelectedCoin(displayCoins[0]);
                setStep('choose_method');
              }}
            >
              <span>{t('continue')}</span>
            </button>
          </div>

        </div>
      )}

      {/* 🌐 Multilingual Language Selection Bottom Sheet Modal */}
      {showLangDrawer && (
        <div className="rzp-drawer-overlay" onClick={() => setShowLangDrawer(false)}>
          <div className="rzp-drawer-card max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center pb-3 border-b border-white/[0.08]">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <Globe size={18} className="text-blue-500" />
                <span>{t('select_language')}</span>
              </h3>
              <button onClick={() => setShowLangDrawer(false)} className="p-1 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400">
                <X size={18} />
              </button>
            </div>

            {/* Search Bar */}
            <div className="relative my-3">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input 
                type="text" 
                placeholder={t('search_language')}
                value={searchLangQuery}
                onChange={(e) => setSearchLangQuery(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Language List */}
            <div className="overflow-y-auto space-y-1.5 max-h-[50vh] pr-1">
              {LANGUAGES.filter(l => 
                l.name.toLowerCase().includes(searchLangQuery.toLowerCase()) || 
                l.native.toLowerCase().includes(searchLangQuery.toLowerCase())
              ).map((lang, idx) => {
                const isSelected = currentLang === lang.code;
                return (
                  <button
                    key={lang.code}
                    onClick={() => {
                      setCurrentLang(lang.code);
                      try { localStorage.setItem('cpay_lang', lang.code); } catch(e) {}
                      setShowLangDrawer(false);
                    }}
                    className={`w-full flex items-center justify-between p-3 rounded-xl transition-all cursor-pointer ${
                      isSelected 
                        ? 'bg-blue-600/20 border border-blue-500/50 text-white' 
                        : 'bg-white/[0.03] hover:bg-white/[0.06] border border-transparent text-zinc-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono text-zinc-500 w-4">{idx + 1}.</span>
                      <span className="text-xl">{lang.flag}</span>
                      <div className="text-left">
                        <span className="text-sm font-bold block">{lang.native}</span>
                        <span className="text-[11px] text-zinc-400">({lang.name})</span>
                      </div>
                    </div>
                    {isSelected && <Check size={18} className="text-blue-400" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}




      {/* ══════════════════════════════════════════════════════════════════
          PAGE 2: CHOOSE PAYMENT METHOD (SEPARATE CLEAN PAGE)
          ══════════════════════════════════════════════════════════════════ */}
      {step === 'choose_method' && selectedCoin && (
        <div className="rzp-screen">
          
          <div className="rzp-header-nav">
            <button className="rzp-nav-back cursor-pointer" onClick={() => setStep('select_option')}>
              <ArrowLeft size={16} />
            </button>
            <span className="rzp-nav-title">{t('choose_method')}</span>
            <div className="w-8" />
          </div>

          {/* Selected Option Card */}
          <div className="p-4 bg-[#17171C] text-white rounded-2xl m-4 space-y-2 border border-white/10">
            <span className="text-[11px] text-zinc-400 uppercase font-semibold block">{t('select_coin')}</span>
            <div className="flex items-center gap-3">
              <selectedCoin.icon className="w-8 h-8" />
              <div>
                <h3 className="font-bold text-base text-white">{selectedCoin.name}</h3>
                <span className="text-xs text-zinc-300 font-mono">
                  {t('send')}: <b>{currentExactAmount} {selectedCoin.symbol}</b> (${initialAmount.toFixed(2)} USD)
                </span>
              </div>
            </div>
          </div>

          <div className="p-4 space-y-3">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-1">
              {t('choose_method_desc')}
            </span>

            {/* Method 1: QR Code */}
            <div 
              className="rzp-method-card cursor-pointer"
              onClick={() => {
                setSelectedSubMethod('qr');
                setStep('payment_details');
              }}
            >
              <div className="rzp-method-icon-wrap bg-blue-950/20 text-blue-600">
                <QrCode3DIcon />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-sm text-white">{t('method_qr_title')}</h4>
                <p className="text-xs text-zinc-500">{t('method_qr_desc')}</p>
              </div>
              <ChevronRight size={18} className="text-zinc-400" />
            </div>

            {/* Method 2: Monospace Address */}
            <div 
              className="rzp-method-card cursor-pointer"
              onClick={() => {
                setSelectedSubMethod('address');
                setStep('payment_details');
              }}
            >
              <div className="rzp-method-icon-wrap bg-purple-50 text-purple-600">
                <Crystal3DIcon />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-sm text-white">{t('method_addr_title')}</h4>
                <p className="text-xs text-zinc-500">{t('method_addr_desc')}</p>
              </div>
              <ChevronRight size={18} className="text-zinc-400" />
            </div>
          </div>

          <div className="mt-auto p-4 text-center">
            <div className="rzp-secured-mark">
              <ShieldCheck size={14} className="text-blue-600" />
              <span>{t('secured_by')} <b>ClusterPay</b></span>
            </div>
          </div>

        </div>
      )}


      {/* ══════════════════════════════════════════════════════════════════
          PAGE 3: PAYMENT DETAILS SCREEN (QR OR ADDRESS)
          ══════════════════════════════════════════════════════════════════ */}
      {step === 'payment_details' && selectedCoin && (
        <div className="rzp-screen pb-6">
          
          <div className="rzp-header-nav">
            <button className="rzp-nav-back cursor-pointer" onClick={() => setStep('choose_method')}>
              <ArrowLeft size={16} />
            </button>
            <span className="rzp-nav-title">{selectedCoin.name}</span>
            <div className="font-mono text-xs font-bold text-zinc-300 bg-[#252530] px-2 py-1 rounded-full">
              {formatTimer(timeLeft)}
            </div>
          </div>

          <div className="p-4 space-y-4">
            
            {/* Amount Banner */}
            <div className="text-center p-3 bg-[#1E1E24] rounded-2xl border border-white/10">
              <span className="text-[11px] text-zinc-400 uppercase font-semibold block">{t('exact_amount_to_transfer')}</span>
              <strong className="text-xl font-bold font-mono text-white">
                {currentExactAmount} {selectedCoin.symbol}
              </strong>
              <div className="text-[11px] text-zinc-500">
                ${initialAmount.toFixed(2)} USD • {selectedCoin.network}
              </div>
            </div>

            {/* QR View */}
            {selectedSubMethod === 'qr' && (
              <div className="p-4 bg-[#17171C] rounded-2xl border border-white/10 text-center space-y-3 shadow-sm">
                <div className="inline-block p-3 bg-white rounded-2xl border border-white/10 shadow-2xs">
                  <QRCodeSVG value={qrPayload} size={150} level="M" />
                </div>
                <div className="text-xs text-zinc-500 font-mono">
                  Trust Wallet, MetaMask, SafePal, Tonkeeper
                </div>

                <div className="flex gap-2 justify-center pt-1">
                  <button
                    onClick={() => handleCopyAmount(currentExactAmount)}
                    className="px-3 py-1.5 rounded-xl bg-[#252530] hover:bg-[#1E1E24] text-zinc-100 text-xs font-mono font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    {copiedAmount ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-zinc-500" />}
                    <span>{copiedAmount ? t('amount_copied') : `${t('copy')} ${t('base_amount')}`}</span>
                  </button>

                  <a
                    href={selectedCoin.scheme(selectedCoin.address, currentExactAmount)}
                    className="px-3 py-1.5 rounded-xl bg-[#0F0F12] hover:bg-[#1E1E24] text-white text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <span>Open App</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            )}

            {/* Mobile Wallet Quick Launch */}
            {selectedSubMethod === 'qr' && (
              <div className="grid grid-cols-3 gap-2">
                <a href={getDeepLink('trust')} target="_blank" rel="noreferrer" className="p-2.5 bg-[#1E1E24] rounded-xl border border-white/10 text-center text-xs font-semibold text-zinc-100 hover:bg-[#252530]">
                  Trust Wallet
                </a>
                <a href={getDeepLink('metamask')} target="_blank" rel="noreferrer" className="p-2.5 bg-[#1E1E24] rounded-xl border border-white/10 text-center text-xs font-semibold text-zinc-100 hover:bg-[#252530]">
                  MetaMask
                </a>
                <a href={getDeepLink('safepal')} target="_blank" rel="noreferrer" className="p-2.5 bg-[#1E1E24] rounded-xl border border-white/10 text-center text-xs font-semibold text-zinc-100 hover:bg-[#252530]">
                  SafePal
                </a>
              </div>
            )}

            {/* Address View */}
            {selectedSubMethod === 'address' && (
              <div className="space-y-3">
                <div className="p-3.5 bg-[#1E1E24] rounded-2xl border border-white/10 space-y-1.5">
                  <span className="text-[11px] font-bold text-zinc-500 uppercase block">{t('deposit_address')}</span>
                  <div className="p-2.5 bg-[#17171C] rounded-xl border border-white/10 font-mono text-xs text-white break-all flex items-center justify-between gap-2">
                    <span>{selectedCoin.address}</span>
                    <button 
                      onClick={() => handleCopyAddress(selectedCoin.address)}
                      className="shrink-0 px-2.5 py-1 rounded-lg bg-[#0F0F12] text-white text-xs font-medium flex items-center gap-1 cursor-pointer"
                    >
                      {copiedAddress ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                      <span>{copiedAddress ? t('copied') : t('copy')}</span>
                    </button>
                  </div>
                </div>

                <div className="p-3.5 bg-[#1E1E24] rounded-2xl border border-white/10 space-y-1.5">
                  <span className="text-[11px] font-bold text-zinc-500 uppercase block">{t('exact_amount_to_transfer')}</span>
                  <div className="p-2.5 bg-[#17171C] rounded-xl border border-white/10 font-mono text-xs font-bold text-white flex items-center justify-between">
                    <span>{currentExactAmount} {selectedCoin.symbol}</span>
                    <button 
                      onClick={() => handleCopyAmount(currentExactAmount)}
                      className="px-2.5 py-1 rounded-lg bg-[#252530] text-zinc-100 text-xs font-medium flex items-center gap-1 cursor-pointer"
                    >
                      {copiedAmount ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                      <span>{copiedAmount ? t('copied') : t('copy')}</span>
                    </button>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-800/50 text-[11px] text-amber-200 leading-snug">
                  ⚠️ {t('exact_amount_warning')}
                </div>
              </div>
            )}

            {/* Mempool Listening Radar */}
            <div className="p-3 bg-[#1E1E24] rounded-2xl border border-white/10 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="relative flex h-2.5 w-2.5 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-950/200"></span>
                </span>
                <span className="text-xs font-semibold text-white">
                  {t('listening_mempool')}
                </span>
              </div>

              <button
                onClick={checkPaymentStatus}
                className="p-1.5 rounded-lg bg-[#17171C] border border-white/10 text-zinc-400 hover:text-white shadow-2xs cursor-pointer"
                title="Refresh Status"
              >
                <RefreshCw size={13} />
              </button>
            </div>

            {/* Action Button */}
            <button className="rzp-primary-btn cursor-pointer" onClick={handlePaidClick}>
              <span>{t('i_have_paid')}</span>
            </button>

          </div>

        </div>
      )}


      {/* ══════════════════════════════════════════════════════════════════
          PAGE 4: CONFIRMING PAYMENT / 3D COIN MODAL (IMAGE 3 & 4)
          ══════════════════════════════════════════════════════════════════ */}
      {step === 'confirming' && (
        <div className="rzp-screen rzp-confirming-screen">
          
          <div className="rzp-topbar">
            <div className="rzp-merchant-info">
              {logoUrl ? (
                <img src={logoUrl} alt="" className="rzp-logo-img" onError={(e) => { e.target.src = "/assets/clusterpay-icon.png"; }} />
              ) : (
                <ClusterPayIcon className="w-8 h-8" />
              )}
              <h1 className="rzp-merchant-title">{merchantName}</h1>
            </div>
            <button onClick={() => setStep('payment_details')} className="text-zinc-400 hover:text-white cursor-pointer">
              <X size={20} />
            </button>
          </div>

          <div className="rzp-confirming-body">
            
            {/* 3D Spinning Gold Crypto Coin with Halo */}
            <Spinning3DCoin size={120} />

            <h2 className="rzp-confirming-title">{t('confirming_payment')}</h2>
            <p className="rzp-confirming-subtitle">{t('confirming_subtitle')}</p>

            <div className="rzp-confirming-pill">
              <span className="animate-spin inline-block w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full"></span>
              <span>{verifyingStatus}</span>
            </div>

            <div className="rzp-confirming-amount-box">
              <span className="font-mono text-sm font-bold text-white">
                {currentExactAmount} {selectedCoin?.symbol || 'USDT'}
              </span>
              <span className="text-xs text-zinc-500">
                {paymentPurpose}
              </span>
            </div>

            <button 
              className="rzp-cancel-button mt-4 cursor-pointer"
              onClick={() => setStep('payment_details')}
            >
              {t('cancel')}
            </button>

          </div>

          <div className="mt-auto pb-4 text-center">
            <div className="rzp-secured-mark">
              <ShieldCheck size={14} className="text-blue-600" />
              <span>{t('secured_by')} <b>ClusterPay</b></span>
            </div>
          </div>

        </div>
      )}


      {/* ══════════════════════════════════════════════════════════════════
          PAGE 5: PAYMENT SUCCESSFUL PAPER RECEIPT (IMAGE 2)
          ══════════════════════════════════════════════════════════════════ */}
      {step === 'success' && (
        <div className="rzp-screen rzp-success-screen">
          
          <div className="rzp-receipt-card">
            
            <div className="rzp-receipt-graphic">
              <PaperReceiptGraphic />
            </div>

            <h2 className="rzp-receipt-title">{t('payment_successful')}</h2>
            <p className="text-xs text-zinc-500 mt-1">{t('payment_settled_onchain')}</p>

            {/* Payment Details Section */}
            <div className="rzp-receipt-section">
              <h3 className="rzp-receipt-heading">{t('payment_options_for')}</h3>
              <div className="rzp-receipt-table">
                <div className="rzp-receipt-row">
                  <span className="lbl">{t('invoice_ref')}</span>
                  <span className="sep">:</span>
                  <span className="val font-mono">{invoiceId}</span>
                </div>
                <div className="rzp-receipt-row">
                  <span className="lbl">{t('time_settled')}</span>
                  <span className="sep">:</span>
                  <span className="val">{orderTime}</span>
                </div>
                <div className="rzp-receipt-row">
                  <span className="lbl">{t('payment_method')}</span>
                  <span className="sep">:</span>
                  <span className="val">{selectedCoin?.name || 'USDT (BEP-20)'}</span>
                </div>
                <div className="rzp-receipt-row">
                  <span className="lbl">Status</span>
                  <span className="sep">:</span>
                  <span className="val"><span className="rzp-green-pill">Successful</span></span>
                </div>
                <div className="rzp-receipt-row">
                  <span className="lbl">{t('amount_paid')}</span>
                  <span className="sep">:</span>
                  <span className="val font-bold">${initialAmount.toFixed(2)} USD</span>
                </div>
                {txDetails.txid && (
                  <div className="rzp-receipt-row">
                    <span className="lbl">{t('transaction_hash')}</span>
                    <span className="sep">:</span>
                    <span className="val font-mono">
                      {selectedCoin?.explorerUrl ? (
                        <a href={selectedCoin.explorerUrl(txDetails.txid)} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-1">
                          <span>{txDetails.txid.slice(0, 8)}...{txDetails.txid.slice(-6)}</span>
                          <ExternalLink size={11} />
                        </a>
                      ) : (
                        <span>{txDetails.txid.slice(0, 12)}...</span>
                      )}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Product Details Section */}
            <div className="rzp-receipt-section">
              <h3 className="rzp-receipt-heading">{t('order_summary')}</h3>
              <div className="rzp-receipt-table">
                <div className="rzp-receipt-row">
                  <span className="lbl">{t('purpose')}</span>
                  <span className="sep">:</span>
                  <span className="val">{paymentPurpose}</span>
                </div>
                <div className="rzp-receipt-row">
                  <span className="lbl">{t('gateway_fee')}</span>
                  <span className="sep">:</span>
                  <span className="val font-bold text-emerald-600">$0.00</span>
                </div>
                <div className="rzp-receipt-row rzp-total-row">
                  <span className="lbl">{t('total_payable')}</span>
                  <span className="sep">:</span>
                  <span className="val font-bold text-white">${initialAmount.toFixed(2)} USD</span>
                </div>
              </div>
            </div>

            {/* Download PDF Button */}
            <button className="rzp-download-btn cursor-pointer" onClick={() => window.print()}>
              <Download size={15} /> {t('download_receipt')}
            </button>

            {redirectUrl ? (
              <a href={redirectUrl} className="rzp-primary-btn mt-3 text-center">
                <span>{t('close_finish')} ({redirectCountdown}s)</span>
                <ArrowRight size={15} />
              </a>
            ) : (
              <div className="mt-3 p-2.5 bg-emerald-950/20 text-emerald-300 rounded-xl text-xs font-medium border border-emerald-800/40 text-center">
                {t('close_finish')}
              </div>
            )}

          </div>

        </div>
      )}


      {/* ══════════════════════════════════════════════════════════════════
          PAGE 6: UNDERPAYMENT / WRONG AMOUNT
          ══════════════════════════════════════════════════════════════════ */}
      {step === 'underpayment' && (
        <div className="rzp-screen p-6 text-center">
          <div className="w-14 h-14 rounded-full bg-rose-950/20 text-rose-400 border border-rose-800/40 flex items-center justify-center mx-auto mb-3">
            <XCircle size={32} />
          </div>
          <h2 className="text-xl font-bold text-white">Incorrect Amount Paid</h2>
          <p className="text-xs text-zinc-500 max-w-xs mx-auto mt-1">
            We detected your transfer, but the amount received does not match the invoice.
          </p>

          <div className="p-4 rounded-2xl bg-[#1E1E24] border border-white/10 text-left space-y-2 mt-4 font-mono text-xs">
            <div className="flex justify-between">
              <span className="text-zinc-500">Requested</span>
              <strong className="text-white">${underpaidInfo?.expected?.toFixed(2)} USD</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Received</span>
              <strong className="text-rose-400">${underpaidInfo?.received?.toFixed(2)} USD</strong>
            </div>
          </div>

          {merchantUrl && (
            <a href={merchantUrl} target="_blank" rel="noreferrer" className="rzp-primary-btn mt-4 text-center">
              <span>Contact Merchant Support</span>
            </a>
          )}
        </div>
      )}


      {/* ══════════════════════════════════════════════════════════════════
          PAGE 7: EXPIRED INVOICE
          ══════════════════════════════════════════════════════════════════ */}
      {step === 'expired' && (
        <div className="rzp-screen p-6 text-center">
          <div className="w-14 h-14 rounded-full bg-rose-950/20 text-rose-400 border border-rose-800/40 flex items-center justify-center mx-auto mb-3">
            <XCircle size={32} />
          </div>
          <h2 className="text-xl font-bold text-white">Invoice Expired</h2>
          <p className="text-xs text-zinc-500 max-w-xs mx-auto mt-1">
            The payment window has elapsed. Please request a new checkout link.
          </p>

          {merchantUrl && (
            <a href={merchantUrl} className="rzp-primary-btn mt-4 text-center">
              <span>Return to Store</span>
            </a>
          )}
        </div>
      )}

    </div>
  );
}

