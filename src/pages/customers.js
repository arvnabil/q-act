// ============================================
// Customers Page — Table & Card Layouts
// ============================================
import {
  QUOTATIONS, CUSTOMERS, showToast,
  formatCurrency, formatCurrencyShort, formatDate, calcGrandTotal,
  statusLabel, statusClasses, brandClasses,
  actionView, actionEdit, renderPagination, emptyState
} from '../utils.js';

let custPage = 1;
const C_SIZE = 8;
let custSearch = '';
let custDetailId = null;
let custLayout = 'list'; // Default to list layout to immediately showcase the new checklist table
let selectedCustIds = new Set();

function getFilteredCustomers() {
  if (!custSearch) return CUSTOMERS;
  const s = custSearch.toLowerCase();
  return CUSTOMERS.filter(c => c.name.toLowerCase().includes(s) || c.pic.toLowerCase().includes(s) || c.email.toLowerCase().includes(s));
}

function customerQuotations(name) {
  return QUOTATIONS.filter(q => q.customer === name);
}

function renderCustomerDetail(cust) {
  const quos = customerQuotations(cust.name);
  const approvedQ = quos.filter(q => q.status === 'approved');
  const totalSpend = approvedQ.reduce((sum, q) => sum + calcGrandTotal(q.items, q.ppnRate), 0);
  const avgDeal = approvedQ.length > 0 ? totalSpend / approvedQ.length : 0;

  const quoRows = quos.map(q => {
    const grand = calcGrandTotal(q.items, q.ppnRate);
    return `
      <tr class="border-b border-surface-100 hover:bg-surface-50/60 transition-colors">
        <td class="py-3 px-4 text-sm font-bold text-blue-700">${q.id}</td>
        <td class="py-3 px-4"><span class="inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${brandClasses(q.brand)}">${q.brand}</span></td>
        <td class="py-3 px-4 text-sm font-bold text-surface-800">${formatCurrency(grand)}</td>
        <td class="py-3 px-4 text-sm text-surface-600">${q.sales}</td>
        <td class="py-3 px-4 text-sm text-surface-500">${formatDate(q.date)}</td>
        <td class="py-3 px-4"><span class="inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide ${statusClasses(q.status)}">${statusLabel(q.status)}</span></td>
      </tr>`;
  }).join('');

  // Brand breakdown
  const brandCounts = {};
  quos.forEach(q => { brandCounts[q.brand] = (brandCounts[q.brand] || 0) + 1; });
  const brandBreakdown = Object.entries(brandCounts).map(([brand, count]) => `
    <div class="flex items-center justify-between py-2">
      <span class="inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${brandClasses(brand)}">${brand}</span>
      <span class="text-sm font-bold text-surface-700">${count} quotation</span>
    </div>
  `).join('');

  return `
    <div class="animate-fade-in-up">
      <button class="flex items-center gap-2 text-sm font-medium text-surface-500 hover:text-brand-600 mb-5 transition-colors cursor-pointer" id="backToCustList">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="15,18 9,12 15,6"/></svg>
        Kembali ke Daftar Customer
      </button>

      <!-- Customer Header -->
      <div class="bg-white rounded-xl border border-surface-200 mb-5">
        <div class="px-6 py-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-surface-100">
          <div class="flex items-center gap-4">
            <div class="w-14 h-14 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center text-lg font-extrabold shrink-0">${cust.name.split(' ').slice(-1)[0]?.charAt(0) || 'C'}</div>
            <div>
              <h2 class="text-xl font-bold text-surface-900">${cust.name}</h2>
              <p class="text-sm text-surface-500">PIC: ${cust.pic} · ${cust.phone}</p>
            </div>
          </div>
          <button class="flex items-center gap-2 px-4 py-2 text-sm font-semibold border border-surface-200 rounded-lg text-surface-600 hover:bg-surface-50 transition-colors cursor-pointer" id="editCustDetailBtn" data-id="${cust.id}">
            ${actionEdit()} Edit Customer
          </button>
        </div>

        <!-- Stats -->
        <div class="grid grid-cols-2 md:grid-cols-4 divide-x divide-surface-100">
          <div class="px-6 py-4 text-center">
            <div class="text-2xl font-bold text-surface-900">${quos.length}</div>
            <div class="text-xs text-surface-500 mt-1">Total Quotation</div>
          </div>
          <div class="px-6 py-4 text-center">
            <div class="text-2xl font-bold text-emerald-600">${approvedQ.length}</div>
            <div class="text-xs text-surface-500 mt-1">Approved</div>
          </div>
          <div class="px-6 py-4 text-center">
            <div class="text-2xl font-bold text-surface-900">${formatCurrencyShort(totalSpend)}</div>
            <div class="text-xs text-surface-500 mt-1">Total Spend</div>
          </div>
          <div class="px-6 py-4 text-center">
            <div class="text-2xl font-bold text-surface-900">${formatCurrencyShort(avgDeal)}</div>
            <div class="text-xs text-surface-500 mt-1">Avg. Deal</div>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <!-- Quotation History -->
        <div class="lg:col-span-2 bg-white rounded-xl border border-surface-200">
          <div class="px-6 py-4 border-b border-surface-100">
            <h3 class="text-sm font-bold text-surface-800">Riwayat Quotation</h3>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full">
              <thead>
                <tr class="bg-surface-50 border-b border-surface-200">
                  <th class="py-3 px-4 text-left text-xs font-bold text-surface-400 uppercase tracking-wider">No. Quotation</th>
                  <th class="py-3 px-4 text-left text-xs font-bold text-surface-400 uppercase tracking-wider">Brand</th>
                  <th class="py-3 px-4 text-left text-xs font-bold text-surface-400 uppercase tracking-wider">Grand Total</th>
                  <th class="py-3 px-4 text-left text-xs font-bold text-surface-400 uppercase tracking-wider">Sales</th>
                  <th class="py-3 px-4 text-left text-xs font-bold text-surface-400 uppercase tracking-wider">Tanggal</th>
                  <th class="py-3 px-4 text-left text-xs font-bold text-surface-400 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody>${quoRows || `<tr><td colspan="6">${emptyState('Belum ada quotation', '')}</td></tr>`}</tbody>
            </table>
          </div>
        </div>

        <!-- Sidebar Info -->
        <div class="flex flex-col gap-5">
          <div class="bg-white rounded-xl border border-surface-200">
            <div class="px-5 py-4 border-b border-surface-100">
              <h3 class="text-sm font-bold text-surface-800">Info Kontak</h3>
            </div>
            <div class="px-5 py-4 space-y-3">
              <div><div class="text-xs text-surface-400 mb-0.5">Email</div><div class="text-sm text-surface-700">${cust.email}</div></div>
              <div><div class="text-xs text-surface-400 mb-0.5">Telepon</div><div class="text-sm text-surface-700">${cust.phone}</div></div>
              <div><div class="text-xs text-surface-400 mb-0.5">Customer ID</div><div class="text-sm text-surface-700 font-mono">${cust.id}</div></div>
            </div>
          </div>
          <div class="bg-white rounded-xl border border-surface-200">
            <div class="px-5 py-4 border-b border-surface-100">
              <h3 class="text-sm font-bold text-surface-800">Brand yang Dibeli</h3>
            </div>
            <div class="px-5 py-3">${brandBreakdown || '<div class="text-sm text-surface-400 py-2">Belum ada</div>'}</div>
          </div>
        </div>
      </div>
    </div>`;
}

