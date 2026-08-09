import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Plus, Trash2, Save, Loader2, Info, ChevronDown, Check, Search, X, UploadCloud, Image as ImageIcon, Box, FileText, BookmarkPlus } from 'lucide-react';
import { useProducts, useCustomers, useBankAccounts, useBrands } from '../hooks/useSupabase.js';
import * as api from '../services/api.js';
import { PRODUCTS as DUMMY_PRODUCTS } from '../data.js';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../services/supabase.js';
import { toast } from 'react-hot-toast';
import useAuthStore from '../store/authStore.js';
import { getAllTemplatesForUser, savePersonalTemplate, deletePersonalTemplate } from '../utils/termsTemplates.js';


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
  const { data: brands = [] } = useBrands();

  const [customerSearch, setCustomerSearch] = useState('');
  const [status, setStatus]             = useState(quotation?.status || 'draft');
  const [customerId, setCustomerId]     = useState(quotation?.customer_id || '');
  const [picId, setPicId]               = useState(quotation?.pic_id ? String(quotation.pic_id) : '');
  const [expiryDays, setExpiryDays]     = useState(7);
  const [calcTax, setCalcTax]           = useState(quotation?.calc_tax !== false);
  const [showTax, setShowTax]           = useState(quotation?.show_tax !== false);
  const [ppnRate, setPpnRate]           = useState(quotation?.ppn_rate || 0.11);
  const [bankAccountId, setBankAccountId] = useState(quotation?.bank_account_id || '');
  const [termsText, setTermsText]       = useState(
    Array.isArray(quotation?.terms) && quotation.terms.length > 0
      ? quotation.terms.join('\n')
      : DEFAULT_TERMS.join('\n')
  );

  // Custom Terms & Conditions Template State
  const { user } = useAuthStore();
  const userId = user?.id || 'guest';
  const [termsTemplates, setTermsTemplates] = useState(() => getAllTemplatesForUser(userId));
  const [showSaveTplModal, setShowSaveTplModal] = useState(false);
  const [newTplName, setNewTplName] = useState('');

  const handleSelectTemplate = (tplId) => {
    const found = termsTemplates.find(t => t.id === tplId);
    if (found) {
      const text = Array.isArray(found.terms) ? found.terms.join('\n') : String(found.terms || '');
      setTermsText(text);
      toast.success(`Template "${found.name}" diterapkan!`);
    }
  };

  const handleSaveTemplate = () => {
    if (!newTplName.trim()) {
      toast.error('Masukkan nama template!');
      return;
    }
    savePersonalTemplate(userId, newTplName.trim(), termsText);
    setTermsTemplates(getAllTemplatesForUser(userId));
    setShowSaveTplModal(false);
    setNewTplName('');
    toast.success('Template personal berhasil disimpan!');
  };

  const [deleteTargetTemplate, setDeleteTargetTemplate] = useState(null);

  const handleDeletePersonalTemplate = (tplId, name) => {
    setDeleteTargetTemplate({ id: tplId, name });
  };

  const executeDeletePersonalTemplate = () => {
    if (!deleteTargetTemplate) return;
    deletePersonalTemplate(userId, deleteTargetTemplate.id);
    setTermsTemplates(getAllTemplatesForUser(userId));
    toast.success(`Template "${deleteTargetTemplate.name}" berhasil dihapus.`);
    setDeleteTargetTemplate(null);
  };

  // Inline New Product Modal State
  const [isInlineProductModalOpen, setIsInlineProductModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const inlineFileInputRef = useRef(null);
  const [newProdForm, setNewProdForm] = useState({ sku: '', name: '', brand: '', price: 0, description: '', image_url: '' });
  const [showDraftModal, setShowDraftModal] = useState(false);

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
  const ppnAmount = (calcTax && showTax) ? subtotal * ppnRate : 0;
  const grandTotal = subtotal + ppnAmount;

  // Check draft status before saving
  const handleSaveClick = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!quotation?.id) return;

    if (status === 'draft' || status === 'Draft') {
      setShowDraftModal(true);
    } else {
      executeSave(status);
    }
  };

  // Save changes to Supabase
  const executeSave = async (targetStatus) => {
    setShowDraftModal(false);
    if (!quotation?.id) return;

    const finalStatus = targetStatus || status;

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
        status: finalStatus,
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
        // Upsert ad-hoc products to prevent foreign key errors and save names
        const adhocItems = items.filter(i => i.name && (!i.sku || !products?.some(p => p.sku === i.sku)));
        if (adhocItems.length > 0) {
          // Fetch existing brands to resolve brand_id
          const { data: existingBrands } = await supabase.from('brands').select('id, name');
          let currentBrands = existingBrands || [];
          
          const newProductsToInsert = [];
          for (let idx = 0; idx < adhocItems.length; idx++) {
            const i = adhocItems[idx];
            if (!i.sku) {
              i.sku = `ADHOC-${Date.now()}-${idx}`;
            }

            let brandId = null;
            if (i.brand && typeof i.brand === 'string' && i.brand.trim() !== '') {
              const brandName = i.brand.trim();
              let foundBrand = currentBrands.find(b => b.name.toLowerCase() === brandName.toLowerCase());
              
              if (!foundBrand) {
                // Create brand on the fly if it doesn't exist
                const { data: newBrand, error: brandErr } = await supabase
                  .from('brands')
                  .insert([{ name: brandName }])
                  .select('id, name')
                  .single();
                  
                if (!brandErr && newBrand) {
                  foundBrand = newBrand;
                  currentBrands.push(newBrand);
                  queryClient.invalidateQueries({ queryKey: ['brands'] });
                }
              }
              if (foundBrand) {
                brandId = foundBrand.id;
              }
            }

            newProductsToInsert.push({
              sku: i.sku,
              name: i.name,
              price: Number(i.price) || 0,
              is_active: true,
              brand_id: brandId,
              description: i.description || null,
              image_url: i.image_url || null,
            });
          }

          const { error: insertProdErr } = await supabase.from('products').upsert(newProductsToInsert, { onConflict: 'sku' });
          if (insertProdErr) throw insertProdErr;
          queryClient.invalidateQueries({ queryKey: ['products'] });
        }

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

      setStatus(finalStatus);
      toast.success(`Quotation ${quotation.id} berhasil diperbarui (Status: ${finalStatus === 'sent' ? 'Sent' : finalStatus})!`);
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
              onClick={handleSaveClick}
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

      {/* Inline New Product Modal matching Products page */}
      {isInlineProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-900/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-surface-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Box className="w-5 h-5 text-brand-600" />
                <h3 className="text-base font-bold text-surface-900">Tambah Produk Baru</h3>
              </div>
              <button
                className="text-surface-400 hover:text-surface-600 transition-colors cursor-pointer"
                onClick={() => setIsInlineProductModalOpen(false)}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-surface-600 mb-1 block">SKU Produk <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={newProdForm.sku}
                    onChange={e => setNewProdForm(p => ({ ...p, sku: e.target.value }))}
                    className="w-full bg-surface-50 border border-surface-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-500 font-mono"
                    placeholder="Contoh: 960-001681"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-surface-600 mb-1 block">Brand <span className="text-red-500">*</span></label>
                  <select
                    value={newProdForm.brand}
                    onChange={e => setNewProdForm(p => ({ ...p, brand: e.target.value }))}
                    className="w-full bg-surface-50 border border-surface-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-500 cursor-pointer"
                  >
                    <option value="">-- Pilih Brand --</option>
                    {brands.map(b => (
                      <option key={b.id} value={b.name}>{b.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-surface-600 mb-1 block">Nama Produk <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={newProdForm.name}
                  onChange={e => setNewProdForm(p => ({ ...p, name: e.target.value }))}
                  className="w-full bg-surface-50 border border-surface-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-500"
                  placeholder="Contoh: Meetup 2"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-surface-600 mb-1 block">Harga Jual (IDR) <span className="text-red-500">*</span></label>
                <input
                  type="number"
                  value={newProdForm.price || ''}
                  onChange={e => setNewProdForm(p => ({ ...p, price: Number(e.target.value) }))}
                  className="w-full bg-surface-50 border border-surface-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-500 font-mono"
                  placeholder="Rp 0"
                  min="0"
                />
              </div>

              {/* Upload Gambar Produk */}
              <div>
                <label className="text-xs font-semibold text-surface-600 mb-1 block">Gambar Produk</label>
                <input
                  type="file"
                  ref={inlineFileInputRef}
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (!file.type.startsWith('image/')) { toast.error('File harus berupa gambar (PNG, JPG, WebP)'); return; }
                    if (file.size > 2 * 1024 * 1024) { toast.error('Ukuran gambar maksimal 2MB'); return; }
                    setIsUploading(true);
                    try {
                      const url = await api.uploadProductImage(file);
                      setNewProdForm(p => ({ ...p, image_url: url }));
                      toast.success('Gambar produk berhasil diunggah!');
                    } catch (err) {
                      console.error(err);
                      toast.error('Gagal mengunggah gambar.');
                    } finally {
                      setIsUploading(false);
                    }
                  }}
                />
                <div
                  onClick={() => inlineFileInputRef.current?.click()}
                  className="border-2 border-dashed border-emerald-300 rounded-xl p-4 bg-emerald-50/20 text-center hover:bg-emerald-50/40 transition-colors cursor-pointer flex flex-col items-center justify-center gap-2"
                >
                  {isUploading ? (
                    <div className="flex items-center gap-2 text-xs text-brand-600 font-semibold py-2">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Mengunggah gambar...</span>
                    </div>
                  ) : newProdForm.image_url ? (
                    <div className="flex items-center gap-3 w-full">
                      <img src={newProdForm.image_url} alt="Preview" className="w-14 h-14 object-contain rounded-lg border border-surface-200 bg-white p-1" />
                      <div className="text-left flex-1 min-w-0">
                        <div className="text-xs font-bold text-surface-800 truncate">Gambar Siap Digunakan</div>
                        <div className="text-[11px] text-surface-400">Klik untuk mengganti gambar</div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <UploadCloud className="w-6 h-6 text-brand-500" />
                      <div className="text-xs text-surface-500 font-medium">Klik untuk unggah gambar produk (PNG, JPG max 2MB)</div>
                    </>
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-surface-600 mb-1 block">Deskripsi Singkat (Opsional)</label>
                <textarea
                  value={newProdForm.description}
                  onChange={e => setNewProdForm(p => ({ ...p, description: e.target.value }))}
                  rows={2}
                  className="w-full bg-surface-50 border border-surface-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-500"
                  placeholder="Tuliskan spesifikasi utama..."
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-surface-100 flex items-center justify-end gap-3 bg-surface-50">
              <button
                className="px-4 py-2 text-sm font-semibold text-surface-600 hover:text-surface-900 cursor-pointer"
                onClick={() => setIsInlineProductModalOpen(false)}
              >
                Batal
              </button>
              <button
                className="px-5 py-2 text-sm font-bold bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-all shadow-sm cursor-pointer"
                onClick={() => {
                  if (!newProdForm.name) { toast.error('Nama produk wajib diisi'); return; }
                  // Add as a new inline item row with description and image_url included!
                  setItems(prev => [
                    ...prev,
                    {
                      id: null,
                      sku: newProdForm.sku || '',
                      name: newProdForm.name,
                      brand: newProdForm.brand || '',
                      qty: 1,
                      hpp: 0,
                      margin: 0,
                      margin_value: 0,
                      price: newProdForm.price || 0,
                      description: newProdForm.description || '',
                      image_url: newProdForm.image_url || '',
                    }
                  ]);
                  setNewProdForm({ sku: '', name: '', brand: '', price: 0, description: '', image_url: '' });
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

      {/* Syarat & Ketentuan Card with Template Selector */}
      <div className="bg-white rounded-2xl border border-surface-200 shadow-sm p-6 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div>
            <h3 className="text-sm font-bold text-surface-800 flex items-center gap-2">
              <FileText className="w-4 h-4 text-brand-500" />
              Syarat & Ketentuan
            </h3>
            <p className="text-xs text-surface-400">Pilih template preset sales atau tulis poin khusus (satu baris per poin).</p>
          </div>

          <button
            type="button"
            onClick={() => setShowSaveTplModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-brand-600 bg-brand-50 border border-brand-200 rounded-lg hover:bg-brand-100 transition-colors cursor-pointer"
          >
            <BookmarkPlus className="w-4 h-4" />
            Simpan sebagai Template Baru
          </button>
        </div>

        {/* Template Presets Bar */}
        <div className="mb-3 p-3 bg-surface-50 rounded-xl border border-surface-200 flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-surface-600 mr-1">Template Preset:</span>
          {termsTemplates.map(tpl => {
            const isPersonal = tpl.type === 'personal' || tpl.id.startsWith('personal-') || tpl.id.startsWith('tpl-user-');
            return (
              <div key={tpl.id} className={`inline-flex items-center gap-1.5 bg-white border ${isPersonal ? 'border-purple-200 hover:border-purple-400' : 'border-surface-200 hover:border-brand-400'} rounded-lg px-2.5 py-1 text-xs shadow-2xs transition-all`}>
                <button
                  type="button"
                  onClick={() => handleSelectTemplate(tpl.id)}
                  className="font-medium text-surface-700 hover:text-brand-600 text-xs cursor-pointer flex items-center gap-1"
                  title={isPersonal ? 'Template Personal Anda' : 'Template Master Perusahaan (Admin)'}
                >
                  <span>{isPersonal ? '👤' : '🏢'}</span>
                  <span>{tpl.name}</span>
                  <span className={`text-[10px] px-1 rounded ${isPersonal ? 'bg-purple-50 text-purple-600' : 'bg-surface-100 text-surface-500'}`}>
                    {isPersonal ? 'Personal' : 'Master'}
                  </span>
                </button>
                {isPersonal && (
                  <button
                    type="button"
                    onClick={() => handleDeletePersonalTemplate(tpl.id, tpl.name)}
                    className="text-surface-400 hover:text-red-500 ml-0.5 text-xs cursor-pointer p-0.5"
                    title="Hapus template buatan saya ini"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <textarea
          rows={6}
          value={termsText}
          onChange={e => setTermsText(e.target.value)}
          placeholder="1. Harga belum termasuk PPN 11%&#10;2. Pembayaran CBO..."
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
          onClick={handleSaveClick}
          disabled={isSaving}
          className="flex items-center gap-2 px-6 py-2.5 text-xs font-bold bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-all shadow-sm cursor-pointer disabled:opacity-60"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Simpan Perubahan
        </button>
      </div>

      {/* Draft Status Confirmation Modal */}
      {showDraftModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-surface-200 animate-scale-in">
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mb-4">
              <Info className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-surface-900 mb-1.5">Ubah Status ke Terkirim (Sent)?</h3>
            <p className="text-xs text-surface-600 leading-relaxed mb-6">
              Status quotation <span className="font-mono font-bold text-surface-800">{quotation.id}</span> saat ini masih berstatus <span className="font-bold text-amber-600">Draft</span>. Apakah Anda ingin mengubah statusnya secara otomatis menjadi <span className="font-bold text-emerald-600">Sent (Terkirim)</span> saat menyimpan perubahan?
            </p>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowDraftModal(false)}
                className="px-4 py-2 text-xs font-semibold text-surface-600 hover:bg-surface-100 rounded-lg transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => executeSave('draft')}
                className="px-4 py-2 text-xs font-semibold text-surface-700 bg-surface-100 hover:bg-surface-200 rounded-lg transition-colors cursor-pointer"
              >
                Tetap Simpan sebagai Draft
              </button>
              <button
                type="button"
                onClick={() => executeSave('sent')}
                className="px-4 py-2 text-xs font-bold text-white bg-brand-500 hover:bg-brand-600 rounded-lg shadow-sm transition-all cursor-pointer"
              >
                Ubah ke Sent & Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Simpan Template Baru */}
      {showSaveTplModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-surface-200 animate-scale-in">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-base font-bold text-surface-900 flex items-center gap-2">
                <BookmarkPlus className="w-5 h-5 text-brand-500" />
                Simpan Template Syarat & Ketentuan
              </h3>
              <button onClick={() => setShowSaveTplModal(false)} className="text-surface-400 hover:text-surface-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-surface-600 mb-4 leading-relaxed">
              Simpan poin Syarat & Ketentuan saat ini agar bisa diterapkan dengan cepat di quotation lain.
            </p>
            <div className="mb-5">
              <label className="block text-xs font-semibold text-surface-700 mb-1">Nama Template</label>
              <input
                type="text"
                placeholder="Contoh: Project Pertamina (Net 14 Days)"
                value={newTplName}
                onChange={e => setNewTplName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSaveTemplate(); }}
                className="w-full bg-surface-50 border border-surface-200 rounded-xl px-3 py-2 text-xs text-surface-800 outline-none focus:border-brand-500"
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowSaveTplModal(false)}
                className="px-4 py-2 text-xs font-semibold text-surface-600 border border-surface-200 rounded-lg hover:bg-surface-50 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveTemplate}
                className="px-4 py-2 text-xs font-bold bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-all shadow-sm cursor-pointer"
              >
                Simpan Template
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Hapus Template Personal */}
      {deleteTargetTemplate && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-surface-200 animate-scale-in">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-surface-900 mb-1.5">Hapus Template Personal?</h3>
            <p className="text-xs text-surface-600 leading-relaxed mb-6">
              Apakah Anda yakin ingin menghapus template personal <span className="font-bold text-surface-800">"{deleteTargetTemplate.name}"</span>? Poin syarat & ketentuan ini tidak dapat dikembalikan.
            </p>
            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteTargetTemplate(null)}
                className="px-4 py-2 text-xs font-semibold text-surface-600 border border-surface-200 rounded-lg hover:bg-surface-50 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={executeDeletePersonalTemplate}
                className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm transition-all cursor-pointer"
              >
                Ya, Hapus Template
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
