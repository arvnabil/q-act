import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { X, User, Mail, Phone, Briefcase, Star, Loader2, Plus } from 'lucide-react';
import { useForm } from '@inertiajs/react';

export default function AddCustomerPicModal({ isOpen, onClose, customerId }) {
    if (!isOpen) return null;

    const form = useForm({
        name: '',
        position: '',
        email: '',
        phone: '',
        is_primary: false,
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        form.post(route('customers.pics.store', customerId), {
            preserveScroll: true,
            onSuccess: () => {
                form.reset();
                onClose();
            },
        });
    };

    return ReactDOM.createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-900/40 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-surface-200 overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="p-5 border-b border-surface-100 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center text-brand-600 shrink-0">
                            <User className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-surface-900 leading-tight">Tambah PIC Baru</h2>
                            <p className="text-xs text-surface-500">Tambahkan kontak person untuk customer ini</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={form.processing}
                        className="text-surface-400 hover:text-surface-600 p-1.5 rounded-lg hover:bg-surface-100 transition-colors cursor-pointer"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Form Body */}
                <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-surface-700 mb-1">
                            Nama Lengkap <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                            <User className="w-4 h-4 text-surface-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                required
                                value={form.data.name}
                                onChange={e => form.setData('name', e.target.value)}
                                disabled={form.processing}
                                placeholder="mis. Budi Santoso"
                                className="w-full pl-9 pr-3 py-2 text-sm bg-surface-50 border border-surface-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-brand-500 transition-all"
                            />
                        </div>
                        {form.errors.name && <p className="mt-1 text-xs text-red-600">{form.errors.name}</p>}
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-surface-700 mb-1">
                            Jabatan / Posisi
                        </label>
                        <div className="relative">
                            <Briefcase className="w-4 h-4 text-surface-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                value={form.data.position}
                                onChange={e => form.setData('position', e.target.value)}
                                disabled={form.processing}
                                placeholder="mis. Procurement Manager"
                                className="w-full pl-9 pr-3 py-2 text-sm bg-surface-50 border border-surface-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-brand-500 transition-all"
                            />
                        </div>
                        {form.errors.position && <p className="mt-1 text-xs text-red-600">{form.errors.position}</p>}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-surface-700 mb-1">
                                Email
                            </label>
                            <div className="relative">
                                <Mail className="w-4 h-4 text-surface-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                <input
                                    type="email"
                                    value={form.data.email}
                                    onChange={e => form.setData('email', e.target.value)}
                                    disabled={form.processing}
                                    placeholder="nama@perusahaan.com"
                                    className="w-full pl-9 pr-3 py-2 text-sm bg-surface-50 border border-surface-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-brand-500 transition-all"
                                />
                            </div>
                            {form.errors.email && <p className="mt-1 text-xs text-red-600">{form.errors.email}</p>}
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-surface-700 mb-1">
                                No. Telepon / WA
                            </label>
                            <div className="relative">
                                <Phone className="w-4 h-4 text-surface-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                <input
                                    type="tel"
                                    value={form.data.phone}
                                    onChange={e => form.setData('phone', e.target.value)}
                                    disabled={form.processing}
                                    placeholder="08123456789"
                                    className="w-full pl-9 pr-3 py-2 text-sm bg-surface-50 border border-surface-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-brand-500 transition-all"
                                />
                            </div>
                            {form.errors.phone && <p className="mt-1 text-xs text-red-600">{form.errors.phone}</p>}
                        </div>
                    </div>

                    <label className="flex items-center gap-2 p-3 bg-surface-50 rounded-xl border border-surface-200 cursor-pointer select-none hover:bg-surface-100/70 transition-colors">
                        <input
                            type="checkbox"
                            checked={form.data.is_primary}
                            onChange={e => form.setData('is_primary', e.target.checked)}
                            disabled={form.processing}
                            className="rounded border-surface-300 text-brand-600 focus:ring-brand-400 cursor-pointer"
                        />
                        <span className="text-xs font-semibold text-surface-700 flex items-center gap-1.5">
                            <Star className="w-3.5 h-3.5 text-amber-500" />
                            Jadikan PIC Utama customer ini
                        </span>
                    </label>

                    {/* Footer Actions */}
                    <div className="pt-3 border-t border-surface-100 flex items-center justify-end gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={form.processing}
                            className="px-4 py-2 text-xs font-semibold border border-surface-200 rounded-xl text-surface-600 hover:bg-surface-50 transition-colors cursor-pointer"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={form.processing}
                            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-all shadow-sm cursor-pointer disabled:opacity-50"
                        >
                            {form.processing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                            {form.processing ? 'Menyimpan...' : 'Tambah PIC'}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
}
