import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { X, Building2, User, Mail, Phone, MapPin, Loader2, Save, Plus, Trash2, CheckCircle2, Tag } from 'lucide-react';
import { createCustomer, updateCustomer } from '../services/api.js';
import { useSalesUsers } from '../hooks/useSupabase.js';
import useAuthStore from '../store/authStore.js';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';

export default function CustomerModal({ isOpen, onClose, customerToEdit = null }) {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuthStore();
  const { data: salesUsers } = useSalesUsers();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [form, setForm] = useState({
    name: '',
    address: '',
  });

  const [pics, setPics] = useState([
    { name: '', email: '', phone: '', is_primary: true, sales_id: currentUser?.id || '' }
  ]);

  useEffect(() => {
    if (customerToEdit) {
      setForm({
        name: customerToEdit.name || '',
        address: customerToEdit.address || '',
      });

      if (customerToEdit.pics && customerToEdit.pics.length > 0) {
        setPics(customerToEdit.pics.map((p, idx) => ({
          id: p.id,
          name: p.name || '',
          email: p.email || '',
          phone: p.phone || '',
          is_primary: p.is_primary ?? (idx === 0),
          sales_id: p.sales_id || p.sales?.id || currentUser?.id || '',
        })));
      } else {
        setPics([{ name: '', email: '', phone: '', is_primary: true, sales_id: currentUser?.id || '' }]);
      }
    } else {
      setForm({
        name: '',
        address: '',
      });
      setPics([{ name: '', email: '', phone: '', is_primary: true, sales_id: currentUser?.id || '' }]);
    }
  }, [customerToEdit, isOpen, currentUser]);

  if (!isOpen) return null;

  const handleAddPicRow = () => {
    setPics(prev => [
      ...prev,
      { name: '', email: '', phone: '', is_primary: prev.length === 0, sales_id: currentUser?.id || '' }
    ]);
  };

  const handleRemovePicRow = (index) => {
    if (pics.length <= 1) {
      toast.error('Customer harus memiliki minimal 1 PIC.');
      return;
    }
    setPics(prev => {
      const updated = prev.filter((_, i) => i !== index);
      // Ensure at least one PIC is marked primary
      if (!updated.some(p => p.is_primary) && updated.length > 0) {
        updated[0].is_primary = true;
      }
      return updated;
    });
  };

  const handlePicChange = (index, field, value) => {
    setPics(prev => prev.map((p, i) => i === index ? { ...p, [field]: value } : p));
  };

  const handleSetPrimaryPic = (index) => {
    setPics(prev => prev.map((p, i) => ({ ...p, is_primary: i === index })));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Nama Perusahaan wajib diisi!');
      return;
    }

    const validPics = pics.filter(p => p.name.trim());
    if (validPics.length === 0) {
      toast.error('Minimal 1 data Nama PIC wajib diisi!');
      return;
    }

    setIsSubmitting(true);
    try {
      const customerData = {
        name: form.name.trim(),
        address: form.address.trim() || null,
        bu_id: currentUser?.bu?.id || null,
      };

      const picData = validPics.map((p, idx) => ({
        ...(p.id ? { id: p.id } : {}),
        name: p.name.trim(),
        email: p.email.trim() || null,
        phone: p.phone.trim() || null,
        is_primary: p.is_primary ?? (idx === 0),
        sales_id: p.sales_id || currentUser?.id || null,
      }));

      if (customerToEdit) {
        await updateCustomer(customerToEdit.id, customerData, picData);
        toast.success('Data customer & PIC berhasil diperbarui!');
      } else {
        await createCustomer(customerData, picData);
        toast.success('Customer baru & PIC berhasil ditambahkan!');
      }

      queryClient.invalidateQueries({ queryKey: ['customers'] });
      onClose();
    } catch (error) {
      console.error('Customer submit error:', error);
      toast.error(error.message || 'Gagal menyimpan customer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-surface-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-surface-100 flex items-center justify-between bg-surface-50/50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center font-bold">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-surface-900">
                {customerToEdit ? 'Edit Data Customer' : 'Tambah Customer Baru'}
              </h3>
              <p className="text-xs text-surface-400">Kelola informasi perusahaan dan semua kontak PIC</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-surface-400 hover:bg-surface-100 hover:text-surface-600 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Perusahaan Info */}
          <div className="space-y-3">
            <h4 className="text-xs font-extrabold text-surface-900 uppercase tracking-wider">Informasi Perusahaan</h4>
            
            <div>
              <label className="text-xs font-bold text-surface-700 block mb-1">
                Nama Perusahaan <span className="text-red-500">*</span>
              </label>
              <div className="relative flex items-center">
                <Building2 className="w-4 h-4 text-surface-400 absolute left-3 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Contoh: PT. Wijaya Muncul Makmur"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-surface-50 border border-surface-200 rounded-lg pl-9 pr-3 py-2 text-sm text-surface-800 outline-none focus:border-brand-500 focus:bg-white transition-colors"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-surface-700 block mb-1">
                Alamat Lengkap Perusahaan
              </label>
              <div className="relative flex items-start">
                <MapPin className="w-4 h-4 text-surface-400 absolute left-3 top-2.5 pointer-events-none" />
                <textarea
                  rows={2}
                  placeholder="Contoh: Jl. Otista 3 Komplek 6 No 17 RT 8/05 Kel. Cipinang Cempedak, Kec. Jatinegara, Jakarta Timur"
                  value={form.address}
                  onChange={e => setForm({ ...form, address: e.target.value })}
                  className="w-full bg-surface-50 border border-surface-200 rounded-lg pl-9 pr-3 py-2 text-sm text-surface-800 outline-none focus:border-brand-500 focus:bg-white transition-colors resize-none"
                />
              </div>
            </div>
          </div>

          <hr className="border-surface-100 my-3" />

          {/* PIC Info List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-extrabold text-surface-900 uppercase tracking-wider">
                Daftar Kontak PIC ({pics.length})
              </h4>
              <button
                type="button"
                onClick={handleAddPicRow}
                className="flex items-center gap-1 text-xs font-bold text-brand-600 hover:text-brand-700 hover:bg-brand-50 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah PIC</span>
              </button>
            </div>

            <div className="space-y-3">
              {pics.map((pic, idx) => (
                <div key={idx} className="p-3.5 rounded-xl border border-surface-200 bg-surface-50/60 space-y-3 relative group">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-surface-700">PIC #{idx + 1}</span>
                      {pic.is_primary ? (
                        <span className="text-[10px] font-bold bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> PIC Utama
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSetPrimaryPic(idx)}
                          className="text-[10px] font-semibold text-surface-400 hover:text-brand-600 transition-colors cursor-pointer"
                        >
                          Set Sebagai Utama
                        </button>
                      )}

                      {/* Sales Tag Badge / Selector */}
                      <div className="flex items-center gap-1 bg-white px-2 py-0.5 rounded-md border border-surface-200 shadow-2xs">
                        <Tag className="w-3 h-3 text-brand-600" />
                        <span className="text-[10px] font-bold text-surface-400">Sales:</span>
                        <select
                          value={pic.sales_id || ''}
                          onChange={e => handlePicChange(idx, 'sales_id', e.target.value)}
                          className="bg-transparent border-none text-[10px] font-bold text-brand-700 outline-none cursor-pointer"
                        >
                          <option value="">-- Sales --</option>
                          {salesUsers && salesUsers.length > 0 ? (
                            salesUsers.map(s => (
                              <option key={s.id} value={s.id}>{s.name || s.email}</option>
                            ))
                          ) : (
                            <option value={currentUser?.id || 'me'}>{currentUser?.name || currentUser?.email || 'Sales Logged In'}</option>
                          )}
                        </select>
                      </div>
                    </div>

                    {pics.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemovePicRow(idx)}
                        className="text-surface-400 hover:text-red-600 transition-colors p-1 rounded-md cursor-pointer"
                        title="Hapus PIC"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-surface-600 block mb-1">
                      Nama PIC <span className="text-red-500">*</span>
                    </label>
                    <div className="relative flex items-center">
                      <User className="w-3.5 h-3.5 text-surface-400 absolute left-3 pointer-events-none" />
                      <input
                        type="text"
                        placeholder="Contoh: Pak Rifky"
                        value={pic.name}
                        onChange={e => handlePicChange(idx, 'name', e.target.value)}
                        className="w-full bg-white border border-surface-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-surface-800 outline-none focus:border-brand-500 transition-colors"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[11px] font-bold text-surface-600 block mb-1">Email</label>
                      <div className="relative flex items-center">
                        <Mail className="w-3.5 h-3.5 text-surface-400 absolute left-3 pointer-events-none" />
                        <input
                          type="email"
                          placeholder="rifky@email.com"
                          value={pic.email}
                          onChange={e => handlePicChange(idx, 'email', e.target.value)}
                          className="w-full bg-white border border-surface-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-surface-800 outline-none focus:border-brand-500 transition-colors"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-surface-600 block mb-1">No. Handphone / Telepon</label>
                      <div className="relative flex items-center">
                        <Phone className="w-3.5 h-3.5 text-surface-400 absolute left-3 pointer-events-none" />
                        <input
                          type="text"
                          placeholder="085174174438"
                          value={pic.phone}
                          onChange={e => handlePicChange(idx, 'phone', e.target.value)}
                          className="w-full bg-white border border-surface-200 rounded-lg pl-8 pr-3 py-2 text-xs text-surface-800 outline-none focus:border-brand-500 transition-colors"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Modal Actions */}
          <div className="pt-4 border-t border-surface-100 flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold border border-surface-200 rounded-lg text-surface-700 hover:bg-surface-50 transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2 text-xs font-bold bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-all shadow-sm cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {isSubmitting ? 'Memproses...' : customerToEdit ? 'Simpan Perubahan' : 'Tambah Customer'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
