import React, { useState } from 'react';
import { ArrowLeft, Edit, Download, CheckCircle2, Clock, XCircle, AlertCircle, FileText, Building2, User, Phone, Mail, CreditCard } from 'lucide-react';
import { printQuotation } from '../utils/printQuotation.js';
import { format, parseISO, isValid, differenceInDays } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { useBankAccounts } from '../hooks/useSupabase.js';
import useAuthStore from '../store/authStore.js';


const formatCurrency = (val) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val || 0);

const formatDateStr = (str) => {
  if (!str) return '-';
  try {
    const d = parseISO(str);
    return isValid(d) ? format(d, 'd MMMM yyyy', { locale: idLocale }) : str;
  } catch { return str; }
};

const brandClasses = (brand) => {
  const b = (brand || '').toLowerCase();
  if (b.includes('jabra')) return 'bg-amber-100 text-amber-800 border border-amber-200';
  if (b.includes('logitech')) return 'bg-teal-100 text-teal-800 border border-teal-200';
  if (b.includes('poly')) return 'bg-purple-100 text-purple-800 border border-purple-200';
  if (b.includes('yealink')) return 'bg-blue-100 text-blue-800 border border-blue-200';
  if (b.includes('hikvision')) return 'bg-red-100 text-red-800 border border-red-200';
  return 'bg-surface-100 text-surface-700 border border-surface-200';
};

const formatBrandName = (brand) => {
  if (!brand) return '';
  if (typeof brand === 'object') return brand.name || '';
  return String(brand);
};

