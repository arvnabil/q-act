// ============================================
// Brands Page — Active Brands and Visual Colors
// ============================================
import {
  PRODUCTS, BRANDS, showToast, brandClasses, emptyState
} from '../utils.js';

let brandSearch = '';
let selectedBrandNames = new Set();

function getFilteredBrands() {
  return BRANDS.filter(b => {
    if (brandSearch) {
      const s = brandSearch.toLowerCase();
      return b.name.toLowerCase().includes(s);
    }
    return true;
  });
}

export function renderProductsBrands() {
  const filtered = getFilteredBrands();
  
  const rows = filtered.map(b => {
    const isChecked = selectedBrandNames.has(b.name) ? 'checked' : '';
    const prodsCount = PRODUCTS.filter(p => p.brand.toLowerCase() === b.name.toLowerCase()).length;
    
    return `
      <tr class="border-b border-surface-100 hover:bg-surface-50/60 transition-colors">
        <td class="py-3 px-4 text-center checkbox-cell">
          <input type="checkbox" class="brand-checkbox w-4 h-4 rounded text-brand-500 border-surface-200 focus:ring-brand-500 cursor-pointer" data-brand="${b.name}" ${isChecked} />
        </td>
        <td class="py-3.5 px-4">
          <div class="flex items-center gap-3">
            <span class="w-3.5 h-3.5 rounded-full border border-black/10 shrink-0" style="background:${b.color}"></span>
            <span class="text-sm font-bold text-surface-800">${b.name}</span>
          </div>
        </td>
        <td class="py-3.5 px-4">
          <span class="inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${brandClasses(b.name)}">${b.name}</span>
        </td>
        <td class="py-3.5 px-4 text-sm font-mono text-surface-500">${b.color.toUpperCase()}</td>
        <td class="py-3.5 px-4 text-sm text-surface-600 font-medium">${prodsCount} produk</td>
        <td class="py-3 px-4 text-center action-cell">
          <div class="flex items-center justify-center gap-1.5">
            <button class="edit-brand-btn text-brand-600 hover:text-brand-700 hover:bg-brand-50 p-1.5 rounded-lg transition-colors cursor-pointer" data-brand="${b.name}" title="Edit Brand">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 113 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button class="delete-brand-row-btn text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors cursor-pointer" data-brand="${b.name}" title="Hapus Brand">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="3,6 5,6 21,6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  const allPageSelected = filtered.every(b => selectedBrandNames.has(b.name)) && filtered.length > 0;
  const isMasterChecked = allPageSelected ? 'checked' : '';

  const tableContent = filtered.length ? `
    <div class="bg-white rounded-xl border border-surface-200">
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="bg-surface-50 border-b border-surface-200">
              <th class="py-3 px-4 text-center w-12 checkbox-cell">
                <input type="checkbox" id="selectAllBrands" class="w-4 h-4 rounded text-brand-500 border-surface-200 focus:ring-brand-500 cursor-pointer" ${isMasterChecked} />
              </th>
              <th class="py-3 px-4 text-left text-xs font-bold text-surface-400 uppercase tracking-wider w-44">Nama Brand</th>
              <th class="py-3 px-4 text-left text-xs font-bold text-surface-400 uppercase tracking-wider w-40">Preview Badges</th>
              <th class="py-3 px-4 text-left text-xs font-bold text-surface-400 uppercase tracking-wider w-36">Kode Warna</th>
              <th class="py-3 px-4 text-left text-xs font-bold text-surface-400 uppercase tracking-wider">Total Produk</th>
              <th class="py-3 px-4 text-center text-xs font-bold text-surface-400 uppercase tracking-wider w-28">Aksi</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>
  ` : `<div class="bg-white rounded-xl border border-surface-200">${emptyState('Tidak ada brand', 'Coba ubah kata kunci pencarian.')}</div>`;

  return `
    <div class="animate-fade-in-up">
      <!-- Search & Add Actions -->
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
        <div class="flex items-center gap-2 bg-white border border-surface-200 rounded-lg px-3 py-2 min-w-[260px] focus-within:border-brand-400 transition-colors">
          <svg class="w-4 h-4 text-surface-400 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" id="brandSearchInput" placeholder="Cari nama brand..." class="bg-transparent border-none outline-none text-sm text-surface-700 placeholder-surface-400 w-full" value="${brandSearch}" />
        </div>
        <button class="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-brand-500 text-white rounded-lg hover:bg-brand-600 shadow-sm transition-all cursor-pointer" id="addBrandPageBtn">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Tambah Brand
        </button>
      </div>

      <!-- Content -->
      ${tableContent}
    </div>

    <!-- Add/Edit Brand Modal Dialog -->
    <div class="fixed inset-0 bg-black/40 backdrop-blur-sm z-[200] flex items-center justify-center opacity-0 pointer-events-none transition-opacity duration-200" id="brandPageModalOverlay">
      <div class="bg-white rounded-2xl border border-surface-200 shadow-2xl w-[420px] max-w-[90vw] transform translate-y-4 scale-[0.97] transition-all duration-200" id="brandPageModal">
        <div class="flex items-center justify-between px-6 py-4 border-b border-surface-100">
          <h2 class="text-base font-bold text-surface-900" id="brandPageModalTitle">Tambah Brand Baru</h2>
          <button id="brandPageModalClose" class="text-surface-400 hover:text-surface-600 hover:bg-surface-100 p-1.5 rounded-lg transition-colors cursor-pointer">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <form id="brandPageForm" class="px-6 py-5 flex flex-col gap-4">
          <input type="hidden" id="brandPageOldName" />
          
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-semibold text-surface-600">Nama Brand</label>
            <input type="text" id="brandPageName" class="bg-surface-50 border border-surface-200 rounded-lg px-3 py-2.5 text-sm text-surface-700 outline-none focus:border-brand-500" required placeholder="Contoh: Asus, Apple" />
          </div>

          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-semibold text-surface-600">Warna Identitas Brand</label>
            <div class="flex items-center gap-3">
              <input type="color" id="brandPageColor" class="w-16 h-10 bg-surface-50 border border-surface-200 rounded-lg p-1 cursor-pointer outline-none shrink-0" value="#00A88F" />
              <span class="text-xs text-surface-400">Pilih warna representasi lencana produk brand ini.</span>
            </div>
          </div>

          <div class="pt-4 border-t border-surface-100 flex justify-end gap-3">
            <button type="button" id="brandPageCancelBtn" class="px-4 py-2 text-sm font-semibold text-surface-600 border border-surface-200 rounded-lg hover:bg-surface-50 transition-colors cursor-pointer">Batal</button>
            <button type="submit" class="px-4 py-2 text-sm font-semibold bg-brand-500 text-white rounded-lg hover:bg-brand-600 shadow-sm hover:shadow transition-all cursor-pointer">Simpan</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Floating selection action bar -->
    <div class="fixed bottom-6 left-1/2 -translate-x-1/2 bg-surface-900 text-white rounded-xl shadow-2xl px-5 py-3.5 flex items-center gap-4 transition-all duration-300 transform translate-y-20 opacity-0 z-[100] border border-white/10" id="brandSelectionBar">
      <span class="text-xs font-semibold flex items-center gap-2">
        <span id="brandSelCount" class="bg-brand-500 text-white px-2 py-0.5 rounded-full font-bold">0</span> 
        Brand terpilih
      </span>
      <div class="h-4 w-[1px] bg-white/20"></div>
      <button class="bg-red-500 hover:bg-red-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer shadow-sm" id="deleteSelectedBrandsBtn">Hapus Terpilih</button>
      <button class="text-white/60 hover:text-white text-xs font-medium transition-colors cursor-pointer" id="clearSelectedBrandsBtn">Batal</button>
    </div>
  `;
}

export function bindProductsBrandsEvents(reRender) {
  // Search input
  document.getElementById('brandSearchInput')?.addEventListener('input', e => {
    brandSearch = e.target.value;
    reRender();
  });

  // Modal helpers
  const overlay = document.getElementById('brandPageModalOverlay');
  const modal = document.getElementById('brandPageModal');
  
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

  document.getElementById('brandPageModalClose')?.addEventListener('click', closeModal);
  document.getElementById('brandPageCancelBtn')?.addEventListener('click', closeModal);
  overlay?.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });

  // Add Brand Button
  document.getElementById('addBrandPageBtn')?.addEventListener('click', () => {
    document.getElementById('brandPageModalTitle').textContent = 'Tambah Brand Baru';
    document.getElementById('brandPageOldName').value = '';
    document.getElementById('brandPageName').value = '';
    document.getElementById('brandPageColor').value = '#00A88F';
    openModal();
  });

  // Edit Brand Button
  document.querySelectorAll('.edit-brand-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const name = btn.dataset.brand;
      const b = BRANDS.find(x => x.name.toLowerCase() === name.toLowerCase());
      if (b) {
        document.getElementById('brandPageModalTitle').textContent = 'Edit Detail Brand';
        document.getElementById('brandPageOldName').value = b.name;
        document.getElementById('brandPageName').value = b.name;
        document.getElementById('brandPageColor').value = b.color;
        openModal();
      }
    });
  });

  // Delete Brand Button (Individual)
  document.querySelectorAll('.delete-brand-row-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const brandName = btn.dataset.brand;
      const prodsCount = PRODUCTS.filter(p => p.brand.toLowerCase() === brandName.toLowerCase()).length;
      
      if (prodsCount > 0) {
        showToast(`Brand "${brandName}" tidak bisa dihapus karena memiliki ${prodsCount} produk terdaftar.`, 'warning');
        return;
      }

      if (confirm(`Apakah Anda yakin ingin menghapus brand "${brandName}"?`)) {
        const idx = BRANDS.findIndex(b => b.name.toLowerCase() === brandName.toLowerCase());
        if (idx !== -1) {
          BRANDS.splice(idx, 1);
          selectedBrandNames.delete(brandName);
          showToast(`Brand "${brandName}" berhasil dihapus.`, 'success');
          reRender();
        }
      }
    });
  });

  // Form Submit Handler
  document.getElementById('brandPageForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const oldName = document.getElementById('brandPageOldName').value;
    const name = document.getElementById('brandPageName').value.trim();
    const color = document.getElementById('brandPageColor').value;

    if (oldName) {
      // --- EDIT MODE ---
      const b = BRANDS.find(x => x.name.toLowerCase() === oldName.toLowerCase());
      if (b) {
        // Update product brand properties if brand name is updated
        if (b.name !== name) {
          PRODUCTS.forEach(p => {
            if (p.brand.toLowerCase() === b.name.toLowerCase()) p.brand = name;
          });
        }
        b.name = name;
        b.color = color;
        showToast('Brand berhasil diperbarui!', 'success');
      }
    } else {
      // --- ADD MODE ---
      const exists = BRANDS.some(x => x.name.toLowerCase() === name.toLowerCase());
      if (exists) {
        showToast('Brand sudah terdaftar!', 'warning');
        return;
      }
      BRANDS.push({ name, color });
      showToast('Brand baru berhasil ditambahkan!', 'success');
    }

    closeModal();
    reRender();
  });

  // Checkboxes
  const checkBoxes = document.querySelectorAll('.brand-checkbox');
  const selectAll = document.getElementById('selectAllBrands');
  const selectionBar = document.getElementById('brandSelectionBar');
  const selCount = document.getElementById('brandSelCount');

  const updateSelectionBar = () => {
    if (selectedBrandNames.size > 0) {
      if (selCount) selCount.textContent = selectedBrandNames.size;
      selectionBar?.classList.remove('translate-y-20', 'opacity-0');
      selectionBar?.classList.add('translate-y-0', 'opacity-100');
    } else {
      selectionBar?.classList.add('translate-y-20', 'opacity-0');
      selectionBar?.classList.remove('translate-y-0', 'opacity-100');
    }
  };

  updateSelectionBar();

  checkBoxes.forEach(cb => {
    cb.addEventListener('change', () => {
      const brandName = cb.dataset.brand;
      if (cb.checked) {
        selectedBrandNames.add(brandName);
      } else {
        selectedBrandNames.delete(brandName);
      }
      
      const filtered = getFilteredBrands();
      const allChecked = filtered.every(b => selectedBrandNames.has(b.name)) && filtered.length > 0;
      if (selectAll) selectAll.checked = allChecked;

      updateSelectionBar();
    });
  });

  selectAll?.addEventListener('change', () => {
    const filtered = getFilteredBrands();
    filtered.forEach(b => {
      if (selectAll.checked) {
        selectedBrandNames.add(b.name);
      } else {
        selectedBrandNames.delete(b.name);
      }
    });
    reRender();
  });

  document.getElementById('clearSelectedBrandsBtn')?.addEventListener('click', () => {
    selectedBrandNames.clear();
    reRender();
  });

  document.getElementById('deleteSelectedBrandsBtn')?.addEventListener('click', () => {
    let deletable = [];
    let blockedCount = 0;
    
    selectedBrandNames.forEach(brandName => {
      const prodsCount = PRODUCTS.filter(p => p.brand.toLowerCase() === brandName.toLowerCase()).length;
      if (prodsCount === 0) {
        deletable.push(brandName);
      } else {
        blockedCount++;
      }
    });

    if (blockedCount > 0) {
      showToast(`${blockedCount} brand terpilih tidak bisa dihapus karena memiliki produk terdaftar.`, 'warning');
    }

    if (deletable.length === 0) return;

    if (confirm(`Apakah Anda yakin ingin menghapus ${deletable.length} brand terpilih?`)) {
      deletable.forEach(brandName => {
        const idx = BRANDS.findIndex(b => b.name === brandName);
        if (idx !== -1) BRANDS.splice(idx, 1);
        selectedBrandNames.delete(brandName);
      });
      showToast('Brand terpilih berhasil dihapus.', 'success');
      reRender();
    }
  });
}

export function resetBrandState() {
  brandSearch = '';
  selectedBrandNames.clear();
}
