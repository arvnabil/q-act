// ============================================
// Products Page — Catalog with Card & List Layouts
// ============================================
import {
  PRODUCTS, BRANDS, QUOTATIONS, showToast,
  formatCurrency, formatCurrencyShort,
  brandClasses, brandDot, actionView, actionEdit, emptyState
} from '../utils.js';

let prodSearch = '';
let prodBrand = 'all';
let prodLayout = 'list'; // Default to list layout to show the checklist table immediately
let selectedProdSkus = new Set();

function getFilteredProducts() {
  return PRODUCTS.filter(p => {
    if (prodBrand !== 'all' && p.brand.toLowerCase() !== prodBrand) return false;
    if (prodSearch) {
      const s = prodSearch.toLowerCase();
      return p.name.toLowerCase().includes(s) || p.sku.toLowerCase().includes(s) || p.brand.toLowerCase().includes(s);
    }
    return true;
  });
}

function productStats(sku) {
  let totalQty = 0, totalRevenue = 0, quoCount = 0;
  QUOTATIONS.forEach(q => {
    q.items.forEach(item => {
      if (item.sku === sku) {
        totalQty += item.qty;
        totalRevenue += item.qty * item.price;
        quoCount++;
      }
    });
  });
  return { totalQty, totalRevenue, quoCount };
}

function renderCardLayout(grouped) {
  return Object.entries(grouped).map(([brand, products]) => {
    const brandInfo = BRANDS.find(b => b.name === brand);
    const cards = products.map(p => {
      const stats = productStats(p.sku);
      return `
        <div class="bg-white rounded-xl border border-surface-200 hover:shadow-md hover:border-surface-300 transition-all duration-200 overflow-hidden flex flex-col justify-between group">
          <div>
            <div class="h-1.5" style="background:${brandInfo?.color || '#9CA3AF'}"></div>
            <div class="p-5">
              <div class="flex items-start justify-between mb-3">
                <span class="inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${brandClasses(brand)}">${brand}</span>
                <div class="flex items-center gap-1.5">
                  <span class="text-xs font-mono text-surface-400">${p.sku}</span>
                  <button class="edit-prod-btn text-surface-400 hover:text-brand-500 opacity-0 group-hover:opacity-100 p-0.5 rounded transition-all cursor-pointer" data-sku="${p.sku}" title="Edit Produk">
                    ${actionEdit()}
                  </button>
                </div>
              </div>
              <h3 class="text-sm font-bold text-surface-800 mb-2 leading-snug truncate">${p.name}</h3>
              <p class="text-xs text-surface-500 mb-4 line-clamp-2 leading-relaxed h-8">${p.description}</p>
            </div>
          </div>
          <div class="px-5 pb-5">
            <div class="text-lg font-extrabold text-surface-900 mb-4">${formatCurrency(p.price)}</div>
            <div class="grid grid-cols-3 gap-2 pt-3 border-t border-surface-100">
              <div class="text-center">
                <div class="text-sm font-bold text-surface-800">${stats.quoCount}</div>
                <div class="text-[10px] text-surface-400">Quotation</div>
              </div>
              <div class="text-center">
                <div class="text-sm font-bold text-surface-800">${stats.totalQty}</div>
                <div class="text-[10px] text-surface-400">Unit Terjual</div>
              </div>
              <div class="text-center">
                <div class="text-sm font-bold text-surface-800 text-emerald-600">${formatCurrencyShort(stats.totalRevenue)}</div>
                <div class="text-[10px] text-surface-400">Revenue</div>
              </div>
            </div>
          </div>
        </div>`;
    }).join('');

    return `
      <div class="mb-6">
        <div class="flex items-center gap-2 mb-4">
          <span class="w-3 h-3 rounded-full" style="background:${brandInfo?.color || '#9CA3AF'}"></span>
          <h3 class="text-base font-bold text-surface-800">${brand}</h3>
          <span class="text-xs text-surface-400">(${products.length} produk)</span>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">${cards}</div>
      </div>`;
  }).join('');
}

