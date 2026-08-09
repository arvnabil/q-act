// ============================================
// Login Page — Premium Custom Authentication
// ============================================
import { SALES_TEAM, showToast } from '../utils.js';

export function renderLogin() {
  const quickSelectItems = SALES_TEAM.map(s => `
    <button class="quick-user-card flex items-center gap-3 p-3 bg-surface-50 border border-surface-200 hover:border-brand-500 hover:bg-brand-50/30 rounded-xl text-left transition-all duration-200 cursor-pointer group" data-email="${s.email}">
      <div class="w-9 h-9 rounded-lg bg-brand-500 text-white flex items-center justify-center text-xs font-bold shadow-sm group-hover:scale-105 transition-transform duration-200 shrink-0">
        ${s.avatar}
      </div>
      <div class="min-w-0">
        <div class="text-xs font-bold text-surface-800 truncate">${s.name}</div>
        <div class="text-[10px] text-surface-400 font-medium truncate">${s.role}</div>
      </div>
    </button>
  `).join('');

  return `
    <div class="min-h-screen w-full flex flex-col lg:flex-row bg-surface-50 overflow-hidden font-sans">
      
      <!-- LEFT PANEL: Dynamic Branding & Aesthetics (Desktop only) -->
      <div class="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-brand-900 via-brand-800 to-brand-950 relative items-center justify-center p-12 overflow-hidden border-r border-brand-700/30">
        
        <!-- Glowing background blob decorations -->
        <div class="absolute -top-40 -left-40 w-96 h-96 bg-brand-400/20 rounded-full blur-3xl animate-pulse-slow"></div>
        <div class="absolute -bottom-40 -right-40 w-96 h-96 bg-brand-300/10 rounded-full blur-3xl animate-pulse-slow" style="animation-delay: 2s;"></div>
        
        <div class="relative z-10 max-w-lg w-full flex flex-col justify-between h-full py-8">
          
          <!-- Logo & Brand Header -->
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-white p-1 flex items-center justify-center shadow-lg overflow-hidden shrink-0">
              <img src="/logo.png" alt="ACTiV" class="w-full h-full object-contain" />
            </div>
            <div class="flex flex-col">
              <span class="text-lg font-extrabold tracking-wide text-white">ACTiV</span>
              <span class="text-xs text-brand-200 font-medium tracking-wider">SALES PORTAL</span>
            </div>
          </div>

          <!-- Glassmorphic Mockup Dashboard Visual (Floating Animation) -->
          <div class="my-auto animate-float">
            <div class="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
              <div class="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none"></div>
              
              <!-- Card header mockup -->
              <div class="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
                <div class="flex items-center gap-2">
                  <div class="w-2.5 h-2.5 rounded-full bg-red-400"></div>
                  <div class="w-2.5 h-2.5 rounded-full bg-yellow-400"></div>
                  <div class="w-2.5 h-2.5 rounded-full bg-green-400"></div>
                  <span class="text-[10px] text-brand-100 font-bold uppercase tracking-wider ml-2">Sistem Monitoring & Pembuatan Penawaran</span>
                </div>
                <span class="text-[10px] bg-brand-500 text-white px-2 py-0.5 rounded-md font-bold shadow-sm uppercase">Online</span>
              </div>

              <!-- Content items -->
              <div class="flex flex-col gap-3.5">
                <div class="flex justify-between items-center bg-white/5 px-4 py-2.5 rounded-xl border border-white/5 hover:bg-white/10 transition-colors">
                  <div class="flex items-center gap-2">
                    <span class="text-sm">⚡</span>
                    <span class="text-xs font-semibold text-brand-100">Pembuatan Quotation Sistematis</span>
                  </div>
                  <span class="text-[11px] font-bold bg-white/10 px-2.5 py-1 rounded text-white">Otomatis & Terstandar</span>
                </div>
                <div class="flex justify-between items-center bg-white/5 px-4 py-2.5 rounded-xl border border-white/5 hover:bg-white/10 transition-colors">
                  <div class="flex items-center gap-2">
                    <span class="text-sm">📊</span>
                    <span class="text-xs font-semibold text-brand-100">Monitoring Status Real-Time</span>
                  </div>
                  <span class="text-[11px] font-bold bg-white/10 px-2.5 py-1 rounded text-white">Sent / Approved / Expired</span>
                </div>
                <div class="flex justify-between items-center bg-white/5 px-4 py-2.5 rounded-xl border border-white/5 hover:bg-white/10 transition-colors">
                  <div class="flex items-center gap-2">
                    <span class="text-sm">🛡️</span>
                    <span class="text-xs font-semibold text-brand-100">Klausul Garansi & T&C Dinamis</span>
                  </div>
                  <span class="text-[11px] font-bold bg-white/10 px-2.5 py-1 rounded text-white">Akurat Sesuai Brand</span>
                </div>
              </div>

              <!-- Subtle line chart graphic inside glass -->
              <div class="mt-4 pt-4 border-t border-white/10 flex items-end gap-1.5 h-16 justify-between px-1">
                <div class="bg-white/10 w-full h-8 rounded-sm"></div>
                <div class="bg-white/15 w-full h-12 rounded-sm"></div>
                <div class="bg-white/10 w-full h-10 rounded-sm"></div>
                <div class="bg-white/20 w-full h-14 rounded-sm"></div>
                <div class="bg-white/30 w-full h-16 rounded-sm"></div>
                <div class="bg-brand-400/50 w-full h-16 rounded-sm shadow-lg"></div>
              </div>
            </div>
            
            <!-- Description -->
            <p class="text-sm font-medium text-brand-200 mt-6 leading-relaxed">
              Sistem Quotation Cerdas untuk pembuatan penawaran harga terstruktur secara cepat, monitoring status sales yang transparan, dan pengelolaan term sheets otomatis.
            </p>
          </div>

          <!-- Bottom Footer Info -->
          <div class="flex justify-between items-center text-xs text-white/90 font-medium pt-4 border-t border-white/10">
            <span>© PT. Alfa Cipta Teknologi Virtual</span>
            <div class="flex gap-4">
              <a href="#guide" class="nav-footer-link text-white/80 hover:text-white transition-colors cursor-pointer">Panduan</a>
              <a href="#support" class="nav-footer-link text-white/80 hover:text-white transition-colors cursor-pointer">Bantuan</a>
            </div>
          </div>
        </div>
      </div>

      <!-- RIGHT PANEL: Login Form & Demo Selector -->
      <div class="flex-1 flex flex-col justify-center items-center p-6 md:p-12 lg:p-16 relative">
        
        <!-- Mobile Header (Logo & Brand) -->
        <div class="lg:hidden flex items-center gap-3 mb-8 w-full max-w-[420px]">
          <div class="w-9 h-9 rounded-lg bg-brand-500 flex items-center justify-center shadow-md">
            <svg width="20" height="20" viewBox="0 0 32 32" fill="none">
              <path d="M6 24L16 4L26 24" stroke="#ffffff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M10 18H22" stroke="#ffffff" stroke-width="3" stroke-linecap="round"/>
            </svg>
          </div>
          <div class="flex flex-col">
            <span class="text-sm font-extrabold tracking-wide text-brand-700">ACTiV</span>
            <span class="text-[10px] text-surface-400 font-semibold tracking-wider">SALES PORTAL</span>
          </div>
        </div>

        <div class="w-full max-w-[420px] bg-white lg:bg-transparent rounded-2xl lg:rounded-none border border-surface-200 lg:border-none p-6 md:p-8 lg:p-0 shadow-sm lg:shadow-none animate-fade-in-up">
          
          <div class="mb-8">
            <h1 class="text-2xl font-bold text-surface-900 mb-2">Selamat Datang Kembali</h1>
            <p class="text-sm text-surface-500">Masuk ke portal sales ACTiV untuk mengelola quotation</p>
          </div>

          <!-- Login form -->
          <form id="loginForm" class="flex flex-col gap-4">
            
            <div class="flex flex-col gap-1.5">
              <label for="loginEmail" class="text-xs font-bold text-surface-600 uppercase tracking-wide">Alamat Email</label>
              <div class="flex items-center bg-surface-50 border border-surface-200 rounded-xl px-4 py-3 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-50 transition-all">
                <svg class="w-5 h-5 text-surface-400 shrink-0 mr-3" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25H4.5A2.25 2.25 0 012.25 17.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5H4.5a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
                <input type="email" id="loginEmail" value="rifki.dwi@activ.co.id" placeholder="contoh@activ.co.id" class="bg-transparent border-none outline-none text-sm text-surface-700 placeholder-surface-400 w-full" required />
              </div>
            </div>

            <div class="flex flex-col gap-1.5">
              <div class="flex justify-between items-center">
                <label for="loginPassword" class="text-xs font-bold text-surface-600 uppercase tracking-wide">Kata Sandi</label>
                <a href="#" class="text-xs font-semibold text-brand-600 hover:text-brand-700" id="forgotPassword">Lupa Kata Sandi?</a>
              </div>
              <div class="flex items-center bg-surface-50 border border-surface-200 rounded-xl px-4 py-3 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-50 transition-all">
                <svg class="w-5 h-5 text-surface-400 shrink-0 mr-3" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
                <input type="password" id="loginPassword" value="12345678" placeholder="••••••••" class="bg-transparent border-none outline-none text-sm text-surface-700 placeholder-surface-400 w-full" required />
                <button type="button" id="togglePasswordBtn" class="text-surface-400 hover:text-surface-600 focus:outline-none transition-colors p-1" title="Show/Hide Password">
                  <svg id="eyeOpenIcon" class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                  <svg id="eyeCloseIcon" class="w-5 h-5 hidden" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                  </svg>
                </button>
              </div>
            </div>

            <!-- Submit button -->
            <button type="submit" id="loginSubmitBtn" class="flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold py-3 px-4 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-400/50 mt-4 cursor-pointer">
              <span id="btnText">Masuk Ke Sistem</span>
              <svg id="btnSpinner" class="animate-spin h-5 w-5 text-white hidden" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </button>
          </form>
        </div>

        <!-- Mobile Footer -->
        <p class="lg:hidden text-center text-xs text-surface-400 mt-8">
          © PT. Alfa Cipta Teknologi Virtual
        </p>
      </div>

      <div class="fixed top-5 right-5 flex flex-col gap-2 z-[300]" id="toastContainer"></div>
    </div>
  `;
}

