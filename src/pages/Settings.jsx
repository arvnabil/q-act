import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { Plus, Edit, Trash2, Star, Building2, CreditCard, Users, Loader2, X, Eye, EyeOff, AlertTriangle, FileText } from 'lucide-react';
import { useSalesUsers, useBankAccounts } from '../hooks/useSupabase.js';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../services/supabase.js';
import { toast } from 'react-hot-toast';
import useAuthStore from '../store/authStore.js';

import { getCompanyInfo, saveCompanyInfo } from '../utils/companyInfo.js';
import { getMasterTemplates, saveMasterTemplate, deleteMasterTemplate } from '../utils/termsTemplates.js';



export default function Settings() {
  const { user } = useAuthStore();
  const isAdmin = !user || ['admin', 'Administrator', 'Sales Manager', 'Manager'].includes(user.role);

  const [company, setCompany]         = useState(getCompanyInfo());
  const [isEditing, setIsEditing]     = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPass, setShowPass]       = useState(false);
  const [isSaving, setIsSaving]       = useState(false);

  const [showBankModal, setShowBankModal]   = useState(false);
  const [editingBank, setEditingBank]       = useState(null); // null = add, object = edit
  const [bankForm, setBankForm]             = useState({ bank_name: '', account_number: '', account_name: '' });
  const [isSavingBank, setIsSavingBank]     = useState(false);
  const [deletingBankId, setDeletingBankId] = useState(null);

  // Master Terms State
  const [masterTemplates, setMasterTemplates] = useState(() => getMasterTemplates());
  const [showMasterModal, setShowMasterModal] = useState(false);
  const [editingMasterId, setEditingMasterId] = useState(null);
  const [masterForm, setMasterForm] = useState({ name: '', termsText: '' });

  const handleOpenAddMaster = () => {
    setEditingMasterId(null);
    setMasterForm({ name: '', termsText: '' });
    setShowMasterModal(true);
  };

  const handleOpenEditMaster = (tpl) => {
    setEditingMasterId(tpl.id);
    setMasterForm({
      name: tpl.name || '',
      termsText: Array.isArray(tpl.terms) ? tpl.terms.join('\n') : String(tpl.terms || '')
    });
    setShowMasterModal(true);
  };

  const handleSaveMaster = (e) => {
    e.preventDefault();
    if (!masterForm.name.trim() || !masterForm.termsText.trim()) {
      toast.error('Nama dan isi syarat & ketentuan wajib diisi!');
      return;
    }
    const updated = saveMasterTemplate(masterForm.name.trim(), masterForm.termsText, editingMasterId);
    setMasterTemplates(updated);
    setShowMasterModal(false);
    toast.success(editingMasterId ? 'Master Template diperbarui!' : 'Master Template baru berhasil ditambahkan!');
  };

  const handleDeleteMaster = (id, name) => {
    if (window.confirm(`Hapus Master Template "${name}"?`)) {
      const updated = deleteMasterTemplate(id);
      setMasterTemplates(updated);
      toast.success('Master Template dihapus.');
    }
  };

  const { data: bankAccounts = [], isLoading: isBankLoading } = useBankAccounts();
  const queryClient = useQueryClient();

  const handleOpenAddBank = () => {
    setEditingBank(null);
    setBankForm({ bank_name: '', account_number: '', account_name: '' });
    setShowBankModal(true);
  };

  const handleOpenEditBank = (b) => {
    setEditingBank(b);
    setBankForm({ bank_name: b.bank_name || '', account_number: b.account_number || '', account_name: b.account_name || '' });
    setShowBankModal(true);
  };

  const handleSaveBank = async (e) => {
    e.preventDefault();
    if (!bankForm.bank_name.trim() || !bankForm.account_number.trim() || !bankForm.account_name.trim()) {
      toast.error('Semua kolom wajib diisi.');
      return;
    }
    setIsSavingBank(true);
    try {
      if (editingBank) {
        const { error } = await supabase.from('company_bank_accounts').update({
          bank_name: bankForm.bank_name.trim(),
          account_number: bankForm.account_number.trim(),
          account_name: bankForm.account_name.trim(),
        }).eq('id', editingBank.id);
        if (error) throw error;
        toast.success('Rekening berhasil diperbarui!');
      } else {
        const { error } = await supabase.from('company_bank_accounts').insert({
          bank_name: bankForm.bank_name.trim(),
          account_number: bankForm.account_number.trim(),
          account_name: bankForm.account_name.trim(),
          is_default: bankAccounts.length === 0, // first one becomes default
        });
        if (error) throw error;
        toast.success('Rekening berhasil ditambahkan!');
      }
      queryClient.invalidateQueries({ queryKey: ['bank_accounts'] });
      setShowBankModal(false);
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Gagal menyimpan rekening.');
    } finally {
      setIsSavingBank(false);
    }
  };

  const handleSetDefaultBank = async (id) => {
    try {
      // unset all, then set this one
      await supabase.from('company_bank_accounts').update({ is_default: false }).neq('id', id);
      const { error } = await supabase.from('company_bank_accounts').update({ is_default: true }).eq('id', id);
      if (error) throw error;
      toast.success('Rekening default berhasil diubah!');
      queryClient.invalidateQueries({ queryKey: ['bank_accounts'] });
    } catch (err) {
      toast.error(err.message || 'Gagal mengubah default rekening.');
    }
  };

  const handleDeleteBank = async (id) => {
    if (!window.confirm('Yakin ingin menghapus rekening ini?')) return;
    setDeletingBankId(id);
    try {
      const { error } = await supabase.from('company_bank_accounts').delete().eq('id', id);
      if (error) throw error;
      toast.success('Rekening berhasil dihapus.');
      queryClient.invalidateQueries({ queryKey: ['bank_accounts'] });
    } catch (err) {
      toast.error(err.message || 'Gagal menghapus rekening.');
    } finally {
      setDeletingBankId(null);
    }
  };




  return (
    <div className="animate-fade-in-up max-w-5xl">
      
      {/* Company Info */}
      <div className="bg-white rounded-xl border border-surface-200 mb-5">
        <div className="px-6 py-4 border-b border-surface-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-surface-400" />
            <h2 className="text-sm font-bold text-surface-800">Informasi Perusahaan</h2>
          </div>
          <button
            onClick={() => {
              if (isEditing) setCompany(getCompanyInfo());
              setIsEditing(!isEditing);
            }}
            className="flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:text-brand-700 border border-brand-200 bg-brand-50 hover:bg-brand-100 px-3 py-1.5 rounded-lg transition-colors"
          >
            <Edit className="w-3.5 h-3.5" />
            {isEditing ? 'Batal' : 'Edit'}
          </button>
        </div>
        <div className="px-6 py-5 grid grid-cols-1 md:grid-cols-2 gap-5">
          {[
            { key: 'name', label: 'Nama Perusahaan', span: false },
            { key: 'brand', label: 'Brand', span: false },
            { key: 'address', label: 'Alamat Kantor Pusat', span: true },
            { key: 'branch', label: 'Kantor Cabang', span: true },
            { key: 'phone', label: 'Telepon', span: false },
            { key: 'email', label: 'Email', span: false },
            { key: 'website', label: 'Website', span: false },
          ].map(field => (
            <div key={field.key} className={field.span ? 'md:col-span-2' : ''}>
              <label className="text-xs font-semibold text-surface-400 block mb-1">{field.label}</label>
              <input
                type="text"
                value={company[field.key] || ''}
                onChange={e => setCompany({ ...company, [field.key]: e.target.value })}
                readOnly={!isEditing}
                className={`w-full border rounded-lg px-3 py-2.5 text-sm outline-none transition-all ${
                  isEditing
                    ? 'bg-surface-50 border-surface-200 text-surface-700 focus:border-brand-500 focus:ring-1 focus:ring-brand-100'
                    : 'bg-surface-50 border-surface-200 text-surface-600 cursor-default'
                }`}
              />
            </div>
          ))}
          {isEditing && (
            <div className="md:col-span-2 flex justify-end">
              <button
                onClick={() => {
                  saveCompanyInfo(company);
                  setIsEditing(false);
                  toast.success('Informasi perusahaan berhasil disimpan!');
                }}
                className="flex items-center gap-2 px-5 py-2 text-sm font-bold bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-all shadow-sm"
              >
                Simpan Informasi Perusahaan
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Bank Accounts */}
      <div className="bg-white rounded-xl border border-surface-200 mb-5">
        <div className="px-6 py-4 border-b border-surface-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-surface-400" />
            <h2 className="text-sm font-bold text-surface-800">Rekening Bank</h2>
            {bankAccounts.length > 0 && (
              <span className="text-xs font-bold bg-surface-100 text-surface-500 px-2 py-0.5 rounded-full">{bankAccounts.length}</span>
            )}
          </div>
          <button
            onClick={handleOpenAddBank}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Tambah Rekening
          </button>
        </div>
        <div className="overflow-x-auto">
          {isBankLoading ? (
            <div className="flex items-center justify-center py-10 gap-2 text-surface-400">
              <Loader2 className="w-5 h-5 animate-spin text-brand-500" />
              <span className="text-sm">Memuat rekening bank...</span>
            </div>
          ) : bankAccounts.length === 0 ? (
            <div className="py-10 text-center">
              <CreditCard className="w-8 h-8 text-surface-200 mx-auto mb-2" />
              <p className="text-sm text-surface-400">Belum ada rekening bank terdaftar.</p>
              <button onClick={handleOpenAddBank} className="mt-2 text-xs font-semibold text-brand-600 hover:underline cursor-pointer">+ Tambah sekarang</button>
            </div>
          ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-surface-50 border-b border-surface-200">
                <th className="py-3 px-4 text-left text-xs font-bold text-surface-400 uppercase tracking-wider">Bank</th>
                <th className="py-3 px-4 text-left text-xs font-bold text-surface-400 uppercase tracking-wider">Nomor Rekening</th>
                <th className="py-3 px-4 text-left text-xs font-bold text-surface-400 uppercase tracking-wider">Atas Nama</th>
                <th className="py-3 px-4 text-left text-xs font-bold text-surface-400 uppercase tracking-wider">Status</th>
                <th className="py-3 px-4 text-center text-xs font-bold text-surface-400 uppercase tracking-wider w-24">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {bankAccounts.map(b => (
                <tr key={b.id} className="border-b border-surface-100 hover:bg-surface-50/60 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-brand-50 text-brand-700 flex items-center justify-center text-xs font-bold shrink-0">
                        {(b.bank_name || '').slice(0, 3).toUpperCase()}
                      </div>
                      <span className="text-sm font-semibold text-surface-800">{b.bank_name}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-sm font-mono text-surface-600">{b.account_number}</td>
                  <td className="py-3.5 px-4 text-sm text-surface-600">{b.account_name}</td>
                  <td className="py-3.5 px-4">
                    {b.is_default ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-brand-50 text-brand-700 border border-brand-200">
                        <Star className="w-3 h-3" /> Default
                      </span>
                    ) : (
                      <button
                        onClick={() => handleSetDefaultBank(b.id)}
                        className="text-xs text-surface-400 hover:text-brand-600 transition-colors cursor-pointer"
                      >
                        Set Default
                      </button>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button onClick={() => handleOpenEditBank(b)} className="text-brand-600 hover:text-brand-700 hover:bg-brand-50 p-1.5 rounded-lg transition-colors cursor-pointer"><Edit className="w-4 h-4" /></button>
                      <button
                        onClick={() => handleDeleteBank(b.id)}
                        disabled={deletingBankId === b.id}
                        className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {deletingBankId === b.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          )}
        </div>
      </div>

      {/* Bank Account Modal */}
      {showBankModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-surface-100 flex items-center justify-between">
              <h3 className="text-base font-bold text-surface-900">{editingBank ? 'Edit Rekening Bank' : 'Tambah Rekening Bank'}</h3>
              <button onClick={() => setShowBankModal(false)} className="text-surface-400 hover:text-surface-600 cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSaveBank} className="p-6 flex flex-col gap-4">
              <div>
                <label className="text-xs font-semibold text-surface-600 mb-1 block">Nama Bank <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={bankForm.bank_name}
                  onChange={e => setBankForm(f => ({ ...f, bank_name: e.target.value }))}
                  className="w-full bg-surface-50 border border-surface-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-brand-500"
                  placeholder="Contoh: BCA, Mandiri, BNI"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-surface-600 mb-1 block">Nomor Rekening <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={bankForm.account_number}
                  onChange={e => setBankForm(f => ({ ...f, account_number: e.target.value }))}
                  className="w-full bg-surface-50 border border-surface-200 rounded-lg px-3 py-2.5 text-sm font-mono outline-none focus:border-brand-500"
                  placeholder="Contoh: 6044447899"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-surface-600 mb-1 block">Atas Nama <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={bankForm.account_name}
                  onChange={e => setBankForm(f => ({ ...f, account_name: e.target.value }))}
                  className="w-full bg-surface-50 border border-surface-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-brand-500"
                  placeholder="Contoh: PT ALFA CIPTA TEKNOLOGI VIRTUAL"
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowBankModal(false)} className="px-4 py-2 text-sm font-semibold text-surface-600 hover:text-surface-900 cursor-pointer">Batal</button>
                <button
                  type="submit"
                  disabled={isSavingBank}
                  className="flex items-center gap-2 px-5 py-2 text-sm font-bold bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-all shadow-sm cursor-pointer disabled:opacity-60"
                >
                  {isSavingBank ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {editingBank ? 'Simpan Perubahan' : 'Tambah Rekening'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Master Terms Templates Card (Admin Only) */}
      {isAdmin && (
        <div className="bg-white rounded-2xl border border-surface-200 shadow-sm p-6 mb-8">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-base font-bold text-surface-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-brand-500" />
                Master Template Syarat & Ketentuan (Khusus Admin)
              </h3>
              <p className="text-xs text-surface-500 mt-0.5">
                Kelola template standar perusahaan yang tampil secara otomatis di pilihan semua sales.
              </p>
            </div>
            <button
              onClick={handleOpenAddMaster}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-all shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Tambah Master Template
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {masterTemplates.map(tpl => (
              <div key={tpl.id} className="border border-surface-200 rounded-xl p-4 bg-surface-50/50 hover:border-surface-300 transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-sm text-surface-900 flex items-center gap-1.5">
                      🏢 {tpl.name}
                    </span>
                    <span className="text-[10px] bg-brand-50 text-brand-700 px-2 py-0.5 rounded-full font-bold">Master</span>
                  </div>
                  <div className="bg-white border border-surface-100 rounded-lg p-3 text-xs text-surface-700 space-y-1 font-mono text-[11px] max-h-36 overflow-y-auto">
                    {Array.isArray(tpl.terms) ? tpl.terms.map((t, i) => (
                      <div key={i} className="leading-tight">• {t}</div>
                    )) : tpl.terms}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-surface-200">
                  <button
                    onClick={() => handleOpenEditMaster(tpl)}
                    className="flex items-center gap-1 text-xs font-semibold text-surface-600 hover:text-brand-600 transition-colors cursor-pointer"
                  >
                    <Edit className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button
                    onClick={() => handleDeleteMaster(tpl.id, tpl.name)}
                    className="flex items-center gap-1 text-xs font-semibold text-surface-400 hover:text-red-600 transition-colors cursor-pointer ml-2"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Hapus
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Master Template Modal */}
      {showMasterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-surface-100 flex items-center justify-between">
              <h3 className="text-base font-bold text-surface-900">
                {editingMasterId ? 'Edit Master Template' : 'Tambah Master Template Baru'}
              </h3>
              <button onClick={() => setShowMasterModal(false)} className="text-surface-400 hover:text-surface-600 cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSaveMaster} className="p-6 flex flex-col gap-4">
              <div>
                <label className="text-xs font-semibold text-surface-600 mb-1 block">Nama Master Template <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={masterForm.name}
                  onChange={e => setMasterForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full bg-surface-50 border border-surface-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-brand-500"
                  placeholder="Contoh: Project Standard PPN 11%"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-surface-600 mb-1 block">Poin Syarat & Ketentuan (Satu baris per poin) <span className="text-red-500">*</span></label>
                <textarea
                  rows={6}
                  value={masterForm.termsText}
                  onChange={e => setMasterForm(f => ({ ...f, termsText: e.target.value }))}
                  className="w-full bg-surface-50 border border-surface-200 rounded-lg p-3 text-xs outline-none focus:border-brand-500 font-sans leading-relaxed"
                  placeholder="1. Harga belum termasuk PPN 11%&#10;2. Pembayaran CBO..."
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowMasterModal(false)} className="px-4 py-2 text-sm font-semibold text-surface-600 hover:text-surface-900 cursor-pointer">Batal</button>
                <button
                  type="submit"
                  className="flex items-center gap-2 px-5 py-2 text-sm font-bold bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-all shadow-sm cursor-pointer"
                >
                  {editingMasterId ? 'Simpan Perubahan' : 'Tambah Master Template'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

