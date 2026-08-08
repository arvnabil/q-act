import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Plus, Trash2, Save, Loader2, Info, ChevronDown, Check, Search, X } from 'lucide-react';
import { useProducts, useCustomers, useBankAccounts } from '../hooks/useSupabase.js';
import { PRODUCTS as DUMMY_PRODUCTS } from '../data.js';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../services/supabase.js';
import { toast } from 'react-hot-toast';


const brandClasses = (brand) => {
  const b = (brand || '').toLowerCase();
  if (b.includes('jabra')) return 'bg-amber-100 text-amber-800 border border-amber-200';
  if (b.includes('logitech')) return 'bg-teal-100 text-teal-800 border border-teal-200';
  if (b.includes('poly')) return 'bg-purple-100 text-purple-800 border border-purple-200';
  if (b.includes('yealink')) return 'bg-blue-100 text-blue-800 border border-blue-200';
  if (b.includes('hikvision')) return 'bg-red-100 text-red-800 border border-red-200';
  return 'bg-surface-100 text-surface-700 border border-surface-200';
};

const DEFAULT_TERMS = [
  'Harga belum termasuk PPN 11% (kecuali dinyatakan lain).',
  'Penawaran berlaku sesuai masa berlaku tertera.',
  'Pembayaran ditransfer ke rekening resmi PT. Alfa Cipta Teknologi Virtual.',
  'Pengiriman dilakukan setelah konfirmasi pembayaran diterima.',
];

const formatCurrency = (val) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val || 0);

const formatBrandName = (brand) => {
  if (!brand) return '';
  if (typeof brand === 'object') return brand.name || '';
  return String(brand);
};