export default function QuotationDetail({ quotation, onBack, onEdit }) {
  const [withImage, setWithImage] = useState(true);
  const { data: bankAccounts = [] } = useBankAccounts();
  const { user: currentUser } = useAuthStore();

  if (!quotation) return null;

  const items = quotation.items || [];
  const subtotal = items.reduce((sum, i) => sum + ((i.qty || 0) * (i.price || 0)), 0);
  const ppnRate = quotation.ppn_rate || 0.11;
  const calcTax = quotation.calc_tax !== false;
  const showTax = quotation.show_tax !== false;
  const ppn = (calcTax && showTax) ? subtotal * ppnRate : 0;
  const grandTotal = subtotal + ppn;

  // Days until expiry
  const expDateStr = quotation.expired || quotation.expired_at;
  let expiredLabel = '';
  let expiredColor = 'text-surface-500';

  if (expDateStr) {
    try {
      const expDate = parseISO(expDateStr);
      const days = differenceInDays(expDate, new Date());
      if (days < 0) {
        expiredLabel = 'Sudah expired';
        expiredColor = 'text-red-600';
      } else if (days === 0) {
        expiredLabel = 'Expired hari ini';
        expiredColor = 'text-red-600';
      } else {
        expiredLabel = `${days} hari lagi`;
        expiredColor = days <= 3 ? 'text-amber-600' : 'text-emerald-600';
      }
    } catch {
      expiredLabel = '';
    }
  }

  // Get list of unique brand names from items
  const itemBrands = Array.from(new Set(
    items.map(i => {
      const prod = i.product;
      return formatBrandName(i.brand || prod?.brand || prod?.brands);
    }).filter(Boolean)
  ));

  // Get PIC object or fallback
  const picObj = quotation.pic || quotation.customer?.pics?.find(p => p.is_primary) || quotation.customer?.pics?.[0] || null;

  // Bank account — resolved from real DB data
  const bankAccount = bankAccounts.find(b => b.id === quotation.bank_account_id)
    || bankAccounts.find(b => b.is_default)
    || bankAccounts[0]
    || null;

  // Default terms list
  const defaultTerms = [
    'Harga belum termasuk PPN 11% (kecuali dinyatakan lain).',
    'Penawaran berlaku sesuai masa berlaku tertera.',
    'Pembayaran ditransfer ke rekening resmi PT. Alfa Cipta Teknologi Virtual.',
    'Pengiriman dilakukan setelah konfirmasi pembayaran diterima.',
  ];
  const termsList = (Array.isArray(quotation.terms) && quotation.terms.length > 0)
    ? quotation.terms
    : (quotation.notes ? quotation.notes.split('\n').filter(Boolean) : defaultTerms);

  const statusBadge = (s) => {
    switch (s) {
      case 'approved': return <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase tracking-wide"><CheckCircle2 className="w-3.5 h-3.5" /> Approved</span>;
      case 'sent':     return <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 uppercase tracking-wide"><Clock className="w-3.5 h-3.5" /> Sent</span>;
      case 'rejected': return <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200 uppercase tracking-wide"><XCircle className="w-3.5 h-3.5" /> Rejected</span>;
      case 'expired':  return <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold bg-orange-50 text-orange-700 border border-orange-200 uppercase tracking-wide"><AlertCircle className="w-3.5 h-3.5" /> Expired</span>;
      default:         return <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold bg-surface-100 text-surface-600 border border-surface-200 uppercase tracking-wide"><FileText className="w-3.5 h-3.5" /> Draft</span>;
    }
  };

  return (
    <div className="animate-fade-in max-w-5xl">
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm font-semibold text-surface-500 hover:text-brand-600 mb-5 transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        Kembali ke Daftar Quotation
      </button>

      {/* 1. Header & Info Grid Card */}
      <div className="bg-white rounded-2xl border border-surface-200 shadow-sm mb-6 overflow-hidden">
        {/* Main Header Bar */}
        <div className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-surface-100">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-2xl font-bold text-surface-900 font-mono tracking-tight">{quotation.id}</h2>
              {statusBadge(quotation.status)}
            </div>
            <p className="text-xs text-surface-400">Dibuat pada {formatDateStr(quotation.date || quotation.created_at)}</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => onEdit(quotation)}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold border border-surface-200 rounded-lg text-surface-700 hover:bg-surface-50 transition-colors cursor-pointer"
            >
              <Edit className="w-4 h-4" />
              Edit Quotation
            </button>

            <button
              onClick={() => {
                // Merge current user's latest signature into quotation.creator
                const enrichedQuotation = {
                  ...quotation,
                  creator: {
                    ...(quotation.creator || {}),
                    // Override with live data from auth store (always latest)
                    ...(currentUser?.id === (quotation.sales_id || quotation.created_by) ? {
                      name: currentUser.name,
                      email: currentUser.email,
                      mobile: currentUser.mobile,
                      signature_url: currentUser.signature_url,
                    } : {}),
                  },
                };
                printQuotation(enrichedQuotation, withImage, bankAccount);
              }}
              className="flex items-center gap-2 px-5 py-2 text-xs font-bold bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-all shadow-sm cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Cetak / PDF
            </button>
          </div>
        </div>

        {/* PDF Settings Sub-Bar */}
        <div className="px-6 py-2.5 bg-surface-50/80 border-b border-surface-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-6 flex-wrap">
            <label className="flex items-center gap-2 font-medium text-surface-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={withImage}
                onChange={e => setWithImage(e.target.checked)}
                className="w-4 h-4 rounded text-brand-500 accent-brand-500 cursor-pointer"
              />
              <span>Tampilkan Gambar Produk</span>
            </label>
          </div>

          <span className="text-[11px] text-surface-400 italic hidden md:inline">Pengaturan tampilan cetak PDF</span>
        </div>

        {/* 4 Column Info Grid matching mockup */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-surface-100">
          <div className="p-5">
            <div className="text-[11px] font-bold text-surface-400 uppercase tracking-wider mb-2">Customer</div>
            <div className="text-sm font-bold text-surface-900 mb-1">{quotation.customer?.name || '-'}</div>
            <div className="text-xs text-surface-600">PIC: {picObj?.name || '-'}</div>
            {(picObj?.phone || picObj?.email) && (
              <div className="text-[11px] text-surface-400 mt-1">
                {picObj.phone || ''}{picObj.phone && picObj.email ? ' · ' : ''}{picObj.email || ''}
              </div>
            )}
          </div>

          <div className="p-5">
            <div className="text-[11px] font-bold text-surface-400 uppercase tracking-wider mb-2">Brand</div>
            <div className="flex flex-wrap gap-1.5">
              {itemBrands.length > 0 ? (
                itemBrands.map((b, idx) => (
                  <span key={idx} className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${brandClasses(b)}`}>
                    {b}
                  </span>
                ))
              ) : (
                <span className="text-xs text-surface-400">—</span>
              )}
            </div>
          </div>

          <div className="p-5">
            <div className="text-[11px] font-bold text-surface-400 uppercase tracking-wider mb-2">Sales</div>
            <div className="text-sm font-bold text-surface-900">{quotation.creator?.name || 'Sales'}</div>
            <div className="text-xs text-surface-500">PT. Alfa Cipta Teknologi Virtual</div>
          </div>

          <div className="p-5">
            <div className="text-[11px] font-bold text-surface-400 uppercase tracking-wider mb-2">Masa Berlaku</div>
            <div className="text-xs font-bold text-surface-800">
              {formatDateStr(quotation.date || quotation.created_at)} — {formatDateStr(quotation.expired || quotation.expired_at)}
            </div>
            {expiredLabel && (
              <div className={`text-xs font-semibold mt-1 ${expiredColor}`}>{expiredLabel}</div>
            )}
          </div>
        </div>
      </div>

      {/* 2. Items Table Card */}
      <div className="bg-white rounded-2xl border border-surface-200 shadow-sm mb-6 overflow-hidden">
        <div className="px-6 py-4 border-b border-surface-100">
          <h3 className="text-sm font-bold text-surface-800">Item Produk</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-50 border-b border-surface-200">
                <th className="py-3 px-4 text-center text-xs font-bold text-surface-500 uppercase w-12">No</th>
                <th className="py-3 px-4 text-left text-xs font-bold text-surface-500 uppercase">Produk</th>
                <th className="py-3 px-4 text-left text-xs font-bold text-surface-500 uppercase w-28">Brand</th>
                <th className="py-3 px-4 text-center text-xs font-bold text-surface-500 uppercase w-20">QTY</th>
                <th className="py-3 px-4 text-right text-xs font-bold text-surface-500 uppercase w-36">Harga Satuan</th>
                <th className="py-3 px-4 text-right text-xs font-bold text-surface-500 uppercase w-40">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {items.map((i, idx) => {
                const prod = i.product || {};
                const name = prod.name || i.name || i.product_name || '-';
                const sku = prod.sku || i.sku || '';
                const brandName = formatBrandName(i.brand || prod.brand || prod.brands);

                return (
                  <tr key={idx} className="hover:bg-surface-50/50 transition-colors">
                    <td className="py-3.5 px-4 text-xs font-bold text-surface-400 text-center">1.{idx + 1}</td>
                    <td className="py-3.5 px-4">
                      <div className="text-sm font-semibold text-surface-900">{name}</div>
                      {sku && <div className="text-xs font-mono text-surface-400">{sku}</div>}
                    </td>
                    <td className="py-3.5 px-4">
                      {brandName ? (
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${brandClasses(brandName)}`}>
                          {brandName}
                        </span>
                      ) : (
                        <span className="text-xs text-surface-400">—</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-xs font-bold text-center text-surface-700">{i.qty}</td>
                    <td className="py-3.5 px-4 text-xs text-right font-mono text-surface-700">{formatCurrency(i.price)}</td>
                    <td className="py-3.5 px-4 text-xs font-extrabold text-right text-surface-900">{formatCurrency((i.qty || 1) * (i.price || 0))}</td>
                  </tr>
                );
              })}
              {items.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-xs text-surface-400">
                    Belum ada item produk dalam quotation ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Calculation Summary Footer */}
        <div className="border-t border-surface-200 px-6 py-4 bg-surface-50/50">
          <div className="flex flex-col items-end gap-1.5">
            <div className="flex items-center gap-8 text-xs text-surface-600">
              <span className="w-32 text-right">Subtotal</span>
              <span className="font-bold text-surface-800 w-36 text-right">{formatCurrency(subtotal)}</span>
            </div>
            {calcTax && showTax && (
              <div className="flex items-center gap-8 text-xs text-surface-600">
                <span className="w-32 text-right">PPN (11%)</span>
                <span className="font-bold text-surface-800 w-36 text-right">{formatCurrency(ppn)}</span>
              </div>
            )}
            <div className="w-44 h-px bg-surface-200 ml-auto"></div>
            <div className="flex items-center gap-8 text-sm pt-1">
              <span className="font-bold text-surface-800 w-32 text-right">Grand Total</span>
              <span className="font-extrabold text-brand-700 w-36 text-right text-base">{formatCurrency(grandTotal)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Syarat & Ketentuan Card (Bottom Card) */}
      <div className="bg-white rounded-2xl border border-surface-200 shadow-sm p-6 mb-8">
        <h3 className="text-sm font-bold text-surface-800 mb-3">Syarat & Ketentuan</h3>
        <ol className="list-decimal list-inside text-xs text-surface-600 space-y-2 font-sans leading-relaxed">
          {termsList.map((term, idx) => (
            <li key={idx} className={term.toLowerCase().includes('ready stock') ? 'font-bold text-surface-900' : ''}>
              {term}
            </li>
          ))}
        </ol>

        <div className="mt-5 pt-4 border-t border-surface-100 flex items-center gap-3">
          <CreditCard className="w-4 h-4 text-brand-500" />
          <div className="text-xs">
            <span className="font-semibold text-surface-500">Nomor Rekening Resmi: </span>
            <span className="font-bold text-surface-800">
              {bankAccount
                ? `${bankAccount.bank_name} : ${bankAccount.account_number} — ${bankAccount.account_name}`
                : 'Silakan hubungi kami untuk informasi rekening.'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
