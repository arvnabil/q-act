// ============================================
// Dashboard Page
// ============================================
import {
  QUOTATIONS, CUSTOMERS, SALES_TEAM, BRANDS, MONTHLY_REVENUE,
  formatCurrency, formatCurrencyShort, formatDate, calcQuotationTotal, calcGrandTotal, daysUntil,
  statusLabel, statusClasses, brandClasses
} from '../utils.js';

function iconDoc() {
  return `<svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`;
}
function iconCurrency() {
  return `<svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>`;
}
function iconChart() {
  return `<svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><polyline points="22,12 18,12 15,21 9,3 6,12 2,12"/></svg>`;
}
function iconClock() {
  return `<svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>`;
}

function metricCard(label, value, change, changeType, icon, iconBg, delay) {
  const changeColor = changeType === 'positive' ? 'text-emerald-600' : changeType === 'negative' ? 'text-red-500' : 'text-surface-500';
  return `
    <div class="bg-white rounded-xl border border-surface-200 p-5 hover:shadow-md hover:border-surface-300 transition-all duration-200 animate-fade-in-up ${delay}">
      <div class="flex items-start justify-between mb-4">
        <div class="w-10 h-10 rounded-lg ${iconBg} flex items-center justify-center">${icon}</div>
      </div>
      <div class="text-2xl font-bold text-surface-900 mb-1">${value}</div>
      <div class="text-sm text-surface-500 mb-2">${label}</div>
      <div class="text-xs font-medium ${changeColor}">${change}</div>
    </div>`;
}

function renderMetrics() {
  const totalQ = QUOTATIONS.length;
  const approvedQ = QUOTATIONS.filter(q => q.status === 'approved');
  const totalRevenue = approvedQ.reduce((sum, q) => sum + calcGrandTotal(q.items, q.ppnRate), 0);
  const convRate = totalQ > 0 ? Math.round((approvedQ.length / totalQ) * 100) : 0;
  const pendingQ = QUOTATIONS.filter(q => q.status === 'sent' || q.status === 'draft').length;
  return `
    <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
      ${metricCard('Total Quotation', totalQ, '+12.5% vs bulan lalu', 'positive', iconDoc(), 'bg-blue-50 text-blue-600', 'animate-delay-1')}
      ${metricCard('Total Revenue (Approved)', formatCurrencyShort(totalRevenue), '+8.3% vs bulan lalu', 'positive', iconCurrency(), 'bg-emerald-50 text-emerald-600', 'animate-delay-2')}
      ${metricCard('Conversion Rate', convRate + '%', '+3.2% vs bulan lalu', 'positive', iconChart(), 'bg-violet-50 text-violet-600', 'animate-delay-3')}
      ${metricCard('Pending / Draft', pendingQ, '5 baru minggu ini', 'neutral', iconClock(), 'bg-amber-50 text-amber-600', 'animate-delay-4')}
    </div>`;
}

function renderRevenueChart() {
  const maxRevenue = Math.max(...MONTHLY_REVENUE.map(m => m.revenue));
  const maxQ = Math.max(...MONTHLY_REVENUE.map(x => x.quotations));
  const bars = MONTHLY_REVENUE.map(m => {
    const h = Math.round((m.revenue / maxRevenue) * 140);
    const approvedH = Math.round((m.approved / maxQ) * 140);
    return `
      <div class="flex flex-col items-center gap-2 flex-1">
        <div class="text-xs font-semibold text-surface-700">${formatCurrencyShort(m.revenue)}</div>
        <div class="w-full flex items-end justify-center gap-1" style="height:140px">
          <div class="w-5 rounded-t-md bg-brand-500/20 transition-all duration-500" style="height:${h}px" title="Revenue: ${formatCurrency(m.revenue)}"></div>
          <div class="w-5 rounded-t-md bg-brand-500 transition-all duration-500" style="height:${approvedH}px" title="Approved: ${m.approved}"></div>
        </div>
        <div class="text-xs text-surface-500 font-medium">${m.month}</div>
      </div>`;
  }).join('');
  return `
    <div class="bg-white rounded-xl border border-surface-200 animate-fade-in-up animate-delay-5">
      <div class="flex items-center justify-between px-5 pt-5 pb-3">
        <h2 class="text-sm font-bold text-surface-800">Revenue Quotation (6 Bulan Terakhir)</h2>
        <div class="flex items-center gap-4 text-xs text-surface-500">
          <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-sm bg-brand-500/20"></span>Total Revenue</span>
          <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-sm bg-brand-500"></span>Approved</span>
        </div>
      </div>
      <div class="px-5 pb-5"><div class="flex items-end gap-3">${bars}</div></div>
    </div>`;
}