export default function QuotationEdit({ quotation, onBack, onSaved }) {
  const queryClient = useQueryClient();
  const { data: products } = useProducts();
  const { data: customers } = useCustomers();
  const { data: bankAccounts = [] } = useBankAccounts();

  const [status, setStatus]             = useState(quotation?.status || 'draft');
  const [customerId, setCustomerId]     = useState(quotation?.customer_id || '');
  const [picId, setPicId]               = useState(quotation?.pic_id ? String(quotation.pic_id) : '');
  const [expiryDays, setExpiryDays]     = useState(7);
  const [calcTax, setCalcTax]           = useState(quotation?.calc_tax !== false);
  const [showTax, setShowTax]           = useState(quotation?.show_tax !== false);
  const [bankAccountId, setBankAccountId] = useState(quotation?.bank_account_id || '');
  const [termsText, setTermsText]       = useState(
    Array.isArray(quotation?.terms) && quotation.terms.length > 0
      ? quotation.terms.join('\n')
      : DEFAULT_TERMS.join('\n')
  );

  // Inline New Product Modal State
  const [isInlineProductModalOpen, setIsInlineProductModalOpen] = useState(false);
  const [newProdForm, setNewProdForm] = useState({ sku: '', name: '', brand: '', price: 0, description: '' });

  // Auto-select PIC when customerId changes or initially loads
  useEffect(() => {
    if (customerId && customers) {
      const cust = customers.find(c => c.id === customerId);
      if (cust && cust.pics && cust.pics.length > 0) {
        if (!picId || !cust.pics.some(p => String(p.id) === String(picId))) {
          const primary = cust.pics.find(p => p.is_primary) || cust.pics[0];
          setPicId(String(primary.id));
        }
      }
    }
  }, [customerId, customers]);

  // Auto-select default bank account when accounts load and none is set
  useEffect(() => {
    if (bankAccounts.length > 0 && !bankAccountId) {
      const def = bankAccounts.find(b => b.is_default) || bankAccounts[0];
      setBankAccountId(def.id);
    }
  }, [bankAccounts]);


  // Item rows state
  const [items, setItems] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [openDropdownIdx, setOpenDropdownIdx] = useState(null);

  // Initialize items from quotation prop
  // DB schema: quotation_items(id BIGINT, quotation_id, sku FK->products, qty, price, margin, sort_order)
  // Join: product:products(sku, name, hpp, brand:brands(name, color_hex))
  useEffect(() => {
    if (quotation && quotation.items) {
      setItems(quotation.items
        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
        .map(i => {
          const prod = i.product || null;
          const brandObj = prod?.brand || prod?.brands || null;
          const hpp = prod?.hpp || prod?.modal || i.hpp || 0;
          const price = i.price || 0;
          const margin = Number(i.margin) || 0;
          const marginValue = Math.max(0, price - hpp);
          return {
            id: i.id,
            sku: i.sku || prod?.sku || '',
            name: prod?.name || i.product_name || i.name || '',
            brand: formatBrandName(brandObj),
            qty: i.qty || 1,
            hpp,
            margin,
            margin_value: marginValue,
            price,
          };
        })
      );
    } else {
      setItems([]);
    }

    // Calculate expiry days from expired date
    if (quotation?.expired || quotation?.expired_at) {
      const expDate = new Date(quotation.expired || quotation.expired_at);
      const startDate = quotation.date ? new Date(quotation.date) : new Date();
      const diffTime = Math.abs(expDate - startDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays > 0) setExpiryDays(diffDays);
    }

    // Load terms if exists
    if (quotation?.terms && Array.isArray(quotation.terms) && quotation.terms.length > 0) {
      setTermsText(quotation.terms.join('\n'));
    } else if (quotation?.notes) {
      setTermsText(quotation.notes);
    }
  }, [quotation]);

  // Handle adding empty item row
  const handleAddItemRow = () => {
    setItems(prev => [
      ...prev,
      { id: null, sku: '', name: '', brand: '', qty: 1, hpp: 0, margin: 0, margin_value: 0, price: 0 }
    ]);
  };

  const handleRemoveItemRow = (idx) => {
    setItems(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSelectProduct = (idx, prod) => {
    setItems(prev => prev.map((item, i) => {
      if (i !== idx) return item;
      const hpp = prod.hpp || prod.modal || Math.round(prod.price * 0.8) || 0;
      const price = prod.price || 0;
      const margin = hpp > 0 ? Math.round(((price - hpp) / hpp) * 100) : 0;
      return {
        ...item,
        product_id: prod.id,
        sku: prod.sku,
        name: prod.name,
        brand: formatBrandName(prod.brands || prod.brand),
        image_url: prod.image_url || prod.image || null,
        hpp,
        margin,
        price,
      };
    }));
    setOpenDropdownIdx(null);
  };

  const handleItemChange = (idx, field, value) => {
    setItems(prev => prev.map((item, i) => {
      if (i !== idx) return item;

      const updated = { ...item, [field]: value };
      const hpp = Number(field === 'hpp' ? value : item.hpp) || 0;
      const mode = field === 'margin_type' ? value : (item.margin_type || 'percent');

      if (field === 'margin_type') {
        updated.margin_type = value;
        if (value === 'nominal') {
          updated.margin_value = Math.max(0, (Number(item.price) || 0) - hpp);
        } else {
          updated.margin = hpp > 0 ? Math.round((((Number(item.price) || 0) - hpp) / hpp) * 100) : 0;
        }
      } else if (field === 'hpp' || field === 'margin' || field === 'margin_value') {
        if (mode === 'nominal') {
          const markupRp = Number(field === 'margin_value' ? value : (item.margin_value || 0)) || 0;
          updated.price = hpp + markupRp;
          updated.margin = hpp > 0 ? Math.round((markupRp / hpp) * 100) : 0;
        } else {
          const marginPct = Number(field === 'margin' ? value : (item.margin || 0)) || 0;
          updated.price = Math.round(hpp * (1 + marginPct / 100));
          updated.margin_value = Math.max(0, updated.price - hpp);
        }
      } else if (field === 'price') {
        const price = Number(value) || 0;
        updated.margin_value = Math.max(0, price - hpp);
        updated.margin = hpp > 0 ? Math.round(((price - hpp) / hpp) * 100) : 0;
      }

      return updated;
    }));
  };

  // Grand total calculation
  const subtotal = items.reduce((sum, item) => sum + ((Number(item.qty) || 0) * (Number(item.price) || 0)), 0);
  const ppnRate = 0.11;
  const ppnAmount = (calcTax && showTax) ? subtotal * ppnRate : 0;
  const grandTotal = subtotal + ppnAmount;

  // Save changes to Supabase
  const handleSave = async (e) => {
    e.preventDefault();
    if (!quotation?.id) return;

    setIsSaving(true);
    try {
      const now = new Date();
      const expDate = new Date();
      expDate.setDate(expDate.getDate() + Number(expiryDays || 7));

      const termsList = termsText.split('\n').map(t => t.trim()).filter(Boolean);

      // 1. Update quotation header (with graceful fallback if 'terms' column does not exist in DB)
      const basePayload = {
        customer_id: customerId || quotation.customer_id,
        pic_id: picId ? Number(picId) : null,
        status,
        calc_tax: calcTax,
        show_tax: showTax,
        bank_account_id: bankAccountId || null,
        notes: termsText,
        expired: expDate.toISOString().slice(0, 10),
      };

      let { error: quoErr } = await supabase
        .from('quotations')
        .update({ ...basePayload, terms: termsList })
        .eq('id', quotation.id);

      if (quoErr && (quoErr.message?.includes("'terms'") || quoErr.code === 'PGRST204')) {
        const { error: fallbackErr } = await supabase
          .from('quotations')
          .update(basePayload)
          .eq('id', quotation.id);

        if (fallbackErr) throw fallbackErr;
      } else if (quoErr) {
        throw quoErr;
      }

      // 2. Delete existing items and re-insert updated items
      await supabase.from('quotation_items').delete().eq('quotation_id', quotation.id);

      if (items.length > 0) {
        const itemsToInsert = items
          .filter(i => i.name || i.sku)
          .map((i, sortIdx) => ({
            quotation_id: quotation.id,
            sku: i.sku || null,
            qty: Number(i.qty) || 1,
            price: Number(i.price) || 0,
            margin: Number(i.margin) || 0,
            sort_order: sortIdx + 1,
          }));

        if (itemsToInsert.length > 0) {
          const { error: itemsErr } = await supabase.from('quotation_items').insert(itemsToInsert);
          if (itemsErr) throw itemsErr;
        }
      }

      toast.success(`Quotation ${quotation.id} berhasil diperbarui!`);
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      if (onSaved) onSaved();
      else onBack();
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Gagal menyimpan perubahan quotation.');
    } finally {
      setIsSaving(false);
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
        Batal & Kembali
      </button>

      {/* Main card */}
      <div className="bg-white rounded-2xl border border-surface-200 shadow-sm mb-6">
        <div className="px-6 py-5 border-b border-surface-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-surface-900">Edit Quotation: <span className="font-mono text-brand-600">{quotation.id}</span></h2>
            <p className="text-xs text-surface-400 mt-0.5">Ubah item produk, kalkulasi margin, dan ketentuan penawaran</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              disabled={isSaving}
              className="px-4 py-2 text-xs font-semibold text-surface-600 border border-surface-200 rounded-lg hover:bg-surface-50 transition-colors cursor-pointer disabled:opacity-50"
            >
              Batal
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 px-5 py-2 text-xs font-bold bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-all shadow-sm cursor-pointer disabled:opacity-60"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Simpan Perubahan
            </button>
          </div>
        </div>

        {/* Customer, PIC, Status, Expiry */}
        <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 border-b border-surface-100">
          <div>
            <label className="text-xs font-semibold text-surface-600 block mb-1">Customer</label>
            <select
              value={customerId}
              onChange={e => setCustomerId(e.target.value)}
              className="w-full bg-surface-50 border border-surface-200 rounded-lg px-3 py-2.5 text-sm text-surface-700 outline-none focus:border-brand-500 cursor-pointer"
            >
              {customers?.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-surface-600 block mb-1">PIC Customer</label>
            <select
              value={picId}
              onChange={e => setPicId(e.target.value)}
              className="w-full bg-surface-50 border border-surface-200 rounded-lg px-3 py-2.5 text-sm text-surface-700 outline-none focus:border-brand-500 cursor-pointer"
            >
              <option value="">-- Pilih PIC --</option>
              {customers?.find(c => c.id === customerId)?.pics?.map(p => (
                <option key={p.id} value={String(p.id)}>
                  {p.name}{p.is_primary ? ' (Utama)' : ''}{p.phone ? ` — ${p.phone}` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-surface-600 block mb-1">Status</label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value)}
              className="w-full bg-surface-50 border border-surface-200 rounded-lg px-3 py-2.5 text-sm text-surface-700 outline-none focus:border-brand-500 cursor-pointer font-semibold"
            >
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="expired">Expired</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-surface-600 block mb-1">Masa Berlaku (Hari)</label>
            <input
              type="number"
              value={expiryDays}
              onChange={e => setExpiryDays(Number(e.target.value))}
              min="1"
              max="90"
              className="w-full bg-surface-50 border border-surface-200 rounded-lg px-3 py-2.5 text-sm text-surface-700 outline-none focus:border-brand-500"
            />
          </div>
        </div>

        {/* Tax Options */}
        <div className="px-6 py-4 border-b border-surface-100">
          <div className="bg-surface-50 rounded-lg px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-4 border border-surface-100">
            <span className="text-xs font-bold text-surface-700">Pengaturan Pajak (PPN):</span>
            <div className="flex items-center gap-5">
              <label className="flex items-center gap-2 text-sm font-medium text-surface-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={calcTax}
                  onChange={e => setCalcTax(e.target.checked)}
                  className="w-4 h-4 rounded text-brand-500 accent-brand-500 cursor-pointer"
                />
                Hitung PPN 11%
              </label>
              <label className={`flex items-center gap-2 text-sm font-medium text-surface-600 cursor-pointer select-none ${!calcTax ? 'opacity-50 pointer-events-none' : ''}`}>
                <input
                  type="checkbox"
                  checked={showTax}
                  onChange={e => setShowTax(e.target.checked)}
                  disabled={!calcTax}
                  className="w-4 h-4 rounded text-brand-500 accent-brand-500 cursor-pointer"
                />
                Tampilkan Baris PPN di PDF
              </label>
            </div>
          </div>
        </div>

        {/* Rekening Bank */}
        <div className="px-6 py-4 border-b border-surface-100">
          <div className="bg-surface-50 rounded-lg px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-4 border border-surface-100">
            <span className="text-xs font-bold text-surface-700 whitespace-nowrap">Rekening Bank:</span>
            <div className="flex items-center gap-5 flex-1">
              <select
                value={bankAccountId}
                onChange={e => setBankAccountId(e.target.value)}
                className="w-full max-w-sm bg-white border border-surface-200 rounded-lg px-3 py-1.5 text-sm text-surface-700 outline-none focus:border-brand-500 cursor-pointer"
              >
                {bankAccounts.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.bank_name} - {b.account_name} ({b.account_number}){b.is_default ? ' [Default]' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Dynamic Brand Summary */}
        {(() => {
          const activeBrands = Array.from(new Set(items.map(i => formatBrandName(i.brand)).filter(Boolean)));
          if (activeBrands.length === 0) return null;
          return (
            <div className="px-6 pb-5">
              <div className="bg-surface-50 rounded-lg px-4 py-3 flex items-center gap-3 border border-surface-100">
                <span className="text-xs font-semibold text-surface-400">Brand dalam quotation ini:</span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {activeBrands.map((b, idx) => (
                    <span key={idx} className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${brandClasses(b)}`}>{b}</span>
                  ))}
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Inline New Product Modal */}
      {isInlineProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-900/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-surface-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-surface-900">Tambah Produk Baru</h3>
              <button
                className="text-surface-400 hover:text-surface-600 transition-colors cursor-pointer"
                onClick={() => setIsInlineProductModalOpen(false)}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 flex flex-col gap-4">
              <div>
                <label className="text-xs font-semibold text-surface-600 mb-1 block">SKU (Opsional)</label>
                <input type="text" value={newProdForm.sku} onChange={e => setNewProdForm(p => ({ ...p, sku: e.target.value }))} className="w-full bg-surface-50 border border-surface-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-500" placeholder="Kode SKU otomatis jika kosong" />
              </div>
              <div>
                <label className="text-xs font-semibold text-surface-600 mb-1 block">Nama Produk <span className="text-red-500">*</span></label>
                <input type="text" value={newProdForm.name} onChange={e => setNewProdForm(p => ({ ...p, name: e.target.value }))} className="w-full bg-surface-50 border border-surface-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-500" placeholder="Contoh: Poly Studio X50" />
              </div>
              <div>
                <label className="text-xs font-semibold text-surface-600 mb-1 block">Brand <span className="text-red-500">*</span></label>
                <input type="text" value={newProdForm.brand} onChange={e => setNewProdForm(p => ({ ...p, brand: e.target.value }))} className="w-full bg-surface-50 border border-surface-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-500" placeholder="Contoh: Poly" />
              </div>
              <div>
                <label className="text-xs font-semibold text-surface-600 mb-1 block">Harga Satuan (Rp) <span className="text-red-500">*</span></label>
                <input type="number" value={newProdForm.price} onChange={e => setNewProdForm(p => ({ ...p, price: Number(e.target.value) }))} className="w-full bg-surface-50 border border-surface-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-500" placeholder="0" min="0" />
              </div>
              <div>
                <label className="text-xs font-semibold text-surface-600 mb-1 block">Deskripsi (Opsional)</label>
                <textarea value={newProdForm.description} onChange={e => setNewProdForm(p => ({ ...p, description: e.target.value }))} rows={2} className="w-full bg-surface-50 border border-surface-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-500" />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-surface-100 flex items-center justify-end gap-3 bg-surface-50">
              <button className="px-4 py-2 text-sm font-semibold text-surface-600 hover:text-surface-900 cursor-pointer" onClick={() => setIsInlineProductModalOpen(false)}>Batal</button>
              <button
                className="px-5 py-2 text-sm font-bold bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-all shadow-sm cursor-pointer"
                onClick={() => {
                  if (!newProdForm.name) { toast.error('Nama produk wajib diisi'); return; }
                  // Add as a new inline item row
                  setItems(prev => [
                    ...prev,
                    { id: null, sku: newProdForm.sku || '', name: newProdForm.name, brand: newProdForm.brand, qty: 1, hpp: 0, margin: 0, margin_value: 0, price: newProdForm.price || 0 }
                  ]);
                  setNewProdForm({ sku: '', name: '', brand: '', price: 0, description: '' });
                  setIsInlineProductModalOpen(false);
                  toast.success(`Produk "${newProdForm.name}" ditambahkan ke item.`);
                }}
              >
                Simpan & Tambahkan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Item Produk Table Card */}
      <div className="bg-white rounded-2xl border border-surface-200 shadow-sm mb-6">
        <div className="px-6 py-4 border-b border-surface-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-surface-800">Item Produk <span className="text-xs font-normal text-surface-400 ml-1">— pilih produk dari brand manapun</span></h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => { setNewProdForm({ sku: '', name: '', brand: '', price: 0, description: '' }); setIsInlineProductModalOpen(true); }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-surface-100 text-surface-700 border border-surface-200 rounded-lg hover:bg-surface-200 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Produk Baru
            </button>
            <button
              type="button"
              onClick={handleAddItemRow}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-brand-50 text-brand-700 border border-brand-200 rounded-lg hover:bg-brand-100 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Tambah Baris Produk
            </button>
          </div>
        </div>

        {/* Backdrop to close dropdown when clicking outside */}
        {openDropdownIdx !== null && (
          <div className="fixed inset-0 z-40" onClick={() => setOpenDropdownIdx(null)} />
        )}

        <div className="overflow-x-visible">
          <table className="w-full text-left border-collapse min-w-[750px]">
            <thead>
              <tr className="bg-surface-50 border-b border-surface-200">
                <th className="py-3 px-3 text-center text-xs font-bold text-surface-400 uppercase w-10">No</th>
                <th className="py-3 px-3 text-left text-xs font-bold text-surface-400 uppercase">Produk</th>
                <th className="py-3 px-3 text-left text-xs font-bold text-surface-400 uppercase w-28">Brand</th>
                <th className="py-3 px-3 text-center text-xs font-bold text-surface-400 uppercase w-20">QTY</th>
                <th className="py-3 px-3 text-right text-xs font-bold text-surface-400 uppercase w-32">Modal (HPP)</th>
                <th className="py-3 px-3 text-center text-xs font-bold text-surface-400 uppercase w-36">Margin / Markup</th>
                <th className="py-3 px-3 text-right text-xs font-bold text-surface-400 uppercase w-32">Harga Satuan</th>
                <th className="py-3 px-3 text-right text-xs font-bold text-surface-400 uppercase w-36">Total</th>
                <th className="py-3 px-3 text-center text-xs font-bold text-surface-400 uppercase w-12">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {items.map((item, idx) => {
                const rowTotal = (Number(item.qty) || 0) * (Number(item.price) || 0);
                const allAvailableProds = (products && products.length > 0) ? products : DUMMY_PRODUCTS;
                const filteredProds = allAvailableProds.filter(p =>
                  !item.name ||
                  p.name.toLowerCase().includes(item.name.toLowerCase()) ||
                  (p.sku && p.sku.toLowerCase().includes(item.name.toLowerCase()))
                );

                return (
                  <tr key={item.id || `item-row-${idx}`} className="hover:bg-surface-50/50 transition-colors">
                    <td className="py-3 px-3 text-xs text-surface-400 text-center font-bold">{idx + 1}</td>
                    
                    {/* Product Search Select Dropdown */}
                    <td className="py-3 px-3 relative">
                      <div className="relative">
                        <div className="flex items-center bg-surface-50 border border-surface-200 rounded-lg px-3 py-1.5 focus-within:border-brand-500 transition-colors">
                          <input
                            type="text"
                            placeholder="Cari produk..."
                            value={item.name}
                            onChange={e => handleItemChange(idx, 'name', e.target.value)}
                            onFocus={() => setOpenDropdownIdx(idx)}
                            className="w-full bg-transparent border-none outline-none text-xs text-surface-800 placeholder-surface-400 font-semibold"
                          />
                          <ChevronDown className="w-3.5 h-3.5 text-surface-400 shrink-0 pointer-events-none" />
                        </div>

                        {openDropdownIdx === idx && (
                          <div
                            className="absolute left-0 top-full mt-1 bg-white border border-surface-200 rounded-xl shadow-2xl max-h-60 overflow-y-auto z-[100] p-1 animate-scale-in"
                            style={{ minWidth: '360px' }}
                          >
                            {filteredProds.length > 0 ? (
                              filteredProds.map((p, pIdx) => {
                                const brandStr = formatBrandName(p.brands || p.brand || '');
                                return (
                                  <div
                                    key={p.id || p.sku || `prod-${pIdx}`}
                                    onClick={() => handleSelectProduct(idx, p)}
                                    className="px-3 py-2 text-xs rounded-lg hover:bg-brand-50 hover:text-brand-700 cursor-pointer transition-colors border-b border-surface-50 last:border-none"
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="font-bold text-surface-800">{p.name}</span>
                                      {brandStr && (
                                        <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-extrabold shrink-0 bg-brand-50 text-brand-700 border border-brand-200">
                                          {brandStr}
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-[10px] text-surface-400 font-mono mt-0.5">{p.sku || '-'}</div>
                                  </div>
                                );
                              })
                            ) : (
                              <div className="p-3 text-xs text-center text-surface-400">
                                Produk tidak ditemukan. Ketik nama produk baru secara langsung.
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-3 text-xs font-semibold text-surface-600">{formatBrandName(item.brand) || '-'}</td>

                    <td className="py-3 px-3 text-center">
                      <input
                        type="number"
                        min="1"
                        value={item.qty}
                        onChange={e => handleItemChange(idx, 'qty', e.target.value)}
                        className="w-16 bg-surface-50 border border-surface-200 rounded-lg px-2 py-1.5 text-xs text-surface-800 outline-none text-center font-bold focus:border-brand-500"
                      />
                    </td>

                    <td className="py-3 px-3">
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={item.hpp}
                        onChange={e => handleItemChange(idx, 'hpp', e.target.value)}
                        className="w-full bg-surface-50 border border-surface-200 rounded-lg px-2 py-1.5 text-xs text-surface-800 outline-none text-right font-mono focus:border-brand-500"
                      />
                    </td>

                    {/* Dual Mode Margin / Markup Cell */}
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleItemChange(idx, 'margin_type', item.margin_type === 'nominal' ? 'percent' : 'nominal')}
                          className={`px-1.5 py-1 rounded text-[10px] font-extrabold transition-all cursor-pointer border shrink-0 ${
                            item.margin_type === 'nominal'
                              ? 'bg-purple-100 text-purple-800 border-purple-300 hover:bg-purple-200'
                              : 'bg-brand-100 text-brand-800 border-brand-300 hover:bg-brand-200'
                          }`}
                          title={item.margin_type === 'nominal' ? 'Mode Nominal (Rp) — Klik untuk ubah ke %' : 'Mode Persentase (%) — Klik untuk ubah ke Rp'}
                        >
                          {item.margin_type === 'nominal' ? 'Rp' : '%'}
                        </button>
                        <input
                          type="number"
                          placeholder={item.margin_type === 'nominal' ? 'Rp' : '%'}
                          value={item.margin_type === 'nominal' ? (item.margin_value ?? '') : (item.margin ?? '')}
                          onChange={e => handleItemChange(idx, item.margin_type === 'nominal' ? 'margin_value' : 'margin', e.target.value)}
                          className="w-20 bg-surface-50 border border-surface-200 rounded-lg px-2 py-1.5 text-xs text-surface-800 outline-none text-center font-bold focus:border-brand-500"
                        />
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <input
                        type="number"
                        min="0"
                        value={item.price}
                        onChange={e => handleItemChange(idx, 'price', e.target.value)}
                        className="w-full bg-surface-50 border border-surface-200 rounded-lg px-2 py-1.5 text-xs text-surface-800 outline-none text-right font-mono font-bold focus:border-brand-500"
                      />
                    </td>

                    <td className="py-3 px-3 text-xs font-extrabold text-surface-900 text-right">
                      {formatCurrency(rowTotal)}
                    </td>

                    <td className="py-3 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveItemRow(idx)}
                        className="text-surface-400 hover:text-red-500 p-1.5 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {items.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-xs text-surface-400">
                    Belum ada item produk. Klik <strong>"+ Tambah Baris Produk"</strong> untuk menambahkan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Calculation summary footer */}
        <div className="px-6 py-4 bg-surface-50/70 border-t border-surface-100 flex flex-col items-end gap-1.5">
          <div className="flex items-center gap-6 text-xs text-surface-600">
            <span>Subtotal:</span>
            <span className="font-extrabold text-surface-800 w-32 text-right">{formatCurrency(subtotal)}</span>
          </div>
          {calcTax && showTax && (
            <div className="flex items-center gap-6 text-xs text-surface-600">
              <span>PPN 11%:</span>
              <span className="font-extrabold text-surface-800 w-32 text-right">{formatCurrency(ppnAmount)}</span>
            </div>
          )}
          <div className="flex items-center gap-6 text-sm font-extrabold text-brand-700 pt-1 border-t border-surface-200">
            <span>Grand Total:</span>
            <span className="w-32 text-right">{formatCurrency(grandTotal)}</span>
          </div>
        </div>
      </div>

      {/* Syarat & Ketentuan Card */}
      <div className="bg-white rounded-2xl border border-surface-200 shadow-sm p-6 mb-6">
        <h3 className="text-sm font-bold text-surface-800 mb-1">Syarat & Ketentuan (Satu baris per poin)</h3>
        <p className="text-xs text-surface-400 mb-3">Tuliskan tiap poin syarat & ketentuan pada baris terpisah.</p>
        <textarea
          rows={5}
          value={termsText}
          onChange={e => setTermsText(e.target.value)}
          className="w-full bg-surface-50 border border-surface-200 rounded-xl p-3 text-xs text-surface-700 outline-none focus:border-brand-500 font-sans leading-relaxed"
        />
      </div>

      {/* Bottom Actions */}
      <div className="flex justify-end gap-3 pb-8">
        <button
          onClick={onBack}
          disabled={isSaving}
          className="px-5 py-2.5 text-xs font-semibold text-surface-600 border border-surface-200 rounded-lg hover:bg-surface-50 transition-colors cursor-pointer disabled:opacity-50"
        >
          Batal
        </button>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-6 py-2.5 text-xs font-bold bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-all shadow-sm cursor-pointer disabled:opacity-60"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Simpan Perubahan
        </button>
      </div>
    </div>
  );
}
