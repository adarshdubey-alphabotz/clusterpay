import React, { useState, useEffect } from 'react';
import { Copy, ChevronRight, ArrowLeft, X, Download, XCircle, ChevronDown, Check } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import StoreApp from './StoreApp';

// ── 3D ICONS MATCHING REF 4 ──────────────────────────────────────────
const QrCode3DIcon = () => (
  <svg width="44" height="44" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
    <g filter="drop-shadow(0px 6px 12px rgba(37, 99, 235, 0.28))">
      {/* 3D Isometric Cube */}
      <path d="M28 6L48 16V38L28 48L8 38V16L28 6Z" fill="#2563EB" />
      <path d="M28 6L48 16L28 26L8 16L28 6Z" fill="#60A5FA" />
      <path d="M8 16L28 26V48L8 38V16Z" fill="#1D4ED8" />
      <path d="M28 26L48 16V38L28 48V26Z" fill="#3B82F6" />
      {/* Top Face Matrix */}
      <path d="M22 13L26 15L22 17L18 15L22 13Z" fill="#FFFFFF" />
      <path d="M34 13L38 15L34 17L30 15L34 13Z" fill="#FFFFFF" />
      <path d="M28 17L32 19L28 21L24 19L28 17Z" fill="#FFFFFF" />
      {/* Right Face QR Blocks */}
      <rect x="31" y="22" width="5" height="5" rx="1" fill="#DBEAFE" transform="skewY(26)" />
      <rect x="39" y="21" width="4" height="4" rx="1" fill="#FFFFFF" transform="skewY(26)" />
      <rect x="31" y="32" width="5" height="5" rx="1" fill="#FFFFFF" transform="skewY(26)" />
      <rect x="38" y="30" width="6" height="6" rx="1" fill="#93C5FD" transform="skewY(26)" />
      {/* Left Face QR Blocks */}
      <rect x="14" y="22" width="5" height="5" rx="1" fill="#93C5FD" transform="skewY(-26)" />
      <rect x="22" y="23" width="4" height="4" rx="1" fill="#FFFFFF" transform="skewY(-26)" />
      <rect x="14" y="32" width="6" height="6" rx="1" fill="#FFFFFF" transform="skewY(-26)" />
    </g>
  </svg>
);

const Wallet3DIcon = () => (
  <svg width="44" height="44" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
    <g filter="drop-shadow(0px 6px 12px rgba(59, 130, 246, 0.28))">
      {/* 3D Wallet Body */}
      <path d="M10 18C10 14.6863 12.6863 12 16 12H40C43.3137 12 46 14.6863 46 18V38C46 41.3137 43.3137 44 40 44H16C12.6863 44 10 41.3137 10 38V18Z" fill="url(#wGradBody)" />
      {/* Top Depth Trim */}
      <path d="M12 18C12 15.7909 13.7909 14 16 14H40C42.2091 14 44 15.7909 44 18V20H12V18Z" fill="#93C5FD" />
      {/* Front Flap */}
      <path d="M10 24C10 24 22 28 28 28C34 28 46 24 46 24V38C46 41.3137 43.3137 44 40 44H16C12.6863 44 10 41.3137 10 38V24Z" fill="url(#wGradFlap)" />
      {/* Metallic Clasp */}
      <rect x="32" y="27" width="14" height="12" rx="4" fill="#3B82F6" stroke="#1D4ED8" strokeWidth="1" />
      <circle cx="37" cy="33" r="2.5" fill="#FBBF24" stroke="#D97706" strokeWidth="1" />
    </g>
    <defs>
      <linearGradient id="wGradBody" x1="10" y1="12" x2="46" y2="44" gradientUnits="userSpaceOnUse">
        <stop stopColor="#60A5FA" />
        <stop offset="1" stopColor="#2563EB" />
      </linearGradient>
      <linearGradient id="wGradFlap" x1="10" y1="24" x2="46" y2="44" gradientUnits="userSpaceOnUse">
        <stop stopColor="#3B82F6" />
        <stop offset="1" stopColor="#1E40AF" />
      </linearGradient>
    </defs>
  </svg>
);

const Crystal3DIcon = () => (
  <svg width="44" height="44" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
    <g filter="drop-shadow(0px 6px 12px rgba(139, 92, 246, 0.32))">
      {/* Top Pyramid */}
      <path d="M28 6L14 26L28 32V6Z" fill="#818CF8" />
      <path d="M28 6L42 26L28 32V6Z" fill="#C084FC" />
      <path d="M28 6L21 28L28 32L35 28L28 6Z" fill="#A5B4FC" opacity="0.9" />
      {/* Bottom Pyramid */}
      <path d="M28 50L14 28L28 32V50Z" fill="#6366F1" />
      <path d="M28 50L42 28L28 32V50Z" fill="#9333EA" />
      <path d="M28 50L21 30L28 32L35 30L28 50Z" fill="#4F46E5" opacity="0.95" />
    </g>
  </svg>
);

// ── PAPER RECEIPT GRAPHIC MATCHING REF 2 ──────────────────────────────
const PaperReceiptGraphic = () => (
  <svg width="56" height="56" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <g filter="drop-shadow(0px 6px 14px rgba(37, 99, 235, 0.18))">
      <rect x="22" y="8" width="28" height="38" rx="4" fill="#E2E8F0" stroke="#CBD5E1" strokeWidth="2" />
      <rect x="14" y="14" width="28" height="38" rx="4" fill="#FFFFFF" stroke="#2563EB" strokeWidth="2" />
      <line x1="20" y1="22" x2="36" y2="22" stroke="#93C5FD" strokeWidth="2" strokeLinecap="round" />
      <line x1="20" y1="28" x2="32" y2="28" stroke="#93C5FD" strokeWidth="2" strokeLinecap="round" />
      <line x1="20" y1="34" x2="28" y2="34" stroke="#93C5FD" strokeWidth="2" strokeLinecap="round" />
      <circle cx="42" cy="42" r="11" fill="#10B981" stroke="#FFFFFF" strokeWidth="2.5" />
      <path d="M38.5 42L41 44.5L45.5 39.5" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  </svg>
);

