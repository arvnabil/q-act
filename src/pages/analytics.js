// ============================================
// Analytics Page — Reports & Charts
// ============================================
import {
  QUOTATIONS, CUSTOMERS, SALES_TEAM, BRANDS, MONTHLY_REVENUE, PRODUCTS,
  formatCurrency, formatCurrencyShort, formatDate, calcQuotationTotal, calcGrandTotal,
  statusClasses, statusLabel, brandClasses
} from '../utils.js';

export function renderAnalytics() {
  // === Compute all analytics ===
  const totalQ = QUOTATIONS.length;
  const approved = QUOTATIONS.filter(q => q.status === 'approved');
  const sent = QUOTATIONS.filter(q => q.status === 'sent');
  const draft = QUOTATIONS.filter(q => q.status === 'draft');
  const rejected = QUOTATIONS.filter(q => q.status === 'rejected');
  const expired = QUOTATIONS.filter(q => q.status === 'expired');

  const totalRevenue = approved.reduce((sum, q) => sum + calcGrandTotal(q.items, q.ppnRate), 0);
  const totalPipeline = [...sent, ...draft].reduce((sum, q) => sum + calcGrandTotal(q.items, q.ppnRate), 0);
  const lostRevenue = [...rejected, ...expired].reduce((sum, q) => sum + calcGrandTotal(q.items, q.ppnRate), 0);
  const convRate = totalQ > 0 ? Math.round((approved.length / totalQ) * 100) : 0;
  const avgDealSize = approved.length > 0 ? totalRevenue / approved.length : 0;

  // Monthly trend data
  const maxRev = Math.max(...MONTHLY_REVENUE.map(m => m.revenue));
  const monthlyBars = MONTHLY_REVENUE.map(m => {
    const h = Math.round((m.revenue / maxRev) * 160);
    const rate = m.quotations > 0 ? Math.round((m.approved / m.quotations) * 100) : 0;
    return `
      <div class="flex flex-col items-center gap-2 flex-1">
        <div class="text-xs font-bold text-surface-700">${formatCurrencyShort(m.revenue)}</div>
        <div class="w-full flex items-end justify-center" style="height:160px">
          <div class="w-8 rounded-t-lg bg-brand-500 transition-all duration-500 hover:bg-brand-600 relative group" style="height:${h}px">
            <div class="absolute -top-8 left-1/2 -translate-x-1/2 bg-surface-800 text-white text-[10px] font-semibold px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">${m.quotations} QO · ${rate}% conv</div>
          </div>
        </div>
        <div class="text-xs text-surface-500 font-medium">${m.month}</div>
      </div>`;
  }).join('');

  // Sales leaderboard
  const salesRanked = [...SALES_TEAM].sort((a, b) => b.achieved - a.achieved);
  const salesRows = salesRanked.map((s, i) => {
    const percent = Math.round((s.achieved / s.target) * 100);
    const quoCount = QUOTATIONS.filter(q => q.sales === s.name).length;
    const approvedCount = QUOTATIONS.filter(q => q.sales === s.name && q.status === 'approved').length;
    const salesConv = quoCount > 0 ? Math.round((approvedCount / quoCount) * 100) : 0;
    return `
      <tr class="border-b border-surface-100 hover:bg-surface-50/60 transition-colors">
        <td class="py-3 px-4 text-sm font-bold text-surface-600 text-center">${i + 1}</td>
        <td class="py-3 px-4">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-lg bg-brand-50 text-brand-700 flex items-center justify-center text-xs font-bold shrink-0">${s.avatar}</div>
            <div><div class="text-sm font-semibold text-surface-800">${s.name}</div><div class="text-xs text-surface-400">${s.role}</div></div>
          </div>
        </td>
        <td class="py-3 px-4 text-sm text-surface-700 text-center">${quoCount}</td>
        <td class="py-3 px-4 text-sm text-emerald-600 font-semibold text-center">${approvedCount}</td>
        <td class="py-3 px-4 text-sm text-center">
          <span class="font-bold ${salesConv >= 60 ? 'text-emerald-600' : salesConv >= 40 ? 'text-amber-600' : 'text-red-500'}">${salesConv}%</span>
        </td>
        <td class="py-3 px-4 text-sm font-bold text-surface-800 text-right">${formatCurrencyShort(s.achieved)}</td>
        <td class="py-3 px-4">
          <div class="flex items-center gap-2">
            <div class="flex-1 h-2 bg-surface-100 rounded-full overflow-hidden"><div class="h-full rounded-full ${percent >= 80 ? 'bg-emerald-500' : percent >= 60 ? 'bg-amber-500' : 'bg-red-400'}" style="width:${percent}%"></div></div>
            <span class="text-xs font-bold text-surface-600 w-10 text-right">${percent}%</span>
          </div>
        </td>
      </tr>`;
  }).join('');

  // Brand performance
  const brandPerf = BRANDS.map(b => {
    const brandQ = QUOTATIONS.filter(q => q.brand === b.name);
    const brandApproved = brandQ.filter(q => q.status === 'approved');
    const brandRev = brandApproved.reduce((sum, q) => sum + calcGrandTotal(q.items, q.ppnRate), 0);
    const brandConv = brandQ.length > 0 ? Math.round((brandApproved.length / brandQ.length) * 100) : 0;
    return { ...b, quoCount: brandQ.length, approvedCount: brandApproved.length, revenue: brandRev, convRate: brandConv };
  }).sort((a, b) => b.revenue - a.revenue);

  const brandCards = brandPerf.map(b => `
    <div class="bg-white rounded-xl border border-surface-200 p-5 hover:shadow-md transition-all duration-200">
      <div class="flex items-center gap-3 mb-4">
        <div class="w-3 h-3 rounded-full" style="background:${b.color}"></div>
        <h4 class="text-sm font-bold text-surface-800">${b.name}</h4>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div><div class="text-lg font-bold text-surface-900">${b.quoCount}</div><div class="text-[10px] text-surface-400">Quotation</div></div>
        <div><div class="text-lg font-bold text-emerald-600">${b.convRate}%</div><div class="text-[10px] text-surface-400">Conversion</div></div>
        <div class="col-span-2"><div class="text-lg font-bold text-surface-900">${formatCurrencyShort(b.revenue)}</div><div class="text-[10px] text-surface-400">Revenue (Approved)</div></div>
      </div>
    </div>
  `).join('');

  // Top products
  const productPerf = PRODUCTS.map(p => {
    let totalQty = 0, totalRev = 0;
    QUOTATIONS.forEach(q => q.items.forEach(item => { if (item.sku === p.sku) { totalQty += item.qty; totalRev += item.qty * item.price; } }));
    return { ...p, totalQty, totalRev };
  }).sort((a, b) => b.totalRev - a.totalRev).slice(0, 8);

  const topProductRows = productPerf.map((p, i) => `
    <tr class="border-b border-surface-100 hover:bg-surface-50/60 transition-colors">
      <td class="py-3 px-4 text-sm font-bold text-surface-500 text-center">${i + 1}</td>
      <td class="py-3 px-4">
        <div class="text-sm font-semibold text-surface-800">${p.name}</div>
        <div class="text-xs text-surface-400">${p.sku}</div>
      </td>
      <td class="py-3 px-4"><span class="inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${brandClasses(p.brand)}">${p.brand}</span></td>
      <td class="py-3 px-4 text-sm text-surface-700 text-right">${formatCurrency(p.price)}</td>
      <td class="py-3 px-4 text-sm font-bold text-surface-800 text-center">${p.totalQty}</td>
      <td class="py-3 px-4 text-sm font-bold text-emerald-600 text-right">${formatCurrencyShort(p.totalRev)}</td>
    </tr>
  `).join('');

  // Funnel
  const funnelStages = [
    { label: 'Total Dibuat', count: totalQ, color: 'bg-blue-500', pct: 100 },
    { label: 'Dikirim ke Customer', count: sent.length + approved.length + rejected.length, color: 'bg-indigo-500', pct: Math.round(((sent.length + approved.length + rejected.length) / totalQ) * 100) },
    { label: 'Approved', count: approved.length, color: 'bg-emerald-500', pct: convRate },
  ];
  const funnelBars = funnelStages.map(s => `
    <div class="flex items-center gap-4">
      <div class="w-40 text-sm text-surface-700 font-medium text-right">${s.label}</div>
      <div class="flex-1 h-8 bg-surface-100 rounded-lg overflow-hidden"><div class="h-full ${s.color} rounded-lg flex items-center justify-end px-3 transition-all duration-500" style="width:${s.pct}%"><span class="text-xs font-bold text-white">${s.count}</span></div></div>
      <span class="w-12 text-xs font-bold text-surface-600 text-right">${s.pct}%</span>
    </div>
  `).join('');

  return `
    <div class="animate-fade-in-up">
      <!-- KPI Summary -->
      <div class="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <div class="bg-white rounded-xl border border-surface-200 p-4">
          <div class="text-xs text-surface-400 mb-1">Total Approved</div>
          <div class="text-xl font-bold text-surface-900">${formatCurrencyShort(totalRevenue)}</div>
        </div>
        <div class="bg-white rounded-xl border border-surface-200 p-4">
          <div class="text-xs text-surface-400 mb-1">Pipeline (Sent+Draft)</div>
          <div class="text-xl font-bold text-blue-600">${formatCurrencyShort(totalPipeline)}</div>
        </div>
        <div class="bg-white rounded-xl border border-surface-200 p-4">
          <div class="text-xs text-surface-400 mb-1">Lost (Rejected+Expired)</div>
          <div class="text-xl font-bold text-red-500">${formatCurrencyShort(lostRevenue)}</div>
        </div>
        <div class="bg-white rounded-xl border border-surface-200 p-4">
          <div class="text-xs text-surface-400 mb-1">Conversion Rate</div>
          <div class="text-xl font-bold text-emerald-600">${convRate}%</div>
        </div>
        <div class="bg-white rounded-xl border border-surface-200 p-4">
          <div class="text-xs text-surface-400 mb-1">Avg Deal Size</div>
          <div class="text-xl font-bold text-surface-900">${formatCurrencyShort(avgDealSize)}</div>
        </div>
      </div>

      <!-- Revenue Trend + Funnel -->
      <div class="grid grid-cols-1 lg:grid-cols-5 gap-5 mb-6">
        <div class="lg:col-span-3 bg-white rounded-xl border border-surface-200">
          <div class="px-5 pt-5 pb-3 flex items-center justify-between">
            <h2 class="text-sm font-bold text-surface-800">Trend Revenue Bulanan</h2>
            <span class="text-xs text-surface-400">6 bulan terakhir</span>
          </div>
          <div class="px-5 pb-5"><div class="flex items-end gap-4">${monthlyBars}</div></div>
        </div>
        <div class="lg:col-span-2 bg-white rounded-xl border border-surface-200">
          <div class="px-5 pt-5 pb-3"><h2 class="text-sm font-bold text-surface-800">Funnel Quotation</h2></div>
          <div class="px-5 pb-5 flex flex-col gap-3">${funnelBars}</div>
        </div>
      </div>

      <!-- Brand Performance -->
      <div class="mb-6">
        <h2 class="text-sm font-bold text-surface-800 mb-4">Performa per Brand</h2>
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">${brandCards}</div>
      </div>

      <!-- Sales Leaderboard -->
      <div class="bg-white rounded-xl border border-surface-200 mb-6">
        <div class="px-6 py-4 border-b border-surface-100">
          <h2 class="text-sm font-bold text-surface-800">Sales Leaderboard</h2>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr class="bg-surface-50 border-b border-surface-200">
                <th class="py-3 px-4 text-center text-xs font-bold text-surface-400 uppercase tracking-wider w-12">#</th>
                <th class="py-3 px-4 text-left text-xs font-bold text-surface-400 uppercase tracking-wider">Sales</th>
                <th class="py-3 px-4 text-center text-xs font-bold text-surface-400 uppercase tracking-wider">Quotation</th>
                <th class="py-3 px-4 text-center text-xs font-bold text-surface-400 uppercase tracking-wider">Approved</th>
                <th class="py-3 px-4 text-center text-xs font-bold text-surface-400 uppercase tracking-wider">Conv. Rate</th>
                <th class="py-3 px-4 text-right text-xs font-bold text-surface-400 uppercase tracking-wider">Revenue</th>
                <th class="py-3 px-4 text-left text-xs font-bold text-surface-400 uppercase tracking-wider w-40">Target</th>
              </tr>
            </thead>
            <tbody>${salesRows}</tbody>
          </table>
        </div>
      </div>

      <!-- Top Products -->
      <div class="bg-white rounded-xl border border-surface-200">
        <div class="px-6 py-4 border-b border-surface-100">
          <h2 class="text-sm font-bold text-surface-800">Top 8 Produk Terlaris</h2>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr class="bg-surface-50 border-b border-surface-200">
                <th class="py-3 px-4 text-center text-xs font-bold text-surface-400 uppercase tracking-wider w-12">#</th>
                <th class="py-3 px-4 text-left text-xs font-bold text-surface-400 uppercase tracking-wider">Produk</th>
                <th class="py-3 px-4 text-left text-xs font-bold text-surface-400 uppercase tracking-wider">Brand</th>
                <th class="py-3 px-4 text-right text-xs font-bold text-surface-400 uppercase tracking-wider">Harga</th>
                <th class="py-3 px-4 text-center text-xs font-bold text-surface-400 uppercase tracking-wider">Unit Terjual</th>
                <th class="py-3 px-4 text-right text-xs font-bold text-surface-400 uppercase tracking-wider">Revenue</th>
              </tr>
            </thead>
            <tbody>${topProductRows}</tbody>
          </table>
        </div>
      </div>
    </div>`;
}

export function bindAnalyticsEvents() {
  // No interactive state needed for now
}
