// ============================================
// ACTiV Quotation Dashboard — Guide Page (Mockup Full Version)
// ============================================

let search = '';
let activeCategory = 'all';
let openSection = 'create-quotation';

const categories = [
  { id: 'all', label: 'Semua Topik', icon: `<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>` },
  { id: 'quotation', label: 'Quotation', icon: `<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>` },
  { id: 'customer', label: 'Customer & PIC', icon: `<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>` },
  { id: 'product', label: 'Produk & Brand', icon: `<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27,6.96 12,12.01 20.73,6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>` },
  { id: 'roles', label: 'Role & Hak Akses', icon: `<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/><polyline points="17,11 19,13 23,9"/></svg>` },
];

const guideTopics = [
  {
    id: 'create-quotation',
    category: 'quotation',
    title: 'Cara Membuat Quotation Penawaran Baru',
    summary: 'Panduan langkah demi langkah membuat penawaran harga resmi dengan kalkulasi otomatis.',
    steps: [
      'Klik tombol "+ Buat Quotation" pada header atau menu Quotations.',
      'Pilih Customer dan PIC penerima penawaran. Sistem akan mengisi alamat & kontak otomatis.',
      'Tambahkan item produk, tentukan kuantitas (QTY) dan diskon jika ada.',
      'Tentukan Term of Payment (TOP), Garansi, dan tanggal berlaku (Expired Date).',
      'Pilih Rekening Bank pembayar yang akan dicantumkan di penawaran.',
      'Simpan sebagai Draft atau langsung ubah ke status Sent/Approved.',
      'Klik ikon Print/PDF untuk mengunduh penawaran resmi berformat PDF.'
    ]
  },
  {
    id: 'pdf-export',
    category: 'quotation',
    title: 'Cetak & Ekspor Penawaran ke PDF',
    summary: 'Fitur cetak otomatis dengan tata letak profesional lengkap dengan logo, syarat & ketentuan, serta tanda tangan.',
    steps: [
      'Buka daftar Quotations dan klik ikon Mata (Detail) atau tombol Cetak.',
      'Sistem akan menyusun tata letak PDF standar perusahaan secara otomatis.',
      'Rincian barang, total harga, PPN, bank penerima, dan tanda tangan digital Sales akan tercantum.',
      'Gunakan tombol "Print / Save PDF" di browser untuk mengunduh file PDF resmi.'
    ]
  },
  {
    id: 'manage-customers',
    category: 'customer',
    title: 'Mengelola Data Customer & Banyak PIC',
    summary: 'Cara mendaftarkan perusahaan klien beserta beberapa kontak PIC (Person In Charge).',
    steps: [
      'Buka menu Customers di Sidebar.',
      'Klik tombol "+ Tambah Customer" di pojok kanan atas.',
      'Isi Nama Perusahaan, Alamat Lengkap, dan Informasi Pajak (NPWP).',
      'Tambahkan satu atau beberapa data PIC (Nama, Email, Nomor WhatsApp).',
      'Tentukan PIC Utama (Primary PIC) yang akan muncul otomatis saat membuat Quotation.',
      'Simpan data customer. Anda bisa mengeditnya kapan saja.'
    ]
  },
  {
    id: 'products-brands',
    category: 'product',
    title: 'Katalog Produk & Kelola Brand',
    summary: 'Menambahkan produk baru, mengatur stok/SKU, dan menyesuaikan warna brand.',
    steps: [
      'Akses menu Products -> Katalog Produk untuk melihat daftar barang.',
      'Klik "+ Tambah Produk" untuk menambahkan barang baru lengkap dengan gambar, SKU, dan harga.',
      'Gunakan menu Products -> Kelola Brand untuk menambah brand baru beserta warna khasnya.',
      'Produk yang terdaftar akan otomatis muncul di pencarian autocomplete saat membuat Quotation.'
    ]
  },
  {
    id: 'user-management',
    category: 'roles',
    title: 'Manajemen User & Hak Akses Role Dinamis',
    summary: 'Pengaturan matriks hak akses untuk Administrator, Manager, Sales, dan Presales.',
    steps: [
      'Akses menu System -> User Management di Sidebar (khusus Administrator).',
      'Di submenu Users: Tambah anggota tim baru dengan email, password, dan role yang sesuai.',
      'Di submenu Roles: Atur matriks hak akses fitur dengan mencentang kotak centang.',
      'Perubahan hak akses tersimpan dinamis ke database dan berlaku secara real-time.'
    ]
  },
  {
    id: 'manager-dashboard',
    category: 'quotation',
    title: 'Manager Dashboard & Filter Sales',
    summary: 'Monitoring performa penawaran seluruh tim sales dalam satu tampilan.',
    steps: [
      'Akses menu Reports -> Manager View di Sidebar.',
      'Gunakan filter Sales di pojok kanan atas untuk melihat penawaran dari sales tertentu.',
      'Gunakan tab status (Draft, Sent, Approved, Rejected, Expired) untuk memfilter progres penawaran.',
      'Pantau total potensi revenue dan quotation yang membutuhkan persetujuan.'
    ]
  }
];

