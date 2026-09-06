import React from 'react';
import { Navigate } from 'react-router-dom';
import { useQuotations, useCustomers, useSalesUsers, useBrands, useProducts } from '../hooks/useSupabase.js';
import useAuthStore from '../store/authStore';
import usePermissionsStore from '../store/permissionsStore';
import { DollarSign, TrendingUp, ShoppingBag, Award, BarChart3, Filter } from 'lucide-react';
import { format, subMonths, startOfMonth, endOfMonth, parseISO, isValid } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

export default function Analytics() {
  const { user } = useAuthStore();
  const { hasPermission } = usePermissionsStore();

  const { data: quotations = [], isLoading: loadingQ } = useQuotations();
  const { data: salesUsers = [], isLoading: loadingS } = useSalesUsers();
  const { data: brands = [], isLoading: loadingB } = useBrands();
  const { data: products = [], isLoading: loadingP } = useProducts();

  // Route protection via dynamic role permissions
  if (user && !hasPermission(user.role, 'analytics')) {
    return <Navigate to="/" replace />;
  }

  const formatCurrencyShort = (val) => {
    if (!val || val === 0) return 'Rp 0';
    if (val >= 1000000000) return `Rp ${(val / 1000000000).toFixed(1)}M`;
    if (val >= 1000000) return `Rp ${(val / 1000000).toFixed(0)}jt`;
    return `Rp ${(val / 1000).toFixed(0)}rb`;
  };

  const formatCurrencyFull = (val) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val || 0);

  const calcQGrand = (q) => {
    if (q.grand_total != null && q.grand_total > 0) return q.grand_total;
    return q.items?.reduce((s, item) => s + ((item.qty || 0) * (item.price || 0)), 0) || 0;
  };

  // 1. Executive Metric Cards Calculations
  const totalQ = quotations.length;
  const approved = quotations.filter(q => q.status === 'approved');
  const sent = quotations.filter(q => q.status === 'sent');
  const created = quotations.filter(q => q.status === 'created' || q.status === 'draft');
  const rejected = quotations.filter(q => q.status === 'rejected');
  const expired = quotations.filter(q => q.status === 'expired');

  const totalRevenue = approved.reduce((sum, q) => sum + calcQGrand(q), 0);
  const pipelineRevenue = [...sent, ...created].reduce((sum, q) => sum + calcQGrand(q), 0);
  const lostRevenue = [...rejected, ...expired].reduce((sum, q) => sum + calcQGrand(q), 0);
  const convRate = totalQ > 0 ? Math.round((approved.length / totalQ) * 100) : 0;
  const avgDealSize = approved.length > 0 ? Math.round(totalRevenue / approved.length) : 0;

  // 2. Dynamic 6 Months Revenue Trend
  const now = new Date();
  const monthlyTrend = Array.from({ length: 6 }).map((_, i) => {
    const d = subMonths(now, 5 - i);
    const mStart = startOfMonth(d);
    const mEnd = endOfMonth(d);
    const monthLabel = format(d, 'MMM', { locale: idLocale });

    const qInMonth = quotations.filter(q => {
      if (!q.created_at) return false;
      try {
        const qDate = parseISO(q.created_at);
        return isValid(qDate) && qDate >= mStart && qDate <= mEnd;
      } catch {
        return false;
      }
    });

    const revenue = qInMonth.reduce((sum, q) => sum + calcQGrand(q), 0);
    const approvedInMonth = qInMonth.filter(q => q.status === 'approved').length;

    return {
      month: monthLabel,
      revenue,
      quotations: qInMonth.length,
      approved: approvedInMonth
    };
  });
  const maxRev = Math.max(1, ...monthlyTrend.map(m => m.revenue));

  // 3. Dynamic Funnel Quotation
  const totalSentOrApproved = sent.length + approved.length;
  const sentPct = totalQ > 0 ? Math.round((totalSentOrApproved / totalQ) * 100) : 0;
  const funnel = [
    { label: 'Total Dibuat', count: totalQ, pct: 100, color: 'bg-blue-600' },
    { label: 'Dikirim ke Customer', count: totalSentOrApproved, pct: sentPct, color: 'bg-purple-600' },
    { label: 'PO', count: approved.length, pct: convRate, color: 'bg-emerald-500' },
  ];

  // 4. Dynamic Brand Performance
  const brandPerf = brands.map(b => {
    const brandQ = quotations.filter(q =>
      q.items?.some(item =>
        item.product?.brand?.name?.toLowerCase() === b.name.toLowerCase() ||
        item.brand_name?.toLowerCase() === b.name.toLowerCase()
      )
    );
    const brandApproved = brandQ.filter(q => q.status === 'approved');
    const revenue = brandApproved.reduce((sum, q) => sum + calcQGrand(q), 0);
    const convRate = brandQ.length > 0 ? Math.round((brandApproved.length / brandQ.length) * 100) : 0;

    return {
      id: b.id,
      name: b.name,
      color: b.color_hex || '#00A88F',
      quoCount: brandQ.length,
      approvedCount: brandApproved.length,
      revenue,
      convRate
    };
  }).sort((a, b) => b.revenue - a.revenue);

  // 5. Dynamic Sales Leaderboard (Only include Sales & Presales roles)
  const salesOnlyUsers = salesUsers.filter(s => {
    const r = (s.role || '').trim().toLowerCase();
    if (['administrator', 'admin', 'manager', 'finance'].includes(r)) return false;
    return ['sales', 'presales', 'account executive', 'sales representative'].includes(r) || r.includes('sales') || r.includes('presales');
  });

  const salesLeaderboard = salesOnlyUsers.map(s => {
    const userQ = quotations.filter(q => q.sales_id === s.id || q.created_by === s.id || q.creator?.email === s.email);
    const userApp = userQ.filter(q => q.status === 'approved');
    const revenue = userApp.reduce((acc, q) => acc + calcQGrand(q), 0);
    const conv = userQ.length > 0 ? Math.round((userApp.length / userQ.length) * 100) : 0;
    const avatar = (s.name || 'Sales')
      .split(' ')
      .map(n => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();

    return {
      id: s.id,
      name: s.name,
      role: s.role || 'Sales',
      avatar,
      quo: userQ.length,
      approved: userApp.length,
      conv,
      revenue,
      target: 600000000,
    };
  }).sort((a, b) => b.revenue - a.revenue);

  // 6. Dynamic Top Products
  const productStatsMap = {};
  quotations.forEach(q => {
    q.items?.forEach(item => {
      const pName = item.product?.name || item.name || 'Produk';
      const pSku = item.product?.sku || item.sku || 'SKU';
      const pBrand = item.product?.brand?.name || item.brand_name || 'Brand';
      const pPrice = item.price || 0;
      const qty = item.qty || 0;
      const key = pSku + pName;

      if (!productStatsMap[key]) {
        productStatsMap[key] = {
          sku: pSku,
          name: pName,
          brand: pBrand,
          price: pPrice,
          qty: 0,
          revenue: 0
        };
      }
      productStatsMap[key].qty += qty;
      if (q.status === 'approved') {
        productStatsMap[key].revenue += qty * pPrice;
      }
    });
  });

  const topProducts = Object.values(productStatsMap)
    .sort((a, b) => b.revenue - a.revenue || b.qty - a.qty)
    .slice(0, 8);

  if (loadingQ || loadingS || loadingB || loadingP) {
    return (
      <div className="animate-fade-in-up space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="bg-white rounded-xl border border-surface-200 p-4 h-24 animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up space-y-8 pb-12">
      
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-surface-200 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-surface-900">Analytics Company-Wide</h1>
          <p className="text-xs text-surface-500">Laporan dan analisis mendalam performa seluruh tim penawaran sales.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-surface-100 text-surface-600 flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5" />
            <span>Seluruh Perusahaan</span>
          </span>
        </div>
      </div>

      {/* 1. Top 5 Executive Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        
        <div className="bg-white rounded-xl border border-surface-200 p-4 shadow-sm">
          <span className="text-[11px] font-bold text-surface-400 uppercase tracking-wider block mb-1">Total PO</span>
          <div className="text-xl font-extrabold text-emerald-600 mb-1">{formatCurrencyShort(totalRevenue)}</div>
          <span className="text-[10px] text-surface-400 font-medium">Disetujui pelanggan</span>
        </div>

        <div className="bg-white rounded-xl border border-surface-200 p-4 shadow-sm">
          <span className="text-[11px] font-bold text-surface-400 uppercase tracking-wider block mb-1">Pipeline (Sent+Created)</span>
          <div className="text-xl font-extrabold text-blue-600 mb-1">{formatCurrencyShort(pipelineRevenue)}</div>
          <span className="text-[10px] text-surface-400 font-medium">Potensi revenue aktif</span>
        </div>

        <div className="bg-white rounded-xl border border-surface-200 p-4 shadow-sm">
          <span className="text-[11px] font-bold text-surface-400 uppercase tracking-wider block mb-1">Lost (Rejected+Expired)</span>
          <div className="text-xl font-extrabold text-red-500 mb-1">{formatCurrencyShort(lostRevenue)}</div>
          <span className="text-[10px] text-surface-400 font-medium">Nilai penawaran batal</span>
        </div>

        <div className="bg-white rounded-xl border border-surface-200 p-4 shadow-sm">
          <span className="text-[11px] font-bold text-surface-400 uppercase tracking-wider block mb-1">Conversion Rate</span>
          <div className="text-xl font-extrabold text-purple-600 mb-1">{convRate}%</div>
          <span className="text-[10px] text-surface-400 font-medium">Tingkat persetujuan</span>
        </div>

        <div className="bg-white rounded-xl border border-surface-200 p-4 shadow-sm">
          <span className="text-[11px] font-bold text-surface-400 uppercase tracking-wider block mb-1">Avg Deal Size</span>
          <div className="text-xl font-extrabold text-surface-900 mb-1">{formatCurrencyShort(avgDealSize)}</div>
          <span className="text-[10px] text-surface-400 font-medium">Rata-rata per quotation</span>
        </div>

      </div>

      {/* 2. Charts Row: Trend Revenue Bulanan (left) & Funnel Quotation (right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Trend Revenue Bulanan */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-surface-200 p-6 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between pb-4 border-b border-surface-100">
            <h3 className="text-sm font-bold text-surface-800">Trend Revenue Bulanan</h3>
            <span className="text-xs text-surface-400 font-medium">6 bulan terakhir</span>
          </div>

          <div className="pt-6 pb-2">
            <div className="flex items-end gap-3 justify-between">
              {monthlyTrend.map((m, idx) => {
                const h = maxRev > 0 ? Math.max(8, Math.round((m.revenue / maxRev) * 160)) : 8;
                const rate = m.quotations > 0 ? Math.round((m.approved / m.quotations) * 100) : 0;
                return (
                  <div key={idx} className="flex flex-col items-center gap-2 flex-1">
                    <div className="text-xs font-bold text-surface-700">{formatCurrencyShort(m.revenue)}</div>
                    <div className="w-full flex items-end justify-center" style={{ height: '160px' }}>
                      <div
                        className="w-8 rounded-t-lg bg-brand-500 transition-all duration-500 hover:bg-brand-600 relative group cursor-pointer"
                        style={{ height: `${h}px` }}
                      >
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-surface-800 text-white text-[10px] font-semibold px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-20">
                          {m.quotations} QO · {rate}% conv
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-surface-500 font-medium">{m.month}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Funnel Quotation */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-surface-200 p-6 shadow-sm flex flex-col justify-between">
          <div className="pb-4 border-b border-surface-100">
            <h3 className="text-sm font-bold text-surface-800">Funnel Quotation</h3>
          </div>

          <div className="space-y-5 py-4">
            {funnel.map((item, idx) => (
              <div key={idx} className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-surface-700">{item.label}</span>
                  <span className="font-bold text-surface-900">{item.count} <span className="text-surface-400 font-normal">({item.pct}%)</span></span>
                </div>
                <div className="w-full h-3 bg-surface-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${item.color} transition-all duration-700`} style={{ width: `${item.pct}%` }}></div>
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 bg-surface-50 rounded-xl text-center text-xs text-surface-500 border border-surface-100">
            Conversion Rate Keseluruhan: <span className="font-bold text-brand-700">{convRate}%</span>
          </div>
        </div>

      </div>

      {/* 3. Performa per Brand */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-surface-800">Performa per Brand</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {brandPerf.length === 0 ? (
            <div className="col-span-5 bg-white p-6 rounded-xl border border-surface-200 text-center text-xs text-surface-400">
              Belum ada data brand.
            </div>
          ) : (
            brandPerf.map((b, idx) => (
              <div key={b.id || idx} className="bg-white rounded-xl border border-surface-200 p-5 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: b.color }}></span>
                  <h4 className="text-sm font-bold text-surface-800 truncate">{b.name}</h4>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <div className="text-base font-bold text-surface-900">{b.quoCount}</div>
                    <div className="text-[10px] text-surface-400">Quotation</div>
                  </div>
                  <div>
                    <div className="text-base font-bold text-emerald-600">{b.convRate}%</div>
                    <div className="text-[10px] text-surface-400">Conversion</div>
                  </div>
                  <div className="col-span-2 pt-2 border-t border-surface-100 mt-1">
                    <div className="text-sm font-bold text-surface-900">{formatCurrencyShort(b.revenue)}</div>
                    <div className="text-[10px] text-surface-400">Revenue (PO)</div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 4. Sales Leaderboard */}
      <div className="bg-white rounded-2xl border border-surface-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-surface-100">
          <h3 className="text-sm font-bold text-surface-800">Sales Leaderboard (Peringkat Performa Seluruh Sales)</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-50 border-b border-surface-200 text-[11px] font-bold text-surface-500 uppercase tracking-wider">
                <th className="py-3 px-4 text-center w-12">#</th>
                <th className="py-3 px-4">Sales</th>
                <th className="py-3 px-4 text-center">Quotation</th>
                <th className="py-3 px-4 text-center">PO</th>
                <th className="py-3 px-4 text-center">Conv. Rate</th>
                <th className="py-3 px-4 text-right">Revenue</th>
                <th className="py-3 px-4 min-w-[160px]">Target</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100 text-xs">
              {salesLeaderboard.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-8 text-surface-400">Belum ada tim sales terdaftar.</td>
                </tr>
              ) : (
                salesLeaderboard.map((s, i) => {
                  const percent = s.target > 0 ? Math.min(100, Math.round((s.revenue / s.target) * 100)) : 0;
                  return (
                    <tr key={s.id || i} className="hover:bg-surface-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-surface-600 text-center">{i + 1}</td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-brand-50 text-brand-700 flex items-center justify-center text-xs font-bold shrink-0">
                            {s.avatar}
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-surface-800">{s.name}</div>
                            <div className="text-[11px] text-surface-400">{s.role}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-surface-700 font-semibold text-center">{s.quo}</td>
                      <td className="py-3.5 px-4 text-emerald-600 font-bold text-center">{s.approved}</td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`font-bold ${s.conv >= 60 ? 'text-emerald-600' : s.conv >= 40 ? 'text-amber-600' : 'text-red-500'}`}>
                          {s.conv}%
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-extrabold text-surface-900 text-right">{formatCurrencyShort(s.revenue)}</td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-surface-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${percent >= 80 ? 'bg-emerald-500' : percent >= 60 ? 'bg-amber-500' : 'bg-red-400'}`}
                              style={{ width: `${percent}%` }}
                            ></div>
                          </div>
                          <span className="text-[11px] font-bold text-surface-600 w-10 text-right">{percent}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. Top 8 Produk Terlaris */}
      <div className="bg-white rounded-2xl border border-surface-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-surface-100">
          <h3 className="text-sm font-bold text-surface-800">Top 8 Produk Terlaris</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-50 border-b border-surface-200 text-[11px] font-bold text-surface-500 uppercase tracking-wider">
                <th className="py-3 px-4 text-center w-12">#</th>
                <th className="py-3 px-4">Produk</th>
                <th className="py-3 px-4">Brand</th>
                <th className="py-3 px-4 text-right">Harga</th>
                <th className="py-3 px-4 text-center">Unit Terjual</th>
                <th className="py-3 px-4 text-right">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100 text-xs">
              {topProducts.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-8 text-surface-400">Belum ada data produk terjual.</td>
                </tr>
              ) : (
                topProducts.map((p, i) => (
                  <tr key={p.sku || i} className="hover:bg-surface-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-surface-600 text-center">{i + 1}</td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-surface-800">{p.name}</div>
                      <div className="text-[11px] text-surface-400 font-mono">{p.sku}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-surface-100 text-surface-700">
                        {p.brand}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-surface-600 text-right">{formatCurrencyFull(p.price)}</td>
                    <td className="py-3.5 px-4 text-center font-bold text-surface-900">{p.qty}</td>
                    <td className="py-3.5 px-4 font-extrabold text-emerald-600 text-right">{formatCurrencyShort(p.revenue)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