function renderStatusDonut() {
  const counts = {};
  QUOTATIONS.forEach(q => { counts[q.status] = (counts[q.status] || 0) + 1; });
  const total = QUOTATIONS.length;
  const statuses = [
    { key: 'approved', label: 'Approved', color: '#059669', bg: 'bg-emerald-500' },
    { key: 'sent', label: 'Sent', color: '#2563EB', bg: 'bg-blue-500' },
    { key: 'draft', label: 'Draft', color: '#9CA3AF', bg: 'bg-gray-400' },
    { key: 'rejected', label: 'Rejected', color: '#DC2626', bg: 'bg-red-500' },
    { key: 'expired', label: 'Expired', color: '#D97706', bg: 'bg-amber-500' },
  ];
  let cum = 0;
  const r = 60, circ = 2 * Math.PI * r;
  const segs = statuses.map(s => {
    const c = counts[s.key] || 0, pct = c / total;
    const off = circ * (1 - pct), rot = cum * 360;
    cum += pct;
    return `<circle cx="80" cy="80" r="${r}" fill="none" stroke="${s.color}" stroke-width="16" stroke-dasharray="${circ}" stroke-dashoffset="${off}" transform="rotate(${rot - 90} 80 80)" class="transition-all duration-700"/>`;
  }).join('');
  const legend = statuses.map(s => `<div class="flex items-center gap-2"><span class="w-2.5 h-2.5 rounded-full ${s.bg}"></span><span class="text-xs text-surface-500">${s.label}</span><span class="text-xs font-bold text-surface-800 ml-auto">${counts[s.key] || 0}</span></div>`).join('');
  return `
    <div class="bg-white rounded-xl border border-surface-200 animate-fade-in-up animate-delay-5">
      <div class="px-5 pt-5 pb-3"><h2 class="text-sm font-bold text-surface-800">Status Quotation</h2></div>
      <div class="px-5 pb-5 flex flex-col items-center gap-4">
        <div class="relative">
          <svg width="160" height="160" viewBox="0 0 160 160">${segs}</svg>
          <div class="absolute inset-0 flex flex-col items-center justify-center"><span class="text-2xl font-bold text-surface-800">${total}</span><span class="text-xs text-surface-500">Total</span></div>
        </div>
        <div class="w-full grid grid-cols-2 gap-x-6 gap-y-2">${legend}</div>
      </div>
    </div>`;
}

function renderTopCustomers() {
  const sorted = [...CUSTOMERS].sort((a, b) => b.totalSpend - a.totalSpend).slice(0, 5);
  const maxSpend = sorted[0].totalSpend;
  const rows = sorted.map((c, i) => {
    const rankClass = i === 0 ? 'bg-amber-100 text-amber-700' : i === 1 ? 'bg-gray-100 text-gray-600' : i === 2 ? 'bg-orange-100 text-orange-700' : 'bg-surface-100 text-surface-500';
    const barW = Math.round((c.totalSpend / maxSpend) * 100);
    const qCount = QUOTATIONS.filter(q => q.customer === c.name).length;
    return `
      <div class="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-surface-50 transition-colors">
        <div class="w-7 h-7 rounded-md ${rankClass} flex items-center justify-center text-xs font-bold shrink-0">${i + 1}</div>
        <div class="flex-1 min-w-0"><div class="text-sm font-semibold text-surface-800 truncate">${c.name}</div><div class="text-xs text-surface-400">${qCount} quotation</div></div>
        <div class="text-right shrink-0"><div class="text-sm font-bold text-surface-800">${formatCurrencyShort(c.totalSpend)}</div><div class="w-16 h-1 bg-surface-100 rounded-full mt-1 ml-auto"><div class="h-full bg-brand-500 rounded-full" style="width:${barW}%"></div></div></div>
      </div>`;
  }).join('');
  return `
    <div class="bg-white rounded-xl border border-surface-200 animate-fade-in-up animate-delay-5">
      <div class="flex items-center justify-between px-5 pt-5 pb-3"><h2 class="text-sm font-bold text-surface-800">Top 5 Customer</h2><button class="text-xs font-semibold text-brand-600 hover:text-brand-700 nav-to-customers">Lihat Semua →</button></div>
      <div class="px-3 pb-4">${rows}</div>
    </div>`;
}

function renderSalesPerformance() {
  const maxTarget = Math.max(...SALES_TEAM.map(s => s.target));
  const bars = SALES_TEAM.map(s => {
    const achievedW = Math.round((s.achieved / maxTarget) * 100);
    const percent = Math.round((s.achieved / s.target) * 100);
    return `
      <div class="flex items-center gap-3 py-2">
        <div class="w-8 h-8 rounded-lg bg-brand-50 text-brand-700 flex items-center justify-center text-xs font-bold shrink-0">${s.avatar}</div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between mb-1"><span class="text-sm font-semibold text-surface-800 truncate">${s.name}</span><span class="text-xs font-bold ${percent >= 80 ? 'text-emerald-600' : percent >= 60 ? 'text-amber-600' : 'text-red-500'}">${percent}%</span></div>
          <div class="w-full h-2 bg-surface-100 rounded-full overflow-hidden"><div class="h-full rounded-full transition-all duration-700 ${percent >= 80 ? 'bg-emerald-500' : percent >= 60 ? 'bg-amber-500' : 'bg-red-400'}" style="width:${achievedW}%"></div></div>
          <div class="flex justify-between mt-1"><span class="text-xs text-surface-400">${formatCurrencyShort(s.achieved)}</span><span class="text-xs text-surface-400">Target: ${formatCurrencyShort(s.target)}</span></div>
        </div>
      </div>`;
  }).join('');
  return `
    <div class="bg-white rounded-xl border border-surface-200 animate-fade-in-up animate-delay-5">
      <div class="flex items-center justify-between px-5 pt-5 pb-3"><h2 class="text-sm font-bold text-surface-800">Performa Sales Team</h2></div>
      <div class="px-5 pb-4 flex flex-col gap-1">${bars}</div>
    </div>`;
}