function renderCardLayout(pageItems) {
  const cards = pageItems.map(c => {
    const quos = customerQuotations(c.name);
    const approved = quos.filter(q => q.status === 'approved').length;
    return `
      <div class="bg-white rounded-xl border border-surface-200 hover:shadow-md hover:border-surface-300 transition-all duration-200 cursor-pointer cust-card relative group" data-id="${c.id}">
        <div class="px-5 py-5">
          <div class="flex items-start justify-between mb-4">
            <div class="w-11 h-11 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center text-sm font-extrabold">${c.name.split(' ').slice(-1)[0]?.charAt(0) || 'C'}</div>
            <div class="flex items-center gap-2">
              <span class="text-xs font-mono text-surface-400">${c.id}</span>
              <button class="edit-cust-btn text-surface-400 hover:text-brand-500 opacity-0 group-hover:opacity-100 p-1 rounded transition-all cursor-pointer" data-id="${c.id}" title="Edit Customer">
                ${actionEdit()}
              </button>
            </div>
          </div>
          <h3 class="text-sm font-bold text-surface-800 mb-1 truncate">${c.name}</h3>
          <p class="text-xs text-surface-500 mb-3">PIC: ${c.pic}</p>
          <div class="flex items-center justify-between pt-3 border-t border-surface-100">
            <div>
              <div class="text-lg font-bold text-surface-900">${formatCurrencyShort(c.totalSpend)}</div>
              <div class="text-[10px] text-surface-400">Total Spend</div>
            </div>
            <div class="text-right">
              <div class="text-sm font-bold text-surface-700">${quos.length} <span class="text-surface-400 font-normal text-xs">QO</span></div>
              <div class="text-[10px] text-emerald-600 font-semibold">${approved} approved</div>
            </div>
          </div>
        </div>
      </div>`;
  }).join('');

  return `
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 mb-5">
      ${cards}
    </div>
  `;
}

