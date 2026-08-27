from fastapi import APIRouter
from fastapi.responses import HTMLResponse

router = APIRouter()

ADMIN_HTML = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ClusterPay · Open Source Admin Console</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/lucide@latest"></script>
  <style>
    body { font-family: 'Inter', sans-serif; background-color: #FAFAFA; color: #09090b; }
    .font-serif { font-family: 'Instrument Serif', Georgia, serif; }
    .font-mono { font-family: 'JetBrains Mono', monospace; }
  </style>
</head>
<body class="min-h-screen flex flex-col antialiased selection:bg-black selection:text-white">

  <div id="app" class="flex-1 flex flex-col">
    <!-- RENDERED BY VANIILA JS COMPONENT -->
  </div>

  <script>
    // App State
    let masterKey = localStorage.getItem('cpay_master_key') || '';
    let currentTab = 'overview';
    let stats = null;
    let sessions = [];
    let merchants = [];
    let rpcHealth = [];
    let isLoading = false;
    let searchFilter = '';
    let statusFilter = 'all';

    async function apiCall(endpoint, method = 'GET', body = null) {
      const headers = { 'Content-Type': 'application/json' };
      if (masterKey) headers['Authorization'] = 'Bearer ' + masterKey;
      const opt = { method, headers };
      if (body) opt.body = JSON.stringify(body);
      const res = await fetch('/api/v1' + endpoint, opt);
      if (res.status === 401 || res.status === 403) {
        masterKey = '';
        localStorage.removeItem('cpay_master_key');
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
        const [st, ss, mm, rh] = await Promise.all([
          apiCall('/admin/stats'),
          apiCall('/admin/sessions?status=' + statusFilter + '&search=' + encodeURIComponent(searchFilter)),
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
      const keyInput = document.getElementById('keyInput').value.trim();
      if (!keyInput) return;
      try {
        const res = await apiCall('/admin/auth', 'POST', { master_key: keyInput });
        if (res.success) {
          masterKey = keyInput;
          localStorage.setItem('cpay_master_key', masterKey);
          await loadData();
        }
      } catch (err) {
        alert('Invalid Master Admin Key. Please check ADMIN_MASTER_KEY in your .env');
      }
    }

    function handleLogout() {
      masterKey = '';
      localStorage.removeItem('cpay_master_key');
      render();
    }

    async function handleCreateInvoice(e) {
      e.preventDefault();
      const amount = parseFloat(document.getElementById('invAmount').value);
      const customId = document.getElementById('invCustomId').value.trim();
      const bep20 = document.getElementById('invBep20').value.trim();
      const trc20 = document.getElementById('invTrc20').value.trim();

      const wallets = {};
      if (bep20) wallets['bep20'] = bep20;
      if (trc20) wallets['trc20'] = trc20;

      if (Object.keys(wallets).length === 0) {
        alert('Please provide at least one destination wallet address.');
        return;
      }

      try {
        const res = await apiCall('/admin/sessions/create', 'POST', {
          amount,
          custom_id: customId,
          wallets
        });
        if (res.success) {
          alert('Invoice created successfully!\\n\\nPayment Link: ' + res.payment_url);
          document.getElementById('createModal').classList.add('hidden');
          await loadData();
        }
      } catch (err) {
        alert('Failed to create invoice: ' + err.message);
      }
    }

    async function handleCreateMerchant(e) {
      e.preventDefault();
      const name = document.getElementById('mName').value.trim();
      const ips = document.getElementById('mIps').value.trim().split(',').map(s => s.trim()).filter(Boolean);
      try {
        const res = await apiCall('/admin/merchants', 'POST', { name, allowed_ips: ips });
        if (res.success) {
          alert('API Key Generated:\\n\\n' + res.merchant.api_key);
          document.getElementById('merchantModal').classList.add('hidden');
          await loadData();
        }
      } catch (err) {
        alert('Failed to issue API key: ' + err.message);
      }
    }

    async function handleResendWebhook(sessionId) {
      if (!confirm('Re-dispatch HMAC webhook for session ' + sessionId + '?')) return;
      try {
        const res = await apiCall('/admin/webhooks/resend/' + sessionId, 'POST');
        alert('Webhook Dispatched! HTTP Response: ' + res.http_status);
      } catch (e) {
        alert('Webhook delivery failed: ' + e.message);
      }
    }

    function render() {
      const app = document.getElementById('app');

      // ── SCREEN 1: LOGIN VIEW ──
      if (!masterKey) {
        app.innerHTML = `
          <div class="min-h-screen flex items-center justify-center p-4">
            <div class="w-full max-w-sm bg-white rounded-3xl border border-zinc-200 p-8 shadow-sm space-y-6">
              <div class="text-center space-y-2">
                <div class="w-10 h-10 rounded-2xl bg-black text-white flex items-center justify-center font-mono font-bold text-sm mx-auto shadow-2xs">
                  CP
                </div>
                <h1 class="font-serif text-3xl text-black font-normal">Admin Console</h1>
                <p class="text-xs text-zinc-500 font-mono">Self-Hosted Gateway Control Center</p>
              </div>

              <form onsubmit="handleLogin(event)" class="space-y-4 font-mono text-xs">
                <div>
                  <label class="block text-zinc-600 mb-1.5 font-semibold">ADMIN_MASTER_KEY:</label>
                  <input id="keyInput" type="password" placeholder="Enter master secret from .env" required
                    class="w-full px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-200 text-black focus:outline-none focus:border-black" />
                </div>
                <button type="submit" class="w-full py-3 rounded-xl bg-black text-white font-semibold flex items-center justify-center gap-2 hover:bg-zinc-800 transition-colors shadow-2xs">
                  <span>Authenticate Session</span>
                  <i data-lucide="arrow-right" class="w-4 h-4"></i>
                </button>
              </form>

              <div class="text-[11px] font-mono text-zinc-400 text-center">
                Configure in your server .env as ADMIN_MASTER_KEY
              </div>
            </div>
          </div>
        `;
        lucide.createIcons();
        return;
      }

      // ── SCREEN 2: MAIN ADMIN PORTAL ──
      app.innerHTML = `
        <!-- Top Navbar -->
        <header class="bg-white border-b border-zinc-200 sticky top-0 z-30">
          <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-xl bg-black text-white flex items-center justify-center font-mono font-bold text-xs">
                CP
              </div>
              <span class="font-serif text-xl text-black">ClusterPay</span>
              <span class="px-2 py-0.5 rounded-full bg-zinc-100 border border-zinc-200 text-[10px] font-mono text-zinc-600">
                Self-Hosted Admin
              </span>
            </div>

            <!-- Tab Navigation -->
            <nav class="hidden md:flex items-center gap-1 text-xs font-mono">
              <button onclick="currentTab='overview'; render();" class="px-3 py-1.5 rounded-full transition-colors ${currentTab === 'overview' ? 'bg-black text-white font-semibold' : 'text-zinc-600 hover:text-black'}">Overview</button>
              <button onclick="currentTab='sessions'; render();" class="px-3 py-1.5 rounded-full transition-colors ${currentTab === 'sessions' ? 'bg-black text-white font-semibold' : 'text-zinc-600 hover:text-black'}">Invoices & Sessions</button>
              <button onclick="currentTab='merchants'; render();" class="px-3 py-1.5 rounded-full transition-colors ${currentTab === 'merchants' ? 'bg-black text-white font-semibold' : 'text-zinc-600 hover:text-black'}">API Keys</button>
              <button onclick="currentTab='nodes'; render();" class="px-3 py-1.5 rounded-full transition-colors ${currentTab === 'nodes' ? 'bg-black text-white font-semibold' : 'text-zinc-600 hover:text-black'}">Node Latency</button>
            </nav>

            <div class="flex items-center gap-2 font-mono text-xs">
              <button onclick="loadData()" class="p-2 rounded-xl border border-zinc-200 hover:bg-zinc-50 text-zinc-700">
                <i data-lucide="refresh-cw" class="w-4 h-4 ${isLoading ? 'animate-spin' : ''}"></i>
              </button>
              <button onclick="handleLogout()" class="px-3 py-1.5 rounded-xl border border-zinc-200 text-zinc-700 hover:bg-zinc-50 font-medium">
                Logout
              </button>
            </div>
          </div>
        </header>

        <!-- Main Body -->
        <main class="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
          
          <!-- TAB 1: OVERVIEW -->
          ${currentTab === 'overview' ? `
            <!-- Stat Cards -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div class="bg-white p-5 rounded-2xl border border-zinc-200 shadow-2xs space-y-1">
                <div class="text-[11px] font-mono text-zinc-400 uppercase font-semibold">Total Settled Volume</div>
                <div class="text-2xl font-bold font-mono text-black">$${stats?.total_volume_usd || '0.00'} <span class="text-xs text-zinc-500 font-normal">USD</span></div>
                <div class="text-[11px] text-[#26A17B] font-mono font-medium">100% Direct Cold Settlement</div>
              </div>

              <div class="bg-white p-5 rounded-2xl border border-zinc-200 shadow-2xs space-y-1">
                <div class="text-[11px] font-mono text-zinc-400 uppercase font-semibold">Settled Invoices</div>
                <div class="text-2xl font-bold font-mono text-black">${stats?.paid_sessions || 0} <span class="text-xs text-zinc-400 font-normal">/ ${stats?.total_sessions || 0}</span></div>
                <div class="text-[11px] text-zinc-500 font-mono">${stats?.success_rate || 0}% Conversion Rate</div>
              </div>

              <div class="bg-white p-5 rounded-2xl border border-zinc-200 shadow-2xs space-y-1">
                <div class="text-[11px] font-mono text-zinc-400 uppercase font-semibold">Pending Mempool Watch</div>
                <div class="text-2xl font-bold font-mono text-amber-600">${stats?.pending_sessions || 0}</div>
                <div class="text-[11px] text-zinc-500 font-mono">Active 15-min observation slots</div>
              </div>

              <div class="bg-white p-5 rounded-2xl border border-zinc-200 shadow-2xs space-y-1">
                <div class="text-[11px] font-mono text-zinc-400 uppercase font-semibold">Merchant API Keys</div>
                <div class="text-2xl font-bold font-mono text-black">${stats?.total_merchants || 0}</div>
                <div class="text-[11px] text-zinc-500 font-mono">Active 256-bit credentials</div>
              </div>
            </div>

            <!-- Quick Action Bar -->
            <div class="flex items-center justify-between p-4 bg-white rounded-2xl border border-zinc-200 shadow-2xs flex-wrap gap-4">
              <div class="flex items-center gap-2">
                <i data-lucide="zap" class="w-4 h-4 text-black"></i>
                <span class="font-serif text-lg text-black">Quick Management</span>
              </div>
              <div class="flex items-center gap-2">
                <button onclick="document.getElementById('createModal').classList.remove('hidden')" class="px-4 py-2 rounded-xl bg-black text-white text-xs font-mono font-semibold flex items-center gap-1.5 hover:bg-zinc-800 shadow-2xs">
                  <i data-lucide="plus" class="w-3.5 h-3.5"></i>
                  <span>Create Instant Invoice</span>
                </button>
                <button onclick="document.getElementById('merchantModal').classList.remove('hidden')" class="px-4 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-mono font-semibold flex items-center gap-1.5">
                  <i data-lucide="key" class="w-3.5 h-3.5"></i>
                  <span>Issue API Key</span>
                </button>
              </div>
            </div>

            <!-- Recent Sessions Table -->
            <div class="bg-white rounded-2xl border border-zinc-200 shadow-2xs overflow-hidden">
              <div class="p-5 border-b border-zinc-100 flex items-center justify-between">
                <h3 class="font-serif text-xl text-black">Recent Invoices</h3>
                <button onclick="currentTab='sessions'; render();" class="text-xs font-mono text-black hover:underline">View All &rarr;</button>
              </div>
              ${renderSessionsTable(sessions.slice(0, 5))}
            </div>
          ` : ''}

          <!-- TAB 2: SESSIONS -->
          ${currentTab === 'sessions' ? `
            <div class="space-y-4">
              <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h2 class="font-serif text-3xl text-black font-normal">Invoices & Sessions</h2>
                  <p class="text-xs font-mono text-zinc-500">Live observation state across all blockchain networks</p>
                </div>
                <button onclick="document.getElementById('createModal').classList.remove('hidden')" class="px-4 py-2 rounded-xl bg-black text-white text-xs font-mono font-semibold flex items-center gap-1.5">
                  <i data-lucide="plus" class="w-3.5 h-3.5"></i>
                  <span>New Invoice</span>
                </button>
              </div>

              <!-- Search & Filter Bar -->
              <div class="p-3 bg-white rounded-2xl border border-zinc-200 shadow-2xs flex flex-wrap items-center gap-3 font-mono text-xs">
                <input type="text" placeholder="Search invoice ID, custom ID, or TxHash..." value="${searchFilter}"
                  oninput="searchFilter=this.value; loadData();"
                  class="flex-1 min-w-[200px] px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 focus:outline-none focus:border-black" />
                
                <select onchange="statusFilter=this.value; loadData();" class="px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 focus:outline-none">
                  <option value="all" ${statusFilter === 'all' ? 'selected' : ''}>All Statuses</option>
                  <option value="paid" ${statusFilter === 'paid' ? 'selected' : ''}>Paid</option>
                  <option value="pending" ${statusFilter === 'pending' ? 'selected' : ''}>Pending</option>
                  <option value="expired" ${statusFilter === 'expired' ? 'selected' : ''}>Expired</option>
                </select>
              </div>

              <div class="bg-white rounded-2xl border border-zinc-200 shadow-2xs overflow-hidden">
                ${renderSessionsTable(sessions)}
              </div>
            </div>
          ` : ''}

          <!-- TAB 3: MERCHANTS & API KEYS -->
          ${currentTab === 'merchants' ? `
            <div class="space-y-4">
              <div class="flex items-center justify-between">
                <div>
                  <h2 class="font-serif text-3xl text-black font-normal">Merchant API Keys</h2>
                  <p class="text-xs font-mono text-zinc-500">256-bit entropy API keys with IP whitelist controls</p>
                </div>
                <button onclick="document.getElementById('merchantModal').classList.remove('hidden')" class="px-4 py-2 rounded-xl bg-black text-white text-xs font-mono font-semibold flex items-center gap-1.5">
                  <i data-lucide="plus" class="w-3.5 h-3.5"></i>
                  <span>Issue New Key</span>
                </button>
              </div>

              <div class="bg-white rounded-2xl border border-zinc-200 shadow-2xs overflow-hidden font-mono text-xs">
                <table class="w-full text-left divide-y divide-zinc-200">
                  <thead class="bg-zinc-50 text-zinc-500">
                    <tr>
                      <th class="p-4">Merchant Name</th>
                      <th class="p-4">API Key</th>
                      <th class="p-4">Allowed IPs</th>
                      <th class="p-4">Issued At</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-zinc-100">
                    ${merchants.length === 0 ? `<tr><td colspan="4" class="p-6 text-center text-zinc-400">No API keys issued yet.</td></tr>` : ''}
                    ${merchants.map(m => `
                      <tr class="hover:bg-zinc-50">
                        <td class="p-4 font-semibold text-black">${m.name}</td>
                        <td class="p-4 text-zinc-700">
                          <span class="px-2 py-1 bg-zinc-100 rounded border border-zinc-200 font-mono">${m.api_key}</span>
                        </td>
                        <td class="p-4 text-zinc-500">${m.allowed_ips && m.allowed_ips.length > 0 ? m.allowed_ips.join(', ') : 'All IPs (*)'}</td>
                        <td class="p-4 text-zinc-400">${m.created_at ? new Date(m.created_at).toLocaleDateString() : 'N/A'}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>
          ` : ''}

          <!-- TAB 4: NODE LATENCY -->
          ${currentTab === 'nodes' ? `
            <div class="space-y-4">
              <div>
                <h2 class="font-serif text-3xl text-black font-normal">Multi-Chain RPC Health</h2>
                <p class="text-xs font-mono text-zinc-500">Live latency to decentralized blockchain consensus RPCs</p>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                ${rpcHealth.map(n => `
                  <div class="p-5 bg-white rounded-2xl border border-zinc-200 shadow-2xs flex items-center justify-between font-mono">
                    <div class="space-y-1">
                      <div class="font-semibold text-sm text-black flex items-center gap-2">
                        <span class="w-2.5 h-2.5 rounded-full ${n.status === 'healthy' ? 'bg-[#26A17B]' : 'bg-rose-500'}"></span>
                        <span>${n.network}</span>
                      </div>
                      <div class="text-[11px] text-zinc-400 truncate max-w-[220px]">${n.url}</div>
                    </div>
                    <div class="text-right">
                      <div class="text-lg font-bold ${n.latency_ms > 0 && n.latency_ms < 400 ? 'text-[#26A17B]' : 'text-amber-600'}">${n.latency_ms} ms</div>
                      <div class="text-[10px] uppercase font-semibold text-zinc-400">${n.status}</div>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}

        </main>

        <!-- CREATE INVOICE MODAL -->
        <div id="createModal" class="hidden fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div class="w-full max-w-md bg-white rounded-3xl border border-zinc-200 p-6 space-y-4 font-mono text-xs shadow-lg">
            <div class="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h3 class="font-serif text-xl text-black">Create Instant Invoice</h3>
              <button onclick="document.getElementById('createModal').classList.add('hidden')" class="p-1 rounded hover:bg-zinc-100">
                <i data-lucide="x" class="w-4 h-4"></i>
              </button>
            </div>

            <form onsubmit="handleCreateInvoice(event)" class="space-y-3">
              <div>
                <label class="block text-zinc-600 mb-1">Amount (USD):</label>
                <input id="invAmount" type="number" step="0.01" min="0.1" value="25.00" required
                  class="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-black focus:outline-none focus:border-black" />
              </div>
              <div>
                <label class="block text-zinc-600 mb-1">Custom Order ID (Optional):</label>
                <input id="invCustomId" type="text" placeholder="ORDER_8941"
                  class="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-black focus:outline-none focus:border-black" />
              </div>
              <div>
                <label class="block text-zinc-600 mb-1">BEP-20 Wallet Address:</label>
                <input id="invBep20" type="text" placeholder="0x..."
                  class="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-black focus:outline-none focus:border-black" />
              </div>
              <div>
                <label class="block text-zinc-600 mb-1">TRC-20 Wallet Address:</label>
                <input id="invTrc20" type="text" placeholder="T..."
                  class="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-black focus:outline-none focus:border-black" />
              </div>
              <button type="submit" class="w-full py-3 rounded-xl bg-black text-white font-semibold hover:bg-zinc-800 shadow-2xs transition-colors mt-2">
                Generate Invoice Link
              </button>
            </form>
          </div>
        </div>

        <!-- ISSUE API KEY MODAL -->
        <div id="merchantModal" class="hidden fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div class="w-full max-w-md bg-white rounded-3xl border border-zinc-200 p-6 space-y-4 font-mono text-xs shadow-lg">
            <div class="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h3 class="font-serif text-xl text-black">Issue Merchant API Key</h3>
              <button onclick="document.getElementById('merchantModal').classList.add('hidden')" class="p-1 rounded hover:bg-zinc-100">
                <i data-lucide="x" class="w-4 h-4"></i>
              </button>
            </div>

            <form onsubmit="handleCreateMerchant(event)" class="space-y-3">
              <div>
                <label class="block text-zinc-600 mb-1">Store / Merchant Name:</label>
                <input id="mName" type="text" placeholder="Acme Production Store" required
                  class="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-black focus:outline-none focus:border-black" />
              </div>
              <div>
                <label class="block text-zinc-600 mb-1">IP Whitelist (comma-separated, leave blank for all):</label>
                <input id="mIps" type="text" placeholder="192.168.1.1, 10.0.0.1"
                  class="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-black focus:outline-none focus:border-black" />
              </div>
              <button type="submit" class="w-full py-3 rounded-xl bg-black text-white font-semibold hover:bg-zinc-800 shadow-2xs transition-colors mt-2">
                Generate 256-Bit Secret Key
              </button>
            </form>
          </div>
        </div>
      `;

      lucide.createIcons();
    }

    function renderSessionsTable(items) {
      if (!items || items.length === 0) {
        return `<div class="p-8 text-center text-zinc-400 font-mono text-xs">No invoice sessions found.</div>`;
      }
      return `
        <div class="overflow-x-auto font-mono text-xs">
          <table class="w-full text-left divide-y divide-zinc-200">
            <thead class="bg-zinc-50 text-zinc-500">
              <tr>
                <th class="p-4">Session / Order</th>
                <th class="p-4">Amount Due</th>
                <th class="p-4">Status</th>
                <th class="p-4">On-Chain TxHash</th>
                <th class="p-4">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-zinc-100">
              ${items.map(s => `
                <tr class="hover:bg-zinc-50">
                  <td class="p-4">
                    <div class="font-semibold text-black">${s.custom_id || s.session_id.slice(-8)}</div>
                    <div class="text-[10px] text-zinc-400">${s.session_id}</div>
                  </td>
                  <td class="p-4 font-bold text-black">$${s.amount} <span class="text-zinc-400 font-normal">USDT</span></td>
                  <td class="p-4">
                    <span class="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                      s.status === 'paid' ? 'bg-emerald-50 text-[#26A17B] border border-emerald-200' :
                      s.status === 'pending' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                      'bg-zinc-100 text-zinc-500 border border-zinc-200'
                    }">
                      ${s.status}
                    </span>
                  </td>
                  <td class="p-4 text-zinc-600 truncate max-w-[150px]">
                    ${s.txid ? `<span title="${s.txid}">${s.txid.slice(0, 10)}...</span>` : '<span class="text-zinc-300">Pending</span>'}
                  </td>
                  <td class="p-4">
                    <div class="flex items-center gap-2">
                      <a href="/gateway/pay/${s.session_id}" target="_blank" class="p-1.5 rounded-lg border border-zinc-200 hover:bg-zinc-100 text-zinc-700" title="Open Checkout Page">
                        <i data-lucide="external-link" class="w-3.5 h-3.5"></i>
                      </a>
                      <button onclick="handleResendWebhook('${s.session_id}')" class="p-1.5 rounded-lg border border-zinc-200 hover:bg-zinc-100 text-zinc-700" title="Resend Webhook">
                        <i data-lucide="send" class="w-3.5 h-3.5"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    }

    // Initial load
    if (masterKey) loadData();
    else render();
  </script>
</body>
</html>
"""

@router.get("/admin", response_class=HTMLResponse, include_in_schema=False)
@router.get("/admin/login", response_class=HTMLResponse, include_in_schema=False)
async def serve_admin_panel():
    return HTMLResponse(ADMIN_HTML)
