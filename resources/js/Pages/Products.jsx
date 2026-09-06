import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Pagination from '@/Components/Pagination';
import { Head, usePage, router } from '@inertiajs/react';
import {
    Search, Plus, Filter, Image as ImageIcon, Edit, Trash2, Box, X, Loader2,
    UploadCloud, LayoutGrid, List as ListIcon, AlertCircle, Upload, FileSpreadsheet,
    CheckCircle, XCircle, Download, AlertTriangle,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { saveAs } from 'file-saver';
import axios from 'axios';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

const formatCurrency = (val) =>
    new Intl.NumberFormat('id-ID', {
        style: 'currency', currency: 'IDR', minimumFractionDigits: 0,
    }).format(val || 0);

const getImageUrl = (url) => {
    if (!url) return null;
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
        return url;
    }
    if (url.startsWith('/')) {
        return url;
    }
    return `/${url}`;
};

const EditableCurrencyInput = ({ value, onChange, className, placeholder }) => {
    const [isFocused, setIsFocused] = useState(false);
    return (
        <input
            type={isFocused ? "number" : "text"}
            min="0"
            placeholder={placeholder}
            value={isFocused ? (value ?? '') : (value ? formatCurrency(value) : '')}
            onFocus={() => setIsFocused(true)}
            onChange={e => onChange(e.target.value)}
            onBlur={() => setIsFocused(false)}
            className={className}
        />
    );
};

const getBrandStyles = (colorHex) => {
    const hex = colorHex || '#6366f1';
    return {
        backgroundColor: `${hex}15`,
        color: hex,
        border: `1px solid ${hex}30`,
    };
};

const EMPTY_PRODUCT = {
    sku: '',
    name: '',
    brand_id: '',
    pricelist_distributor: '',
    diskon_distributor: '',
    modal: '',
    price: '',
    description: '',
    image_url: ''
};

const COLUMN_MAP = {
    'sku': 'sku', 'SKU': 'sku',
    'name': 'name', 'Nama Produk': 'name', 'Nama': 'name', 'nama': 'name',
    'brand': 'brand', 'Brand': 'brand', 'BRAND': 'brand',
    'description': 'description', 'Deskripsi': 'description', 'deskripsi': 'description',
    'price': 'price', 'Harga Jual': 'price', 'harga_jual': 'price', 'Harga': 'price',
    'pricelist_distributor': 'pricelist_distributor', 'Pricelist Distributor': 'pricelist_distributor', 'Pricelist': 'pricelist_distributor',
    'diskon_distributor': 'diskon_distributor', 'Diskon Distributor': 'diskon_distributor', 'Diskon (%)': 'diskon_distributor', 'Diskon': 'diskon_distributor',
    'modal': 'modal', 'Modal': 'modal', 'HPP': 'modal', 'Harga Modal': 'modal', 'Modal / HPP': 'modal',
};

