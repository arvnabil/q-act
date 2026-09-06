import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../services/supabase.js';
import { Eye, EyeOff, Loader2, ShieldCheck, ArrowLeft } from 'lucide-react';
import { toast } from 'react-hot-toast';
import useAuthStore from '../store/authStore.js';

export default function ResetPassword() {
  const navigate = useNavigate();
  const { user, isLoading } = useAuthStore();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Jika auth selesai loading dan user ternyata null (tidak ada session pemulihan), alihkan ke login
    if (!isLoading && !user) {
      toast.error('Sesi pemulihan tidak valid atau telah kedaluwarsa.');
      navigate('/login', { replace: true });
    }
  }, [user, isLoading, navigate]);

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!password || !confirmPassword) {
      setErrorMsg('Harap isi kedua kolom kata sandi.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Kata sandi harus minimal 6 karakter.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Konfirmasi kata sandi tidak cocok.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        throw error;
      }

      setSuccess(true);
      toast.success('Kata sandi Anda berhasil diperbarui!');
      
      // Tunggu sebentar lalu alihkan ke dashboard utama
      setTimeout(() => {
        navigate('/', { replace: true });
      }, 2500);

    } catch (error) {
      setErrorMsg(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface-50 flex flex-col items-center justify-center gap-3">
        <Loader2 className="animate-spin text-brand-600" size={32} />
        <span className="text-sm font-semibold text-brand-600">Memverifikasi Sesi Pemulihan...</span>
      </div>
    );
  }

  // Jika user null setelah check, render loader sebentar sebelum redirect via useEffect
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-surface-50 p-6 font-sans">
      <div className="w-full max-w-[440px] bg-white border border-surface-200 rounded-2xl p-6 md:p-8 shadow-sm animate-fade-in-up">
        
        {success ? (
          <div className="text-center py-4">
            <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-6 border border-green-100">
              <ShieldCheck className="w-8 h-8 text-green-500" />
            </div>
            <h1 className="text-2xl font-bold text-surface-900 mb-3">Kata Sandi Diperbarui</h1>
            <p className="text-sm text-surface-500 mb-6 leading-relaxed">
              Kata sandi Anda telah berhasil diubah. Sistem akan otomatis mengarahkan Anda masuk ke Dashboard Portal ACTiV dalam beberapa saat...
            </p>
            <Loader2 className="animate-spin text-brand-600 mx-auto" size={24} />
          </div>
        ) : (
          <>
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-surface-900 mb-2">Buat Kata Sandi Baru</h1>
              <p className="text-sm text-surface-500">
                Silakan masukkan kata sandi baru Anda di bawah ini untuk memulihkan akses akun.
              </p>
            </div>

            <form onSubmit={handleResetPassword} className="flex flex-col gap-4">
              
              {/* Password Baru */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-surface-600 uppercase tracking-wide">Kata Sandi Baru</label>
                <div className="flex items-center bg-surface-50 border border-surface-200 rounded-xl px-4 py-3 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-50 transition-all">
                  <svg className="w-5 h-5 text-surface-400 shrink-0 mr-3" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                  <input 
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimal 6 karakter" 
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

              {/* Konfirmasi Password */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-surface-600 uppercase tracking-wide">Konfirmasi Kata Sandi Baru</label>
                <div className="flex items-center bg-surface-50 border border-surface-200 rounded-xl px-4 py-3 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-50 transition-all">
                  <svg className="w-5 h-5 text-surface-400 shrink-0 mr-3" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                  <input 
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Ulangi kata sandi baru" 
                    className="bg-transparent border-none outline-none text-sm text-surface-700 placeholder-surface-400 w-full" 
                    required 
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="text-surface-400 hover:text-surface-600 focus:outline-none transition-colors p-1"
                  >
                    {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              {errorMsg && (
                <div className="text-xs font-medium text-red-500 bg-red-50 border border-red-100 rounded-lg p-2.5 animate-fade-in-up">
                  {errorMsg}
                </div>
              )}

              <button 
                type="submit"
                disabled={isSubmitting}
                className="flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold py-3 px-4 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed mt-2 w-full"
              >
                {isSubmitting ? (
                  <>Menyimpan... <Loader2 className="animate-spin" size={18} /></>
                ) : (
                  'Perbarui Kata Sandi'
                )}
              </button>

              <button 
                type="button"
                onClick={() => navigate('/login', { replace: true })}
                className="text-xs font-semibold text-center text-surface-500 hover:text-brand-600 transition-colors mt-2 w-full inline-flex items-center justify-center gap-1.5"
              >
                <ArrowLeft size={14} /> Kembali ke Login
              </button>

            </form>
          </>
        )}

      </div>
    </div>
  );
}
