// ============================================
// Settings Page
// ============================================
import { COMPANY, SALES_TEAM, showToast } from '../utils.js';

export function renderSettings() {
  const salesRows = SALES_TEAM.map(s => `
    <tr class="border-b border-surface-100 hover:bg-surface-50/60 transition-colors">
      <td class="py-3 px-4">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-lg bg-brand-50 text-brand-700 flex items-center justify-center text-xs font-bold shrink-0">${s.avatar}</div>
          <div><div class="text-sm font-semibold text-surface-800">${s.name}</div><div class="text-xs text-surface-400">${s.role}</div></div>
        </div>
      </td>
      <td class="py-3 px-4 text-sm text-surface-600">${s.email}</td>
      <td class="py-3 px-4 text-sm text-surface-600">${s.mobile}</td>
      <td class="py-3 px-4 text-sm font-mono text-surface-500">${s.id}</td>
      <td class="py-3 px-4"><span class="inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">Aktif</span></td>
    </tr>
  `).join('');

  return `
    <div class="animate-fade-in-up max-w-5xl">
      <!-- Company Info -->
      <div class="bg-white rounded-xl border border-surface-200 mb-5">
        <div class="px-6 py-4 border-b border-surface-100 flex items-center justify-between">
          <h2 class="text-sm font-bold text-surface-800">Informasi Perusahaan</h2>
          <button class="text-xs font-semibold text-brand-600 hover:text-brand-700">Edit</button>
        </div>
        <div class="px-6 py-5 grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label class="text-xs font-semibold text-surface-400 block mb-1">Nama Perusahaan</label>
            <input type="text" value="${COMPANY.name}" class="w-full bg-surface-50 border border-surface-200 rounded-lg px-3 py-2.5 text-sm text-surface-700 outline-none focus:border-brand-500" readonly />
          </div>
          <div>
            <label class="text-xs font-semibold text-surface-400 block mb-1">Brand</label>
            <input type="text" value="${COMPANY.brand}" class="w-full bg-surface-50 border border-surface-200 rounded-lg px-3 py-2.5 text-sm text-surface-700 outline-none focus:border-brand-500" readonly />
          </div>
          <div class="md:col-span-2">
            <label class="text-xs font-semibold text-surface-400 block mb-1">Alamat Kantor Pusat</label>
            <input type="text" value="${COMPANY.address}" class="w-full bg-surface-50 border border-surface-200 rounded-lg px-3 py-2.5 text-sm text-surface-700 outline-none focus:border-brand-500" readonly />
          </div>
          <div class="md:col-span-2">
            <label class="text-xs font-semibold text-surface-400 block mb-1">Kantor Cabang</label>
            <input type="text" value="${COMPANY.branch}" class="w-full bg-surface-50 border border-surface-200 rounded-lg px-3 py-2.5 text-sm text-surface-700 outline-none focus:border-brand-500" readonly />
          </div>
          <div>
            <label class="text-xs font-semibold text-surface-400 block mb-1">Telepon</label>
            <input type="text" value="${COMPANY.phone}" class="w-full bg-surface-50 border border-surface-200 rounded-lg px-3 py-2.5 text-sm text-surface-700 outline-none focus:border-brand-500" readonly />
          </div>
          <div>
            <label class="text-xs font-semibold text-surface-400 block mb-1">Email</label>
            <input type="text" value="${COMPANY.email}" class="w-full bg-surface-50 border border-surface-200 rounded-lg px-3 py-2.5 text-sm text-surface-700 outline-none focus:border-brand-500" readonly />
          </div>
          <div>
            <label class="text-xs font-semibold text-surface-400 block mb-1">Website</label>
            <input type="text" value="${COMPANY.website}" class="w-full bg-surface-50 border border-surface-200 rounded-lg px-3 py-2.5 text-sm text-surface-700 outline-none focus:border-brand-500" readonly />
          </div>
        </div>
      </div>

      <!-- Bank Account -->
      <div class="bg-white rounded-xl border border-surface-200 mb-5">
        <div class="px-6 py-4 border-b border-surface-100 flex items-center justify-between">
          <h2 class="text-sm font-bold text-surface-800">Rekening Bank</h2>
          <button class="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-all" id="addBankBtn">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Tambah Rekening
          </button>
        </div>
        
        <!-- List of Banks -->
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr class="bg-surface-50 border-b border-surface-200">
                <th class="py-3 px-4 text-left text-xs font-bold text-surface-400 uppercase tracking-wider">Bank</th>
                <th class="py-3 px-4 text-left text-xs font-bold text-surface-400 uppercase tracking-wider">Nomor Rekening</th>
                <th class="py-3 px-4 text-left text-xs font-bold text-surface-400 uppercase tracking-wider">Atas Nama</th>
                <th class="py-3 px-4 text-left text-xs font-bold text-surface-400 uppercase tracking-wider">Status</th>
                <th class="py-3 px-4 text-center text-xs font-bold text-surface-400 uppercase tracking-wider w-32">Aksi</th>
              </tr>
            </thead>
            <tbody>
              ${COMPANY.bankAccounts.map(b => `
                <tr class="border-b border-surface-100 last:border-0 hover:bg-surface-50 transition-colors">
                  <td class="py-3 px-4 text-sm font-semibold text-surface-800">${b.bank}</td>
                  <td class="py-3 px-4 text-sm font-mono text-surface-600">${b.number}</td>
                  <td class="py-3 px-4 text-sm text-surface-600">${b.name}</td>
                  <td class="py-3 px-4">
                    ${b.isDefault ? `<span class="inline-flex px-2 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700">Default</span>` : ''}
                  </td>
                  <td class="py-3 px-4 text-center">
                    <div class="flex items-center justify-center gap-2">
                      ${!b.isDefault ? `<button class="set-default-bank-btn text-xs font-semibold text-brand-600 hover:text-brand-700" data-id="${b.id}">Set Default</button>` : ''}
                      <button class="delete-bank-btn text-xs font-semibold text-red-500 hover:text-red-700" data-id="${b.id}">Hapus</button>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Quotation Settings -->
      <div class="bg-white rounded-xl border border-surface-200 mb-5">
        <div class="px-6 py-4 border-b border-surface-100">
          <h2 class="text-sm font-bold text-surface-800">Pengaturan Quotation</h2>
        </div>
        <div class="px-6 py-5 grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label class="text-xs font-semibold text-surface-400 block mb-1">Format Nomor Quotation</label>
            <input type="text" value="QO{SEQ}.{MMYY}.{NNN}" class="w-full bg-surface-50 border border-surface-200 rounded-lg px-3 py-2.5 text-sm font-mono text-surface-700 outline-none focus:border-brand-500" />
            <p class="text-[10px] text-surface-400 mt-1">Contoh: QO5.0726.036</p>
          </div>
          <div>
            <label class="text-xs font-semibold text-surface-400 block mb-1">Default Masa Berlaku (Hari)</label>
            <input type="number" value="7" class="w-full bg-surface-50 border border-surface-200 rounded-lg px-3 py-2.5 text-sm text-surface-700 outline-none focus:border-brand-500" />
          </div>
          <div>
            <label class="text-xs font-semibold text-surface-400 block mb-1">Tarif PPN</label>
            <div class="flex items-center gap-2">
              <input type="number" value="11" min="0" max="100" class="w-20 bg-surface-50 border border-surface-200 rounded-lg px-3 py-2.5 text-sm text-surface-700 outline-none focus:border-brand-500" />
              <span class="text-sm text-surface-500">%</span>
            </div>
          </div>
          <div>
            <label class="text-xs font-semibold text-surface-400 block mb-1">Auto-Group Item per Brand</label>
            <select class="w-full bg-surface-50 border border-surface-200 rounded-lg px-3 py-2.5 text-sm text-surface-700 outline-none focus:border-brand-500 cursor-pointer">
              <option selected>Ya — Otomatis kelompokkan berdasarkan Brand</option>
              <option>Tidak — Urutan manual oleh Sales</option>
            </select>
          </div>
          <div class="md:col-span-2">
            <label class="text-xs font-semibold text-surface-400 block mb-1">T&C Dinamis per Brand</label>
            <select class="w-full bg-surface-50 border border-surface-200 rounded-lg px-3 py-2.5 text-sm text-surface-700 outline-none focus:border-brand-500 cursor-pointer">
              <option selected>Ya — Sisipkan klausul garansi otomatis berdasarkan brand</option>
              <option>Tidak — Gunakan T&C statis untuk semua quotation</option>
            </select>
          </div>
        </div>
        <div class="px-6 py-4 border-t border-surface-100 flex justify-end">
          <button class="px-4 py-2 text-sm font-semibold bg-brand-500 text-white rounded-lg hover:bg-brand-600 shadow-sm transition-all">Simpan Pengaturan</button>
        </div>
      </div>

      <!-- Sales Team -->
      <div class="bg-white rounded-xl border border-surface-200">
        <div class="px-6 py-4 border-b border-surface-100 flex items-center justify-between">
          <h2 class="text-sm font-bold text-surface-800">Tim Sales</h2>
          <button id="addSalesBtn" class="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-all">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Tambah Sales
          </button>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr class="bg-surface-50 border-b border-surface-200">
                <th class="py-3 px-4 text-left text-xs font-bold text-surface-400 uppercase tracking-wider">Nama</th>
                <th class="py-3 px-4 text-left text-xs font-bold text-surface-400 uppercase tracking-wider">Email</th>
                <th class="py-3 px-4 text-left text-xs font-bold text-surface-400 uppercase tracking-wider">Mobile</th>
                <th class="py-3 px-4 text-left text-xs font-bold text-surface-400 uppercase tracking-wider">ID</th>
                <th class="py-3 px-4 text-left text-xs font-bold text-surface-400 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody>${salesRows}</tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Add Bank Modal (Moved outside animate block to avoid transform trapping) -->
    <div id="inlineBankForm" class="hidden fixed inset-0 z-[100] flex items-center justify-center bg-surface-900/50 backdrop-blur-sm">
      <div class="bg-white w-full max-w-lg rounded-2xl shadow-xl overflow-hidden animate-fade-in-up">
        <div class="px-6 py-4 border-b border-surface-100 flex items-center justify-between">
          <h3 class="text-sm font-bold text-surface-800">Tambah Rekening Baru</h3>
          <button id="closeBankBtn" class="text-surface-400 hover:text-surface-600 transition-colors"><svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
        </div>
        <div class="p-6">
          <div class="space-y-4 mb-6">
            <div>
              <label class="text-xs font-semibold text-surface-600 block mb-1">Bank</label>
              <input type="text" id="newBankName" class="w-full bg-surface-50 border border-surface-200 rounded-lg px-3 py-2 text-sm text-surface-700 outline-none focus:border-brand-500" placeholder="Contoh: BCA" />
            </div>
            <div>
              <label class="text-xs font-semibold text-surface-600 block mb-1">Nomor Rekening</label>
              <input type="text" id="newBankNumber" class="w-full bg-surface-50 border border-surface-200 rounded-lg px-3 py-2 text-sm font-mono text-surface-700 outline-none focus:border-brand-500" placeholder="1234567890" />
            </div>
            <div>
              <label class="text-xs font-semibold text-surface-600 block mb-1">Atas Nama</label>
              <input type="text" id="newBankAccountName" class="w-full bg-surface-50 border border-surface-200 rounded-lg px-3 py-2 text-sm text-surface-700 outline-none focus:border-brand-500" placeholder="PT XYZ" />
            </div>
          </div>
          <div class="flex justify-end gap-3">
            <button id="cancelBankBtn" class="px-4 py-2 text-sm font-semibold text-surface-600 hover:text-surface-900 transition-colors">Batal</button>
            <button id="saveBankBtn" class="px-5 py-2 text-sm font-bold bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-all shadow-sm">Simpan Rekening</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Add Sales Modal -->
    <div id="inlineSalesForm" class="hidden fixed inset-0 z-[100] flex items-center justify-center bg-surface-900/50 backdrop-blur-sm">
      <div class="bg-white w-full max-w-xl rounded-2xl shadow-xl overflow-hidden animate-fade-in-up">
        <div class="px-6 py-4 border-b border-surface-100 flex items-center justify-between">
          <h3 class="text-sm font-bold text-surface-800">Tambah Anggota Tim Sales</h3>
          <button id="closeSalesBtn" class="text-surface-400 hover:text-surface-600 transition-colors"><svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
        </div>
        <div class="p-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label class="text-xs font-semibold text-surface-600 block mb-1">Nama Lengkap</label>
              <input type="text" id="newSalesName" class="w-full bg-surface-50 border border-surface-200 rounded-lg px-3 py-2 text-sm text-surface-700 outline-none focus:border-brand-500" placeholder="Contoh: John Doe" />
            </div>
            <div>
              <label class="text-xs font-semibold text-surface-600 block mb-1">Email</label>
              <input type="email" id="newSalesEmail" class="w-full bg-surface-50 border border-surface-200 rounded-lg px-3 py-2 text-sm text-surface-700 outline-none focus:border-brand-500" placeholder="john.doe@activ.co.id" />
            </div>
            <div>
              <label class="text-xs font-semibold text-surface-600 block mb-1">Nomor Handphone</label>
              <input type="text" id="newSalesMobile" class="w-full bg-surface-50 border border-surface-200 rounded-lg px-3 py-2 text-sm text-surface-700 outline-none focus:border-brand-500" placeholder="0812-XXXX-XXXX" />
            </div>
            <div>
              <label class="text-xs font-semibold text-surface-600 block mb-1">Jabatan (Role)</label>
              <select id="newSalesRole" class="w-full bg-surface-50 border border-surface-200 rounded-lg px-3 py-2 text-sm text-surface-700 outline-none focus:border-brand-500">
                <option value="Account Executive">Account Executive</option>
                <option value="Sales Representative">Sales Representative</option>
                <option value="Sales Manager">Sales Manager</option>
              </select>
            </div>
            <div>
              <label class="text-xs font-semibold text-surface-600 block mb-1">Target Penjualan (Rp)</label>
              <input type="number" id="newSalesTarget" class="w-full bg-surface-50 border border-surface-200 rounded-lg px-3 py-2 text-sm text-surface-700 outline-none focus:border-brand-500" placeholder="500000000" />
            </div>
            <div>
              <label class="text-xs font-semibold text-surface-600 block mb-1">Password Login</label>
              <input type="password" id="newSalesPassword" class="w-full bg-surface-50 border border-surface-200 rounded-lg px-3 py-2 text-sm text-surface-700 outline-none focus:border-brand-500" placeholder="••••••••" />
            </div>
          </div>
          <div class="flex justify-end gap-3">
            <button id="cancelSalesBtn" class="px-4 py-2 text-sm font-semibold text-surface-600 hover:text-surface-900 transition-colors">Batal</button>
            <button id="saveSalesBtn" class="px-5 py-2 text-sm font-bold bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-all shadow-sm">Simpan Sales</button>
          </div>
        </div>
      </div>
    </div>`;
}

function reloadSettings() {
  const content = document.getElementById('pageContent');
  if(content) {
    content.innerHTML = renderSettings();
    bindSettingsEvents();
  }
}

export function bindSettingsEvents() {
  document.getElementById('addBankBtn')?.addEventListener('click', () => {
    document.getElementById('inlineBankForm')?.classList.remove('hidden');
  });

  document.getElementById('cancelBankBtn')?.addEventListener('click', () => {
    document.getElementById('inlineBankForm')?.classList.add('hidden');
  });

  document.getElementById('closeBankBtn')?.addEventListener('click', () => {
    document.getElementById('inlineBankForm')?.classList.add('hidden');
  });

  document.getElementById('saveBankBtn')?.addEventListener('click', () => {
    const bank = document.getElementById('newBankName').value.trim();
    const number = document.getElementById('newBankNumber').value.trim();
    const name = document.getElementById('newBankAccountName').value.trim();
    
    if(!bank || !number || !name) {
      showToast('Semua kolom rekening harus diisi!', 'error');
      return;
    }

    const newId = 'BA' + Date.now().toString().slice(-4);
    COMPANY.bankAccounts.push({
      id: newId,
      bank,
      number,
      name,
      isDefault: COMPANY.bankAccounts.length === 0
    });
    showToast('Rekening berhasil ditambahkan!', 'success');
    reloadSettings();
  });

  document.querySelectorAll('.set-default-bank-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      COMPANY.bankAccounts.forEach(b => b.isDefault = (b.id === id));
      showToast('Rekening utama berhasil diperbarui!', 'success');
      reloadSettings();
    });
  });

  document.querySelectorAll('.delete-bank-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if(COMPANY.bankAccounts.length <= 1) {
        showToast('Minimal harus ada 1 rekening!', 'error');
        return;
      }
      const id = btn.dataset.id;
      const target = COMPANY.bankAccounts.find(b => b.id === id);
      COMPANY.bankAccounts = COMPANY.bankAccounts.filter(b => b.id !== id);
      
      // Reassign default if deleted one was default
      if (target && target.isDefault && COMPANY.bankAccounts.length > 0) {
        COMPANY.bankAccounts[0].isDefault = true;
      }
      showToast('Rekening berhasil dihapus!', 'success');
      reloadSettings();
    });
  });

  document.getElementById('addSalesBtn')?.addEventListener('click', () => {
    document.getElementById('inlineSalesForm')?.classList.remove('hidden');
  });

  document.getElementById('cancelSalesBtn')?.addEventListener('click', () => {
    document.getElementById('inlineSalesForm')?.classList.add('hidden');
  });

  document.getElementById('closeSalesBtn')?.addEventListener('click', () => {
    document.getElementById('inlineSalesForm')?.classList.add('hidden');
  });

  document.getElementById('saveSalesBtn')?.addEventListener('click', () => {
    const name = document.getElementById('newSalesName').value.trim();
    const email = document.getElementById('newSalesEmail').value.trim();
    const mobile = document.getElementById('newSalesMobile').value.trim();
    const role = document.getElementById('newSalesRole').value;
    const target = parseFloat(document.getElementById('newSalesTarget').value) || 0;
    const password = document.getElementById('newSalesPassword').value;
    
    if(!name || !email || !mobile || !password) {
      showToast('Semua kolom (termasuk password) wajib diisi!', 'error');
      return;
    }

    const newId = 'S' + String(SALES_TEAM.length + 1).padStart(3, '0');
    const avatar = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    
    SALES_TEAM.push({
      id: newId,
      name,
      role,
      mobile,
      email,
      avatar,
      target,
      password,
      achieved: 0
    });
    showToast('Tim Sales berhasil ditambahkan!', 'success');
    reloadSettings();
  });
}