function renderListLayout(pageItems) {
  const rows = pageItems.map(c => {
    const quos = customerQuotations(c.name);
    const isChecked = selectedCustIds.has(c.id) ? 'checked' : '';
    return `
      <tr class="border-b border-surface-100 hover:bg-surface-50/60 transition-colors cust-row-tr" data-id="${c.id}">
        <td class="py-3 px-4 text-center checkbox-cell">
          <input type="checkbox" class="cust-checkbox w-4 h-4 rounded text-brand-500 border-surface-200 focus:ring-brand-500 cursor-pointer" data-id="${c.id}" ${isChecked} />
        </td>
        <td class="py-3.5 px-4 text-sm font-mono text-surface-500 click-target cursor-pointer">${c.id}</td>
        <td class="py-3.5 px-4 text-sm font-bold text-surface-800 click-target cursor-pointer">${c.name}</td>
        <td class="py-3.5 px-4 text-sm text-surface-600 click-target cursor-pointer">${c.pic}</td>
        <td class="py-3.5 px-4 text-sm text-surface-500 click-target cursor-pointer">${c.email}</td>
        <td class="py-3.5 px-4 text-sm text-surface-500 click-target cursor-pointer">${c.phone}</td>
        <td class="py-3.5 px-4 text-sm font-semibold text-surface-700 text-center click-target cursor-pointer">${quos.length} Penawaran</td>
        <td class="py-3.5 px-4 text-sm font-bold text-brand-700 text-right click-target cursor-pointer">${formatCurrency(c.totalSpend)}</td>
        <td class="py-3.5 px-4 text-center action-cell">
          <button class="edit-cust-btn text-brand-600 hover:text-brand-700 hover:bg-brand-50 p-1.5 rounded-lg transition-colors cursor-pointer" data-id="${c.id}" title="Edit Customer">
            ${actionEdit()}
          </button>
        </td>
      </tr>
    `;
  }).join('');

  // Check if all page items are selected
  const allPageSelected = pageItems.every(c => selectedCustIds.has(c.id)) && pageItems.length > 0;
  const isMasterChecked = allPageSelected ? 'checked' : '';

  return `
    <div class="bg-white rounded-xl border border-surface-200 mb-5">
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="bg-surface-50 border-b border-surface-200">
              <th class="py-3 px-4 text-center w-12 checkbox-cell">
                <input type="checkbox" id="selectAllCust" class="w-4 h-4 rounded text-brand-500 border-surface-200 focus:ring-brand-500 cursor-pointer" ${isMasterChecked} />
              </th>
              <th class="py-3 px-4 text-left text-xs font-bold text-surface-400 uppercase tracking-wider w-28">Customer ID</th>
              <th class="py-3 px-4 text-left text-xs font-bold text-surface-400 uppercase tracking-wider">Nama Perusahaan</th>
              <th class="py-3 px-4 text-left text-xs font-bold text-surface-400 uppercase tracking-wider">PIC</th>
              <th class="py-3 px-4 text-left text-xs font-bold text-surface-400 uppercase tracking-wider">Email</th>
              <th class="py-3 px-4 text-left text-xs font-bold text-surface-400 uppercase tracking-wider">Telepon</th>
              <th class="py-3 px-4 text-center text-xs font-bold text-surface-400 uppercase tracking-wider w-36">Total Quotations</th>
              <th class="py-3 px-4 text-right text-xs font-bold text-surface-400 uppercase tracking-wider w-40">Total Spend</th>
              <th class="py-3 px-4 text-center text-xs font-bold text-surface-400 uppercase tracking-wider w-24">Aksi</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>
  `;
}

