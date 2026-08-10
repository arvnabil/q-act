import React from 'react';
import { Link } from 'react-router-dom';
import { useQuotations, useCustomers, useSalesUsers, useDashboardStats } from '../hooks/useSupabase.js';
import useAuthStore from '../store/authStore.js';
import { FileText, DollarSign, Activity, Clock, TrendingUp, ChevronRight, UserCheck } from 'lucide-react';
import { format, subMonths, startOfMonth, endOfMonth, parseISO, isValid } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

export default function Dashboard() {
  const { user } = useAuthStore();
  const { data: stats, isLoading: loadingStats } = useDashboardStats();
  const { data: allQuotations = [], isLoading: loadingQ } = useQuotations();
  const { data: customers = [], isLoading: loadingC } = useCustomers();
  const { data: salesUsers = [], isLoading: loadingS } = useSalesUsers();

  const isManagerOrAdmin = !user || ['admin', 'Administrator', 'Sales Manager', 'Manager'].includes(user.role);

  // Filter personal & BU quotations for logged in sales/presales
  const quotations = !isManagerOrAdmin && user
    ? allQuotations.filter(q => 
        q.created_by === user.id || 
        q.sales_id === user.id || 
        q.creator?.email === user.email ||
        (user.bu?.id && (q.bu_id === user.bu.id || q.creator?.bu_id === user.bu.id))
      )
    : allQuotations;

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

  // 1. Calculations for Top Metric Cards
  const totalQ = quotations.length;
  const approvedQ = quotations.filter(q => q.status === 'approved');
  const approvedCount = approvedQ.length;
  
  const totalRevenue = approvedQ.reduce((sum, q) => sum + calcQGrand(q), 0);
  const conversionRate = totalQ > 0 ? Math.round((approvedCount / totalQ) * 100) : 0;
  const pendingCount = quotations.filter(q => q.status === 'sent' || q.status === 'draft').length;

  // 2. Dynamic 6 Months Revenue Calculation
  const now = new Date();
  const last6Months = Array.from({ length: 6 }).map((_, i) => {
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
    const approvedCountInMonth = qInMonth.filter(q => q.status === 'approved').length;

    return {
      month: monthLabel,
      revenue,
      approved: approvedCountInMonth,
      totalCount: qInMonth.length
    };
  });

  const maxRevenue = Math.max(1, ...last6Months.map(m => m.revenue));
  const maxApprovedCount = Math.max(1, ...last6Months.map(x => x.approved));

  // 3. Status Quotation Donut
  const statusCounts = {
    approved: quotations.filter(q => q.status === 'approved').length,
    sent: quotations.filter(q => q.status === 'sent').length,
    draft: quotations.filter(q => q.status === 'draft').length,
    rejected: quotations.filter(q => q.status === 'rejected').length,
    expired: quotations.filter(q => q.status === 'expired').length,
  };

  const statusConfigs = [
    { key: 'approved', label: 'PO', color: '#059669', bg: 'bg-emerald-500' },
    { key: 'sent', label: 'Sent', color: '#2563EB', bg: 'bg-blue-500' },
    { key: 'draft', label: 'Draft', color: '#9CA3AF', bg: 'bg-gray-400' },
    { key: 'rejected', label: 'Rejected', color: '#DC2626', bg: 'bg-red-500' },
    { key: 'expired', label: 'Expired', color: '#D97706', bg: 'bg-amber-500' },
  ];

  const totalDonut = Math.max(1, totalQ);
  let cumPercent = 0;
  const r = 60, circ = 2 * Math.PI * r;
  const donutSegments = statusConfigs.map(s => {
    const count = statusCounts[s.key] || 0;
    const pct = totalQ > 0 ? count / totalDonut : 0;
    const off = circ * (1 - pct);
    const rot = cumPercent * 360;
    cumPercent += pct;
    return {
      ...s,
      count,
      pct,
      off,
      rot,
    };
  });

  // 4. Top 5 Customers (Calculated from actual Supabase quotations & customers)
  const customerSpendMap = {};
  quotations.forEach(q => {
    const cName = q.customer?.name || 'Customer';
    const cId = q.customer_id || cName;
    if (!customerSpendMap[cId]) {
      customerSpendMap[cId] = {
        name: cName,
        spend: 0,
        count: 0
      };
    }
    customerSpendMap[cId].count += 1;
    if (q.status === 'approved') {
      customerSpendMap[cId].spend += calcQGrand(q);
    }
  });

  const topCustomers = Object.values(customerSpendMap)
    .sort((a, b) => b.spend - a.spend || b.count - a.count)
    .slice(0, 5);

  // If no quotation customer spend yet, fallback to active customers list
  const displayCustomers = topCustomers.length > 0
    ? topCustomers
    : customers.slice(0, 5).map(c => ({
        name: c.name,
        spend: c.total_spend || 0,
        count: c.quotations_count || 0
      }));

  const maxCustomerSpend = Math.max(1, ...(displayCustomers.map(c => c.spend)));

  // 5. Performa Sales Team (Only include Sales & Presales roles)
  const salesOnlyUsers = salesUsers.filter(s => {
    const r = (s.role || '').trim();
    if (['Administrator', 'Manager', 'admin'].includes(r)) return false;
    return true;
  });

  const salesPerformanceData = salesOnlyUsers.map(s => {
    const userQ = allQuotations.filter(q => q.sales_id === s.id || q.created_by === s.id || q.creator?.email === s.email);
    const userApprovedQ = userQ.filter(q => q.status === 'approved');
    const achieved = userApprovedQ.reduce((sum, q) => sum + calcQGrand(q), 0);
    const target = 600000000;
    const avatar = (s.name || 'Sales')
      .split(' ')
      .map(n => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();

    return {
      id: s.id,
      name: s.name,
      avatar,
      target,
      achieved,
      count: userQ.length
    };
  }).sort((a, b) => b.achieved - a.achieved);

  if (loadingStats || loadingQ || loadingC || loadingS) {
    return (
      <div className="animate-fade-in-up space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white rounded-xl border border-surface-200 p-5 h-32 animate-pulse">
              <div className="w-1/2 h-4 bg-surface-200 rounded mb-4"></div>
              <div className="w-1/3 h-8 bg-surface-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up space-y-6">
      
      {/* 1. Top 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        
        {/* Card 1: Total Quotation */}
        <div className="bg-white rounded-xl border border-surface-200 p-5 hover:shadow-md hover:border-surface-300 transition-all duration-200">
          <div className="flex items-start justify-between mb-4">
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-surface-900 mb-1">{totalQ}</div>
          <div className="text-sm text-surface-500 mb-2">Total Quotation</div>
          <div className="text-xs font-medium text-emerald-600">Terbuka di portal</div>
        </div>

        {/* Card 2: Total Revenue (PO) */}
        <div className="bg-white rounded-xl border border-surface-200 p-5 hover:shadow-md hover:border-surface-300 transition-all duration-200">
          <div className="flex items-start justify-between mb-4">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-surface-900 mb-1">{formatCurrencyShort(totalRevenue)}</div>
          <div className="text-sm text-surface-500 mb-2">Total Revenue (PO)</div>
          <div className="text-xs font-medium text-emerald-600">Nilai deal disetujui</div>
        </div>

        {/* Card 3: Conversion Rate */}
        <div className="bg-white rounded-xl border border-surface-200 p-5 hover:shadow-md hover:border-surface-300 transition-all duration-200">
          <div className="flex items-start justify-between mb-4">
            <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-surface-900 mb-1">{conversionRate}%</div>
          <div className="text-sm text-surface-500 mb-2">Conversion Rate</div>
          <div className="text-xs font-medium text-emerald-600">Tingkat persetujuan</div>
        </div>

        {/* Card 4: Pending / Draft */}
        <div className="bg-white rounded-xl border border-surface-200 p-5 hover:shadow-md hover:border-surface-300 transition-all duration-200">
          <div className="flex items-start justify-between mb-4">
            <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-surface-900 mb-1">{pendingCount}</div>
          <div className="text-sm text-surface-500 mb-2">Pending / Draft</div>
          <div className="text-xs font-medium text-surface-500">Dalam proses</div>
        </div>

      </div>

      {/* 2. Charts Row: Revenue Bar Chart (left) & Status Donut (right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Revenue Quotation (6 Bulan Terakhir) */}
        <div className="lg:col-span-8 bg-white rounded-xl border border-surface-200 p-5 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-surface-100">
            <h2 className="text-sm font-bold text-surface-800">Revenue Quotation (6 Bulan Terakhir)</h2>
            <div className="flex items-center gap-4 text-xs text-surface-500">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-brand-500/20"></span>Total Revenue</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-brand-500"></span>PO</span>
            </div>
          </div>

          <div className="pt-6 pb-2">
            <div className="flex items-end gap-3 justify-between">
              {last6Months.map((m, idx) => {
                const h = maxRevenue > 0 ? Math.max(8, Math.round((m.revenue / maxRevenue) * 140)) : 8;
                const approvedH = maxApprovedCount > 0 ? Math.max(8, Math.round((m.approved / maxApprovedCount) * 140)) : 8;
                return (
                  <div key={idx} className="flex flex-col items-center gap-2 flex-1">
                    <div className="text-xs font-semibold text-surface-700">{formatCurrencyShort(m.revenue)}</div>
                    <div className="w-full flex items-end justify-center gap-1" style={{ height: '140px' }}>
                      <div
                        className="w-5 rounded-t-md bg-brand-500/20 transition-all duration-500 hover:bg-brand-500/40 cursor-pointer"
                        style={{ height: `${h}px` }}
                        title={`Revenue: ${formatCurrencyFull(m.revenue)}`}
                      ></div>
                      <div
                        className="w-5 rounded-t-md bg-brand-500 transition-all duration-500 hover:bg-brand-600 cursor-pointer"
                        style={{ height: `${approvedH}px` }}
                        title={`PO: ${m.approved} Penawaran`}
                      ></div>
                    </div>
                    <div className="text-xs text-surface-500 font-medium">{m.month}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Status Quotation Donut */}
        <div className="lg:col-span-4 bg-white rounded-xl border border-surface-200 p-5 flex flex-col justify-between shadow-sm">
          <div className="pb-3 border-b border-surface-100">
            <h2 className="text-sm font-bold text-surface-800">Status Quotation</h2>
          </div>

          <div className="flex flex-col items-center gap-4 py-4">
            <div className="relative w-40 h-40 flex items-center justify-center">
              <svg width="160" height="160" viewBox="0 0 160 160">
                {donutSegments.map((s, idx) => (
                  <circle
                    key={idx}
                    cx="80"
                    cy="80"
                    r={r}
                    fill="none"
                    stroke={s.color}
                    strokeWidth="16"
                    strokeDasharray={circ}
                    strokeDashoffset={s.off}
                    transform={`rotate(${s.rot - 90} 80 80)`}
                    className="transition-all duration-700"
                  />
                ))}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-extrabold text-surface-800">{totalQ}</span>
                <span className="text-xs text-surface-500">Total</span>
              </div>
            </div>

            <div className="w-full grid grid-cols-2 gap-x-6 gap-y-2 pt-2">
              {donutSegments.map((s, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${s.bg}`}></span>
                  <span className="text-xs text-surface-500">{s.label}</span>
                  <span className="text-xs font-bold text-surface-800 ml-auto">{s.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* 3. Bottom Row: Top 5 Customer (left) & Performa Sales Team (right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Top 5 Customer */}
        <div className="lg:col-span-6 bg-white rounded-xl border border-surface-200 p-5 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-surface-100 mb-2">
            <h2 className="text-sm font-bold text-surface-800">Top 5 Customer</h2>
            <Link to="/customers" className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1">
              <span>Lihat Semua</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-1">
            {displayCustomers.length === 0 ? (
              <div className="text-center py-8 text-xs text-surface-400">Belum ada data customer.</div>
            ) : (
              displayCustomers.map((c, i) => {
                const rankClass =
                  i === 0 ? 'bg-amber-100 text-amber-700' :
                  i === 1 ? 'bg-gray-100 text-gray-600' :
                  i === 2 ? 'bg-orange-100 text-orange-700' : 'bg-surface-100 text-surface-500';
                const spend = c.spend || 0;
                const barW = maxCustomerSpend > 0 ? Math.round((spend / maxCustomerSpend) * 100) : 0;
                const qCount = c.count || 0;

                return (
                  <div key={i} className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-surface-50 transition-colors">
                    <div className={`w-7 h-7 rounded-md ${rankClass} flex items-center justify-center text-xs font-bold shrink-0`}>
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-surface-800 truncate">{c.name}</div>
                      <div className="text-xs text-surface-400">{qCount} quotation</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-bold text-surface-800">{formatCurrencyShort(spend)}</div>
                      <div className="w-16 h-1 bg-surface-100 rounded-full mt-1 ml-auto">
                        <div className="h-full bg-brand-500 rounded-full transition-all duration-500" style={{ width: `${barW}%` }}></div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Performa Sales Team */}
        <div className="lg:col-span-6 bg-white rounded-xl border border-surface-200 p-5 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-surface-100 mb-2">
            <h2 className="text-sm font-bold text-surface-800">Performa Sales Team</h2>
            <span className="text-xs text-surface-400 font-medium">Bulan Ini</span>
          </div>

          <div className="space-y-3 pt-1">
            {salesPerformanceData.length === 0 ? (
              <div className="text-center py-8 text-xs text-surface-400">Belum ada tim sales.</div>
            ) : (
              salesPerformanceData.map((s, idx) => {
                const percent = s.target > 0 ? Math.min(100, Math.round((s.achieved / s.target) * 100)) : 0;

                return (
                  <div key={s.id || idx} className="flex items-center gap-3 py-1">
                    <div className="w-8 h-8 rounded-lg bg-brand-50 text-brand-700 flex items-center justify-center text-xs font-bold shrink-0">
                      {s.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-semibold text-surface-800 truncate">{s.name}</span>
                        <span className={`text-xs font-bold ${percent >= 80 ? 'text-emerald-600' : percent >= 60 ? 'text-amber-600' : 'text-red-500'}`}>
                          {percent}%
                        </span>
                      </div>
                      <div className="w-full h-2 bg-surface-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${
                            percent >= 80 ? 'bg-emerald-500' : percent >= 60 ? 'bg-amber-500' : 'bg-red-400'
                          }`}
                          style={{ width: `${percent}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between mt-1 text-[11px] text-surface-400">
                        <span>{formatCurrencyShort(s.achieved)}</span>
                        <span>Target: {formatCurrencyShort(s.target)}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