export function renderGuide(onBack) {
  const filteredTopics = guideTopics.filter(t => {
    const matchesCategory = activeCategory === 'all' || t.category === activeCategory;
    const matchesSearch = !search || 
      t.title.toLowerCase().includes(search.toLowerCase()) || 
      t.summary.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return `
    <div class="min-h-screen bg-surface-50 font-sans text-surface-800 pb-16 w-full">
      <!-- Header Bar -->
      <header class="bg-white border-b border-surface-200 sticky top-0 z-30">
        <div class="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl bg-white p-1 flex items-center justify-center border border-surface-200 shadow-sm shrink-0">
              <img src="/logo.png" alt="ACTiV" class="w-full h-full object-contain" />
            </div>
            <div>
              <span class="text-base font-extrabold text-brand-700 tracking-tight block">ACTiV</span>
              <span class="text-[10px] font-bold text-surface-400 tracking-wider uppercase block -mt-1">Pusat Panduan</span>
            </div>
          </div>

          <button id="btnBackFromGuide" class="flex items-center gap-2 text-sm font-semibold text-surface-600 hover:text-brand-600 px-3.5 py-2 rounded-lg bg-surface-100 hover:bg-brand-50 transition-all cursor-pointer">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            <span>Kembali ke Login</span>
          </button>
        </div>
      </header>

      <!-- Hero Section Full Width -->
      <section class="bg-gradient-to-r from-brand-800 via-brand-700 to-brand-900 text-white py-12 px-4 sm:px-6">
        <div class="max-w-4xl mx-auto text-center">
          <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-brand-100 backdrop-blur-sm border border-white/10 mb-4">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>
            Dokumentasi & Panduan Pengguna
          </span>
          <h1 class="text-2xl sm:text-4xl font-extrabold tracking-tight mb-3">
            Bagaimana Kami Bisa Membantu Anda?
          </h1>
          <p class="text-sm sm:text-base text-brand-100/90 max-w-2xl mx-auto mb-8">
            Temukan panduan lengkap penggunaan portal penawaran harga ACTiV, mulai dari membuat quotation hingga pengelolaan hak akses tim.
          </p>

          <!-- Search Box -->
          <div class="max-w-xl mx-auto relative">
            <svg class="w-5 h-5 text-surface-400 absolute left-4 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input
              type="text"
              id="guideSearchInput"
              placeholder="Cari topik panduan (misal: buat quotation, customer, cetak pdf)..."
              value="${search}"
              class="w-full bg-white text-surface-800 pl-11 pr-4 py-3.5 rounded-xl text-sm font-medium outline-none shadow-lg placeholder-surface-400 focus:ring-2 focus:ring-brand-400 transition-all"
            />
          </div>
        </div>
      </section>

      <!-- Main Content -->
      <main class="max-w-5xl mx-auto px-4 sm:px-6 mt-8">
        <!-- Category Selector -->
        <div class="flex items-center gap-2 overflow-x-auto pb-3 mb-6 scrollbar-none">
          ${categories.map(cat => {
            const isActive = activeCategory === cat.id;
            return `
              <button
                class="cat-btn flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-brand-600 text-white shadow-md shadow-brand-500/20'
                    : 'bg-white text-surface-600 hover:bg-surface-100 border border-surface-200'
                }"
                data-cat="${cat.id}"
              >
                ${cat.icon}
                <span>${cat.label}</span>
              </button>
            `;
          }).join('')}
        </div>

        <!-- Topics Accordion List -->
        <div class="space-y-4">
          ${filteredTopics.length === 0 ? `
            <div class="bg-white rounded-2xl p-12 text-center border border-surface-200 shadow-sm">
              <svg class="w-12 h-12 text-surface-300 mx-auto mb-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              <h3 class="text-base font-bold text-surface-800 mb-1">Topik tidak ditemukan</h3>
              <p class="text-xs text-surface-500">Coba gunakan kata kunci pencarian yang lain atau pilih kategori Semua Topik.</p>
            </div>
          ` : filteredTopics.map(t => {
            const isOpen = openSection === t.id;
            return `
              <div class="bg-white rounded-2xl border border-surface-200 shadow-sm overflow-hidden transition-all duration-200 hover:border-brand-300">
                <button
                  class="topic-toggle w-full px-6 py-5 flex items-center justify-between text-left cursor-pointer hover:bg-surface-50/50 transition-colors"
                  data-id="${t.id}"
                >
                  <div class="pr-4">
                    <h3 class="text-base font-bold text-surface-900 mb-1">${t.title}</h3>
                    <p class="text-xs text-surface-500">${t.summary}</p>
                  </div>
                  <div class="w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all ${
                    isOpen ? 'bg-brand-100 text-brand-700 rotate-180' : 'bg-surface-100 text-surface-500'
                  }">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>
                  </div>
                </button>

                ${isOpen ? `
                  <div class="px-6 pb-6 pt-2 border-t border-surface-100 bg-surface-50/30">
                    <h4 class="text-xs font-bold uppercase tracking-wider text-brand-700 mb-3">Langkah-Langkah:</h4>
                    <ol class="space-y-2.5">
                      ${t.steps.map((step, idx) => `
                        <li class="flex items-start gap-3 text-xs sm:text-sm text-surface-700 leading-relaxed">
                          <span class="w-5 h-5 rounded-full bg-brand-100 text-brand-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                            ${idx + 1}
                          </span>
                          <span>${step}</span>
                        </li>
                      `).join('')}
                    </ol>
                  </div>
                ` : ''}
              </div>
            `;
          }).join('')}
        </div>

        <!-- Footer Support Banner -->
        <div class="mt-12 bg-gradient-to-r from-surface-900 to-surface-800 rounded-2xl p-6 sm:p-8 text-white flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl">
          <div>
            <h3 class="text-lg font-bold mb-1">Masih Butuh Bantuan Tambahan?</h3>
            <p class="text-xs text-surface-300">Tim dukungan kami siap membantu menjawab pertanyaan teknis Anda.</p>
          </div>
          <button
            id="btnGoToSupport"
            class="bg-brand-500 hover:bg-brand-600 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md hover:shadow-lg whitespace-nowrap shrink-0 cursor-pointer"
          >
            Hubungi Layanan Bantuan →
          </button>
        </div>
      </main>
    </div>
  `;
}

export function bindGuideEvents(onBack) {
  const btnBack = document.getElementById('btnBackFromGuide');
  if (btnBack && onBack) {
    btnBack.addEventListener('click', onBack);
  }

  const searchInput = document.getElementById('guideSearchInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      search = e.target.value;
      const pageEl = document.getElementById('app');
      pageEl.innerHTML = renderGuide(onBack);
      bindGuideEvents(onBack);
    });
  }

  document.querySelectorAll('.cat-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      activeCategory = e.currentTarget.getAttribute('data-cat');
      const pageEl = document.getElementById('app');
      pageEl.innerHTML = renderGuide(onBack);
      bindGuideEvents(onBack);
    });
  });

  document.querySelectorAll('.topic-toggle').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      openSection = openSection === id ? null : id;
      const pageEl = document.getElementById('app');
      pageEl.innerHTML = renderGuide(onBack);
      bindGuideEvents(onBack);
    });
  });

  const btnSupport = document.getElementById('btnGoToSupport');
  if (btnSupport) {
    btnSupport.addEventListener('click', () => {
      window.location.hash = 'support';
    });
  }
}