function renderListLayout(filteredProducts) {
  const rows = filteredProducts.map(p => {
    const stats = productStats(p.sku);
    const isChecked = selectedProdSkus.has(p.sku) ? 'checked' : '';
    return `
      <tr class="border-b border-surface-100 hover:bg-surface-50/60 transition-colors">
        <td class="py-3 px-4 text-center checkbox-cell">
          <input type="checkbox" class="prod-checkbox w-4 h-4 rounded text-brand-500 border-surface-200 focus:ring-brand-500 cursor-pointer accent-brand-500" data-sku="${p.sku}" ${isChecked} />
        </td>
        <td class="py-3.5 px-4 text-sm font-mono text-surface-500">${p.sku}</td>
        <td class="py-3.5 px-4"><span class="inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${brandClasses(p.brand)}">${p.brand}</span></td>
        <td class="py-3.5 px-4 text-sm font-bold text-surface-800">${p.name}</td>
        <td class="py-3.5 px-4 text-xs text-surface-500 max-w-xs truncate" title="${p.description}">${p.description}</td>
        <td class="py-3.5 px-4 text-sm font-bold text-surface-800 text-right">${formatCurrency(p.price)}</td>
        <td class="py-3.5 px-4 text-sm text-surface-600 text-center">${stats.quoCount}</td>
        <td class="py-3.5 px-4 text-sm font-semibold text-surface-700 text-center">${stats.totalQty} unit</td>
        <td class="py-3.5 px-4 text-sm font-bold text-emerald-700 text-right">${formatCurrencyShort(stats.totalRevenue)}</td>
        <td class="py-3 px-4 text-center action-cell">
          <button class="edit-prod-btn text-brand-600 hover:text-brand-700 hover:bg-brand-50 p-1.5 rounded-lg transition-colors cursor-pointer" data-sku="${p.sku}" title="Edit Produk">
            ${actionEdit()}
          </button>
        </td>
      </tr>
    `;
  }).join('');

  const allPageSelected = filteredProducts.every(p => selectedProdSkus.has(p.sku)) && filteredProducts.length > 0;
  const isMasterChecked = allPageSelected ? 'checked' : '';

  return `
    <div class="bg-white rounded-xl border border-surface-200">
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="bg-surface-50 border-b border-surface-200">
              <th class="py-3 px-4 text-center w-12 checkbox-cell">
                <input type="checkbox" id="selectAllProd" class="w-4 h-4 rounded text-brand-500 border-surface-200 focus:ring-brand-500 cursor-pointer accent-brand-500" ${isMasterChecked} />
              </th>
              <th class="py-3 px-4 text-left text-xs font-bold text-surface-400 uppercase tracking-wider w-32">SKU</th>
              <th class="py-3 px-4 text-left text-xs font-bold text-surface-400 uppercase tracking-wider w-24">Brand</th>
              <th class="py-3 px-4 text-left text-xs font-bold text-surface-400 uppercase tracking-wider">Nama Produk</th>
              <th class="py-3 px-4 text-left text-xs font-bold text-surface-400 uppercase tracking-wider">Deskripsi</th>
              <th class="py-3 px-4 text-right text-xs font-bold text-surface-400 uppercase tracking-wider w-36">Harga Satuan</th>
              <th class="py-3 px-4 text-center text-xs font-bold text-surface-400 uppercase tracking-wider w-24">QO Count</th>
              <th class="py-3 px-4 text-center text-xs font-bold text-surface-400 uppercase tracking-wider w-28">Terjual</th>
              <th class="py-3 px-4 text-right text-xs font-bold text-surface-400 uppercase tracking-wider w-36">Revenue</th>
              <th class="py-3 px-4 text-center text-xs font-bold text-surface-400 uppercase tracking-wider w-24">Aksi</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>
  `;
}

