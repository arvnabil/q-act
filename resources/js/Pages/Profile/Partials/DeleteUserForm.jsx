import DangerButton from '@/Components/DangerButton';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import Modal from '@/Components/Modal';
import SecondaryButton from '@/Components/SecondaryButton';
import TextInput from '@/Components/TextInput';
import { useForm } from '@inertiajs/react';
import { useRef, useState } from 'react';
import { AlertTriangle } from 'lucide-react';

export default function DeleteUserForm({ className = '' }) {
    const [confirmingUserDeletion, setConfirmingUserDeletion] = useState(false);
    const passwordInput = useRef();

    const {
        data,
        setData,
        delete: destroy,
        processing,
        reset,
        errors,
        clearErrors,
    } = useForm({
        password: '',
    });

    const confirmUserDeletion = () => {
        setConfirmingUserDeletion(true);
    };

    const deleteUser = (e) => {
        e.preventDefault();

        destroy(route('profile.destroy'), {
            preserveScroll: true,
            onSuccess: () => closeModal(),
            onError: () => passwordInput.current.focus(),
            onFinish: () => reset(),
        });
    };

    const closeModal = () => {
        setConfirmingUserDeletion(false);

        clearErrors();
        reset();
    };

    return (
        <section className={`flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between ${className}`}>
            <div className="flex items-start gap-3">
                <div className="rounded-xl bg-rose-50 p-2.5 text-rose-600"><AlertTriangle className="h-5 w-5" /></div>
                <div>
                    <h2 className="text-sm font-bold text-rose-900">Hapus Akun</h2>
                    <p className="mt-1 max-w-2xl text-xs leading-relaxed text-surface-500">Tindakan ini menghapus akun dan data terkait secara permanen. Anda akan diminta memasukkan kata sandi untuk mengonfirmasi.</p>
                </div>
            </div>

            <DangerButton onClick={confirmUserDeletion} className="shrink-0 rounded-lg px-4 py-2.5 text-[11px]">
                Hapus Akun
            </DangerButton>

            <Modal show={confirmingUserDeletion} onClose={closeModal}>
                <form onSubmit={deleteUser} className="p-6">
                    <h2 className="text-lg font-semibold text-surface-900">
                        Yakin ingin menghapus akun?
                    </h2>

                    <p className="mt-1 text-sm text-surface-600">
                        Semua sumber daya dan data terkait akan dihapus permanen. Masukkan kata sandi untuk melanjutkan.
                    </p>

                    <div className="mt-6">
                        <InputLabel
                            htmlFor="password"
                            value="Kata Sandi"
                            className="sr-only"
                        />

                        <TextInput
                            id="password"
                            type="password"
                            name="password"
                            ref={passwordInput}
                            value={data.password}
                            onChange={(e) =>
                                setData('password', e.target.value)
                            }
                            className="mt-1.5 block w-full rounded-xl border-surface-200 focus:border-brand-500 focus:ring-brand-500/20"
                            isFocused
                            placeholder="Kata sandi saat ini"
                        />

                        <InputError
                            message={errors.password}
                            className="mt-2"
                        />
                    </div>

                    <div className="mt-6 flex justify-end">
                        <SecondaryButton onClick={closeModal} className="rounded-lg">
                            Batal
                        </SecondaryButton>

                        <DangerButton className="ms-3" disabled={processing}>
                            Hapus Permanen
                        </DangerButton>
                    </div>
                </form>
            </Modal>
        </section>
    );
}
