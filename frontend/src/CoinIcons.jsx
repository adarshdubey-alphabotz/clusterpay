import React from 'react';

// ═════════════════════════════════════════════════════════════════════
// 100% OFFICIAL CRYPTOCURRENCY ASSETS (CRISP BRAND VECTORS & CDNs)
// ═════════════════════════════════════════════════════════════════════

const COIN_IMAGES = {
  USDT: "https://assets.coingecko.com/coins/images/325/large/Tether.png",
  TON: "https://assets.coingecko.com/coins/images/17980/large/ton_symbol.png",
  BNB: "https://assets.coingecko.com/coins/images/825/large/bnb-icon2_2x.png",
  BTC: "https://assets.coingecko.com/coins/images/1/large/bitcoin.png",
  LTC: "https://assets.coingecko.com/coins/images/2/large/litecoin.png",
  POL: "https://assets.coingecko.com/coins/images/4713/large/polygon.png",
  TRX: "https://assets.coingecko.com/coins/images/1094/large/tron-logo.png",
  ARB: "https://assets.coingecko.com/coins/images/16547/large/arbitrum_logo.png"
};

// 1. Tether USDT
export const UsdtIcon = ({ className = "w-6 h-6" }) => (
  <img 
    src={COIN_IMAGES.USDT} 
    alt="USDT" 
    className={`${className} rounded-full object-contain`} 
    onError={(e) => {
      e.target.onerror = null;
      e.target.src = "https://cryptologos.cc/logos/tether-usdt-logo.png";
    }}
  />
);

// 2. Binance Smart Chain BNB
export const BnbIcon = ({ className = "w-6 h-6" }) => (
  <img 
    src={COIN_IMAGES.BNB} 
    alt="BNB" 
    className={`${className} rounded-full object-contain`}
    onError={(e) => {
      e.target.onerror = null;
      e.target.src = "https://cryptologos.cc/logos/bnb-bnb-logo.png";
    }}
  />
);

// 3. Toncoin TON
export const TonIcon = ({ className = "w-6 h-6" }) => (
  <img 
    src={COIN_IMAGES.TON} 
    alt="TON" 
    className={`${className} rounded-full object-contain`}
    onError={(e) => {
      e.target.onerror = null;
      e.target.src = "https://cryptologos.cc/logos/toncoin-ton-logo.png";
    }}
  />
);

// 4. TRON TRX
export const TrxIcon = ({ className = "w-6 h-6" }) => (
  <img 
    src={COIN_IMAGES.TRX} 
    alt="TRON" 
    className={`${className} rounded-full object-contain`}
    onError={(e) => {
      e.target.onerror = null;
      e.target.src = "https://cryptologos.cc/logos/tron-trx-logo.png";
    }}
  />
);

// 5. Polygon POL / MATIC
export const PolygonIcon = ({ className = "w-6 h-6" }) => (
  <img 
    src={COIN_IMAGES.POL} 
    alt="POL" 
    className={`${className} rounded-full object-contain`}
    onError={(e) => {
      e.target.onerror = null;
      e.target.src = "https://cryptologos.cc/logos/polygon-matic-logo.png";
    }}
  />
);

// 6. Arbitrum ARB
export const ArbitrumIcon = ({ className = "w-6 h-6" }) => (
  <img 
    src={COIN_IMAGES.ARB} 
    alt="ARB" 
    className={`${className} rounded-full object-contain`}
    onError={(e) => {
      e.target.onerror = null;
      e.target.src = "https://cryptologos.cc/logos/arbitrum-arb-logo.png";
    }}
  />
);

// 7. Bitcoin BTC
export const BtcIcon = ({ className = "w-6 h-6" }) => (
  <img 
    src={COIN_IMAGES.BTC} 
    alt="BTC" 
    className={`${className} rounded-full object-contain`}
    onError={(e) => {
      e.target.onerror = null;
      e.target.src = "https://cryptologos.cc/logos/bitcoin-btc-logo.png";
    }}
  />
);

// 8. Litecoin LTC
export const LtcIcon = ({ className = "w-6 h-6" }) => (
  <img 
    src={COIN_IMAGES.LTC} 
    alt="LTC" 
    className={`${className} rounded-full object-contain`}
    onError={(e) => {
      e.target.onerror = null;
      e.target.src = "https://cryptologos.cc/logos/litecoin-ltc-logo.png";
    }}
  />
);

// ── ROUND MINI NETWORK BADGES ──
export const BscBadge = ({ size = 16 }) => (
  <BnbIcon className={`w-[${size}px] h-[${size}px] inline-block shrink-0`} />
);

export const TronBadge = ({ size = 16 }) => (
  <TrxIcon className={`w-[${size}px] h-[${size}px] inline-block shrink-0`} />
);

export const PolygonBadge = ({ size = 16 }) => (
  <PolygonIcon className={`w-[${size}px] h-[${size}px] inline-block shrink-0`} />
);

export const TonBadge = ({ size = 16 }) => (
  <TonIcon className={`w-[${size}px] h-[${size}px] inline-block shrink-0`} />
);

export const LtcBadge = ({ size = 16 }) => (
  <LtcIcon className={`w-[${size}px] h-[${size}px] inline-block shrink-0`} />
);

export const BtcBadge = ({ size = 16 }) => (
  <BtcIcon className={`w-[${size}px] h-[${size}px] inline-block shrink-0`} />
);

export const ArbBadge = ({ size = 16 }) => (
  <ArbitrumIcon className={`w-[${size}px] h-[${size}px] inline-block shrink-0`} />
);

// ═════════════════════════════════════════════════════════════════════
// 3D ISOMETRIC VECTOR GRAPHICS (PREMIUM CLEAN FINTECH)
// ═════════════════════════════════════════════════════════════════════