export function renderProducts() {
  const filtered = getFilteredProducts();

  // Group by brand (needed for card view)
  const grouped = {};
  filtered.forEach(p => {
    if (!grouped[p.brand]) grouped[p.brand] = [];
    grouped[p.brand].push(p);
  });

  // Brand summary cards
  const brandSummary = BRANDS.map(b => {
    const prods = PRODUCTS.filter(p => p.brand.toLowerCase() === b.name.toLowerCase());
    const totalSold = prods.reduce((sum, p) => sum + productStats(p.sku).totalQty, 0);
    const isActive = prodBrand === b.name.toLowerCase();
    return `
      <button class="prod-brand-filter flex flex-col p-4 rounded-xl border text-left transition-all duration-200 ${isActive ? 'border-brand-400 bg-brand-50 shadow-sm' : 'border-surface-200 bg-white hover:border-surface-300 hover:shadow-sm'} cursor-pointer" data-brand="${b.name.toLowerCase()}">
        <div class="flex items-center gap-2 mb-2">
          <span class="w-3 h-3 rounded-full" style="background:${b.color}"></span>
          <span class="text-sm font-bold text-surface-800">${b.name}</span>
        </div>
        <div class="text-xs text-surface-500">${prods.length} produk · ${totalSold} unit terjual</div>
      </button>`;
  }).join('');

  const content = filtered.length
    ? (prodLayout === 'card' ? renderCardLayout(grouped) : renderListLayout(filtered))
    : `<div class="bg-white rounded-xl border border-surface-200">${emptyState('Tidak ada produk', 'Coba ubah filter atau kata kunci pencarian.')}</div>`;

  return `
    <div class="animate-fade-in-up">
      <!-- Search & Controls -->
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
        <div class="flex items-center gap-2 bg-white border border-surface-200 rounded-lg px-3 py-2 min-w-[260px] focus-within:border-brand-400 transition-colors">
          <svg class="w-4 h-4 text-surface-400 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" id="prodSearch" placeholder="Cari produk, SKU, brand..." class="bg-transparent border-none outline-none text-sm text-surface-700 placeholder-surface-400 w-full" value="${prodSearch}" />
        </div>
        <div class="flex items-center gap-2">
          <!-- Layout Toggle -->
          <div class="flex items-center border border-surface-200 rounded-lg bg-white p-1">
            <button class="p-1.5 rounded-md transition-all toggle-prod-layout ${prodLayout === 'list' ? 'bg-brand-50 shadow-sm text-brand-700' : 'text-surface-400 hover:text-surface-600'}" data-layout="list" title="Tampilan Tabel">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
            </button>
            <button class="p-1.5 rounded-md transition-all toggle-prod-layout ${prodLayout === 'card' ? 'bg-brand-50 shadow-sm text-brand-700' : 'text-surface-400 hover:text-surface-600'}" data-layout="card" title="Tampilan Kartu">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
            </button>
          </div>

          <button class="prod-brand-filter px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${prodBrand === 'all' ? 'bg-brand-500 text-white' : 'bg-white border border-surface-200 text-surface-500 hover:bg-surface-50'} cursor-pointer" data-brand="all">Semua</button>
          
          <button class="flex items-center gap-2 px-3 py-2 text-sm font-semibold border border-surface-200 rounded-lg text-surface-600 hover:bg-surface-50 hover:border-surface-300 transition-all cursor-pointer shrink-0" id="manageBrandsBtn" title="Kelola Brand">
            <svg class="w-4 h-4 text-surface-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581a1.5 1.5 0 002.122 0l4.318-4.318a1.5 1.5 0 000-2.122L11.16 3.659A2.25 2.25 0 009.568 3z" />
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 6h.008v.008H6V6z" />
            </svg>
            <span class="hidden sm:inline">Kelola Brand</span>
          </button>

          <button class="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-brand-500 text-white rounded-lg hover:bg-brand-600 shadow-sm transition-all cursor-pointer shrink-0" id="addProdBtn">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            <span>Tambah Produk</span>
          </button>
        </div>
      </div>

      <!-- Brand Summary -->
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6" id="prodBrandSummary">${brandSummary}</div>

      <!-- Content -->
      <div id="prodListContainer">${content}</div>
    </div>

    <!-- Product Edit Modal -->
    <div class="fixed inset-0 bg-black/40 backdrop-blur-sm z-[200] flex items-center justify-center opacity-0 pointer-events-none transition-opacity duration-200" id="editProdModalOverlay">
      <div class="bg-white rounded-2xl border border-surface-200 shadow-2xl w-[480px] max-w-[90vw] max-h-[85vh] overflow-y-auto transform translate-y-4 scale-[0.97] transition-all duration-200" id="editProdModal">
        <div class="flex items-center justify-between px-6 py-4 border-b border-surface-100">
          <h2 class="text-base font-bold text-surface-900" id="prodModalTitle">Edit Produk</h2>
          <button id="editProdModalClose" class="text-surface-400 hover:text-surface-600 hover:bg-surface-100 p-1.5 rounded-lg transition-colors cursor-pointer">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <form id="editProdForm" class="px-6 py-5 flex flex-col gap-4">
          <input type="hidden" id="editProdOldSku" />
          
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-semibold text-surface-600">SKU Produk</label>
            <input type="text" id="editProdSku" class="bg-surface-50 border border-surface-200 rounded-lg px-3 py-2.5 text-sm text-surface-700 outline-none focus:border-brand-500 font-mono" required placeholder="Contoh: JBR-EV265" />
          </div>

          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-semibold text-surface-600">Brand</label>
            <select id="editProdBrand" class="bg-surface-50 border border-surface-200 rounded-lg px-3 py-2.5 text-sm text-surface-700 outline-none focus:border-brand-500 cursor-pointer" required>
              <option value="">Pilih Brand...</option>
              ${BRANDS.map(b => `<option value="${b.name}">${b.name}</option>`).join('')}
            </select>
          </div>

          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-semibold text-surface-600">Nama Produk</label>
            <input type="text" id="editProdName" class="bg-surface-50 border border-surface-200 rounded-lg px-3 py-2.5 text-sm text-surface-700 outline-none focus:border-brand-500" required />
          </div>

          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-semibold text-surface-600">Deskripsi</label>
            <textarea id="editProdDesc" rows="3" class="bg-surface-50 border border-surface-200 rounded-lg px-3 py-2.5 text-sm text-surface-700 outline-none focus:border-brand-500 resize-none" required></textarea>
          </div>

          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-semibold text-surface-600">Harga Satuan (Rp)</label>
            <input type="number" id="editProdPrice" class="bg-surface-50 border border-surface-200 rounded-lg px-3 py-2.5 text-sm text-surface-700 outline-none focus:border-brand-500" required />
          </div>

          <div class="pt-4 border-t border-surface-100 flex justify-end gap-3">
            <button type="button" id="editProdCancelBtn" class="px-4 py-2 text-sm font-semibold text-surface-600 border border-surface-200 rounded-lg hover:bg-surface-50 transition-colors cursor-pointer">Batal</button>
            <button type="submit" class="px-4 py-2 text-sm font-semibold bg-brand-500 text-white rounded-lg hover:bg-brand-600 shadow-sm hover:shadow transition-all cursor-pointer">Simpan</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Floating selection action bar -->
    <div class="fixed bottom-6 left-1/2 -translate-x-1/2 bg-surface-900 text-white rounded-xl shadow-2xl px-5 py-3.5 flex items-center gap-4 transition-all duration-300 transform translate-y-20 opacity-0 z-[100] border border-white/10" id="prodSelectionBar">
      <span class="text-xs font-semibold flex items-center gap-2">
        <span id="prodSelCount" class="bg-brand-500 text-white px-2 py-0.5 rounded-full font-bold">0</span> 
        Produk terpilih
      </span>
      <div class="h-4 w-[1px] bg-white/20"></div>
      <button class="bg-red-500 hover:bg-red-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer shadow-sm" id="deleteSelectedProdBtn">Hapus Terpilih</button>
      <button class="text-white/60 hover:text-white text-xs font-medium transition-colors cursor-pointer" id="clearSelectedProdBtn">Batal</button>
    </div>
  `;
}

