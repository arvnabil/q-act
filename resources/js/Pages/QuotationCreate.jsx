import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, usePage } from '@inertiajs/react';
import { X, ChevronRight, Plus, Trash2, Info, Loader2, ArrowLeft } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function QuotationCreate({ customers, bankAccounts, currentUser }) {
    const { flash } = usePage().props;

    const isManagerOrAdmin = ['Administrator', 'Sales Manager', 'Manager'].includes(currentUser?.role);
    const [mode, setMode] = useState('existing'); // 'existing' | 'new'
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Existing customer fields
    const [selectedCustomerId, setSelectedCustomerId] = useState('');
    const [selectedPicId, setSelectedPicId] = useState('');
    const [picForm, setPicForm] = useState({ name: '', phone: '', email: '' });
    const [editCompanyAddress, setEditCompanyAddress] = useState('');

    // New customer fields
    const [newCompanyName, setNewCompanyName] = useState('');
    const [newCompanyAddress, setNewCompanyAddress] = useState('');
    const [newPics, setNewPics] = useState([{ name: '', phone: '', email: '' }]);

    // Quotation info
    const [expiryDays, setExpiryDays] = useState(7);
    const [prefixType, setPrefixType] = useState(currentUser?.bu?.code ? 'bu' : 'personal');

    // When selected customer changes, auto-select primary PIC
    useEffect(() => {
        if (!selectedCustomerId || !customers) {
            setSelectedPicId('');
            setPicForm({ name: '', phone: '', email: '' });
            setEditCompanyAddress('');
            return;
        }
        const customer = customers.find(c => String(c.id) === String(selectedCustomerId));
        if (customer?.pics?.length > 0) {
            const primary = customer.pics.find(p => p.is_primary) || customer.pics[0];
            setSelectedPicId(String(primary.id));
            setPicForm({ name: primary.name || '', phone: primary.phone || '', email: primary.email || '' });
            setEditCompanyAddress(customer.address || '');
        } else {
            setSelectedPicId('');
            setPicForm({ name: '', phone: '', email: '' });
            setEditCompanyAddress('');
        }
    }, [selectedCustomerId]);

    const handlePicSelectChange = (picId) => {
        setSelectedPicId(picId);
        const customer = customers?.find(c => String(c.id) === String(selectedCustomerId));
        const pic = customer?.pics?.find(p => String(p.id) === String(picId));
        if (pic) setPicForm({ name: pic.name || '', phone: pic.phone || '', email: pic.email || '' });
    };

    const handleAddNewPicRow = () => setNewPics(prev => [...prev, { name: '', phone: '', email: '' }]);
    const handleRemoveNewPicRow = (index) => { if (newPics.length > 1) setNewPics(prev => prev.filter((_, i) => i !== index)); };
    const handleNewPicChange = (index, field, value) =>
        setNewPics(prev => prev.map((p, i) => i === index ? { ...p, [field]: value } : p));

    const handleSubmit = (e) => {
        e.preventDefault();
        if (mode === 'existing' && !selectedCustomerId) {
            toast.error('Silakan pilih customer terlebih dahulu.');
            return;
        }
        if (mode === 'new' && !newCompanyName.trim()) {
            toast.error('Nama PT / Perusahaan wajib diisi.');
            return;
        }
        if (mode === 'new' && !newPics[0]?.name.trim()) {
            toast.error('Minimal 1 data PIC wajib diisi.');
            return;
        }

        setIsSubmitting(true);

        const payload = {
            customer_id: selectedCustomerId,
            pic_id: selectedPicId && selectedPicId !== 'new' ? selectedPicId : null,
            expiry_days: expiryDays,
            prefix_type: prefixType,
            // new customer mode
            ...(mode === 'new' ? {
                new_customer_name: newCompanyName.trim(),
                new_customer_address: newCompanyAddress.trim() || null,
                new_pics: newPics.filter(p => p.name.trim()),
            } : {}),
        };

        router.post(route('quotations.store'), payload, {
            onError: (errors) => {
                setIsSubmitting(false);
                Object.values(errors).forEach(msg => toast.error(msg));
            },
            onFinish: () => setIsSubmitting(false),
        });
    };

    return (
        <AuthenticatedLayout>
            <Head title="Buat Quotation Baru" />
            <div className="animate-fade-in-up max-w-2xl mx-auto">
                {/* Header */}
                <div className="mb-6">
                    <button
                        onClick={() => router.visit(route('quotations.index'))}
                        className="flex items-center gap-2 text-sm font-semibold text-surface-500 hover:text-brand-600 mb-4 transition-colors cursor-pointer"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Kembali ke Daftar Quotation
                    </button>
                    <h1 className="text-xl font-bold text-surface-900">Buat Quotation Baru</h1>
                    <p className="text-sm text-surface-400 mt-1">Isi data customer & quotation, produk ditambahkan di langkah berikutnya</p>
                </div>

                {flash?.message && (
                    <div className="mb-4 px-4 py-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-medium rounded-xl">
                        {flash.message}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-surface-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-5 flex flex-col gap-6">
                        {/* Step 1: Data Customer */}
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <span className="w-5 h-5 rounded-full bg-brand-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0">1</span>
                                <span className="text-sm font-bold text-surface-800">Data Customer</span>
                            </div>

                            {/* Mode Toggle */}
                            <div className="flex items-center gap-1 p-1 bg-surface-100 rounded-lg mb-4 w-fit border border-surface-200">
                                <button type="button" onClick={() => setMode('existing')}
                                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${mode === 'existing' ? 'bg-white shadow-sm text-brand-700 font-bold' : 'text-surface-500 hover:text-surface-700'}`}>
                                    Pilih yang sudah ada
                                </button>
                                <button type="button" onClick={() => setMode('new')}
                                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${mode === 'new' ? 'bg-white shadow-sm text-brand-700 font-bold' : 'text-surface-500 hover:text-surface-700'}`}>
                                    + Customer baru
                                </button>
                            </div>

                            {/* Existing Customer */}
                            {mode === 'existing' && (
                                <div className="flex flex-col gap-3">
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-xs font-semibold text-surface-600">Nama Perusahaan</label>
                                        <select
                                            value={selectedCustomerId}
                                            onChange={e => setSelectedCustomerId(e.target.value)}
                                            className="bg-surface-50 border border-surface-200 rounded-lg px-3 py-2.5 text-sm text-surface-700 outline-none focus:border-brand-500 cursor-pointer"
                                        >
                                            <option value="">-- Pilih Customer --</option>
                                            {customers?.map(c => (
                                                <option key={c.id} value={c.id}>{c.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {selectedCustomerId && (
                                        <>
                                            <div className="flex flex-col gap-1.5 animate-fade-in">
                                                <label className="text-xs font-semibold text-surface-600">Alamat Lengkap Perusahaan</label>
                                                <textarea
                                                    placeholder="Alamat perusahaan..."
                                                    value={editCompanyAddress}
                                                    onChange={e => setEditCompanyAddress(e.target.value)}
                                                    rows={2}
                                                    className="w-full bg-surface-50 border border-surface-200 rounded-lg px-3 py-2 text-sm text-surface-700 outline-none focus:border-brand-500 transition-colors resize-y"
                                                />
                                            </div>

                                            <div className="flex flex-col gap-3 bg-surface-50/70 p-3.5 rounded-xl border border-surface-200 animate-fade-in">
                                                <div className="flex items-center justify-between">
                                                    <label className="text-xs font-semibold text-surface-600">Pilih / Ubah PIC untuk Quotation ini</label>
                                                    <button type="button"
                                                        onClick={() => { setSelectedPicId('new'); setPicForm({ name: '', phone: '', email: '' }); }}
                                                        className="flex items-center gap-1 text-xs font-bold text-brand-600 hover:text-brand-700 transition-colors cursor-pointer">
                                                        <Plus className="w-3.5 h-3.5" /> + Tambah PIC
                                                    </button>
                                                </div>

                                                {(() => {
                                                    const customer = customers?.find(c => c.id === selectedCustomerId);
                                                    const pics = customer?.pics || [];
                                                    return (
                                                        <div className="flex flex-col gap-1.5">
                                                            <label className="text-xs font-semibold text-surface-600">PIC</label>
                                                            <select
                                                                value={selectedPicId}
                                                                onChange={e => {
                                                                    if (e.target.value === 'new') { setSelectedPicId('new'); setPicForm({ name: '', phone: '', email: '' }); }
                                                                    else handlePicSelectChange(e.target.value);
                                                                }}
                                                                className="bg-white border border-surface-200 rounded-lg px-3 py-2.5 text-sm text-surface-700 outline-none focus:border-brand-500 cursor-pointer w-full"
                                                            >
                                                                <option value="">-- Pilih PIC --</option>
                                                                {pics.map(p => (
                                                                    <option key={p.id} value={String(p.id)}>
                                                                        {p.name}{p.is_primary ? ' (Utama)' : ''}{p.phone ? ` — ${p.phone}` : ''}{p.email ? ` / ${p.email}` : ''}
                                                                    </option>
                                                                ))}
                                                                <option value="new">+ Tambah PIC Baru...</option>
                                                            </select>
                                                        </div>
                                                    );
                                                })()}

                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                                    <input type="text" placeholder="Nama PIC" value={picForm.name} onChange={e => setPicForm({ ...picForm, name: e.target.value })} className="w-full min-w-0 bg-white border border-surface-200 rounded-lg px-3 py-2 text-sm text-surface-700 outline-none focus:border-brand-500 transition-colors" />
                                                    <input type="text" placeholder="No. Telp" value={picForm.phone} onChange={e => setPicForm({ ...picForm, phone: e.target.value })} className="w-full min-w-0 bg-white border border-surface-200 rounded-lg px-3 py-2 text-sm text-surface-700 outline-none focus:border-brand-500 transition-colors" />
                                                    <input type="email" placeholder="Email PIC" value={picForm.email} onChange={e => setPicForm({ ...picForm, email: e.target.value })} className="w-full min-w-0 bg-white border border-surface-200 rounded-lg px-3 py-2 text-sm text-surface-700 outline-none focus:border-brand-500 transition-colors" />
                                                </div>
                                                <p className="text-[11px] text-surface-400 flex items-center gap-1">
                                                    <Info className="w-3.5 h-3.5 text-surface-400 shrink-0" />
                                                    Pilih PIC yang akan tercantum dalam quotation ini.
                                                </p>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}

                            {/* New Customer */}
                            {mode === 'new' && (
                                <div className="flex flex-col gap-3 animate-fade-in">
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-xs font-semibold text-surface-600">Nama PT / Perusahaan <span className="text-red-400">*</span></label>
                                        <input type="text" placeholder="Contoh: PT. Maju Bersama" value={newCompanyName} onChange={e => setNewCompanyName(e.target.value)} className="w-full min-w-0 bg-surface-50 border border-surface-200 rounded-lg px-3 py-2.5 text-sm text-surface-700 outline-none focus:border-brand-500" />
                                    </div>
                                    <div className="flex flex-col gap-1.5 mt-1">
                                        <label className="text-xs font-semibold text-surface-600">Alamat Lengkap Perusahaan</label>
                                        <textarea placeholder="Contoh: Jl. Sudirman No. 1..." value={newCompanyAddress} onChange={e => setNewCompanyAddress(e.target.value)} rows={2} className="w-full bg-surface-50 border border-surface-200 rounded-lg px-3 py-2 text-sm text-surface-700 outline-none focus:border-brand-500 transition-colors resize-y" />
                                    </div>
                                    <div>
                                        <div className="flex items-center justify-between mb-1.5 mt-2">
                                            <label className="text-xs font-semibold text-surface-600">Daftar PIC <span className="text-red-400">*</span></label>
                                            <button type="button" onClick={handleAddNewPicRow} className="flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700 transition-colors cursor-pointer">
                                                <Plus className="w-3.5 h-3.5" /> Tambah PIC
                                            </button>
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            {newPics.map((p, idx) => (
                                                <div key={idx} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-surface-50/50 p-2 sm:p-0 rounded-lg sm:bg-transparent border border-surface-100 sm:border-none">
                                                    <input type="text" placeholder="Nama PIC" value={p.name} onChange={e => handleNewPicChange(idx, 'name', e.target.value)} className="flex-1 min-w-0 bg-surface-50 border border-surface-200 rounded-lg px-3 py-2 text-sm text-surface-700 outline-none focus:border-brand-500" />
                                                    <input type="text" placeholder="No. Telp" value={p.phone} onChange={e => handleNewPicChange(idx, 'phone', e.target.value)} className="flex-1 min-w-0 bg-surface-50 border border-surface-200 rounded-lg px-3 py-2 text-sm text-surface-700 outline-none focus:border-brand-500" />
                                                    <input type="email" placeholder="Email PIC" value={p.email} onChange={e => handleNewPicChange(idx, 'email', e.target.value)} className="flex-1 min-w-0 bg-surface-50 border border-surface-200 rounded-lg px-3 py-2 text-sm text-surface-700 outline-none focus:border-brand-500" />
                                                    <button type="button" onClick={() => handleRemoveNewPicRow(idx)} disabled={newPics.length <= 1}
                                                        className={`p-2 rounded-lg transition-colors cursor-pointer self-end sm:self-center shrink-0 ${newPics.length <= 1 ? 'text-surface-200 cursor-not-allowed' : 'text-surface-400 hover:text-red-500 hover:bg-red-50'}`}>
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="h-px bg-surface-100" />

                        {/* Step 2: Info Quotation */}
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <span className="w-5 h-5 rounded-full bg-brand-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0">2</span>
                                <span className="text-sm font-bold text-surface-800">Info Quotation</span>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-semibold text-surface-600">Sales (Pembuat)</label>
                                    <input type="text" value={currentUser?.name || ''} readOnly className="bg-surface-50 border border-surface-200 rounded-lg px-3 py-2.5 text-sm text-surface-700 outline-none opacity-60 cursor-default" />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-semibold text-surface-600">Masa Berlaku (Hari)</label>
                                    <input type="number" value={expiryDays} onChange={e => setExpiryDays(Number(e.target.value))} min="1" max="90" className="bg-surface-50 border border-surface-200 rounded-lg px-3 py-2.5 text-sm text-surface-700 outline-none focus:border-brand-500" />
                                </div>
                            </div>

                            {/* Prefix Selection if user has BU */}
                            {currentUser?.bu?.code && (
                                <div className="mt-3 bg-brand-50/60 rounded-xl p-3 border border-brand-100 flex flex-col gap-1.5">
                                    <label className="text-xs font-bold text-brand-800 uppercase tracking-wider">Prefix Nomor Quotation</label>
                                    <div className="flex items-center gap-4">
                                        <label className="flex items-center gap-2 text-xs font-medium text-surface-700 cursor-pointer">
                                            <input type="radio" name="prefixType" value="bu" checked={prefixType === 'bu'} onChange={() => setPrefixType('bu')} className="accent-brand-500" />
                                            <span>Kode BU: <strong className="font-mono text-brand-700">{currentUser.bu.code}</strong> ({currentUser.bu.name})</span>
                                        </label>
                                        {currentUser?.sales_code && (
                                            <label className="flex items-center gap-2 text-xs font-medium text-surface-700 cursor-pointer">
                                                <input type="radio" name="prefixType" value="personal" checked={prefixType === 'personal'} onChange={() => setPrefixType('personal')} className="accent-brand-500" />
                                                <span>Kode Sales: <strong className="font-mono text-surface-800">{currentUser.sales_code}</strong></span>
                                            </label>
                                        )}
                                    </div>
                                </div>
                            )}

                            <p className="text-xs text-surface-400 mt-3 flex items-center gap-1">
                                <Info className="w-3.5 h-3.5 text-brand-500 shrink-0" />
                                Produk, harga, dan syarat & ketentuan diisi di halaman berikutnya.
                            </p>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-4 border-t border-surface-100 flex justify-end gap-3 bg-surface-50/50">
                        <button type="button" onClick={() => router.visit(route('quotations.index'))}
                            className="px-4 py-2 text-sm font-semibold text-surface-600 border border-surface-200 rounded-lg hover:bg-surface-50 transition-colors cursor-pointer">
                            Batal
                        </button>
                        <button type="submit" disabled={isSubmitting}
                            className="flex items-center gap-2 px-5 py-2 text-sm font-semibold bg-brand-500 text-white rounded-lg hover:bg-brand-600 shadow-sm hover:shadow transition-all cursor-pointer disabled:opacity-60">
                            {isSubmitting ? (
                                <><Loader2 className="w-4 h-4 animate-spin" /> Menyimpan...</>
                            ) : (
                                <><ChevronRight className="w-4 h-4" /> Lanjut &amp; Isi Produk</>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </AuthenticatedLayout>
    );
}