export const QrCode3DIcon = () => (
  <svg width="44" height="44" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
    <g filter="drop-shadow(0px 6px 12px rgba(37, 99, 235, 0.28))">
      <path d="M28 6L48 16V38L28 48L8 38V16L28 6Z" fill="#2563EB" />
      <path d="M28 6L48 16L28 26L8 16L28 6Z" fill="#60A5FA" />
      <path d="M8 16L28 26V48L8 38V16Z" fill="#1D4ED8" />
      <path d="M28 26L48 16V38L28 48V26Z" fill="#3B82F6" />
      <path d="M22 13L26 15L22 17L18 15L22 13Z" fill="#FFFFFF" />
      <path d="M34 13L38 15L34 17L30 15L34 13Z" fill="#FFFFFF" />
      <path d="M28 17L32 19L28 21L24 19L28 17Z" fill="#FFFFFF" />
      <rect x="31" y="22" width="5" height="5" rx="1" fill="#DBEAFE" transform="skewY(26)" />
      <rect x="39" y="21" width="4" height="4" rx="1" fill="#FFFFFF" transform="skewY(26)" />
      <rect x="31" y="32" width="5" height="5" rx="1" fill="#FFFFFF" transform="skewY(26)" />
      <rect x="38" y="30" width="6" height="6" rx="1" fill="#93C5FD" transform="skewY(26)" />
      <rect x="14" y="22" width="5" height="5" rx="1" fill="#93C5FD" transform="skewY(-26)" />
      <rect x="22" y="23" width="4" height="4" rx="1" fill="#FFFFFF" transform="skewY(-26)" />
      <rect x="14" y="32" width="6" height="6" rx="1" fill="#FFFFFF" transform="skewY(-26)" />
    </g>
  </svg>
);

export const Wallet3DIcon = () => (
  <svg width="44" height="44" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
    <g filter="drop-shadow(0px 6px 12px rgba(59, 130, 246, 0.28))">
      <path d="M10 18C10 14.6863 12.6863 12 16 12H40C43.3137 12 46 14.6863 46 18V38C46 41.3137 43.3137 44 40 44H16C12.6863 44 10 41.3137 10 38V18Z" fill="url(#wGradBody)" />
      <path d="M12 18C12 15.7909 13.7909 14 16 14H40C42.2091 14 44 15.7909 44 18V20H12V18Z" fill="#93C5FD" />
      <path d="M10 24C10 24 22 28 28 28C34 28 46 24 46 24V38C46 41.3137 43.3137 44 40 44H16C12.6863 44 10 41.3137 10 38V24Z" fill="url(#wGradFlap)" />
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

export const Crystal3DIcon = () => (
  <svg width="44" height="44" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
    <g filter="drop-shadow(0px 6px 12px rgba(139, 92, 246, 0.32))">
      <path d="M28 6L14 26L28 32V6Z" fill="#818CF8" />
      <path d="M28 6L42 26L28 32V6Z" fill="#C084FC" />
      <path d="M28 6L21 28L28 32L35 28L28 6Z" fill="#A5B4FC" opacity="0.9" />
      <path d="M28 50L14 28L28 32V50Z" fill="#6366F1" />
      <path d="M28 50L42 28L28 32V50Z" fill="#9333EA" />
      <path d="M28 50L21 30L28 32L35 30L28 50Z" fill="#4F46E5" opacity="0.95" />
    </g>
  </svg>
);

export const PaperReceiptGraphic = () => (
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

export const Shield3DIcon = ({ size = 96 }) => (
  <svg width={size} height={size} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="shieldGrad" x1="20" y1="10" x2="100" y2="110" gradientUnits="userSpaceOnUse">
        <stop stopColor="#3B82F6" />
        <stop offset="0.6" stopColor="#1D4ED8" />
        <stop offset="1" stopColor="#1E3A8A" />
      </linearGradient>
      <linearGradient id="shieldGlow" x1="60" y1="15" x2="60" y2="105" gradientUnits="userSpaceOnUse">
        <stop stopColor="#60A5FA" stopOpacity="0.8" />
        <stop offset="1" stopColor="#1D4ED8" stopOpacity="0" />
      </linearGradient>
      <filter id="shieldShadow" x="10" y="5" width="100" height="110" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
        <feDropShadow dx="0" dy="8" stdDeviation="10" floodColor="#1E40AF" floodOpacity="0.35" />
      </filter>
    </defs>
    <g filter="url(#shieldShadow)">
      <path d="M60 14L22 30V62C22 84.5 38.2 101.5 60 106C81.8 101.5 98 84.5 98 62V30L60 14Z" fill="url(#shieldGrad)" />
      <path d="M60 18L26 32V62C26 81.5 40.5 97.5 60 101.5C79.5 97.5 94 81.5 94 62V32L60 18Z" stroke="url(#shieldGlow)" strokeWidth="2" fill="none" opacity="0.6" />
      {/* Sleek 1/Shield emblem */}
      <path d="M52 44L68 34V86H56V48L52 51V44Z" fill="#FFFFFF" opacity="0.95" />
      <path d="M46 86H74V90H46V86Z" fill="#FFFFFF" opacity="0.8" />
    </g>
  </svg>
);

export const Spinning3DCoin = ({ size = 110 }) => (
  <div className="spinning-coin-wrapper" style={{ width: size, height: size }}>
    <div className="spinning-coin-glow"></div>
    <div className="spinning-coin-mesh">
      <div className="coin-face coin-front">
        <div className="coin-inner-ring">
          <span className="coin-symbol">⚡</span>
        </div>
      </div>
      <div className="coin-face coin-back">
        <div className="coin-inner-ring">
          <span className="coin-symbol">CP</span>
        </div>
      </div>
    </div>
  </div>
);


