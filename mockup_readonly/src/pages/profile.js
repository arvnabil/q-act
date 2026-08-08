import { showToast, SALES_TEAM } from '../utils.js';

export function renderProfile() {
  const userJson = localStorage.getItem('activ_user');
  const user = userJson ? JSON.parse(userJson) : null;
  
  if (!user) return `<div class="p-6 text-center text-surface-500">Silakan login kembali.</div>`;

  return `
    <div class="animate-fade-in-up max-w-3xl mx-auto w-full">
      <div class="bg-white rounded-xl border border-surface-200 shadow-sm overflow-hidden mb-6">
        <div class="h-32 bg-gradient-to-r from-brand-500 to-brand-600"></div>
        <div class="px-8 pb-8">
          <div class="relative flex justify-between items-end -mt-12 mb-6">
            <div class="relative w-24 h-24 rounded-2xl bg-white p-1.5 shadow-md group cursor-pointer" title="Ubah Foto Profil" id="avatarUploadContainer">
              <input type="file" id="avatarUploadInput" accept="image/png, image/jpeg" class="hidden" />
              <div class="w-full h-full rounded-xl bg-brand-50 flex items-center justify-center text-brand-700 text-3xl font-bold transition-all overflow-hidden group-hover:bg-brand-100" id="avatarPreviewContainer">
                ${user.avatarImg ? `<img src="${user.avatarImg}" class="w-full h-full object-cover" />` : user.avatar}
              </div>
              <div class="absolute -bottom-2 -right-2 w-8 h-8 bg-brand-500 text-white rounded-full flex items-center justify-center shadow-lg border-2 border-white hover:bg-brand-600 transition-colors">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </div>
            </div>
          </div>
          
          <h2 class="text-xl font-bold text-surface-900 mb-6">Pengaturan Profil</h2>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
            <div>
              <label class="text-xs font-semibold text-surface-600 block mb-1">Nama Lengkap</label>
              <input type="text" id="profileName" value="${user.name}" class="w-full bg-surface-50 border border-surface-200 rounded-lg px-3 py-2 text-sm text-surface-700 outline-none focus:border-brand-500" />
            </div>
            <div>
              <label class="text-xs font-semibold text-surface-600 block mb-1">Jabatan (Read-Only)</label>
              <input type="text" value="${user.role}" class="w-full bg-surface-100 border border-surface-200 rounded-lg px-3 py-2 text-sm text-surface-500 outline-none cursor-not-allowed" disabled />
            </div>
            <div>
              <label class="text-xs font-semibold text-surface-600 block mb-1">Email</label>
              <input type="email" id="profileEmail" value="${user.email}" class="w-full bg-surface-50 border border-surface-200 rounded-lg px-3 py-2 text-sm text-surface-700 outline-none focus:border-brand-500" />
            </div>
            <div>
              <label class="text-xs font-semibold text-surface-600 block mb-1">Nomor Handphone</label>
              <input type="text" id="profileMobile" value="${user.mobile}" class="w-full bg-surface-50 border border-surface-200 rounded-lg px-3 py-2 text-sm text-surface-700 outline-none focus:border-brand-500" />
            </div>
          </div>
          
          <div class="border-t border-surface-100 pt-6">
            <h3 class="text-sm font-bold text-surface-800 mb-4">Tanda Tangan Digital (Signature)</h3>
            <div class="flex flex-col sm:flex-row gap-6 items-start">
              <div class="w-48 h-32 border-2 border-dashed border-surface-200 rounded-lg bg-surface-50 flex items-center justify-center overflow-hidden group relative">
                ${user.signature ? `<img src="${user.signature}" class="w-full h-full object-contain p-2" id="signaturePreview" />` : `<div class="text-center text-surface-400 p-4" id="signaturePreviewEmpty"><svg class="w-6 h-6 mx-auto mb-1 opacity-50" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg><span class="text-xs">Belum ada</span></div><img src="" class="hidden w-full h-full object-contain p-2" id="signaturePreview" />`}
              </div>
              <div class="flex-1">
                <p class="text-xs text-surface-500 mb-3 leading-relaxed">Unggah gambar tanda tangan Anda (PNG transparan direkomendasikan). Gambar ini akan otomatis disematkan pada setiap dokumen Quotation yang Anda cetak sebagai pihak "Prepare by".</p>
                <input type="file" id="signatureUpload" accept="image/png, image/jpeg" class="block w-full text-sm text-surface-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100 cursor-pointer" />
              </div>
            </div>
          </div>
          
          <div class="border-t border-surface-100 pt-6 mt-6 flex justify-end">
            <button id="saveProfileBtn" class="px-5 py-2 text-sm font-bold bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-all shadow-sm">Simpan Perubahan</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function bindProfileEvents(onProfileUpdated) {
  const sigInput = document.getElementById('signatureUpload');
  const signaturePreview = document.getElementById('signaturePreview');
  const signaturePreviewEmpty = document.getElementById('signaturePreviewEmpty');
  
  const avatarContainer = document.getElementById('avatarUploadContainer');
  const avatarInput = document.getElementById('avatarUploadInput');
  const avatarPreviewContainer = document.getElementById('avatarPreviewContainer');
  
  let currentSigBase64 = null;
  let currentAvatarBase64 = null;
  
  const userJson = localStorage.getItem('activ_user');
  if (userJson) {
    const user = JSON.parse(userJson);
    if (user.signature) currentSigBase64 = user.signature;
    if (user.avatarImg) currentAvatarBase64 = user.avatarImg;
  }

  // Avatar Upload Logic
  avatarContainer?.addEventListener('click', () => {
    avatarInput?.click();
  });

  avatarInput?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.size > 2 * 1024 * 1024) {
      showToast('Ukuran foto terlalu besar (Maks 2MB).', 'error');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (event) => {
      currentAvatarBase64 = event.target.result;
      if (avatarPreviewContainer) {
        avatarPreviewContainer.innerHTML = `<img src="${currentAvatarBase64}" class="w-full h-full object-cover" />`;
      }
    };
    reader.readAsDataURL(file);
  });

  // Signature Upload Logic
  sigInput?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.size > 2 * 1024 * 1024) {
      showToast('Ukuran gambar terlalu besar (Maks 2MB).', 'error');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (event) => {
      currentSigBase64 = event.target.result;
      if (signaturePreview) {
        signaturePreview.src = currentSigBase64;
        signaturePreview.classList.remove('hidden');
      }
      if (signaturePreviewEmpty) {
        signaturePreviewEmpty.classList.add('hidden');
      }
    };
    reader.readAsDataURL(file);
  });

  document.getElementById('saveProfileBtn')?.addEventListener('click', () => {
    const userJson = localStorage.getItem('activ_user');
    if (!userJson) return;
    
    const user = JSON.parse(userJson);
    const name = document.getElementById('profileName').value.trim();
    const email = document.getElementById('profileEmail').value.trim();
    const mobile = document.getElementById('profileMobile').value.trim();
    
    if (!name || !email || !mobile) {
      showToast('Nama, Email, dan Mobile tidak boleh kosong!', 'error');
      return;
    }
    
    user.name = name;
    user.email = email;
    user.mobile = mobile;
    user.avatar = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    
    if (currentSigBase64) user.signature = currentSigBase64;
    if (currentAvatarBase64) user.avatarImg = currentAvatarBase64;
    
    localStorage.setItem('activ_user', JSON.stringify(user));
    
    const salesPerson = SALES_TEAM.find(s => s.id === user.id);
    if (salesPerson) {
      salesPerson.name = user.name;
      salesPerson.email = user.email;
      salesPerson.mobile = user.mobile;
      salesPerson.avatar = user.avatar;
      if (currentSigBase64) salesPerson.signature = currentSigBase64;
      if (currentAvatarBase64) salesPerson.avatarImg = currentAvatarBase64;
    }
    
    showToast('Profil berhasil diperbarui!', 'success');
    
    if (typeof onProfileUpdated === 'function') {
      onProfileUpdated();
    }
  });
}
