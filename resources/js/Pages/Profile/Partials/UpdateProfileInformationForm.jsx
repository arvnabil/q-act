import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import { Transition } from '@headlessui/react';
import { Link, useForm, usePage } from '@inertiajs/react';

export default function UpdateProfileInformation({ mustVerifyEmail, status, className = '' }) {
    const user = usePage().props.auth.user;
    const { data, setData, patch, errors, processing, recentlySuccessful } = useForm({
        name: user.name || '',
        email: user.email || '',
    });

    const submit = (event) => {
        event.preventDefault();
        patch(route('profile.update'), { preserveScroll: true });
    };

    const inputClass = 'mt-1.5 block w-full rounded-xl border-surface-200 bg-surface-50/50 px-3.5 py-2.5 text-sm text-surface-800 shadow-none focus:border-brand-500 focus:ring-brand-500/20';
    const labelClass = 'text-xs font-semibold text-surface-600';

    return (
        <section className={className}>
            <form onSubmit={submit} className="space-y-4">
                <div>
                    <InputLabel htmlFor="name" value="Nama Lengkap" className={labelClass} />
                    <TextInput id="name" className={inputClass} value={data.name} onChange={(event) => setData('name', event.target.value)} required isFocused autoComplete="name" />
                    <InputError className="mt-1.5" message={errors.name} />
                </div>

                <div>
                    <InputLabel htmlFor="email" value="Alamat Email" className={labelClass} />
                    <TextInput id="email" type="email" className={inputClass} value={data.email} onChange={(event) => setData('email', event.target.value)} required autoComplete="username" />
                    <InputError className="mt-1.5" message={errors.email} />
                </div>

                {mustVerifyEmail && user.email_verified_at === null && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                        <p>Email Anda belum diverifikasi.{' '}
                            <Link href={route('verification.send')} method="post" as="button" className="font-semibold underline underline-offset-2">Kirim ulang email verifikasi</Link>
                        </p>
                        {status === 'verification-link-sent' && <p className="mt-1 font-medium text-emerald-700">Tautan verifikasi baru telah dikirim.</p>}
                    </div>
                )}

                <div className="flex flex-wrap items-center gap-3 pt-1">
                    <PrimaryButton disabled={processing} className="rounded-lg bg-brand-600 px-4 py-2.5 text-[11px] tracking-wide hover:bg-brand-700 focus:bg-brand-700 focus:ring-brand-500 active:bg-brand-800">
                        {processing ? 'Menyimpan…' : 'Simpan Profil'}
                    </PrimaryButton>
                    <Transition show={recentlySuccessful} enter="transition ease-out duration-200" enterFrom="opacity-0 translate-y-1" enterTo="opacity-100 translate-y-0" leave="transition ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0">
                        <p className="text-xs font-medium text-emerald-700">Perubahan tersimpan.</p>
                    </Transition>
                </div>
            </form>
        </section>
    );
}
