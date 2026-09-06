import React, { useState } from 'react';
import { useForm, Link } from '@inertiajs/react';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

export default function Login({ status }) {
    const [showPassword, setShowPassword] = useState(false);
    const [view, setView] = useState('login'); // 'login' | 'forgot' | 'reset-sent'

    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
        remember: false,
    });

    const forgotForm = useForm({ email: '' });

    const handleLogin = (e) => {
        e.preventDefault();
        post(route('login'), {
            onFinish: () => reset('password'),
        });
    };

    const handleRequestReset = (e) => {
        e.preventDefault();
        forgotForm.post(route('password.email'), {
            onSuccess: () => setView('reset-sent'),
        });
    };

    return (
        <div className="min-h-screen w-full flex flex-col lg:flex-row bg-surface-50 overflow-hidden font-sans">

            {/* LEFT PANEL */}
            <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-brand-900 via-brand-800 to-brand-950 relative items-center justify-center p-12 overflow-hidden border-r border-brand-700/30">
                <div className="absolute -top-40 -left-40 w-96 h-96 bg-brand-400/20 rounded-full blur-3xl animate-pulse-slow"></div>
                <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-brand-300/10 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '2s' }}></div>

                <div className="relative z-10 max-w-lg w-full flex flex-col justify-between h-full py-8">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white p-1 flex items-center justify-center shadow-lg overflow-hidden shrink-0">
                            <img src="/logo.png" alt="ACTiV" className="w-full h-full object-contain" onError={(e) => { e.target.style.display='none'; }} />
                            <span className="text-brand-700 font-black text-xs" style={{ display: 'none' }}>A</span>
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
                                    <span className="text-[11px] font-bold bg-white/10 px-2.5 py-1 rounded text-white">Sent / PO / Expired</span>
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

                    <div className="flex justify-between items-center text-xs text-white/90 font-medium pt-4 border-t border-white/10">
                        <span>© PT. Alfa Cipta Teknologi Virtual</span>
                        <div className="flex gap-4">
                            <Link href="/guide" className="text-white/80 hover:text-white transition-colors cursor-pointer">Panduan</Link>
                            <Link href="/support" className="text-white/80 hover:text-white transition-colors cursor-pointer">Bantuan</Link>
                        </div>
                    </div>
                </div>
            </div>

            {/* RIGHT PANEL */}
            <div className="flex-1 flex flex-col justify-center items-center p-6 md:p-12 lg:p-16 relative">
                <div className="w-full max-w-[420px] bg-white lg:bg-transparent rounded-2xl lg:rounded-none border border-surface-200 lg:border-none p-6 md:p-8 lg:p-0 shadow-sm lg:shadow-none animate-fade-in-up">

                    {/* Mobile logo */}
                    <div className="flex lg:hidden items-center gap-2 mb-8">
                        <div className="w-8 h-8 rounded-lg bg-brand-700 flex items-center justify-center">
                            <span className="text-white font-black text-sm">A</span>
                        </div>
                        <span className="font-extrabold text-surface-800 text-lg">ACTiV</span>
                    </div>

                    {status && (
                        <div className="mb-4 text-sm font-medium text-green-600 bg-green-50 border border-green-100 rounded-lg p-3">
                            {status}
                        </div>
                    )}

                    {/* LOGIN VIEW */}
                    {view === 'login' && (
                        <>
                            <div className="mb-8 animate-fade-in-up">
                                <h1 className="text-2xl font-bold text-surface-900 mb-2">Selamat Datang Kembali</h1>
                                <p className="text-sm text-surface-500">Masuk ke portal sales ACTiV untuk mengelola quotation</p>
                            </div>

                            <form onSubmit={handleLogin} className="flex flex-col gap-4 animate-fade-in-up">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-bold text-surface-600 uppercase tracking-wide">Alamat Email</label>
                                    <div className="flex items-center bg-surface-50 border border-surface-200 rounded-xl px-4 py-3 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-50 transition-all">
                                        <svg className="w-5 h-5 text-surface-400 shrink-0 mr-3" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25H4.5A2.25 2.25 0 012.25 17.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5H4.5a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                                        </svg>
                                        <input
                                            id="email"
                                            type="email"
                                            value={data.email}
                                            onChange={(e) => setData('email', e.target.value)}
                                            placeholder="contoh@activ.co.id"
                                            className="bg-transparent border-none outline-none focus:ring-0 text-sm text-surface-700 placeholder-surface-400 w-full"
                                            autoFocus
                                            autoComplete="username"
                                        />
                                    </div>
                                    {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
                                </div>

                                <div className="flex flex-col gap-1.5 animate-fade-in-up animate-delay-1">
                                    <div className="flex justify-between items-center">
                                        <label className="text-xs font-bold text-surface-600 uppercase tracking-wide">Kata Sandi</label>
                                        <button
                                            type="button"
                                            onClick={() => { setView('forgot'); }}
                                            className="text-xs font-semibold text-brand-600 hover:text-brand-700 transition-colors"
                                        >
                                            Lupa Kata Sandi?
                                        </button>
                                    </div>
                                    <div className="flex items-center bg-surface-50 border border-surface-200 rounded-xl px-4 py-3 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-50 transition-all">
                                        <svg className="w-5 h-5 text-surface-400 shrink-0 mr-3" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                                        </svg>
                                        <input
                                            id="password"
                                            type={showPassword ? 'text' : 'password'}
                                            value={data.password}
                                            onChange={(e) => setData('password', e.target.value)}
                                            placeholder="••••••••"
                                            className="bg-transparent border-none outline-none focus:ring-0 text-sm text-surface-700 placeholder-surface-400 w-full"
                                            autoComplete="current-password"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="text-surface-400 hover:text-surface-600 focus:outline-none transition-colors p-1"
                                        >
                                            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                        </button>
                                    </div>
                                    {errors.password && <p className="text-xs text-red-500">{errors.password}</p>}
                                </div>

                                {errors.email && (
                                    <div className="text-xs font-medium text-red-500 bg-red-50 border border-red-100 rounded-lg p-2.5 animate-fade-in-up">
                                        Email atau kata sandi salah.
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold py-3 px-4 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed mt-2 animate-fade-in-up animate-delay-2"
                                >
                                    {processing ? (
                                        <>Memverifikasi... <Loader2 className="animate-spin" size={18} /></>
                                    ) : (
                                        'Masuk Ke Sistem'
                                    )}
                                </button>
                            </form>
                        </>
                    )}

                    {/* FORGOT PASSWORD VIEW */}
                    {view === 'forgot' && (
                        <div className="animate-fade-in-up">
                            <div className="mb-8">
                                <h1 className="text-2xl font-bold text-surface-900 mb-2">Lupa Kata Sandi?</h1>
                                <p className="text-sm text-surface-500">Masukkan email terdaftar Anda untuk menerima tautan pemulihan kata sandi.</p>
                            </div>

                            <form onSubmit={handleRequestReset} className="flex flex-col gap-4">
                                <div className="flex flex-col gap-1.5 animate-fade-in-up">
                                    <label className="text-xs font-bold text-surface-600 uppercase tracking-wide">Alamat Email</label>
                                    <div className="flex items-center bg-surface-50 border border-surface-200 rounded-xl px-4 py-3 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-50 transition-all">
                                        <svg className="w-5 h-5 text-surface-400 shrink-0 mr-3" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25H4.5A2.25 2.25 0 012.25 17.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5H4.5a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                                        </svg>
                                        <input
                                            type="email"
                                            value={forgotForm.data.email}
                                            onChange={(e) => forgotForm.setData('email', e.target.value)}
                                            placeholder="contoh@activ.co.id"
                                            className="bg-transparent border-none outline-none focus:ring-0 text-sm text-surface-700 placeholder-surface-400 w-full"
                                        />
                                    </div>
                                    {forgotForm.errors.email && <p className="text-xs text-red-500">{forgotForm.errors.email}</p>}
                                </div>

                                <button
                                    type="submit"
                                    disabled={forgotForm.processing}
                                    className="flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold py-3 px-4 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed mt-2 w-full animate-fade-in-up animate-delay-1"
                                >
                                    {forgotForm.processing ? (
                                        <>Mengirim... <Loader2 className="animate-spin" size={18} /></>
                                    ) : (
                                        'Kirim Link Reset'
                                    )}
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setView('login')}
                                    className="text-xs font-semibold text-center text-surface-500 hover:text-brand-600 transition-colors mt-2 w-full"
                                >
                                    Kembali ke Halaman Login
                                </button>
                            </form>
                        </div>
                    )}

                    {/* RESET SENT VIEW */}
                    {view === 'reset-sent' && (
                        <div className="animate-fade-in-up text-center">
                            <div className="w-16 h-16 rounded-full bg-brand-50 flex items-center justify-center mx-auto mb-6 border border-brand-100">
                                <svg className="w-8 h-8 text-brand-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <h1 className="text-2xl font-bold text-surface-900 mb-3">Email Pemulihan Terkirim</h1>
                            <p className="text-sm text-surface-500 mb-6 leading-relaxed">
                                Tautan pemulihan kata sandi telah dikirim ke <strong className="text-surface-700 font-semibold">{forgotForm.data.email}</strong>.
                                Silakan periksa kotak masuk atau folder spam email Anda.
                            </p>
                            <button
                                type="button"
                                onClick={() => setView('login')}
                                className="inline-flex items-center justify-center bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold py-3 px-6 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 w-full"
                            >
                                Kembali ke Halaman Login
                            </button>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}
