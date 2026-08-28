// ============================================
// Shared Utilities
// ============================================
import {
  QUOTATIONS, CUSTOMERS, SALES_TEAM, BRANDS, PRODUCTS, COMPANY, MONTHLY_REVENUE,
  formatCurrency, formatCurrencyShort, formatDate, calcQuotationTotal, calcGrandTotal, daysUntil
} from './data.js';

export { QUOTATIONS, CUSTOMERS, SALES_TEAM, BRANDS, PRODUCTS, COMPANY, MONTHLY_REVENUE, formatCurrency, formatCurrencyShort, formatDate, calcQuotationTotal, calcGrandTotal, daysUntil };

export function statusLabel(s) {
  const map = { created: 'Created', draft: 'Created', sent: 'Sent', approved: 'PO', rejected: 'Rejected', expired: 'Expired', pending: 'Pending' };
  return map[s] || s;
}

export function statusClasses(s) {
  const map = {
    created: 'bg-gray-100 text-gray-600',
    draft: 'bg-gray-100 text-gray-600',
    sent: 'bg-blue-50 text-blue-700',
    approved: 'bg-emerald-50 text-emerald-700',
    rejected: 'bg-red-50 text-red-700',
    expired: 'bg-amber-50 text-amber-700',
    pending: 'bg-purple-50 text-purple-700',
  };
  return map[s] || 'bg-gray-100 text-gray-500';
}

export function statusDot(s) {
  const map = {
    created: 'bg-gray-400',
    draft: 'bg-gray-400',
    sent: 'bg-blue-500',
    approved: 'bg-emerald-500',
    rejected: 'bg-red-500',
    expired: 'bg-amber-500',
    pending: 'bg-purple-500',
  };
  return map[s] || 'bg-gray-400';
}

export function brandClasses(b) {
  if (!b) return 'bg-gray-100 text-gray-500';
  const normalized = `brand-badge-${b.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
  
  // Find brand color from BRANDS database
  const brand = BRANDS.find(x => x.name.toLowerCase() === b.toLowerCase());
  const color = brand ? brand.color : '#6B7280';
  
  const styleId = `style-${normalized}`;
  let styleEl = document.getElementById(styleId);
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = styleId;
    document.head.appendChild(styleEl);
  }
  
  styleEl.textContent = `
    .${normalized} {
      background-color: ${color}12 !important;
      color: ${color} !important;
      border: 1px solid ${color}20 !important;
    }
    .dot-${normalized} {
      background-color: ${color} !important;
    }
  `;
  
  return normalized;
}

export function brandDot(b) {
  if (!b) return 'bg-gray-400';
  const normalized = `brand-badge-${b.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
  brandClasses(b); // Ensure rules are injected
  return `dot-${normalized}`;
}

export function showToast(msg, type = 'success') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const colors = { success: 'border-l-emerald-500', info: 'border-l-blue-500', warning: 'border-l-amber-500' };
  const icons = {
    success: `<svg class="w-4 h-4 text-emerald-500 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22,4 12,14.01 9,11.01"/></svg>`,
    info: `<svg class="w-4 h-4 text-blue-500 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
    warning: `<svg class="w-4 h-4 text-amber-500 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
  };
  const el = document.createElement('div');
  el.className = `flex items-center gap-3 px-4 py-3 bg-white border border-surface-200 ${colors[type] || colors.success} border-l-[3px] rounded-lg shadow-lg text-sm toast-enter min-w-[280px]`;
  el.innerHTML = `${icons[type] || icons.success}<span class="text-surface-700">${msg}</span>`;
  container.appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

// Reusable table action icons
export function actionView() {
  return `<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
}
export function actionDownload() {
  return `<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`;
}
export function actionEdit() {
  return `<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`;
}
export function actionDelete() {
  return `<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="3,6 5,6 21,6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>`;
}

// Generate pagination
export function renderPagination(currentPage, totalPages, containerId) {
  if (totalPages <= 1) return '';
  let html = '';
  for (let i = 1; i <= totalPages; i++) {
    html += `<button class="min-w-[32px] h-8 flex items-center justify-center rounded-md text-xs font-semibold border transition-colors ${i === currentPage ? 'bg-brand-500 text-white border-brand-500' : 'bg-white text-surface-500 border-surface-200 hover:border-surface-400 hover:text-surface-700'}" data-page="${i}">${i}</button>`;
  }
  return html;
}

// Empty state
export function emptyState(title, desc) {
  return `
    <div class="flex flex-col items-center justify-center py-16 text-center">
      <div class="w-16 h-16 rounded-2xl bg-surface-100 flex items-center justify-center mb-4">
        <svg class="w-8 h-8 text-surface-300" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>
      </div>
      <h3 class="text-base font-semibold text-surface-700 mb-1">${title}</h3>
      <p class="text-sm text-surface-400 max-w-xs">${desc}</p>
    </div>
  `;
}

import { printQuotation as mainPrintQuotation } from './utils/printQuotation.js';

// Print Quotation view
export function printQuotation(q, withImage = true) {
  return mainPrintQuotation(q, withImage);
}


// Default terms helper — generic, not brand-specific
export function getDefaultTerms() {
  return [
    "Harga sudah termasuk PPN 11%",
    "Harga belum termasuk biaya instalasi by remote & onsite",
    "Pembayaran CBD (Cash before delivery)",
    "Ready stock (limited stock)",
    "Dikenakan biaya pembatalan 50% dari nilai PO jika pembeli membatalkan PO",
    "Garansi 1 tahun / menyesuaikan unit yg dibeli",
    "Harga FOB Batam"
  ];
}
