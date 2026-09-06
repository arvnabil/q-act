import React from 'react';
import useAuthStore from '../store/authStore.js';
import { Hammer, Clock, LogOut } from 'lucide-react';

export default function MaintenanceScreen({ domains }) {
  const { signOut } = useAuthStore();
  const currentDomain = window.location.hostname;

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-brand-900 via-brand-800 to-brand-950 flex items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Glowing background blob decorations */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-brand-400/20 rounded-full blur-3xl animate-pulse-slow"></div>
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-brand-300/10 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '2s' }}></div>

      <div className="relative z-10 max-w-md w-full bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-8 shadow-2xl text-center text-white animate-fade-in-up">
        {/* Pulsing Icon */}
        <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center mx-auto mb-6 shadow-lg relative group">
          <div className="absolute inset-0 rounded-2xl bg-brand-400/20 blur-md animate-ping"></div>
          <Hammer className="w-8 h-8 text-brand-300 animate-bounce-slow" />
        </div>

        {/* Header */}
        <h1 className="text-2xl font-bold tracking-tight mb-2">Mode Perawatan Aktif</h1>
        <p className="text-sm text-brand-200 mb-6 leading-relaxed">
          ACTiV Sales Portal sedang menjalani pemeliharaan sistem terencana untuk meningkatkan kualitas layanan kami.
        </p>

        {/* Info Card */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-6 flex flex-col gap-2.5 text-left text-xs text-brand-100">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-brand-300 shrink-0" />
            <span>Estimasi pengerjaan sedang berlangsung.</span>
          </div>
          <div className="border-t border-white/10 my-1"></div>
          <div>
            <span className="font-semibold text-white">Domain saat ini: </span>
            <span className="font-mono bg-black/20 px-1.5 py-0.5 rounded text-brand-200">{currentDomain}</span>
          </div>
          {domains && domains.length > 0 && (
            <div>
              <span className="font-semibold text-white">Domain terdampak: </span>
              <div className="flex flex-wrap gap-1 mt-1.5">
                {domains.map(d => (
                  <span key={d} className="font-mono bg-brand-500/30 border border-brand-400/20 px-1.5 py-0.5 rounded text-[10px] text-brand-200">
                    {d}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="flex flex-col gap-3">
          <button 
            onClick={() => window.location.reload()}
            className="w-full py-3 px-4 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-sm font-semibold transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer"
          >
            Muat Ulang Halaman
          </button>
          
          <button 
            onClick={signOut}
            className="w-full py-3 px-4 bg-white/5 hover:bg-white/10 border border-white/15 hover:border-white/20 text-brand-100 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Keluar dari Akun
          </button>
        </div>
      </div>
    </div>
  );
}
