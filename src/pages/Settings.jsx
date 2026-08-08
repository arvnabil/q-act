import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { Plus, Edit, Trash2, Star, Building2, CreditCard, Users, Loader2, X, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { useSalesUsers, useBankAccounts } from '../hooks/useSupabase.js';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../services/supabase.js';
import { toast } from 'react-hot-toast';

const COMPANY_MOCK = {
  name: 'PT. Alfa Cipta Teknologi Virtual',
  brand: 'ACTiV',
  address: 'Infinity Office, Bellezza BSA 1st Floor Unit 106, JL. Letjen Soepeno, Kebayoran Lama Jakarta Selatan 12210',
  branch: 'Ruko Golden Boulevard Blok S No.26 Pahlawan Seribu, BSD, Serpong, Kota Tangerang Selatan, 15315',
  phone: '(021) 50110987',
  email: 'sales@activ.co.id',
  website: 'www.activ.co.id',
};



export default function Settings() {
  const [company, setCompany]         = useState(COMPANY_MOCK);
  const [isEditing, setIsEditing]     = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPass, setShowPass]       = useState(false);
  const [isSaving, setIsSaving]       = useState(false);
  const [addForm, setAddForm] = useState({
    name: '', email: '', password: '', sales_code: '', role: 'Sales Representative', mobile: ''
  });

  const [editingMember, setEditingMember]           = useState(null);
  const [deleteConfirmMember, setDeleteConfirmMember] = useState(null);
  const [isUpdating, setIsUpdating]                 = useState(false);
  const [isDeleting, setIsDeleting]                 = useState(false);

  const [showBankModal, setShowBankModal]   = useState(false);
  const [editingBank, setEditingBank]       = useState(null); // null = add, object = edit
  const [bankForm, setBankForm]             = useState({ bank_name: '', account_number: '', account_name: '' });
  const [isSavingBank, setIsSavingBank]     = useState(false);
  const [deletingBankId, setDeletingBankId] = useState(null);

  const { data: teamMembers, isLoading: isTeamLoading } = useSalesUsers();
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


  const handleOpenEdit = (member) => {
    setEditingMember({
      id: member.id,
      name: member.name || '',
      email: member.email || '',
      sales_code: member.sales_code || '',
      role: member.role || 'Sales Representative',
      mobile: member.mobile || '',
    });
  };

  const handleUpdateMember = async (e) => {
    e.preventDefault();
    if (!editingMember) return;
    const cleanSalesCode = editingMember.sales_code.trim().toUpperCase();
    if (!cleanSalesCode) {
      toast.error('Kode sales wajib diisi.');
      return;
    }
    setIsUpdating(true);
    try {
      const { data: updatedRows, error } = await supabase.from('users').update({
        name: editingMember.name.trim(),
        role: editingMember.role,
        sales_code: cleanSalesCode,
        mobile: editingMember.mobile.trim() || null,
      }).eq('id', editingMember.id).select();

      if (error) throw error;
      if (!updatedRows || updatedRows.length === 0) {
        throw new Error('Gagal memperbarui: Kebijakan RLS Supabase memblokir edit profil user lain. Pastikan RLS policy UPDATE diizinkan.');
      }

      toast.success(`Data ${editingMember.name || editingMember.email} berhasil diperbarui!`);
      queryClient.invalidateQueries({ queryKey: ['sales_users'] });
      setEditingMember(null);
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Gagal memperbarui anggota.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmMember) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase.from('users').delete().eq('id', deleteConfirmMember.id);
      if (error) {
        if (error.code === '23503') {
          toast.error(`Anggota tidak dapat dihapus karena memiliki data quotation yang terikat.`, { duration: 5000 });
        } else {
          throw error;
        }
      } else {
        toast.success(`Anggota ${deleteConfirmMember.name || deleteConfirmMember.email} berhasil dihapus.`);
        queryClient.invalidateQueries({ queryKey: ['sales_users'] });
      }
      setDeleteConfirmMember(null);
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Gagal menghapus anggota.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    const cleanEmail = addForm.email.trim().toLowerCase();
    const cleanSalesCode = addForm.sales_code.trim().toUpperCase();

    if (!cleanEmail || !addForm.password || !cleanSalesCode) {
      toast.error('Email, password, dan kode sales wajib diisi.');
      return;
    }
    setIsSaving(true);
    try {
      let userId = null;

      // 1. Try Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: cleanEmail,
        password: addForm.password,
      });

      if (authError) {
        // If user already exists in Auth, try inserting into public.users using existing Auth ID
        console.warn('Auth signup notice/error:', authError.message);
        toast.error(`Auth error: ${authError.message}`);
        setIsSaving(false);
        return;
      } else {
        userId = authData.user?.id;
      }

      if (!userId) throw new Error('Gagal mendapatkan ID pengguna.');

      // 2. Insert profile to public.users
      const { error: profileError } = await supabase.from('users').upsert([{
        id:         userId,
        email:      cleanEmail,
        name:       addForm.name.trim() || cleanEmail.split('@')[0],
        role:       addForm.role,
        sales_code: cleanSalesCode,
        mobile:     addForm.mobile.trim() || null,
      }], { onConflict: 'id' });

      if (profileError) throw profileError;

      toast.success(`Anggota ${addForm.name || cleanEmail} berhasil ditambahkan!`);
      queryClient.invalidateQueries({ queryKey: ['sales_users'] });
      setShowAddModal(false);
      setAddForm({ name: '', email: '', password: '', sales_code: '', role: 'Sales Representative', mobile: '' });
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Gagal menambah anggota.');
    } finally {
      setIsSaving(false);
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
            onClick={() => setIsEditing(!isEditing)}
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
                value={company[field.key]}
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
                onClick={() => setIsEditing(false)}
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

      {/* Sales Team */}
      <div className="bg-white rounded-xl border border-surface-200">
        <div className="px-6 py-4 border-b border-surface-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-surface-400" />
            <h2 className="text-sm font-bold text-surface-800">Tim & Anggota</h2>
            {teamMembers && (
              <span className="text-xs font-bold bg-surface-100 text-surface-500 px-2 py-0.5 rounded-full">{teamMembers.length}</span>
            )}
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-all cursor-pointer">
            <Plus className="w-3.5 h-3.5" />
            Tambah Anggota
          </button>
        </div>
        <div className="overflow-x-auto">
          {isTeamLoading ? (
            <div className="flex items-center justify-center py-10 gap-2 text-surface-400">
              <Loader2 className="w-5 h-5 animate-spin text-brand-500" />
              <span className="text-sm">Memuat data anggota...</span>
            </div>
          ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-surface-50 border-b border-surface-200">
                <th className="py-3 px-4 text-left text-xs font-bold text-surface-400 uppercase tracking-wider">Nama</th>
                <th className="py-3 px-4 text-left text-xs font-bold text-surface-400 uppercase tracking-wider">Email</th>
                <th className="py-3 px-4 text-left text-xs font-bold text-surface-400 uppercase tracking-wider">Handphone</th>
                <th className="py-3 px-4 text-left text-xs font-bold text-surface-400 uppercase tracking-wider">Kode Sales</th>
                <th className="py-3 px-4 text-left text-xs font-bold text-surface-400 uppercase tracking-wider">Role</th>
                <th className="py-3 px-4 text-center text-xs font-bold text-surface-400 uppercase tracking-wider w-20">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {(teamMembers || []).map(s => {
                const initials = (s.name || s.email || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
                const roleColor = s.role === 'admin'
                  ? 'bg-purple-50 text-purple-700'
                  : s.role === 'Sales Manager'
                  ? 'bg-brand-50 text-brand-700'
                  : 'bg-surface-100 text-surface-600';
                return (
                  <tr key={s.id} className="border-b border-surface-100 hover:bg-surface-50/60 transition-colors group">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-brand-50 text-brand-700 flex items-center justify-center text-xs font-bold shrink-0">
                          {initials}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-surface-800">{s.name || '-'}</div>
                          <div className="text-xs text-surface-400">{s.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-surface-600">{s.email}</td>
                    <td className="py-3 px-4 text-sm text-surface-600">{s.mobile || '-'}</td>
                    <td className="py-3 px-4 text-sm font-mono text-surface-500">{s.sales_code || '-'}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold ${roleColor}`}>
                        {s.role === 'admin' ? 'Administrator' : s.role || 'Sales'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleOpenEdit(s)}
                          className="text-brand-600 hover:bg-brand-50 p-1.5 rounded-lg transition-colors cursor-pointer"
                          title="Edit Anggota"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmMember(s)}
                          className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors cursor-pointer"
                          title="Hapus Anggota"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!isTeamLoading && (!teamMembers || teamMembers.length === 0) && (
                <tr><td colSpan={6} className="py-10 text-center text-sm text-surface-400">Belum ada anggota tim.</td></tr>
              )}
            </tbody>
          </table>
          )}
        </div>
      </div>

      {/* ===== MODAL TAMBAH ANGGOTA ===== */}
      {showAddModal && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !isSaving && setShowAddModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md animate-scale-in z-10">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100">
              <div>
                <h3 className="text-sm font-bold text-surface-900">Tambah Anggota Tim</h3>
                <p className="text-xs text-surface-400 mt-0.5">Buat akun login baru untuk anggota tim</p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                disabled={isSaving}
                className="p-1.5 rounded-lg text-surface-400 hover:text-surface-700 hover:bg-surface-100 transition-colors cursor-pointer disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleAddMember} className="px-6 py-5 space-y-4">
              {/* Nama */}
              <div>
                <label className="text-xs font-semibold text-surface-600 block mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  placeholder="Contoh: Andi Pratama"
                  value={addForm.name}
                  onChange={e => setAddForm({ ...addForm, name: e.target.value })}
                  className="w-full bg-surface-50 border border-surface-200 rounded-lg px-3 py-2.5 text-sm text-surface-700 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-100 transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Email */}
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-surface-600 block mb-1">Email <span className="text-red-500">*</span></label>
                  <input
                    type="email"
                    placeholder="email@activ.co.id"
                    value={addForm.email}
                    onChange={e => setAddForm({ ...addForm, email: e.target.value })}
                    required
                    className="w-full bg-surface-50 border border-surface-200 rounded-lg px-3 py-2.5 text-sm text-surface-700 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-100 transition-all"
                  />
                </div>

                {/* Password */}
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-surface-600 block mb-1">Password Sementara <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <input
                      type={showPass ? 'text' : 'password'}
                      placeholder="Min. 8 karakter"
                      value={addForm.password}
                      onChange={e => setAddForm({ ...addForm, password: e.target.value })}
                      required
                      minLength={8}
                      className="w-full bg-surface-50 border border-surface-200 rounded-lg px-3 py-2.5 pr-10 text-sm text-surface-700 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-100 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(p => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600 cursor-pointer"
                    >
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Kode Sales */}
                <div>
                  <label className="text-xs font-semibold text-surface-600 block mb-1">Kode Sales <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    placeholder="Contoh: AE001"
                    value={addForm.sales_code}
                    onChange={e => setAddForm({ ...addForm, sales_code: e.target.value.toUpperCase() })}
                    required
                    className="w-full bg-surface-50 border border-surface-200 rounded-lg px-3 py-2.5 text-sm font-mono text-surface-700 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-100 transition-all"
                  />
                </div>

                {/* Handphone */}
                <div>
                  <label className="text-xs font-semibold text-surface-600 block mb-1">Handphone</label>
                  <input
                    type="text"
                    placeholder="08xxxxxxxxxx"
                    value={addForm.mobile}
                    onChange={e => setAddForm({ ...addForm, mobile: e.target.value })}
                    className="w-full bg-surface-50 border border-surface-200 rounded-lg px-3 py-2.5 text-sm text-surface-700 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-100 transition-all"
                  />
                </div>
              </div>

              {/* Role */}
              <div>
                <label className="text-xs font-semibold text-surface-600 block mb-1">Jabatan (Role)</label>
                <select
                  value={addForm.role}
                  onChange={e => setAddForm({ ...addForm, role: e.target.value })}
                  className="w-full bg-surface-50 border border-surface-200 rounded-lg px-3 py-2.5 text-sm text-surface-700 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-100 transition-all cursor-pointer"
                >
                  <option value="Sales Representative">Sales Representative</option>
                  <option value="Account Executive">Account Executive</option>
                  <option value="Sales Manager">Sales Manager</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  disabled={isSaving}
                  className="flex-1 py-2.5 text-sm font-semibold text-surface-600 bg-surface-100 hover:bg-surface-200 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-2.5 text-sm font-bold text-white bg-brand-500 hover:bg-brand-600 rounded-lg transition-colors cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {isSaving ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Menyimpan...</>
                  ) : (
                    <><Plus className="w-4 h-4" /> Tambah Anggota</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ===== MODAL EDIT ANGGOTA ===== */}
      {editingMember && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !isUpdating && setEditingMember(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md animate-scale-in z-10">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100">
              <div>
                <h3 className="text-sm font-bold text-surface-900">Edit Profile Anggota</h3>
                <p className="text-xs text-surface-400 mt-0.5">{editingMember.email}</p>
              </div>
              <button
                onClick={() => setEditingMember(null)}
                disabled={isUpdating}
                className="p-1.5 rounded-lg text-surface-400 hover:text-surface-700 hover:bg-surface-100 transition-colors cursor-pointer disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleUpdateMember} className="px-6 py-5 space-y-4">
              {/* Nama */}
              <div>
                <label className="text-xs font-semibold text-surface-600 block mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  placeholder="Nama Lengkap"
                  value={editingMember.name}
                  onChange={e => setEditingMember({ ...editingMember, name: e.target.value })}
                  className="w-full bg-surface-50 border border-surface-200 rounded-lg px-3 py-2.5 text-sm text-surface-700 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-100 transition-all"
                />
              </div>

              {/* Email (Read only) */}
              <div>
                <label className="text-xs font-semibold text-surface-600 block mb-1">Email (Read Only)</label>
                <input
                  type="email"
                  value={editingMember.email}
                  readOnly
                  className="w-full bg-surface-100 border border-surface-200 rounded-lg px-3 py-2.5 text-sm text-surface-500 outline-none cursor-not-allowed"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Kode Sales */}
                <div>
                  <label className="text-xs font-semibold text-surface-600 block mb-1">Kode Sales <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    placeholder="Contoh: AE001"
                    value={editingMember.sales_code}
                    onChange={e => setEditingMember({ ...editingMember, sales_code: e.target.value.toUpperCase() })}
                    required
                    className="w-full bg-surface-50 border border-surface-200 rounded-lg px-3 py-2.5 text-sm font-mono text-surface-700 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-100 transition-all"
                  />
                </div>

                {/* Handphone */}
                <div>
                  <label className="text-xs font-semibold text-surface-600 block mb-1">Handphone</label>
                  <input
                    type="text"
                    placeholder="08xxxxxxxxxx"
                    value={editingMember.mobile}
                    onChange={e => setEditingMember({ ...editingMember, mobile: e.target.value })}
                    className="w-full bg-surface-50 border border-surface-200 rounded-lg px-3 py-2.5 text-sm text-surface-700 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-100 transition-all"
                  />
                </div>
              </div>

              {/* Role */}
              <div>
                <label className="text-xs font-semibold text-surface-600 block mb-1">Jabatan (Role)</label>
                <select
                  value={editingMember.role}
                  onChange={e => setEditingMember({ ...editingMember, role: e.target.value })}
                  className="w-full bg-surface-50 border border-surface-200 rounded-lg px-3 py-2.5 text-sm text-surface-700 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-100 transition-all cursor-pointer"
                >
                  <option value="Sales Representative">Sales Representative</option>
                  <option value="Account Executive">Account Executive</option>
                  <option value="Sales Manager">Sales Manager</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingMember(null)}
                  disabled={isUpdating}
                  className="flex-1 py-2.5 text-sm font-semibold text-surface-600 bg-surface-100 hover:bg-surface-200 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="flex-1 py-2.5 text-sm font-bold text-white bg-brand-500 hover:bg-brand-600 rounded-lg transition-colors cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {isUpdating ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Menyimpan...</>
                  ) : (
                    'Simpan Perubahan'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ===== MODAL KONFIRMASI HAPUS ANGGOTA ===== */}
      {deleteConfirmMember && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !isDeleting && setDeleteConfirmMember(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center animate-scale-in z-10">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-surface-900 mb-1">Hapus Anggota Tim?</h3>
            <p className="text-xs text-surface-500 mb-6 leading-relaxed">
              Apakah Anda yakin ingin menghapus <span className="font-bold text-surface-800">"{deleteConfirmMember.name || deleteConfirmMember.email}"</span>? Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirmMember(null)}
                disabled={isDeleting}
                className="flex-1 py-2.5 text-xs font-semibold text-surface-600 bg-surface-100 hover:bg-surface-200 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="flex-1 py-2.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors cursor-pointer disabled:opacity-60 flex items-center justify-center gap-1.5 shadow-sm"
              >
                {isDeleting ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Menghapus...</>
                ) : (
                  'Ya, Hapus Anggota'
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}

