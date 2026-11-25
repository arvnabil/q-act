import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import DeleteUserForm from './Partials/DeleteUserForm';
import UpdatePasswordForm from './Partials/UpdatePasswordForm';
import UpdateProfileInformationForm from './Partials/UpdateProfileInformationForm';
import { CircleUserRound, KeyRound, ShieldCheck, Sparkles } from 'lucide-react';
import { usePage } from '@inertiajs/react';

export default function Edit({ mustVerifyEmail, status }) {
    const { auth } = usePage().props;
    const user = auth?.user || {};
    const initials = (user.name || user.email || 'Q').split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();

    return (
        <AuthenticatedLayout>
            <Head title="Profil Pengguna" />

            <div className="mx-auto w-full max-w-6xl space-y-5">
                <section className="overflow-hidden rounded-2xl border border-surface-200 bg-white shadow-sm">
                    <div className="h-1.5 bg-gradient-to-r from-brand-600 via-teal-500 to-emerald-400" />
                    <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-7">
                        <div className="flex items-center gap-4">
                            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-xl font-bold text-brand-700 ring-1 ring-brand-100">
                                {initials}
                            </div>
                            <div className="min-w-0">
                                <div className="mb-1 flex flex-wrap items-center gap-2">
                                    <Sparkles className="h-4 w-4 text-amber-500" />
                                    <span className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-700">Akun QSales</span>
                                </div>
                                <h1 className="truncate text-xl font-bold text-surface-900 sm:text-2xl">{user.name || 'Profil Pengguna'}</h1>
                                <p className="mt-1 truncate text-sm text-surface-500">{user.email || 'Kelola informasi akun Anda'}</p>
                            </div>
                        </div>
                        <div className="inline-flex w-fit items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-3.5 py-2.5 text-xs font-semibold text-emerald-800">
                            <ShieldCheck className="h-4 w-4" />
                            {user.spatie_role || user.role || 'Pengguna'}
                        </div>
                    </div>
                </section>

                <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                    <section className="rounded-2xl border border-surface-200 bg-white p-5 shadow-sm sm:p-6">
                        <div className="mb-5 flex items-start gap-3 border-b border-surface-100 pb-4">
                            <div className="rounded-xl bg-brand-50 p-2.5 text-brand-700"><CircleUserRound className="h-5 w-5" /></div>
                            <div>
                                <h2 className="text-base font-bold text-surface-900">Informasi Profil</h2>
                                <p className="mt-1 text-xs leading-relaxed text-surface-500">Perbarui nama dan alamat email akun QSales Anda.</p>
                            </div>
                        </div>
                        <UpdateProfileInformationForm mustVerifyEmail={mustVerifyEmail} status={status} />
                    </section>

                    <section className="rounded-2xl border border-surface-200 bg-white p-5 shadow-sm sm:p-6">
                        <div className="mb-5 flex items-start gap-3 border-b border-surface-100 pb-4">
                            <div className="rounded-xl bg-sky-50 p-2.5 text-sky-700"><KeyRound className="h-5 w-5" /></div>
                            <div>
                                <h2 className="text-base font-bold text-surface-900">Keamanan Akun</h2>
                                <p className="mt-1 text-xs leading-relaxed text-surface-500">Gunakan kata sandi yang kuat dan unik untuk melindungi akun.</p>
                            </div>
                        </div>
                        <UpdatePasswordForm />
                    </section>
                </div>

                <section className="rounded-2xl border border-rose-200 bg-white p-5 shadow-sm sm:p-6">
                    <DeleteUserForm />
                </section>
            </div>
        </AuthenticatedLayout>
    );
}
