import React, { useState } from 'react';
import { supabase } from '../services/supabase.js';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { SALES_TEAM } from '../data.js'; // Using mock data for Quick Select avatars
import { toast } from 'react-hot-toast';
import useAuthStore from '../store/authStore.js';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Harap isi alamat email dan kata sandi Anda.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }
      
      toast.success('Login berhasil! Selamat datang.');
      // If successful, authStore listener will pick it up and redirect automatically
    } catch (error) {
      setErrorMsg(error.message === 'Invalid login credentials' ? 'Email atau kata sandi salah.' : error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-surface-50 overflow-hidden font-sans">
      
      {/* LEFT PANEL: Dynamic Branding & Aesthetics */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-brand-900 via-brand-800 to-brand-950 relative items-center justify-center p-12 overflow-hidden border-r border-brand-700/30">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-brand-400/20 rounded-full blur-3xl animate-pulse-slow"></div>
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-brand-300/10 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '2s' }}></div>
        
        <div className="relative z-10 max-w-lg w-full flex flex-col justify-between h-full py-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-lg">
              <svg width="24" height="24" viewBox="0 0 32 32" fill="none">
                <path d="M6 24L16 4L26 24" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M10 18H22" stroke="#ffffff" strokeWidth="3" strokeLinecap="round"/>
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-extrabold tracking-wide text-white">ACTiV</span>
              <span className="text-xs text-brand-200 font-medium tracking-wider">SALES PORTAL</span>
            </div>
          </div>

          <div className="my-auto animate-float">
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none"></div>
              
              <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-400"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-400"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-green-400"></div>
                  <span className="text-[10px] text-brand-100 font-bold uppercase tracking-wider ml-2">Sistem Monitoring & Pembuatan Penawaran</span>
                </div>
                <span className="text-[10px] bg-brand-500 text-white px-2 py-0.5 rounded-md font-bold shadow-sm uppercase">Online</span>
              </div>

              <div className="flex flex-col gap-3.5">
                <div className="flex justify-between items-center bg-white/5 px-4 py-2.5 rounded-xl border border-white/5 hover:bg-white/10 transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">⚡</span>
                    <span className="text-xs font-semibold text-brand-100">Pembuatan Quotation Sistematis</span>
                  </div>
                  <span className="text-[11px] font-bold bg-white/10 px-2.5 py-1 rounded text-white">Otomatis & Terstandar</span>
                </div>
                <div className="flex justify-between items-center bg-white/5 px-4 py-2.5 rounded-xl border border-white/5 hover:bg-white/10 transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">📊</span>
                    <span className="text-xs font-semibold text-brand-100">Monitoring Status Real-Time</span>
                  </div>
                  <span className="text-[11px] font-bold bg-white/10 px-2.5 py-1 rounded text-white">Sent / Approved / Expired</span>
                </div>
                <div className="flex justify-between items-center bg-white/5 px-4 py-2.5 rounded-xl border border-white/5 hover:bg-white/10 transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">🛡️</span>
                    <span className="text-xs font-semibold text-brand-100">Klausul Garansi & T&C Dinamis</span>
                  </div>
                  <span className="text-[11px] font-bold bg-white/10 px-2.5 py-1 rounded text-white">Akurat Sesuai Brand</span>
                </div>
              </div>
            </div>
            
            <p className="text-sm font-medium text-brand-200 mt-6 leading-relaxed">
              Sistem Quotation Cerdas untuk pembuatan penawaran harga terstruktur secara cepat, monitoring status sales yang transparan, dan pengelolaan term sheets otomatis.
            </p>
          </div>

          <div className="flex justify-between items-center text-xs text-brand-300">
            <span>© PT. Alfa Cipta Teknologi Virtual</span>
            <div className="flex gap-4">
              <span className="hover:text-white transition-colors cursor-pointer">Panduan</span>
              <span className="hover:text-white transition-colors cursor-pointer">Bantuan</span>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL: Login Form & Demo Selector */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 md:p-12 lg:p-16 relative">
        <div className="w-full max-w-[420px] bg-white lg:bg-transparent rounded-2xl lg:rounded-none border border-surface-200 lg:border-none p-6 md:p-8 lg:p-0 shadow-sm lg:shadow-none animate-fade-in-up">
          
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-surface-900 mb-2">Selamat Datang Kembali</h1>
            <p className="text-sm text-surface-500">Masuk ke portal sales ACTiV untuk mengelola quotation</p>
          </div>

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-surface-600 uppercase tracking-wide">Alamat Email</label>
              <div className="flex items-center bg-surface-50 border border-surface-200 rounded-xl px-4 py-3 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-50 transition-all">
                <svg className="w-5 h-5 text-surface-400 shrink-0 mr-3" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25H4.5A2.25 2.25 0 012.25 17.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5H4.5a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contoh@activ.co.id" 
                  className="bg-transparent border-none outline-none text-sm text-surface-700 placeholder-surface-400 w-full" 
                  required 
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-surface-600 uppercase tracking-wide">Kata Sandi</label>
                <a href="#" className="text-xs font-semibold text-brand-600 hover:text-brand-700">Lupa Kata Sandi?</a>
              </div>
              <div className="flex items-center bg-surface-50 border border-surface-200 rounded-xl px-4 py-3 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-50 transition-all">
                <svg className="w-5 h-5 text-surface-400 shrink-0 mr-3" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
                <input 
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••" 
                  className="bg-transparent border-none outline-none text-sm text-surface-700 placeholder-surface-400 w-full" 
                  required 
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-surface-400 hover:text-surface-600 focus:outline-none transition-colors p-1"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>
            
            {errorMsg && (
              <div className="text-xs font-medium text-red-500 bg-red-50 border border-red-100 rounded-lg p-2.5">
                {errorMsg}
              </div>
            )}

            <button type="submit" id="hidden-submit" className="hidden"></button>
            <button 
              type="button" 
              onClick={handleLogin}
              disabled={isLoading}
              className="flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold py-3 px-4 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed mt-2"
            >
              {isLoading ? (
                <>Memverifikasi... <Loader2 className="animate-spin" size={18} /></>
              ) : (
                'Masuk Ke Sistem'
              )}
            </button>
          </form>

        </div>
      </div>
    </div>
  );
}
