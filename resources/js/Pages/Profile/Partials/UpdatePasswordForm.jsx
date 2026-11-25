import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import { Transition } from '@headlessui/react';
import { useForm } from '@inertiajs/react';
import { useRef } from 'react';

export default function UpdatePasswordForm({ className = '' }) {
    const passwordInput = useRef();
    const currentPasswordInput = useRef();
    const { data, setData, errors, put, reset, processing, recentlySuccessful } = useForm({
        current_password: '',
        password: '',
        password_confirmation: '',
    });

    const updatePassword = (event) => {
        event.preventDefault();
        put(route('password.update'), {
            preserveScroll: true,
            onSuccess: () => reset(),
            onError: (formErrors) => {
                if (formErrors.password) {
                    reset('password', 'password_confirmation');
                    passwordInput.current?.focus();
                }
                if (formErrors.current_password) {
                    reset('current_password');
                    currentPasswordInput.current?.focus();
                }
            },
        });
    };

    const inputClass = 'mt-1.5 block w-full rounded-xl border-surface-200 bg-surface-50/50 px-3.5 py-2.5 text-sm text-surface-800 shadow-none focus:border-brand-500 focus:ring-brand-500/20';
    const labelClass = 'text-xs font-semibold text-surface-600';

    return (
        <section className={className}>
            <form onSubmit={updatePassword} className="space-y-4">
                <div>
                    <InputLabel htmlFor="current_password" value="Kata Sandi Saat Ini" className={labelClass} />
                    <TextInput id="current_password" ref={currentPasswordInput} value={data.current_password} onChange={(event) => setData('current_password', event.target.value)} type="password" className={inputClass} autoComplete="current-password" />
                    <InputError message={errors.current_password} className="mt-1.5" />
                </div>
                <div>
                    <InputLabel htmlFor="password" value="Kata Sandi Baru" className={labelClass} />
                    <TextInput id="password" ref={passwordInput} value={data.password} onChange={(event) => setData('password', event.target.value)} type="password" className={inputClass} autoComplete="new-password" />
                    <InputError message={errors.password} className="mt-1.5" />
                </div>
                <div>
                    <InputLabel htmlFor="password_confirmation" value="Konfirmasi Kata Sandi Baru" className={labelClass} />
                    <TextInput id="password_confirmation" value={data.password_confirmation} onChange={(event) => setData('password_confirmation', event.target.value)} type="password" className={inputClass} autoComplete="new-password" />
                    <InputError message={errors.password_confirmation} className="mt-1.5" />
                </div>
                <div className="flex flex-wrap items-center gap-3 pt-1">
                    <PrimaryButton disabled={processing} className="rounded-lg bg-brand-600 px-4 py-2.5 text-[11px] tracking-wide hover:bg-brand-700 focus:bg-brand-700 focus:ring-brand-500 active:bg-brand-800">
                        {processing ? 'Memperbarui…' : 'Perbarui Kata Sandi'}
                    </PrimaryButton>
                    <Transition show={recentlySuccessful} enter="transition ease-out duration-200" enterFrom="opacity-0 translate-y-1" enterTo="opacity-100 translate-y-0" leave="transition ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0">
                        <p className="text-xs font-medium text-emerald-700">Kata sandi berhasil diperbarui.</p>
                    </Transition>
                </div>
            </form>
        </section>
    );
}
