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
  const calcTax = q.calcTax !== false; // defaults to true
  const showTax = q.showTax !== false; // defaults to true
  const ppnRate = q.ppnRate || 0.11;

  const bank = COMPANY.bankAccounts.find(b => b.id === q.bankAccountId) 
    || COMPANY.bankAccounts.find(b => b.isDefault) 
    || COMPANY.bankAccounts[0];

  const bakeTaxIntoItems = calcTax && !showTax;
  const taxMultiplier = bakeTaxIntoItems ? (1 + ppnRate) : 1;

  const baseSubtotal = calcQuotationTotal(q.items);
  const subtotal = bakeTaxIntoItems ? baseSubtotal * taxMultiplier : baseSubtotal;
  const ppn = (calcTax && showTax) ? subtotal * ppnRate : 0;
  const grand = subtotal + ppn;
  
  const formatCurrencyGrid = (val) => {
    const formatted = formatCurrency(val);
    const numPart = formatted.replace(/^Rp\s*/i, '');
    return `<div style="display: flex; justify-content: space-between; width: 100%;"><span>Rp</span><span>${numPart}</span></div>`;
  };
  
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Mohon izinkan pop-up untuk mencetak/mendownload PDF.');
    return;
  }

  // Group items by brand
  const groupedItems = {};
  q.items.forEach((item) => {
    const prod = PRODUCTS.find(p => p.sku === item.sku);
    const itemBrand = prod?.brand || 'Uncategorized';
    if (!groupedItems[itemBrand]) {
      groupedItems[itemBrand] = [];
    }
    groupedItems[itemBrand].push({ item, prod, itemBrand });
  });

  let itemRows = '';
  let globalIndex = 1;
  for (const [brand, group] of Object.entries(groupedItems)) {
    if (brand && brand !== 'Uncategorized') {
      itemRows += `
        <tr class="brand-header-row">
          <td colspan="${withImage ? 8 : 7}" style="border: 1px solid #000; padding: 6px; font-weight: bold; background: #e6f7f5; font-size: 11px;">${brand}</td>
        </tr>
      `;
    }
    group.forEach(({ item, prod, itemBrand }) => {
      const imageCol = withImage 
        ? `<td style="border: 1px solid #000; padding: 6px; text-align: center;"><img src="${prod?.image || `https://placehold.co/120x80/f3f4f6/6b7280?text=${encodeURIComponent(itemBrand || 'Product')}`}" style="max-width: 80px; max-height: 50px; object-fit: contain; border-radius: 4px;" alt="Product"/></td>`
        : '';

      const displayedPrice = item.price * taxMultiplier;

      itemRows += `
        <tr>
          <td style="text-align: center; border: 1px solid #000; padding: 4px; font-size: 10px;">1.${globalIndex}</td>
          <td style="text-align: center; border: 1px solid #000; padding: 4px; font-size: 9px; word-break: break-all;">${item.sku}</td>
          <td style="text-align: center; border: 1px solid #000; padding: 4px; font-size: 10px; font-weight: 600;">${itemBrand}</td>
          <td style="border: 1px solid #000; padding: 4px; font-size: 10px; text-align: left; line-height: 1.4; white-space: pre-wrap;"><strong>${prod?.name || item.sku}</strong> — ${prod?.description || ''}</td>
          ${imageCol}
          <td style="text-align: center; border: 1px solid #000; padding: 4px; font-size: 10px;">${item.qty}</td>
          <td style="border: 1px solid #000; padding: 4px; font-size: 10px;">${formatCurrencyGrid(displayedPrice)}</td>
          <td style="border: 1px solid #000; padding: 4px; font-size: 10px;">${formatCurrencyGrid(item.qty * displayedPrice)}</td>
        </tr>
      `;
      globalIndex++;
    });
  }

  const html = `
    <html>
      <head>
        <title>Quotation ${q.id} - ${q.customer}</title>
        <style>
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
          body { font-family: 'Arial', sans-serif; color: #000; margin: 30px; font-size: 12px; }
          @media print { * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } }
          .logo-area { text-align: right; font-size: 9px; line-height: 1.5; color: #555; }
          .title-area h1 { font-size: 32px; font-weight: bold; margin: 0 0 8px 0; padding: 0; letter-spacing: 0.5px; line-height: 1; }
          .meta-item { margin-bottom: 4px; font-size: 11px; }
          .table-items { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          .table-items th { border: 1px solid #000; background: #e6f7f5; padding: 6px; font-size: 10px; text-transform: uppercase; font-weight: bold; text-align: center; }
          .terms { font-size: 10px; line-height: 1.5; margin-bottom: 40px; }
          .terms ol { margin: 5px 0 0 15px; padding: 0; }
          .signature { display: flex; justify-content: space-between; margin-top: 50px; }
          .signature-box { width: 200px; text-align: center; }
          .signature-line { border-bottom: 1px solid #000; height: 70px; margin-bottom: 5px; }
        </style>
      </head>
      <body>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <tr>
            <td style="vertical-align: top; padding: 0;">
              <h1 style="font-size: 32px; font-weight: bold; margin: 0 0 8px 0; padding: 0; letter-spacing: 0.5px; line-height: 1;">QUOTATION</h1>
              <div style="margin-bottom: 3px; font-size: 11px;">Quotation No : ${q.id}</div>
              <div style="margin-bottom: 3px; font-size: 11px;">${formatDate(q.date)}</div>
              <div style="font-size: 11px; color: red;">Expired ${new Date(q.expired).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>
            </td>
            <td style="vertical-align: top; text-align: right; padding: 0;" class="logo-area">
              <img src="/logo_quot.png" alt="ACTiV" style="width: 200px; display: block; margin-left: auto; margin-bottom: 4px; object-fit: contain;" />
              <div><strong>PT. Alfa Cipta Teknologi Virtual</strong></div>
              <div>Infinity Office, Bellezza BSA 1st Floor Unit 106,</div>
              <div>JL. Letjen Soepeno, Kebayoran Lama Jakarta Selatan 12210</div>
              <div>Rep off: Ruko Golden Boulevard Blok S No.28 Pahlawan Seribu, BSD</div>
              <div>Serpong, Kota Tangerang Selatan, Serpong - Banten, 15315</div>
              <div>T: (021) 50110987 | E: sales@activ.co.id | W: www.activ.co.id</div>
            </td>
          </tr>
        </table>

        <div style="display: flex; justify-content: space-between; margin-bottom: 30px; font-size: 11px;">
          <table style="width: 45%; border-collapse: collapse; border: none; font-size: 11px; margin-top: auto;">
            <tr><td style="font-weight: bold; width: 100px; padding-bottom: 3px;">Customer</td><td style="font-weight: bold; padding-bottom: 3px;">: ${q.customer}</td></tr>
            <tr><td style="padding-bottom: 3px;">PIC Name</td><td style="padding-bottom: 3px;">: ${q.pic || '—'}</td></tr>
            <tr><td style="padding-bottom: 3px;">Phone Number</td><td style="padding-bottom: 3px;">: ${q.phone || '—'}</td></tr>
            <tr><td style="padding-bottom: 3px;">Email</td><td style="padding-bottom: 3px;">: ${q.email || '—'}</td></tr>
          </table>
          
          <div style="width: 45%; line-height: 1.4;">
            <div style="font-weight: bold; margin-bottom: 4px; text-transform: uppercase;">SENDER</div>
            <div style="font-weight: bold;">${q.sales}</div>
            ${(() => {
              const salesPerson = SALES_TEAM.find(s => s.name === q.sales);
              return salesPerson
                ? `<div>Mobile : ${salesPerson.mobile}</div><div>Office : 021-50110987</div><div style="color: blue; text-decoration: underline;">${salesPerson.email}</div>`
                : `<div>Mobile : —</div><div>Office : 021-50110987</div>`;
            })()}
            <div style="font-weight: bold; text-transform: uppercase; margin-top: 2px;">PT. ALFA CIPTA TEKNOLOGI VIRTUAL (ACTIV)</div>
          </div>
        </div>

        <div style="font-size: 10px; margin-bottom: 5px; font-style: italic;">Price in IDR</div>
        <table class="table-items">
          <thead>
            <tr>
              <th style="width: 4%">NO</th>
              <th style="width: 10%">SKU</th>
              <th style="width: 10%">BRAND NAME</th>
              <th>DESCRIPTION PRODUCT</th>
              ${withImage ? '<th style="width: 10%">PRODUCT DISPLAY</th>' : ''}
              <th style="width: 5%">QTY</th>
              <th style="width: 12%">PRICE</th>
              <th style="width: 12%">TOTAL PRICE</th>
            </tr>
          </thead>
          <tbody>
            ${itemRows}
            <tr>
              <td colspan="${withImage ? 6 : 5}" style="border: none;"></td>
              <td style="border: 1px solid #000; font-weight: bold; text-align: right; background: #f3f4f6; font-size: 10px;">TOTAL</td>
              <td style="border: 1px solid #000; font-weight: bold; background: #f3f4f6; font-size: 10px;">${formatCurrencyGrid(subtotal)}</td>
            </tr>
            ${calcTax && showTax ? `
            <tr>
              <td colspan="${withImage ? 6 : 5}" style="border: none;"></td>
              <td style="border: 1px solid #000; font-weight: bold; text-align: right; background: #f3f4f6; font-size: 10px;">PPN (VAT) ${ppnRate * 100}%</td>
              <td style="border: 1px solid #000; font-weight: bold; background: #f3f4f6; font-size: 10px;">${formatCurrencyGrid(ppn)}</td>
            </tr>` : ''}
            <tr>
              <td colspan="${withImage ? 6 : 5}" style="border: none;"></td>
              <td style="border: 1px solid #000; font-weight: bold; text-align: right; background: #e5e7eb; font-size: 10px;">GRAND TOTAL</td>
              <td style="border: 1px solid #000; font-weight: bold; background: #e5e7eb; font-size: 10px;">${formatCurrencyGrid(grand)}</td>
            </tr>
          </tbody>
        </table>

        <div class="terms">
          <strong>Syarat & Ketentuan</strong>
          <ol>
            ${(q.terms || getDefaultTerms()).map(t => {
              if (t.toLowerCase().includes("ready stock")) {
                return `<li><strong>${t}</strong></li>`;
              }
              return `<li>${t}</li>`;
            }).join('')}
          </ol>
          <div style="margin-top: 10px;">
            <strong>Nomor Rekening :</strong><br/>
            ${bank.bank} : ${bank.number} - ${bank.name}
          </div>
        </div>

        <div class="signature">
          <div class="signature-box">
            <div>Prepare by :</div>
            ${(() => {
              const sp = SALES_TEAM.find(s => s.name === q.sales);
              if (sp && sp.signature) {
                return `<div class="signature-line" style="height:70px; border:none; display:flex; align-items:flex-end; justify-content:center;"><img src="${sp.signature}" style="max-height:65px; max-width:180px; object-fit:contain; border-bottom:1px solid #000; padding-bottom:5px; width: 100%;" /></div>`;
              }
              return `<div class="signature-line"></div>`;
            })()}
            <div style="margin-top: 5px;"><strong>${q.sales}</strong></div>
            <div style="font-size: 10px; color: #555;">PT. Alfa Cipta Teknologi Virtual</div>
          </div>
          <div class="signature-box" style="margin-top: 20px;">
            <div>Approve by :</div>
            <div class="signature-line" style="border-bottom: 1px dashed #ccc; height: 50px;"></div>
            <div style="font-size: 10px; color: #555; margin-top: 20px;">Customer Signature & Stamp</div>
          </div>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 500);
          }
        </script>
      </body>
    </html>
  `;
  
  printWindow.document.write(html);
  printWindow.document.close();
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