export function bindLoginEvents(onLoginSuccess) {
  const form = document.getElementById('loginForm');
  const emailInput = document.getElementById('loginEmail');
  const passwordInput = document.getElementById('loginPassword');
  const togglePasswordBtn = document.getElementById('togglePasswordBtn');
  const eyeOpenIcon = document.getElementById('eyeOpenIcon');
  const eyeCloseIcon = document.getElementById('eyeCloseIcon');
  const submitBtn = document.getElementById('loginSubmitBtn');
  const btnText = document.getElementById('btnText');
  const btnSpinner = document.getElementById('btnSpinner');

  // Toggle password visibility
  togglePasswordBtn?.addEventListener('click', () => {
    const isPassword = passwordInput.type === 'password';
    passwordInput.type = isPassword ? 'text' : 'password';
    if (isPassword) {
      eyeOpenIcon.classList.add('hidden');
      eyeCloseIcon.classList.remove('hidden');
    } else {
      eyeOpenIcon.classList.remove('hidden');
      eyeCloseIcon.classList.add('hidden');
    }
  });

  // Mock Forgot Password click
  document.getElementById('forgotPassword')?.addEventListener('click', (e) => {
    e.preventDefault();
    showToast('Silakan gunakan salah satu akun demo di bawah untuk masuk.', 'info');
  });

  // Submit Handler
  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = emailInput.value.trim().toLowerCase();
    const password = passwordInput.value;

    if (!email || !password) {
      showToast('Harap isi alamat email dan kata sandi Anda.', 'warning');
      return;
    }

    if (password.length < 6) {
      showToast('Kata sandi demo minimal harus 6 karakter.', 'warning');
      return;
    }

    // Check if email matches one of the sales team members
    const matchedUser = SALES_TEAM.find(s => s.email.toLowerCase() === email);

    if (!matchedUser) {
      showToast('Email tidak terdaftar sebagai Tim Sales ACTiV.', 'warning');
      return;
    }

    // Simulate login loading state
    submitBtn.disabled = true;
    submitBtn.classList.add('opacity-80', 'cursor-not-allowed');
    btnText.textContent = 'Memverifikasi...';
    btnSpinner.classList.remove('hidden');

    setTimeout(() => {
      // Save user to local storage
      localStorage.setItem('activ_user', JSON.stringify(matchedUser));
      
      showToast(`Selamat datang kembali, ${matchedUser.name}!`, 'success');
      
      // Callback to main router
      onLoginSuccess(matchedUser);
    }, 1200);
  });

  // Quick Account Select Click Handler
  document.querySelectorAll('.quick-user-card').forEach(card => {
    card.addEventListener('click', (e) => {
      const email = card.dataset.email;
      if (!email) return;

      // Autofill values
      emailInput.value = email;
      passwordInput.value = 'passwordDemo123'; // Demo placeholder password

      showToast('Menghubungkan akun demo...', 'info');

      // Autofocus and auto-submit after a slight delay
      setTimeout(() => {
        form?.dispatchEvent(new Event('submit'));
      }, 500);
    });
  });
}
