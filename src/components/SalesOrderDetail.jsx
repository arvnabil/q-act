import React, { useState } from 'react';
import { ArrowLeft, Plus, Edit, Trash2, Save, Loader2, Info, FileText, CheckCircle2, Box, AlertTriangle } from 'lucide-react';
import { useSalesOrder, useUpdateSalesOrderStatus, useAddSalesOrderCost, useRemoveSalesOrderCost } from '../hooks/useSupabase.js';
import { format, parseISO, isValid } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { toast } from 'react-hot-toast';
import useAuthStore from '../store/authStore.js';

const formatCurrency = (val) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val || 0);

const formatDate = (str) => {
  if (!str) return '-';
  try {
    const d = parseISO(str);
    return isValid(d) ? format(d, 'd MMM yyyy', { locale: idLocale }) : str;
  } catch { return str; }
};

export default function SalesOrderDetail({ soId, onBack }) {
  const { data: so, isLoading, isError } = useSalesOrder(soId);
  const updateStatusMut = useUpdateSalesOrderStatus();
  const addCostMut = useAddSalesOrderCost();
  const removeCostMut = useRemoveSalesOrderCost();
  
  const { user } = useAuthStore();
  const isFinance = user?.role === 'Finance' || user?.role === 'admin' || user?.role === 'Administrator' || user?.role === 'Manager' || user?.role === 'Sales Manager';

  const [newCostDesc, setNewCostDesc] = useState('');
  const [newCostAmt, setNewCostAmt] = useState('');

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-brand-500 mb-4" />
        <p className="text-surface-500">Memuat detail Sales Order...</p>
      </div>
    );
  }

  if (isError || !so) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-red-500">
        <AlertTriangle className="w-12 h-12 mb-4" />
        <p className="font-bold">Gagal memuat SO.</p>
        <button onClick={onBack} className="mt-4 px-4 py-2 bg-surface-100 text-surface-700 rounded-lg">Kembali</button>
      </div>
    );
  }

  const handleAddCost = async () => {
    if (!newCostDesc.trim()) return toast.error('Deskripsi cost tidak boleh kosong');
    const amt = Number(newCostAmt.replace(/\D/g, ''));
    if (!amt || amt <= 0) return toast.error('Nominal cost tidak valid');

    try {
      await addCostMut.mutateAsync({
        so_id: so.id,
        description: newCostDesc,
        amount: amt
      });
      setNewCostDesc('');
      setNewCostAmt('');
      toast.success('Cost berhasil ditambahkan');
    } catch (err) {
      toast.error('Gagal menambahkan cost: ' + err.message);
    }
  };

  const handleRemoveCost = async (id) => {
    if (!window.confirm('Hapus cost ini?')) return;
    try {
      await removeCostMut.mutateAsync({ id, so_id: so.id });
      toast.success('Cost berhasil dihapus');
    } catch (err) {
      toast.error('Gagal menghapus cost: ' + err.message);
    }
  };

  const handleMarkProcessed = async () => {
    if (!window.confirm('Tandai SO ini telah diproses oleh Finance?')) return;
    try {
      await updateStatusMut.mutateAsync({ id: so.id, status: 'Ditambahkan Finance' });
      toast.success('Status SO berhasil diperbarui');
    } catch (err) {
      toast.error('Gagal memperbarui status: ' + err.message);
    }
  };

  return (
    <div className="animate-fade-in max-w-6xl">
      {/* Top navigation */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm font-semibold text-surface-500 hover:text-brand-600 mb-5 transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        Kembali
      </button>

      {/* Main card - Header & Info */}
      <div className="bg-white rounded-2xl border border-surface-200 shadow-sm mb-6">
        <div className="px-6 py-5 border-b border-surface-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-surface-900">
              Sales Order: <span className="font-mono text-brand-600">{so.id}</span>
            </h2>
            <p className="text-xs text-surface-400 mt-0.5">
              Ref Quotation: <span className="font-mono text-surface-700">{so.quotation_id}</span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 ${so.status === 'Ditambahkan Finance' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-blue-100 text-blue-700 border border-blue-200'}`}>
              {so.status === 'Ditambahkan Finance' && <CheckCircle2 className="w-4 h-4" />}
              {so.status}
            </div>
            
            {isFinance && so.status !== 'Ditambahkan Finance' && (
              <button
                onClick={handleMarkProcessed}
                disabled={updateStatusMut.isPending}
                className="flex items-center gap-2 px-5 py-2 text-xs font-bold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all shadow-sm cursor-pointer disabled:opacity-60"
              >
                {updateStatusMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Tandai Diproses Finance
              </button>
            )}
          </div>
        </div>

        {/* Customer Info */}
        <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          <div>
            <label className="text-xs font-semibold text-surface-600 block mb-1">Customer</label>
            <div className="text-sm font-semibold text-surface-900">{so.customer?.name || '-'}</div>
            <div className="text-xs text-surface-500 mt-0.5">{so.customer?.address || '-'}</div>
          </div>
          <div>
            <label className="text-xs font-semibold text-surface-600 block mb-1">Sales Person</label>
            <div className="text-sm text-surface-900">{so.sales?.name || '-'}</div>
          </div>
          <div>
            <label className="text-xs font-semibold text-surface-600 block mb-1">Tanggal Order</label>
            <div className="text-sm text-surface-900">{formatDate(so.date)}</div>
          </div>
        </div>
      </div>

      {/* ITEMS INFO */}
      <div className="bg-white rounded-2xl border border-surface-200 shadow-sm overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-surface-100 flex justify-between items-center">
          <h2 className="text-sm font-bold text-surface-800 flex items-center gap-2">
            <Box className="w-4 h-4 text-brand-500" />
            Daftar Item Pesanan (Read-Only)
          </h2>
        </div>
        <div className="p-0 overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-50/50 border-b border-surface-200">
                <th className="py-3 px-6 text-xs font-bold text-surface-500 uppercase tracking-wider w-12 text-center">No</th>
                <th className="py-3 px-6 text-xs font-bold text-surface-500 uppercase tracking-wider">SKU</th>
                <th className="py-3 px-6 text-center text-xs font-bold text-surface-500 uppercase tracking-wider w-24">Qty</th>
                <th className="py-3 px-6 text-right text-xs font-bold text-surface-500 uppercase tracking-wider w-40">Harga</th>
                <th className="py-3 px-6 text-right text-xs font-bold text-surface-500 uppercase tracking-wider w-40">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {so.items?.map((item, idx) => (
                <tr key={idx} className="hover:bg-surface-50/50 transition-colors">
                  <td className="py-3 px-6 text-center text-sm text-surface-500 font-medium">{idx + 1}</td>
                  <td className="py-3 px-6">
                    <div className="text-sm font-semibold text-surface-800">{item.sku || '-'}</div>
                  </td>
                  <td className="py-3 px-6 text-center text-sm font-bold text-surface-700">{item.qty}</td>
                  <td className="py-3 px-6 text-right text-sm text-surface-700">{formatCurrency(item.price)}</td>
                  <td className="py-3 px-6 text-right text-sm font-bold text-surface-900">{formatCurrency(item.qty * item.price)}</td>
                </tr>
              ))}
              {(!so.items || so.items.length === 0) && (
                <tr><td colSpan="5" className="py-8 text-center text-surface-400 text-sm">Tidak ada item</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADDITIONAL COSTS */}
      <div className="bg-white rounded-2xl border border-surface-200 shadow-sm overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-surface-100 flex justify-between items-center">
          <h2 className="text-sm font-bold text-surface-800 flex items-center gap-2">
            <FileText className="w-4 h-4 text-amber-500" />
            Biaya Tambahan (Cost)
          </h2>
        </div>
        <div className="p-0 overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-50/50 border-b border-surface-200">
                <th className="py-3 px-6 text-xs font-bold text-surface-500 uppercase tracking-wider">Deskripsi</th>
                <th className="py-3 px-6 text-right text-xs font-bold text-surface-500 uppercase tracking-wider w-48">Nominal</th>
                <th className="py-3 px-6 text-center text-xs font-bold text-surface-500 uppercase tracking-wider w-20">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {so.costs?.map((c) => (
                <tr key={c.id} className="hover:bg-surface-50/50 transition-colors">
                  <td className="py-3 px-6 text-sm text-surface-800">{c.description}</td>
                  <td className="py-3 px-6 text-right text-sm font-bold text-amber-700">{formatCurrency(c.amount)}</td>
                  <td className="py-3 px-6 text-center">
                    <button onClick={() => handleRemoveCost(c.id)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer" disabled={removeCostMut.isPending}>
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              
              {/* Add Cost Form */}
              <tr className="bg-surface-50">
                <td className="py-3 px-6">
                  <input 
                    type="text" 
                    placeholder="Deskripsi biaya (misal: Ongkir, Asuransi)" 
                    className="w-full text-sm bg-white border border-surface-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 outline-none transition-all"
                    value={newCostDesc}
                    onChange={e => setNewCostDesc(e.target.value)}
                  />
                </td>
                <td className="py-3 px-6">
                  <input 
                    type="text" 
                    placeholder="Rp 0" 
                    className="w-full text-sm text-right font-mono bg-white border border-surface-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 outline-none transition-all"
                    value={newCostAmt}
                    onChange={e => {
                      const val = e.target.value.replace(/\D/g, '');
                      setNewCostAmt(val ? formatCurrency(val) : '');
                    }}
                  />
                </td>
                <td className="py-3 px-6 text-center">
                  <button 
                    onClick={handleAddCost}
                    disabled={addCostMut.isPending}
                    className="p-2 bg-brand-100 text-brand-700 hover:bg-brand-200 rounded-lg transition-colors cursor-pointer"
                    title="Tambah Cost"
                  >
                    {addCostMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary Footer */}
      <div className="flex justify-end mb-10">
        <div className="bg-gradient-to-br from-brand-600 to-brand-700 rounded-2xl shadow-md p-6 text-white w-full max-w-sm">
          <h3 className="text-sm font-bold text-brand-100 mb-6 uppercase tracking-wider">Ringkasan Nilai SO</h3>
          
          <div className="space-y-3 mb-6">
            <div className="flex justify-between items-center">
              <span className="text-sm text-brand-100">Total Item</span>
              <span className="text-sm font-medium">{formatCurrency(so.total_item_value)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-amber-200">Total Biaya (Cost)</span>
              <span className="text-sm font-medium">{formatCurrency(so.total_cost)}</span>
            </div>
          </div>
          
          <div className="pt-4 border-t border-brand-500/50">
            <div className="flex justify-between items-end">
              <span className="text-sm font-bold text-brand-100">Grand Total SO</span>
              <span className="text-2xl font-extrabold tracking-tight">{formatCurrency(so.grand_total)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