// ── CRYPTO NETWORK BADGES MATCHING REF 3 ──────────────────────────────
const BscBadge = () => (
  <svg width="18" height="18" viewBox="0 0 32 32" fill="none" style={{ borderRadius: '50%' }}>
    <circle cx="16" cy="16" r="16" fill="#F3BA2F" />
    <path d="M16 6L20.5 10.5L18.4 12.6L16 10.2L13.6 12.6L11.5 10.5L16 6ZM8.5 13.5L10.6 11.4L13 13.8L10.6 16.2L8.5 14.1V13.5ZM23.5 13.5L25.6 15.6L23.5 17.7L21.1 15.3L23.5 12.9V13.5ZM16 13.8L18.4 16.2L16 18.6L13.6 16.2L16 13.8ZM16 22.2L18.4 19.8L20.5 21.9L16 26.4L11.5 21.9L13.6 19.8L16 22.2Z" fill="#1E2026" />
  </svg>
);

const TronBadge = () => (
  <svg width="18" height="18" viewBox="0 0 32 32" fill="none" style={{ borderRadius: '50%' }}>
    <circle cx="16" cy="16" r="16" fill="#FF0013" />
    <path d="M7 8.5L25.5 6L23 26L7 8.5ZM19.5 11L10.5 10L20.5 21L19.5 11ZM21.5 10L13.5 18.5L22 22.5L21.5 10Z" fill="#FFFFFF" />
  </svg>
);

const PolygonBadge = () => (
  <svg width="18" height="18" viewBox="0 0 32 32" fill="none" style={{ borderRadius: '50%' }}>
    <circle cx="16" cy="16" r="16" fill="#8247E5" />
    <path d="M21.5 13.5L17.5 11.2V15.7L21.5 18V13.5ZM14.5 11.2L10.5 13.5V18L14.5 15.7V11.2ZM10.5 19.5L14.5 21.8V17.3L10.5 15V19.5ZM17.5 21.8L21.5 19.5V15L17.5 17.3V21.8Z" fill="#FFFFFF" />
  </svg>
);

const TonBadge = () => (
  <svg width="18" height="18" viewBox="0 0 32 32" fill="none" style={{ borderRadius: '50%' }}>
    <circle cx="16" cy="16" r="16" fill="#0098EA" />
    <path d="M16 6L25 11V21L16 26L7 21V11L16 6ZM16 9.5L10 13V19L16 22.5L22 19V13L16 9.5Z" fill="#FFFFFF" />
  </svg>
);

const LtcBadge = () => (
  <svg width="18" height="18" viewBox="0 0 32 32" fill="none" style={{ borderRadius: '50%' }}>
    <circle cx="16" cy="16" r="16" fill="#345D9D" />
    <path d="M13 8H16.5L14.8 14.5H18L17.3 17.5H14L12.5 24H21V26H10.5L13 8Z" fill="#FFFFFF" />
  </svg>
);

const BtcBadge = () => (
  <svg width="18" height="18" viewBox="0 0 32 32" fill="none" style={{ borderRadius: '50%' }}>
    <circle cx="16" cy="16" r="16" fill="#F7931A" />
    <path d="M19 14.5C20.5 14 21 13 21 11.5C21 9.5 19.5 8.5 17 8.5H12V23.5H17.5C20.5 23.5 22 22 22 19.5C22 17.5 21 15.5 19 14.5ZM15 11H17C18 11 18.5 11.5 18.5 12.5C18.5 13.5 18 14 17 14H15V11ZM17.5 21H15V16.5H17.5C18.5 16.5 19.5 17 19.5 18.5C19.5 20 18.5 21 17.5 21Z" fill="#FFFFFF" />
  </svg>
);

