// ============================================
// ACTiV Quotation Dashboard — Support Page (Mockup Full Version)
// ============================================
import { showToast } from '../utils.js';

let formSubmitted = false;

const faqs = [
  {
    q: 'Bagaimana cara mereset password akun saya?',
    a: 'Anda dapat menghubungi Administrator sistem perusahaan Anda di menu User Management untuk dibuatkan password baru, atau menghubungi tim support kami via WhatsApp.'
  },
  {
    q: 'Apakah data quotation yang dihapus dapat dikembalikan?',
    a: 'Data quotation yang sudah dihapus secara permanen tidak dapat dikembalikan. Pastikan untuk memeriksa kembali sebelum menghapus data penawaran.'
  },
  {
    q: 'Mengapa status quotation berubah menjadi Expired?',
    a: 'Sistem secara otomatis akan mengubah status quotation menjadi Expired apabila tanggal hari ini melewati Expired Date yang ditentukan pada quotation tersebut.'
  },
  {
    q: 'Bagaimana cara menambahkan nomor rekening bank baru?',
    a: 'Khusus pengguna dengan role Administrator, Anda dapat mengelola daftar rekening bank resmi di menu Settings pada tab Rekening Bank.'
  }
];

export function renderSupport(onBack) {
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
              <span class="text-[10px] font-bold text-surface-400 tracking-wider uppercase block -mt-1">Pusat Bantuan</span>
            </div>
          </div>

          <button id="btnBackFromSupport" class="flex items-center gap-2 text-sm font-semibold text-surface-600 hover:text-brand-600 px-3.5 py-2 rounded-lg bg-surface-100 hover:bg-brand-50 transition-all cursor-pointer">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            <span>Kembali ke Login</span>
          </button>
        </div>
      </header>

      <!-- Hero Section Full Width -->
      <section class="bg-gradient-to-r from-brand-900 via-brand-800 to-brand-700 text-white py-12 px-4 sm:px-6">
        <div class="max-w-4xl mx-auto text-center">
          <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-brand-100 backdrop-blur-sm border border-white/10 mb-4">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.72m12 0a5.971 5.971 0 00-.941-3.197M6 18.72a5.971 5.971 0 01-.94-3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"/></svg>
            Layanan Pelanggan & Bantuan Teknis
          </span>
          <h1 class="text-2xl sm:text-4xl font-extrabold tracking-tight mb-3">
            Butuh Bantuan Kendala Teknis?
          </h1>
          <p class="text-sm sm:text-base text-brand-100/90 max-w-2xl mx-auto">
            Tim dukungan teknis PT. Alfa Cipta Teknologi Virtual siap membantu kendala operasional portal quotation Anda.
          </p>
        </div>
      </section>

      <!-- Main Content -->
      <main class="max-w-5xl mx-auto px-4 sm:px-6 mt-8 space-y-10">
        
        <!-- Contact Cards Grid -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
          <a
            href="https://wa.me/6287780116800"
            target="_blank"
            rel="noopener noreferrer"
            class="bg-white rounded-2xl p-6 border border-surface-200 shadow-sm hover:shadow-md hover:border-emerald-400 transition-all block group"
          >
            <div class="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
            </div>
            <h3 class="font-bold text-surface-900 mb-1">Accommerce CS</h3>
            <p class="text-xs text-surface-500 mb-3">Respons cepat via WhatsApp Customer Service.</p>
            <span class="text-xs font-bold text-emerald-600 group-hover:underline flex items-center gap-1">
              +62 877-8011-6800 →
            </span>
          </a>

          <a
            href="mailto:support@activ.co.id"
            class="bg-white rounded-2xl p-6 border border-surface-200 shadow-sm hover:shadow-md hover:border-brand-400 transition-all block group"
          >
            <div class="w-12 h-12 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
            </div>
            <h3 class="font-bold text-surface-900 mb-1">Email Support</h3>
            <p class="text-xs text-surface-500 mb-3">Kirimkan kendala detail melalui email resmi.</p>
            <span class="text-xs font-bold text-brand-600 group-hover:underline flex items-center gap-1">
              support@activ.co.id →
            </span>
          </a>

          <div class="bg-white rounded-2xl p-6 border border-surface-200 shadow-sm">
            <div class="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-4">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            </div>
            <h3 class="font-bold text-surface-900 mb-1">Jam Operasional</h3>
            <p class="text-xs text-surface-500 mb-1">Senin - Jumat: 08:30 - 17:30 WIB</p>
            <p class="text-xs text-surface-500">Sabtu & Minggu: Sesuai piket tim</p>
          </div>
        </div>

        <!-- Contact Form & FAQ Split -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          <!-- FAQ Accordion (7 cols) -->
          <div class="lg:col-span-7 bg-white rounded-2xl border border-surface-200 p-6 sm:p-8 shadow-sm">
            <div class="flex items-center gap-2 mb-6">
              <svg class="w-5 h-5 text-brand-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              <h2 class="text-lg font-bold text-surface-900">Pertanyaan yang Sering Diajukan (FAQ)</h2>
            </div>

            <div class="space-y-4">
              ${faqs.map(faq => `
                <div class="border border-surface-100 rounded-xl p-4 bg-surface-50/50 hover:bg-surface-50 transition-colors">
                  <h4 class="text-sm font-bold text-surface-900 mb-1.5 flex items-start gap-2">
                    <span class="text-brand-600">Q:</span>
                    <span>${faq.q}</span>
                  </h4>
                  <p class="text-xs text-surface-600 leading-relaxed pl-5">
                    ${faq.a}
                  </p>
                </div>
              `).join('')}
            </div>

            <div class="mt-6 pt-4 border-t border-surface-100 flex items-center justify-between text-xs text-surface-500">
              <span>Ingin membaca dokumentasi fitur lengkap?</span>
              <button id="btnGoToGuide" class="font-bold text-brand-600 hover:underline cursor-pointer">
                Buka Halaman Panduan →
              </button>
            </div>
          </div>

          <!-- Ticket / Support Form (5 cols) -->
          <div class="lg:col-span-5 bg-white rounded-2xl border border-surface-200 p-6 sm:p-8 shadow-sm">
            <div class="flex items-center gap-2 mb-4">
              <svg class="w-5 h-5 text-brand-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
              <h2 class="text-lg font-bold text-surface-900">Kirim Tiket Pesan</h2>
            </div>
            <p class="text-xs text-surface-500 mb-6">
              Isi formulir di bawah ini untuk mengirimkan laporan atau kendala teknis Anda.
            </p>

            ${formSubmitted ? `
              <div class="text-center py-8 bg-emerald-50 rounded-xl border border-emerald-100 p-6">
                <svg class="w-12 h-12 text-emerald-500 mx-auto mb-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                <h3 class="text-base font-bold text-emerald-900 mb-1">Pesan Berhasil Terkirim!</h3>
                <p class="text-xs text-emerald-700 mb-4">
                  Terima kasih. Tim support kami akan menghubungi Anda melalui email dalam kurun waktu maks 1x24 jam.
                </p>
                <button
                  id="btnResetTicketForm"
                  class="text-xs font-bold text-emerald-800 bg-white px-4 py-2 rounded-lg border border-emerald-200 hover:bg-emerald-100 transition-colors cursor-pointer"
                >
                  Kirim Pesan Lain
                </button>
              </div>
            ` : `
              <form id="supportTicketForm" class="space-y-4">
                <div>
                  <label class="text-xs font-semibold text-surface-600 block mb-1">Nama Lengkap *</label>
                  <input
                    type="text"
                    required
                    placeholder="Nama Anda"
                    class="w-full bg-surface-50 border border-surface-200 rounded-lg px-3.5 py-2.5 text-xs text-surface-800 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-100 transition-all"
                  />
                </div>

                <div>
                  <label class="text-xs font-semibold text-surface-600 block mb-1">Email Kontak *</label>
                  <input
                    type="email"
                    required
                    placeholder="email@perusahaan.com"
                    class="w-full bg-surface-50 border border-surface-200 rounded-lg px-3.5 py-2.5 text-xs text-surface-800 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-100 transition-all"
                  />
                </div>

                <div>
                  <label class="text-xs font-semibold text-surface-600 block mb-1">Subjek / Perihal *</label>
                  <input
                    type="text"
                    required
                    placeholder="Kendala cetak PDF / Reset kata sandi"
                    class="w-full bg-surface-50 border border-surface-200 rounded-lg px-3.5 py-2.5 text-xs text-surface-800 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-100 transition-all"
                  />
                </div>

                <div>
                  <label class="text-xs font-semibold text-surface-600 block mb-1">Detail Kendala *</label>
                  <textarea
                    rows="4"
                    required
                    placeholder="Jelaskan secara singkat kronologi kendala yang Anda alami..."
                    class="w-full bg-surface-50 border border-surface-200 rounded-lg px-3.5 py-2.5 text-xs text-surface-800 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-100 transition-all"
                  ></textarea>
                </div>

                <button
                  type="submit"
                  class="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs py-3 rounded-lg transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                  <span>Kirim Tiket Support</span>
                </button>
              </form>
            `}
          </div>

        </div>

        <!-- Company Info Footer -->
        <div class="bg-white rounded-2xl border border-surface-200 p-6 text-center text-xs text-surface-500 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div class="flex items-center gap-2">
            <svg class="w-4 h-4 text-brand-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
            <span class="font-semibold text-surface-700">PT. Alfa Cipta Teknologi Virtual</span>
          </div>
          <span>Hak Cipta © ${new Date().getFullYear()} ACTiV Sales Portal. All rights reserved.</span>
        </div>

      </main>
    </div>
  `;
}

export function bindSupportEvents(onBack) {
  const btnBack = document.getElementById('btnBackFromSupport');
  if (btnBack && onBack) {
    btnBack.addEventListener('click', onBack);
  }

  const btnGuide = document.getElementById('btnGoToGuide');
  if (btnGuide) {
    btnGuide.addEventListener('click', () => {
      window.location.hash = 'guide';
    });
  }

  const form = document.getElementById('supportTicketForm');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      formSubmitted = true;
      showToast('Pesan Anda telah dikirim ke Tim Support!', 'success');
      const app = document.getElementById('app');
      app.innerHTML = renderSupport(onBack);
      bindSupportEvents(onBack);
    });
  }

  const btnReset = document.getElementById('btnResetTicketForm');
  if (btnReset) {
    btnReset.addEventListener('click', () => {
      formSubmitted = false;
      const app = document.getElementById('app');
      app.innerHTML = renderSupport(onBack);
      bindSupportEvents(onBack);
    });
  }
}
