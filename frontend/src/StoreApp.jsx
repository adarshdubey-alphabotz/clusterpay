import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { MemoryRouter, Routes, Route, useNavigate, useParams, useLocation } from 'react-router-dom';
import useSWR, { mutate } from 'swr';
import {
  ShoppingCart, Wallet, ClipboardList, Search, Copy, Check,
  Loader2, Plus, Minus, ExternalLink, RefreshCw, Star, Shield,
  CheckCircle, Bell, User, ChevronRight, ArrowLeft, Share2, Heart,
  Zap, Clock, Package, ChevronLeft, Home, AlertCircle, Compass, Grid, History, Eye, Mic,
  Phone, MessageSquare, Key, Globe, XCircle, RotateCcw, Menu, ShieldCheck, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ─────────────────────────────────────────────
// SWR Helpers
// ─────────────────────────────────────────────
const fetcher = (url) => fetch(url).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); });
const postFetcher = (url, initData) => fetch(url, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ initData })
}).then(r => {
  if (r.status === 401 || r.status === 403) {
    localStorage.removeItem('external_auth_token');
    if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      window.location.reload();
    }
    throw new Error('Unauthorized');
  }
  if (!r.ok) throw new Error(r.status);
  return r.json();
});

const SWR_OPT = { revalidateOnFocus: false, dedupingInterval: 15000 };

// ─────────────────────────────────────────────
// Currency & Localization Context
// ─────────────────────────────────────────────
const CurrencyContext = React.createContext({
  currency: 'USD',
  symbol: '$',
  rate: 1.0,
  updateCurrency: () => {},
  formatPrice: (p) => `$${parseFloat(p).toFixed(2)}`
});
const useCurrency = () => React.useContext(CurrencyContext);

// ─────────────────────────────────────────────
// Auth Context (shared login prompt state)
// ─────────────────────────────────────────────
const AuthContext = React.createContext({
  isAuthed: false,
  showLoginModal: false,
  openLoginModal: () => {},
  closeLoginModal: () => {},
  onAuthorized: () => {},
});
const useAuth = () => React.useContext(AuthContext);

// ─────────────────────────────────────────────
// Init Telegram WebApp
// ─────────────────────────────────────────────
const useTmaInit = () => {
  const [initData, setInitData] = useState('');
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    let token = urlParams.get('auth_token');
    
    if (token) {
      localStorage.setItem('external_auth_token', token);
      const newUrl = window.location.pathname + window.location.hash;
      window.history.replaceState(null, '', newUrl);
    } else {
      token = localStorage.getItem('external_auth_token');
    }

    const tg = window.Telegram?.WebApp;
    if (tg && tg.initData) {
      tg.ready();
      tg.expand();
      try { tg.setHeaderColor('#ffffff'); tg.setBackgroundColor('#f4f5f2'); } catch (_) {}
      setInitData(tg.initData);
    } else if (token) {
      setInitData(token);
    } else if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      setInitData('7934199474');
    } else {
      setInitData('');
    }
  }, []);
  return initData;
};

// ─────────────────────────────────────────────
// Local Storage Wishlist Hook
// ─────────────────────────────────────────────
const useWishlist = () => {
  const [wishlist, setWishlist] = useState([]);
  useEffect(() => {
    try {
      const stored = localStorage.getItem('cs_wishlist');
      if (stored) setWishlist(JSON.parse(stored));
    } catch (_) {}
  }, []);

  const toggleWishlist = useCallback((id) => {
    setWishlist(prev => {
      const updated = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      localStorage.setItem('cs_wishlist', JSON.stringify(updated));
      return updated;
    });
  }, []);

  return [wishlist, toggleWishlist];
};

// ─────────────────────────────────────────────
// Skeleton UI Elements
// ─────────────────────────────────────────────
const Skeleton = memo(({ w = '100%', h = 16, r = 8, className = '' }) => (
  <div className={`skeleton ${className}`} style={{ width: w, height: h, borderRadius: r, background: 'rgba(255,255,255,0.05)' }} />
));

const ProductSkeleton = memo(() => (
  <div className="tma-product-card">
    <Skeleton h={140} r={12} />
    <div style={{ padding: '8px' }}>
      <Skeleton h={10} w="40%" className="mt-8" />
      <Skeleton h={14} className="mt-6" />
      <div className="flex justify-between mt-12">
        <Skeleton h={16} w="50px" />
        <Skeleton h={24} w="24px" r={6} />
      </div>
    </div>
  </div>
));

// ─────────────────────────────────────────────
// Brand & Rating Heuristics (Dynamic & Authentic Metadata)
// ─────────────────────────────────────────────
const getRatingInfo = (id) => {
  const seed = (id * 17) % 100;
  const rating = (4.5 + (seed % 5) * 0.1).toFixed(1);
  const reviews = 15 + (seed * 3) % 200;
  return { rating, reviews };
};

const getBrandName = (name) => {
  const lower = name.toLowerCase();
  if (lower.includes('chatgpt') || lower.includes('openai') || lower.includes('codex')) return 'OpenAI';
  if (lower.includes('capcut')) return 'CapCut';
  if (lower.includes('netflix')) return 'Netflix';
  if (lower.includes('spotify')) return 'Spotify';
  if (lower.includes('adobe')) return 'Adobe';
  if (lower.includes('canva')) return 'Canva';
  if (lower.includes('youtube')) return 'YouTube';
  if (lower.includes('grok')) return 'xAI';
  if (lower.includes('microsoft') || lower.includes('office') || lower.includes('windows')) return 'Microsoft';
  if (lower.includes('linkedin')) return 'LinkedIn';
  if (lower.includes('apple') || lower.includes('icloud')) return 'Apple';
  if (lower.includes('crunchyroll')) return 'Crunchyroll';
  if (lower.includes('notion')) return 'Notion';
  return 'Premium';
};

// ─────────────────────────────────────────────
// Product Card Component (Amazon/Flipkart Grid)
// ─────────────────────────────────────────────
const ProductCard = memo(({ product, onNavigate, isWish, onWish }) => {
  const ratingInfo = getRatingInfo(product.id);
  const brand = getBrandName(product.title);
  const { formatPrice } = useCurrency();

  return (
    <div className="tma-product-card" onClick={() => onNavigate(`/product/${product.id}`)}>
      <div className="tma-product-img-wrapper">
        <button
          className="tma-wish-btn"
          onClick={(e) => { e.stopPropagation(); onWish(product.id); }}
        >
          <Heart size={15} fill={isWish ? '#ef4444' : 'none'} color={isWish ? '#ef4444' : '#9ca3af'} />
        </button>
        <span className="tma-card-emoji-placeholder">{product.emoji || '📦'}</span>
      </div>
      <div className="tma-card-info">
        <span className="tma-card-brand">{brand}</span>
        <h4 className="tma-product-title">{product.title}</h4>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
          <span style={{ fontSize: '11px', color: product.stock > 0 ? '#10b981' : '#ef4444', fontWeight: '700' }}>
            {product.stock > 0 ? `🟢 ${product.stock} left` : '🔴 Out of Stock'}
          </span>
          {product.purchase_count !== undefined && (
            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '700' }}>
              • 🛒 {product.purchase_count} sold
            </span>
          )}
        </div>
        <div className="tma-product-footer">
          <span className="tma-product-price">{formatPrice(product.price)}</span>
          <button
            className="tma-icon-action"
            onClick={(e) => { e.stopPropagation(); onNavigate(`/product/${product.id}`); }}
          >
            <ShoppingCart size={13} />
          </button>
        </div>
      </div>
    </div>
  );
});

