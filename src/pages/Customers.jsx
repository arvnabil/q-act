import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import {
  Search, Plus, Building2, Users as UsersIcon, Mail, Phone,
  Edit, Trash2, LayoutGrid, List as ListIcon, Loader2, Box,
  X, AlertCircle, AlertTriangle
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useCustomers } from '../hooks/useSupabase.js';
import Pagination from '../components/Pagination.jsx';
import CustomerModal from '../components/CustomerModal.jsx';

import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../services/supabase.js';
import useAuthStore from '../store/authStore.js';

const PAGE_SIZE = 8;

export default function Customers() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [search, setSearch]           = useState('');
  const [viewMode, setViewMode]       = useState('list');
  const [page, setPage]               = useState(1);
  const [selectedIds, setSelectedIds] = useState([]);
  const [deletingIds, setDeletingIds] = useState([]);

  // Modal State
  const [isModalOpen, setIsModalOpen]         = useState(false);
  const [customerToEdit, setCustomerToEdit]   = useState(null);

  const handleCreateNew = () => {
    setCustomerToEdit(null);
    setIsModalOpen(true);
  };

  const handleEditCustomer = (cust) => {
    setCustomerToEdit(cust);
    setIsModalOpen(true);
  };

  const { data: customers, isLoading, isError } = useCustomers();

  // Reset page & selection on filter/view change
  useEffect(() => { setPage(1); setSelectedIds([]); }, [search, viewMode]);

  // Delete Confirmation Modal State
  const [deleteModalState, setDeleteModalState] = useState({
    isOpen: false,
    type: 'single', // 'single' | 'bulk'
    targetId: null,
    targetName: '',
  });

  const openSingleDeleteModal = (id, name) => {
    setDeleteModalState({
      isOpen: true,
      type: 'single',
      targetId: id,
      targetName: name || id,
    });
  };

  const openBulkDeleteModal = () => {
    if (selectedIds.length === 0) return;
    setDeleteModalState({
      isOpen: true,
      type: 'bulk',
      targetId: null,
      targetName: '',
    });
  };

  const confirmExecuteDelete = async () => {
    const isSingle = deleteModalState.type === 'single';
    const targetIds = isSingle ? [deleteModalState.targetId] : selectedIds;
    if (targetIds.length === 0) return;

    setDeletingIds(targetIds);
    try {
      // 1. Delete dependent PIC rows first to prevent FK constraint errors
      await supabase.from('customer_pics').delete().in('customer_id', targetIds);

      // 2. Delete customer rows
      const { error } = await supabase.from('customers').delete().in('id', targetIds);
      if (error) {
        if (error.code === '23503') {
          toast.error(
            isSingle
              ? `Customer "${deleteModalState.targetName}" tidak dapat dihapus karena memiliki quotation terikat.`
              : `Sebagian customer tidak dapat dihapus karena memiliki quotation terikat.`,
            { duration: 5000 }
          );
        } else {
          throw error;
        }
      } else {
        toast.success(
          isSingle
            ? `Customer "${deleteModalState.targetName}" berhasil dihapus.`
            : `${targetIds.length} customer berhasil dihapus.`
        );
        setSelectedIds(prev => prev.filter(id => !targetIds.includes(id)));
        queryClient.invalidateQueries({ queryKey: ['customers'] });
      }
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Gagal menghapus customer.');
    } finally {
      setDeletingIds([]);
      setDeleteModalState({ isOpen: false, type: 'single', targetId: null, targetName: '' });
    }
  };

  const formatCurrency = (val) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val || 0);

  // Filter
  const isManagerOrAdmin = 
    !user || 
    ['admin', 'Administrator', 'Sales Manager', 'Manager'].includes(user.role);

  const filtered = customers?.filter(c => {
    // Role filtering: non-manager/admin only sees customers associated with them (creator, PIC sales, quotation sales, or same BU)
    if (!isManagerOrAdmin && user?.id) {
      const isCreator = c.created_by === user.id || c.sales_id === user.id;
      const isPicSales = c.pics?.some(p => 
        p.sales_id === user.id || 
        p.created_by === user.id || 
        p.sales?.id === user.id ||
        (user.name && p.name?.toLowerCase().includes(user.name.toLowerCase()))
      );
      const isQuotationSales = c.quotations?.some(q => 
        q.sales_id === user.id || 
        q.created_by === user.id || 
        (user.email && q.creator?.email === user.email)
      );
      const isSameBU = user?.bu?.id && (c.bu_id === user.bu.id || c.quotations?.some(q => q.bu_id === user.bu.id));
      
      if (!isCreator && !isPicSales && !isQuotationSales && !isSameBU) {
        return false;
      }
    }

    if (!search) return true;
    const s = search.toLowerCase();
    const primaryPic = c.pics?.[0];
    return (
      c.name?.toLowerCase().includes(s) ||
      primaryPic?.name?.toLowerCase().includes(s) ||
      primaryPic?.email?.toLowerCase().includes(s)
    );
  }) || [];

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage   = Math.min(page, totalPages);
  const pageItems  = viewMode === 'list'
    ? filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)
    : filtered;

  // Selection helpers
  const isAllSelected = pageItems.length > 0 && pageItems.every(c => selectedIds.includes(c.id));

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(prev => prev.filter(id => !pageItems.some(c => c.id === id)));
    } else {
      const next = [...selectedIds];
      pageItems.forEach(c => { if (!next.includes(c.id)) next.push(c.id); });
      setSelectedIds(next);
    }
  };

  const handleToggleSelect = (id) =>
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);

  return (
    <div className="animate-fade-in-up">
      {/* Controls */}
      <div className="bg-white rounded-xl border border-surface-200 mb-5">
        <div className="px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 bg-surface-50 border border-surface-200 rounded-lg px-3 py-2 flex-1 max-w-md focus-within:border-brand-400 transition-colors">
            <Search className="w-4 h-4 text-surface-400 shrink-0" />
            <input
              type="text"
              placeholder="Cari nama perusahaan, PIC, email..."
              className="bg-transparent border-none outline-none text-sm text-surface-700 placeholder-surface-400 w-full"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            {/* View Toggle */}
            <div className="flex items-center bg-surface-100 p-1 rounded-lg border border-surface-200">
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-md transition-colors cursor-pointer ${viewMode === 'list' ? 'bg-white text-brand-600 shadow-sm' : 'text-surface-400 hover:text-surface-600'}`}
                title="List View"
              >
                <ListIcon className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md transition-colors cursor-pointer ${viewMode === 'grid' ? 'bg-white text-brand-600 shadow-sm' : 'text-surface-400 hover:text-surface-600'}`}
                title="Grid View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={handleCreateNew}
              className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold px-4 py-2 rounded-lg shadow-sm hover:shadow transition-all shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Customer</span>
            </button>
          </div>
        </div>
      </div>

      {/* Content area */}
      <div className="relative min-h-[400px]">
        {isLoading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-brand-500 mb-2" />
            <span className="text-sm font-medium text-surface-500">Memuat data customer...</span>
          </div>
        )}
        {isError && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-red-500">
            <span className="text-sm font-bold">Gagal memuat data customer. Periksa koneksi Supabase Anda.</span>
          </div>
        )}
        {!isLoading && filtered.length === 0 && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-surface-400">
            <Box className="w-12 h-12 mb-3 text-surface-300" />
            <span className="text-sm font-medium">Belum ada customer yang ditemukan.</span>
          </div>
        )}

        {/* List Table View */}
        {viewMode === 'list' && !isLoading && filtered.length > 0 && (
          <div className="bg-white border border-surface-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-50 border-b border-surface-200">
                    <th className="px-5 py-4 text-center w-12">
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        onChange={handleToggleSelectAll}
                        className="w-4 h-4 rounded cursor-pointer"
                      />
                    </th>
                    <th className="px-5 py-4 text-xs font-bold text-surface-500 uppercase tracking-wider w-32">Customer ID</th>
                    <th className="px-5 py-4 text-xs font-bold text-surface-500 uppercase tracking-wider">Nama Perusahaan</th>
                    <th className="px-5 py-4 text-xs font-bold text-surface-500 uppercase tracking-wider">PIC</th>
                    <th className="px-5 py-4 text-xs font-bold text-surface-500 uppercase tracking-wider">Email</th>
                    <th className="px-5 py-4 text-xs font-bold text-surface-500 uppercase tracking-wider">Telepon</th>
                    <th className="px-5 py-4 text-xs font-bold text-surface-500 uppercase tracking-wider text-center w-36">Total Quotation</th>
                    <th className="px-5 py-4 text-xs font-bold text-surface-500 uppercase tracking-wider text-right w-40">Total Spend</th>
                    <th className="px-5 py-4 text-xs font-bold text-surface-500 uppercase tracking-wider text-center w-20">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100">
                  {pageItems.map(c => {
                    const primaryPic = c.pics?.find(p => p.is_primary) || c.pics?.[0];
                    const isChecked  = selectedIds.includes(c.id);
                    return (
                      <tr key={c.id} className={`hover:bg-brand-50/30 transition-colors group ${isChecked ? 'bg-brand-50/20' : ''}`}>
                        <td className="px-5 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleSelect(c.id)}
                            className="w-4 h-4 rounded cursor-pointer"
                          />
                        </td>
                        <td className="px-5 py-4 text-sm font-mono text-surface-500">{c.id}</td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-brand-50 text-brand-700 flex items-center justify-center text-sm font-extrabold shrink-0">
                              {c.name?.charAt(0) || 'C'}
                            </div>
                            <div>
                              <span className="text-sm font-bold text-surface-900 block line-clamp-1">{c.name}</span>
                              {c.address && <span className="text-xs text-surface-400 block line-clamp-1">{c.address}</span>}
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-sm text-surface-600">
                          {primaryPic?.name || '-'}
                          {c.pics?.length > 1 && (
                            <span className="ml-1.5 text-[10px] bg-surface-100 text-surface-500 px-1.5 py-0.5 rounded font-bold">
                              +{c.pics.length - 1}
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-sm text-surface-500 max-w-[180px] truncate">{primaryPic?.email || '-'}</td>
                        <td className="px-5 py-4 text-sm text-surface-500">{primaryPic?.phone || '-'}</td>
                        <td className="px-5 py-4 text-sm font-semibold text-surface-700 text-center">
                          {c.quotations_count ?? '—'}
                        </td>
                        <td className="px-5 py-4 text-sm font-bold text-brand-700 text-right">
                          {formatCurrency(c.total_spend)}
                        </td>
                        <td className="px-5 py-4 text-center">
                          <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleEditCustomer(c)}
                              className="p-1.5 rounded-lg text-brand-600 hover:bg-brand-100 transition-colors cursor-pointer"
                              title="Edit Customer"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => openSingleDeleteModal(c.id, c.name)}
                              disabled={deletingIds.includes(c.id)}
                              className="p-1.5 rounded-lg text-red-500 hover:bg-red-100 transition-colors cursor-pointer disabled:opacity-50"
                              title="Hapus Customer"
                            >
                              {deletingIds.includes(c.id) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Grid / Card View */}
        {viewMode === 'grid' && !isLoading && filtered.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {pageItems.map(c => {
              const primaryPic = c.pics?.find(p => p.is_primary) || c.pics?.[0];
              return (
                <div key={c.id} className="bg-white rounded-xl border border-surface-200 overflow-hidden hover:shadow-md hover:border-surface-300 transition-all flex flex-col group animate-scale-in">
                  <div className="p-5 border-b border-surface-100 flex-1">
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center shrink-0 text-sm font-extrabold">
                        {c.name?.charAt(0) || 'C'}
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleEditCustomer(c)}
                          className="text-surface-400 hover:text-brand-600 p-1.5 rounded-lg hover:bg-surface-50 transition-colors cursor-pointer"
                          title="Edit Customer"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openSingleDeleteModal(c.id, c.name)}
                          disabled={deletingIds.includes(c.id)}
                          className="text-surface-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-surface-50 transition-colors cursor-pointer disabled:opacity-50"
                          title="Hapus Customer"
                        >
                          {deletingIds.includes(c.id) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <h3 className="text-sm font-bold text-surface-900 mb-1 leading-tight group-hover:text-brand-600 transition-colors">{c.name}</h3>
                    <p className="text-xs text-surface-400 font-mono mb-3">{c.id}</p>

                    <div className="mt-2 flex items-center gap-2 text-sm text-surface-600 bg-surface-50 p-2.5 rounded-lg border border-surface-100">
                      <UsersIcon className="w-4 h-4 text-surface-400 shrink-0" />
                      <span className="font-semibold text-surface-800 text-xs">{primaryPic?.name || '—'}</span>
                      {c.pics?.length > 1 && (
                        <span className="text-[10px] bg-surface-200 text-surface-600 px-1.5 py-0.5 rounded font-bold ml-auto shrink-0">+{c.pics.length - 1} PIC</span>
                      )}
                    </div>

                    <div className="mt-2.5 space-y-1.5 px-1">
                      <div className="flex items-center gap-2 text-xs text-surface-500">
                        <Phone className="w-3.5 h-3.5 text-surface-400" />
                        <span>{primaryPic?.phone || '-'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-surface-500">
                        <Mail className="w-3.5 h-3.5 text-surface-400" />
                        <span className="truncate">{primaryPic?.email || '-'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-surface-50/50 px-5 py-3 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-surface-400 block mb-0.5">Total Spend</span>
                      <span className="font-bold text-brand-700 text-sm">{formatCurrency(c.total_spend)}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-surface-400 block mb-0.5">Riwayat</span>
                      <span className="font-semibold text-surface-700">{c.quotations_count ?? '—'} Quotation</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {!isLoading && filtered.length > 0 && (
          <Pagination
            page={safePage}
            totalPages={totalPages}
            totalItems={filtered.length}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
            itemLabel="customer"
          />
        )}
      </div>

      {/* Floating Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-surface-900 text-white rounded-xl shadow-2xl px-5 py-3.5 flex items-center gap-4 z-[100] border border-white/10 animate-fade-in-up">
          <span className="text-xs font-semibold flex items-center gap-2">
            <span className="bg-brand-500 text-white px-2.5 py-0.5 rounded-full font-bold">{selectedIds.length}</span>
            Customer terpilih
          </span>
          <div className="h-4 w-[1px] bg-white/20" />
          <button
            onClick={openBulkDeleteModal}
            disabled={deletingIds.length > 0}
            className="flex items-center gap-1.5 text-xs font-bold bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
          >
            {deletingIds.length > 0 ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            Hapus Customer ({selectedIds.length})
          </button>
          <button
            onClick={() => setSelectedIds([])}
            className="text-white/60 hover:text-white text-xs font-medium transition-colors cursor-pointer ml-1"
          >
            Batal
          </button>
        </div>
      )}

      {/* Customer Create & Edit Modal */}
      <CustomerModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setCustomerToEdit(null);
        }}
        customerToEdit={customerToEdit}
      />

      {/* Delete Confirmation Modal Alert */}
      {deleteModalState.isOpen && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-surface-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden p-6 text-center animate-scale-in">
            <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4 border border-red-100 shadow-sm">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-surface-900 mb-1">Konfirmasi Hapus Customer</h3>
            <p className="text-xs text-surface-500 mb-6 leading-relaxed">
              {deleteModalState.type === 'single'
                ? `Apakah Anda yakin ingin menghapus customer "${deleteModalState.targetName}"? Data customer dan kontak PIC terkait akan dihapus.`
                : `Apakah Anda yakin ingin menghapus ${selectedIds.length} customer terpilih? Data customer dan kontak PIC terkait akan dihapus.`
              }
            </p>

            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setDeleteModalState({ isOpen: false, type: 'single', targetId: null, targetName: '' })}
                className="px-4 py-2 text-xs font-semibold border border-surface-200 rounded-lg text-surface-700 hover:bg-surface-50 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmExecuteDelete}
                disabled={deletingIds.length > 0}
                className="flex items-center gap-2 px-4 py-2 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all shadow-sm cursor-pointer disabled:opacity-50"
              >
                {deletingIds.length > 0 ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                <span>{deletingIds.length > 0 ? 'Menghapus...' : 'Ya, Hapus'}</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
