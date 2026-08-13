import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { X, ChevronRight, Plus, Trash2, Info, Building2, User, Phone, Mail, Loader2 } from 'lucide-react';
import { useCustomers } from '../hooks/useSupabase.js';
import useAuthStore from '../store/authStore.js';
import { useQueryClient } from '@tanstack/react-query';
import * as api from '../services/api.js';
import { supabase } from '../services/supabase.js';
import { toast } from 'react-hot-toast';

export default function QuotationModal({ isOpen, onClose, onCreated }) {
  const { user } = useAuthStore();
  const { data: customers } = useCustomers();
  const queryClient = useQueryClient();

  const isManagerOrAdmin = !user || ['admin', 'Administrator', 'Sales Manager', 'Manager'].includes(user.role);

  // Filter customers for Sales / Presales role to only show customers where PIC belongs to that sales
  const availableCustomers = (customers || []).filter(c => {
    if (isManagerOrAdmin) return true;
    if (!user?.id) return true;

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
      q.creator?.email === user.email
    );

    return isCreator || isPicSales || isQuotationSales;
  });

  const [mode, setMode] = useState('existing'); // 'existing' | 'new'
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Existing customer form state
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedPicId, setSelectedPicId]           = useState('');
  const [picForm, setPicForm]                       = useState({ name: '', phone: '', email: '' });

  // New customer form state
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newCompanyAddress, setNewCompanyAddress] = useState('');
  const [newPics, setNewPics]               = useState([{ name: '', phone: '', email: '' }]);

  const [editCompanyAddress, setEditCompanyAddress] = useState('');

  // Quotation info state
  const [salesName, setSalesName]   = useState('');
  const [expiryDays, setExpiryDays] = useState(7);
  const [prefixType, setPrefixType] = useState('bu'); // 'bu' | 'personal'

  // Sync salesName with logged in user when modal opens or user loads
  useEffect(() => {
    if (user) {
      setSalesName(user.name || user.email || '');
      if (user.bu?.code) {
        setPrefixType('bu');
      } else {
        setPrefixType('personal');
      }
    }
  }, [user, isOpen]);

  // When selected customer changes, auto-select primary PIC
  useEffect(() => {
    if (!selectedCustomerId || !customers) {
      setSelectedPicId('');
      setPicForm({ name: '', phone: '', email: '' });
      return;
    }
    const customer = customers.find(c => c.id === selectedCustomerId);
    if (customer && customer.pics && customer.pics.length > 0) {
      const primary = customer.pics.find(p => p.is_primary) || customer.pics[0];
      // Convert to string so <select value> comparison works (BIGINT id vs string)
      setSelectedPicId(String(primary.id));
      setPicForm({
        name:  primary.name  || '',
        phone: primary.phone || '',
        email: primary.email || ''
      });
      setEditCompanyAddress(customer.address || '');
    } else {
      setSelectedPicId('');
      setPicForm({ name: '', phone: '', email: '' });
      setEditCompanyAddress('');
    }
  }, [selectedCustomerId, customers]);

  // When PIC dropdown changes, update picForm
  const handlePicSelectChange = (picId) => {
    setSelectedPicId(picId); // already a string from <select onChange>
    if (!selectedCustomerId || !customers) return;
    const customer = customers.find(c => c.id === selectedCustomerId);
    if (!customer) return;
    // Find by comparing string ids (BIGINT comes as number from Supabase)
    const pic = customer.pics?.find(p => String(p.id) === String(picId));
    if (pic) {
      setPicForm({ name: pic.name || '', phone: pic.phone || '', email: pic.email || '' });
    }
  };

  // Add new PIC row for 'new' mode
  const handleAddNewPicRow = () => {
    setNewPics(prev => [...prev, { name: '', phone: '', email: '' }]);
  };

  const handleRemoveNewPicRow = (index) => {
    if (newPics.length <= 1) return;
    setNewPics(prev => prev.filter((_, i) => i !== index));
  };

  const handleNewPicChange = (index, field, value) => {
    setNewPics(prev => prev.map((p, i) => i === index ? { ...p, [field]: value } : p));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    let customerId = selectedCustomerId;
    let picId = selectedPicId;

    if (mode === 'existing') {
      if (!selectedCustomerId) {
        toast.error('Silakan pilih customer terlebih dahulu.');
        return;
      }
      if (selectedPicId === 'new' && !picForm.name.trim()) {
        toast.error('Nama PIC wajib diisi.');
        return;
      }
    } else {
      if (!newCompanyName.trim()) {
        toast.error('Nama PT / Perusahaan wajib diisi.');
        return;
      }
      if (!newPics[0]?.name.trim()) {
        toast.error('Minimal 1 data PIC wajib diisi.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      // 1. If mode === 'existing' and selectedPicId === 'new', insert new PIC into Supabase
      if (mode === 'existing') {
        if (selectedPicId === 'new') {
          const { data: newPic, error: picErr } = await supabase
            .from('customer_pics')
            .insert([{
              customer_id: selectedCustomerId,
              name: picForm.name.trim(),
              phone: picForm.phone.trim() || null,
              email: picForm.email.trim() || null,
              is_primary: false,
            }])
            .select()
            .single();

          if (picErr) throw picErr;
          picId = String(newPic.id);
          queryClient.invalidateQueries({ queryKey: ['customers'] });
        }

        const customer = customers?.find(c => c.id === selectedCustomerId);
        if (customer && (customer.address || '') !== editCompanyAddress.trim()) {
          await api.updateCustomer(selectedCustomerId, { address: editCompanyAddress.trim() || null });
          queryClient.invalidateQueries({ queryKey: ['customers'] });
        }
      }

      // 2. If mode === 'new', create customer and pics in Supabase
      if (mode === 'new') {
        if (!newCompanyName.trim()) {
          toast.error('Nama PT / Perusahaan wajib diisi.');
          setIsSubmitting(false);
          return;
        }
        const validPics = newPics.filter(p => p.name.trim());
        if (validPics.length === 0) {
          toast.error('Minimal 1 data PIC wajib diisi (nama tidak boleh kosong).');
          setIsSubmitting(false);
          return;
        }

        const customerData = {
          name: newCompanyName.trim(),
          address: newCompanyAddress.trim() || null,
          sales_id: user?.id || null,
          bu_id: user?.bu?.id || null,
        };

        const picData = validPics.map((p, idx) => ({
          name: p.name.trim(),
          phone: p.phone.trim() || null,
          email: p.email.trim() || null,
          is_primary: idx === 0,
          sales_id: user?.id || null,
        }));

        const newCustomer = await api.createCustomer(customerData, picData);
        customerId = newCustomer.id;
        // Use the first inserted PIC id as pic_id for the new quotation
        if (newCustomer.pics && newCustomer.pics.length > 0) {
          picId = String(newCustomer.pics[0].id);
        }
        queryClient.invalidateQueries({ queryKey: ['customers'] });
      }

      // 2. Calculate expiry date
      const now = new Date();
      const expiredDate = new Date();
      expiredDate.setDate(expiredDate.getDate() + Number(expiryDays || 7));

      const dateStr = now.toISOString().slice(0, 10);
      const expiredStr = expiredDate.toISOString().slice(0, 10);

      // Determine quotation prefix: BU code (default if available) or personal sales code
      const chosenPrefixCode = (prefixType === 'bu' && user?.bu?.code)
        ? user.bu.code
        : (user?.sales_code || user?.bu?.code || 'QO5');

      // 3. Create Quotation in Supabase
      const quotationData = {
        customer_id: customerId,
        pic_id: picId ? Number(picId) : null,
        sales_id: user?.id || null,
        sales_code: chosenPrefixCode,
        bu_id: user?.bu?.id || null,
        status: 'created',
        date: dateStr,
        expired: expiredStr,
      };

      const newQuo = await api.createQuotation(quotationData, []);

      toast.success(`Quotation ${newQuo.id || ''} berhasil disimpan ke database!`);
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard_stats'] });

      // Reset form & Close
      setNewCompanyName('');
      setNewCompanyAddress('');
      setEditCompanyAddress('');
      setNewPics([{ name: '', phone: '', email: '' }]);
      setSelectedCustomerId('');
      setSelectedPicId('');
      onClose();
      if (onCreated) onCreated(newQuo);
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Gagal menyimpan quotation ke database.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-2xl border border-surface-200 shadow-2xl w-[580px] max-w-[95vw] max-h-[90vh] overflow-y-auto transform transition-all duration-200">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100 sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-base font-bold text-surface-900">Buat Quotation Baru</h2>
            <p className="text-xs text-surface-400 mt-0.5">Isi data customer & quotation, produk ditambahkan di langkah berikutnya</p>
          </div>
          <button
            onClick={onClose}
            className="text-surface-400 hover:text-surface-600 hover:bg-surface-100 p-1.5 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-5">

          {/* Step 1: Data Customer */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-5 h-5 rounded-full bg-brand-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0">1</span>
              <span className="text-sm font-bold text-surface-800">Data Customer</span>
            </div>

            {/* Mode Selector Toggle */}
            <div className="flex items-center gap-1 p-1 bg-surface-100 rounded-lg mb-4 w-fit border border-surface-200">
              <button
                type="button"
                onClick={() => setMode('existing')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  mode === 'existing' ? 'bg-white shadow-sm text-brand-700 font-bold' : 'text-surface-500 hover:text-surface-700'
                }`}
              >
                Pilih yang sudah ada
              </button>
              <button
                type="button"
                onClick={() => setMode('new')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  mode === 'new' ? 'bg-white shadow-sm text-brand-700 font-bold' : 'text-surface-500 hover:text-surface-700'
                }`}
              >
                + Customer baru
              </button>
            </div>

            {/* Existing Customer Panel */}
            {mode === 'existing' && (
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-surface-600">Nama Perusahaan</label>
                  <select
                    value={selectedCustomerId}
                    onChange={e => setSelectedCustomerId(e.target.value)}
                    className="bg-surface-50 border border-surface-200 rounded-lg px-3 py-2.5 text-sm text-surface-700 outline-none focus:border-brand-500 cursor-pointer"
                  >
                    <option value="">-- Pilih Customer --</option>
                    {availableCustomers?.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                  </select>
                </div>

                {selectedCustomerId && (
                  <div className="flex flex-col gap-1.5 animate-fade-in mt-1">
                    <label className="text-xs font-semibold text-surface-600">Alamat Lengkap Perusahaan</label>
                    <textarea
                      placeholder="Alamat akan tersimpan otomatis saat quotation dibuat..."
                      value={editCompanyAddress}
                      onChange={e => setEditCompanyAddress(e.target.value)}
                      rows={2}
                      className="w-full bg-surface-50 border border-surface-200 rounded-lg px-3 py-2 text-sm text-surface-700 outline-none focus:border-brand-500 transition-colors resize-y"
                    />
                  </div>
                )}

                {/* PIC Selection Area for selected customer */}
                {selectedCustomerId && (
                  <div className="flex flex-col gap-3 bg-surface-50/70 p-3.5 rounded-xl border border-surface-200 animate-fade-in">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-surface-600">Pilih / Ubah PIC untuk Quotation ini</label>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPicId('new');
                          setPicForm({ name: '', phone: '', email: '' });
                        }}
                        className="flex items-center gap-1 text-xs font-bold text-brand-600 hover:text-brand-700 transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        + Tambah PIC
                      </button>
                    </div>

                    {/* PIC Dropdown — always show if customer selected */}
                    {(() => {
                      const customer = customers?.find(c => c.id === selectedCustomerId);
                      const pics = customer?.pics || [];
                      return (
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-semibold text-surface-600">PIC</label>
                          <select
                            value={selectedPicId}
                            onChange={e => {
                              if (e.target.value === 'new') {
                                setSelectedPicId('new');
                                setPicForm({ name: '', phone: '', email: '' });
                              } else {
                                handlePicSelectChange(e.target.value);
                              }
                            }}
                            className="bg-white border border-surface-200 rounded-lg px-3 py-2.5 text-sm text-surface-700 outline-none focus:border-brand-500 cursor-pointer w-full"
                          >
                            <option value="">-- Pilih PIC --</option>
                            {pics.map(p => (
                              <option key={p.id} value={String(p.id)}>
                                {p.name}{p.is_primary ? ' (Utama)' : ''}{p.phone ? ` — ${p.phone}` : ''}{p.email ? ` / ${p.email}` : ''}
                              </option>
                            ))}
                            <option value="new">+ Tambah PIC Baru...</option>
                          </select>
                        </div>
                      );
                    })()}

                    {/* Editable PIC detail fields */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <input
                        type="text"
                        placeholder="Nama PIC"
                        value={picForm.name}
                        onChange={e => setPicForm({ ...picForm, name: e.target.value })}
                        className="w-full min-w-0 bg-white border border-surface-200 rounded-lg px-3 py-2 text-sm text-surface-700 outline-none focus:border-brand-500 transition-colors"
                      />
                      <input
                        type="text"
                        placeholder="No. Telp"
                        value={picForm.phone}
                        onChange={e => setPicForm({ ...picForm, phone: e.target.value })}
                        className="w-full min-w-0 bg-white border border-surface-200 rounded-lg px-3 py-2 text-sm text-surface-700 outline-none focus:border-brand-500 transition-colors"
                      />
                      <input
                        type="email"
                        placeholder="Email PIC"
                        value={picForm.email}
                        onChange={e => setPicForm({ ...picForm, email: e.target.value })}
                        className="w-full min-w-0 bg-white border border-surface-200 rounded-lg px-3 py-2 text-sm text-surface-700 outline-none focus:border-brand-500 transition-colors"
                      />
                    </div>
                    <p className="text-[11px] text-surface-400 flex items-center gap-1">
                      <Info className="w-3.5 h-3.5 text-surface-400 shrink-0" />
                      Jika Anda mengganti nama PIC di atas, data akan tersimpan sebagai PIC tambahan untuk customer ini.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* New Customer Panel */}
            {mode === 'new' && (
              <div className="flex flex-col gap-3 animate-fade-in">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-surface-600">Nama PT / Perusahaan <span className="text-red-400">*</span></label>
                  <input
                    type="text"
                    placeholder="Contoh: PT. Maju Bersama"
                    value={newCompanyName}
                    onChange={e => setNewCompanyName(e.target.value)}
                    className="w-full min-w-0 bg-surface-50 border border-surface-200 rounded-lg px-3 py-2.5 text-sm text-surface-700 outline-none focus:border-brand-500"
                  />
                </div>

                <div className="flex flex-col gap-1.5 mt-1">
                  <label className="text-xs font-semibold text-surface-600">Alamat Lengkap Perusahaan</label>
                  <textarea
                    placeholder="Contoh: Jl. Sudirman No. 1..."
                    value={newCompanyAddress}
                    onChange={e => setNewCompanyAddress(e.target.value)}
                    rows={2}
                    className="w-full bg-surface-50 border border-surface-200 rounded-lg px-3 py-2 text-sm text-surface-700 outline-none focus:border-brand-500 transition-colors resize-y"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5 mt-2">
                    <label className="text-xs font-semibold text-surface-600">Daftar PIC <span className="text-red-400">*</span></label>
                    <button
                      type="button"
                      onClick={handleAddNewPicRow}
                      className="flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Tambah PIC
                    </button>
                  </div>

                  <div className="flex flex-col gap-2">
                    {newPics.map((p, idx) => (
                      <div key={idx} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-surface-50/50 p-2 sm:p-0 rounded-lg sm:bg-transparent border border-surface-100 sm:border-none">
                        <input
                          type="text"
                          placeholder="Nama PIC"
                          value={p.name}
                          onChange={e => handleNewPicChange(idx, 'name', e.target.value)}
                          className="flex-1 min-w-0 bg-surface-50 border border-surface-200 rounded-lg px-3 py-2 text-sm text-surface-700 outline-none focus:border-brand-500"
                        />
                        <input
                          type="text"
                          placeholder="No. Telp"
                          value={p.phone}
                          onChange={e => handleNewPicChange(idx, 'phone', e.target.value)}
                          className="flex-1 min-w-0 bg-surface-50 border border-surface-200 rounded-lg px-3 py-2 text-sm text-surface-700 outline-none focus:border-brand-500"
                        />
                        <input
                          type="email"
                          placeholder="Email PIC"
                          value={p.email}
                          onChange={e => handleNewPicChange(idx, 'email', e.target.value)}
                          className="flex-1 min-w-0 bg-surface-50 border border-surface-200 rounded-lg px-3 py-2 text-sm text-surface-700 outline-none focus:border-brand-500"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveNewPicRow(idx)}
                          disabled={newPics.length <= 1}
                          className={`p-2 rounded-lg transition-colors cursor-pointer self-end sm:self-center shrink-0 ${
                            newPics.length <= 1 ? 'text-surface-200 cursor-not-allowed' : 'text-surface-400 hover:text-red-500 hover:bg-red-50'
                          }`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="h-px bg-surface-100"></div>

          {/* Step 2: Info Quotation */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-5 h-5 rounded-full bg-brand-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0">2</span>
              <span className="text-sm font-bold text-surface-800">Info Quotation</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-surface-600">Sales (Pembuat)</label>
                <input
                  type="text"
                  placeholder="Nama sales..."
                  value={salesName}
                  onChange={e => setSalesName(e.target.value)}
                  className="bg-surface-50 border border-surface-200 rounded-lg px-3 py-2.5 text-sm text-surface-700 outline-none focus:border-brand-500"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-surface-600">Masa Berlaku (Hari)</label>
                <input
                  type="number"
                  value={expiryDays}
                  onChange={e => setExpiryDays(Number(e.target.value))}
                  min="1"
                  max="90"
                  className="bg-surface-50 border border-surface-200 rounded-lg px-3 py-2.5 text-sm text-surface-700 outline-none focus:border-brand-500"
                />
              </div>
            </div>

            {/* Prefix Selection if user has BU */}
            {user?.bu?.code && (
              <div className="mt-3 bg-brand-50/60 rounded-xl p-3 border border-brand-100 flex flex-col gap-1.5">
                <label className="text-xs font-bold text-brand-800 uppercase tracking-wider">Prefix Nomor Quotation</label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-xs font-medium text-surface-700 cursor-pointer">
                    <input
                      type="radio"
                      name="prefixType"
                      value="bu"
                      checked={prefixType === 'bu'}
                      onChange={() => setPrefixType('bu')}
                      className="accent-brand-500"
                    />
                    <span>Kode BU: <strong className="font-mono text-brand-700">{user.bu.code}</strong> ({user.bu.name})</span>
                  </label>
                  {user.sales_code && (
                    <label className="flex items-center gap-2 text-xs font-medium text-surface-700 cursor-pointer">
                      <input
                        type="radio"
                        name="prefixType"
                        value="personal"
                        checked={prefixType === 'personal'}
                        onChange={() => setPrefixType('personal')}
                        className="accent-brand-500"
                      />
                      <span>Kode Sales: <strong className="font-mono text-surface-800">{user.sales_code}</strong></span>
                    </label>
                  )}
                </div>
              </div>
            )}
            <p className="text-xs text-surface-400 mt-3 flex items-center gap-1">
              <Info className="w-3.5 h-3.5 text-brand-500 shrink-0" />
              Produk, harga, dan syarat & ketentuan diisi di halaman berikutnya.
            </p>
          </div>

          {/* Footer */}
          <div className="pt-2 border-t border-surface-100 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-surface-600 border border-surface-200 rounded-lg hover:bg-surface-50 transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2 text-sm font-semibold bg-brand-500 text-white rounded-lg hover:bg-brand-600 shadow-sm hover:shadow transition-all cursor-pointer disabled:opacity-60"
            >
              {isSubmitting ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Menyimpan...</>
              ) : (
                <><ChevronRight className="w-4 h-4" /> Lanjut & Isi Produk</>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>,
    document.body
  );
}