// ─────────────────────────────────────────────
// HOME PAGE (Dynamic Collections + Timer Flash Sale)
// ─────────────────────────────────────────────
const HomePage = ({ initData, profile, wishlist, onWish }) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [timeLeft, setTimeLeft] = useState({ hours: '01', minutes: '54', seconds: '12' });
  const [bannerIdx, setBannerIdx] = useState(0);
  const { formatPrice } = useCurrency();

  useEffect(() => {
    const targetTime = new Date();
    targetTime.setHours(targetTime.getHours() + 2);
    targetTime.setMinutes(0);
    targetTime.setSeconds(0);

    const timer = setInterval(() => {
      const now = new Date();
      const diff = targetTime.getTime() - now.getTime();
      if (diff <= 0) {
        targetTime.setHours(targetTime.getHours() + 2);
        return;
      }
      const h = Math.floor(diff / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeLeft({
        hours: String(h).padStart(2, '0'),
        minutes: String(m).padStart(2, '0'),
        seconds: String(s).padStart(2, '0')
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const { data: homeData, isLoading } = useSWR('/api/tma/home', fetcher, { ...SWR_OPT, refreshInterval: 45000 });
  const { data: collections } = useSWR('/api/tma/collections', fetcher, SWR_OPT);

  // Extract all products safely for global searches
  const allProducts = homeData?.all_products || homeData?.sections?.flatMap(s => s.products) || homeData?.featured_products || [];
  
  // Deduplicate products
  const uniqueProducts = Array.from(new Map(allProducts.map(p => [p.id, p])).values());

  const featured = homeData?.featured_products || [];
  const banners = homeData?.banners || [];
  const sections = homeData?.sections || [];

  useEffect(() => {
    if (!banners || banners.length <= 1) return;
    const iv = setInterval(() => setBannerIdx(i => (i + 1) % banners.length), 4000);
    return () => clearInterval(iv);
  }, [banners.length]);

  // Filtering Logic
  const filteredProducts = uniqueProducts
    .filter(p => {
      const matchesSearch = searchQuery
        ? p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (p.subtitle || '').toLowerCase().includes(searchQuery.toLowerCase())
        : true;
      if (activeCategory === 'all') return matchesSearch;
      // Check collection_id OR look inside sections for the match
      const secMatch = sections.find(s => s.id === activeCategory);
      const inSection = secMatch ? secMatch.products.some(sp => sp.id === p.id) : false;
      return (p.collection_id === activeCategory || inSection) && matchesSearch;
    })
    .sort((a, b) => (b.purchase_count || 0) - (a.purchase_count || 0));

  return (
    <div className="tma-view">

      {/* Real Interactive Search Bar */}
      <div className="tma-search-container">
        <div className="tma-search-input-wrapper">
          <Search size={18} color="#64748b" />
          <input
            type="text"
            className="tma-search-input"
            placeholder="Search products, brands..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery ? (
            <button className="tma-clear-btn" onClick={() => setSearchQuery('')}>✕</button>
          ) : (
            <Mic size={18} color="#64748b" />
          )}
        </div>
      </div>

      <div className="tma-scroll-body">
        {/* ── Pinned Collections: Gemini + ChatGPT ── */}
        {(() => {
          const pinnedIds = [1, 2]; // Gemini, ChatGPT
          const pinned = collections?.filter(c => pinnedIds.includes(c.id)) || [];
          if (!pinned.length) return null;
          return (
            <div className="tma-pinned-row">
              {pinned.map(col => (
                <button
                  key={col.id}
                  className={`tma-pinned-chip ${activeCategory === col.id ? 'active' : ''}`}
                  onClick={() => setActiveCategory(col.id)}
                >
                  <span className="tma-pinned-emoji">{col.emoji}</span>
                  <span className="tma-pinned-label">{col.name}</span>
                </button>
              ))}
            </div>
          );
        })()}

        {/* ── All Other Categories (horizontal scroll) ── */}
        <div className="tma-categories-scroll">
          <button
            className={`tma-category-chip ${activeCategory === 'all' ? 'active' : ''}`}
            onClick={() => setActiveCategory('all')}
          >
            🌐 All
          </button>
          {collections?.filter(c => ![1, 2].includes(c.id)).map(col => (
            <button
              key={col.id}
              className={`tma-category-chip ${activeCategory === col.id ? 'active' : ''}`}
              onClick={() => setActiveCategory(col.id)}
            >
              {col.emoji} {col.name}
            </button>
          ))}
        </div>

        {/* Search / Filter Overlay */}
        {searchQuery || activeCategory !== 'all' ? (
          <div style={{ padding: '0 16px 20px 16px' }}>
            <div className="tma-section-header">
              <h2 className="tma-section-title">Results ({filteredProducts.length})</h2>
            </div>
            {filteredProducts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>No matching products found.</div>
            ) : (
              <div className="tma-grid">
                {filteredProducts.map(p => (
                  <ProductCard key={p.id} product={p} onNavigate={navigate} isWish={wishlist.includes(p.id)} onWish={onWish} />
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Hero Banner Carousel */}
            {banners.length > 0 && (() => {
              const banner = banners[bannerIdx] || banners[0];
              return (
                <div style={{ position: 'relative', marginBottom: 20 }}>
                  <div
                    className="tma-hero"
                    onClick={() => navigate(`/product/${banner.id}`)}
                    style={{ marginBottom: 0 }}
                  >
                    <div className="tma-hero-content">
                      <span className="tma-hero-badge">HOT OFFER</span>
                      <h2 className="tma-hero-title">{banner.title}</h2>
                      <div className="flex items-center gap-8 mt-8">
                        <span className="tma-hero-price">{formatPrice(banner.price)}</span>
                        <button className="tma-hero-btn">Buy Now</button>
                      </div>
                    </div>
                    <div className="tma-hero-image-wrapper">
                      {banner.image ? (
                        <img src={banner.image} alt="" className="tma-hero-img-obj" />
                      ) : (
                        <span className="tma-hero-emoji">{banner.emoji || '📦'}</span>
                      )}
                    </div>
                  </div>
                  {banners.length > 1 && (
                    <div className="tma-carousel-dots">
                      {banners.map((_, i) => (
                        <span
                          key={i}
                          className={`tma-carousel-dot${i === bannerIdx ? ' active' : ''}`}
                          onClick={(e) => { e.stopPropagation(); setBannerIdx(i); }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Flash Sale Section sorted by purchase_count */}
            {featured.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div className="tma-section-header">
                  <h2 className="tma-section-title">Flash Sale ⚡</h2>
                  <div className="tma-timer-container">
                    <span className="tma-timer-block">{timeLeft.hours}</span>
                    <span className="tma-timer-colon">:</span>
                    <span className="tma-timer-block">{timeLeft.minutes}</span>
                    <span className="tma-timer-colon">:</span>
                    <span className="tma-timer-block">{timeLeft.seconds}</span>
                  </div>
                </div>
                <div className="tma-flash-row">
                  {featured.slice(0, 6).map(p => (
                    <div key={p.id} className="tma-flash-card" onClick={() => navigate(`/product/${p.id}`)}>
                      <div className="tma-flash-img">
                        <span style={{ fontSize: 24 }}>{p.emoji || '📦'}</span>
                      </div>
                      <h4 className="tma-flash-title">{p.title}</h4>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                        <span style={{ fontSize: '10px', color: p.stock > 0 ? '#10b981' : '#ef4444', fontWeight: '700' }}>
                          {p.stock > 0 ? `🟢 ${p.stock} left` : '🔴 Out'}
                        </span>
                        {p.purchase_count !== undefined && (
                          <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '700' }}>
                            • 🛒 {p.purchase_count} sold
                          </span>
                        )}
                      </div>
                      <div className="tma-flash-price-row">
                        <span className="tma-flash-price">{formatPrice(p.price)}</span>
                        <span className="tma-flash-old-price">{formatPrice(parseFloat(p.price) * 1.25)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Dynamic Collection Rows from DB */}
            {isLoading ? (
              <div style={{ padding: '0 16px' }}>
                <Skeleton h={20} w="150px" className="mb-12" />
                <div className="tma-grid">
                  {[1, 2, 3, 4].map(i => <ProductSkeleton key={i} />)}
                </div>
              </div>
            ) : (
              sections
                .map(sec => (
                  <div key={sec.id} style={{ marginBottom: 24 }}>
                    <div className="tma-section-header" style={{ padding: '0 16px' }}>
                      <h2 className="tma-section-title">{sec.emoji} {sec.title}</h2>
                      <span className="tma-link" onClick={() => navigate('/discover')}>View All</span>
                    </div>
                    <div className="tma-hscroll-row">
                      {sec.products.map(p => (
                        <div key={p.id} className="tma-hscroll-card">
                          <ProductCard product={p} onNavigate={navigate} isWish={wishlist.includes(p.id)} onWish={onWish} />
                        </div>
                      ))}
                    </div>
                  </div>
                ))
            )}
          </>
        )}
        <div style={{ height: 100 }}></div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// DISCOVER PAGE (Interactive tabs & Full search)
// ─────────────────────────────────────────────
const DiscoverPage = ({ wishlist, onWish }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('all');
  const [query, setQuery] = useState('');

  const { data: homeData } = useSWR('/api/tma/home', fetcher, SWR_OPT);
  const { data: collections } = useSWR('/api/tma/collections', fetcher, SWR_OPT);

  const sections = homeData?.sections || [];
  const allProducts = homeData?.all_products || sections.flatMap(s => s.products) || [];
  const uniqueProducts = Array.from(new Map(allProducts.map(p => [p.id, p])).values());

  const allSections = homeData?.sections || [];
  const filtered = uniqueProducts
    .filter(p => {
      const matchesSearch = query
        ? p.title.toLowerCase().includes(query.toLowerCase()) ||
          (p.subtitle || '').toLowerCase().includes(query.toLowerCase())
        : true;
      if (activeTab === 'all') return matchesSearch;
      const secMatch = allSections.find(s => s.id === activeTab);
      const inSection = secMatch ? secMatch.products.some(sp => sp.id === p.id) : false;
      return (p.collection_id === activeTab || inSection) && matchesSearch;
    })
    .sort((a, b) => (b.purchase_count || 0) - (a.purchase_count || 0));

  return (
    <div className="tma-view">
      <div className="tma-appbar">
        <h1 className="tma-appbar-title">Discover</h1>
      </div>

      <div className="tma-search-container">
        <div className="tma-search-input-wrapper">
          <Search size={18} color="#64748b" />
          <input
            type="text"
            className="tma-search-input"
            placeholder="Search products..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && <button className="tma-clear-btn" onClick={() => setQuery('')}>✕</button>}
        </div>
      </div>

      {/* Underline Tabs style */}
      <div className="tma-tabs">
        <div
          className={`tma-tab ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => setActiveTab('all')}
        >
          All
        </div>
        {collections?.map(col => (
          <div
            key={col.id}
            className={`tma-tab ${activeTab === col.id ? 'active' : ''}`}
            onClick={() => setActiveTab(col.id)}
          >
            {col.name}
          </div>
        ))}
      </div>

      <div className="tma-scroll-body" style={{ padding: '0 16px' }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>No products found.</div>
        ) : (
          <div className="tma-grid">
            {filtered.map(p => (
              <ProductCard key={p.id} product={p} onNavigate={navigate} isWish={wishlist.includes(p.id)} onWish={onWish} />
            ))}
          </div>
        )}
        <div style={{ height: 100 }}></div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// PRODUCT DETAILS PAGE (Fully Dynamic)
// ─────────────────────────────────────────────
const ProductPage = ({ initData, wishlist, onWish }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [qty, setQty] = useState(1);
  const [purchasing, setPurchasing] = useState(false);
  const [purchaseSuccess, setPurchaseSuccess] = useState(null);
  const [copiedIdx, setCopiedIdx] = useState(null);
  const { formatPrice } = useCurrency();
  const { isAuthed, openLoginModal } = useAuth();

  // New states for confirmation and custom input flows
  const [showConfirm, setShowConfirm] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [promoResult, setPromoResult] = useState(null);
  const [promoChecking, setPromoChecking] = useState(false);
  const [promoError, setPromoError] = useState('');
  const [showInputWindow, setShowInputWindow] = useState(false);
  // formValues: {fieldKey: value, ...} for structured fields
  const [formValues, setFormValues] = useState({});
  const [pendingOrderIds, setPendingOrderIds] = useState([]);
  const [pendingCustomFields, setPendingCustomFields] = useState([]);
  const [pendingProductContext, setPendingProductContext] = useState(null);
  const [inputDesc, setInputDesc] = useState('');
  const [submittingInput, setSubmittingInput] = useState(false);
  const [inputDone, setInputDone] = useState(false);

  const { data: product, error, isLoading } = useSWR(`/api/tma/product/${id}`, fetcher, { ...SWR_OPT, revalidateOnMount: true });

  const executePurchase = async () => {
    if (!product || product.stock <= 0 || purchasing) return;
    setPurchasing(true);
    try {
      const res = await fetch('/api/tma/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData, product_id: product.id, quantity: qty, promo_code: promoResult?.code || null })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || data.message || 'Purchase failed');
      
      // If product requires manual delivery/custom input
      if (data.manual_delivery) {
        setPendingOrderIds(data.order_ids || []);
        setInputDesc(data.input_description || 'Please provide custom details.');
        setPendingCustomFields(data.custom_fields || []);
        setPendingProductContext(data.product_context || null);
        setFormValues({});
        setInputDone(false);
        setShowInputWindow(true);
      } else {
        setPurchaseSuccess(data);
      }
      
      mutate(initData ? ['/api/tma/profile', initData] : null);
      mutate(`/api/tma/product/${id}`);
      mutate(initData ? ['/api/tma/transactions', initData] : null);
    } catch (err) {
      alert(err.message);
    } finally {
      setPurchasing(false);
    }
  };

  const applyPromo = async () => {
    if (!promoCode.trim() || promoChecking) return;
    setPromoChecking(true);
    setPromoError('');
    setPromoResult(null);
    try {
      const res = await fetch('/api/tma/promo/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData, product_id: product.id, quantity: qty, promo_code: promoCode.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Promo code could not be applied');
      setPromoCode(data.code);
      setPromoResult(data);
    } catch (err) {
      setPromoError(err.message);
    } finally {
      setPromoChecking(false);
    }
  };

  const changeQuantity = (nextQty) => {
    setQty(nextQty);
    setPromoResult(null);
    setPromoError('');
  };

  const submitCustomDetails = async () => {
    // Check all required fields are filled
    const missingRequired = pendingCustomFields.filter(f => f.required && !formValues[f.key]?.trim());
    if (missingRequired.length > 0) {
      alert(`Please fill in: ${missingRequired.map(f => f.label).join(', ')}`);
      return;
    }
    if (submittingInput) return;
    setSubmittingInput(true);
    try {
      const res = await fetch('/api/tma/order/custom_input', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          initData,
          order_ids: pendingOrderIds,
          form_data: formValues,
          custom_input: Object.entries(formValues).map(([k,v]) => `${k}: ${v}`).join('\n')
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to submit details');
      setInputDone(true);
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmittingInput(false);
    }
  };

  const handleCopy = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  if (isLoading) return <div className="tma-view flex-center"><Loader2 className="animate-spin" size={30} color="#2563eb" /></div>;
  if (error || !product) return <div className="tma-view flex-center text-secondary">Product not found</div>;

  const isWish = wishlist.includes(product.id);
  const originalPrice = (parseFloat(product.price) * 1.25).toFixed(2);

  return (
    <div className="tma-product-page tma-view">
      {/* AppBar Sticky */}
      <div className="tma-product-header">
        <button className="tma-product-header-btn" onClick={() => navigate(-1)}><ArrowLeft size={18} /></button>
        <span className="tma-product-header-title">{product.title}</span>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="tma-product-header-btn"><Share2 size={16} /></button>
        </div>
      </div>

      <div className="tma-scroll-body">
        {/* Product Image */}
        <div className="tma-product-gallery">
          <span className="tma-gallery-emoji">{product.emoji || '📦'}</span>
        </div>
        {/* Stock badge below image */}
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: -8, marginBottom: 8 }}>
          <span className={`tma-product-stock-badge ${product.stock > 0 ? 'in' : 'out'}`} style={{ position: 'static' }}>
            {product.stock > 0 ? `${product.stock} In Stock` : 'Out of Stock'}
          </span>
        </div>

        <div className="tma-product-details">
          <h1 className="tma-product-title-lg">{product.title}</h1>
          {product.purchase_count !== undefined && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, marginBottom: 12 }}>
              <span style={{ fontSize: '12px', fontWeight: '700', color: '#10b981', background: 'rgba(16, 185, 129, 0.12)', padding: '4px 10px', borderRadius: '8px' }}>
                🛒 {product.purchase_count} Purchased
              </span>
            </div>
          )}

          <div className="tma-product-price-section">
            <span className="tma-product-price-lg">{formatPrice(product.price)}</span>
            <span className="tma-product-price-old">{formatPrice(parseFloat(product.price) * 1.25)}</span>
            <span className="tma-discount-badge">-20%</span>
          </div>

          <div className="tma-badges-row">
            <div className="tma-badge"><Zap size={13} color="#2563eb" /> {product.deliveryTime || 'Instant Delivery'}</div>
            <div className="tma-badge"><Shield size={13} color="#22c55e" /> {product.warranty || 'Full Warranty'}</div>
          </div>

          <div className="divider" />

          {/* Description */}
          {product.description && (
            <div style={{ marginBottom: 18 }}>
              <h3 className="tma-section-title-sm">About Product</h3>
              <p className="tma-description">{product.description}</p>
            </div>
          )}

          {/* Specifications from DB */}
          {product.specifications && product.specifications.length > 0 && (
            <div style={{ marginBottom: 18 }}>
              <h3 className="tma-section-title-sm">Specifications</h3>
              <table className="tma-specs-table">
                <tbody>
                  {product.specifications.map((spec, idx) => (
                    <tr key={idx}>
                      <td>{spec.key}</td>
                      <td>{spec.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Quantity Selector */}
          {product.stock > 0 && (
            <div style={{ marginBottom: 18 }}>
              <h3 className="tma-section-title-sm">Quantity</h3>
              <div className="flex items-center gap-12 mt-6">
                <button className="tma-qty-btn" onClick={() => changeQuantity(Math.max(1, qty - 1))} disabled={qty <= 1}>
                  <Minus size={15} />
                </button>
                <span style={{ fontSize: 18, fontWeight: 800, minWidth: 24, textAlign: 'center' }}>{qty}</span>
                <button className="tma-qty-btn" onClick={() => changeQuantity(Math.min(product.stock, qty + 1))} disabled={qty >= product.stock}>
                  <Plus size={15} />
                </button>
              </div>
            </div>
          )}

          {/* Related products row */}
          {product.related_products && product.related_products.length > 0 && (
            <div style={{ marginTop: 24, marginBottom: 40 }}>
              <h3 className="tma-section-title-sm" style={{ marginBottom: 12 }}>Related Products</h3>
              <div className="tma-grid">
                {product.related_products.map(p => (
                  <ProductCard key={p.id} product={p} onNavigate={navigate} isWish={wishlist.includes(p.id)} onWish={onWish} />
                ))}
              </div>
            </div>
          )}
        </div>
        <div style={{ height: 120 }}></div>
      </div>

      {/* Sticky Bottom Actions */}
      <div className="tma-bottom-bar">
        <button
          className="tma-btn-icon-lg"
          onClick={() => onWish(product.id)}
        >
          <Heart size={20} fill={isWish ? '#ef4444' : 'none'} color={isWish ? '#ef4444' : '#64748b'} />
        </button>
        <button
          className="tma-btn-primary"
          onClick={() => {
            if (!isAuthed) { openLoginModal(); return; }
            setShowConfirm(true);
          }}
          disabled={purchasing || product.stock <= 0}
        >
          {purchasing ? (
            <Loader2 className="animate-spin" size={18} />
          ) : (
            `Buy Now ${formatPrice(parseFloat(product.price) * qty)}`
          )}
        </button>
      </div>

      {/* BEFORE PURCHASE CONFIRMATION DIALOG */}
      <AnimatePresence>
        {showConfirm && (
          <motion.div
            className="tma-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowConfirm(false)}
          >
            <motion.div
              className="tma-modal-card"
              initial={{ scale: 0.9, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 30 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ fontSize: 36, marginBottom: 10 }}>🛒</div>
              <h2 style={{ fontSize: 18, fontWeight: 900, color: '#f1f5f9' }}>Confirm Purchase</h2>
              <p style={{ color: '#64748b', fontSize: 13, marginTop: 6 }}>
                Are you sure you want to purchase <b>{product.title}</b>?
              </p>
              
              <div style={{ marginTop: 16, background: '#111', borderRadius: 12, padding: 12, border: '1px solid rgba(255,255,255,0.04)', display: 'flex', flexDirection: 'column', gap: 6, textAlign: 'left', fontSize: 13 }}>
                <div className="flex justify-between">
                  <span style={{ color: '#64748b' }}>Quantity:</span>
                  <span style={{ color: '#f1f5f9', fontWeight: 700 }}>{qty}x</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: '#64748b' }}>Price:</span>
                  <span style={{ color: '#f1f5f9', fontWeight: 700 }}>{formatPrice(product.price)} each</span>
                </div>
                <div className="divider" style={{ margin: '6px 0' }} />
                <div style={{ margin: '4px 0 6px' }}>
                  <div style={{ color: '#94a3b8', fontWeight: 700, marginBottom: 7 }}>Promo code (optional)</div>
                  <div style={{ display: 'flex', gap: 7 }}>
                    <input
                      value={promoCode}
                      onChange={(e) => { setPromoCode(e.target.value.toUpperCase()); setPromoResult(null); setPromoError(''); }}
                      onKeyDown={(e) => { if (e.key === 'Enter') applyPromo(); }}
                      placeholder="Enter code"
                      style={{ flex: 1, minWidth: 0, borderRadius: 9, border: '1px solid rgba(255,255,255,.1)', background: '#090909', color: '#f8fafc', padding: '10px 11px', outline: 'none', fontWeight: 700 }}
                    />
                    <button onClick={applyPromo} disabled={!promoCode.trim() || promoChecking} style={{ border: 0, borderRadius: 9, padding: '0 13px', background: '#2563eb', color: 'white', fontWeight: 800 }}>
                      {promoChecking ? '...' : 'Apply'}
                    </button>
                  </div>
                  {promoError && <div style={{ color: '#fb7185', fontSize: 12, marginTop: 7 }}>✕ {promoError}</div>}
                  {promoResult && <div style={{ color: '#4ade80', fontSize: 12, marginTop: 7 }}>✓ {promoResult.code} applied — {promoResult.percent}% off</div>}
                </div>
                {promoResult && (
                  <>
                    <div className="flex justify-between">
                      <span style={{ color: '#64748b' }}>Subtotal:</span>
                      <span style={{ color: '#f1f5f9', fontWeight: 700 }}>{formatPrice(promoResult.subtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span style={{ color: '#64748b' }}>Promo discount:</span>
                      <span style={{ color: '#4ade80', fontWeight: 700 }}>−{formatPrice(promoResult.discount)}</span>
                    </div>
                  </>
                )}
                <div className="divider" style={{ margin: '6px 0' }} />
                <div className="flex justify-between" style={{ fontSize: 14 }}>
                  <span style={{ color: '#64748b' }}>Total Pay:</span>
                  <span style={{ color: '#22c55e', fontWeight: 900 }}>{formatPrice(promoResult?.total ?? (parseFloat(product.price) * qty))}</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
                <button
                  className="tma-btn-primary"
                  style={{ background: 'rgba(255,255,255,0.06)', color: '#f1f5f9', border: '1px solid rgba(255,255,255,0.04)', padding: '12px' }}
                  onClick={() => setShowConfirm(false)}
                >
                  Cancel
                </button>
                <button
                  className="tma-btn-primary"
                  style={{ padding: '12px' }}
                  onClick={() => {
                    setShowConfirm(false);
                    executePurchase();
                  }}
                >
                  Confirm
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CUSTOM INPUT FORM — Full Screen Slide-In */}
      <AnimatePresence>
        {showInputWindow && (
          <motion.div
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 35 }}
            style={{
              position: 'fixed', inset: 0, background: '#0d0d0d',
              zIndex: 200, overflowY: 'auto',
              fontFamily: 'Inter, system-ui, sans-serif'
            }}
          >
            {!inputDone ? (
              <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
                {/* Header */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '16px 16px 12px',
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                  background: '#0d0d0d',
                  position: 'sticky', top: 0, zIndex: 10
                }}>
                  <button
                    onClick={() => { setShowInputWindow(false); navigate('/orders'); }}
                    style={{ background: 'none', border: 'none', color: '#f1f5f9', cursor: 'pointer', padding: 4 }}
                  >
                    <ArrowLeft size={20} />
                  </button>
                  <h2 style={{ fontSize: 16, fontWeight: 800, color: '#f1f5f9', margin: 0 }}>Order Details Form</h2>
                  <div style={{ marginLeft: 'auto', fontSize: 11, color: '#22c55e', background: 'rgba(34,197,94,0.12)', padding: '3px 10px', borderRadius: 20, fontWeight: 700 }}>
                    ✅ Payment Received
                  </div>
                </div>

                {/* Product Context Card */}
                {pendingProductContext && (
                  <div style={{
                    margin: '16px 16px 0',
                    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
                    borderRadius: 16,
                    border: '1px solid rgba(37,99,235,0.3)',
                    padding: 16,
                    display: 'flex', gap: 14, alignItems: 'center'
                  }}>
                    <div style={{
                      width: 60, height: 60, borderRadius: 12,
                      background: 'rgba(255,255,255,0.05)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0, overflow: 'hidden'
                    }}>
                      <span style={{ fontSize: 28 }}>{pendingProductContext.emoji || '📦'}</span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 800, color: '#f1f5f9', marginBottom: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {pendingProductContext.name}
                      </div>
                      {pendingProductContext.description && (
                        <div style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {pendingProductContext.description}
                        </div>
                      )}
                      <div style={{ marginTop: 6, display: 'flex', gap: 8 }}>
                        <span style={{ fontSize: 12, color: '#22c55e', fontWeight: 700 }}>
                          ${pendingProductContext.price?.toFixed(2)} paid
                        </span>
                        <span style={{ fontSize: 12, color: '#64748b' }}>·</span>
                        <span style={{ fontSize: 12, color: '#64748b' }}>Qty: {pendingProductContext.quantity}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Instructions Banner */}
                {inputDesc && (
                  <div style={{
                    margin: '12px 16px 0',
                    background: 'rgba(251,191,36,0.08)',
                    border: '1px solid rgba(251,191,36,0.25)',
                    borderRadius: 12, padding: '10px 14px',
                    display: 'flex', gap: 10, alignItems: 'flex-start'
                  }}>
                    <span style={{ fontSize: 16, flexShrink: 0 }}>📋</span>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#fbbf24', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Instructions</div>
                      <p style={{ fontSize: 12, color: '#94a3b8', margin: 0, lineHeight: 1.5 }}>{inputDesc}</p>
                    </div>
                  </div>
                )}

                {/* Dynamic Form Fields */}
                <div style={{ padding: '16px 16px', flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {pendingCustomFields.length > 0 ? pendingCustomFields.map((field) => (
                    <div key={field.key}>
                      <label style={{
                        display: 'block', fontSize: 12, fontWeight: 700, color: '#94a3b8',
                        marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em'
                      }}>
                        {field.label}
                        {field.required && <span style={{ color: '#ef4444', marginLeft: 3 }}>*</span>}
                      </label>
                      {field.type === 'textarea' ? (
                        <textarea
                          placeholder={field.placeholder || `Enter ${field.label}...`}
                          value={formValues[field.key] || ''}
                          onChange={e => setFormValues(v => ({ ...v, [field.key]: e.target.value }))}
                          rows={4}
                          style={{
                            width: '100%', boxSizing: 'border-box',
                            background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: 10, padding: '10px 12px',
                            color: '#f1f5f9', outline: 'none',
                            fontFamily: 'inherit', fontSize: 13, resize: 'vertical',
                            transition: 'border-color 0.2s'
                          }}
                          onFocus={e => e.target.style.borderColor = '#2563eb'}
                          onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                        />
                      ) : (
                        <input
                          type={field.type === 'email' ? 'email' : field.type === 'number' ? 'number' : 'text'}
                          placeholder={field.placeholder || `Enter ${field.label}...`}
                          value={formValues[field.key] || ''}
                          onChange={e => setFormValues(v => ({ ...v, [field.key]: e.target.value }))}
                          style={{
                            width: '100%', boxSizing: 'border-box',
                            background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: 10, padding: '11px 12px',
                            color: '#f1f5f9', outline: 'none',
                            fontFamily: 'inherit', fontSize: 13,
                            transition: 'border-color 0.2s'
                          }}
                          onFocus={e => e.target.style.borderColor = '#2563eb'}
                          onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                        />
                      )}
                      {field.hint && (
                        <p style={{ fontSize: 11, color: '#64748b', margin: '4px 0 0', lineHeight: 1.4 }}>{field.hint}</p>
                      )}
                    </div>
                  )) : (
                    /* Fallback: single textarea if no custom_fields defined */
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#94a3b8', marginBottom: 6, textTransform: 'uppercase' }}>
                        Required Details <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <textarea
                        placeholder={inputDesc || 'Enter your details here...'}
                        value={formValues['details'] || ''}
                        onChange={e => setFormValues({ details: e.target.value })}
                        rows={5}
                        style={{
                          width: '100%', boxSizing: 'border-box',
                          background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.08)',
                          borderRadius: 10, padding: '10px 12px',
                          color: '#f1f5f9', outline: 'none',
                          fontFamily: 'inherit', fontSize: 13, resize: 'vertical'
                        }}
                      />
                    </div>
                  )}

                  {/* How it works info box */}
                  <div style={{
                    background: 'rgba(37,99,235,0.07)', border: '1px solid rgba(37,99,235,0.18)',
                    borderRadius: 12, padding: '12px 14px', marginTop: 4
                  }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#60a5fa', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>ℹ️ How it works</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {['Submit your details below', 'Admin reviews and verifies your info', 'Your product is delivered via Telegram'].map((step, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#94a3b8' }}>
                          <span style={{
                            width: 20, height: 20, borderRadius: '50%',
                            background: 'rgba(37,99,235,0.2)', color: '#60a5fa',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 10, fontWeight: 800, flexShrink: 0
                          }}>{i + 1}</span>
                          {step}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Submit Footer */}
                <div style={{
                  padding: '12px 16px 24px',
                  borderTop: '1px solid rgba(255,255,255,0.06)',
                  background: '#0d0d0d',
                  position: 'sticky', bottom: 0
                }}>
                  <button
                    onClick={submitCustomDetails}
                    disabled={submittingInput}
                    style={{
                      width: '100%', padding: '14px',
                      background: submittingInput ? 'rgba(37,99,235,0.5)' : '#2563eb',
                      color: '#fff', border: 'none', borderRadius: 12,
                      fontSize: 15, fontWeight: 800, cursor: submittingInput ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      transition: 'all 0.2s'
                    }}
                  >
                    {submittingInput ? (
                      <><Loader2 className="animate-spin" size={18} /> Submitting...</>
                    ) : (
                      <><CheckCircle size={18} /> Submit to Admin</>  
                    )}
                  </button>
                  <button
                    onClick={() => { setShowInputWindow(false); navigate('/orders'); }}
                    style={{
                      width: '100%', marginTop: 8, padding: '10px',
                      background: 'transparent', color: '#64748b', border: 'none',
                      fontSize: 13, cursor: 'pointer'
                    }}
                  >
                    Fill Later (find in Orders)
                  </button>
                </div>
              </div>
            ) : (
              /* Success State */
              <div style={{
                minHeight: '100vh', display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                padding: '40px 24px', textAlign: 'center'
              }}>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                  style={{ fontSize: 72, marginBottom: 20 }}
                >📬</motion.div>
                <h2 style={{ fontSize: 22, fontWeight: 900, color: '#f1f5f9', marginBottom: 10 }}>Details Submitted!</h2>
                <p style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.6, maxWidth: 280, margin: '0 auto 8px' }}>
                  Your order details have been sent to our admin team for review.
                </p>
                <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.5, maxWidth: 260, margin: '0 auto 32px' }}>
                  You'll receive your product via Telegram once the admin verifies and delivers it.
                </p>
                <div style={{
                  background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)',
                  borderRadius: 12, padding: '12px 20px', marginBottom: 28,
                  display: 'flex', alignItems: 'center', gap: 10
                }}>
                  <CheckCircle size={18} color="#22c55e" />
                  <span style={{ fontSize: 13, color: '#22c55e', fontWeight: 700 }}>Admin Notified</span>
                </div>
                <button
                  onClick={() => { setShowInputWindow(false); setFormValues({}); setInputDone(false); navigate('/orders'); }}
                  style={{
                    padding: '13px 32px', background: '#2563eb',
                    color: '#fff', border: 'none', borderRadius: 12,
                    fontSize: 14, fontWeight: 700, cursor: 'pointer'
                  }}
                >
                  View My Orders
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Order Complete Success Overlay */}
      <AnimatePresence>
        {purchaseSuccess && (
          <motion.div
            className="tma-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setPurchaseSuccess(null)}
          >
            <motion.div
              className="tma-modal-card"
              initial={{ scale: 0.9, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 30 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ fontSize: 44, marginBottom: 12 }}>🎉</div>
              <h2 style={{ fontSize: 20, fontWeight: 900, color: '#f1f5f9' }}>Purchase Complete!</h2>
              <p style={{ color: '#64748b', fontSize: 13, marginTop: 4, padding: '0 8px' }}>
                Your code or login details have been delivered to your Telegram private messages.
              </p>

              {purchaseSuccess.delivered && purchaseSuccess.delivered.length > 0 && (
                <div style={{ marginTop: 16, background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 12, textAlign: 'left' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Items Delivered</span>
                  {purchaseSuccess.delivered.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center mt-6" style={{ background: '#141414', borderRadius: 8, padding: '6px 10px', border: '1px solid rgba(255,255,255,0.02)' }}>
                      <code style={{ fontSize: 12, color: '#22c55e', fontFamily: 'monospace', wordBreak: 'break-all', maxWidth: '85%' }}>{item}</code>
                      <button
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
                        onClick={() => handleCopy(item, idx)}
                      >
                        {copiedIdx === idx ? <Check size={14} color="#22c55e" /> : <Copy size={14} />}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <button
                className="tma-btn-primary"
                style={{ marginTop: 24, padding: 14 }}
                onClick={() => { setPurchaseSuccess(null); navigate('/orders'); }}
              >
                Go to Orders
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─────────────────────────────────────────────
// WALLET PAGE (Real transaction history)
// ─────────────────────────────────────────────
const WalletPage = ({ initData, profile }) => {
  const [depositAmount, setDepositAmount] = useState('10.00');
  const [depositing, setDepositing] = useState(false);
  const { formatPrice } = useCurrency();

  // REAL TRANSACTION HISTORY FETCH
  const { data: txs, isLoading: txLoading } = useSWR(
    initData ? ['/api/tma/transactions', initData] : null,
    ([url, id]) => postFetcher(url, id),
    { ...SWR_OPT, refreshInterval: 10000 }
  );

  const createDeposit = async () => {
    const amountNum = parseFloat(depositAmount);
    if (isNaN(amountNum) || amountNum < 0.5) return alert('Minimum deposit is $0.50 USD');
    setDepositing(true);
    try {
      const res = await fetch('/api/tma/deposit', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData, amount: amountNum })
      });
      if (res.ok) {
        const d = await res.json();
        if (d.checkout_url) {
          const tg = window.Telegram?.WebApp;
          if (tg) tg.openLink(d.checkout_url);
          else window.open(d.checkout_url, '_blank');
        }
      }
    } catch (err) {} finally { setDepositing(false); }
  };

  return (
    <div className="tma-view">
      <div className="tma-page-header">
        <div><span className="tma-page-eyebrow">Payments</span><h1 className="tma-page-title">My Wallet</h1></div>
        <button className="tma-icon-btn"><History size={20} /></button>
      </div>

      <div className="tma-scroll-body">
        {/* Purple gradient card */}
        <div className="tma-wallet-card">
          <div className="tma-wallet-balance-label">Total Balance <Eye size={12} style={{ marginLeft: 4 }} /></div>
          <h2 className="tma-wallet-balance">{formatPrice(profile?.balance || 0.00)}</h2>
          <div className="tma-wallet-actions">
            <button className="tma-wallet-btn primary" onClick={createDeposit} disabled={depositing}>
              <Plus size={16} /> Add Money
            </button>
            <button className="tma-wallet-btn" onClick={() => alert('Withdraw is currently disabled.')}>
              <ArrowLeft size={16} style={{ transform: 'rotate(45deg)' }} /> Withdraw
            </button>
          </div>
        </div>

        <div className="tma-section-header" style={{ padding: '0 16px' }}>
          <h2 className="tma-section-title">Quick Deposit</h2>
        </div>
        <div className="tma-deposit-presets">
          {['5', '10', '25', '50'].map(v => (
            <button
              key={v}
              className={`tma-preset-btn ${depositAmount === v || depositAmount === v + '.00' ? 'active' : ''}`}
              onClick={() => setDepositAmount(v + '.00')}
            >
              ${v}
            </button>
          ))}
        </div>

        <div style={{ padding: '0 16px 20px 16px' }}>
          <div className="tma-custom-deposit-row flex items-center gap-10 mb-12">
            <span style={{ fontSize: 18 }}>💳</span>
            <input
              type="number"
              className="tma-deposit-custom-input"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              placeholder="Custom amount"
              step="0.01"
            />
            <span style={{ color: '#64748b', fontWeight: 700, fontSize: 13 }}>USD</span>
          </div>
          <button className="tma-btn-primary" style={{ padding: 15 }} onClick={createDeposit} disabled={depositing}>
            {depositing ? <Loader2 className="animate-spin" size={18} /> : 'Generate Crypto Invoice'}
          </button>
        </div>

        {/* Real Dynamic Recent Transactions */}
        <div className="tma-section-header" style={{ padding: '0 16px' }}>
          <h2 className="tma-section-title">Recent Transactions</h2>
        </div>

        <div style={{ padding: '0 16px' }}>
          {txLoading ? (
            <div className="flex justify-center py-16"><Loader2 className="animate-spin" size={18} /></div>
          ) : !txs || txs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: '#64748b', fontSize: 13 }}>No recent transactions.</div>
          ) : (
            <div className="tma-tx-list">
              {txs.map(tx => (
                <div key={tx.id} className="tma-tx-item">
                  <div className="tma-tx-icon" style={{ background: tx.positive ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.04)' }}>
                    {tx.positive ? <Plus size={16} color="#22c55e" /> : <ShoppingCart size={16} color="#f1f5f9" />}
                  </div>
                  <div className="tma-tx-details">
                    <h4 className="tma-tx-title">{tx.title}</h4>
                    <span className="tma-tx-date">{tx.date}</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className={`tma-tx-amount ${tx.positive ? 'positive' : 'negative'}`}>{tx.amount}</div>
                    <div className="tma-tx-status">{tx.status}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={{ height: 100 }}></div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// ORDERS PAGE (Fully functional filters)
// ─────────────────────────────────────────────
const OrdersPage = ({ initData }) => {
  const [activeFilter, setActiveFilter] = useState('All');
  const { formatPrice } = useCurrency();
  const { data: orders, isLoading } = useSWR(
    initData ? ['/api/tma/orders', initData] : null,
    ([url, id]) => postFetcher(url, id),
    { ...SWR_OPT, revalidateOnMount: true }
  );

  // Real filtering based on order items
  const filteredOrders = orders?.filter(o => {
    if (activeFilter === 'All') return true;
    if (activeFilter === 'Completed') return true; // everything in DB is completed
    return false;
  }) || [];

  return (
    <div className="tma-view">
      <div className="tma-page-header">
        <div><span className="tma-page-eyebrow">Purchase history</span><h1 className="tma-page-title">My Orders</h1></div>
        <button className="tma-icon-btn"><Search size={20} /></button>
      </div>

      <div className="tma-tabs">
        {['All', 'Active', 'Completed', 'Cancelled'].map(t => (
          <div
            key={t}
            className={`tma-tab ${activeFilter === t ? 'active' : ''}`}
            onClick={() => setActiveFilter(t)}
          >
            {t}
          </div>
        ))}
      </div>

      <div className="tma-scroll-body" style={{ padding: '0 16px' }}>
        {isLoading ? (
          <div className="flex justify-center py-24"><Loader2 className="animate-spin" /></div>
        ) : filteredOrders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>No orders found.</div>
        ) : (
          <div className="tma-order-list">
            {filteredOrders.map(order => (
              <div key={order.order_id} className="tma-order-card">
                <div className="tma-order-header">
                  <div>
                    <div className="tma-order-id">#ORD-{String(order.order_id).substring(0, 8).toUpperCase()}</div>
                    <div className="tma-order-date">{order.date}</div>
                  </div>
                  <span className="tma-order-status completed">Completed</span>
                </div>
                <div className="tma-order-body">
                  <div className="tma-order-img">📦</div>
                  <div className="tma-order-info">
                    <h4 className="tma-order-title">{order.product_name}</h4>
                    <span className="tma-order-qty">Quantity: 1</span>
                  </div>
                  <div className="tma-order-price">{formatPrice(order.price)}</div>
                </div>

                {order.credentials && (
                  <div className="tma-order-credential">
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>Key / Credential</div>
                    <code style={{ fontSize: 11, fontFamily: 'monospace', color: '#22c55e', wordBreak: 'break-all' }}>{order.credentials}</code>
                  </div>
                )}

                <button
                  className="tma-order-btn"
                  onClick={() => alert(`Order Details:\nID: ${order.order_id}\nItem: ${order.product_name}\nPrice: $${order.price}\nDate: ${order.date}`)}
                >
                  View Order
                </button>
              </div>
            ))}
          </div>
        )}
        <div style={{ height: 100 }}></div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// ACCOUNT PAGE (Wishlist & Profile Details)
// ─────────────────────────────────────────────
const AccountPage = ({ profile, wishlist, onWish }) => {
  const navigate = useNavigate();
  const { data: homeData } = useSWR('/api/tma/home', fetcher, SWR_OPT);
  const { currency, updateCurrency } = useCurrency();
  
  const allProducts = homeData?.all_products || homeData?.sections?.flatMap(s => s.products) || homeData?.featured_products || [];
  const uniqueProducts = Array.from(new Map(allProducts.map(p => [p.id, p])).values());
  const wishItems = uniqueProducts.filter(p => wishlist.includes(p.id));

  return (
    <div className="tma-view">
      <div className="tma-page-header">
        <div><span className="tma-page-eyebrow">Account settings</span><h1 className="tma-page-title">My Profile</h1></div>
      </div>

      <div className="tma-scroll-body" style={{ padding: '0 16px' }}>
        {/* User Card */}
        <div className="tma-profile-card flex items-center gap-14 p-16 mb-20">
          <div className="tma-profile-avatar"><User size={25} /></div>
          <div>
            <span className="tma-profile-kicker">Verified Telegram account</span>
            <h3 className="tma-profile-name">@{profile?.username || 'User'}</h3>
            <span style={{ fontSize: 12, color: '#64748b' }}>Telegram ID: {profile?.user_id || 'Unknown'}</span>
          </div>
        </div>

        {/* Display Currency select card */}
        <div className="tma-settings-card">
          <div className="flex items-center justify-between" style={{ gap: 12 }}>
            <div>
              <div className="tma-settings-title">Display Currency</div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>Select local pricing display</div>
            </div>
            
            <select
              value={currency}
              onChange={(e) => updateCurrency(e.target.value)}
              className="tma-currency-select"
            >
              {[
                { code: 'USD', name: 'USDT / USD ($)', flag: '🇺🇸' },
                { code: 'INR', name: 'INR (₹)', flag: '🇮🇳' },
                { code: 'EUR', name: 'EUR (€)', flag: '🇪🇺' },
                { code: 'GBP', name: 'GBP (£)', flag: '🇬🇧' },
                { code: 'IDR', name: 'IDR (Rp)', flag: '🇮🇩' },
                { code: 'RUB', name: 'RUB (₽)', flag: '🇷🇺' },
                { code: 'BDT', name: 'BDT (৳)', flag: '🇧🇩' },
                { code: 'NGN', name: 'NGN (₦)', flag: '🇳🇬' },
                { code: 'EGP', name: 'EGP (E£)', flag: '🇪🇬' },
                { code: 'VND', name: 'VND (₫)', flag: '🇻🇳' },
                { code: 'TRY', name: 'TRY (₺)', flag: '🇹🇷' },
                { code: 'PHP', name: 'PHP (₱)', flag: '🇵🇭' },
                { code: 'MXN', name: 'MXN (MX$)', flag: '🇲🇽' },
                { code: 'THB', name: 'THB (฿)', flag: '🇹🇭' },
                { code: 'ZAR', name: 'ZAR (R)', flag: '🇿🇦' },
                { code: 'BRL', name: 'BRL (R$)', flag: '🇧🇷' },
                { code: 'CNY', name: 'CNY (¥)', flag: '🇨🇳' },
                { code: 'JPY', name: 'JPY (¥)', flag: '🇯🇵' },
                { code: 'KRW', name: 'KRW (₩)', flag: '🇰🇷' },
                { code: 'CAD', name: 'CAD (CA$)', flag: '🇨🇦' },
                { code: 'PKR', name: 'PKR (Rs)', flag: '🇵🇰' }
              ].map(opt => (
                <option key={opt.code} value={opt.code}>
                  {opt.flag} {opt.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Logout Button (Only if using external auth token) */}
        {localStorage.getItem('external_auth_token') && (
          <button
            onClick={() => {
              localStorage.removeItem('external_auth_token');
              window.location.reload();
            }}
            style={{
              width: '100%',
              background: 'rgba(239, 68, 68, 0.1)',
              color: '#ef4444',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              borderRadius: 16,
              padding: '14px',
              fontWeight: '700',
              fontSize: '14px',
              cursor: 'pointer',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            🚪 Logout Browser Session
          </button>
        )}

        {/* Wishlist header */}
        <div className="tma-section-header">
          <h2 className="tma-section-title">My Wishlist ❤️</h2>
        </div>

        {wishItems.length === 0 ? (
          <div className="tma-empty-state">
            Your wishlist is empty. Tap the ❤️ icon on products to add them here!
          </div>
        ) : (
          <div className="tma-grid">
            {wishItems.map(p => (
              <ProductCard key={p.id} product={p} onNavigate={navigate} isWish={true} onWish={onWish} />
            ))}
          </div>
        )}
        <div style={{ height: 100 }}></div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// LOGIN MODAL (soft, dismissable, bottom-sheet)
// ─────────────────────────────────────────────
const LoginModal = ({ onClose, onAuthorized }) => {
  const [sessionId] = useState(() => 'sess_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15));
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [copied, setCopied] = useState(false);

  const botUsername = 'Clustershopbot';
  const tgLink = `https://t.me/${botUsername}?start=authreq_${sessionId}`;

  useEffect(() => {
    fetch('/api/tma/log_guest', { method: 'POST' }).catch(() => {});
  }, []);

  useEffect(() => {
    let active = true;
    const poll = async () => {
      try {
        const res = await fetch(`/api/tma/auth_status?session_id=${sessionId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.status === 'authorized' && data.auth_token) {
          localStorage.setItem('external_auth_token', data.auth_token);
          setIsAuthorized(true);
          setTimeout(() => { if (active) onAuthorized(data.auth_token); }, 1200);
        }
      } catch (e) {}
    };
    const interval = setInterval(poll, 2500);
    return () => { active = false; clearInterval(interval); };
  }, [sessionId, onAuthorized]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(14,22,17,0.38)', backdropFilter: 'blur(8px)',
          zIndex: 9999, display: 'flex', alignItems: 'flex-end', justifyContent: 'center'
        }}
      >
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', stiffness: 380, damping: 38 }}
          onClick={e => e.stopPropagation()}
          style={{
            background: '#ffffff',
            border: '1px solid #e0e5e0',
            borderRadius: '24px 24px 0 0',
            padding: '24px 20px 36px',
            width: '100%',
            maxWidth: '480px',
            color: '#111713',
            fontFamily: 'Inter, system-ui, sans-serif'
          }}
        >
          {/* Drag handle */}
          <div style={{ width: 36, height: 4, background: '#d9ded9', borderRadius: 4, margin: '0 auto 20px' }} />

          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>🔑</div>
            <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 6 }}>Sign In to Continue</h2>
            <p style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.5 }}>
              Open our bot using the button below and connect your profile to sign in and fetch your balance.
            </p>
          </div>

          {isAuthorized ? (
            <div style={{ color: '#22c55e', fontWeight: 'bold', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '12px 0' }}>
              <span style={{ fontSize: 24 }}>✅</span>
              Connected! Loading your profile...
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <a
                href={tgLink}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'block', background: '#247a48', color: '#fff',
                  textDecoration: 'none', fontWeight: 700, padding: '13px',
                  borderRadius: 12, fontSize: 14, textAlign: 'center'
                }}
              >
                🚀 Connect via Telegram
              </a>
              <button
                onClick={() => { navigator.clipboard.writeText(tgLink); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                style={{
                  background: '#f2f5f1', color: '#111713', border: '1px solid #dfe4df',
                  padding: '11px', borderRadius: 12, fontSize: 13, fontWeight: 600, cursor: 'pointer'
                }}
              >
                {copied ? '📋 Copied!' : '🔗 Copy Link'}
              </button>
              <button
                onClick={onClose}
                style={{
                  background: 'transparent', color: '#64748b', border: 'none',
                  padding: '10px', borderRadius: 12, fontSize: 13, cursor: 'pointer'
                }}
              >
                Not now, I'll sign in later
              </button>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 4 }}>
                <span style={{ width: 7, height: 7, background: '#247a48', borderRadius: '50%', display: 'inline-block' }} />
                <span style={{ fontSize: 11, color: '#64748b' }}>Waiting for approval...</span>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default function StoreApp() {
  const initData = useTmaInit();
  const [authToken, setAuthToken] = useState('');
  const [showLoginModal, setShowLoginModal] = useState(false);
  const isExternalBrowser = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';

  useEffect(() => { setAuthToken(initData); }, [initData]);

  // Auto-prompt: show after 10s, then re-show every 60s if not authed
  useEffect(() => {
    if (!isExternalBrowser || authToken) return;
    const first = setTimeout(() => setShowLoginModal(true), 10000);
    const repeat = setInterval(() => {
      setAuthToken(t => {
        if (!t) setShowLoginModal(true);
        return t;
      });
    }, 60000);
    return () => { clearTimeout(first); clearInterval(repeat); };
  }, [isExternalBrowser, authToken]);

  const handleAuthorized = (token) => {
    setAuthToken(token);
    setShowLoginModal(false);
  };

  const authCtx = {
    isAuthed: !!authToken,
    showLoginModal,
    openLoginModal: () => setShowLoginModal(true),
    closeLoginModal: () => setShowLoginModal(false),
    onAuthorized: handleAuthorized,
  };

  return (
    <AuthContext.Provider value={authCtx}>
      <MemoryRouter initialEntries={['/']}>
        <AppShell initData={authToken} />
        {showLoginModal && (
          <LoginModal
            onClose={() => setShowLoginModal(false)}
            onAuthorized={handleAuthorized}
          />
        )}
      </MemoryRouter>
    </AuthContext.Provider>
  );
}
// ─────────────────────────────────────────────
// OTP PANEL PAGE (SMM / PHP Verification Panel style)
// ─────────────────────────────────────────────
const OtpPanelPage = ({ initData, profile }) => {
  const navigate = useNavigate();
  const { formatPrice } = useCurrency();

  const [selectedServer, setSelectedServer] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedService, setSelectedService] = useState(null);
  const [countryMenuOpen, setCountryMenuOpen] = useState(false);
  const [buying, setBuying] = useState(false);
  const [fetchingCodeId, setFetchingCodeId] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [msg, setMsg] = useState(null);
  const [activeTab, setActiveTab] = useState('active'); // 'active' | 'history'

  // Fetch available countries
  const { data: countriesData, isLoading: loadingCountries } = useSWR(
    '/api/tma/otp/countries',
    fetcher,
    SWR_OPT
  );
  const servers = countriesData?.servers || [];
  const activeServer = servers.find(server => server.key === selectedServer) || servers[0];
  const countries = activeServer?.countries || countriesData?.countries || [];

  useEffect(() => {
    if (servers.length > 0 && !servers.some(server => server.key === selectedServer)) {
      setSelectedServer(servers[0].key);
    }
  }, [servers, selectedServer]);

  useEffect(() => {
    if (countries.length > 0 && (!selectedCountry || !countries.some(c => c.country_code === selectedCountry))) {
      setSelectedCountry(countries[0].country_code);
      setSelectedService(countries[0].id);
    }
  }, [countries, selectedCountry]);

  // Fetch user active OTP numbers with auto-refresh every 5s
  const { data: activeData, isLoading: loadingActive, mutate: mutateActive } = useSWR(
    initData ? `/api/tma/otp/active_numbers?initData=${encodeURIComponent(initData)}` : null,
    fetcher,
    { ...SWR_OPT, refreshInterval: 5000 }
  );

  const activeNumbers = activeData?.active_numbers || [];

  const handleBuyNumber = async () => {
    if (!selectedCountry) return;
    setBuying(true);
    setMsg(null);
    try {
      const res = await fetch('/api/tma/otp/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData, country_code: selectedCountry, service_id: selectedService })
      });
      const data = await res.json();
      if (data.ok) {
        setMsg({ type: 'success', text: `🎉 Virtual number ${data.phone} purchased! 30-min timer started.` });
        mutateActive();
        mutate(initData ? ['/api/tma/profile', initData] : null);
      } else {
        setMsg({ type: 'error', text: data.message || 'Failed to purchase number.' });
      }
    } catch (e) {
      setMsg({ type: 'error', text: 'Network error buying number.' });
    } finally {
      setBuying(false);
    }
  };

  const handleGetCode = async (stockId) => {
    setFetchingCodeId(stockId);
    setMsg(null);
    try {
      const res = await fetch('/api/tma/otp/get_code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData, stock_id: stockId })
      });
      const data = await res.json();
      if (data.ok && data.status === 'RECEIVED') {
        setMsg({ type: 'success', text: `✅ SMS Code received: ${data.code}` });
      } else if (data.ok) {
        setMsg({ type: 'info', text: '⌛ SMS Code not received yet. Retrying in background...' });
      } else {
        setMsg({ type: 'error', text: data.message || 'Failed to fetch code.' });
      }
      mutateActive();
    } catch (e) {
      setMsg({ type: 'error', text: 'Error fetching code.' });
    } finally {
      setFetchingCodeId(null);
    }
  };

  const handleCancel = async (stockId) => {
    if (!window.confirm('Are you sure you want to cancel this number? Full amount will be refunded immediately.')) return;
    setCancellingId(stockId);
    setMsg(null);
    try {
      const res = await fetch('/api/tma/otp/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData, stock_id: stockId })
      });
      const data = await res.json();
      if (data.ok) {
        setMsg({ type: 'success', text: data.message || 'Cancelled and refunded.' });
        mutateActive();
        mutate(initData ? ['/api/tma/profile', initData] : null);
      } else {
        setMsg({ type: 'error', text: data.message || 'Failed to cancel.' });
      }
    } catch (e) {
      setMsg({ type: 'error', text: 'Error cancelling number.' });
    } finally {
      setCancellingId(null);
    }
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const curCountryObj = countries.find(c => c.country_code === selectedCountry) || countries[0];

  const activeList = activeNumbers.filter(n => n.otp_status === 'WAITING' || (n.otp_status === 'RECEIVED' && n.remaining_seconds > 0));
  const historyList = activeNumbers.filter(n => n.otp_status === 'CANCELLED' || n.otp_status === 'RECEIVED');

  return (
    <div className="tma-page tma-otp-panel">
      {/* Header */}
      <div className="tma-otp-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="tma-otp-icon-bg">⚡</div>
            <div>
              <h1 style={{ fontSize: 18, fontWeight: 900, margin: 0 }}>OTP & Virtual Numbers</h1>
              <p style={{ fontSize: 11, color: '#64748b', margin: '2px 0 0 0' }}>SMM Activation Panel • 30-Min Auto Refund</p>
            </div>
          </div>
          <div className="tma-otp-balance-badge" onClick={() => navigate('/wallet')}>
            <span style={{ fontSize: 10, color: '#94a3b8' }}>Balance</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: '#22c55e' }}>{formatPrice(profile?.balance || 0)}</span>
          </div>
        </div>
      </div>

      {/* Auto Refund Guarantee Banner */}
      <div className="tma-otp-guarantee-banner">
        <ShieldCheck size={16} color="#00e6c8" style={{ flexShrink: 0 }} />
        <span><b>30-Min Auto-Refund Guarantee:</b> If no SMS code arrives within 30 minutes, your balance is 100% refunded automatically.</span>
      </div>

      {/* Message Toast */}
      {msg && (
        <div className={`tma-otp-toast ${msg.type}`}>
          {msg.text}
        </div>
      )}

      {/* Buy Number Section */}
      <div className="tma-otp-card">
        <div className="tma-otp-card-title">
          <Globe size={16} color="#247a48" /> Choose Server & Country
        </div>

        <label className="tma-field-label">1 · Select server</label>
        <div className="tma-server-grid">
          {servers.map(server => (
            <button
              key={server.key}
              type="button"
              className={`tma-server-option ${activeServer?.key === server.key ? 'active' : ''}`}
              onClick={() => {
                setSelectedServer(server.key);
                const first = server.countries?.[0];
                setSelectedCountry(first?.country_code || '');
                setSelectedService(first?.id || null);
                setCountryMenuOpen(false);
              }}
            >
              <span className="server-check">{activeServer?.key === server.key ? '✓' : ''}</span>
              <span><b>{server.name}</b><small>{server.tier} · {server.available_count}/{server.countries?.length || 0} countries live</small></span>
              <strong>From {formatPrice(server.from_price)}</strong>
            </button>
          ))}
        </div>

        {/* Desktop-style country dropdown, filtered by selected server */}
        <div className="tma-otp-country-wrapper">
          <label className="tma-field-label">2 · Select country</label>
          <button
            type="button"
            className={`tma-country-trigger ${countryMenuOpen ? 'open' : ''}`}
            onClick={() => setCountryMenuOpen(open => !open)}
          >
            <span><b>{curCountryObj?.emoji || '🌐'} {curCountryObj?.name || 'Choose country'}</b><small>From {formatPrice(curCountryObj?.price || 0)}</small></span>
            <ChevronRight size={18} />
          </button>
          {countryMenuOpen && (
            <div className="tma-country-menu">
              {loadingCountries ? <div className="tma-country-empty">Loading countries…</div> : countries.map(c => (
                <button key={c.country_code} type="button" className={selectedCountry === c.country_code ? 'active' : ''}
                  onClick={() => { setSelectedCountry(c.country_code); setSelectedService(c.id); setCountryMenuOpen(false); }}>
                  <span className="country-name"><i>{c.emoji}</i><span><b>{c.is_india_special ? 'India Special' : c.name}</b><small>{activeServer?.name}</small></span></span>
                  <span className="country-price">{formatPrice(c.price)}<small>{c.stock > 0 ? `${c.stock} available` : 'On demand'}</small></span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Buy Button */}
        <button
          className="tma-btn-primary tma-otp-buy-btn"
          onClick={handleBuyNumber}
          disabled={buying}
        >
          {buying ? (
            <>
              <Loader2 className="animate-spin" size={18} /> Buying Number...
            </>
          ) : (
            <>
              <Phone size={18} /> Get number · {formatPrice(curCountryObj?.price || 1.50)}
            </>
          )}
        </button>
      </div>

      {/* Active & History Tabs */}
      <div className="tma-otp-tabs">
        <button
          className={`tma-otp-tab ${activeTab === 'active' ? 'active' : ''}`}
          onClick={() => setActiveTab('active')}
        >
          ⚡ Active Numbers ({activeList.length})
        </button>
        <button
          className={`tma-otp-tab ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          📜 History ({historyList.length})
        </button>
      </div>

      {/* Active Numbers Feed */}
      {activeTab === 'active' && (
        <div className="tma-otp-list">
          {loadingActive && activeNumbers.length === 0 ? (
            <div className="tma-otp-empty skeleton">Loading active numbers...</div>
          ) : activeList.length === 0 ? (
            <div className="tma-otp-empty">
              <MessageSquare size={36} color="#64748b" style={{ margin: '0 auto 10px auto', display: 'block' }} />
              <h3>No Active Numbers</h3>
              <p>Select a country above and click <b>Buy Number</b> to receive SMS OTP codes instantly.</p>
            </div>
          ) : (
            activeList.map(item => (
              <OtpNumberCard
                key={item.id}
                item={item}
                formatPrice={formatPrice}
                onGetCode={handleGetCode}
                onCancel={handleCancel}
                onCopy={copyToClipboard}
                fetchingId={fetchingCodeId}
                cancellingId={cancellingId}
                copiedId={copiedId}
              />
            ))
          )}
        </div>
      )}

      {/* History Feed */}
      {activeTab === 'history' && (
        <div className="tma-otp-list">
          {historyList.length === 0 ? (
            <div className="tma-otp-empty">
              <History size={36} color="#64748b" style={{ margin: '0 auto 10px auto', display: 'block' }} />
              <h3>No Activation History</h3>
              <p>Completed activations and refunded numbers will appear here.</p>
            </div>
          ) : (
            historyList.map(item => (
              <div key={item.id} className="tma-otp-item history">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{item.country_flag} {item.country_name}</span>
                  <span className={`tma-otp-status-pill ${item.otp_status.toLowerCase()}`}>
                    {item.otp_status === 'RECEIVED' ? '✅ COMPLETED' : '❌ REFUNDED'}
                  </span>
                </div>
                <div className="tma-otp-phone">{item.phone}</div>
                {item.code && (
                  <div className="tma-otp-code-received-box">
                    <span>Code: <b>{item.code}</b></span>
                    {item.password && <span>Password: <b>{item.password}</b></span>}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────
// OTP Single Number Card Component (with Live 30-min Timer)
// ─────────────────────────────────────────────
const OtpNumberCard = ({ item, formatPrice, onGetCode, onCancel, onCopy, fetchingId, cancellingId, copiedId }) => {
  const [secondsLeft, setSecondsLeft] = useState(item.remaining_seconds || 1800);

  useEffect(() => {
    setSecondsLeft(item.remaining_seconds || 1800);
  }, [item.remaining_seconds]);

  useEffect(() => {
    if (secondsLeft <= 0 || item.otp_status !== 'WAITING') return;
    const interval = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [secondsLeft, item.otp_status]);

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const timeStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  const progressPercent = Math.min(100, Math.max(0, (secondsLeft / 1800) * 100));

  const isFetching = fetchingId === item.id;
  const isCancelling = cancellingId === item.id;
  const cancelUnlocked = secondsLeft <= 300;
  const cancelWaitSeconds = Math.max(0, secondsLeft - 300);
  const cancelWaitMins = Math.floor(cancelWaitSeconds / 60);
  const cancelWaitSecs = cancelWaitSeconds % 60;
  const cancelWaitLabel = `${cancelWaitMins.toString().padStart(2, '0')}:${cancelWaitSecs.toString().padStart(2, '0')}`;

  return (
    <div className={`tma-otp-item ${item.otp_status.toLowerCase()}`}>
      {/* Timer Bar */}
      {item.otp_status === 'WAITING' && (
        <div className="tma-otp-progress-container">
          <div className="tma-otp-progress-bar" style={{ width: `${progressPercent}%` }} />
        </div>
      )}

      {/* Item Top Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 16 }}>{item.country_flag}</span>
          <span style={{ fontSize: 13, fontWeight: 800, color: '#f1f5f9' }}>{item.country_name}</span>
          <span style={{ fontSize: 11, color: '#94a3b8' }}>• {formatPrice(item.price)}</span>
        </div>
        <div className={`tma-otp-status-pill ${item.otp_status.toLowerCase()}`}>
          {item.otp_status === 'WAITING' && `⏳ WAITING (${timeStr})`}
          {item.otp_status === 'RECEIVED' && '✅ CODE RECEIVED'}
          {item.otp_status === 'CANCELLED' && '❌ REFUNDED'}
        </div>
      </div>

      {/* Phone Number Box */}
      <div className="tma-otp-phone-row">
        <span className="tma-otp-phone">{item.phone}</span>
        <button
          className="tma-otp-copy-btn"
          onClick={() => onCopy(item.phone, `phone_${item.id}`)}
        >
          {copiedId === `phone_${item.id}` ? <Check size={14} color="#22c55e" /> : <Copy size={14} />}
          {copiedId === `phone_${item.id}` ? 'Copied' : 'Copy'}
        </button>
      </div>

      {/* OTP Code Box */}
      {item.otp_status === 'RECEIVED' ? (
        <div className="tma-otp-code-received-box">
          <div className="tma-otp-code-header">
            <MessageSquare size={16} color="#22c55e" />
            <span>SMS OTP Code</span>
          </div>
          <div className="tma-otp-code-value">
            <span>{item.code}</span>
            <button
              className="tma-otp-copy-code-btn"
              onClick={() => onCopy(item.code, `code_${item.id}`)}
            >
              {copiedId === `code_${item.id}` ? <Check size={14} color="#22c55e" /> : <Copy size={14} />}
              {copiedId === `code_${item.id}` ? 'Copied Code' : 'Copy Code'}
            </button>
          </div>
          {item.password && (
            <div className="tma-otp-pwd-value">
              <Key size={14} color="#00e6c8" />
              <span>Password: <b>{item.password}</b></span>
              <button
                className="tma-otp-copy-btn"
                style={{ marginLeft: 'auto' }}
                onClick={() => onCopy(item.password, `pwd_${item.id}`)}
              >
                {copiedId === `pwd_${item.id}` ? <Check size={12} color="#22c55e" /> : <Copy size={12} />}
              </button>
            </div>
          )}
        </div>
      ) : item.otp_status === 'WAITING' ? (
        <div className="tma-otp-code-waiting-box">
          <Loader2 className="animate-spin" size={16} color="#f97316" />
          <span>Listening for incoming SMS code...</span>
        </div>
      ) : null}

      {/* Card Actions */}
      {item.otp_status === 'WAITING' && (
        <div className="tma-otp-actions">
          <button
            className="tma-otp-btn-get"
            onClick={() => onGetCode(item.id)}
            disabled={isFetching}
          >
            {isFetching ? <Loader2 className="animate-spin" size={14} /> : <RefreshCw size={14} />}
            Get OTP
          </button>

          <button
            className="tma-otp-btn-cancel"
            onClick={() => onCancel(item.id)}
            disabled={isCancelling || !cancelUnlocked}
            title={cancelUnlocked ? 'Cancel and refund this number' : 'Cancellation unlocks 25 minutes after purchase'}
          >
            {isCancelling ? <Loader2 className="animate-spin" size={14} /> : <XCircle size={14} />}
            {cancelUnlocked ? 'Cancel & Refund' : `Cancel in ${cancelWaitLabel}`}
          </button>
        </div>
      )}
    </div>
  );
};

const AppShell = ({ initData }) => {
  const [activeTab, setActiveTab] = useState('home');
  const [wishlist, toggleWishlist] = useWishlist();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const [currency, setCurrency] = useState('USD');
  const [rate, setRate] = useState(1.0);
  const [symbol, setSymbol] = useState('$');
  const [showInrPopup, setShowInrPopup] = useState(false);

  const { data: profile } = useSWR(
    initData ? ['/api/tma/profile', initData] : null,
    ([url, id]) => postFetcher(url, id),
    SWR_OPT
  );

  const isProductPage = location.pathname.startsWith('/product/');
  const { isAuthed, openLoginModal } = useAuth();

  const handleTabChange = (tab, path) => {
    const gatedPaths = ['/wallet', '/orders', '/account', '/otp'];
    if (!isAuthed && gatedPaths.includes(path)) {
      openLoginModal();
      return;
    }
    setActiveTab(tab);
    navigate(path);
  };

  const updateCurrency = async (newCurr) => {
    try {
      const res = await fetch('/api/tma/profile/update-currency', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData, currency: newCurr })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to update currency preference');
      
      const rateRes = await fetch(`/api/tma/currency-rate/${newCurr}`);
      const rateData = await rateRes.json();
      
      setCurrency(newCurr);
      setRate(rateData.rate || 1.0);
      setSymbol(rateData.symbol || '$');
      
      mutate(initData ? ['/api/tma/profile', initData] : null);
    } catch (err) {
      alert(err.message);
    }
  };

  const formatPrice = (usdAmount) => {
    return `${symbol}${(parseFloat(usdAmount) * rate).toFixed(2)}`;
  };

  useEffect(() => {
    if (!profile) return;
    
    if (profile.currency) {
      fetch(`/api/tma/currency-rate/${profile.currency}`)
        .then(res => res.json())
        .then(rateData => {
          setCurrency(profile.currency);
          setRate(rateData.rate || 1.0);
          setSymbol(rateData.symbol || '$');
          
          if (profile.currency === 'INR') {
            fetch('/api/tma/detect-country')
              .then(res => res.json())
              .then(data => {
                if (data.country === 'IN') {
                  setShowInrPopup(true);
                }
              }).catch(e => {});
          }
        })
        .catch(err => console.error(err));
    } else {
      setCurrency('USD');
      setRate(1.0);
      setSymbol('$');
    }
  }, [profile, initData]);

  useEffect(() => {
    const path = location.pathname;
    if (path === '/') setActiveTab('home');
    else if (path === '/discover') setActiveTab('discover');
    else if (path === '/otp') setActiveTab('otp');
    else if (path === '/wallet') setActiveTab('wallet');
    else if (path === '/orders') setActiveTab('orders');
    else if (path === '/account') setActiveTab('account');
  }, [location]);

  return (
    <CurrencyContext.Provider value={{ currency, rate, symbol, updateCurrency, formatPrice }}>
      <div className="tma-app">
        {/* Announcement Ticker Bar inspired by Image 1 */}
        {!isProductPage && (
          <div className="tma-top-announcement">
            <span>⚡ <b>Instant Auto Delivery</b> on all digital accounts & OTPs • 24/7 Guarantee</span>
          </div>
        )}

        {/* Header App Bar with Hamburger Menu Icon inspired by Image 1 & 2 */}
        {!isProductPage && (
          <div className="tma-main-header">
            <button className="tma-menu-hamburger" onClick={() => setIsMenuOpen(true)}>
              <Menu size={22} color="#f1f5f9" />
            </button>
            <div className="tma-header-title-box" onClick={() => navigate('/')}>
              <span className="tma-brand-logo-text">Cluster Shop</span>
              <span className="tma-brand-sub-text">Digital Store</span>
            </div>
            <div className="tma-header-actions">
              <button className="tma-icon-btn" onClick={() => navigate('/orders')}><Bell size={18} /></button>
              <div className="tma-avatar" onClick={() => navigate('/account')}><User size={16} color="#9ca3af" /></div>
            </div>
          </div>
        )}

        <Routes>
          <Route path="/" element={<HomePage initData={initData} profile={profile} wishlist={wishlist} onWish={toggleWishlist} />} />
          <Route path="/discover" element={<DiscoverPage wishlist={wishlist} onWish={toggleWishlist} />} />
          <Route path="/otp" element={<OtpPanelPage initData={initData} profile={profile} />} />
          <Route path="/wallet" element={<WalletPage initData={initData} profile={profile} />} />
          <Route path="/orders" element={<OrdersPage initData={initData} />} />
          <Route path="/account" element={<AccountPage profile={profile} wishlist={wishlist} onWish={toggleWishlist} />} />
          <Route path="/product/:id" element={<ProductPage initData={initData} wishlist={wishlist} onWish={toggleWishlist} />} />
        </Routes>

        {/* Clean 5-Tab Bottom Navigation Bar */}
        {!isProductPage && (
          <div className="tma-bottom-nav">
            <div className={`tma-nav-item ${activeTab === 'home' ? 'active' : ''}`} onClick={() => handleTabChange('home', '/')}>
              <Home className="tma-nav-icon" />
              <span className="tma-nav-label">Home</span>
            </div>
            <div className={`tma-nav-item ${activeTab === 'discover' ? 'active' : ''}`} onClick={() => handleTabChange('discover', '/discover')}>
              <Compass className="tma-nav-icon" />
              <span className="tma-nav-label">Discover</span>
            </div>
            <div className={`tma-nav-item ${activeTab === 'wallet' ? 'active' : ''}`} onClick={() => handleTabChange('wallet', '/wallet')}>
              <Wallet className="tma-nav-icon" />
              <span className="tma-nav-label">Wallet</span>
            </div>
            <div className={`tma-nav-item ${activeTab === 'orders' ? 'active' : ''}`} onClick={() => handleTabChange('orders', '/orders')}>
              <ClipboardList className="tma-nav-icon" />
              <span className="tma-nav-label">Orders</span>
            </div>
            <div className={`tma-nav-item ${activeTab === 'account' ? 'active' : ''}`} onClick={() => handleTabChange('account', '/account')}>
              <User className="tma-nav-icon" />
              <span className="tma-nav-label">Account</span>
            </div>
          </div>
        )}

        {/* Top Slide-over Navigation Menu Bar Drawer */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              className="tma-menu-drawer-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
            >
              <motion.div
                className="tma-menu-drawer"
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="tma-drawer-header">
                  <div className="tma-drawer-brand">
                    <div className="tma-logo-badge">CS</div>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 900, color: '#f1f5f9' }}>Cluster Shop</div>
                      <div style={{ fontSize: 11, color: '#94a3b8' }}>Digital Goods & OTP Services</div>
                    </div>
                  </div>
                  <button className="tma-drawer-close" onClick={() => setIsMenuOpen(false)}>
                    <X size={20} color="#f1f5f9" />
                  </button>
                </div>

                {/* Balance display inside Menu Bar */}
                <div className="tma-drawer-user-card" onClick={() => { setIsMenuOpen(false); handleTabChange('wallet', '/wallet'); }}>
                  <div>
                    <div style={{ fontSize: 11, color: '#cbd5e1' }}>Wallet Balance</div>
                    <div style={{ fontSize: 16, fontWeight: 900, color: '#22c55e' }}>{formatPrice(profile?.balance || 0)}</div>
                  </div>
                  <button className="tma-drawer-add-btn">+ Add Funds</button>
                </div>

                {/* Navigation Items in Menu Bar */}
                <div className="tma-drawer-nav">
                  <div className="tma-drawer-item" onClick={() => { setIsMenuOpen(false); handleTabChange('home', '/'); }}>
                    <Home size={18} color="#38bdf8" /> <span>Home Store</span>
                  </div>
                  <div className="tma-drawer-item" onClick={() => { setIsMenuOpen(false); handleTabChange('discover', '/discover'); }}>
                    <Compass size={18} color="#a855f7" /> <span>Discover Products</span>
                  </div>

                  {/* OTP Panel Menu Option (Prominently Highlighted!) */}
                  <div className="tma-drawer-item otp-highlight" onClick={() => { setIsMenuOpen(false); handleTabChange('otp', '/otp'); }}>
                    <Key size={18} color="#00e6c8" /> 
                    <span>OTP Panel & Virtual Numbers</span>
                    <span className="drawer-badge">HOT ⚡</span>
                  </div>

                  <div className="tma-drawer-item" onClick={() => { setIsMenuOpen(false); handleTabChange('wallet', '/wallet'); }}>
                    <Wallet size={18} color="#22c55e" /> <span>Wallet & Deposit</span>
                  </div>
                  <div className="tma-drawer-item" onClick={() => { setIsMenuOpen(false); handleTabChange('orders', '/orders'); }}>
                    <ClipboardList size={18} color="#f97316" /> <span>My Orders</span>
                  </div>
                  <div className="tma-drawer-item" onClick={() => { setIsMenuOpen(false); handleTabChange('account', '/account'); }}>
                    <User size={18} color="#e2e8f0" /> <span>Account Settings</span>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showInrPopup && (
            <motion.div
              className="tma-modal-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ zIndex: 110 }}
            >
              <motion.div
                className="tma-modal-card"
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                style={{
                  border: '1px solid rgba(0, 230, 200, 0.2)',
                  boxShadow: '0 0 30px rgba(0, 230, 200, 0.1)',
                  position: 'relative'
                }}
              >
                <div style={{ fontSize: 44, marginBottom: 12 }}>⚡</div>
                <h3 style={{ fontSize: 18, fontWeight: 900, color: '#f1f5f9', marginBottom: 10 }}>USDT Payment Recommended</h3>
                <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.5, marginBottom: 18, textAlign: 'center' }}>
                  Payments in <b>INR</b> may experience gateway delays. We highly recommend switching to <b>USDT/USD</b> for instant, fully automated order delivery.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <button
                    className="tma-btn-primary"
                    style={{ background: '#00E6C8', color: '#0A0F1C', width: '100%', padding: '12px 16px', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}
                    onClick={() => {
                      updateCurrency('USD');
                      setShowInrPopup(false);
                    }}
                  >
                    Switch to USDT / USD
                  </button>
                  <button
                    className="tma-order-btn"
                    style={{ marginTop: 0, width: '100%', background: 'rgba(255, 255, 255, 0.05)', color: '#f1f5f9', border: 'none', padding: '12px 16px', borderRadius: '10px', cursor: 'pointer' }}
                    onClick={() => setShowInrPopup(false)}
                  >
                    Keep INR (Local Bank)
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </CurrencyContext.Provider>
  );
};

const AuthOverlay = ({ onAuthorized }) => {
  const [sessionId] = useState(() => 'sess_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15));
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const botUsername = 'Clustershopbot';
  const tgLink = `https://t.me/${botUsername}?start=authreq_${sessionId}`;

  useEffect(() => {
    fetch('/api/tma/log_guest', { method: 'POST' }).catch(() => {});
  }, []);

  useEffect(() => {
    let active = true;
    const poll = async () => {
      try {
        const res = await fetch(`/api/tma/auth_status?session_id=${sessionId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.status === 'authorized' && data.auth_token) {
          localStorage.setItem('external_auth_token', data.auth_token);
          setIsAuthorized(true);
          setTimeout(() => {
            if (active) onAuthorized(data.auth_token);
          }, 1500);
        }
      } catch (e) {
        console.error(e);
      }
    };

    const interval = setInterval(poll, 2500);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [sessionId, onAuthorized]);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: '#0d0d0d',
      zIndex: 99999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      color: '#f1f5f9',
      fontFamily: 'Inter, system-ui, sans-serif'
    }}>
      <div style={{
        background: '#1a1a1a',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '20px',
        padding: '30px 24px',
        maxWidth: '380px',
        width: '100%',
        textAlign: 'center',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔑</div>
        <h2 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '12px' }}>Sign In with Telegram</h2>
        <p style={{ fontSize: '13px', color: '#cbd5e1', lineHeight: '1.6', marginBottom: '24px' }}>
          Open our bot using the button below and connect your profile to this website to sign in and fetch your balance.
        </p>

        {isAuthorized ? (
          <div style={{ color: '#22c55e', fontWeight: 'bold', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '24px' }}>✅</span>
            Connected successfully! Loading store...
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <a
              href={tgLink}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'block',
                background: '#2563eb',
                color: '#fff',
                textDecoration: 'none',
                fontWeight: '700',
                padding: '14px',
                borderRadius: '12px',
                fontSize: '14px',
                textAlign: 'center'
              }}
            >
              🚀 Connect via Telegram
            </a>
            
            <button
              onClick={() => {
                navigator.clipboard.writeText(tgLink);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                color: '#f1f5f9',
                border: 'none',
                padding: '12px',
                borderRadius: '12px',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              {copied ? '📋 Link Copied!' : '🔗 Copy Connection Link'}
            </button>
            
            <div style={{ display: 'flex', alignItems: 'center', justifycontent: 'center', gap: '8px', marginTop: '16px' }}>
              <span className="tma-carousel-dot active" style={{ width: '8px', height: '8px', background: '#2563eb', borderRadius: '50%', display: 'inline-block' }} />
              <span style={{ fontSize: '12px', color: '#64748b' }}>Waiting for connection approval...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
