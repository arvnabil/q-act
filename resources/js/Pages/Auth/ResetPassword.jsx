import React, { useState } from 'react';
import { useForm, Head, Link } from '@inertiajs/react';
import { Eye, EyeOff, Loader2, KeyRound, CheckCircle2, AlertCircle } from 'lucide-react';

export default function ResetPassword({ token, email }) {
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const { data, setData, post, processing, errors, reset } = useForm({
        token: token || '',
        email: email || '',
        password: '',
        password_confirmation: '',
    });

    const submit = (e) => {
        e.preventDefault();

        post(route('password.store'), {
            onFinish: () => reset('password', 'password_confirmation'),
        });
    };

    return (
        <div className="min-h-screen w-full flex flex-col lg:flex-row bg-surface-50 overflow-hidden font-sans">
            <Head title="Reset Kata Sandi - ACTiV Sales Portal" />

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

                            <div className="flex items-center gap-3 mb-4 text-white">
                                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
                                    <KeyRound className="w-5 h-5 text-brand-200" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-base">Pembaruan Kata Sandi Aman</h3>
                                    <p className="text-xs text-brand-200">Pastikan kata sandi baru Anda kuat & mudah diingat</p>
                                </div>
                            </div>

                            <div className="flex flex-col gap-2.5 text-xs text-brand-100">
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                                    <span>Minimal 8 karakter</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                                    <span>Kombinasi huruf, angka, atau simbol disarankan</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                                    <span>Enkripsi kata sandi standar industri</span>
                                </div>
                            </div>
                        </div>

                        <p className="text-sm font-medium text-brand-200 mt-6 leading-relaxed">
                            Pembaruan kata sandi akan langsung aktif untuk sesi login berikutnya di portal ACTiV Sales.
                        </p>
                    </div>

                    <div className="flex justify-between items-center text-xs text-white/90 font-medium pt-4 border-t border-white/10">
                        <span>© PT. Alfa Cipta Teknologi Virtual</span>
                        <div className="flex gap-4">
                            <Link href="/login" className="text-white/80 hover:text-white transition-colors cursor-pointer">Login</Link>
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

                    <div className="mb-6 animate-fade-in-up">
                        <h1 className="text-2xl font-bold text-surface-900 mb-2">Buat Kata Sandi Baru</h1>
                        <p className="text-sm text-surface-500">Masukkan kata sandi baru untuk mengamankan akun Anda.</p>
                    </div>

                    {/* ERROR BANNER */}
                    {(errors.email || errors.token) && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex flex-col gap-2 animate-fade-in-up">
                            <div className="flex items-start gap-2.5 text-red-700">
                                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                                <div className="text-xs font-medium leading-relaxed">
                                    {errors.email || errors.token}
                                </div>
                            </div>
                            <div className="pt-2 border-t border-red-200/60 flex justify-end">
                                <Link
                                    href={route('login')}
                                    className="text-xs font-bold text-brand-600 hover:text-brand-700 transition-colors"
                                >
                                    Minta Tautan Reset Baru di Halaman Login &rarr;
                                </Link>
                            </div>
                        </div>
                    )}

                    <form onSubmit={submit} className="flex flex-col gap-4 animate-fade-in-up">
                        {/* EMAIL */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold text-surface-600 uppercase tracking-wide">Alamat Email</label>
                            <div className="flex items-center bg-surface-50 border border-surface-200 rounded-xl px-4 py-3 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-50 transition-all">
                                <svg className="w-5 h-5 text-surface-400 shrink-0 mr-3" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25H4.5A2.25 2.25 0 012.25 17.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5H4.5a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                                </svg>
                                <input
                                    id="email"
                                    type="email"
                                    name="email"
                                    value={data.email}
                                    onChange={(e) => setData('email', e.target.value)}
                                    placeholder="contoh@activ.co.id"
                                    className="bg-transparent border-none outline-none focus:ring-0 text-sm text-surface-700 placeholder-surface-400 w-full"
                                    required
                                    autoComplete="username"
                                />
                            </div>
                        </div>

                        {/* PASSWORD BARU */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold text-surface-600 uppercase tracking-wide">Kata Sandi Baru</label>
                            <div className="flex items-center bg-surface-50 border border-surface-200 rounded-xl px-4 py-3 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-50 transition-all">
                                <svg className="w-5 h-5 text-surface-400 shrink-0 mr-3" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                                </svg>
                                <input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    name="password"
                                    value={data.password}
                                    onChange={(e) => setData('password', e.target.value)}
                                    placeholder="••••••••"
                                    className="bg-transparent border-none outline-none focus:ring-0 text-sm text-surface-700 placeholder-surface-400 w-full"
                                    required
                                    autoFocus
                                    autoComplete="new-password"
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

                        {/* KONFIRMASI PASSWORD BARU */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold text-surface-600 uppercase tracking-wide">Konfirmasi Kata Sandi Baru</label>
                            <div className="flex items-center bg-surface-50 border border-surface-200 rounded-xl px-4 py-3 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-50 transition-all">
                                <svg className="w-5 h-5 text-surface-400 shrink-0 mr-3" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                                </svg>
                                <input
                                    id="password_confirmation"
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    name="password_confirmation"
                                    value={data.password_confirmation}
                                    onChange={(e) => setData('password_confirmation', e.target.value)}
                                    placeholder="••••••••"
                                    className="bg-transparent border-none outline-none focus:ring-0 text-sm text-surface-700 placeholder-surface-400 w-full"
                                    required
                                    autoComplete="new-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="text-surface-400 hover:text-surface-600 focus:outline-none transition-colors p-1"
                                >
                                    {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                            {errors.password_confirmation && <p className="text-xs text-red-500">{errors.password_confirmation}</p>}
                        </div>

                        <button
                            type="submit"
                            disabled={processing}
                            className="flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold py-3 px-4 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed mt-2 w-full animate-fade-in-up"
                        >
                            {processing ? (
                                <>Memperbarui Kata Sandi... <Loader2 className="animate-spin" size={18} /></>
                            ) : (
                                'Simpan Kata Sandi Baru'
                            )}
                        </button>

                        <Link
                            href={route('login')}
                            className="text-xs font-semibold text-center text-surface-500 hover:text-brand-600 transition-colors mt-2 w-full block"
                        >
                            Kembali ke Halaman Login
                        </Link>
                    </form>
                </div>
            </div>
        </div>
    );
}