// ── MAIN APP COMPONENT ────────────────────────────────────────────────
export default function App() {
  if (window.location.pathname.includes("/store")) {
    return <StoreApp />;
  }

  const [data, setData] = useState({ 
    amount: '0.00', 
    session_id: '', 
    bnb_price: '0.00', 
    ltc_price: '0.00', 
    ton_price: '0.00', 
    pol_price: '0.00', 
    btc_price: '0.00' 
  });
  const [coin, setCoin] = useState(null);
  const [selectedSubMethod, setSelectedSubMethod] = useState('qr'); // 'qr', 'address'
  const [showCoinPicker, setShowCoinPicker] = useState(false);
  
  // Steps: 'payment_select', 'method_choice', 'payment_details', 'verifying', 'success', 'underpayment'
  const [step, setStep] = useState('payment_select');
  
  const [timeLeft, setTimeLeft] = useState(1800);
  const [logoUrl, setLogoUrl] = useState("https://i.ibb.co/SDPZ8NVp/x.jpg");
  const [merchantName, setMerchantName] = useState("ClusterPay");
  const [merchantUrl, setMerchantUrl] = useState("https://t.me/clustershopbot");
  const [orderTime, setOrderTime] = useState('');

  const [verifyingStatus, setVerifyingStatus] = useState('Detecting incoming transfer on blockchain...');
  const [underpaidInfo, setUnderpaidInfo] = useState(null);

  // Binance Order ID manual input
  const [binanceOrderId, setBinanceOrderId] = useState('');
  const [manualError, setManualError] = useState('');
  const [isVerifyingManual, setIsVerifyingManual] = useState(false);

  useEffect(() => {
    document.body.classList.add('checkout-body');
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())} ${now.getHours() >= 12 ? 'PM' : 'AM'}, ${now.getDate()} ${months[now.getMonth()]}, ${now.getFullYear()}`;
    setOrderTime(timeStr);
    return () => document.body.classList.remove('checkout-body');
  }, []);

  const allCoins = {
    BINANCE: { 
      name: 'Binance Pay', 
      network: 'Binance Pay', 
      address: window.paymentData?.BINANCE_ID || '', 
      name_binance: window.paymentData?.BINANCE_NAME || '', 
      img: 'https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/svg/color/bnb.svg', 
      instant: 'Yes',
      fees: '0%',
      method_desc: 'Direct Instant Transfer via Pay ID',
      method_type: 'App / Pay ID',
      net_badges: [<BscBadge key="bsc" />]
    },
    USDT: { 
      name: 'USDT (BEP-20)', 
      network: 'BEP-20 (BSC network)', 
      address: window.paymentData?.USDT_WALLET_BEP20 || '', 
      img: 'https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/svg/color/usdt.svg', 
      instant: 'Yes',
      fees: '0.1-0.3%',
      method_desc: 'Stablecoin on Binance Smart Chain',
      method_type: 'Crypto',
      net_badges: [<BscBadge key="bsc" />]
    },
    USDT_TRC20: { 
      name: 'USDT (TRC-20)', 
      network: 'TRC-20 (Tron network)', 
      address: window.paymentData?.USDT_WALLET_TRC20 || '', 
      img: 'https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/svg/color/usdt.svg', 
      instant: 'Yes',
      fees: 'Network Fee',
      method_desc: 'Tron Network Instant Transfer',
      method_type: 'Crypto',
      net_badges: [<TronBadge key="tron" />]
    },
    USDT_POLY: { 
      name: 'USDT (Polygon)', 
      network: 'Polygon network', 
      address: window.paymentData?.USDT_WALLET_POLY || '', 
      img: 'https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/svg/color/usdt.svg', 
      instant: 'Yes',
      fees: 'Near-Zero',
      method_desc: 'Polygon Proof of Stake Transfer',
      method_type: 'Crypto',
      net_badges: [<PolygonBadge key="poly" />]
    },
    TON: { 
      name: 'TON', 
      network: 'TON network', 
      address: window.paymentData?.TON_WALLET || '', 
      img: 'https://raw.githubusercontent.com/blockchain/coin-definitions/master/extensions/blockchains/ton/info/logo.png', 
      instant: 'Yes',
      fees: 'Micro Fee',
      method_desc: 'The Open Network Native Transfer',
      method_type: 'Crypto',
      net_badges: [<TonBadge key="ton" />]
    },
    BNB: { 
      name: 'BNB', 
      network: 'BEP-20 (BSC network)', 
      address: window.paymentData?.USDT_WALLET_BEP20 || '', 
      img: 'https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/svg/color/bnb.svg', 
      instant: 'Yes',
      fees: '0.1-0.2%',
      method_desc: 'Binance Smart Chain Coin',
      method_type: 'Crypto',
      net_badges: [<BscBadge key="bsc" />]
    },
    LTC: { 
      name: 'Litecoin', 
      network: 'LTC network', 
      address: window.paymentData?.LTC_WALLET || '', 
      img: 'https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/svg/color/ltc.svg',
      instant: 'Yes',
      fees: 'Micro Fee',
      method_desc: 'Litecoin Blockchain Direct',
      method_type: 'Crypto',
      net_badges: [<LtcBadge key="ltc" />]
    },
    BTC: { 
      name: 'Bitcoin', 
      network: 'BTC network', 
      address: window.paymentData?.BTC_WALLET || '', 
      img: 'https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/svg/color/btc.svg',
      instant: 'No (10m)',
      fees: 'Standard Fee',
      method_desc: 'Bitcoin Core Network Transfer',
      method_type: 'Crypto',
      net_badges: [<BtcBadge key="btc" />]
    }
  };

  const isGateway = window.paymentData?.is_gateway === 'true' || !window.paymentData?.BINANCE_ID;
  const coins = Object.fromEntries(
    Object.entries(allCoins).filter(([key, val]) => {
      if (key === 'BINANCE' && (isGateway || !val.address)) return false;
      return true;
    })
  );

  useEffect(() => {
    if (window.paymentData && window.paymentData.amount !== "{amount}") {
      const rawAmt = String(window.paymentData.amount || '');
      const parsedAmt = parseFloat(rawAmt);
      const is3Dec = rawAmt.includes('.') && rawAmt.split('.')[1].length >= 3;
      const amtStr = is3Dec ? parsedAmt.toFixed(3) : parsedAmt.toFixed(2);

      setData({
        amount: isNaN(parsedAmt) ? '0.00' : amtStr,
        session_id: window.paymentData.session_id,
        bnb_price: window.paymentData.bnb_price && window.paymentData.bnb_price !== "{bnb_price}" ? parseFloat(window.paymentData.bnb_price).toFixed(2) : '0.00',
        ltc_price: window.paymentData.ltc_price && window.paymentData.ltc_price !== "{ltc_price}" ? parseFloat(window.paymentData.ltc_price).toFixed(2) : '0.00',
        ton_price: window.paymentData.ton_price && window.paymentData.ton_price !== "{ton_price}" ? parseFloat(window.paymentData.ton_price).toFixed(4) : '0.00',
        pol_price: window.paymentData.pol_price && window.paymentData.pol_price !== "{pol_price}" ? parseFloat(window.paymentData.pol_price).toFixed(4) : '0.00',
        btc_price: window.paymentData.btc_price && window.paymentData.btc_price !== "{btc_price}" ? parseFloat(window.paymentData.btc_price).toFixed(2) : '0.00'
      });
      if (window.paymentData.time_left && window.paymentData.time_left !== "{time_left}") {
        setTimeLeft(parseInt(window.paymentData.time_left, 10));
      }
      if (window.paymentData.logo_url && window.paymentData.logo_url !== "{logo_url}") {
        setLogoUrl(window.paymentData.logo_url);
      }
      if (window.paymentData.merchant_name && window.paymentData.merchant_name !== "{merchant_name}") {
        setMerchantName(window.paymentData.merchant_name);
        document.title = `${window.paymentData.merchant_name} · Secure Checkout`;
      }
      if (window.paymentData.merchant_url && window.paymentData.merchant_url !== "{merchant_url}") {
        setMerchantUrl(window.paymentData.merchant_url);
      }
    } else {
      setData({ amount: '12.50', session_id: 'cpay_test_session_id_hash', bnb_price: '580.00', ltc_price: '82.00', ton_price: '6.4500', pol_price: '0.4500', btc_price: '92000.00' });
    }

    const timer = setInterval(() => setTimeLeft(t => Math.max(0, t - 1)), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (window.paymentData?.embed === "true" || window.parent !== window) {
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
  }, [step, selectedSubMethod]);

  // Background auto-polling for payment arrival
  useEffect(() => {
    if (!data.session_id || data.session_id === 'test' || step === 'success') return;
    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/check_status/${data.session_id}`);
        if (res.ok) {
          const resData = await res.json();
          if (resData.status === 'paid' || resData.success) {
            setStep('success');
            handleSuccessRedirect();
          } else if (resData.message && resData.message.toLowerCase().includes("underpayment")) {
            setStep('underpayment');
            setUnderpaidInfo({
              expected: parseFloat(data.amount),
              received: parseFloat(resData.amount_received || 0.0)
            });
          }
        }
      } catch (err) {}
    }, 4000);
    return () => clearInterval(pollInterval);
  }, [data.session_id, step]);

  const handleSuccessRedirect = () => {
    if (window.paymentData?.embed === "true" || window.parent !== window) {
      window.parent.postMessage({
        type: 'clusterpay:success',
        session_id: window.paymentData?.session_id,
        custom_id: window.paymentData?.custom_id
      }, '*');
    }

    const redirectUrl = window.paymentData?.redirect_url;
    if (redirectUrl && redirectUrl !== "{redirect_url}") {
      const customId = window.paymentData?.custom_id || "";
      const sessionId = window.paymentData?.session_id || "";
      const separator = redirectUrl.includes('?') ? '&' : '?';
      const target = `${redirectUrl}${separator}session_id=${encodeURIComponent(sessionId)}&custom_id=${encodeURIComponent(customId)}&status=paid`;
      setTimeout(() => {
        window.location.href = target;
      }, 3500);
    }
  };

  const checkBlockchainAuto = async () => {
    if (!data.session_id || data.session_id === 'test') return false;
    try {
      const res = await fetch(`/api/check_status/${data.session_id}`);
      if (res.ok) {
        const resData = await res.json();
        if (resData.status === 'paid' || resData.success) {
          setStep('success');
          handleSuccessRedirect();
          return true;
        } else if (resData.message && resData.message.toLowerCase().includes("underpayment")) {
          setStep('underpayment');
          setUnderpaidInfo({
            expected: parseFloat(data.amount),
            received: parseFloat(resData.amount_received || 0.0)
          });
          return true;
        }
      }
    } catch (e) {
      console.error(e);
    }
    return false;
  };

  const handleManualBinanceVerify = async (providedId = null) => {
    const targetId = (providedId || binanceOrderId).trim();
    if (!targetId || !data.session_id) return false;
    setIsVerifyingManual(true);
    setManualError('');
    try {
      const res = await fetch('/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: data.session_id,
          txid: targetId,
          coin: 'BINANCE'
        })
      });
      const resData = await res.json();
      if (resData.success || resData.status === 'paid') {
        setStep('success');
        handleSuccessRedirect();
        return true;
      } else {
        setManualError(resData.message || 'Verification failed. Please check your Order ID.');
        return false;
      }
    } catch (err) {
      setManualError('Network error while verifying. Please try again.');
      return false;
    } finally {
      setIsVerifyingManual(false);
    }
  };

  const handlePaidClick = async () => {
    if (coin === 'BINANCE') {
      if (!binanceOrderId.trim()) {
        setManualError('⚠️ Please enter your 18-digit Binance Order ID to verify your transfer.');
        return;
      }
      await handleManualBinanceVerify();
      return;
    }

    setStep('verifying');
    setVerifyingStatus('Scanning blockchain network for your transfer...');
    
    const verified = await checkBlockchainAuto();
    if (verified) return;

    let pollCount = 0;
    const interval = setInterval(async () => {
      pollCount++;
      if (pollCount % 3 === 1) {
        setVerifyingStatus('Scanning mempool and recent blocks...');
      } else if (pollCount % 3 === 2) {
        setVerifyingStatus('Matching exact deposit amount on-chain...');
      } else {
        setVerifyingStatus('Checking network confirmations...');
      }

      const done = await checkBlockchainAuto();
      if (done || pollCount >= 60 || step === 'underpayment') {
        clearInterval(interval);
      }
    }, 2800);
  };

  const getAmountStr = () => {
    if (!coin) return data.amount;
    const priceKey = { BNB: 'bnb_price', LTC: 'ltc_price', TON: 'ton_price', POL: 'pol_price', BTC: 'btc_price' }[coin];
    if (priceKey && parseFloat(data[priceKey]) > 0) {
      const precision = coin === 'BTC' || coin === 'LTC' ? 8 : 6;
      return (parseFloat(data.amount) / parseFloat(data[priceKey])).toFixed(precision);
    }
    return data.amount;
  };

  const availableCoinKeys = Object.keys(coins).filter(key => {
    if (!coins[key].address) return false;
    const priceKey = { BNB: 'bnb_price', LTC: 'ltc_price', TON: 'ton_price', POL: 'pol_price', BTC: 'btc_price' }[key];
    return !priceKey || parseFloat(data[priceKey]) > 0;
  });

  const getDeepLink = (wallet) => {
    if (!coin) return "#";
    const address = coins[coin].address;
    const amountStr = getAmountStr();
    if(wallet === "trust") {
        if(coin === "BNB") return `https://link.trustwallet.com/send?asset=c20000714&address=${address}&amount=${amountStr}`;
        if(coin === "LTC") return `https://link.trustwallet.com/send?asset=c2&address=${address}&amount=${amountStr}`;
        if(coin === "BTC") return `https://link.trustwallet.com/send?asset=c0&address=${address}&amount=${amountStr}`;
        if(coin === "TON") return `https://link.trustwallet.com/send?asset=c607&address=${address}&amount=${amountStr}`;
        return `https://link.trustwallet.com/send?asset=c20000714_t0x55d398326f99059fF775485246999027B3197955&address=${address}&amount=${amountStr}`;
    }
    if(wallet === "metamask") {
        const chainId = ["POL", "USDT_POLY"].includes(coin) ? "137" : "56";
        return `https://metamask.app.link/send/${address}@${chainId}?value=${amountStr}`;
    }
    if(wallet === "safepal") return `safepal://send?address=${address}&amount=${amountStr}`;
    return "#";
  };

  const toBaseUnits = (value, decimals) => {
    const [whole = '0', fraction = ''] = String(value).split('.');
    const padded = (fraction + '0'.repeat(decimals)).slice(0, decimals);
    return (BigInt(whole || '0') * (10n ** BigInt(decimals)) + BigInt(padded || '0')).toString();
  };

  const getQrPayload = () => {
    if (!coin) return "";
    const address = coins[coin].address;
    const amount = getAmountStr();
    if (coin === 'BINANCE') return address;
    if (coin === 'BTC') return `bitcoin:${address}?amount=${amount}`;
    if (coin === 'LTC') return `litecoin:${address}?amount=${amount}`;
    if (coin === 'TON') return `ton://transfer/${address}?amount=${toBaseUnits(amount, 9)}`;
    if (coin === 'BNB') return `ethereum:pay-${address}@56?value=${toBaseUnits(amount, 18)}`;
    if (coin === 'POL') return `ethereum:pay-${address}@137?value=${toBaseUnits(amount, 18)}`;
    if (coin === 'USDT') {
      return `ethereum:pay-0x55d398326f99059fF775485246999027B3197955@56/transfer?address=${address}&uint256=${toBaseUnits(amount, 18)}`;
    }
    if (coin === 'USDT_TRC20') return `tron:${address}?amount=${amount}`;
    if (coin === 'USDT_POLY') {
      return `ethereum:pay-0xc2132D05D31c914a87C6611C10748AEb04B58e8F@137/transfer?address=${address}&uint256=${toBaseUnits(amount, 6)}`;
    }
    return address;
  };

  const copyAddress = () => {
    if (!coin) return;
    navigator.clipboard.writeText(coins[coin].address).then(() => alert("Address copied to clipboard!"));
  };

  const qrPayload = getQrPayload();
  const paymentPurpose = window.paymentData?.description || window.paymentData?.purpose || window.paymentData?.product_name || 'Wallet credit / merchant order';
  const invoiceId = data.session_id ? `CPAY-${data.session_id.substring(0, 10).toUpperCase()}` : 'CPAY-TEST';
  const selectedAmountLabel = coin === 'BINANCE' ? `${data.amount} USDT` : coin ? `${getAmountStr()} ${coin === 'USDT_POLY' || coin === 'USDT_TRC20' ? 'USDT' : coin}` : `$${data.amount}`;
  const mins = Math.floor(timeLeft / 60).toString().padStart(2, '0');
  const secs = (timeLeft % 60).toString().padStart(2, '0');
  const isEmbed = window.paymentData?.embed === "true";

  const handleSelectCoin = (key) => {
    setCoin(key);
    setShowCoinPicker(false);
    setStep('method_choice');
  };

  return (
    <div className={`gateway-card ${isEmbed ? 'embedded' : ''}`}>
      {/* ── TOP MERCHANT HEADER ── */}
      {!isEmbed && step !== 'verifying' && step !== 'success' && (
        <div className="gateway-card-header">
          <a href={merchantUrl} target="_blank" rel="noreferrer" className="merchant-link">
            <img src={logoUrl} alt="Merchant Logo" className="merchant-logo-img" />
            <div className="merchant-title-flex">
              <span className="merchant-bot-name">{merchantName}</span>
            </div>
            <span className="verified-label-sub">Merchant</span>
          </a>
          <div className="secure-checkout-mark">Payment request</div>
        </div>
      )}

      <>
        {/* ═════════════════════════════════════════════════════════ */}
        {/* SCREEN 1: CHOOSE A PAYMENT OPTION (MATCHING REF 3)       */}
        {/* ═════════════════════════════════════════════════════════ */}
        {step === 'payment_select' && (
          <div className="page-content light-card-canvas">
            <div className="top-drag-handle"></div>
            
            <span className="cpay-summary-kicker">Payment request</span>
            <h2 className="ref3-header-title">Confirm your payment</h2>

            <div className="cpay-hero-summary mt-16">
              <div className="cpay-merchant-line">
                <img src={logoUrl} alt="" />
                <div>
                  <span>Paying to</span>
                  <b>{merchantName}</b>
                </div>
              </div>
              <div className="cpay-amount-block">
                <span>You are paying</span>
                <strong>${data.amount}</strong>
                <p>{paymentPurpose}</p>
              </div>
              <div className="cpay-info-grid">
                <div><span>Invoice</span><b>{invoiceId}</b></div>
                <div><span>Expires</span><b>{mins}:{secs}</b></div>
              </div>
            </div>

            <div className="cpay-crypto-rail mt-16" onClick={() => setShowCoinPicker(true)}>
              <div>
                <span>Pay via crypto</span>
                <b>Select coin</b>
              </div>
              <div className="cpay-coin-stack">
                {availableCoinKeys.slice(0, 6).map((key) => (
                  <img key={key} src={coins[key].img} alt={coins[key].name} />
                ))}
              </div>
              <ChevronRight size={20} className="ref4-chevron" />
            </div>

            <button className="btn-primary cpay-main-cta mt-16" onClick={() => setShowCoinPicker(true)}>
              Choose crypto coin
            </button>

            {showCoinPicker && (
              <div className="cpay-picker-overlay" onClick={() => setShowCoinPicker(false)}>
                <div className="cpay-picker-sheet" onClick={(e) => e.stopPropagation()}>
                  <div className="cpay-picker-head">
                    <div>
                      <span className="cpay-summary-kicker">Pay ${data.amount}</span>
                      <h3>Select coin</h3>
                    </div>
                    <button onClick={() => setShowCoinPicker(false)}><X size={18} /></button>
                  </div>
                  <div className="cpay-picker-list">
                    {availableCoinKeys.map(key => {
                      const c = coins[key];
                      return (
                        <button key={key} className="cpay-picker-row" onClick={() => handleSelectCoin(key)}>
                          <img src={c.img} alt="" />
                          <div>
                            <b>{c.name}</b>
                            <span>{c.network}</span>
                          </div>
                          <small>{c.fees}</small>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════ */}
        {/* SCREEN 2: SELECT PAYMENT METHOD (MATCHING REF 4)         */}
        {/* ═════════════════════════════════════════════════════════ */}
        {step === 'method_choice' && (
          <div className="page-content dark-choice-canvas">
            <button className="back-btn-light" onClick={() => setStep('payment_select')}><ArrowLeft size={16} /> Back to options</button>

            <div className="cpay-method-hero mt-16">
              <span className="cpay-summary-kicker">Selected option</span>
              <div>
                <img src={coins[coin]?.img} alt="" />
                <strong>{coins[coin]?.name}</strong>
              </div>
              <p>Pay <b>{selectedAmountLabel}</b> for {paymentPurpose}.</p>
            </div>

            <h2 className="ref4-header-title mt-16">Select your payment method</h2>

            <div className="ref4-outer-container mt-16">
              {/* Option 1: QR Code */}
              <div className="ref4-pill-card" onClick={() => { setSelectedSubMethod('qr'); setStep('payment_details'); }}>
                <div className="ref4-icon-frame">
                  <QrCode3DIcon />
                </div>
                <div className="ref4-card-text">
                  <h3>QR Code</h3>
                </div>
                <ChevronRight size={22} className="ref4-chevron" />
              </div>

              {/* Option 3: Payment Address */}
              <div className="ref4-pill-card" onClick={() => { setSelectedSubMethod('address'); setStep('payment_details'); }}>
                <div className="ref4-icon-frame">
                  <Crystal3DIcon />
                </div>
                <div className="ref4-card-text">
                  <h3>Payment Address</h3>
                </div>
                <ChevronRight size={22} className="ref4-chevron" />
              </div>
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════ */}
        {/* SCREEN 3: PAYMENT SUBMETHOD DETAILS                      */}
        {/* ═════════════════════════════════════════════════════════ */}
        {step === 'payment_details' && (
          <div className="page-content">
            <button className="back-btn" onClick={() => setStep('method_choice')}><ArrowLeft size={16} /> Back</button>

            <div className="card-header mt-16">
              <div style={{ display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2>Pay with {coins[coin]?.name}</h2>
                {timeLeft > 0 && <span className="timer-countdown">{mins}:{secs}</span>}
              </div>
              <p>Transfer the exact amount on the correct network to credit your deposit.</p>
            </div>

            <div className="cpay-detail-summary mt-16">
              <div><span>Paying for</span><b>{paymentPurpose}</b></div>
              <div><span>Amount due</span><b>{selectedAmountLabel}</b></div>
              <div><span>Network</span><b>{coins[coin]?.network}</b></div>
              <div><span>Invoice</span><b>{invoiceId}</b></div>
            </div>

            <div className="invoice-meta mt-12">
              <span>Session: <b>{data.session_id ? data.session_id.substring(0, 10) : '—'}</b></span>
              <span>Expires in <b>{mins}:{secs}</b></span>
            </div>

            {/* Sub-view: QR Code */}
            {selectedSubMethod === 'qr' && (
              <div className="payment-qr-card mt-24">
                <div className="payment-qr-frame">
                  <QRCodeSVG value={qrPayload} size={160} level="M" marginSize={1} />
                </div>
                <div className="payment-qr-copy">
                  <span className="qr-eyebrow">AMOUNT DUE</span>
                  <strong className="qr-amount">
                    {coin === 'BINANCE' ? `${data.amount} USDT` : `${getAmountStr()} ${coin === 'USDT_POLY' || coin === 'USDT_TRC20' ? 'USDT' : coin}`}
                  </strong>
                  <span>{coin === 'BINANCE' ? 'Scan Pay ID with Binance App' : `Standard payment QR for ${coins[coin]?.name} on ${coins[coin]?.network}.`}</span>
                </div>
              </div>
            )}

            {/* Sub-view: Deep Link Wallet */}
            {selectedSubMethod === 'wallet' && (
              <div className="deep-link-apps-card mt-24">
                <div className="label">Open directly in Mobile Wallet:</div>
                <div className="apps-grid mt-12">
                  <a href={getDeepLink('trust')} className="app-btn" target="_blank" rel="noreferrer">
                    <img src="https://trustwallet.com/assets/images/media/assets/TWT_Logo.png" alt="Trust Wallet" style={{ width: '32px', height: '32px', borderRadius: '8px' }} />
                    <span>Trust Wallet</span>
                  </a>
                  {coin === 'BNB' && (
                    <a href={getDeepLink('metamask')} className="app-btn" target="_blank" rel="noreferrer">
                      <img src="https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg" alt="MetaMask" style={{ width: '32px', height: '32px' }} />
                      <span>MetaMask</span>
                    </a>
                  )}
                  {coin === 'BNB' && (
                    <a href={getDeepLink('safepal')} className="app-btn" target="_blank" rel="noreferrer">
                      <img src="https://pbs.twimg.com/profile_images/1668875322960965633/2tQY7n4__400x400.jpg" alt="SafePal" style={{ width: '32px', height: '32px', borderRadius: '8px' }} />
                      <span>SafePal</span>
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Sub-view: Payment Address details */}
            {selectedSubMethod === 'address' && (
            <div className="deposit-details-box mt-16" style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: '16px', padding: '16px' }}>
              <div className="label">Destination Address</div>
              <div className="address-box mt-8">
                <div className="address-text" style={{ fontFamily: 'monospace', fontSize: '13px', wordBreak: 'break-all' }}>{coins[coin]?.address}</div>
                <button className="copy-btn" onClick={copyAddress}><Copy size={16} /></button>
              </div>

              <div className="label mt-16">Exact Amount to Send</div>
              <div className="address-box mt-8">
                <div className="address-text" style={{ fontSize: '18px', fontWeight: 'bold' }}>
                  {coin === 'BINANCE' ? `${data.amount} USDT` : `${getAmountStr()} ${coin === 'USDT_POLY' || coin === 'USDT_TRC20' ? 'USDT' : coin}`}
                </div>
                <button className="copy-btn" onClick={() => navigator.clipboard.writeText(getAmountStr())}><Copy size={16} /></button>
              </div>

              <div className="warning-banner mt-16" style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.2)', color: '#f59e0b', padding: '10px 12px', borderRadius: '8px', fontSize: '12px' }}>
                ⚠️ Send exactly <b>{getAmountStr()}</b>. Sending any different amount on the blockchain will block automatic credit.
              </div>
            </div>
            )}

            {coin === 'BINANCE' && (
              <div className="binance-order-input-card mt-16" style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '16px', padding: '16px' }}>
                <div style={{ color: '#FBBF24', fontSize: '13px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>⚡</span> Enter Binance Order ID (Auto-Credit)
                </div>
                <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px', marginBottom: '10px' }}>
                  Open Binance App → Pay → Transaction History → Tap transfer → Copy <b>Order ID</b> (e.g. <code>450341266973671424</code>)
                </p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    placeholder="Paste 18-digit Binance Order ID"
                    value={binanceOrderId}
                    onChange={(e) => { setBinanceOrderId(e.target.value); setManualError(''); }}
                    style={{ flex: 1, padding: '12px 14px', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '10px', color: '#fff', fontSize: '13px', fontFamily: 'monospace', outline: 'none' }}
                  />
                  <button
                    onClick={() => handleManualBinanceVerify()}
                    disabled={isVerifyingManual || !binanceOrderId.trim()}
                    className="btn-primary"
                    style={{ padding: '0 16px', whiteSpace: 'nowrap', opacity: (!binanceOrderId.trim() || isVerifyingManual) ? 0.6 : 1, fontSize: '13px', fontWeight: '600' }}
                  >
                    {isVerifyingManual ? 'Verifying...' : 'Verify'}
                  </button>
                </div>
                {manualError && (
                  <div style={{ color: '#EF4444', fontSize: '12px', marginTop: '8px', fontWeight: '500' }}>
                    {manualError}
                  </div>
                )}
              </div>
            )}

            <button className="btn-primary mt-16" onClick={handlePaidClick} style={{ width: '100%' }}>
              I have Paid & Sent Transfer →
            </button>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════ */}
        {/* SCREEN 4: PAYMENT PROCESSING (MATCHING REF 1)            */}
        {/* ═════════════════════════════════════════════════════════ */}
        {step === 'verifying' && (
          <div className="page-content ref1-processing-screen">
            <div className="ref1-topbar">
              <span className="ref1-brand-logo"><strong>ClusterPay</strong></span>
              <button className="ref1-close-btn" onClick={() => setStep('payment_details')}><X size={24} /></button>
            </div>

            <div className="ref1-center-content">
              <div className="cpay-chain-loader">
                <span></span>
                <i></i>
                <b></b>
              </div>

              <h2 className="ref1-processing-title">{coin === 'BINANCE' ? 'Verifying Binance Pay transfer' : 'Verifying blockchain payment'}</h2>
              <p className="ref1-processing-subtitle">Stay on this screen while the payment is being processed.</p>
              <div className="cpay-processing-details mt-16">
                <span>{selectedAmountLabel}</span>
                <b>{paymentPurpose}</b>
              </div>

              <div className="ref1-live-status-pill mt-24">
                <span>{verifyingStatus}</span>
              </div>

              {coin === 'BINANCE' && (
                <div className="binance-order-input-card mt-24" style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '16px', padding: '16px', textAlign: 'left', width: '100%', maxWidth: '360px' }}>
                  <div style={{ color: '#FBBF24', fontSize: '13px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>⚡</span> Fast-Track: Paste Binance Order ID
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                    <input
                      type="text"
                      placeholder="Paste Order ID or TxID"
                      value={binanceOrderId}
                      onChange={(e) => { setBinanceOrderId(e.target.value); setManualError(''); }}
                      style={{ flex: 1, padding: '10px 12px', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: '#fff', fontSize: '12px', fontFamily: 'monospace', outline: 'none' }}
                    />
                    <button
                      onClick={() => handleManualBinanceVerify()}
                      disabled={isVerifyingManual || !binanceOrderId.trim()}
                      className="btn-primary"
                      style={{ padding: '0 14px', whiteSpace: 'nowrap', opacity: (!binanceOrderId.trim() || isVerifyingManual) ? 0.6 : 1, fontSize: '12px', fontWeight: '600' }}
                    >
                      {isVerifyingManual ? '...' : 'Verify'}
                    </button>
                  </div>
                  {manualError && (
                    <div style={{ color: '#EF4444', fontSize: '11px', marginTop: '6px', fontWeight: '500' }}>
                      {manualError}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════ */}
        {/* SCREEN 5: SUCCESSFUL PAPER RECEIPT (MATCHING REF 2)      */}
        {/* ═════════════════════════════════════════════════════════ */}
        {step === 'success' && (
          <div className="page-content ref2-receipt-backdrop">
            <div className="ref2-receipt-card">
              <button className="ref2-close-btn" onClick={() => window.close()}><X size={20} /></button>
              
              {/* Paper Invoice Checked Graphic */}
              <div className="ref2-graphic-wrap mt-8">
                <PaperReceiptGraphic />
              </div>

              <h2 className="ref2-title">Payment Successful</h2>
              
              {/* Payment Details Section */}
              <div className="ref2-section mt-24">
                <h3 className="ref2-section-heading">Payment Details</h3>
                <div className="ref2-table">
                  <div className="ref2-row">
                    <span className="lbl">Invoice Number</span>
                    <span className="sep">:</span>
                    <span className="val font-mono">{data.session_id ? `CPAY ${data.session_id.substring(0,4).toUpperCase()} ${data.session_id.substring(4,8).toUpperCase()}` : 'S564 F5677 G6412'}</span>
                  </div>
                  <div className="ref2-row">
                    <span className="lbl">Order Time</span>
                    <span className="sep">:</span>
                    <span className="val">{orderTime}</span>
                  </div>
                  <div className="ref2-row">
                    <span className="lbl">Payment Method</span>
                    <span className="sep">:</span>
                    <span className="val">{coins[coin]?.name || 'USDT (BEP-20)'}</span>
                  </div>
                  <div className="ref2-row">
                    <span className="lbl">Payment Status</span>
                    <span className="sep">:</span>
                    <span className="val"><span className="ref2-green-pill">Successful</span></span>
                  </div>
                  <div className="ref2-row">
                    <span className="lbl">Amount</span>
                    <span className="sep">:</span>
                    <span className="val" style={{ fontWeight: '700' }}>${data.amount}</span>
                  </div>
                </div>
              </div>

              {/* Product Details Section */}
              <div className="ref2-section mt-16">
                <h3 className="ref2-section-heading">Product Details</h3>
                <div className="ref2-table">
                  <div className="ref2-row">
                    <span className="lbl">Wallet Credit</span>
                    <span className="sep">:</span>
                    <span className="val">${data.amount}</span>
                  </div>
                  <div className="ref2-row">
                    <span className="lbl">Delivery Charges</span>
                    <span className="sep">:</span>
                    <span className="val">$0.00</span>
                  </div>
                  <div className="ref2-row ref2-total-row">
                    <span className="lbl">Total Amount</span>
                    <span className="sep">:</span>
                    <span className="val">${data.amount}</span>
                  </div>
                </div>
              </div>

              {/* Action Button: Download Receipt */}
              <button className="ref2-download-btn mt-24" onClick={() => window.print()}>
                <Download size={16} /> Download PDF Receipt
              </button>
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════ */}
        {/* SCREEN 6: UNDERPAYMENT / WRONG AMOUNT WARNING SCREEN     */}
        {/* ═════════════════════════════════════════════════════════ */}
        {step === 'underpayment' && (
          <div className="page-content centered-page underpayment-card">
            <div className="warning-icon-wrapper">
              <XCircle size={72} color="#EF4444" />
            </div>
            <h2 className="mt-16" style={{ color: '#EF4444' }}>Incorrect Amount Paid</h2>
            <p className="subtitle mt-12" style={{ maxWidth: '320px', margin: '0 auto' }}>
              We detected your transfer on the blockchain, but the amount paid does not match the invoice.
            </p>

            <div className="underpayment-details-box mt-24">
              <div className="details-row">
                <span>Requested Amount</span>
                <strong>${underpaidInfo?.expected?.toFixed(2)} USD</strong>
              </div>
              <div className="details-row">
                <span>Received Amount</span>
                <strong style={{ color: '#EF4444' }}>${underpaidInfo?.received?.toFixed(2)} USD</strong>
              </div>
            </div>

            <div className="contact-merchant-notice mt-24">
              <span>⚠️ Your transaction has been logged on-chain. Please copy your invoice ID and contact support immediately to have your balance updated manually.</span>
            </div>

            <div className="invoice-meta mt-16" style={{ alignSelf: 'stretch' }}>
              <span>Invoice ID: <b style={{ fontFamily: 'monospace' }}>CPAY-{data.session_id ? data.session_id.substring(0,10).toUpperCase() : '—'}</b></span>
            </div>

            <a href={merchantUrl} target="_blank" rel="noreferrer" className="btn-primary mt-24" style={{ width: '100%', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              Contact Merchant Support
            </a>
          </div>
        )}
      </>

      <div className="processing-disclosure">
        Funds are sent directly to the merchant destination shown in this payment request. ClusterPay verifies the transfer and does not hold customer cryptocurrency.
      </div>
      <div className="gateway-trust-footer">
        Payment processing by <strong>ClusterPay</strong>
      </div>
    </div>
  );
}
