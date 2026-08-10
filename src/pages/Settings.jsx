import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { Plus, Edit, Trash2, Star, Building2, CreditCard, Users, Loader2, X, Eye, EyeOff, AlertTriangle, FileText, Wrench } from 'lucide-react';
import { useSalesUsers, useBankAccounts, useMaintenanceMode, useUpdateMaintenanceMode } from '../hooks/useSupabase.js';
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

  const [deleteTargetMaster, setDeleteTargetMaster] = useState(null);

  const handleDeleteMaster = (id, name) => {
    setDeleteTargetMaster({ id, name });
  };

  const executeDeleteMaster = () => {
    if (!deleteTargetMaster) return;
    const updated = deleteMasterTemplate(deleteTargetMaster.id);
    setMasterTemplates(updated);
    toast.success(`Master Template "${deleteTargetMaster.name}" berhasil dihapus.`);
    setDeleteTargetMaster(null);
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

  // ============ MAINTENANCE MODE ============
  const { data: maintenanceSettings, isLoading: isMaintenanceLoading } = useMaintenanceMode();
  const updateMaintenance = useUpdateMaintenanceMode();
  const [mtDomains, setMtDomains] = useState('');
  const [isMtEditing, setIsMtEditing] = useState(false);
  const [isUpdatingMt, setIsUpdatingMt] = useState(false);

  React.useEffect(() => {
    if (maintenanceSettings) {
      setMtDomains(maintenanceSettings.domains?.join(', ') || '');
    }
  }, [maintenanceSettings]);

  const handleToggleMaintenance = async () => {
    setIsUpdatingMt(true);
    try {
      const currentStatus = maintenanceSettings?.enabled || false;
      const domainsArray = mtDomains.split(',').map(d => d.trim().toLowerCase()).filter(Boolean);
      await updateMaintenance.mutateAsync({ enabled: !currentStatus, domains: domainsArray });
      toast.success(`Mode perawatan berhasil ${!currentStatus ? 'diaktifkan' : 'dinonaktifkan'}!`);
    } catch (err) {
      if (err.message?.includes('system_settings')) {
        toast.error("Tabel 'system_settings' belum dibuat di Supabase.");
      } else {
        toast.error(err.message || 'Gagal mengubah status mode perawatan.');
      }
    } finally {
      setIsUpdatingMt(false);
    }
  };

  const handleSaveDomains = async () => {
    setIsUpdatingMt(true);
    try {
      const domainsArray = mtDomains.split(',').map(d => d.trim().toLowerCase()).filter(Boolean);
      await updateMaintenance.mutateAsync({ enabled: maintenanceSettings?.enabled || false, domains: domainsArray });
      toast.success('Daftar domain berhasil diperbarui!');
      setIsMtEditing(false);
    } catch (err) {
      if (err.message?.includes('system_settings')) {
        toast.error("Tabel 'system_settings' belum dibuat di Supabase.");
      } else {
        toast.error(err.message || 'Gagal memperbarui daftar domain.');
      }
    } finally {
      setIsUpdatingMt(false);
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
      {showBankModal && ReactDOM.createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-scale-in">
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
        </div>,
        document.body
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

      {/* Pengaturan Sistem - Maintenance Mode */}
      {isAdmin && (
        <div className="bg-white rounded-xl border border-surface-200 mb-5">
          <div className="px-6 py-4 border-b border-surface-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wrench className="w-4 h-4 text-surface-400" />
              <h2 className="text-sm font-bold text-surface-800">Pengaturan Sistem (Maintenance Mode)</h2>
            </div>
          </div>
          <div className="p-6 flex flex-col gap-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface-50 border border-surface-200 rounded-xl p-4">
              <div className="flex-1">
                <h3 className="text-sm font-bold text-surface-800 flex items-center gap-2">
                  Status Mode Perawatan
                  {maintenanceSettings?.enabled ? (
                    <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">Aktif</span>
                  ) : (
                    <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand-50 text-brand-700 border border-brand-200">Nonaktif</span>
                  )}
                </h3>
                <p className="text-xs text-surface-500 mt-1 leading-relaxed">
                  Saat diaktifkan, pengguna non-admin yang mengakses portal melalui domain terdampak akan dialihkan ke halaman pemeliharaan sistem.
                </p>
              </div>
              <div className="flex items-center">
                {isMaintenanceLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-brand-500" />
                ) : (
                  <button
                    type="button"
                    onClick={handleToggleMaintenance}
                    disabled={isUpdatingMt}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      maintenanceSettings?.enabled ? 'bg-amber-500' : 'bg-surface-200'
                    } disabled:opacity-60`}
                  >
                    <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      maintenanceSettings?.enabled ? 'translate-x-5' : 'translate-x-0'
                    }`} />
                  </button>
                )}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-surface-600 block">Domain Terdampak</label>
                {!isMtEditing ? (
                  <button type="button" onClick={() => setIsMtEditing(true)} className="text-xs font-semibold text-brand-600 hover:text-brand-700 cursor-pointer">Ubah Domain</button>
                ) : (
                  <div className="flex gap-2">
                    <button type="button" onClick={() => { setIsMtEditing(false); setMtDomains(maintenanceSettings?.domains?.join(', ') || ''); }} className="text-xs font-semibold text-surface-400 hover:text-surface-600 cursor-pointer">Batal</button>
                    <button type="button" onClick={handleSaveDomains} disabled={isUpdatingMt} className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1 cursor-pointer">
                      {isUpdatingMt && <Loader2 className="w-3 h-3 animate-spin" />}Simpan
                    </button>
                  </div>
                )}
              </div>
              {isMtEditing ? (
                <div>
                  <textarea
                    value={mtDomains}
                    onChange={(e) => setMtDomains(e.target.value)}
                    placeholder="Contoh: activ.co.id, qsales.activ.co.id"
                    className="w-full bg-surface-50 border border-surface-200 rounded-lg px-3 py-2.5 text-xs text-surface-700 font-mono outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-100 transition-all min-h-[60px]"
                  />
                  <p className="text-[10px] text-surface-400 mt-1">Pisahkan dengan koma. Kosongkan jika berlaku di semua domain.</p>
                </div>
              ) : (
                <div className="bg-surface-50 border border-surface-200 rounded-lg p-3">
                  {maintenanceSettings?.domains && maintenanceSettings.domains.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {maintenanceSettings.domains.map(d => (
                        <span key={d} className="inline-flex font-mono bg-white border border-surface-200 px-2 py-0.5 rounded text-xs text-surface-600">{d}</span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-surface-400 italic">Berlaku untuk semua domain (All Domains).</span>
                  )}
                </div>
              )}
            </div>

            <div className="border-t border-surface-100 pt-4 flex flex-col gap-2">
              <span className="text-xs font-semibold text-surface-600">Deteksi Domain Saat Ini:</span>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 text-surface-500">
                  <span>Domain Browser:</span>
                  <span className="font-mono bg-surface-100 border border-surface-200 px-1.5 py-0.5 rounded font-semibold text-surface-700">{window.location.hostname}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>Status domain ini:</span>
                  {maintenanceSettings?.enabled ? (() => {
                    const domains = maintenanceSettings?.domains || [];
                    const current = window.location.hostname.toLowerCase();
                    const affected = domains.length === 0 || domains.some(d => { const clean = d.trim().toLowerCase(); return current === clean || current.endsWith('.' + clean); });
                    return affected ? (
                      <span className="font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">Akan Terdampak Maintenance</span>
                    ) : (
                      <span className="font-bold text-brand-600 bg-brand-50 px-2 py-0.5 rounded border border-brand-200">Akan Normal (Bypass)</span>
                    );
                  })() : <span className="text-surface-400">Normal (Maintenance Nonaktif)</span>}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Master Template Modal */}
      {showMasterModal && ReactDOM.createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-scale-in">
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
        </div>,
        document.body
      )}

      {/* Modal Hapus Master Template */}
      {deleteTargetMaster && ReactDOM.createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 animate-scale-in border border-surface-200">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-surface-900 mb-1.5">Hapus Master Template?</h3>
            <p className="text-xs text-surface-600 leading-relaxed mb-6">
              Apakah Anda yakin ingin menghapus Master Template <span className="font-bold text-surface-800">"{deleteTargetMaster.name}"</span>? Template ini tidak akan tampil lagi di preset sales.
            </p>
            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteTargetMaster(null)}
                className="px-4 py-2 text-xs font-semibold text-surface-600 border border-surface-200 rounded-lg hover:bg-surface-50 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={executeDeleteMaster}
                className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm transition-all cursor-pointer"
              >
                Ya, Hapus Master Template
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
