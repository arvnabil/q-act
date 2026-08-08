import React from 'react';
import { useDashboardStats } from '../hooks/useSupabase.js';
import { FileText, CheckCircle, Clock, DollarSign, Activity } from 'lucide-react';

export default function Dashboard() {
  const { data: stats, isLoading } = useDashboardStats();

  // Helper to format currency
  const formatCurrency = (amount) => {
    if (!amount) return 'Rp 0';
    if (amount >= 1000000000) return `Rp ${(amount / 1000000000).toFixed(1)} Miliar`;
    if (amount >= 1000000) return `Rp ${(amount / 1000000).toFixed(1)} Juta`;
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="animate-fade-in-up">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 mb-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white rounded-xl border border-surface-200 p-5 h-28 animate-pulse">
              <div className="w-1/2 h-4 bg-surface-200 rounded mb-4"></div>
              <div className="w-1/3 h-8 bg-surface-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const metricCards = [
    { 
      label: 'Total Quotation', 
      value: stats?.totalQuotation || 0, 
      sub: 'Semua status', 
      color: 'bg-brand-500',
      icon: <FileText className="w-5 h-5 text-brand-600" />
    },
    { 
      label: 'Approved', 
      value: stats?.approvedCount || 0, 
      sub: 'Disetujui pelanggan', 
      color: 'bg-emerald-500',
      icon: <CheckCircle className="w-5 h-5 text-emerald-600" />
    },
    { 
      label: 'Pending Sent', 
      value: stats?.pendingCount || 0, 
      sub: 'Menunggu konfirmasi', 
      color: 'bg-blue-500',
      icon: <Clock className="w-5 h-5 text-blue-600" />
    },
    { 
      label: 'Grand Total', 
      value: formatCurrency(stats?.grandTotal), 
      sub: 'Total Revenue pipeline', 
      color: 'bg-purple-500',
      icon: <DollarSign className="w-5 h-5 text-purple-600" />
    },
  ];

  return (
    <div className="animate-fade-in-up">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 mb-6">
        {metricCards.map((s, i) => (
          <div key={i} className="bg-white rounded-xl border border-surface-200 p-5 hover:shadow-md transition-shadow relative overflow-hidden group">
            {/* Subtle background glow effect */}
            <div className={`absolute -right-6 -top-6 w-24 h-24 ${s.color} rounded-full opacity-5 group-hover:scale-150 transition-transform duration-500`}></div>
            
            <div className="flex items-center justify-between mb-3 relative z-10">
              <span className="text-xs font-bold text-surface-500 uppercase tracking-wider">{s.label}</span>
              <div className={`w-10 h-10 ${s.color.replace('bg-', 'bg-').replace('500', '50')} rounded-lg flex items-center justify-center border border-${s.color.replace('bg-', '')}/20`}>
                {s.icon}
              </div>
            </div>
            <div className="text-2xl font-extrabold text-surface-900 mb-1 relative z-10">{s.value}</div>
            <div className="text-xs font-medium text-surface-400 relative z-10">{s.sub}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-surface-200 p-8 text-center mt-8">
        <div className="w-12 h-12 rounded-2xl bg-brand-50 flex items-center justify-center mx-auto mb-3 shadow-inner">
          <Activity className="w-6 h-6 text-brand-500" />
        </div>
        <h3 className="text-base font-bold text-surface-800 mb-1">Dashboard Terintegrasi!</h3>
        <p className="text-sm text-surface-500 max-w-md mx-auto">
          Matriks di atas sekarang menarik data secara dinamis (real-time) dari tabel Quotations di Supabase. Anda dapat menambahkan modul grafik/chart di masa mendatang.
        </p>
      </div>
    </div>
  );
}