function renderBrandDistribution() {
  const brandTotals = {};
  QUOTATIONS.forEach(q => { const t = calcGrandTotal(q.items, q.ppnRate); brandTotals[q.brand] = (brandTotals[q.brand] || 0) + t; });
  const grandTotal = Object.values(brandTotals).reduce((a, b) => a + b, 0);
  const sorted = BRANDS.map(b => ({ ...b, total: brandTotals[b.name] || 0 })).sort((a, b) => b.total - a.total);
  const bars = sorted.map(b => {
    const pct = grandTotal > 0 ? Math.round((b.total / grandTotal) * 100) : 0;
    return `
      <div class="flex items-center gap-3 py-1.5">
        <span class="w-20 text-sm font-medium text-surface-700 shrink-0">${b.name}</span>
        <div class="flex-1 h-3 bg-surface-100 rounded-full overflow-hidden"><div class="h-full rounded-full transition-all duration-700" style="width:${pct}%;background:${b.color}"></div></div>
        <span class="text-xs font-bold text-surface-700 w-10 text-right">${pct}%</span>
        <span class="text-xs text-surface-400 w-20 text-right">${formatCurrencyShort(b.total)}</span>
      </div>`;
  }).join('');
  return `
    <div class="bg-white rounded-xl border border-surface-200 animate-fade-in-up animate-delay-5">
      <div class="px-5 pt-5 pb-3"><h2 class="text-sm font-bold text-surface-800">Distribusi per Brand</h2></div>
      <div class="px-5 pb-5 flex flex-col gap-2">${bars}</div>
    </div>`;
}

function renderExpiringSoon() {
  const expiring = QUOTATIONS
    .filter(q => (q.status === 'sent' || q.status === 'draft') && daysUntil(q.expired) >= 0 && daysUntil(q.expired) <= 7)
    .sort((a, b) => daysUntil(a.expired) - daysUntil(b.expired));
  const items = expiring.length ? expiring.map(q => {
    const days = daysUntil(q.expired);
    const total = calcGrandTotal(q.items, q.ppnRate);
    const urgency = days <= 2 ? 'border-red-200 bg-red-50/50' : 'border-amber-200 bg-amber-50/50';
    const dayLabel = days === 0 ? 'Hari ini!' : days === 1 ? 'Besok' : `${days} hari lagi`;
    const dayColor = days <= 2 ? 'text-red-600' : 'text-amber-600';
    return `
      <div class="flex items-center justify-between py-3 px-3.5 rounded-lg border ${urgency} transition-colors hover:shadow-sm">
        <div><div class="text-sm font-bold text-surface-800">${q.id}</div><div class="text-xs text-surface-500">${q.customer}</div></div>
        <div class="text-right"><div class="text-sm font-bold text-surface-800">${formatCurrencyShort(total)}</div><div class="text-xs font-semibold ${dayColor}">${dayLabel}</div></div>
      </div>`;
  }).join('') : `<div class="text-sm text-surface-400 text-center py-6">Tidak ada quotation yang segera expired 👍</div>`;
  return `
    <div class="bg-white rounded-xl border border-surface-200 animate-fade-in-up animate-delay-5">
      <div class="px-5 pt-5 pb-3 flex items-center gap-2">
        <svg class="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        <h2 class="text-sm font-bold text-surface-800">Segera Expired (7 Hari)</h2>
      </div>
      <div class="px-4 pb-4 flex flex-col gap-2">${items}</div>
    </div>`;
}

export function renderDashboard() {
  return `
    ${renderMetrics()}
    <div class="grid grid-cols-1 lg:grid-cols-5 gap-5 mt-1">
      <div class="lg:col-span-3">${renderRevenueChart()}</div>
      <div class="lg:col-span-2">${renderStatusDonut()}</div>
    </div>
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">${renderTopCustomers()}${renderSalesPerformance()}</div>
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">${renderBrandDistribution()}${renderExpiringSoon()}</div>
  `;
}

export function bindDashboardEvents(navigateTo) {
  document.querySelectorAll('.nav-to-customers').forEach(el => {
    el.addEventListener('click', (e) => { e.preventDefault(); navigateTo('customers'); });
  });
}