export default function Products({ products = [], brands = [] }) {
    const { flash } = usePage().props;

    const [search, setSearch] = useState('');
    const [brandFilter, setBrandFilter] = useState('all');
    const [viewMode, setViewMode] = useState('list'); // 'grid' | 'list'
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [selectedSkus, setSelectedSkus] = useState([]);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [newProduct, setNewProduct] = useState(EMPTY_PRODUCT);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Image Upload & Preview State
    const [isUploading, setIsUploading] = useState(false);
    const [imagePreview, setImagePreview] = useState(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef(null);

    // Modals state
    const [deleteModal, setDeleteModal] = useState({ open: false, product: null, isBulk: false });
    const [errorModal, setErrorModal] = useState({ open: false, title: '', message: '' });

    // Quick Add Brand State
    const [showAddBrandModal, setShowAddBrandModal] = useState(false);
    const [quickBrand, setQuickBrand] = useState({ name: '', color_hex: '#6366f1' });
    const [isCreatingBrand, setIsCreatingBrand] = useState(false);

    // === Import Modal State ===
    const [showImportModal, setShowImportModal] = useState(false);
    const [importStep, setImportStep] = useState('upload'); // 'upload' | 'preview' | 'result'
    const [importRows, setImportRows] = useState([]);
    const [importErrors, setImportErrors] = useState([]);
    const [importResult, setImportResult] = useState(null);
    const [isImporting, setIsImporting] = useState(false);
    const importFileInputRef = useRef(null);
    const shownFlashRef = useRef({ message: null, error: null });

    useEffect(() => { setPage(1); setSelectedSkus([]); }, [search, brandFilter, viewMode, pageSize]);

    // Flash Toast Notifications — guard against duplicate toasts on re-render
    useEffect(() => {
        if (flash?.message && flash.message !== shownFlashRef.current.message) {
            shownFlashRef.current.message = flash.message;
            toast.success(flash.message);
        }
        if (flash?.error && flash.error !== shownFlashRef.current.error) {
            shownFlashRef.current.error = flash.error;
            toast.error(flash.error);
        }
    }, [flash?.message, flash?.error]);

    // Auto-calculate modal (HPP) from pricelist & discount
    const handleProductPriceChange = (field, value) => {
        setNewProduct(prev => {
            const updated = { ...prev, [field]: value };
            const pricelist = Number(field === 'pricelist_distributor' ? value : prev.pricelist_distributor) || 0;
            if (field === 'pricelist_distributor' || field === 'diskon_distributor') {
                const diskon = Number(field === 'diskon_distributor' ? value : prev.diskon_distributor) || 0;
                updated.modal = pricelist > 0 ? Math.round(pricelist * (1 - diskon / 100)) : '';
            } else if (field === 'modal') {
                const modal = Number(value) || 0;
                if (pricelist > 0) {
                    const calcDiskon = (1 - (modal / pricelist)) * 100;
                    updated.diskon_distributor = calcDiskon > 0 ? parseFloat(calcDiskon.toFixed(2)) : 0;
                }
            }
            return updated;
        });
    };

    // Filter products
    const filteredProducts = (products || []).filter(p => {
        const matchBrand = brandFilter === 'all' || String(p.brand_id) === String(brandFilter);
        if (!matchBrand) return false;
        if (!search) return true;
        const s = search.toLowerCase();
        return (
            p.sku?.toLowerCase().includes(s) ||
            p.name?.toLowerCase().includes(s) ||
            p.brand?.name?.toLowerCase().includes(s) ||
            p.description?.toLowerCase().includes(s)
        );
    });

    const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
    const safePage = Math.min(page, totalPages);
    const pageItems = filteredProducts.slice((safePage - 1) * pageSize, safePage * pageSize);

    const isAllSelected = pageItems.length > 0 && pageItems.every(p => selectedSkus.includes(p.sku));
    const handleToggleSelectAll = () => {
        if (isAllSelected) {
            setSelectedSkus(prev => prev.filter(s => !pageItems.some(p => p.sku === s)));
        } else {
            const next = [...selectedSkus];
            pageItems.forEach(p => { if (!next.includes(p.sku)) next.push(p.sku); });
            setSelectedSkus(next);
        }
    };
    const handleToggleSelect = (sku) =>
        setSelectedSkus(prev => prev.includes(sku) ? prev.filter(s => s !== sku) : [...prev, sku]);

    // Modal Control
    const openCreate = () => {
        setEditingProduct(null);
        setImagePreview(null);
        setSelectedFile(null);
        setNewProduct(EMPTY_PRODUCT);
        setIsModalOpen(true);
    };

    const openEdit = (p) => {
        setEditingProduct(p);
        setImagePreview(p.image_url || null);
        setSelectedFile(null);
        setNewProduct({
            sku: p.sku || '',
            name: p.name || '',
            brand_id: p.brand_id || '',
            pricelist_distributor: p.pricelist_distributor || '',
            diskon_distributor: p.diskon_distributor || '',
            modal: p.modal || '',
            price: p.price || '',
            description: p.description || '',
            image_url: p.image_url || '',
        });
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingProduct(null);
        setImagePreview(null);
        setSelectedFile(null);
        setNewProduct(EMPTY_PRODUCT);
    };

    // Image Upload Handlers
    const processFile = (file) => {
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            toast.error('File harus berupa gambar (PNG, JPG, WEBP)');
            return;
        }
        if (file.size > 2 * 1024 * 1024) {
            toast.error('Ukuran gambar maksimal 2MB');
            return;
        }
        setSelectedFile(file);
        const reader = new FileReader();
        reader.onload = (ev) => setImagePreview(ev.target.result);
        reader.readAsDataURL(file);
    };

    const handleImageSelect = (e) => processFile(e.target.files[0]);
    const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
    const handleDragLeave = (e) => { e.preventDefault(); setIsDragging(false); };
    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            processFile(e.dataTransfer.files[0]);
        }
    };

    // Save Product (Create / Edit)
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!newProduct.sku) return toast.error('SKU Produk wajib diisi');
        if (!newProduct.brand_id) return toast.error('Silakan pilih brand produk');

        setIsSubmitting(true);
        let finalImageUrl = newProduct.image_url;

        try {
            // Upload file image if newly selected
            if (selectedFile) {
                toast.loading('Mengunggah gambar...', { id: 'upload_toast' });
                const formData = new FormData();
                formData.append('image', selectedFile);
                formData.append('sku', newProduct.sku);

                const res = await axios.post(route('products.upload-image'), formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                if (res.data?.url) {
                    finalImageUrl = res.data.url;
                    toast.success('Gambar berhasil diunggah!', { id: 'upload_toast' });
                }
            }
        } catch (err) {
            toast.error('Gagal mengunggah gambar: ' + (err.response?.data?.message || err.message), { id: 'upload_toast' });
            setIsSubmitting(false);
            return;
        }

        const payload = {
            sku: String(newProduct.sku || '').trim().toUpperCase(),
            name: String(newProduct.name || '').trim(),
            brand_id: newProduct.brand_id ? newProduct.brand_id : null,
            description: newProduct.description ? String(newProduct.description).trim() : null,
            image_url: finalImageUrl ? String(finalImageUrl).trim() : null,
            price: Number(newProduct.price) || 0,
            modal: Number(newProduct.modal) || 0,
            pricelist_distributor: Number(newProduct.pricelist_distributor) || 0,
            diskon_distributor: Number(newProduct.diskon_distributor) || 0,
        };

        const routeOpts = {
            onSuccess: () => {
                closeModal();
                setIsSubmitting(false);
                toast.success(editingProduct ? 'Produk berhasil diperbarui! ✨' : 'Produk berhasil ditambahkan! 🎉');
            },
            onError: (errs) => {
                setIsSubmitting(false);
                const msg = Object.values(errs || {})[0];
                toast.error(msg || 'Gagal menyimpan data.');
            },
            preserveScroll: true,
        };

        if (editingProduct) {
            router.put(route('products.update', editingProduct.sku), payload, routeOpts);
        } else {
            router.post(route('products.store'), payload, routeOpts);
        }
    };

    // Quick Add Brand
    const handleQuickCreateBrand = async (e) => {
        e.preventDefault();
        if (!quickBrand.name.trim()) return toast.error('Nama Brand wajib diisi');
        setIsCreatingBrand(true);
        try {
            const res = await axios.post(route('brands.store'), quickBrand, {
                headers: { 'Accept': 'application/json' }
            });
            if (res.data?.brand) {
                toast.success('Brand berhasil ditambahkan! 🏷️');
                setNewProduct(prev => ({ ...prev, brand_id: res.data.brand.id }));
                setShowAddBrandModal(false);
                setQuickBrand({ name: '', color_hex: '#6366f1' });
                router.reload({ only: ['brands'] });
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Gagal menambahkan brand');
        } finally {
            setIsCreatingBrand(false);
        }
    };

    // Delete Handlers
    const confirmDeleteSingle = (product) => {
        setDeleteModal({ open: true, product, isBulk: false });
    };

    const confirmDeleteBulk = () => {
        if (selectedSkus.length === 0) return;
        setDeleteModal({ open: true, product: null, isBulk: true });
    };

    const handleExecuteDelete = () => {
        if (deleteModal.isBulk) {
            const count = selectedSkus.length;
            router.post(route('products.destroy.mass'), { skus: selectedSkus }, {
                preserveScroll: true,
                onSuccess: () => {
                    setDeleteModal({ open: false, product: null, isBulk: false });
                    setSelectedSkus([]);
                    toast.success(`${count} produk berhasil dihapus! 🗑️`);
                },
                onError: (err) => {
                    setDeleteModal({ open: false, product: null, isBulk: false });
                    setErrorModal({
                        open: true,
                        title: 'Gagal Menghapus Produk',
                        message: 'Beberapa produk tidak dapat dihapus karena masih digunakan dalam dokumen Quotation.'
                    });
                }
            });
        } else if (deleteModal.product) {
            const p = deleteModal.product;
            router.delete(route('products.destroy', p.sku), {
                preserveScroll: true,
                onSuccess: () => {
                    setDeleteModal({ open: false, product: null, isBulk: false });
                    setSelectedSkus(prev => prev.filter(s => s !== p.sku));
                    toast.success('Produk berhasil dihapus! 🗑️');
                },
                onError: (err) => {
                    setDeleteModal({ open: false, product: null, isBulk: false });
                    setErrorModal({
                        open: true,
                        title: 'Gagal Menghapus Produk',
                        message: `Produk "${p.name}" tidak dapat dihapus karena masih digunakan dalam dokumen Quotation.`
                    });
                }
            });
        }
    };

    // Excel Export / Template
    const handleDownloadTemplate = () => {
        import('xlsx').then(XLSX => {
            const headers = [['SKU', 'Nama Produk', 'Brand', 'Deskripsi', 'Harga Jual', 'Pricelist Distributor', 'Diskon (%)', 'Modal / HPP']];
            const ws = XLSX.utils.aoa_to_sheet(headers);
            ws['!cols'] = [{ wch: 20 }, { wch: 40 }, { wch: 20 }, { wch: 40 }, { wch: 15 }, { wch: 22 }, { wch: 12 }, { wch: 15 }];
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Products');
            const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
            const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            saveAs(blob, 'template_import_produk.xlsx');
        });
    };

    const handleExportProducts = () => {
        if (!filteredProducts || filteredProducts.length === 0) {
            toast.error('Tidak ada data produk untuk di-export.');
            return;
        }

        import('xlsx').then(XLSX => {
            const headers = [['SKU', 'Nama Produk', 'Brand', 'Deskripsi', 'Harga Jual', 'Pricelist Distributor', 'Diskon (%)', 'Modal / HPP']];
            const dataRows = filteredProducts.map(p => [
                p.sku || '',
                p.name || '',
                p.brand?.name || '',
                p.description || '',
                p.price || 0,
                p.pricelist_distributor || 0,
                p.diskon_distributor || 0,
                p.modal || 0
            ]);

            const ws = XLSX.utils.aoa_to_sheet([...headers, ...dataRows]);
            ws['!cols'] = [
                { wch: 20 }, { wch: 40 }, { wch: 20 }, { wch: 40 },
                { wch: 15 }, { wch: 22 }, { wch: 12 }, { wch: 15 }
            ];
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Products');
            const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
            const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const timestamp = new Date().toISOString().split('T')[0];
            saveAs(blob, `export_produk_${timestamp}.xlsx`);
            toast.success('Data produk berhasil diexport ke Excel! 📥');
        });
    };

    // Excel Import Logic
    const handleImportFile = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const parseNum = (val) => {
            if (val === '' || val === null || val === undefined) return 0;
            if (typeof val === 'number') return val;
            const str = String(val).replace(/Rp\.?\s*/gi, '').replace(/[$€¥]/g, '').trim();
            const dotCount = (str.match(/\./g) || []).length;
            const commaCount = (str.match(/,/g) || []).length;
            let normalized;
            if (dotCount > 1) {
                normalized = str.replace(/\./g, '').replace(',', '.');
            } else if (commaCount > 1) {
                normalized = str.replace(/,/g, '');
            } else {
                normalized = str.replace(/,/g, '').replace(/\.(?=\d{3}$)/, '');
            }
            const result = parseFloat(normalized);
            return isNaN(result) ? 0 : result;
        };

        import('xlsx').then(XLSX => {
            const reader = new FileReader();
            reader.onload = (ev) => {
                try {
                    const wb = XLSX.read(ev.target.result, { type: 'binary' });
                    const ws = wb.Sheets[wb.SheetNames[0]];
                    const raw = XLSX.utils.sheet_to_json(ws, { defval: '' });
                    if (!raw || raw.length === 0) {
                        toast.error('File Excel kosong atau formatnya tidak dikenali.');
                        return;
                    }
                    const mapped = raw.map((row, i) => {
                        const obj = {};
                        Object.keys(row).forEach(k => {
                            const mapped_key = COLUMN_MAP[k.trim()];
                            if (mapped_key) obj[mapped_key] = row[k];
                        });
                        ['price', 'pricelist_distributor', 'diskon_distributor', 'modal'].forEach(f => {
                            if (obj[f] !== undefined) {
                                const parsedVal = parseNum(obj[f]);
                                obj[f] = f === 'diskon_distributor' ? parsedVal : Math.round(parsedVal);
                            }
                        });
                        const pl = obj.pricelist_distributor || 0;
                        const dk = obj.diskon_distributor || 0;
                        const md = obj.modal || 0;
                        if (pl > 0) {
                            if (md > 0 && dk === 0) {
                                obj.diskon_distributor = parseFloat(((1 - md / pl) * 100).toFixed(2));
                            } else if (md === 0) {
                                obj.modal = Math.round(pl * (1 - dk / 100));
                            }
                        }
                        if (obj.sku) obj.sku = String(obj.sku).trim().toUpperCase();
                        return { _rowNum: i + 2, ...obj };
                    });

                    const errors = [];
                    const skuSeen = new Map();
                    mapped.forEach(r => {
                        if (!r.sku) {
                            errors.push(`Baris ${r._rowNum}: SKU kosong.`);
                        } else {
                            if (skuSeen.has(r.sku)) {
                                errors.push(`Baris ${r._rowNum}: SKU "${r.sku}" duplikat dengan Baris ${skuSeen.get(r.sku)} di file Excel.`);
                            } else {
                                skuSeen.set(r.sku, r._rowNum);
                            }
                        }
                        if (!r.name) errors.push(`Baris ${r._rowNum}: Nama Produk kosong.`);
                    });
                    setImportErrors(errors);
                    setImportRows(mapped);
                    setImportStep('preview');
                } catch (err) {
                    toast.error('Gagal membaca file: ' + err.message);
                }
            };
            reader.readAsBinaryString(file);
        });
        e.target.value = '';
    };

    const handleExecuteImport = () => {
        if (importErrors.length > 0) {
            toast.error('Perbaiki error validasi sebelum melanjutkan.');
            return;
        }
        setIsImporting(true);

        const toUpsert = importRows.map(r => {
            const { _rowNum, brand, ...rest } = r;
            return {
                sku: String(rest.sku || '').trim().toUpperCase(),
                name: String(rest.name || '').trim(),
                description: String(rest.description || '').trim() || null,
                price: Math.round(Number(rest.price) || 0),
                pricelist_distributor: Math.round(Number(rest.pricelist_distributor) || 0),
                diskon_distributor: Number(rest.diskon_distributor) || 0,
                modal: Math.round(Number(rest.modal) || 0),
                brand: (brand || '').trim(),
            };
        });

        router.post(route('products.import'), { products: toUpsert }, {
            preserveScroll: true,
            onSuccess: () => {
                setIsImporting(false);
                setImportResult({ count: toUpsert.length });
                setImportStep('result');
                toast.success(`${toUpsert.length} produk berhasil diimport! 🎉`);
            },
            onError: (errs) => {
                setIsImporting(false);
                toast.error('Gagal mengimport produk: ' + (Object.values(errs)[0] || 'Server error'));
            }
        });
    };

    const resetImportModal = () => {
        setShowImportModal(false);
        setImportStep('upload');
        setImportRows([]);
        setImportErrors([]);
        setImportResult(null);
        setIsImporting(false);
    };

    return (
        <AuthenticatedLayout header="Products" subHeader="Katalog produk per brand">
            <Head title="Katalog Produk" />

            <div className="animate-fade-in-up">
                {/* === TOP CONTROLS & FILTER BAR === */}
                <div className="bg-white rounded-xl border border-surface-200 mb-5 shadow-sm">
                    <div className="px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-2 bg-surface-50 border border-surface-200 rounded-lg px-3 py-2 flex-1 max-w-md focus-within:border-brand-400 transition-colors">
                            <Search className="w-4 h-4 text-surface-400 shrink-0" />
                            <input
                                type="text"
                                placeholder="Cari SKU, nama produk, brand, deskripsi..."
                                className="bg-transparent border-none outline-none text-sm text-surface-700 placeholder-surface-400 w-full"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <select
                                value={brandFilter}
                                onChange={(e) => setBrandFilter(e.target.value)}
                                className="bg-surface-50 border border-surface-200 text-surface-600 text-sm font-medium px-3 py-2 rounded-lg outline-none focus:border-brand-500 cursor-pointer"
                            >
                                <option value="all">Semua Brand</option>
                                {(brands || []).map(b => (
                                    <option key={b.id} value={b.id}>{b.name}</option>
                                ))}
                            </select>

                            <div className="flex items-center bg-surface-100 p-1 rounded-lg border border-surface-200">
                                <button
                                    onClick={() => setViewMode('grid')}
                                    className={`p-1.5 rounded-md transition-colors cursor-pointer ${viewMode === 'grid' ? 'bg-white text-brand-600 shadow-sm' : 'text-surface-400 hover:text-surface-600'}`}
                                    title="Grid View"
                                >
                                    <LayoutGrid className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => setViewMode('list')}
                                    className={`p-1.5 rounded-md transition-colors cursor-pointer ${viewMode === 'list' ? 'bg-white text-brand-600 shadow-sm' : 'text-surface-400 hover:text-surface-600'}`}
                                    title="List View"
                                >
                                    <ListIcon className="w-4 h-4" />
                                </button>
                            </div>

                            <button
                                onClick={() => setShowImportModal(true)}
                                className="flex items-center gap-2 bg-surface-100 hover:bg-surface-200 text-surface-700 text-sm font-semibold px-4 py-2 rounded-lg border border-surface-200 hover:border-surface-300 transition-all shrink-0 cursor-pointer"
                            >
                                <Upload className="w-4 h-4" />
                                <span>Import</span>
                            </button>
                            <button
                                onClick={handleExportProducts}
                                className="flex items-center gap-2 bg-surface-100 hover:bg-surface-200 text-surface-700 text-sm font-semibold px-4 py-2 rounded-lg border border-surface-200 hover:border-surface-300 transition-all shrink-0 cursor-pointer"
                            >
                                <Download className="w-4 h-4" />
                                <span>Export</span>
                            </button>
                            <button
                                onClick={openCreate}
                                className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold px-4 py-2 rounded-lg shadow-sm hover:shadow transition-all shrink-0 cursor-pointer"
                            >
                                <Plus className="w-4 h-4" />
                                <span>Tambah Produk</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* === MAIN CONTENT (GRID vs TABLE LIST) === */}
                <div className="relative min-h-[400px]">
                    {filteredProducts.length === 0 && (
                        <div className="bg-white border border-surface-200 rounded-xl p-12 flex flex-col items-center justify-center text-surface-400">
                            <Box className="w-12 h-12 mb-3 text-surface-300" />
                            <span className="text-sm font-medium">Belum ada produk yang ditemukan.</span>
                        </div>
                    )}

                    {filteredProducts.length > 0 && (
                        viewMode === 'grid' ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                                {pageItems.map((p) => (
                                    <div key={p.sku} className="bg-white rounded-xl border border-surface-200 overflow-hidden hover:shadow-md hover:border-surface-300 transition-all flex flex-col group animate-scale-in">
                                        <div className="h-40 bg-surface-50 flex items-center justify-center relative overflow-hidden border-b border-surface-100 p-4">
                                            {p.image_url ? (
                                                <img
                                                    src={getImageUrl(p.image_url)}
                                                    alt={p.name}
                                                    className="w-full h-full object-contain hover:scale-105 transition-transform duration-500"
                                                    onError={(e) => {
                                                        e.target.onerror = null;
                                                        e.target.style.display = 'none';
                                                        if (e.target.nextSibling) e.target.nextSibling.style.display = 'block';
                                                    }}
                                                />
                                            ) : null}
                                            <ImageIcon className="w-8 h-8 text-surface-300" style={{ display: p.image_url ? 'none' : 'block' }} />

                                            <div className="absolute top-3 right-3">
                                                <span
                                                    className="inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide shadow-sm bg-white"
                                                    style={getBrandStyles(p.brand?.color_hex)}
                                                >
                                                    {p.brand?.name || 'Tanpa Brand'}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="p-5 flex-1 flex flex-col">
                                            <div className="text-xs font-mono text-surface-400 mb-1 font-semibold">{p.sku}</div>
                                            <h3 className="text-sm font-bold text-surface-900 leading-tight mb-2 group-hover:text-brand-600 transition-colors line-clamp-2">
                                                {p.name}
                                            </h3>
                                            <p className="text-xs text-surface-500 line-clamp-2 mb-4 flex-1">
                                                {p.description || 'Tidak ada deskripsi'}
                                            </p>
                                            <div className="text-sm font-extrabold text-brand-700">
                                                {formatCurrency(p.price)}
                                            </div>
                                        </div>

                                        <div className="border-t border-surface-100 px-3 py-2.5 flex items-center justify-between bg-surface-50 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <span className="text-[10px] font-semibold text-surface-400 uppercase tracking-wider">Aksi</span>
                                            <div className="flex items-center gap-1">
                                                <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg text-brand-600 hover:bg-brand-100 transition-colors cursor-pointer" title="Edit Produk">
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => confirmDeleteSingle(p)} className="p-1.5 rounded-lg text-red-500 hover:bg-red-100 transition-colors cursor-pointer" title="Hapus Produk">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="bg-white border border-surface-200 rounded-xl overflow-hidden shadow-sm">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-surface-50 border-b border-surface-200">
                                                <th className="px-6 py-4 text-center w-12">
                                                    <input
                                                        type="checkbox"
                                                        checked={isAllSelected}
                                                        onChange={handleToggleSelectAll}
                                                        className="w-4 h-4 rounded text-brand-500 border-surface-200 focus:ring-brand-500 cursor-pointer accent-brand-500"
                                                    />
                                                </th>
                                                <th className="px-6 py-4 text-xs font-bold text-surface-500 uppercase tracking-wider w-16">IMAGE</th>
                                                <th className="px-6 py-4 text-xs font-bold text-surface-500 uppercase tracking-wider">SKU</th>
                                                <th className="px-6 py-4 text-xs font-bold text-surface-500 uppercase tracking-wider">NAMA PRODUK</th>
                                                <th className="px-6 py-4 text-xs font-bold text-surface-500 uppercase tracking-wider">BRAND</th>
                                                <th className="px-6 py-4 text-xs font-bold text-surface-500 uppercase tracking-wider text-right">PRICELIST</th>
                                                <th className="px-6 py-4 text-xs font-bold text-surface-500 uppercase tracking-wider text-right">HARGA MODAL</th>
                                                <th className="px-6 py-4 text-xs font-bold text-surface-500 uppercase tracking-wider text-right">AKSI</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-surface-100">
                                            {pageItems.map(p => (
                                                <tr
                                                    key={p.sku}
                                                    className={`hover:bg-brand-50/30 transition-colors group ${selectedSkus.includes(p.sku) ? 'bg-brand-50/20' : ''}`}
                                                >
                                                    <td className="px-6 py-3 text-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedSkus.includes(p.sku)}
                                                            onChange={() => handleToggleSelect(p.sku)}
                                                            className="w-4 h-4 rounded text-brand-500 border-surface-200 focus:ring-brand-500 cursor-pointer accent-brand-500"
                                                        />
                                                    </td>
                                                    <td className="px-6 py-3">
                                                        <div className="w-10 h-10 bg-surface-100 rounded-lg overflow-hidden flex items-center justify-center border border-surface-200">
                                                            {p.image_url ? (
                                                                <img
                                                                    src={getImageUrl(p.image_url)}
                                                                    alt={p.name}
                                                                    className="w-full h-full object-contain p-1"
                                                                    onError={(e) => {
                                                                        e.target.onerror = null;
                                                                        e.target.style.display = 'none';
                                                                        if (e.target.nextSibling) e.target.nextSibling.style.display = 'block';
                                                                    }}
                                                                />
                                                            ) : null}
                                                            <ImageIcon className="w-5 h-5 text-surface-300" style={{ display: p.image_url ? 'none' : 'block' }} />
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm font-mono font-medium text-surface-600">{p.sku}</td>
                                                    <td className="px-6 py-4">
                                                        <div className="text-sm font-bold text-surface-900 line-clamp-1">{p.name}</div>
                                                        <div className="text-xs text-surface-400 line-clamp-1 mt-0.5 max-w-xs">{p.description}</div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span
                                                            className="inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide shadow-sm bg-white"
                                                            style={getBrandStyles(p.brand?.color_hex)}
                                                        >
                                                            {p.brand?.name || 'Tanpa Brand'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm font-semibold text-surface-700 text-right">
                                                        {formatCurrency(p.pricelist_distributor || 0)}
                                                    </td>
                                                    <td className="px-6 py-4 text-sm font-semibold text-surface-700 text-right">
                                                        {formatCurrency(p.modal || 0)}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg text-brand-600 hover:bg-brand-100 transition-colors cursor-pointer" title="Edit Produk">
                                                                <Edit className="w-4 h-4" />
                                                            </button>
                                                            <button onClick={() => confirmDeleteSingle(p)} className="p-1.5 rounded-lg text-red-500 hover:bg-red-100 transition-colors cursor-pointer" title="Hapus Produk">
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )
                    )}

                    {/* Pagination for Grid and List views */}
                    {filteredProducts.length > 0 && (
                        <div className="mt-4">
                            <Pagination
                                page={safePage}
                                totalPages={totalPages}
                                totalItems={filteredProducts.length}
                                pageSize={pageSize}
                                pageSizeOptions={PAGE_SIZE_OPTIONS}
                                onPageChange={setPage}
                                onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
                                itemLabel="produk"
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* === FLOATING BULK SELECTION ACTION BAR === */}
            {selectedSkus.length > 0 && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-surface-900 text-white rounded-xl shadow-2xl px-5 py-3.5 flex items-center gap-4 transition-all duration-300 z-[100] border border-white/10 animate-fade-in-up">
                    <span className="text-xs font-semibold flex items-center gap-2">
                        <span className="bg-brand-500 text-white px-2.5 py-0.5 rounded-full font-bold">
                            {selectedSkus.length}
                        </span>
                        Produk terpilih
                    </span>
                    <div className="h-4 w-[1px] bg-white/20"></div>
                    <button
                        onClick={confirmDeleteBulk}
                        className="bg-red-500 hover:bg-red-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer shadow-sm hover:shadow"
                    >
                        Hapus Terpilih
                    </button>
                    <button
                        onClick={() => setSelectedSkus([])}
                        className="text-white/60 hover:text-white text-xs font-medium transition-colors cursor-pointer"
                    >
                        Batal
                    </button>
                </div>
            )}

            {/* === CREATE / EDIT PRODUCT MODAL === */}
            {isModalOpen && ReactDOM.createPortal(
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-surface-900/40 backdrop-blur-sm animate-fade-in overflow-y-auto">
                    <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-scale-in my-auto">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100 bg-surface-50/50">
                            <h2 className="text-lg font-bold text-surface-800 flex items-center gap-2">
                                <Box className="w-5 h-5 text-brand-500" />
                                {editingProduct ? 'Edit Produk' : 'Tambah Produk Baru'}
                            </h2>
                            <button
                                type="button"
                                onClick={closeModal}
                                className="text-surface-400 hover:text-surface-600 hover:bg-surface-100 p-2 rounded-xl transition-colors cursor-pointer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div className="p-6 flex flex-col gap-5">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-bold text-surface-600 uppercase tracking-wider mb-2 block">
                                            SKU Produk <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            disabled={!!editingProduct}
                                            value={newProduct.sku}
                                            onChange={e => setNewProduct({ ...newProduct, sku: e.target.value.toUpperCase() })}
                                            className={`w-full border border-surface-200 rounded-xl px-4 py-2.5 text-sm font-mono outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-50 transition-all uppercase ${editingProduct ? 'bg-surface-100 cursor-not-allowed text-surface-500' : ''}`}
                                            placeholder="CONTOH: POLY-X50"
                                        />
                                    </div>
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <label className="text-xs font-bold text-surface-600 uppercase tracking-wider">
                                                Brand <span className="text-red-500">*</span>
                                            </label>
                                            <button
                                                type="button"
                                                onClick={() => setShowAddBrandModal(true)}
                                                className="text-[11px] font-semibold text-brand-600 hover:text-brand-700 hover:underline flex items-center gap-1 cursor-pointer"
                                            >
                                                <Plus className="w-3 h-3" /> Tambah Brand
                                            </button>
                                        </div>
                                        <select
                                            required
                                            value={newProduct.brand_id}
                                            onChange={e => {
                                                if (e.target.value === '__add_new__') {
                                                    setShowAddBrandModal(true);
                                                } else {
                                                    setNewProduct({ ...newProduct, brand_id: e.target.value });
                                                }
                                            }}
                                            className="w-full border border-surface-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-50 transition-all bg-white cursor-pointer"
                                        >
                                            <option value="" disabled>-- Pilih Brand --</option>
                                            {(brands || []).map(b => (
                                                <option key={b.id} value={b.id}>{b.name}</option>
                                            ))}
                                            <option value="__add_new__" className="font-semibold text-brand-600">+ Tambah Brand Baru...</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-surface-600 uppercase tracking-wider mb-2 block">
                                        Nama Produk <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={newProduct.name}
                                        onChange={e => setNewProduct({ ...newProduct, name: e.target.value })}
                                        className="w-full border border-surface-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-50 transition-all"
                                        placeholder="Contoh: Poly Studio X50 Video Bar"
                                    />
                                </div>

                                {/* === HARGA DISTRIBUTOR CARD === */}
                                <div className="border border-surface-100 rounded-xl bg-surface-50/50 p-4 flex flex-col gap-3">
                                    <div className="text-xs font-bold text-surface-500 uppercase tracking-wider">Harga Distributor</div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-xs font-semibold text-surface-600 mb-1 block">Pricelist Distributor (Rp)</label>
                                            <EditableCurrencyInput
                                                value={newProduct.pricelist_distributor}
                                                onChange={val => handleProductPriceChange('pricelist_distributor', val)}
                                                className="w-full border border-surface-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-50 transition-all bg-white"
                                                placeholder="0"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-semibold text-surface-600 mb-1 block">Diskon Distributor (%)</label>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max="100"
                                                    step="0.01"
                                                    value={newProduct.diskon_distributor}
                                                    onChange={e => handleProductPriceChange('diskon_distributor', e.target.value)}
                                                    className="w-full border border-surface-200 rounded-lg px-3 pr-8 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-50 transition-all bg-white"
                                                    placeholder="0"
                                                />
                                                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                                    <span className="text-surface-400 text-xs font-bold">%</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Modal / HPP Auto calculation */}
                                    <div>
                                        <label className="text-xs font-semibold text-surface-600 mb-1 flex items-center gap-1.5">
                                            Harga Modal / HPP (Rp)
                                            <span className="text-[10px] text-brand-500 font-normal bg-brand-50 px-1.5 py-0.5 rounded">Auto</span>
                                        </label>
                                        <EditableCurrencyInput
                                            value={newProduct.modal}
                                            onChange={val => handleProductPriceChange('modal', val)}
                                            className="w-full border border-brand-200 bg-brand-50/30 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-50 transition-all font-semibold text-brand-900"
                                            placeholder="= Pricelist × (1 − Diskon%)"
                                        />
                                        <p className="text-[10px] text-surface-400 mt-0.5">Rumus: Pricelist × (1 − Diskon%) − dapat diubah manual</p>
                                    </div>
                                </div>

                                {/* === HARGA JUAL REFERENSI === */}
                                <div>
                                    <label className="text-xs font-bold text-surface-600 uppercase tracking-wider mb-2 block">
                                        Harga Jual Referensi (IDR) <span className="text-surface-400 font-normal normal-case text-[11px]">(opsional)</span>
                                    </label>
                                    <EditableCurrencyInput
                                        value={newProduct.price}
                                        onChange={val => setNewProduct(p => ({ ...p, price: val }))}
                                        className="w-full border border-surface-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-50 transition-all"
                                        placeholder="0"
                                    />
                                    <p className="text-[10px] text-surface-400 mt-1">
                                        Harga referensi di katalog. Harga final per-penawaran dihitung berdasarkan Margin Sales di form Quotation.
                                    </p>
                                </div>

                                {/* === GAMBAR PRODUK === */}
                                <div>
                                    <label className="text-xs font-bold text-surface-600 uppercase tracking-wider mb-2 block">Gambar Produk</label>
                                    <div
                                        className={`w-full border-2 border-dashed ${isDragging ? 'border-brand-500 bg-brand-100' : imagePreview ? 'border-brand-300 bg-brand-50/30' : 'border-surface-200 bg-surface-50'} rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer hover:border-brand-400 hover:bg-brand-50 transition-colors relative overflow-hidden h-32`}
                                        onClick={() => fileInputRef.current?.click()}
                                        onDragOver={handleDragOver}
                                        onDragLeave={handleDragLeave}
                                        onDrop={handleDrop}
                                    >
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            onChange={handleImageSelect}
                                            accept="image/png, image/jpeg, image/webp"
                                            className="hidden"
                                        />

                                        {imagePreview ? (
                                            <div className="absolute inset-0 p-2 flex items-center justify-center pointer-events-none">
                                                <img src={getImageUrl(imagePreview)} alt="Preview" className="w-full h-full object-contain" />
                                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity pointer-events-auto">
                                                    <span className="text-white text-xs font-bold flex items-center gap-1">
                                                        <UploadCloud className="w-4 h-4" /> Ganti Gambar
                                                    </span>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-center text-surface-400 pointer-events-none flex flex-col items-center">
                                                <UploadCloud className={`w-6 h-6 mb-2 ${isDragging ? 'text-brand-500 opacity-100' : 'opacity-60'}`} />
                                                <span className="text-xs font-medium">{isDragging ? 'Lepaskan gambar di sini' : 'Klik atau seret gambar ke sini'}</span>
                                                <span className="text-[10px] text-surface-400 mt-1">PNG, JPG up to 2MB</span>
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-[10px] text-surface-400 mt-1">Gambar akan disimpan di folder <code>public/images/products/</code> server.</p>
                                </div>

                                {/* === DESKRIPSI SINGKAT === */}
                                <div>
                                    <label className="text-xs font-bold text-surface-600 uppercase tracking-wider mb-2 block">Deskripsi Singkat</label>
                                    <textarea
                                        value={newProduct.description}
                                        onChange={e => setNewProduct({ ...newProduct, description: e.target.value })}
                                        className="w-full border border-surface-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-50 transition-all resize-none"
                                        placeholder="Tuliskan spesifikasi utama..."
                                        rows="3"
                                    ></textarea>
                                </div>
                            </div>

                            <div className="px-6 py-4 bg-surface-50 border-t border-surface-100 flex justify-end gap-3 rounded-b-2xl">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="px-4 py-2 text-sm font-semibold text-surface-600 hover:text-surface-800 transition-colors cursor-pointer"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting || isUploading}
                                    className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-bold px-6 py-2 rounded-xl shadow-sm hover:shadow-md transition-all disabled:opacity-70 cursor-pointer"
                                >
                                    {(isSubmitting || isUploading) && <Loader2 className="w-4 h-4 animate-spin" />}
                                    {editingProduct ? 'Simpan Perubahan' : 'Simpan Produk'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}

            {/* === DELETE CONFIRMATION MODAL === */}
            {deleteModal.open && ReactDOM.createPortal(
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-surface-900/40 backdrop-blur-sm animate-fade-in overflow-y-auto">
                    <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-scale-in my-auto p-6">
                        <div className="flex items-start gap-4 mb-4">
                            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-red-500 shrink-0">
                                <Trash2 className="w-6 h-6" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-extrabold text-surface-900">
                                    {deleteModal.isBulk ? 'Hapus Produk Terpilih?' : 'Hapus Produk?'}
                                </h3>
                                <p className="text-sm text-surface-500 mt-1 leading-relaxed">
                                    {deleteModal.isBulk
                                        ? `Apakah Anda yakin ingin menghapus ${selectedSkus.length} produk terpilih? Tindakan ini tidak dapat dibatalkan.`
                                        : `Apakah Anda yakin ingin menghapus produk dengan SKU "${deleteModal.product?.sku}"? Tindakan ini tidak dapat dibatalkan.`
                                    }
                                </p>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                type="button"
                                onClick={() => setDeleteModal({ open: false, product: null, isBulk: false })}
                                className="px-4 py-2 text-sm font-semibold text-surface-600 hover:text-surface-800 transition-colors border border-surface-200 rounded-xl cursor-pointer hover:bg-surface-50"
                            >
                                Batal
                            </button>
                            <button
                                type="button"
                                onClick={handleExecuteDelete}
                                className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white text-sm font-bold px-5 py-2 rounded-xl shadow-sm hover:shadow transition-all cursor-pointer"
                            >
                                Hapus
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* === ERROR ALERT DIALOG MODAL === */}
            {errorModal.open && ReactDOM.createPortal(
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-surface-900/40 backdrop-blur-sm animate-fade-in overflow-y-auto">
                    <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-scale-in my-auto p-6">
                        <div className="flex items-start gap-4 mb-4">
                            <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center text-orange-500 shrink-0 animate-pulse">
                                <AlertCircle className="w-6 h-6" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-extrabold text-surface-900">{errorModal.title}</h3>
                                <p className="text-sm text-surface-600 mt-2 font-medium bg-orange-50/50 border border-orange-100 rounded-xl p-3.5 leading-relaxed">
                                    {errorModal.message}
                                </p>
                            </div>
                        </div>

                        <div className="flex justify-end mt-6">
                            <button
                                type="button"
                                onClick={() => setErrorModal({ open: false, title: '', message: '' })}
                                className="bg-surface-900 hover:bg-surface-800 text-white text-sm font-bold px-5 py-2.5 rounded-xl shadow-sm hover:shadow transition-all cursor-pointer"
                            >
                                Mengerti
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* === QUICK ADD BRAND MODAL === */}
            {showAddBrandModal && ReactDOM.createPortal(
                <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-surface-900/50 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-scale-in my-auto p-6">
                        <div className="flex items-center justify-between mb-4 border-b border-surface-100 pb-3">
                            <h3 className="text-base font-bold text-surface-900 flex items-center gap-2">
                                <Plus className="w-4 h-4 text-brand-500" /> Tambah Brand Baru
                            </h3>
                            <button
                                type="button"
                                onClick={() => setShowAddBrandModal(false)}
                                className="p-1 rounded-lg text-surface-400 hover:text-surface-600 hover:bg-surface-100 transition-colors cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <form onSubmit={handleQuickCreateBrand} className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-surface-600 uppercase tracking-wider block mb-1.5">
                                    Nama Brand <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={quickBrand.name}
                                    onChange={e => setQuickBrand(b => ({ ...b, name: e.target.value }))}
                                    placeholder="Contoh: Cisco / Yealink"
                                    className="w-full border border-surface-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-50 transition-all"
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-surface-600 uppercase tracking-wider block mb-1.5">Warna Label</label>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="color"
                                        value={quickBrand.color_hex}
                                        onChange={e => setQuickBrand(b => ({ ...b, color_hex: e.target.value }))}
                                        className="w-10 h-10 rounded-xl cursor-pointer border border-surface-200 p-0.5 bg-white"
                                    />
                                    <span className="text-xs font-mono font-semibold text-surface-600 uppercase">{quickBrand.color_hex}</span>
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowAddBrandModal(false)}
                                    className="px-4 py-2 text-xs font-semibold text-surface-600 hover:text-surface-800 transition-colors cursor-pointer"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={isCreatingBrand}
                                    className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-sm transition-all cursor-pointer disabled:opacity-50"
                                >
                                    {isCreatingBrand && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                    Simpan Brand
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}

            {/* === IMPORT PRODUCTS MODAL === */}
            {showImportModal && ReactDOM.createPortal(
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-surface-900/50 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
                        <div className="px-6 py-4 border-b border-surface-100 flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center">
                                    <FileSpreadsheet className="w-5 h-5 text-brand-600" />
                                </div>
                                <div>
                                    <h2 className="text-sm font-bold text-surface-900">Import Data Produk</h2>
                                    <p className="text-xs text-surface-400 mt-0.5">
                                        {importStep === 'upload' && 'Upload file Excel (.xlsx) untuk import massal'}
                                        {importStep === 'preview' && `${importRows.length} produk ditemukan — tinjau sebelum import`}
                                        {importStep === 'result' && 'Import selesai!'}
                                    </p>
                                </div>
                            </div>
                            <button onClick={resetImportModal} className="text-surface-400 hover:text-surface-700 p-1.5 rounded-lg hover:bg-surface-100 transition-colors cursor-pointer">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="overflow-y-auto flex-1 px-6 py-5">
                            {importStep === 'upload' && (
                                <div className="space-y-5">
                                    <div
                                        onClick={() => importFileInputRef.current?.click()}
                                        className="border-2 border-dashed border-surface-200 hover:border-brand-400 hover:bg-brand-50/40 transition-all rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer text-center group"
                                    >
                                        <div className="w-14 h-14 rounded-2xl bg-surface-100 group-hover:bg-brand-100 flex items-center justify-center mb-3 transition-colors">
                                            <UploadCloud className="w-7 h-7 text-surface-400 group-hover:text-brand-600 transition-colors" />
                                        </div>
                                        <p className="text-sm font-bold text-surface-800">Klik untuk memilih file Excel</p>
                                        <p className="text-xs text-surface-400 mt-1">Format file .xlsx atau .xls</p>
                                        <input
                                            ref={importFileInputRef}
                                            type="file"
                                            accept=".xlsx, .xls"
                                            onChange={handleImportFile}
                                            className="hidden"
                                        />
                                    </div>

                                    <div className="bg-surface-50 border border-surface-200 rounded-xl p-4 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                                            <div>
                                                <p className="text-xs font-bold text-surface-800">Belum punya template?</p>
                                                <p className="text-[11px] text-surface-400">Download template standar dengan kolom SKU, Nama Produk, Brand, Pricelist, HPP.</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={handleDownloadTemplate}
                                            className="flex items-center gap-1.5 text-xs font-bold text-brand-600 hover:text-brand-700 bg-white border border-surface-200 px-3 py-1.5 rounded-lg shadow-sm hover:border-brand-300 transition-all cursor-pointer shrink-0"
                                        >
                                            <Download className="w-3.5 h-3.5" /> Download Template
                                        </button>
                                    </div>
                                </div>
                            )}

                            {importStep === 'preview' && (
                                <div className="space-y-4">
                                    {importErrors.length > 0 && (
                                        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                                            <div className="flex items-center gap-2 text-red-700 font-bold text-xs mb-2">
                                                <XCircle className="w-4 h-4 shrink-0" />
                                                <span>{importErrors.length} Error Ditemukan dalam File Excel</span>
                                            </div>
                                            <ul className="space-y-1 text-xs text-red-600 max-h-28 overflow-y-auto pl-5 list-disc">
                                                {importErrors.map((err, idx) => (
                                                    <li key={idx}>{err}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    <div className="border border-surface-200 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                                        <table className="w-full text-xs text-left border-collapse">
                                            <thead>
                                                <tr className="bg-surface-50 border-b border-surface-200 font-bold text-surface-500 uppercase tracking-wider sticky top-0 bg-surface-50">
                                                    <th className="px-3 py-2">Baris</th>
                                                    <th className="px-3 py-2">SKU</th>
                                                    <th className="px-3 py-2">Nama Produk</th>
                                                    <th className="px-3 py-2">Brand</th>
                                                    <th className="px-3 py-2 text-right">Pricelist</th>
                                                    <th className="px-3 py-2 text-right">Modal</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-surface-100">
                                                {importRows.map((r, idx) => (
                                                    <tr key={idx} className="hover:bg-surface-50">
                                                        <td className="px-3 py-2 text-surface-400 font-mono">{r._rowNum}</td>
                                                        <td className="px-3 py-2 font-mono font-bold text-surface-800">{r.sku || '—'}</td>
                                                        <td className="px-3 py-2 font-semibold text-surface-800">{r.name || '—'}</td>
                                                        <td className="px-3 py-2 text-surface-600">{r.brand || '—'}</td>
                                                        <td className="px-3 py-2 text-right text-surface-700">{r.pricelist_distributor ? formatCurrency(r.pricelist_distributor) : '—'}</td>
                                                        <td className="px-3 py-2 text-right text-surface-700">{r.modal ? formatCurrency(r.modal) : '—'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {importStep === 'result' && (
                                <div className="py-8 flex flex-col items-center justify-center text-center">
                                    <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mb-4">
                                        <CheckCircle className="w-8 h-8 text-emerald-500" />
                                    </div>
                                    <h3 className="text-base font-bold text-surface-900">Import Berhasil!</h3>
                                    <p className="text-xs text-surface-500 mt-1 max-w-sm">
                                        Sebanyak <strong>{importResult?.count}</strong> data produk telah berhasil dimasukkan ke katalog database.
                                    </p>
                                    <button
                                        onClick={resetImportModal}
                                        className="mt-6 bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold px-6 py-2.5 rounded-xl shadow-sm transition-all cursor-pointer"
                                    >
                                        Selesai
                                    </button>
                                </div>
                            )}
                        </div>

                        {importStep !== 'result' && (
                            <div className="px-6 py-3.5 border-t border-surface-100 bg-surface-50 flex items-center justify-between shrink-0 rounded-b-2xl">
                                <button
                                    onClick={resetImportModal}
                                    className="text-xs font-semibold text-surface-500 hover:text-surface-700 transition-colors cursor-pointer"
                                >
                                    Batal
                                </button>

                                {importStep === 'preview' && (
                                    <button
                                        onClick={handleExecuteImport}
                                        disabled={isImporting || importErrors.length > 0}
                                        className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white text-xs font-bold px-5 py-2 rounded-xl transition-all cursor-pointer shadow-sm"
                                    >
                                        {isImporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                                        {isImporting ? 'Mengimport...' : `Import ${importRows.length} Produk`}
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>,
                document.body
            )}
        </AuthenticatedLayout>
    );
}
