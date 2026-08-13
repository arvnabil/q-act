// ============================================
// Quotations Page — Full list + Detail + Edit + Card/List Layouts
// ============================================
import {
  QUOTATIONS, CUSTOMERS, BRANDS, PRODUCTS, COMPANY,
  formatCurrency, formatCurrencyShort, formatDate, calcQuotationTotal, calcGrandTotal, daysUntil,
  statusLabel, statusClasses, statusDot, brandClasses, printQuotation, getDefaultTerms,
  actionView, actionDownload, actionEdit, actionDelete, renderPagination, showToast, emptyState
} from '../utils.js';

let qPage = 1;
const Q_SIZE = 8;
let qFilterStatus = 'all';
let qFilterBrand = 'all';
let qSearch = '';
let detailId = null;
let editId = null;
let qLayout = 'list'; // 'list' or 'card'
let selectedQuoIds = new Set();

// Form temporary state for editing items
let editFormState = {
  customer: '',
  status: '',
  expiredDays: 7,
  items: [] // array of { sku, qty, price }
};

// Helper: get unique brands from a list of items
function getBrandsFromItems(items) {
  const brandSet = new Set();
  items.forEach(item => {
    const prod = PRODUCTS.find(p => p.sku === item.sku);
    if (prod) brandSet.add(prod.brand);
  });
  return [...brandSet];
}

// Helper: get primary brand (most items, or first found)
function getPrimaryBrand(items) {
  const brands = getBrandsFromItems(items);
  return brands[0] || 'ACTiV';
}

// Helper: render multi-brand badges from item list
function renderBrandBadges(items) {
  const brands = getBrandsFromItems(items);
  if (brands.length === 0) return '<span class="text-xs text-surface-400">—</span>';
  return brands.map(b =>
    `<span class="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${brandClasses(b)}">${b}</span>`
  ).join(' ');
}

function getFiltered() {
  return QUOTATIONS.filter(q => {
    if (qFilterStatus !== 'all' && q.status !== qFilterStatus) return false;
    if (qFilterBrand !== 'all') {
      // Check if any item in the quotation belongs to the filtered brand
      const itemBrands = getBrandsFromItems(q.items);
      if (!itemBrands.some(b => b.toLowerCase() === qFilterBrand)) return false;
    }
    if (qSearch) {
      const s = qSearch.toLowerCase();
      return q.id.toLowerCase().includes(s) || q.customer.toLowerCase().includes(s) || q.sales.toLowerCase().includes(s);
    }
    return true;
  });
}