function renderList() {
  const filtered = getFilteredCustomers();
  const total = filtered.length;
  const totalPages = Math.ceil(total / C_SIZE);
  if (custPage > totalPages && totalPages > 0) custPage = totalPages;
  const start = (custPage - 1) * C_SIZE;
  const pageItems = filtered.slice(start, start + C_SIZE);

  const listContent = pageItems.length
    ? (custLayout === 'card' ? renderCardLayout(pageItems) : renderListLayout(pageItems))
    : emptyState('Tidak ada customer', 'Coba ubah kata kunci pencarian.');

  return `
    <div class="animate-fade-in-up">
      <!-- Controls -->
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
        <!-- Search -->
        <div class="flex items-center gap-2 bg-white border border-surface-200 rounded-lg px-3 py-2 min-w-[260px] focus-within:border-brand-400 transition-colors">
          <svg class="w-4 h-4 text-surface-400 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" id="custSearch" placeholder="Cari customer, PIC, email..." class="bg-transparent border-none outline-none text-sm text-surface-700 placeholder-surface-400 w-full" value="${custSearch}" />
        </div>
        
        <!-- Actions & Toggles -->
        <div class="flex items-center gap-2">
          <!-- Layout Toggle -->
          <div class="flex items-center border border-surface-200 rounded-lg bg-white p-1">
            <button class="p-1.5 rounded-md transition-all toggle-cust-layout ${custLayout === 'list' ? 'bg-brand-50 shadow-sm text-brand-700' : 'text-surface-400 hover:text-surface-600'}" data-layout="list" title="Tampilan Tabel">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
            </button>
            <button class="p-1.5 rounded-md transition-all toggle-cust-layout ${custLayout === 'card' ? 'bg-brand-50 shadow-sm text-brand-700' : 'text-surface-400 hover:text-surface-600'}" data-layout="card" title="Tampilan Kartu">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
            </button>
          </div>

          <button class="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-brand-500 text-white rounded-lg hover:bg-brand-600 shadow-sm transition-all" id="addCustBtn">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Tambah Customer
          </button>
        </div>
      </div>

      <!-- Content -->
      ${listContent}

      <!-- Pagination -->
      ${totalPages > 1 ? `<div class="flex justify-center gap-1" id="custPagination">${renderPagination(custPage, totalPages)}</div>` : ''}
    </div>

    <!-- Customer Edit Modal -->
    <div class="fixed inset-0 bg-black/40 backdrop-blur-sm z-[200] flex items-center justify-center opacity-0 pointer-events-none transition-opacity duration-200" id="editCustModalOverlay">
      <div class="bg-white rounded-2xl border border-surface-200 shadow-2xl w-[480px] max-w-[90vw] max-h-[85vh] overflow-y-auto transform translate-y-4 scale-[0.97] transition-all duration-200" id="editCustModal">
        <div class="flex items-center justify-between px-6 py-4 border-b border-surface-100">
          <h2 class="text-base font-bold text-surface-900" id="custModalTitle">Edit Data Customer</h2>
          <button id="editCustModalClose" class="text-surface-400 hover:text-surface-600 hover:bg-surface-100 p-1.5 rounded-lg transition-colors cursor-pointer">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <form id="editCustForm" class="px-6 py-5 flex flex-col gap-4">
          <input type="hidden" id="editCustId" />
          
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-semibold text-surface-600">Customer ID</label>
            <input type="text" id="editCustIdDisplay" class="bg-surface-100 border border-surface-200 rounded-lg px-3 py-2.5 text-sm text-surface-500 outline-none font-mono" readonly placeholder="Auto-generated" />
          </div>

          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-semibold text-surface-600">Nama Perusahaan</label>
            <input type="text" id="editCustName" class="bg-surface-50 border border-surface-200 rounded-lg px-3 py-2.5 text-sm text-surface-700 outline-none focus:border-brand-500" required />
          </div>

          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-semibold text-surface-600">Nama PIC</label>
            <input type="text" id="editCustPic" class="bg-surface-50 border border-surface-200 rounded-lg px-3 py-2.5 text-sm text-surface-700 outline-none focus:border-brand-500" required />
          </div>

          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-semibold text-surface-600">Email</label>
            <input type="email" id="editCustEmail" class="bg-surface-50 border border-surface-200 rounded-lg px-3 py-2.5 text-sm text-surface-700 outline-none focus:border-brand-500" required />
          </div>

          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-semibold text-surface-600">Telepon</label>
            <input type="text" id="editCustPhone" class="bg-surface-50 border border-surface-200 rounded-lg px-3 py-2.5 text-sm text-surface-700 outline-none focus:border-brand-500" required />
          </div>

          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-semibold text-surface-600">Total Spend (Rp)</label>
            <input type="number" id="editCustTotalSpend" class="bg-surface-50 border border-surface-200 rounded-lg px-3 py-2.5 text-sm text-surface-700 outline-none focus:border-brand-500" required value="0" />
          </div>

          <div class="pt-4 border-t border-surface-100 flex justify-end gap-3">
            <button type="button" id="editCustCancelBtn" class="px-4 py-2 text-sm font-semibold text-surface-600 border border-surface-200 rounded-lg hover:bg-surface-50 transition-colors cursor-pointer">Batal</button>
            <button type="submit" class="px-4 py-2 text-sm font-semibold bg-brand-500 text-white rounded-lg hover:bg-brand-600 shadow-sm hover:shadow transition-all cursor-pointer">Simpan</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Floating selection action bar -->
    <div class="fixed bottom-6 left-1/2 -translate-x-1/2 bg-surface-900 text-white rounded-xl shadow-2xl px-5 py-3.5 flex items-center gap-4 transition-all duration-300 transform translate-y-20 opacity-0 z-[100] border border-white/10" id="custSelectionBar">
      <span class="text-xs font-semibold flex items-center gap-2">
        <span id="custSelCount" class="bg-brand-500 text-white px-2 py-0.5 rounded-full font-bold">0</span> 
        Customer terpilih
      </span>
      <div class="h-4 w-[1px] bg-white/20"></div>
      <button class="bg-red-500 hover:bg-red-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer shadow-sm" id="deleteSelectedCustBtn">Hapus Terpilih</button>
      <button class="text-white/60 hover:text-white text-xs font-medium transition-colors cursor-pointer" id="clearSelectedCustBtn">Batal</button>
    </div>
  `;
}

