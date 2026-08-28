from fastapi import APIRouter
from fastapi.responses import HTMLResponse

router = APIRouter()

ADMIN_HTML = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
  <title>ClusterPay · Self-Hosted Admin Console</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/lucide@latest"></script>
  <style>
    body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; background-color: #FAFAFA; color: #09090b; }
    .font-serif { font-family: 'Instrument Serif', Georgia, serif; }
    .font-mono { font-family: 'JetBrains Mono', monospace; }
  </style>
</head>
<body class="min-h-screen flex flex-col antialiased selection:bg-black selection:text-white">

  <div id="app" class="flex-1 flex flex-col"></div>

  <script>
    // Session tokens are tab-scoped (sessionStorage) — never persist the master key to disk
    let masterKey = sessionStorage.getItem('cpay_session_token') || '';
    const _sessExp = sessionStorage.getItem('cpay_session_expires');
    if (masterKey && _sessExp && new Date(_sessExp) < new Date()) {
      masterKey = ''; sessionStorage.removeItem('cpay_session_token'); sessionStorage.removeItem('cpay_session_expires');
    }
    localStorage.removeItem('cpay_master_key'); // clear old insecure storage on load
    let currentTab = 'overview';
    let stats = null;
    let sessions = [];
    let merchants = [];
    let rpcHealth = [];
    let isLoading = false;
    let searchFilter = '';
    let statusFilter = 'all';

    let selectedCurrency = localStorage.getItem('cpay_admin_curr') || 'USD';
    let activeDateRange = 'all';
    let customStartDate = '';
    let customEndDate = '';

    const CURRENCIES = {
      'USD': { symbol: '$', name: 'US Dollar', rate: 1.0, flag: '🇺🇸' },
      'INR': { symbol: '₹', name: 'Indian Rupee', rate: 86.85, flag: '🇮🇳' },
      'EUR': { symbol: '€', name: 'Euro', rate: 0.92, flag: '🇪🇺' },
      'GBP': { symbol: '£', name: 'British Pound', rate: 0.78, flag: '🇬🇧' },
      'AED': { symbol: 'د.إ', name: 'UAE Dirham', rate: 3.67, flag: '🇦🇪' },
      'CAD': { symbol: 'CA$', name: 'Canadian Dollar', rate: 1.36, flag: '🇨🇦' },
      'AUD': { symbol: 'AU$', name: 'Australian Dollar', rate: 1.52, flag: '🇦🇺' },
      'JPY': { symbol: '¥', name: 'Japanese Yen', rate: 154.2, flag: '🇯🇵' },
      'BRL': { symbol: 'R$', name: 'Brazilian Real', rate: 5.65, flag: '🇧🇷' },
      'SGD': { symbol: 'SG$', name: 'Singapore Dollar', rate: 1.34, flag: '🇸🇬' },
      'USDT': { symbol: '₮', name: 'Tether USD', rate: 1.0, flag: '🟢' }
    };

    function formatMoney(amountInUsd) {
      if (amountInUsd === undefined || amountInUsd === null || isNaN(amountInUsd)) return '--';
      const curr = CURRENCIES[selectedCurrency] || CURRENCIES['USD'];
      const dynamicRate = (stats && stats.forex_rates && stats.forex_rates[selectedCurrency]) || curr.rate;
      const converted = amountInUsd * dynamicRate;
      
      let formattedNumber;
      if (selectedCurrency === 'INR') {
        formattedNumber = new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(converted);
      } else if (selectedCurrency === 'JPY') {
        formattedNumber = new Intl.NumberFormat('ja-JP', { maximumFractionDigits: 0 }).format(converted);
      } else {
        formattedNumber = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(converted);
      }
      return curr.symbol + ' ' + formattedNumber;
    }

    async function apiCall(endpoint, method = 'GET', body = null) {
      const headers = { 'Content-Type': 'application/json' };
      if (masterKey) headers['Authorization'] = 'Bearer ' + masterKey;
      const opt = { method, headers };
      if (body) opt.body = JSON.stringify(body);
      const res = await fetch('/api/v1' + endpoint, opt);
      if (res.status === 401 || res.status === 403) {
        masterKey = '';
        sessionStorage.removeItem('cpay_session_token');
        sessionStorage.removeItem('cpay_session_expires');
        render();
        throw new Error('Unauthorized');
      }
      return await res.json();
    }

    async function loadData() {
      if (!masterKey) return;
      isLoading = true;
      render();
      try {
        let statsUrl = '/admin/stats';
        let sessionsUrl = '/admin/sessions?status=' + statusFilter + '&search=' + encodeURIComponent(searchFilter);
        
        if (activeDateRange === 'custom' && customStartDate) {
          statsUrl += `?start_date=${customStartDate}&end_date=${customEndDate || customStartDate}`;
          sessionsUrl += `&start_date=${customStartDate}&end_date=${customEndDate || customStartDate}`;
        }

        const [st, ss, mm, rh] = await Promise.all([
          apiCall(statsUrl),
          apiCall(sessionsUrl),
          apiCall('/admin/merchants'),
          apiCall('/admin/rpc-health')
        ]);
        stats = st;
        sessions = ss.sessions || [];
        merchants = mm.merchants || [];
        rpcHealth = rh.nodes || [];
      } catch (e) {
        console.error(e);
      }
      isLoading = false;
      render();
    }

    async function handleLogin(e) {
      e.preventDefault();
      const pwInput   = document.getElementById('keyInput').value.trim();
      const totpInput = document.getElementById('totpInput').value.trim();
      if (!pwInput) { alert('Enter your admin password.'); return; }
      const btn = e.target.querySelector('button[type="submit"]');
      if (btn) { btn.disabled = true; btn.innerText = 'Verifying...'; }
      try {
        const res = await fetch('/api/v1/admin/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ master_key: pwInput, totp_code: totpInput || '000000' })
        });
        const data = await res.json();
        if (res.status === 429) {
          alert('🔒 ' + (data.detail || 'Too many attempts. Temporarily locked.'));
          return;
        }
        if (data.success && data.token) {
          masterKey = data.token;
          sessionStorage.setItem('cpay_session_token', masterKey);
          sessionStorage.setItem('cpay_session_expires', data.expires_at || '');
          await loadData();
        } else {
          alert('❌ ' + (data.detail || 'Invalid credentials'));
        }
      } catch (err) {
        alert('Authentication failed: ' + err.message);
      } finally {
        if (btn) { btn.disabled = false; btn.innerText = 'Access Dashboard →'; }
      }
    }

    async function handleChangePassword(e) {
      e.preventDefault();
      const newPw   = document.getElementById('newPwInput').value.trim();
      const confirmPw = document.getElementById('confirmPwInput').value.trim();
      const totp    = document.getElementById('changePwTotp').value.trim();
      if (!newPw || newPw.length < 16) { alert('Password must be at least 16 characters.'); return; }
      if (newPw !== confirmPw) { alert('Passwords do not match.'); return; }
      if (!totp) { alert('Enter your 2FA code to authorise this change.'); return; }
      try {
        const data = await apiCall('/admin/change-password', 'POST', { totp_code: totp, new_master_key: newPw });
        if (data.success) {
          alert('✅ Password updated! You will be logged out. Log in with the new password.');
          handleLogout();
        } else {
          alert('❌ ' + (data.detail || 'Failed to change password.'));
        }
      } catch (err) {
        if (err.message !== 'Unauthorized') alert('Error: ' + err.message);
      }
    }

    function handleLogout() {
      masterKey = '';
      sessionStorage.removeItem('cpay_session_token');
      sessionStorage.removeItem('cpay_session_expires');
      render();
    }

    function setCurrency(curr) {
      selectedCurrency = curr;
      localStorage.setItem('cpay_admin_curr', curr);
      render();
    }

    function setDateFilter(range) {
      activeDateRange = range;
      if (range !== 'custom') {
        customStartDate = '';
        customEndDate = '';
      }
      loadData();
    }

    function applyCustomDateRange(e) {
      e.preventDefault();
      customStartDate = document.getElementById('cStartDate').value;
      customEndDate = document.getElementById('cEndDate').value;
      if (!customStartDate) {
        alert('Please select a start date.');
        return;
      }
      activeDateRange = 'custom';
      loadData();
    }

    function exportCsv() {
      if (!sessions || sessions.length === 0) {
        alert('No sessions to export.');
        return;
      }
      const headers = ['Session ID', 'Custom ID', 'Status', 'Amount (USD)', 'Currency', 'Coin', 'TxID', 'Created At'];
      const rows = sessions.map(s => [
        `"${s.session_id || ''}"`,
        `"${s.custom_id || ''}"`,
        `"${s.status || ''}"`,
        s.amount || 0,
        `"${s.currency || 'USD'}"`,
        `"${s.coin || ''}"`,
        `"${s.txid || ''}"`,
        `"${s.created_at || ''}"`
      ]);
      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `clusterpay_transactions_${selectedCurrency}_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

    async function handleResendWebhook(sessionId) {
      const btn = document.getElementById('btn-wh-' + sessionId);
      if (btn) btn.innerHTML = '<span class="animate-spin">⏳</span>';
      try {
        const res = await apiCall('/admin/webhooks/resend/' + sessionId, 'POST');
        if (res.success) {
          alert('Webhook dispatched! Destination server returned HTTP ' + res.http_status);
        } else {
          alert('Webhook dispatch failed: HTTP ' + res.http_status + ' (' + (res.error || '') + ')');
        }
      } catch (err) {
        alert('Webhook failed: ' + err.message);
      }
      if (btn) btn.innerHTML = '⚡ Re-send';
    }

    async function handleCreateInvoice(e) {
      e.preventDefault();
      const amount = parseFloat(document.getElementById('invAmount').value);
      const currency = document.getElementById('invCurrency').value;
      const customId = document.getElementById('invCustomId').value.trim();
      const description = document.getElementById('invDesc').value.trim();

      const bep20 = document.getElementById('invBep20').value.trim();
      const trc20 = document.getElementById('invTrc20').value.trim();
      const poly = document.getElementById('invPoly').value.trim();
      const arb = document.getElementById('invArb').value.trim();
      const ton = document.getElementById('invTon').value.trim();
      const btc = document.getElementById('invBtc').value.trim();
      const ltc = document.getElementById('invLtc').value.trim();
      const bnb = document.getElementById('invBnb').value.trim();
      const pol = document.getElementById('invPol').value.trim();

      const merchantName = document.getElementById('invMerchantName').value.trim();
      const merchantUrl = document.getElementById('invMerchantUrl').value.trim();
      const logoUrl = document.getElementById('invLogoUrl').value.trim();
      const themeColor = document.getElementById('invThemeColor').value.trim();
      const callbackUrl = document.getElementById('invCallbackUrl').value.trim();
      const redirectUrl = document.getElementById('invRedirectUrl').value.trim();
      const expiryMinutes = parseInt(document.getElementById('invExpiry').value) || 15;

      const wallets = {};
      if (bep20) wallets['bep20'] = bep20;
      if (trc20) wallets['trc20'] = trc20;
      if (poly) wallets['poly'] = poly;
      if (arb) wallets['arb'] = arb;
      if (ton) wallets['ton'] = ton;
      if (btc) wallets['btc'] = btc;
      if (ltc) wallets['ltc'] = ltc;
      if (bnb) wallets['bnb'] = bnb;
      if (pol) wallets['pol'] = pol;

      if (Object.keys(wallets).length === 0) {
        alert('Please provide at least one destination wallet address.');
        return;
      }

      const submitBtn = document.getElementById('createInvSubmitBtn');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerText = 'Creating Hosted Checkout...';
      }

      try {
        const res = await apiCall('/admin/sessions/create', 'POST', {
          amount,
          currency,
          custom_id: customId,
          description,
          wallets,
          merchant_name: merchantName,
          merchant_url: merchantUrl,
          logo_url: logoUrl,
          theme_color: themeColor,
          callback_url: callbackUrl,
          redirect_url: redirectUrl,
          expiry_minutes: expiryMinutes
        });
        if (res.success) {
          prompt('✅ Hosted Checkout Created! Copy Link:', res.payment_url);
          document.getElementById('createModal').classList.add('hidden');
          await loadData();
        } else {
          alert('Failed: ' + (res.detail || 'Could not create invoice.'));
        }
      } catch (err) {
        alert('Failed to create invoice: ' + err.message);
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerText = 'Create & Get Hosted Link →';
        }
      }
    }

    async function handleCreateMerchant(e) {
      e.preventDefault();
      const name = document.getElementById('mName').value.trim();
      const ips = document.getElementById('mIps').value.trim().split(',').map(s => s.trim()).filter(Boolean);
      try {
        const res = await apiCall('/admin/merchants', 'POST', { name, allowed_ips: ips });
        if (res.success) {
          alert('Merchant Created!\\nAPI Key:\\n' + res.merchant.api_key);
          document.getElementById('merchantModal').classList.add('hidden');
          await loadData();
        }
      } catch (err) {
        alert('Failed to create merchant: ' + err.message);
      }
    }

    function render() {
      const app = document.getElementById('app');
      
      if (!masterKey) {
        app.innerHTML = `
          <div class="min-h-screen flex items-center justify-center p-4 bg-[#FAFAFA]">
            <div class="w-full max-w-sm bg-white rounded-3xl p-7 border border-zinc-200 shadow-xl space-y-6">
              <div class="flex items-center gap-2.5">
                <div class="w-8 h-8 rounded-xl bg-zinc-950 text-white flex items-center justify-center font-bold text-xs">CP</div>
                <div>
                  <h1 class="font-sans font-bold text-base text-zinc-950 leading-tight">ClusterPay Console</h1>
                  <p class="text-[11px] font-mono text-zinc-400">Self-Hosted Admin Portal</p>
                </div>
              </div>

              <form onsubmit="handleLogin(event)" class="space-y-4">
                <div class="space-y-1.5">
                  <label class="block text-xs font-mono font-medium text-zinc-700">Admin Password</label>
                  <input 
                    type="password" 
                    id="keyInput" 
                    placeholder="••••••••••••••••••••••••••••••••" 
                    class="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50 font-mono text-xs text-zinc-900 focus:outline-none focus:border-zinc-950 focus:bg-white transition-all"
                    required
                    autocomplete="current-password"
                  />
                  <p class="text-[10px] font-mono text-zinc-400">Your ADMIN_MASTER_KEY from .env</p>
                </div>

                <div class="space-y-1.5">
                  <label class="block text-xs font-mono font-medium text-zinc-700">2FA Code</label>
                  <input 
                    type="text"
                    id="totpInput"
                    placeholder="6-digit code"
                    maxlength="6"
                    pattern="[0-9]{6}"
                    inputmode="numeric"
                    class="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50 font-mono text-sm text-zinc-900 tracking-widest text-center focus:outline-none focus:border-zinc-950 focus:bg-white transition-all"
                    autocomplete="one-time-code"
                  />
                  <p class="text-[10px] font-mono text-zinc-400">Google Authenticator · Authy · <a href="https://2fa.live" target="_blank" class="underline">2fa.live</a> · Leave blank if 2FA not configured</p>
                </div>

                <button 
                  type="submit" 
                  class="w-full py-2.5 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-semibold font-sans shadow-md transition-all cursor-pointer"
                >
                  Access Dashboard →
                </button>
              </form>
            </div>
          </div>
        `;
        return;
      }

      let periodTitle = "Total Volume";
      let periodAmount = (stats && stats.total_volume_usd) || 0.0;
      let periodCount = (stats && stats.paid_sessions) || 0;

      if (activeDateRange === 'today') {
        periodTitle = "Today's Revenue";
        periodAmount = (stats && stats.today_volume_usd) || 0.0;
        periodCount = (stats && stats.today_paid_count) || 0;
      } else if (activeDateRange === 'yesterday') {
        periodTitle = "Yesterday's Revenue";
        periodAmount = (stats && stats.yesterday_volume_usd) || 0.0;
        periodCount = (stats && stats.yesterday_paid_count) || 0;
      } else if (activeDateRange === '7d') {
        periodTitle = "Last 7 Days Revenue";
        periodAmount = (stats && stats.last_7d_volume_usd) || 0.0;
        periodCount = (stats && stats.last_7d_paid_count) || 0;
      } else if (activeDateRange === '30d') {
        periodTitle = "Last 30 Days Revenue";
        periodAmount = (stats && stats.last_30d_volume_usd) || 0.0;
        periodCount = (stats && stats.last_30d_paid_count) || 0;
      } else if (activeDateRange === 'month') {
        periodTitle = "This Month's Revenue";
        periodAmount = (stats && stats.this_month_volume_usd) || 0.0;
        periodCount = (stats && stats.this_month_paid_count) || 0;
      } else if (activeDateRange === 'custom') {
        periodTitle = "Custom Period (" + customStartDate + " to " + (customEndDate || 'Now') + ")";
        periodAmount = (stats && stats.custom_volume_usd) || 0.0;
        periodCount = (stats && stats.custom_paid_count) || 0;
      }

      app.innerHTML = `
        <header class="bg-white border-b border-zinc-200 sticky top-0 z-30">
          <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-3">
            
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-xl bg-zinc-950 text-white flex items-center justify-center font-bold text-xs shadow-2xs">CP</div>
              <div>
                <div class="flex items-center gap-2">
                  <span class="font-sans font-bold text-sm sm:text-base text-zinc-950">ClusterPay</span>
                  <span class="px-1.5 py-0.2 rounded-full bg-emerald-50 border border-emerald-200 text-[#26A17B] font-mono text-[9.5px] font-bold">SELF-HOSTED</span>
                </div>
                <div class="text-[10px] font-mono text-zinc-400 hidden sm:block">Open-Source Gateway Engine v2.1</div>
              </div>
            </div>

            <div class="flex items-center gap-2 sm:gap-3 flex-wrap">
              <div class="relative flex items-center">
                <select 
                  id="currencySelect" 
                  onchange="setCurrency(this.value)" 
                  class="appearance-none pl-7 pr-8 py-1.5 bg-zinc-100 hover:bg-zinc-200/80 border border-zinc-200 rounded-xl font-mono text-xs font-semibold text-zinc-900 focus:outline-none cursor-pointer transition-colors shadow-2xs"
                >
                  ` + Object.keys(CURRENCIES).map(code => `
                    <option value="${code}" ${selectedCurrency === code ? 'selected' : ''}>
                      ${CURRENCIES[code].flag} ${code} (${CURRENCIES[code].symbol})
                    </option>
                  `).join('') + `
                </select>
                <div class="absolute left-2 pointer-events-none text-xs">🌐</div>
                <div class="absolute right-2.5 pointer-events-none text-[10px] text-zinc-500">▼</div>
              </div>

              <button 
                onclick="document.getElementById('createModal').classList.remove('hidden')" 
                class="px-3 sm:px-3.5 py-1.5 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-semibold font-sans flex items-center gap-1.5 shadow-2xs cursor-pointer transition-colors"
              >
                <span>+ Invoice</span>
              </button>

              <button 
                onclick="loadData()" 
                class="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 text-zinc-700 text-xs font-mono flex items-center gap-1 cursor-pointer transition-colors"
              >
                <span class="${isLoading ? 'animate-spin' : ''}">↻</span>
                <span class="hidden sm:inline">Refresh</span>
              </button>

              <button 
                onclick="handleLogout()" 
                class="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition-colors cursor-pointer text-xs font-mono"
              >
                Logout
              </button>
            </div>

          </div>

          <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-6 overflow-x-auto text-xs font-mono border-t border-zinc-100">
            <button 
              onclick="currentTab = 'overview'; render();" 
              class="py-2.5 border-b-2 font-semibold transition-colors cursor-pointer whitespace-nowrap " + (currentTab === 'overview' ? 'border-zinc-950 text-zinc-950' : 'border-transparent text-zinc-500 hover:text-zinc-800')
            >
              📊 Revenue & Overview
            </button>
            <button 
              onclick="currentTab = 'sessions'; render();" 
              class="py-2.5 border-b-2 font-semibold transition-colors cursor-pointer whitespace-nowrap " + (currentTab === 'sessions' ? 'border-zinc-950 text-zinc-950' : 'border-transparent text-zinc-500 hover:text-zinc-800')
            >
              🧾 Transactions (` + sessions.length + `)
            </button>
            <button 
              onclick="currentTab = 'merchants'; render();" 
              class="py-2.5 border-b-2 font-semibold transition-colors cursor-pointer whitespace-nowrap " + (currentTab === 'merchants' ? 'border-zinc-950 text-zinc-950' : 'border-transparent text-zinc-500 hover:text-zinc-800')
            >
              🔑 API Keys (` + merchants.length + `)
            </button>
            <button 
              onclick="currentTab = 'rpc'; render();" 
              class="py-2.5 border-b-2 font-semibold transition-colors cursor-pointer whitespace-nowrap " + (currentTab === 'rpc' ? 'border-zinc-950 text-zinc-950' : 'border-transparent text-zinc-500 hover:text-zinc-800')
            >
              🛰️ RPC Nodes (` + rpcHealth.length + `)
            </button>
            <button 
              onclick="currentTab = 'security'; render();" 
              class="py-2.5 border-b-2 font-semibold transition-colors cursor-pointer whitespace-nowrap " + (currentTab === 'security' ? 'border-zinc-950 text-zinc-950' : 'border-transparent text-zinc-500 hover:text-zinc-800')
            >
              🛡️ Security
            </button>
          </div>
        </header>

        <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full space-y-6">

          ` + (currentTab === 'overview' ? `
            <div class="p-4 rounded-2xl bg-white border border-zinc-200/90 shadow-2xs space-y-3">
              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div class="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                  <span class="text-xs font-mono text-zinc-400 mr-1 hidden md:inline">Filter:</span>
                  ` + ['today', 'yesterday', '7d', '30d', 'month', 'all'].map(r => `
                    <button 
                      onclick="setDateFilter('${r}')"
                      class="px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer whitespace-nowrap ` + (activeDateRange === r ? 'bg-zinc-950 text-white shadow-2xs' : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700') + `"
                    >
                      ` + (r === 'today' ? 'Today' : r === 'yesterday' ? 'Yesterday' : r === '7d' ? 'Last 7 Days' : r === '30d' ? 'Last 30 Days' : r === 'month' ? 'This Month' : 'All Time') + `
                    </button>
                  `).join('') + `
                </div>

                <button 
                  onclick="document.getElementById('datePickerContainer').classList.toggle('hidden')" 
                  class="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-mono text-xs font-semibold cursor-pointer transition-colors shrink-0"
                >
                  <span>📅 Custom Calendar</span>
                </button>
              </div>

              <form id="datePickerContainer" onsubmit="applyCustomDateRange(event)" class="` + (activeDateRange === 'custom' ? '' : 'hidden') + ` pt-3 border-t border-zinc-100 flex flex-wrap items-center gap-3">
                <div class="flex items-center gap-2">
                  <span class="text-xs font-mono text-zinc-500">From:</span>
                  <input type="date" id="cStartDate" value="${customStartDate}" class="px-2.5 py-1 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-mono" required />
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-xs font-mono text-zinc-500">To:</span>
                  <input type="date" id="cEndDate" value="${customEndDate}" class="px-2.5 py-1 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-mono" />
                </div>
                <button type="submit" class="px-3 py-1 rounded-lg bg-zinc-950 text-white text-xs font-mono font-semibold cursor-pointer hover:bg-zinc-800 transition-colors">
                  Apply Range
                </button>
              </form>
            </div>

            <div class="p-6 sm:p-7 rounded-3xl bg-zinc-950 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
              <div class="space-y-2 z-10">
                <div class="flex items-center gap-2">
                  <span class="px-2 py-0.5 rounded-full bg-zinc-800 text-emerald-400 font-mono text-[10px] font-bold uppercase tracking-wider">
                    ` + periodTitle + `
                  </span>
                  <span class="text-xs font-mono text-zinc-400">· Settled Direct to Merchant</span>
                </div>
                
                <div class="font-mono text-3xl sm:text-5xl font-bold tracking-tight text-white">
                  ` + formatMoney(periodAmount) + `
                </div>

                <div class="flex items-center gap-4 text-xs font-mono text-zinc-400 pt-1">
                  <span>✅ <strong>` + periodCount + `</strong> Paid Invoices</span>
                  <span>·</span>
                  <span>⚡ <strong>0%</strong> Fee Skim</span>
                  <span>·</span>
                  <span>Currency: <strong>` + selectedCurrency + `</strong></span>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-2 sm:gap-3 shrink-0 z-10 text-xs font-mono">
                <div class="p-3 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-1">
                  <div class="text-[10px] text-zinc-400">TODAY</div>
                  <div class="font-bold text-white text-sm sm:text-base">` + formatMoney(stats ? stats.today_volume_usd : 0) + `</div>
                  <div class="text-[9.5px] text-emerald-400">` + (stats ? stats.today_paid_count : 0) + ` orders</div>
                </div>

                <div class="p-3 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-1">
                  <div class="text-[10px] text-zinc-400">YESTERDAY</div>
                  <div class="font-bold text-white text-sm sm:text-base">` + formatMoney(stats ? stats.yesterday_volume_usd : 0) + `</div>
                  <div class="text-[9.5px] text-zinc-400">` + (stats ? stats.yesterday_paid_count : 0) + ` orders</div>
                </div>

                <div class="p-3 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-1">
                  <div class="text-[10px] text-zinc-400">LAST 7 DAYS</div>
                  <div class="font-bold text-white text-sm sm:text-base">` + formatMoney(stats ? stats.last_7d_volume_usd : 0) + `</div>
                  <div class="text-[9.5px] text-emerald-400">` + (stats ? stats.last_7d_paid_count : 0) + ` orders</div>
                </div>

                <div class="p-3 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-1">
                  <div class="text-[10px] text-zinc-400">THIS MONTH</div>
                  <div class="font-bold text-white text-sm sm:text-base">` + formatMoney(stats ? stats.this_month_volume_usd : 0) + `</div>
                  <div class="text-[9.5px] text-emerald-400">` + (stats ? stats.this_month_paid_count : 0) + ` orders</div>
                </div>
              </div>
            </div>

            <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div class="p-4 sm:p-5 rounded-2xl bg-white border border-zinc-200 shadow-2xs space-y-1">
                <div class="text-xs font-mono text-zinc-400">ALL-TIME REVENUE</div>
                <div class="font-mono text-xl sm:text-2xl font-bold text-zinc-950">` + formatMoney(stats ? stats.total_volume_usd : 0) + `</div>
                <div class="text-[11px] font-sans text-zinc-500">100% Retained</div>
              </div>

              <div class="p-4 sm:p-5 rounded-2xl bg-white border border-zinc-200 shadow-2xs space-y-1">
                <div class="text-xs font-mono text-zinc-400">TOTAL INVOICES</div>
                <div class="font-mono text-xl sm:text-2xl font-bold text-zinc-950">` + (stats ? stats.total_sessions : 0) + `</div>
                <div class="text-[11px] font-sans text-zinc-500">` + (stats ? stats.paid_sessions : 0) + ` settled (` + (stats ? stats.success_rate : 0) + `%)</div>
              </div>

              <div class="p-4 sm:p-5 rounded-2xl bg-white border border-zinc-200 shadow-2xs space-y-1">
                <div class="text-xs font-mono text-zinc-400">PENDING INVOICES</div>
                <div class="font-mono text-xl sm:text-2xl font-bold text-amber-600">` + (stats ? stats.pending_sessions : 0) + `</div>
                <div class="text-[11px] font-sans text-zinc-500">Awaiting on-chain tx</div>
              </div>

              <div class="p-4 sm:p-5 rounded-2xl bg-white border border-zinc-200 shadow-2xs space-y-1">
                <div class="text-xs font-mono text-zinc-400">ACTIVE CLIENTS / KEYS</div>
                <div class="font-mono text-xl sm:text-2xl font-bold text-zinc-950">` + merchants.length + `</div>
                <div class="text-[11px] font-sans text-zinc-500">Authorized endpoints</div>
              </div>
            </div>
          ` : '') + `

          ` + (currentTab === 'sessions' ? `
            <div class="p-5 sm:p-6 rounded-3xl bg-white border border-zinc-200 shadow-2xs space-y-4">
              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 class="font-sans font-bold text-lg text-zinc-950">Transactions & Invoices</h3>
                  <p class="text-xs font-mono text-zinc-500">Real-time non-custodial checkout sessions</p>
                </div>

                <div class="flex items-center gap-2 flex-wrap">
                  <button onclick="exportCsv()" class="px-3 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 text-zinc-800 text-xs font-mono font-semibold cursor-pointer transition-colors">
                    📥 Export CSV
                  </button>

                  <select 
                    onchange="statusFilter = this.value; loadData();"
                    class="px-3 py-1.5 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-mono text-zinc-800"
                  >
                    <option value="all" ` + (statusFilter === 'all' ? 'selected' : '') + `>All Statuses</option>
                    <option value="paid" ` + (statusFilter === 'paid' ? 'selected' : '') + `>Paid</option>
                    <option value="pending" ` + (statusFilter === 'pending' ? 'selected' : '') + `>Pending</option>
                    <option value="expired" ` + (statusFilter === 'expired' ? 'selected' : '') + `>Expired</option>
                  </select>
                </div>
              </div>

              <input 
                type="text" 
                placeholder="Search by session_id, order_id, or txid..." 
                value="${searchFilter}"
                oninput="searchFilter = this.value; loadData();"
                class="w-full px-3.5 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-mono text-zinc-900 focus:outline-none focus:bg-white"
              />

              <div class="overflow-x-auto">
                <table class="w-full text-left text-xs font-mono">
                  <thead class="bg-zinc-50 text-zinc-400 border-b border-zinc-200">
                    <tr>
                      <th class="p-3">Order / Session</th>
                      <th class="p-3">Amount (` + selectedCurrency + `)</th>
                      <th class="p-3">Status</th>
                      <th class="p-3">On-Chain TxID</th>
                      <th class="p-3">Created</th>
                      <th class="p-3 text-right">Webhook</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-zinc-100">
                    ` + sessions.map(s => `
                      <tr class="hover:bg-zinc-50/80 transition-colors">
                        <td class="p-3">
                          <div class="font-bold text-zinc-900">` + (s.custom_id || 'Direct') + `</div>
                          <div class="text-[10px] text-zinc-400 truncate max-w-[140px]">` + s.session_id + `</div>
                        </td>
                        <td class="p-3 font-bold text-zinc-950">
                          ` + formatMoney(s.amount) + `
                          <span class="text-[10px] text-zinc-400 font-normal">(` + (s.currency || 'USD') + `)</span>
                        </td>
                        <td class="p-3">
                          <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ` + (
                            s.status === 'paid' ? 'bg-emerald-50 text-[#26A17B] border border-emerald-200' :
                            s.status === 'pending' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                            'bg-zinc-100 text-zinc-500'
                          ) + `">
                            ` + s.status.toUpperCase() + `
                          </span>
                        </td>
                        <td class="p-3">
                          ` + (s.txid ? `
                            <span class="truncate max-w-[120px] block text-zinc-700 font-mono text-[10px]" title="` + s.txid + `">` + s.txid.slice(0, 10) + `...</span>
                          ` : '<span class="text-zinc-300">--</span>') + `
                        </td>
                        <td class="p-3 text-[11px] text-zinc-500">
                          ` + (s.created_at ? s.created_at.replace('T', ' ').slice(0, 16) : 'N/A') + `
                        </td>
                        <td class="p-3 text-right">
                          <button 
                            id="btn-wh-` + s.session_id + `"
                            onclick="handleResendWebhook('` + s.session_id + `')"
                            class="px-2 py-1 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-[10px] font-bold cursor-pointer transition-colors"
                          >
                            ⚡ Re-send
                          </button>
                        </td>
                      </tr>
                    `).join('') + `
                  </tbody>
                </table>
              </div>
            </div>
          ` : '') + `

          ` + (currentTab === 'merchants' ? `
            <div class="p-5 sm:p-6 rounded-3xl bg-white border border-zinc-200 shadow-2xs space-y-4">
              <div class="flex items-center justify-between">
                <div>
                  <h3 class="font-sans font-bold text-lg text-zinc-950">Merchant API Keys</h3>
                  <p class="text-xs font-mono text-zinc-500">Provisioned API credentials for apps and bots</p>
                </div>

                <button 
                  onclick="document.getElementById('merchantModal').classList.remove('hidden')" 
                  class="px-3.5 py-1.5 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-semibold cursor-pointer"
                >
                  + New Key
                </button>
              </div>

              <div class="divide-y divide-zinc-100">
                ` + merchants.map(m => `
                  <div class="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
                    <div>
                      <div class="font-bold text-zinc-950 text-sm">` + m.name + `</div>
                      <div class="text-zinc-500 select-all text-xs bg-zinc-50 px-2 py-1 rounded mt-1 border border-zinc-200 inline-block font-mono">
                        ` + m.api_key + `
                      </div>
                    </div>

                    <div class="text-left sm:text-right text-[11px] text-zinc-400">
                      <div>IP Allowlist: ` + (m.allowed_ips && m.allowed_ips.length ? m.allowed_ips.join(', ') : 'All (*) Allowed') + `</div>
                      <div>Created: ` + (m.created_at ? m.created_at.slice(0, 10) : 'N/A') + `</div>
                    </div>
                  </div>
                `).join('') + `
              </div>
            </div>
          ` : '') + `

          ` + (currentTab === 'rpc' ? `
            <div class="p-5 sm:p-6 rounded-3xl bg-white border border-zinc-200 shadow-2xs space-y-4">
              <div>
                <h3 class="font-sans font-bold text-lg text-zinc-950">Multi-Chain RPC Watchers</h3>
                <p class="text-xs font-mono text-zinc-500">Live block height ping and latency diagnostics</p>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                ` + rpcHealth.map(n => `
                  <div class="p-4 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-2 text-xs font-mono">
                    <div class="flex items-center justify-between">
                      <span class="font-bold text-zinc-950 text-sm">` + n.network + `</span>
                      <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ` + (
                        n.status === 'healthy' ? 'bg-emerald-50 text-[#26A17B] border border-emerald-200' : 'bg-rose-50 text-rose-600 border border-rose-200'
                      ) + `">
                        ` + n.status.toUpperCase() + `
                      </span>
                    </div>
                    <div class="text-[11px] text-zinc-500 truncate">` + n.url + `</div>
                    <div class="text-zinc-700 pt-1 flex items-center gap-1">
                      <span>⚡ Latency:</span>
                      <strong>` + (n.latency_ms > 0 ? n.latency_ms + ' ms' : 'Timeout') + `</strong>
                    </div>
                  </div>
                `).join('') + `
              </div>
            </div>
          ` : '') + `

        </main>

        <!-- ── EXPANDED HOSTED CHECKOUT MODAL ── -->
        <div id="createModal" class="hidden fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div class="bg-white rounded-3xl p-6 sm:p-7 max-w-xl w-full border border-zinc-200 shadow-2xl space-y-5 my-8 max-h-[90vh] overflow-y-auto">
            <div class="flex items-center justify-between pb-3 border-b border-zinc-100">
              <div>
                <h3 class="font-sans font-bold text-lg text-zinc-950">Generate Hosted Checkout</h3>
                <p class="text-[11px] font-mono text-zinc-500">Configure multi-chain addresses &amp; checkout parameters</p>
              </div>
              <button onclick="document.getElementById('createModal').classList.add('hidden')" class="p-1.5 rounded-full hover:bg-zinc-100 text-zinc-400 hover:text-black transition-colors cursor-pointer">✕</button>
            </div>

            <form onsubmit="handleCreateInvoice(event)" class="space-y-4 text-xs font-mono">
              
              <!-- ── 1. ORDER & PRICING ── -->
              <div class="space-y-2.5 p-3.5 bg-zinc-50 rounded-2xl border border-zinc-200/80">
                <div class="font-bold text-zinc-950 font-sans text-xs flex items-center gap-1.5">
                  <span>🏷️</span>
                  <span>Order &amp; Pricing</span>
                </div>
                
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div class="space-y-1">
                    <label class="font-semibold text-zinc-700">Amount *</label>
                    <input type="number" step="0.001" id="invAmount" placeholder="49.99" class="w-full px-3 py-2 bg-white border border-zinc-200 rounded-xl" required />
                  </div>

                  <div class="space-y-1">
                    <label class="font-semibold text-zinc-700">Base Currency</label>
                    <select id="invCurrency" class="w-full px-3 py-2 bg-white border border-zinc-200 rounded-xl">
                      <option value="USD">USD ($)</option>
                      <option value="INR">INR (₹)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="GBP">GBP (£)</option>
                      <option value="AED">AED (د.إ)</option>
                      <option value="CAD">CAD ($)</option>
                      <option value="AUD">AUD ($)</option>
                      <option value="JPY">JPY (¥)</option>
                      <option value="USDT">USDT (₮)</option>
                    </select>
                  </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div class="space-y-1">
                    <label class="font-semibold text-zinc-700">Order ID / Ref</label>
                    <input type="text" id="invCustomId" placeholder="ORDER-9821" class="w-full px-3 py-2 bg-white border border-zinc-200 rounded-xl" />
                  </div>
                  <div class="space-y-1">
                    <label class="font-semibold text-zinc-700">Product / Item Note</label>
                    <input type="text" id="invDesc" placeholder="1x Pro Plan Subscription" class="w-full px-3 py-2 bg-white border border-zinc-200 rounded-xl" />
                  </div>
                </div>
              </div>

              <!-- ── 2. DESTINATION WALLETS ── -->
              <div class="space-y-2.5 p-3.5 bg-zinc-50 rounded-2xl border border-zinc-200/80">
                <div class="flex items-center justify-between">
                  <div class="font-bold text-zinc-950 font-sans text-xs flex items-center gap-1.5">
                    <span>💳</span>
                    <span>Receiving Cold Wallets</span>
                  </div>
                  <span class="text-[10px] text-zinc-400">At least 1 required</span>
                </div>

                <div class="space-y-2">
                  <div>
                    <label class="text-[11px] font-semibold text-zinc-600">USDT (BEP-20 / BSC)</label>
                    <input type="text" id="invBep20" placeholder="0x..." class="w-full px-3 py-1.5 bg-white border border-zinc-200 rounded-xl text-[11px]" />
                  </div>

                  <div>
                    <label class="text-[11px] font-semibold text-zinc-600">USDT (TRC-20 / TRON)</label>
                    <input type="text" id="invTrc20" placeholder="T..." class="w-full px-3 py-1.5 bg-white border border-zinc-200 rounded-xl text-[11px]" />
                  </div>

                  <div>
                    <label class="text-[11px] font-semibold text-zinc-600">USDT (Polygon PoS)</label>
                    <input type="text" id="invPoly" placeholder="0x..." class="w-full px-3 py-1.5 bg-white border border-zinc-200 rounded-xl text-[11px]" />
                  </div>

                  <div>
                    <label class="text-[11px] font-semibold text-zinc-600">USDT (Arbitrum One)</label>
                    <input type="text" id="invArb" placeholder="0x..." class="w-full px-3 py-1.5 bg-white border border-zinc-200 rounded-xl text-[11px]" />
                  </div>

                  <div>
                    <label class="text-[11px] font-semibold text-zinc-600">TON Network (Telegram / Tonkeeper)</label>
                    <input type="text" id="invTon" placeholder="UQ... or EQ..." class="w-full px-3 py-1.5 bg-white border border-zinc-200 rounded-xl text-[11px]" />
                  </div>

                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label class="text-[11px] font-semibold text-zinc-600">Bitcoin (BTC)</label>
                      <input type="text" id="invBtc" placeholder="bc1q..." class="w-full px-3 py-1.5 bg-white border border-zinc-200 rounded-xl text-[11px]" />
                    </div>
                    <div>
                      <label class="text-[11px] font-semibold text-zinc-600">Litecoin (LTC)</label>
                      <input type="text" id="invLtc" placeholder="ltc1q..." class="w-full px-3 py-1.5 bg-white border border-zinc-200 rounded-xl text-[11px]" />
                    </div>
                  </div>

                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label class="text-[11px] font-semibold text-zinc-600">Native BNB (BSC)</label>
                      <input type="text" id="invBnb" placeholder="0x..." class="w-full px-3 py-1.5 bg-white border border-zinc-200 rounded-xl text-[11px]" />
                    </div>
                    <div>
                      <label class="text-[11px] font-semibold text-zinc-600">Native POL (Polygon)</label>
                      <input type="text" id="invPol" placeholder="0x..." class="w-full px-3 py-1.5 bg-white border border-zinc-200 rounded-xl text-[11px]" />
                    </div>
                  </div>
                </div>
              </div>

              <!-- ── 3. BRANDING & CUSTOMIZATION (OPTIONAL) ── -->
              <div class="space-y-2.5 p-3.5 bg-zinc-50 rounded-2xl border border-zinc-200/80">
                <div class="font-bold text-zinc-950 font-sans text-xs flex items-center gap-1.5">
                  <span>🎨</span>
                  <span>Branding &amp; Appearance (Optional)</span>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div class="space-y-1">
                    <label class="font-semibold text-zinc-700">Merchant / Store Name</label>
                    <input type="text" id="invMerchantName" placeholder="Acme Store" class="w-full px-3 py-2 bg-white border border-zinc-200 rounded-xl" />
                  </div>
                  <div class="space-y-1">
                    <label class="font-semibold text-zinc-700">Merchant Website URL</label>
                    <input type="url" id="invMerchantUrl" placeholder="https://acme.com" class="w-full px-3 py-2 bg-white border border-zinc-200 rounded-xl" />
                  </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div class="space-y-1">
                    <label class="font-semibold text-zinc-700">Logo Image URL</label>
                    <input type="url" id="invLogoUrl" placeholder="https://acme.com/logo.png" class="w-full px-3 py-2 bg-white border border-zinc-200 rounded-xl" />
                  </div>
                  <div class="space-y-1">
                    <label class="font-semibold text-zinc-700">Theme Accent Color</label>
                    <input type="text" id="invThemeColor" placeholder="#26A17B" class="w-full px-3 py-2 bg-white border border-zinc-200 rounded-xl" />
                  </div>
                </div>
              </div>

              <!-- ── 4. WEBHOOKS & AUTOMATION (OPTIONAL) ── -->
              <div class="space-y-2.5 p-3.5 bg-zinc-50 rounded-2xl border border-zinc-200/80">
                <div class="font-bold text-zinc-950 font-sans text-xs flex items-center gap-1.5">
                  <span>⚡</span>
                  <span>Webhooks &amp; Expiry (Optional)</span>
                </div>

                <div class="space-y-2">
                  <div class="space-y-1">
                    <label class="font-semibold text-zinc-700">Webhook Callback URL</label>
                    <input type="url" id="invCallbackUrl" placeholder="https://yourstore.com/api/webhook" class="w-full px-3 py-2 bg-white border border-zinc-200 rounded-xl" />
                  </div>

                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div class="space-y-1">
                      <label class="font-semibold text-zinc-700">Success Redirect URL</label>
                      <input type="url" id="invRedirectUrl" placeholder="https://yourstore.com/thanks" class="w-full px-3 py-2 bg-white border border-zinc-200 rounded-xl" />
                    </div>
                    <div class="space-y-1">
                      <label class="font-semibold text-zinc-700">Invoice Expiry (Minutes)</label>
                      <input type="number" id="invExpiry" placeholder="15" value="15" class="w-full px-3 py-2 bg-white border border-zinc-200 rounded-xl" />
                    </div>
                  </div>
                </div>
              </div>

              <button 
                type="submit" 
                id="createInvSubmitBtn"
                class="w-full py-3 rounded-xl bg-zinc-950 text-white font-sans font-semibold text-xs hover:bg-zinc-800 transition-colors shadow-md mt-2 cursor-pointer flex items-center justify-center gap-1.5"
              >
                Create &amp; Get Hosted Link →
              </button>
            </form>
          </div>
        </div>

        ${currentTab === 'security' ? `
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">

            <!-- Change Password -->
            <div class="bg-white rounded-3xl border border-zinc-200 shadow-sm p-6 space-y-5">
              <div>
                <h3 class="font-sans font-bold text-base text-zinc-950">🔑 Change Admin Password</h3>
                <p class="text-xs font-mono text-zinc-500 mt-1">Requires your current 2FA code to authorise.</p>
              </div>
              <form onsubmit="handleChangePassword(event)" class="space-y-4 text-xs font-mono">
                <div class="space-y-1.5">
                  <label class="font-medium text-zinc-700">New Password (min 16 chars)</label>
                  <input type="password" id="newPwInput" placeholder="••••••••••••••••••••••••••" minlength="16"
                    class="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50 font-mono text-xs text-zinc-900 focus:outline-none focus:border-zinc-950 focus:bg-white transition-all" required />
                </div>
                <div class="space-y-1.5">
                  <label class="font-medium text-zinc-700">Confirm New Password</label>
                  <input type="password" id="confirmPwInput" placeholder="••••••••••••••••••••••••••" minlength="16"
                    class="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50 font-mono text-xs text-zinc-900 focus:outline-none focus:border-zinc-950 focus:bg-white transition-all" required />
                </div>
                <div class="space-y-1.5">
                  <label class="font-medium text-zinc-700">Current 2FA Code (authorises change)</label>
                  <input type="text" id="changePwTotp" placeholder="6-digit code" maxlength="6" pattern="[0-9]{6}" inputmode="numeric"
                    class="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50 font-mono text-sm text-zinc-900 tracking-widest text-center focus:outline-none focus:border-zinc-950 focus:bg-white transition-all" />
                  <p class="text-[10px] text-zinc-400">Open <a href="https://2fa.live" target="_blank" class="underline">2fa.live</a> or your authenticator app to get the code.</p>
                </div>
                <div class="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-[11px] text-amber-800">
                  ⚠️ After changing, you'll be logged out. Update <code>ADMIN_MASTER_KEY</code> in <code>.env</code> to persist after restart.
                </div>
                <button type="submit" class="w-full py-2.5 rounded-xl bg-zinc-950 text-white font-sans font-semibold text-xs hover:bg-zinc-800 transition-colors shadow-md cursor-pointer">
                  Update Password →
                </button>
              </form>
            </div>

            <!-- Session Info -->
            <div class="bg-white rounded-3xl border border-zinc-200 shadow-sm p-6 space-y-5">
              <div>
                <h3 class="font-sans font-bold text-base text-zinc-950">🛡️ Current Session</h3>
                <p class="text-xs font-mono text-zinc-500 mt-1">Session tokens are tab-scoped. They expire after 8 hours.</p>
              </div>
              <div class="space-y-3 text-xs font-mono">
                <div class="flex justify-between py-2 border-b border-zinc-100">
                  <span class="text-zinc-500">Token storage</span>
                  <span class="text-zinc-900 font-semibold">sessionStorage (tab-scoped)</span>
                </div>
                <div class="flex justify-between py-2 border-b border-zinc-100">
                  <span class="text-zinc-500">Session TTL</span>
                  <span class="text-zinc-900 font-semibold">8 hours</span>
                </div>
                <div class="flex justify-between py-2 border-b border-zinc-100">
                  <span class="text-zinc-500">Expires at</span>
                  <span class="text-zinc-900 font-semibold">${sessionStorage.getItem('cpay_session_expires') || 'Unknown'}</span>
                </div>
                <div class="flex justify-between py-2 border-b border-zinc-100">
                  <span class="text-zinc-500">Password check</span>
                  <span class="text-green-700 font-semibold">hmac.compare_digest ✓</span>
                </div>
                <div class="flex justify-between py-2 border-b border-zinc-100">
                  <span class="text-zinc-500">2FA method</span>
                  <span class="text-green-700 font-semibold">RFC 6238 TOTP ✓</span>
                </div>
                <div class="flex justify-between py-2">
                  <span class="text-zinc-500">Brute-force</span>
                  <span class="text-green-700 font-semibold">IP lockout (8 attempts) ✓</span>
                </div>
              </div>
              <button onclick="handleLogout()" class="w-full py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-900 font-sans font-semibold text-xs transition-colors cursor-pointer">
                Logout & Clear Session
              </button>
            </div>
          </div>
        </div>
        ` : ''}

        <div id="merchantModal" class="hidden fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div class="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full border border-zinc-200 shadow-2xl space-y-5">
            <div class="flex items-center justify-between">
              <h3 class="font-sans font-bold text-lg text-zinc-950">Issue New API Key</h3>
              <button onclick="document.getElementById('merchantModal').classList.add('hidden')" class="p-1 text-zinc-400 hover:text-black">✕</button>
            </div>

            <form onsubmit="handleCreateMerchant(event)" class="space-y-3.5 text-xs font-mono">
              <div class="space-y-1">
                <label class="font-semibold text-zinc-700">Merchant / App Name</label>
                <input type="text" id="mName" placeholder="e.g. Telegram Bot Pro" class="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl" required />
              </div>

              <div class="space-y-1">
                <label class="font-semibold text-zinc-700">Allowed Server IPs (Comma Separated)</label>
                <input type="text" id="mIps" placeholder="e.g. 1.2.3.4, 5.6.7.8 (leave blank for all)" class="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl" />
              </div>

              <button type="submit" class="w-full py-2.5 rounded-xl bg-zinc-950 text-white font-sans font-semibold text-xs hover:bg-zinc-800 transition-colors shadow-md mt-2">
                Generate API Key →
              </button>
            </form>
          </div>
        </div>
      `;
    }

    render();
    if (masterKey) loadData();
  </script>
</body>
</html>
"""

@router.get("/admin", response_class=HTMLResponse, include_in_schema=False)
async def serve_admin_console():
    return HTMLResponse(ADMIN_HTML)