function renderQuotationEdit(q) {
  const itemRows = editFormState.items.map((item, idx) => {
    const activeProd = PRODUCTS.find(p => p.sku === item.sku);
    const prodName = activeProd ? activeProd.name : '';
    const prodBrand = activeProd ? activeProd.brand : '';

    const allProductOptions = PRODUCTS.map(p => `
      <div class="px-3 py-2 text-sm text-surface-700 hover:bg-brand-50 hover:text-brand-700 cursor-pointer product-option transition-colors" data-sku="${p.sku}" data-name="${p.name}" data-brand="${p.brand}">
        <div class="flex items-center justify-between gap-2">
          <span>${p.name}</span>
          <span class="inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold shrink-0 ${brandClasses(p.brand)}">${p.brand}</span>
        </div>
        <div class="text-xs text-surface-400 font-mono mt-0.5">${p.sku}</div>
      </div>
    `).join('');

    return `
      <tr class="border-b border-surface-100 edit-item-row" data-idx="${idx}">
        <td class="py-3 px-3 text-sm text-surface-600 text-center">${idx + 1}</td>
        <td class="py-3 px-3 relative product-dropdown">
          <div class="flex items-center bg-surface-50 border border-surface-200 rounded-lg px-3 py-1.5 focus-within:border-brand-500 transition-colors">
            <input type="text" class="product-search-input bg-transparent border-none outline-none text-sm text-surface-700 placeholder-surface-400 w-full" 
                   placeholder="Cari produk..." 
                   value="${prodName}" 
                   data-sku="${item.sku}" />
            <svg class="w-4 h-4 text-surface-400 shrink-0 pointer-events-none" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>
          </div>
          <div class="absolute left-0 mt-1 bg-white border border-surface-200 rounded-lg shadow-xl max-h-56 overflow-y-auto z-[100] hidden product-dropdown-menu" style="min-width: 360px;">
            ${allProductOptions}
          </div>
        </td>
        <td class="py-3 px-3">
          ${prodBrand ? `<span class="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${brandClasses(prodBrand)}">${prodBrand}</span>` : '<span class="text-xs text-surface-300">—</span>'}
        </td>
        <td class="py-3 px-3">
          <input type="number" class="item-qty w-16 bg-surface-50 border border-surface-200 rounded-lg px-2 py-1.5 text-sm text-surface-700 outline-none text-center focus:border-brand-500" value="${item.qty}" min="1" />
        </td>
        <td class="py-3 px-3">
          <input type="number" class="item-modal w-28 bg-surface-50 border border-surface-200 rounded-lg px-2 py-1.5 text-sm text-surface-700 outline-none text-right focus:border-brand-500" value="${item.modal || ''}" placeholder="0" />
        </td>
        <td class="py-3 px-3">
          <input type="number" class="item-margin w-20 bg-surface-50 border border-surface-200 rounded-lg px-2 py-1.5 text-sm text-surface-700 outline-none text-center focus:border-brand-500" value="${item.margin !== undefined ? item.margin : ''}" placeholder="%" />
        </td>
        <td class="py-3 px-3">
          <input type="number" class="item-price w-28 bg-surface-50 border border-surface-200 rounded-lg px-2 py-1.5 text-sm text-surface-700 outline-none text-right focus:border-brand-500" value="${item.price}" />
        </td>
        <td class="py-3 px-3 text-sm text-right font-bold text-surface-800 item-total-val">
          ${formatCurrency(item.qty * item.price)}
        </td>
        <td class="py-3 px-3 text-center">
          <button class="remove-item-btn text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors" data-idx="${idx}">
            ${actionDelete()}
          </button>
        </td>
      </tr>
    `;
  }).join('');

  const activeBrandsFromItems = getBrandsFromItems(editFormState.items);

  return `
    <div class="animate-fade-in-up">
      <button class="flex items-center gap-2 text-sm font-medium text-surface-500 hover:text-brand-600 mb-5 transition-colors" id="cancelEdit">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="15,18 9,12 15,6"/></svg>
        Batal & Kembali
      </button>

      <div class="bg-white rounded-xl border border-surface-200 mb-5">
        <div class="px-6 py-5 border-b border-surface-100 flex items-center justify-between">
          <div>
            <h2 class="text-xl font-bold text-surface-900">Edit Quotation: ${q.id}</h2>
            <p class="text-sm text-surface-500">Ubah detail dan kalkulasi penawaran</p>
          </div>
          <div class="flex items-center gap-2">
            <button class="px-4 py-2 text-sm font-semibold border border-surface-200 rounded-lg text-surface-600 hover:bg-surface-50 transition-colors" id="cancelEditBtn">Batal</button>
            <button class="px-5 py-2 text-sm font-semibold bg-brand-500 text-white rounded-lg hover:bg-brand-600 shadow-sm transition-all" id="saveQuotationBtn">Simpan Perubahan</button>
          </div>
        </div>

        <!-- Header: Customer, Status, Expiry (Brand dihapus dari sini) -->
        <div class="px-6 py-5 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-semibold text-surface-600">Customer</label>
            <select id="editCustomer" class="bg-surface-50 border border-surface-200 rounded-lg px-3 py-2.5 text-sm text-surface-700 outline-none focus:border-brand-500 cursor-pointer">
              ${CUSTOMERS.map(c => `<option value="${c.name}" ${c.name === editFormState.customer ? 'selected' : ''}>${c.name}</option>`).join('')}
            </select>
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-semibold text-surface-600">Status</label>
            <select id="editStatus" class="bg-surface-50 border border-surface-200 rounded-lg px-3 py-2.5 text-sm text-surface-700 outline-none focus:border-brand-500 cursor-pointer">
              <option value="draft" ${editFormState.status === 'draft' ? 'selected' : ''}>Draft</option>
              <option value="sent" ${editFormState.status === 'sent' ? 'selected' : ''}>Sent</option>
              <option value="approved" ${editFormState.status === 'approved' ? 'selected' : ''}>Approved</option>
              <option value="rejected" ${editFormState.status === 'rejected' ? 'selected' : ''}>Rejected</option>
              <option value="expired" ${editFormState.status === 'expired' ? 'selected' : ''}>Expired</option>
            </select>
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-semibold text-surface-600">Masa Berlaku (Hari)</label>
            <input type="number" id="editExpiry" class="bg-surface-50 border border-surface-200 rounded-lg px-3 py-2.5 text-sm text-surface-700 outline-none focus:border-brand-500" value="${editFormState.expiredDays}" min="1" max="90" />
          </div>
        </div>

        <!-- Tax Options -->
        <div class="px-6 pb-5">
          <div class="bg-surface-50 rounded-lg px-4 py-3 flex flex-col md:flex-row md:items-center gap-4 border border-surface-100">
            <span class="text-xs font-bold text-surface-700">Pengaturan Pajak (PPN):</span>
            <div class="flex items-center gap-5">
              <label class="flex items-center gap-1.5 text-sm font-medium text-surface-600 cursor-pointer select-none">
                <input type="checkbox" id="editCalcTaxCb" class="w-4 h-4 text-brand-500 bg-white border-surface-300 rounded focus:ring-brand-500 focus:ring-2 accent-brand-500" ${editFormState.calcTax ? 'checked' : ''} />
                <span>Hitung PPN 11%</span>
              </label>
              <label class="flex items-center gap-1.5 text-sm font-medium text-surface-600 cursor-pointer select-none ${!editFormState.calcTax ? 'opacity-50 pointer-events-none' : ''}">
                <input type="checkbox" id="editShowTaxCb" class="w-4 h-4 text-brand-500 bg-white border-surface-300 rounded focus:ring-brand-500 focus:ring-2 accent-brand-500" ${editFormState.showTax ? 'checked' : ''} />
                <span>Tampilkan Baris PPN di PDF</span>
              </label>
            </div>
          </div>
        </div>

        <!-- Bank Options -->
        <div class="px-6 pb-5">
          <div class="bg-surface-50 rounded-lg px-4 py-3 flex flex-col md:flex-row md:items-center gap-4 border border-surface-100">
            <span class="text-xs font-bold text-surface-700">Rekening Bank:</span>
            <div class="flex items-center gap-5 flex-1">
              <select id="editBankAccount" class="w-full max-w-sm bg-white border border-surface-200 rounded-lg px-3 py-1.5 text-sm text-surface-700 outline-none focus:border-brand-500 cursor-pointer">
                ${COMPANY.bankAccounts.map(b => `<option value="${b.id}" ${editFormState.bankAccountId === b.id ? 'selected' : ''}>${b.bank} - ${b.name} (${b.number}) ${b.isDefault ? '[Default]' : ''}</option>`).join('')}
              </select>
            </div>
          </div>
        </div>

        <!-- Dynamic brand summary from items -->
        ${activeBrandsFromItems.length > 0 ? `
          <div class="px-6 pb-5">
            <div class="bg-surface-50 rounded-lg px-4 py-3 flex items-center gap-3 border border-surface-100">
              <span class="text-xs font-semibold text-surface-400">Brand dalam quotation ini:</span>
              <div class="flex items-center gap-1.5 flex-wrap">
                ${activeBrandsFromItems.map(b => `<span class="inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${brandClasses(b)}">${b}</span>`).join('')}
              </div>
            </div>
          </div>
        ` : ''}
      </div>

      <!-- Item Form -->
      <div class="bg-white rounded-xl border border-surface-200">
        <div class="px-6 py-4 border-b border-surface-100 flex justify-between items-center">
          <h3 class="text-sm font-bold text-surface-800">Item Produk
            <span class="text-xs font-normal text-surface-400 ml-1">— pilih produk dari brand manapun</span>
          </h3>
          <div class="flex items-center gap-2">
            <button class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-surface-100 text-surface-700 border border-surface-200 rounded-lg hover:bg-surface-200 transition-all" id="addNewProductInlineBtn">
              + Produk Baru
            </button>
            <button class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-brand-50 text-brand-700 border border-brand-200 rounded-lg hover:bg-brand-100 transition-all" id="addEditItemRow">
              + Tambah Baris Produk
            </button>
          </div>
        </div>
        <div class="overflow-visible">
          <table class="w-full" style="min-width: 680px;">
            <thead>
              <tr class="bg-surface-50 border-b border-surface-200">
                <th class="py-3 px-4 text-center text-xs font-bold text-surface-400 uppercase tracking-wider" style="width: 40px;">No</th>
                <th class="py-3 px-4 text-left text-xs font-bold text-surface-400 uppercase tracking-wider">Produk</th>
                <th class="py-3 px-4 text-left text-xs font-bold text-surface-400 uppercase tracking-wider" style="width: 100px;">Brand</th>
                <th class="py-3 px-4 text-center text-xs font-bold text-surface-400 uppercase tracking-wider" style="width: 80px;">QTY</th>
                <th class="py-3 px-4 text-right text-xs font-bold text-surface-400 uppercase tracking-wider" style="width: 130px;">Modal (HPP)</th>
                <th class="py-3 px-4 text-center text-xs font-bold text-surface-400 uppercase tracking-wider" style="width: 90px;">Margin (%)</th>
                <th class="py-3 px-4 text-right text-xs font-bold text-surface-400 uppercase tracking-wider" style="width: 130px;">Harga</th>
                <th class="py-3 px-4 text-right text-xs font-bold text-surface-400 uppercase tracking-wider" style="width: 140px;">Total</th>
                <th class="py-3 px-4 text-center text-xs font-bold text-surface-400 uppercase tracking-wider" style="width: 50px;">Aksi</th>
              </tr>
            </thead>
            <tbody id="editItemTableBody">${itemRows}</tbody>
          </table>
        </div>
      </div>

      <!-- Terms & Conditions Form -->
      <div class="bg-white rounded-xl border border-surface-200 mt-5">
        <div class="px-6 py-4 border-b border-surface-100">
          <h3 class="text-sm font-bold text-surface-800">Syarat & Ketentuan (Satu baris per poin)</h3>
        </div>
        <div class="px-6 py-4">
          <textarea id="editTerms" rows="8" class="bg-surface-50 border border-surface-200 rounded-lg px-3 py-2.5 text-sm text-surface-700 outline-none focus:border-brand-500 w-full font-sans leading-relaxed">${(editFormState.terms && editFormState.terms.length > 0 ? editFormState.terms : getDefaultTerms()).join('\n')}</textarea>
        </div>
      </div>

      <!-- Inline New Product Modal -->
      <div id="inlineNewProductModal" class="hidden fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-900/50 backdrop-blur-sm animate-fade-in">
        <div class="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
          <div class="px-6 py-4 border-b border-surface-100 flex items-center justify-between">
            <h3 class="text-lg font-bold text-surface-900">Tambah Produk Baru</h3>
            <button class="text-surface-400 hover:text-surface-600 transition-colors cursor-pointer" id="closeInlineProductModal">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"></path></svg>
            </button>
          </div>
          <div class="p-6 flex flex-col gap-4">
            <div>
              <label class="text-xs font-semibold text-surface-600 mb-1 block">SKU (Opsional)</label>
              <input type="text" id="newProdSku" class="w-full bg-surface-50 border border-surface-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-500" placeholder="Kode SKU otomatis jika kosong" />
            </div>
            <div>
              <label class="text-xs font-semibold text-surface-600 mb-1 block">Nama Produk <span class="text-red-500">*</span></label>
              <input type="text" id="newProdName" class="w-full bg-surface-50 border border-surface-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-500" placeholder="Contoh: Poly Studio X50" />
            </div>
            <div>
              <label class="text-xs font-semibold text-surface-600 mb-1 block">Brand <span class="text-red-500">*</span></label>
              <input type="text" id="newProdBrand" class="w-full bg-surface-50 border border-surface-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-500" placeholder="Contoh: Poly" />
            </div>
            <div>
              <label class="text-xs font-semibold text-surface-600 mb-1 block">Harga Satuan (Rp) <span class="text-red-500">*</span></label>
              <input type="number" id="newProdPrice" class="w-full bg-surface-50 border border-surface-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-500" placeholder="0" min="0" />
            </div>
            <div>
              <label class="text-xs font-semibold text-surface-600 mb-1 block">Deskripsi (Opsional)</label>
              <textarea id="newProdDesc" rows="2" class="w-full bg-surface-50 border border-surface-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-500"></textarea>
            </div>
            <div>
              <label class="text-xs font-semibold text-surface-600 mb-1 block">Foto Produk (Opsional)</label>
              <input type="file" id="newProdImage" accept="image/*" class="w-full bg-surface-50 border border-surface-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-brand-500 file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100 cursor-pointer" />
            </div>
          </div>
          <div class="px-6 py-4 border-t border-surface-100 flex items-center justify-end gap-3 bg-surface-50">
            <button class="px-4 py-2 text-sm font-semibold text-surface-600 hover:text-surface-900 transition-colors cursor-pointer" id="cancelInlineProductModal">Batal</button>
            <button class="px-5 py-2 text-sm font-bold bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-all shadow-sm cursor-pointer" id="saveInlineProductBtn">Simpan & Tambahkan</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderQuotationDetail(q) {
  const bank = COMPANY.bankAccounts.find(b => b.id === q.bankAccountId) 
    || COMPANY.bankAccounts.find(b => b.isDefault) 
    || COMPANY.bankAccounts[0];

  const subtotal = calcQuotationTotal(q.items);
  const ppn = subtotal * q.ppnRate;
  const grand = subtotal + ppn;
  const days = daysUntil(q.expired);
  const expiredLabel = days < 0 ? 'Sudah expired' : days === 0 ? 'Expired hari ini' : `${days} hari lagi`;
  const expiredColor = days <= 0 ? 'text-red-600' : days <= 3 ? 'text-amber-600' : 'text-surface-500';
  const itemBrands = getBrandsFromItems(q.items);

  const itemRows = q.items.map((item, idx) => {
    const prod = PRODUCTS.find(p => p.sku === item.sku);
    return `
      <tr class="border-b border-surface-100">
        <td class="py-3 px-4 text-sm text-surface-600 text-center">1.${idx + 1}</td>
        <td class="py-3 px-4"><div class="text-sm font-semibold text-surface-800">${prod?.name || item.sku}</div><div class="text-xs text-surface-400">${item.sku}</div></td>
        <td class="py-3 px-4">
          ${prod?.brand ? `<span class="inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${brandClasses(prod.brand)}">${prod.brand}</span>` : '<span class="text-xs text-surface-400">—</span>'}
        </td>
        <td class="py-3 px-4 text-sm text-center text-surface-600">${item.qty}</td>
        <td class="py-3 px-4 text-sm text-right text-surface-700">${formatCurrency(item.price)}</td>
        <td class="py-3 px-4 text-sm text-right font-bold text-surface-800">${formatCurrency(item.qty * item.price)}</td>
      </tr>`;
  }).join('');

  return `
    <div class="animate-fade-in-up">
      <!-- Back -->
      <button class="flex items-center gap-2 text-sm font-medium text-surface-500 hover:text-brand-600 mb-5 transition-colors" id="backToList">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="15,18 9,12 15,6"/></svg>
        Kembali ke Daftar Quotation
      </button>

      <!-- Header Card -->
      <div class="bg-white rounded-xl border border-surface-200 mb-5">
        <div class="px-6 py-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-surface-100">
          <div>
            <div class="flex items-center gap-3 mb-1">
              <h2 class="text-xl font-bold text-surface-900">${q.id}</h2>
              <span class="inline-flex px-3 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide ${statusClasses(q.status)}">${statusLabel(q.status)}</span>
            </div>
            <p class="text-sm text-surface-500">Dibuat pada ${formatDate(q.date)}</p>
          </div>
          <div class="flex items-center gap-3">
            <label class="flex items-center gap-1.5 text-sm font-medium text-surface-600 cursor-pointer select-none">
              <input type="checkbox" id="printWithImage" checked class="w-4 h-4 text-brand-500 bg-surface-50 border-surface-200 rounded focus:ring-brand-500 focus:ring-2" />
              <span>Tampilkan Gambar</span>
            </label>
            <div class="w-px h-6 bg-surface-200 mx-1"></div>
            <button class="flex items-center gap-2 px-4 py-2 text-sm font-semibold border border-surface-200 rounded-lg text-surface-600 hover:bg-surface-50 transition-colors" id="editQuotationBtn" data-id="${q.id}">
              ${actionEdit()} Edit
            </button>
            <button class="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-brand-500 text-white rounded-lg hover:bg-brand-600 shadow-sm transition-all" id="printQuotationBtn" data-id="${q.id}">
              ${actionDownload()} Download PDF
            </button>
          </div>
        </div>

        <!-- Info Grid -->
        <div class="grid grid-cols-1 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-surface-100">
          <div class="px-6 py-4">
            <div class="text-xs font-semibold text-surface-400 uppercase tracking-wide mb-2">Customer</div>
            <div class="text-sm font-bold text-surface-800">${q.customer}</div>
            <div class="text-sm text-surface-500">PIC: ${q.pic}</div>
            ${(() => { const cust = CUSTOMERS.find(c => c.name === q.customer); return cust ? `<div class="text-xs text-surface-400 mt-1">${cust.phone} · ${cust.email}</div>` : ''; })()}
          </div>
          <div class="px-6 py-4">
            <div class="text-xs font-semibold text-surface-400 uppercase tracking-wide mb-2">Brand</div>
            <div class="flex flex-wrap gap-1.5">
              ${itemBrands.length > 0
                ? itemBrands.map(b => `<span class="inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${brandClasses(b)}">${b}</span>`).join('')
                : '<span class="text-xs text-surface-400">—</span>'
              }
            </div>
          </div>
          <div class="px-6 py-4">
            <div class="text-xs font-semibold text-surface-400 uppercase tracking-wide mb-2">Sales</div>
            <div class="text-sm font-bold text-surface-800">${q.sales}</div>
            <div class="text-sm text-surface-500">PT. Alfa Cipta Teknologi Virtual</div>
          </div>
          <div class="px-6 py-4">
            <div class="text-xs font-semibold text-surface-400 uppercase tracking-wide mb-2">Masa Berlaku</div>
            <div class="text-sm font-bold text-surface-800">${formatDate(q.date)} — ${formatDate(q.expired)}</div>
            <div class="text-sm font-semibold ${expiredColor}">${expiredLabel}</div>
          </div>
        </div>
      </div>

      <!-- Items Table -->
      <div class="bg-white rounded-xl border border-surface-200 mb-5">
        <div class="px-6 py-4 border-b border-surface-100">
          <h3 class="text-sm font-bold text-surface-800">Item Produk</h3>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr class="bg-surface-50 border-b border-surface-200">
                <th class="py-3 px-4 text-left text-xs font-bold text-surface-400 uppercase tracking-wider w-12">No</th>
                <th class="py-3 px-4 text-left text-xs font-bold text-surface-400 uppercase tracking-wider">Produk</th>
                <th class="py-3 px-4 text-left text-xs font-bold text-surface-400 uppercase tracking-wider w-28">Brand</th>
                <th class="py-3 px-4 text-center text-xs font-bold text-surface-400 uppercase tracking-wider">QTY</th>
                <th class="py-3 px-4 text-right text-xs font-bold text-surface-400 uppercase tracking-wider">Harga Satuan</th>
                <th class="py-3 px-4 text-right text-xs font-bold text-surface-400 uppercase tracking-wider">Total</th>
              </tr>
            </thead>
            <tbody>${itemRows}</tbody>
          </table>
        </div>
        <!-- Totals -->
        <div class="border-t border-surface-200 px-6 py-4">
          <div class="flex flex-col items-end gap-1.5">
            <div class="flex items-center gap-8 text-sm">
              <span class="text-surface-500 w-32 text-right">Subtotal</span>
              <span class="font-semibold text-surface-800 w-40 text-right">${formatCurrency(subtotal)}</span>
            </div>
            <div class="flex items-center gap-8 text-sm">
              <span class="text-surface-500 w-32 text-right">PPN (${q.ppnRate * 100}%)</span>
              <span class="font-semibold text-surface-800 w-40 text-right">${formatCurrency(ppn)}</span>
            </div>
            <div class="w-40 h-px bg-surface-200 ml-auto"></div>
            <div class="flex items-center gap-8 text-base">
              <span class="font-bold text-surface-800 w-32 text-right">Grand Total</span>
              <span class="font-extrabold text-brand-700 w-40 text-right">${formatCurrency(grand)}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Terms -->
      <div class="bg-white rounded-xl border border-surface-200">
        <div class="px-6 py-4 border-b border-surface-100">
          <h3 class="text-sm font-bold text-surface-800">Syarat & Ketentuan</h3>
        </div>
        <div class="px-6 py-4">
          <ol class="list-decimal list-inside text-sm text-surface-600 space-y-1.5">
            ${(q.terms && q.terms.length > 0 ? q.terms : getDefaultTerms()).map(t => {
              if (t.toLowerCase().includes("ready stock")) {
                return `<li class="font-semibold text-surface-800">${t}</li>`;
              }
              return `<li>${t}</li>`;
            }).join('')}
          </ol>
          <div class="mt-4 pt-4 border-t border-surface-100">
            <div class="text-xs text-surface-500 font-semibold mb-1">Nomor Rekening</div>
            <div class="text-sm text-surface-700">${bank.bank} : ${bank.number} — ${bank.name}</div>
          </div>
        </div>
      </div>
    </div>`;
}

function renderCardLayout(pageItems) {
  const cards = pageItems.map(q => {
    const subtotal = calcQuotationTotal(q.items);
    const grand = calcGrandTotal(q.items, q.ppnRate);
    const totalItems = q.items.reduce((s, i) => s + i.qty, 0);
    const days = daysUntil(q.expired);
    const expBadge = (q.status === 'sent' || q.status === 'draft') && days >= 0 && days <= 3
      ? `<span class="text-[10px] font-bold text-red-500">${days === 0 ? 'Hari ini!' : days + ' hari lagi'}</span>`
      : '';
    const itemBrands = getBrandsFromItems(q.items);

    return `
      <div class="bg-white rounded-xl border border-surface-200 hover:shadow-md hover:border-surface-300 transition-all duration-200 flex flex-col justify-between overflow-hidden">
        <div class="p-5 flex-1 flex flex-col">
          <div class="flex items-start justify-between mb-3 gap-2">
            <div class="flex flex-wrap gap-1">
              ${itemBrands.length > 0
                ? itemBrands.map(b => `<span class="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${brandClasses(b)}">${b}</span>`).join('')
                : '<span class="text-xs text-surface-400">—</span>'}
            </div>
            <span class="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${statusClasses(q.status)} shrink-0">${statusLabel(q.status)}</span>
          </div>
          <h3 class="text-sm font-bold text-blue-700 hover:underline cursor-pointer quo-view mb-1" data-id="${q.id}">${q.id}</h3>
          <div class="text-xs text-surface-500 mb-2">Tanggal: ${formatDate(q.date)}</div>
          
          <div class="mt-2 pt-2 border-t border-surface-100 flex-1">
            <div class="text-sm font-semibold text-surface-800 truncate">${q.customer}</div>
            <div class="text-xs text-surface-400 mb-2">PIC: ${q.pic}</div>
            <div class="flex justify-between items-center text-xs text-surface-500">
              <span>${totalItems} item produk</span>
              <span>Expired: ${formatDate(q.expired)}</span>
            </div>
            <div class="text-right mt-1">${expBadge}</div>
          </div>
        </div>

        <div class="bg-surface-50 border-t border-surface-150 px-5 py-3 flex items-center justify-between">
          <div>
            <div class="text-[10px] text-surface-400 font-semibold uppercase">Grand Total</div>
            <div class="text-sm font-bold text-surface-800">${formatCurrency(grand)}</div>
          </div>
          <div class="flex items-center gap-1">
            <button class="w-7 h-7 rounded-md flex items-center justify-center text-surface-400 hover:bg-blue-100 hover:text-blue-700 transition-colors quo-view" data-id="${q.id}" title="Detail">${actionView()}</button>
            <button class="w-7 h-7 rounded-md flex items-center justify-center text-surface-400 hover:bg-emerald-100 hover:text-emerald-700 transition-colors quo-print-card" data-id="${q.id}" title="Download PDF">${actionDownload()}</button>
            <button class="w-7 h-7 rounded-md flex items-center justify-center text-surface-400 hover:bg-red-100 hover:text-red-700 transition-colors quo-delete-card" data-id="${q.id}" title="Hapus">${actionDelete()}</button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
      ${cards}
    </div>
  `;
}

function renderListLayout(pageItems) {
  const allPageSelected = pageItems.every(q => selectedQuoIds.has(q.id)) && pageItems.length > 0;
  const isMasterChecked = allPageSelected ? 'checked' : '';

  const rows = pageItems.map(q => {
    const grand = calcGrandTotal(q.items, q.ppnRate);
    const totalItems = q.items.reduce((s, i) => s + i.qty, 0);
    const days = daysUntil(q.expired);
    const expBadge = (q.status === 'sent' || q.status === 'draft') && days >= 0 && days <= 3 ? `<span class="text-[10px] font-bold text-red-500 block">${days === 0 ? 'Hari ini!' : days + ' hari'}</span>` : '';
    const itemBrands = getBrandsFromItems(q.items);
    const isChecked = selectedQuoIds.has(q.id) ? 'checked' : '';

    return `
      <tr class="border-b border-surface-100 hover:bg-surface-50/60 transition-colors">
        <td class="py-3.5 px-4"><input type="checkbox" class="quo-checkbox w-4 h-4 rounded border-surface-300 text-brand-500 focus:ring-brand-500 accent-brand-500 cursor-pointer" data-id="${q.id}" ${isChecked} /></td>
        <td class="py-3.5 px-4 text-sm font-bold text-blue-700 cursor-pointer hover:underline quo-view" data-id="${q.id}">${q.id}</td>
        <td class="py-3.5 px-4"><div class="text-sm font-semibold text-surface-800">${q.customer}</div><div class="text-xs text-surface-400">${q.pic}</div></td>
        <td class="py-3.5 px-4">
          <div class="flex flex-wrap gap-1">
            ${itemBrands.length > 0
              ? itemBrands.map(b => `<span class="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${brandClasses(b)}">${b}</span>`).join('')
              : '<span class="text-xs text-surface-400">—</span>'}
          </div>
        </td>
        <td class="py-3.5 px-4 text-sm text-surface-600 text-center">${totalItems}</td>
        <td class="py-3.5 px-4 text-sm font-bold text-surface-800">${formatCurrency(grand)}</td>
        <td class="py-3.5 px-4 text-sm text-surface-600">${q.sales}</td>
        <td class="py-3.5 px-4 text-sm text-surface-500">${formatDate(q.date)}</td>
        <td class="py-3.5 px-4"><div class="text-sm text-surface-500">${formatDate(q.expired)}</div>${expBadge}</td>
        <td class="py-3.5 px-4"><span class="inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide ${statusClasses(q.status)}">${statusLabel(q.status)}</span></td>
        <td class="py-3.5 px-4">
          <div class="flex items-center gap-1">
            <button class="w-7 h-7 rounded-md flex items-center justify-center text-surface-400 hover:bg-blue-50 hover:text-blue-600 transition-colors quo-view" data-id="${q.id}" title="Detail">${actionView()}</button>
            <button class="w-7 h-7 rounded-md flex items-center justify-center text-surface-400 hover:bg-emerald-50 hover:text-emerald-600 transition-colors quo-print-card" data-id="${q.id}" title="Download PDF">${actionDownload()}</button>
            <button class="w-7 h-7 rounded-md flex items-center justify-center text-surface-400 hover:bg-red-50 hover:text-red-600 transition-colors quo-delete-card" data-id="${q.id}" title="Hapus">${actionDelete()}</button>
          </div>
        </td>
      </tr>`;
  }).join('');

  return `
    <div class="bg-white rounded-xl border border-surface-200">
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="bg-surface-50 border-b border-surface-200">
              <th class="py-3 px-4 w-10"><input type="checkbox" id="selectAllQuo" class="w-4 h-4 rounded border-surface-300 text-brand-500 focus:ring-brand-500 accent-brand-500 cursor-pointer" ${isMasterChecked} /></th>
              <th class="py-3 px-4 text-left text-xs font-bold text-surface-400 uppercase tracking-wider">No. Quotation</th>
              <th class="py-3 px-4 text-left text-xs font-bold text-surface-400 uppercase tracking-wider">Customer</th>
              <th class="py-3 px-4 text-left text-xs font-bold text-surface-400 uppercase tracking-wider">Brand</th>
              <th class="py-3 px-4 text-center text-xs font-bold text-surface-400 uppercase tracking-wider">Items</th>
              <th class="py-3 px-4 text-left text-xs font-bold text-surface-400 uppercase tracking-wider">Grand Total</th>
              <th class="py-3 px-4 text-left text-xs font-bold text-surface-400 uppercase tracking-wider">Sales</th>
              <th class="py-3 px-4 text-left text-xs font-bold text-surface-400 uppercase tracking-wider">Tanggal</th>
              <th class="py-3 px-4 text-left text-xs font-bold text-surface-400 uppercase tracking-wider">Expired</th>
              <th class="py-3 px-4 text-left text-xs font-bold text-surface-400 uppercase tracking-wider">Status</th>
              <th class="py-3 px-4 text-left text-xs font-bold text-surface-400 uppercase tracking-wider">Aksi</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>
  `;
}

function renderList() {
  const filtered = getFiltered();
  const total = filtered.length;
  const totalPages = Math.ceil(total / Q_SIZE);
  if (qPage > totalPages && totalPages > 0) qPage = totalPages;
  const start = (qPage - 1) * Q_SIZE;
  const pageItems = filtered.slice(start, start + Q_SIZE);

  const statusCounts = {};
  QUOTATIONS.forEach(q => { statusCounts[q.status] = (statusCounts[q.status] || 0) + 1; });
  const tabs = [
    { key: 'all', label: 'Semua', count: QUOTATIONS.length },
    { key: 'draft', label: 'Draft', count: statusCounts.draft || 0 },
    { key: 'sent', label: 'Sent', count: statusCounts.sent || 0 },
    { key: 'approved', label: 'Approved', count: statusCounts.approved || 0 },
    { key: 'rejected', label: 'Rejected', count: statusCounts.rejected || 0 },
    { key: 'expired', label: 'Expired', count: statusCounts.expired || 0 },
  ];

  const tabsHtml = tabs.map(t => `
    <button class="quo-tab flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${qFilterStatus === t.key ? 'bg-brand-50 text-brand-700' : 'text-surface-500 hover:text-surface-700 hover:bg-surface-50'}" data-status="${t.key}">
      ${t.label}
      <span class="text-xs font-bold ${qFilterStatus === t.key ? 'text-brand-600' : 'text-surface-400'}">${t.count}</span>
    </button>
  `).join('');

  const displayContent = pageItems.length
    ? (qLayout === 'card' ? renderCardLayout(pageItems) : renderListLayout(pageItems))
    : `<div class="bg-white rounded-xl border border-surface-200">${emptyState('Tidak ada quotation', 'Coba ubah filter atau kata kunci pencarian Anda.')}</div>`;

  return `
    <div class="animate-fade-in-up">
      <!-- Tabs -->
      <div class="flex items-center gap-1 mb-5 overflow-x-auto pb-1">${tabsHtml}</div>

      <!-- Controls -->
      <div class="bg-white rounded-xl border border-surface-200 mb-5">
        <div class="px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <!-- Search -->
          <div class="flex items-center gap-2 bg-surface-50 border border-surface-200 rounded-lg px-3 py-2 flex-1 min-w-[200px] focus-within:border-brand-400 transition-colors">
            <svg class="w-4 h-4 text-surface-400 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" id="quoSearch" placeholder="Cari quotation no, customer, sales..." class="bg-transparent border-none outline-none text-sm text-surface-700 placeholder-surface-400 w-full" value="${qSearch}" />
          </div>

          <!-- Filters -->
          <div class="flex items-center gap-2">
            <select id="quoFilterBrand" class="bg-surface-50 border border-surface-200 text-surface-600 text-sm font-medium px-3 py-2 rounded-lg outline-none focus:border-brand-500 cursor-pointer">
              <option value="all" ${qFilterBrand === 'all' ? 'selected' : ''}>Semua Brand</option>
              ${BRANDS.map(b => `<option value="${b.name.toLowerCase()}" ${qFilterBrand === b.name.toLowerCase() ? 'selected' : ''}>${b.name}</option>`).join('')}
            </select>

            <!-- Layout Toggle -->
            <div class="flex items-center border border-surface-200 rounded-lg bg-surface-50 p-1">
              <button class="p-1.5 rounded-md transition-all toggle-layout-btn ${qLayout === 'list' ? 'bg-white shadow-sm text-brand-600' : 'text-surface-400 hover:text-surface-600'}" data-layout="list" title="Tampilan Tabel">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
              </button>
              <button class="p-1.5 rounded-md transition-all toggle-layout-btn ${qLayout === 'card' ? 'bg-white shadow-sm text-brand-600' : 'text-surface-400 hover:text-surface-600'}" data-layout="card" title="Tampilan Kartu">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Layout Output -->
      ${displayContent}

      <!-- Pagination -->
      ${pageItems.length ? `
        <div class="flex items-center justify-between px-5 py-4 mt-4 bg-white border border-surface-200 rounded-xl">
          <span class="text-xs text-surface-400">Menampilkan ${start + 1}–${Math.min(start + Q_SIZE, total)} dari ${total} quotation</span>
          <div class="flex gap-1" id="quoPagination">${renderPagination(qPage, totalPages)}</div>
        </div>
      ` : ''}
    </div>`;
}

export function renderQuotations() {
  if (editId) {
    const q = QUOTATIONS.find(x => x.id === editId);
    if (q) return renderQuotationEdit(q);
    editId = null;
  }
  if (detailId) {
    const q = QUOTATIONS.find(x => x.id === detailId);
    if (q) return renderQuotationDetail(q);
    detailId = null;
  }
  return renderList();
}

export function bindQuotationEvents(reRender) {
  // ----------------------------------------
  // BIND EVENTS
  // ----------------------------------------

  // Checkboxes
  const checkBoxes = document.querySelectorAll('.quo-checkbox');
  const selectAll = document.getElementById('selectAllQuo');

  checkBoxes.forEach(cb => {
    cb.addEventListener('change', () => {
      const id = cb.dataset.id;
      if (cb.checked) {
        selectedQuoIds.add(id);
      } else {
        selectedQuoIds.delete(id);
      }
      
      const filtered = getFiltered();
      const start = (qPage - 1) * Q_SIZE;
      const pageItems = filtered.slice(start, start + Q_SIZE);
      const allTicked = pageItems.every(q => selectedQuoIds.has(q.id)) && pageItems.length > 0;
      if (selectAll) selectAll.checked = allTicked;
    });
  });

  selectAll?.addEventListener('change', () => {
    const filtered = getFiltered();
    const start = (qPage - 1) * Q_SIZE;
    const pageItems = filtered.slice(start, start + Q_SIZE);

    pageItems.forEach(q => {
      if (selectAll.checked) {
        selectedQuoIds.add(q.id);
      } else {
        selectedQuoIds.delete(q.id);
      }
    });
    
    // We update the DOM of checkboxes instead of full reRender to avoid losing focus if needed,
    // but since it's a list, reRender is fine or we just update the checkboxes directly.
    checkBoxes.forEach(cb => {
      cb.checked = selectAll.checked;
    });
  });

  // Tab Filter
  document.querySelectorAll('.quo-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      qFilterStatus = btn.dataset.status;
      qPage = 1;
      reRender();
    });
  });

  // Search
  document.getElementById('quoSearch')?.addEventListener('input', (e) => {
    qSearch = e.target.value;
    qPage = 1;
    reRender();
  });

  // Brand filter
  document.getElementById('quoFilterBrand')?.addEventListener('change', (e) => {
    qFilterBrand = e.target.value;
    qPage = 1;
    reRender();
  });

  // Pagination
  document.getElementById('quoPagination')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-page]');
    if (!btn) return;
    qPage = parseInt(btn.dataset.page);
    reRender();
  });

  // View detail
  document.querySelectorAll('.quo-view').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      detailId = el.dataset.id;
      editId = null;
      reRender();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });

  // Layout toggler
  document.querySelectorAll('.toggle-layout-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      qLayout = btn.dataset.layout;
      reRender();
    });
  });

  // Back to list
  document.getElementById('backToList')?.addEventListener('click', () => {
    detailId = null;
    editId = null;
    reRender();
  });

  // Print PDF
  document.querySelectorAll('#printQuotationBtn, .quo-print-card').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      const q = QUOTATIONS.find(x => x.id === id);
      // Read checkbox state (defaults to true if the checkbox isn't on screen e.g. in list view)
      const withImageCb = document.getElementById('printWithImage');
      const withImage = withImageCb ? withImageCb.checked : true;
      if (q) printQuotation(q, withImage);
    });
  });

  // Trigger Edit Mode
  document.getElementById('editQuotationBtn')?.addEventListener('click', (e) => {
    const q = QUOTATIONS.find(x => x.id === e.currentTarget.dataset.id);
    if (q) {
      editId = q.id;
      editFormState = {
        customer: q.customer,
        status: q.status,
        expiredDays: daysUntil(q.expired) > 0 ? daysUntil(q.expired) : 7,
        calcTax: q.calcTax !== false,
        showTax: q.showTax !== false,
        bankAccountId: q.bankAccountId || COMPANY.bankAccounts.find(b => b.isDefault)?.id || COMPANY.bankAccounts[0].id,
        items: JSON.parse(JSON.stringify(q.items)), // deep copy
        terms: (q.terms && q.terms.length > 0) ? [...q.terms] : getDefaultTerms()
      };
      reRender();
    }
  });

  // Cancel edit
  document.getElementById('cancelEdit')?.addEventListener('click', () => {
    editId = null;
    reRender();
  });
  document.getElementById('cancelEditBtn')?.addEventListener('click', () => {
    editId = null;
    reRender();
  });

  // Add Item to Edit Form — open to all products
  document.getElementById('addEditItemRow')?.addEventListener('click', () => {
    editFormState.items.push({ sku: '', qty: 1, price: 0, modal: '', margin: '' });
    reRender();
  });

  // Tax options toggle
  document.getElementById('editCalcTaxCb')?.addEventListener('change', (e) => {
    editFormState.calcTax = e.target.checked;
    reRender();
  });
  document.getElementById('editShowTaxCb')?.addEventListener('change', (e) => {
    editFormState.showTax = e.target.checked;
    reRender();
  });
  document.getElementById('editBankAccount')?.addEventListener('change', (e) => {
    editFormState.bankAccountId = e.target.value;
    reRender();
  });

  // Inline new product modal
  document.getElementById('addNewProductInlineBtn')?.addEventListener('click', () => {
    document.getElementById('inlineNewProductModal')?.classList.remove('hidden');
  });
  const hideProdModal = () => document.getElementById('inlineNewProductModal')?.classList.add('hidden');
  document.getElementById('closeInlineProductModal')?.addEventListener('click', hideProdModal);
  document.getElementById('cancelInlineProductModal')?.addEventListener('click', hideProdModal);
  
  document.getElementById('saveInlineProductBtn')?.addEventListener('click', () => {
    const sku = document.getElementById('newProdSku').value.trim() || 'SKU-' + Date.now().toString().slice(-6);
    const name = document.getElementById('newProdName').value.trim();
    const brand = document.getElementById('newProdBrand').value.trim();
    const price = parseFloat(document.getElementById('newProdPrice').value) || 0;
    const desc = document.getElementById('newProdDesc').value.trim();

    const fileInput = document.getElementById('newProdImage');

    if (!name || !brand || price <= 0) {
      showToast('Nama, Brand, dan Harga harus diisi dengan benar!', 'error');
      return;
    }

    const saveProduct = (imageUrl) => {
      PRODUCTS.unshift({ sku, brand, name, price, description: desc, image: imageUrl });
      editFormState.items.push({ sku, qty: 1, price, modal: '', margin: '' });
      showToast('Produk berhasil ditambahkan!', 'success');
      reRender();
    };

    if (fileInput && fileInput.files && fileInput.files[0]) {
      const reader = new FileReader();
      reader.onload = (e) => saveProduct(e.target.result);
      reader.readAsDataURL(fileInput.files[0]);
    } else {
      saveProduct('');
    }
  });

  // Bind change events inside edit rows
  document.querySelectorAll('.edit-item-row').forEach(row => {
    const idx = parseInt(row.dataset.idx);
    const dropdown = row.querySelector('.product-dropdown');
    const input = dropdown?.querySelector('.product-search-input');
    const menu = dropdown?.querySelector('.product-dropdown-menu');
    const options = menu?.querySelectorAll('.product-option');

    // Show menu on focus or click
    input?.addEventListener('focus', () => {
      document.querySelectorAll('.product-dropdown-menu').forEach(m => m.classList.add('hidden'));
      menu?.classList.remove('hidden');
    });

    input?.addEventListener('click', (e) => {
      e.stopPropagation();
      menu?.classList.remove('hidden');
    });

    // Filter on typing
    input?.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase();
      let hasVisible = false;
      options?.forEach(opt => {
        const name = opt.dataset.name.toLowerCase();
        const sku = opt.dataset.sku.toLowerCase();
        const brand = opt.dataset.brand.toLowerCase();
        if (name.includes(q) || sku.includes(q) || brand.includes(q)) {
          opt.classList.remove('hidden');
          hasVisible = true;
        } else {
          opt.classList.add('hidden');
        }
      });
      menu?.classList.remove('hidden');
    });

    // Selection logic
    options?.forEach(opt => {
      opt.addEventListener('click', (e) => {
        e.stopPropagation();
        const sku = opt.dataset.sku;
        const prod = PRODUCTS.find(p => p.sku === sku);
        if (prod) {
          editFormState.items[idx].sku = sku;
          editFormState.items[idx].price = prod.price;
          menu?.classList.add('hidden');
          reRender();
        }
      });
    });

    row.querySelector('.item-qty')?.addEventListener('input', (e) => {
      const qty = parseInt(e.target.value) || 1;
      editFormState.items[idx].qty = qty;
      const price = editFormState.items[idx].price || 0;
      row.querySelector('.item-total-val').textContent = formatCurrency(qty * price);
    });

    const modalInput = row.querySelector('.item-modal');
    const marginInput = row.querySelector('.item-margin');
    const priceInput = row.querySelector('.item-price');
    const totalVal = row.querySelector('.item-total-val');

    const updateCalculations = (trigger) => {
      let modal = parseFloat(modalInput.value);
      let margin = parseFloat(marginInput.value);
      let price = parseFloat(priceInput.value);
      const qty = editFormState.items[idx].qty || 1;

      if (trigger === 'modal' || trigger === 'margin') {
        if (!isNaN(modal) && !isNaN(margin) && margin < 100) {
          // Rumus Margin Sales: Price = Modal / (1 - Margin%)
          price = modal / (1 - margin / 100);
          priceInput.value = Math.round(price);
        } else if (trigger === 'modal' && !isNaN(modal) && !isNaN(price) && price > 0) {
          // Back-calculate margin: Margin = (Price - Modal) / Price
          margin = ((price - modal) / price) * 100;
          marginInput.value = margin.toFixed(2);
        }
      } else if (trigger === 'price') {
        if (!isNaN(modal) && !isNaN(price) && price > 0) {
          // Rumus Margin Sales: Margin = (Price - Modal) / Price
          margin = ((price - modal) / price) * 100;
          marginInput.value = margin.toFixed(2);
        }
      }

      editFormState.items[idx].modal = isNaN(modal) ? '' : modal;
      editFormState.items[idx].margin = isNaN(margin) ? '' : margin;
      editFormState.items[idx].price = isNaN(price) ? 0 : price;
      if (totalVal) totalVal.textContent = formatCurrency(qty * (isNaN(price) ? 0 : price));
    };

    modalInput?.addEventListener('input', () => updateCalculations('modal'));
    marginInput?.addEventListener('input', () => updateCalculations('margin'));
    priceInput?.addEventListener('input', () => updateCalculations('price'));
  });

  // Click outside to close all product dropdowns
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.product-dropdown')) {
      document.querySelectorAll('.product-dropdown-menu').forEach(m => m.classList.add('hidden'));
    }
  });

  // Remove Item
  document.querySelectorAll('.remove-item-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = parseInt(btn.dataset.idx);
      editFormState.items.splice(idx, 1);
      reRender();
    });
  });

  // Save changes
  document.getElementById('saveQuotationBtn')?.addEventListener('click', () => {
    const qIndex = QUOTATIONS.findIndex(x => x.id === editId);
    if (qIndex > -1) {
      const orig = QUOTATIONS[qIndex];
      const customerObj = CUSTOMERS.find(c => c.name === document.getElementById('editCustomer').value);
      
      const date = new Date(orig.date);
      const days = parseInt(document.getElementById('editExpiry').value) || 7;
      date.setDate(date.getDate() + days);
      const expiredStr = date.toISOString().split('T')[0];

      const termsVal = document.getElementById('editTerms')?.value || '';
      const termsArr = termsVal.split('\n').map(t => t.trim()).filter(t => t !== '');

      const validItems = editFormState.items.filter(item => item.sku !== '');

      // Derive brand from items for backward compat
      const derivedBrand = getPrimaryBrand(validItems);

      QUOTATIONS[qIndex] = {
        ...orig,
        customer: document.getElementById('editCustomer').value,
        pic: customerObj ? customerObj.pic : orig.pic,
        brand: derivedBrand,
        status: document.getElementById('editStatus').value,
        expired: expiredStr,
        items: validItems,
        terms: termsArr,
        calcTax: editFormState.calcTax,
        showTax: editFormState.showTax,
        bankAccountId: editFormState.bankAccountId
      };

      showToast('Quotation berhasil diupdate!', 'success');
      editId = null;
      detailId = orig.id;
      reRender();
    }
  });

  // Delete Quotation
  document.querySelectorAll('.quo-delete-card').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      if (confirm(`Apakah Anda yakin ingin menghapus Quotation ${id}?`)) {
        const idx = QUOTATIONS.findIndex(x => x.id === id);
        if (idx > -1) {
          QUOTATIONS.splice(idx, 1);
          showToast('Quotation berhasil dihapus.', 'warning');
          reRender();
        }
      }
    });
  });
}

export function resetQuotationState() {
  detailId = null;
  editId = null;
  qPage = 1;
  qSearch = '';
}

// Called from main.js after creating a new quotation via modal
export function openEditQuotation(id) {
  const q = QUOTATIONS.find(x => x.id === id);
  if (!q) return;
  editId = id;
  detailId = null;
  editFormState = {
    customer: q.customer,
    status: q.status,
    expiredDays: daysUntil(q.expired) > 0 ? daysUntil(q.expired) : 7,
    calcTax: q.calcTax !== false,
    showTax: q.showTax !== false,
    bankAccountId: q.bankAccountId || COMPANY.bankAccounts.find(b => b.isDefault)?.id || COMPANY.bankAccounts[0].id,
    items: [],
    terms: (q.terms && q.terms.length > 0) ? [...q.terms] : getDefaultTerms()
  };
}