export function renderCustomers() {
  if (custDetailId) {
    const c = CUSTOMERS.find(x => x.id === custDetailId);
    if (c) return renderCustomerDetail(c);
    custDetailId = null;
  }
  return renderList();
}

export function bindCustomerEvents(reRender) {
  // Input search
  document.getElementById('custSearch')?.addEventListener('input', e => { custSearch = e.target.value; custPage = 1; reRender(); });
  
  // Pagination
  document.getElementById('custPagination')?.addEventListener('click', e => { const btn = e.target.closest('[data-page]'); if (btn) { custPage = parseInt(btn.dataset.page); reRender(); } });
  
  // Row Click for Details (with exception of Action and Checkbox clicks)
  document.querySelectorAll('.cust-row-tr').forEach(row => {
    row.addEventListener('click', (e) => {
      if (e.target.closest('.checkbox-cell') || e.target.closest('.action-cell') || e.target.closest('input[type="checkbox"]') || e.target.closest('button')) {
        return; // Skip navigation if clicking checkbox or edit button
      }
      custDetailId = row.dataset.id;
      reRender(); 
      window.scrollTo({ top: 0, behavior: 'smooth' }); 
    });
  });

  // Card layout click for details
  document.querySelectorAll('.cust-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.edit-cust-btn') || e.target.closest('button')) {
        return; // Skip if clicking edit inside card
      }
      custDetailId = card.dataset.id;
      reRender();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });

  // Back button details
  document.getElementById('backToCustList')?.addEventListener('click', () => { custDetailId = null; reRender(); });

  // Toggle layout card/list
  document.querySelectorAll('.toggle-cust-layout').forEach(btn => {
    btn.addEventListener('click', () => {
      custLayout = btn.dataset.layout;
      reRender();
    });
  });

  // Modal display helpers
  const overlay = document.getElementById('editCustModalOverlay');
  const modal = document.getElementById('editCustModal');
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

  // Bind edit buttons (both in row action cell and inside details view and card view)
  document.querySelectorAll('.edit-cust-btn, #editCustDetailBtn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      const c = CUSTOMERS.find(x => x.id === id);
      if (c) {
        document.getElementById('custModalTitle').textContent = 'Edit Data Customer';
        document.getElementById('editCustId').value = c.id;
        document.getElementById('editCustIdDisplay').value = c.id;
        document.getElementById('editCustName').value = c.name;
        document.getElementById('editCustPic').value = c.pic;
        document.getElementById('editCustEmail').value = c.email;
        document.getElementById('editCustPhone').value = c.phone;
        document.getElementById('editCustTotalSpend').value = c.totalSpend;
        openModal();
      }
    });
  });

  // Bind Add Customer button
  document.getElementById('addCustBtn')?.addEventListener('click', () => {
    document.getElementById('custModalTitle').textContent = 'Tambah Customer Baru';
    document.getElementById('editCustId').value = '';
    document.getElementById('editCustIdDisplay').value = '';
    document.getElementById('editCustName').value = '';
    document.getElementById('editCustPic').value = '';
    document.getElementById('editCustEmail').value = '';
    document.getElementById('editCustPhone').value = '';
    document.getElementById('editCustTotalSpend').value = '0';
    openModal();
  });

  // Close modals
  document.getElementById('editCustModalClose')?.addEventListener('click', closeModal);
  document.getElementById('editCustCancelBtn')?.addEventListener('click', closeModal);
  overlay?.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });

  // Form Submit (Handles both ADD and EDIT)
  document.getElementById('editCustForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('editCustId').value;
    const name = document.getElementById('editCustName').value.trim();
    const pic = document.getElementById('editCustPic').value.trim();
    const email = document.getElementById('editCustEmail').value.trim();
    const phone = document.getElementById('editCustPhone').value.trim();
    const totalSpend = parseFloat(document.getElementById('editCustTotalSpend').value) || 0;

    if (id) {
      // --- EDIT MODE ---
      const c = CUSTOMERS.find(x => x.id === id);
      if (c) {
        const oldName = c.name;
        c.name = name;
        c.pic = pic;
        c.email = email;
        c.phone = phone;
        c.totalSpend = totalSpend;

        // Propagate company name change to existing quotations in-memory
        if (oldName !== name) {
          QUOTATIONS.forEach(q => {
            if (q.customer === oldName) q.customer = name;
          });
        }
        showToast('Data customer berhasil diperbarui!', 'success');
      }
    } else {
      // --- ADD MODE ---
      // Generate new ID (e.g. C009)
      const nextNum = CUSTOMERS.length > 0 
        ? Math.max(...CUSTOMERS.map(c => parseInt(c.id.substring(1)) || 0)) + 1 
        : 1;
      const newId = `C${String(nextNum).padStart(3, '0')}`;
      
      CUSTOMERS.push({
        id: newId,
        name,
        pic,
        email,
        phone,
        totalSpend
      });
      showToast('Customer baru berhasil ditambahkan!', 'success');
    }
    
    closeModal();
    reRender();
  });

  // Checkboxes logics
  const checkBoxes = document.querySelectorAll('.cust-checkbox');
  const selectAll = document.getElementById('selectAllCust');
  const selectionBar = document.getElementById('custSelectionBar');
  const selCount = document.getElementById('custSelCount');

  const updateSelectionBar = () => {
    if (selectedCustIds.size > 0) {
      if (selCount) selCount.textContent = selectedCustIds.size;
      selectionBar?.classList.remove('translate-y-20', 'opacity-0');
      selectionBar?.classList.add('translate-y-0', 'opacity-100');
    } else {
      selectionBar?.classList.add('translate-y-20', 'opacity-0');
      selectionBar?.classList.remove('translate-y-0', 'opacity-100');
    }
  };

  // Initial trigger for selection bar on render/re-render
  updateSelectionBar();

  // Individual checkbox click
  checkBoxes.forEach(cb => {
    cb.addEventListener('change', () => {
      const id = cb.dataset.id;
      if (cb.checked) {
        selectedCustIds.add(id);
      } else {
        selectedCustIds.delete(id);
      }
      // Check if all row checkboxes are ticked, then tick master
      const filtered = getFilteredCustomers();
      const start = (custPage - 1) * C_SIZE;
      const pageItems = filtered.slice(start, start + C_SIZE);
      const allTicked = pageItems.every(c => selectedCustIds.has(c.id)) && pageItems.length > 0;
      if (selectAll) selectAll.checked = allTicked;

      updateSelectionBar();
    });
  });

  // Master checkbox click
  selectAll?.addEventListener('change', () => {
    const filtered = getFilteredCustomers();
    const start = (custPage - 1) * C_SIZE;
    const pageItems = filtered.slice(start, start + C_SIZE);

    pageItems.forEach(c => {
      if (selectAll.checked) {
        selectedCustIds.add(c.id);
      } else {
        selectedCustIds.delete(c.id);
      }
    });

    reRender();
  });

  // Clear selection action bar
  document.getElementById('clearSelectedCustBtn')?.addEventListener('click', () => {
    selectedCustIds.clear();
    reRender();
  });

  // Delete selected button action
  document.getElementById('deleteSelectedCustBtn')?.addEventListener('click', () => {
    if (confirm(`Apakah Anda yakin ingin menghapus ${selectedCustIds.size} customer terpilih?`)) {
      selectedCustIds.forEach(id => {
        const idx = CUSTOMERS.findIndex(c => c.id === id);
        if (idx !== -1) {
          CUSTOMERS.splice(idx, 1);
        }
      });
      selectedCustIds.clear();
      showToast('Customer terpilih berhasil dihapus.', 'success');
      reRender();
    }
  });
}

export function resetCustomerState() { 
  custDetailId = null; 
  custPage = 1; 
  custSearch = ''; 
  selectedCustIds.clear(); 
}