export function bindProductEvents(reRender) {
  // Search
  document.getElementById('prodSearch')?.addEventListener('input', e => { prodSearch = e.target.value; reRender(); });
  
  // Brand filters
  document.querySelectorAll('.prod-brand-filter').forEach(btn => {
    btn.addEventListener('click', () => { prodBrand = btn.dataset.brand; reRender(); });
  });

  // Toggle Layout
  document.querySelectorAll('.toggle-prod-layout').forEach(btn => {
    btn.addEventListener('click', () => {
      prodLayout = btn.dataset.layout;
      reRender();
    });
  });

  // Manage Brands Button - redirects to Brands submenu page
  document.getElementById('manageBrandsBtn')?.addEventListener('click', () => {
    document.querySelector('.nav-sub-link[data-nav="products-brands"]')?.click();
  });

  // Modal helpers
  const overlay = document.getElementById('editProdModalOverlay');
  const modal = document.getElementById('editProdModal');
  
  const openModal = () => {
    overlay?.classList.remove('opacity-0', 'pointer-events-none');
    overlay?.classList.add('opacity-100');
    modal?.classList.remove('translate-y-4', 'scale-[0.97]');
    modal?.classList.add('translate-y-0', 'scale-100');
  };
  const closeModal = () => {
    overlay?.classList.add('opacity-0', 'pointer-events-none');
    overlay?.classList.remove('opacity-100');
    modal?.classList.add('translate-y-4', 'scale-[0.97]');
    modal?.classList.remove('translate-y-0', 'scale-100');
  };

  // Close bindings
  document.getElementById('editProdModalClose')?.addEventListener('click', closeModal);
  document.getElementById('editProdCancelBtn')?.addEventListener('click', closeModal);
  overlay?.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });

  // Add Product Button
  document.getElementById('addProdBtn')?.addEventListener('click', () => {
    document.getElementById('prodModalTitle').textContent = 'Tambah Produk Baru';
    document.getElementById('editProdOldSku').value = '';
    document.getElementById('editProdSku').value = '';
    document.getElementById('editProdSku').removeAttribute('readonly');
    document.getElementById('editProdSku').className = 'bg-surface-50 border border-surface-200 rounded-lg px-3 py-2.5 text-sm text-surface-700 outline-none focus:border-brand-500 font-mono';
    document.getElementById('editProdBrand').innerHTML = `
      <option value="">Pilih Brand...</option>
      ${BRANDS.map(b => `<option value="${b.name}">${b.name}</option>`).join('')}
    `;
    document.getElementById('editProdBrand').value = '';
    document.getElementById('editProdName').value = '';
    document.getElementById('editProdDesc').value = '';
    document.getElementById('editProdPrice').value = '';
    openModal();
  });

  // Edit Product Button
  document.querySelectorAll('.edit-prod-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const sku = btn.dataset.sku;
      const p = PRODUCTS.find(x => x.sku === sku);
      if (p) {
        document.getElementById('prodModalTitle').textContent = 'Edit Detail Produk';
        document.getElementById('editProdOldSku').value = p.sku;
        document.getElementById('editProdSku').value = p.sku;
        document.getElementById('editProdSku').setAttribute('readonly', 'true');
        document.getElementById('editProdSku').className = 'bg-surface-100 border border-surface-200 rounded-lg px-3 py-2.5 text-sm text-surface-500 outline-none font-mono cursor-not-allowed';
        document.getElementById('editProdBrand').innerHTML = `
          <option value="">Pilih Brand...</option>
          ${BRANDS.map(b => `<option value="${b.name}">${b.name}</option>`).join('')}
        `;
        document.getElementById('editProdBrand').value = p.brand;
        document.getElementById('editProdName').value = p.name;
        document.getElementById('editProdDesc').value = p.description;
        document.getElementById('editProdPrice').value = p.price;
        openModal();
      }
    });
  });

  // Submit Handler Product
  document.getElementById('editProdForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const oldSku = document.getElementById('editProdOldSku').value;
    const sku = document.getElementById('editProdSku').value.trim();
    const brand = document.getElementById('editProdBrand').value;
    const name = document.getElementById('editProdName').value.trim();
    const description = document.getElementById('editProdDesc').value.trim();
    const price = parseFloat(document.getElementById('editProdPrice').value) || 0;

    if (oldSku) {
      // --- EDIT MODE ---
      const p = PRODUCTS.find(x => x.sku === oldSku);
      if (p) {
        p.brand = brand;
        p.name = name;
        p.description = description;
        p.price = price;
        showToast('Produk berhasil diperbarui!', 'success');
      }
    } else {
      // --- ADD MODE ---
      const exists = PRODUCTS.some(x => x.sku.toLowerCase() === sku.toLowerCase());
      if (exists) {
        showToast('SKU Produk sudah terdaftar!', 'warning');
        return;
      }

      PRODUCTS.push({
        sku,
        brand,
        name,
        description,
        price
      });
      showToast('Produk baru berhasil ditambahkan!', 'success');
    }

    closeModal();
    reRender();
  });

  // --- CHECKBOX SELECTION LOGICS ---
  const checkBoxes = document.querySelectorAll('.prod-checkbox');
  const selectAll = document.getElementById('selectAllProd');
  const selectionBar = document.getElementById('prodSelectionBar');
  const selCount = document.getElementById('prodSelCount');

  const updateSelectionBar = () => {
    if (selectedProdSkus.size > 0) {
      if (selCount) selCount.textContent = selectedProdSkus.size;
      selectionBar?.classList.remove('translate-y-20', 'opacity-0');
      selectionBar?.classList.add('translate-y-0', 'opacity-100');
    } else {
      selectionBar?.classList.add('translate-y-20', 'opacity-0');
      selectionBar?.classList.remove('translate-y-0', 'opacity-100');
    }
  };

  updateSelectionBar();

  // Individual checkbox change
  checkBoxes.forEach(cb => {
    cb.addEventListener('change', () => {
      const sku = cb.dataset.sku;
      if (cb.checked) {
        selectedProdSkus.add(sku);
      } else {
        selectedProdSkus.delete(sku);
      }

      const filtered = getFilteredProducts();
      const allChecked = filtered.every(p => selectedProdSkus.has(p.sku)) && filtered.length > 0;
      if (selectAll) selectAll.checked = allChecked;

      updateSelectionBar();
    });
  });

  // Master checkbox change
  selectAll?.addEventListener('change', () => {
    const filtered = getFilteredProducts();
    filtered.forEach(p => {
      if (selectAll.checked) {
        selectedProdSkus.add(p.sku);
      } else {
        selectedProdSkus.delete(p.sku);
      }
    });
    reRender();
  });

  // Clear action bar selection
  document.getElementById('clearSelectedProdBtn')?.addEventListener('click', () => {
    selectedProdSkus.clear();
    reRender();
  });

  // Delete selected products button
  document.getElementById('deleteSelectedProdBtn')?.addEventListener('click', () => {
    if (confirm(`Apakah Anda yakin ingin menghapus ${selectedProdSkus.size} produk terpilih?`)) {
      selectedProdSkus.forEach(sku => {
        const idx = PRODUCTS.findIndex(p => p.sku === sku);
        if (idx !== -1) {
          PRODUCTS.splice(idx, 1);
        }
      });
      selectedProdSkus.clear();
      showToast('Produk terpilih berhasil dihapus.', 'success');
      reRender();
    }
  });
}

export function resetProductState() { 
  prodSearch = ''; 
  prodBrand = 'all'; 
  selectedProdSkus.clear();
}

// Make line-clamp work with Tailwind v4
const style = document.createElement('style');
style.textContent = `.line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }`;
document.head.appendChild(style);
