import React, { useState } from 'react';
import { Search, FileText, ChevronRight, CheckCircle2, FileStack, AlertTriangle } from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { useSalesOrders } from '../hooks/useSupabase.js';
import useAuthStore from '../store/authStore.js';
import SalesOrderDetail from '../components/SalesOrderDetail.jsx';

const formatCurrency = (val) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val || 0);

const formatDate = (str) => {
  if (!str) return '-';
  try {
    const d = parseISO(str);
    return isValid(d) ? format(d, 'd MMM yyyy', { locale: idLocale }) : str;
  } catch { return str; }
};

export default function SalesOrders() {
  const { data: salesOrders, isLoading, isError, error } = useSalesOrders();
  const [search, setSearch] = useState('');
  const [activeSO, setActiveSO] = useState(null);
  const [viewState, setViewState] = useState('list'); // 'list' | 'detail'

  // Filter
  const filtered = salesOrders?.filter(so => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      so.id?.toLowerCase().includes(s) ||
      so.quotation_id?.toLowerCase().includes(s) ||
      so.customer?.name?.toLowerCase().includes(s)
    );
  }) || [];

  if (viewState === 'detail' && activeSO) {
    return (
      <SalesOrderDetail 
        soId={activeSO.id} 
        onBack={() => { setViewState('list'); setActiveSO(null); }} 
      />
    );
  }

  return (
    <div className="animate-fade-in-up">
      <div className="bg-white rounded-xl border border-surface-200 mb-5">
        <div className="px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 bg-surface-50 border border-surface-200 rounded-lg px-3 py-2 flex-1 max-w-md focus-within:border-brand-400 transition-colors w-full">
            <Search className="w-4 h-4 text-surface-400 shrink-0" />
            <input
              type="text"
              placeholder="Cari no. SO, quotation, customer..."
              className="bg-transparent border-none outline-none text-sm text-surface-700 placeholder-surface-400 w-full"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="relative min-h-[400px]">
        {isLoading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center">
            <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mb-2" />
            <span className="text-sm font-medium text-surface-500">Memuat data Sales Orders...</span>
          </div>
        )}
        
        {isError && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-red-500 px-8 text-center">
            <span className="text-sm font-bold mb-2">Gagal memuat data:</span>
            <span className="text-xs font-mono bg-red-50 border border-red-200 rounded p-2 text-red-600 max-w-lg break-all">
              {error?.message || error?.code || JSON.stringify(error) || 'Unknown error'}
            </span>
          </div>
        )}

        {!isLoading && filtered.length === 0 && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-surface-400">
            <FileStack className="w-12 h-12 mb-3 text-surface-300" />
            <span className="text-sm font-medium">Belum ada Sales Order yang ditemukan.</span>
          </div>
        )}

        {!isLoading && filtered.length > 0 && (
          <div className="bg-white border border-surface-200 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-50 border-b border-surface-200">
                    <th className="py-3.5 px-4 text-left text-xs font-bold text-surface-500 uppercase tracking-wider">No. SO</th>
                    <th className="py-3.5 px-4 text-left text-xs font-bold text-surface-500 uppercase tracking-wider">Ref. Quotation</th>
                    <th className="py-3.5 px-4 text-left text-xs font-bold text-surface-500 uppercase tracking-wider">Tanggal</th>
                    <th className="py-3.5 px-4 text-left text-xs font-bold text-surface-500 uppercase tracking-wider">Customer</th>
                    <th className="py-3.5 px-4 text-left text-xs font-bold text-surface-500 uppercase tracking-wider">Sales</th>
                    <th className="py-3.5 px-4 text-right text-xs font-bold text-surface-500 uppercase tracking-wider">Grand Total</th>
                    <th className="py-3.5 px-4 text-center text-xs font-bold text-surface-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100">
                  {filtered.map(so => (
                    <tr key={so.id} className="hover:bg-brand-50/30 transition-colors group cursor-pointer" onClick={() => { setActiveSO(so); setViewState('detail'); }}>
                      <td className="py-3.5 px-4">
                        <span className="text-sm font-bold text-brand-700 font-mono">
                          {so.id}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="text-sm text-surface-600 font-mono">
                          {so.quotation_id}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="text-sm font-medium text-surface-700">{formatDate(so.date)}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="text-sm font-semibold text-surface-800 line-clamp-1">{so.customer?.name || '-'}</div>
                        <div className="text-xs text-surface-500 line-clamp-1">{so.customer?.company || '-'}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="text-sm text-surface-700">{so.sales?.name || '-'}</div>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <span className="text-sm font-extrabold text-surface-900">{formatCurrency(so.grand_total)}</span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider
                          ${so.status === 'Dibuat Sales' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}
                        `}>
                          {so.status === 'Ditambahkan Finance' && <CheckCircle2 className="w-3 h-3" />}
                          {so.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
