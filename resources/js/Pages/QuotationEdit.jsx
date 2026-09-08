import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    ArrowLeft, Plus, Trash2, Save, Loader2, Info, ChevronDown,
    Check, Search, X, FileText, BookmarkPlus, AlertTriangle, Edit3,
    Box, UploadCloud, GripVertical,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import { printQuotation } from '@/utils/printQuotation';
import { getAllTemplatesForUser, savePersonalTemplate, deletePersonalTemplate } from '@/utils/termsTemplates';
import SalesZoneCard from '@/Components/SalesZoneCard';

const brandClasses = (brand) => {
    const b = (brand || '').toLowerCase();
    if (b.includes('jabra')) return 'bg-amber-100 text-amber-800 border border-amber-200';
    if (b.includes('logitech')) return 'bg-teal-100 text-teal-800 border border-teal-200';
    if (b.includes('poly')) return 'bg-purple-100 text-purple-800 border border-purple-200';
    if (b.includes('yealink')) return 'bg-blue-100 text-blue-800 border border-blue-200';
    if (b.includes('hikvision')) return 'bg-red-100 text-red-800 border border-red-200';
    return 'bg-surface-100 text-surface-700 border border-surface-200';
};

const formatCurrency = (val) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val || 0);

const formatBrandName = (brand) => {
    if (!brand) return '';
    if (typeof brand === 'object') return brand.name || '';
    return String(brand);
};

const DEFAULT_TERMS = [
    'Harga belum termasuk PPN 11% (kecuali dinyatakan lain).',
    'Penawaran berlaku sesuai masa berlaku tertera.',
    'Pembayaran ditransfer ke rekening resmi PT. Alfa Cipta Teknologi Virtual.',
    'Pengiriman dilakukan setelah konfirmasi pembayaran diterima.',
];

const EditableCurrencyInput = ({ value, onChange, className, placeholder }) => {
    const [isFocused, setIsFocused] = useState(false);
    return (
        <input
            type={isFocused ? 'number' : 'text'}
            min="0"
            placeholder={placeholder}
            value={isFocused ? (value ?? '') : (value ? formatCurrency(value) : (placeholder || ''))}
            onFocus={() => setIsFocused(true)}
            onChange={e => onChange(e.target.value)}
            onBlur={() => setIsFocused(false)}
            className={className}
        />
    );
};

export default function QuotationEdit({ quotation, customers, products, brands, bankAccounts, currentUser, masterTerms = [] }) {
    const { flash } = usePage().props;

    // ─── State ────────────────────────────────────────────────────────────────
    const [status, setStatus] = useState(quotation?.status || 'created');
    const [customerId, setCustomerId] = useState(quotation?.customer_id || '');
    const [picId, setPicId] = useState(quotation?.pic_id ? String(quotation.pic_id) : '');
    const [expiryDays, setExpiryDays] = useState(7);
    const [bankAccountId, setBankAccountId] = useState(quotation?.bank_account_id || '');
    const [customerSearch, setCustomerSearch] = useState('');

    // Tax settings
    const [calcTax, setCalcTax] = useState(quotation?.calc_tax !== false);
    const [showTax, setShowTax] = useState(quotation?.show_tax !== false);
    const [ppnRate, setPpnRate] = useState(quotation?.ppn_rate || 0.11);
    const [calcPph, setCalcPph] = useState(quotation?.calc_pph || false);
    const [showPph, setShowPph] = useState(quotation?.show_pph || false);
    const [pphRate, setPphRate] = useState(quotation?.pph_rate || 0.02);
    const [showPphModal, setShowPphModal] = useState(false);

    // Terms
    const [termsText, setTermsText] = useState(
        Array.isArray(quotation?.terms) && quotation.terms.length > 0
            ? quotation.terms.join('\n')
            : DEFAULT_TERMS.join('\n')
    );
    const userId = currentUser?.id || 'guest';
    const [termsTemplates, setTermsTemplates] = useState(() => getAllTemplatesForUser(userId, masterTerms));

    useEffect(() => {
        setTermsTemplates(getAllTemplatesForUser(userId, masterTerms));
    }, [userId, masterTerms]);

    const [showSaveTplModal, setShowSaveTplModal] = useState(false);
    const [newTplName, setNewTplName] = useState('');
    const [deleteTargetTemplate, setDeleteTargetTemplate] = useState(null);

    // Items
    const [items, setItems] = useState([]);
    const [openDropdownIdx, setOpenDropdownIdx] = useState(null);
    const [productSearch, setProductSearch] = useState('');
    const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

    // Drag-and-drop reorder state
    const [dragItemIdx, setDragItemIdx] = useState(null);
    const [dragOverIdx, setDragOverIdx] = useState(null);
    const [isReordering, setIsReordering] = useState(false);

    // Custom product item editor modal
    const [editingCustomItemIdx, setEditingCustomItemIdx] = useState(null);
    const [editingItemData, setEditingItemData] = useState({
        name: '',
        sku: '',
        brand: '',
        pricelist_distributor: 0,
        diskon_distributor: 0,
        hpp: 0,
        price: 0,
        description: '',
        image_url: null,
    });

    // Add Product Modal state
    const [showAddProductModal, setShowAddProductModal] = useState(false);
    const [isAddingProduct, setIsAddingProduct] = useState(false);
    const [newProductData, setNewProductData] = useState({
        sku: '',
        brand: '',
        name: '',
        pricelist_distributor: '',
        diskon_distributor: '',
        hpp: '',
        price: '',
        description: '',
        image_url: null,
    });

    // File input refs & drag state
    const productFileInputRef = useRef(null);
    const editItemFileInputRef = useRef(null);
    const [isDraggingProductImage, setIsDraggingProductImage] = useState(false);
    const [isDraggingEditItemImage, setIsDraggingEditItemImage] = useState(false);

    const processImageFile = (file, onSuccess) => {
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            toast.error('File harus berupa gambar (PNG, JPG, WEBP)');
            return;
        }
        if (file.size > 2 * 1024 * 1024) {
            toast.error('Ukuran gambar maksimal 2MB');
            return;
        }
        const reader = new FileReader();
        reader.onload = (ev) => {
            onSuccess(ev.target.result);
            toast.success('Gambar berhasil dimuat!');
        };
        reader.readAsDataURL(file);
    };

    const handleProductImageSelect = (e) => {
        if (e.target.files?.[0]) processImageFile(e.target.files[0], (url) => setNewProductData(prev => ({ ...prev, image_url: url })));
    };
    const handleProductImageDragOver = (e) => { e.preventDefault(); setIsDraggingProductImage(true); };
    const handleProductImageDragLeave = (e) => { e.preventDefault(); setIsDraggingProductImage(false); };
    const handleProductImageDrop = (e) => {
        e.preventDefault();
        setIsDraggingProductImage(false);
        if (e.dataTransfer.files?.[0]) processImageFile(e.dataTransfer.files[0], (url) => setNewProductData(prev => ({ ...prev, image_url: url })));
    };

    const handleEditItemImageSelect = (e) => {
        if (e.target.files?.[0]) processImageFile(e.target.files[0], (url) => setEditingItemData(prev => ({ ...prev, image_url: url })));
    };
    const handleEditItemImageDragOver = (e) => { e.preventDefault(); setIsDraggingEditItemImage(true); };
    const handleEditItemImageDragLeave = (e) => { e.preventDefault(); setIsDraggingEditItemImage(false); };
    const handleEditItemImageDrop = (e) => {
        e.preventDefault();
        setIsDraggingEditItemImage(false);
        if (e.dataTransfer.files?.[0]) processImageFile(e.dataTransfer.files[0], (url) => setEditingItemData(prev => ({ ...prev, image_url: url })));
    };

    // Quick Add Brand Modal state
    const [showAddBrandModal, setShowAddBrandModal] = useState(false);
    const [newBrandName, setNewBrandName] = useState('');
    const [newBrandColor, setNewBrandColor] = useState('#6366f1');
    const [isSavingBrand, setIsSavingBrand] = useState(false);

    const [customBrands, setCustomBrands] = useState([]);
    const allBrandNames = Array.from(new Set([
        ...(brands || []).map(b => typeof b === 'object' ? b.name : b),
        ...customBrands
    ])).filter(Boolean);

    const handleOpenAddBrandModal = (e) => {
        e?.preventDefault();
        setNewBrandName('');
        setNewBrandColor('#6366f1');
        setShowAddBrandModal(true);
    };

    const handleSaveBrand = async (e) => {
        e?.preventDefault();
        if (!newBrandName.trim()) {
            toast.error('Nama brand wajib diisi!');
            return;
        }
        setIsSavingBrand(true);
        const trimmedName = newBrandName.trim();
        try {
            const response = await axios.post(route('brands.store'), {
                name: trimmedName,
                color_hex: newBrandColor || '#6366f1',
            }, {
                headers: { 'Accept': 'application/json' }
            });
            const savedName = response.data?.brand?.name || trimmedName;
            setCustomBrands(prev => [...prev, savedName]);
            setNewProductData(prev => ({ ...prev, brand: savedName }));
            toast.success(`Brand "${savedName}" berhasil ditambahkan!`);
            setShowAddBrandModal(false);
            setNewBrandName('');
        } catch (err) {
            setCustomBrands(prev => [...prev, trimmedName]);
            setNewProductData(prev => ({ ...prev, brand: trimmedName }));
            toast.success(`Brand "${trimmedName}" ditambahkan!`);
            setShowAddBrandModal(false);
            setNewBrandName('');
        } finally {
            setIsSavingBrand(false);
        }
    };

    const handleSaveAndAddProduct = async (e) => {
        e?.preventDefault();
        if (!newProductData.sku.trim()) {
            toast.error('SKU Produk wajib diisi!');
            return;
        }
        if (!newProductData.name.trim()) {
            toast.error('Nama Produk wajib diisi!');
            return;
        }

        setIsAddingProduct(true);
        try {
            const pricelistDist = Number(newProductData.pricelist_distributor) || 0;
            const diskonDist = Number(newProductData.diskon_distributor) || 0;

            let hpp = Number(newProductData.hpp);
            if (isNaN(hpp) || hpp <= 0) {
                hpp = pricelistDist ? Math.round(pricelistDist * (1 - diskonDist / 100)) : 0;
            }

            const price = Number(newProductData.price) || 0;
            const margin = price > 0 && hpp > 0 ? Math.max(0, Math.round(((price - hpp) / price) * 100)) : 0;
            const sku = newProductData.sku.trim();
            const name = newProductData.name.trim();
            const brandName = newProductData.brand || '';

            const matchedBrand = (brands || []).find(b => (typeof b === 'object' ? b.name : b) === brandName);
            const brandId = matchedBrand ? (typeof matchedBrand === 'object' ? matchedBrand.id : null) : null;

            try {
                await axios.post(route('products.store'), {
                    sku,
                    name,
                    brand_name: brandName,
                    brand_id: brandId,
                    pricelist_distributor: pricelistDist,
                    diskon_distributor: diskonDist,
                    modal: hpp,
                    price: price,
                    description: newProductData.description || '',
                    image_url: newProductData.image_url || null,
                }, {
                    headers: { 'Accept': 'application/json' }
                });
            } catch (err) {
                console.log('Notice: Product already exists or saved to catalog:', err);
            }

            const newItem = {
                id: null,
                product_id: null,
                sku: sku,
                name: name,
                brand: brandName,
                pricelist_distributor: pricelistDist,
                diskon_distributor: diskonDist,
                qty: 1,
                hpp,
                price,
                margin,
                margin_value: Math.max(0, price - hpp),
                margin_mode: 'percent',
                description: newProductData.description || '',
                image_url: newProductData.image_url || null,
                is_pph_applied: false,
            };

            setItems(prev => [...prev, newItem]);
            setShowAddProductModal(false);
            setNewProductData({
                sku: '',
                brand: '',
                name: '',
                pricelist_distributor: '',
                diskon_distributor: '',
                hpp: '',
                price: '',
                description: '',
                image_url: null,
            });
            toast.success('Produk baru berhasil ditambahkan ke quotation!');
        } finally {
            setIsAddingProduct(false);
        }
    };

    const openEditCustomItem = (idx) => {
        const item = items[idx];
        if (!item) return;
        setEditingCustomItemIdx(idx);
        setEditingItemData({
            name: item.name || '',
            sku: item.sku || '',
            brand: item.brand || '',
            pricelist_distributor: item.pricelist_distributor || 0,
            diskon_distributor: item.diskon_distributor || 0,
            hpp: item.hpp || 0,
            price: item.price || 0,
            description: item.description || '',
            image_url: item.image_url || null,
            is_pph_applied: Boolean(item.is_pph_applied),
        });
    };

    const handleSaveCustomItem = async () => {
        if (editingCustomItemIdx === null) return;

        const hpp = Number(editingItemData.hpp) || 0;
        const price = Number(editingItemData.price) || 0;
        const margin = price > 0 && hpp > 0 ? Math.round(((price - hpp) / price) * 100) : 0;
        const sku = (editingItemData.sku || '').trim();
        const name = (editingItemData.name || '').trim();
        const brandName = editingItemData.brand || '';
        const pricelistDist = Number(editingItemData.pricelist_distributor) || 0;
        const diskonDist = Number(editingItemData.diskon_distributor) || 0;

        const matchedBrand = (brands || []).find(b => (typeof b === 'object' ? b.name : b) === brandName);
        const brandId = matchedBrand ? (typeof matchedBrand === 'object' ? matchedBrand.id : null) : null;

        // Save master product changes to products table
        if (sku && name) {
            try {
                await axios.post(route('products.store'), {
                    sku,
                    name,
                    brand_name: brandName,
                    brand_id: brandId,
                    pricelist_distributor: pricelistDist,
                    diskon_distributor: diskonDist,
                    modal: hpp,
                    price: price,
                    description: editingItemData.description || '',
                    image_url: editingItemData.image_url || null,
                }, {
                    headers: { 'Accept': 'application/json' }
                });
            } catch (err) {
                console.log('Notice: Updating product catalog:', err);
            }
        }

        setItems(prev => prev.map((item, i) => {
            if (i !== editingCustomItemIdx) return item;
            return {
                ...item,
                name: name,
                sku: sku,
                brand: brandName,
                pricelist_distributor: pricelistDist,
                diskon_distributor: diskonDist,
                hpp,
                price,
                margin,
                margin_value: Math.max(0, price - hpp),
                description: editingItemData.description,
                image_url: editingItemData.image_url,
                is_pph_applied: Boolean(editingItemData.is_pph_applied),
            };
        }));
        setEditingCustomItemIdx(null);
        toast.success('Detail master produk berhasil diperbarui!');
    };

    // Save state
    const [isSaving, setIsSaving] = useState(false);
    const [showDraftModal, setShowDraftModal] = useState(false);
    const [showSOConfirmModal, setShowSOConfirmModal] = useState(false);

    // Low margin alert
    const MARGIN_MIN = 12;
    const [lowMarginAlert, setLowMarginAlert] = useState(null);

    // ─── Init from quotation ──────────────────────────────────────────────────
    useEffect(() => {
        if (quotation?.items) {
            setItems(
                quotation.items
                    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
                    .map(i => {
                        const prod = i.product || null;
                        const calcHpp = prod?.pricelist_distributor ? Math.round(prod.pricelist_distributor * (1 - (prod.diskon_distributor || 0) / 100)) : 0;
                        const hpp = Number(i.hpp) || Number(prod?.modal) || calcHpp || Number(prod?.hpp) || 0;
                        const price = Number(i.price) || 0;
                        const margin = i.margin != null && i.margin !== '' ? Number(i.margin) : (price > 0 && hpp > 0 ? Math.round(((price - hpp) / price) * 100) : 0);
                        return {
                            id: i.id,
                            product_id: i.product_id || prod?.id || null,
                            sku: i.sku || prod?.sku || '',
                            name: prod?.name || i.name || '',
                            brand: formatBrandName(i.brand || prod?.brand),
                            image_url: i.image_url || prod?.image_url || null,
                            description: i.description || prod?.description || '',
                            qty: Number(i.qty) || 1,
                            hpp,
                            margin,
                            margin_value: Math.max(0, price - hpp),
                            price,
                            pricelist_distributor: Number(i.pricelist_distributor) || Number(prod?.pricelist_distributor) || 0,
                            diskon_distributor: Number(i.diskon_distributor) || Number(prod?.diskon_distributor) || 0,
                            margin_mode: i.margin_mode || 'percent',
                            is_pph_applied: Boolean(i.is_pph_applied),
                        };

                    })
            );
        }
        if (quotation?.expired) {
            const expDate = new Date(quotation.expired);
            const startDate = quotation.date ? new Date(quotation.date) : new Date();
            const diff = Math.ceil(Math.abs(expDate - startDate) / (1000 * 60 * 60 * 24));
            if (diff > 0) setExpiryDays(diff);
        }
        if (quotation?.bank_account_id) {
            setBankAccountId(quotation.bank_account_id);
        } else if (bankAccounts?.length > 0) {
            const def = bankAccounts.find(b => b.is_default) || bankAccounts[0];
            setBankAccountId(def.id);
        }
    }, []);

    // Auto-select primary PIC when customer changes
    useEffect(() => {
        if (!customerId || !customers) return;
        const cust = customers.find(c => String(c.id) === String(customerId));
        if (cust?.pics?.length > 0) {
            const picBelongs = cust.pics.some(p => String(p.id) === String(picId));
            if (!picId || !picBelongs) {
                const primary = cust.pics.find(p => p.is_primary) || cust.pics[0];
                setPicId(String(primary.id));
            }
        } else {
            setPicId('');
        }
    }, [customerId]);

    // ─── Calculations ─────────────────────────────────────────────────────────
    const subtotal = items.reduce((sum, i) => sum + ((Number(i.qty) || 0) * (Number(i.price) || 0)), 0);
    const ppnAmount = (calcTax && showTax) ? Math.round(subtotal * ppnRate) : 0;
    const pphBasis = items.filter(i => i.is_pph_applied).reduce((sum, i) => sum + ((Number(i.qty) || 0) * (Number(i.price) || 0)), 0);
    const pphAmount = calcPph ? Math.round(pphBasis * pphRate) : 0;
    const grandTotal = subtotal + ppnAmount + pphAmount;

    // Brand summary
    const activeBrands = Array.from(new Set(items.map(i => formatBrandName(i.brand)).filter(Boolean)));

const getProductDisplayName = (prod) => {
    if (!prod) return '';
    return prod.name || prod.sku || '';
};

    // ─── Item Handlers ────────────────────────────────────────────────────────
    const handleSelectProduct = (idx, prod) => {
        const displayName = getProductDisplayName(prod);
        setItems(prev => prev.map((item, i) => {
            if (i !== idx) return item;
            const calcHpp = prod.pricelist_distributor ? Math.round(prod.pricelist_distributor * (1 - (prod.diskon_distributor || 0) / 100)) : 0;
            const hpp = Number(prod.modal) || calcHpp || Number(prod.hpp) || 0;
            // Jika price dari katalog lebih kecil dari hpp (margin negatif), default price = hpp agar margin = 0
            const rawPrice = Number(prod.price) || 0;
            const price = rawPrice < hpp ? hpp : rawPrice;
            const margin = price > 0 && hpp > 0 ? Math.max(0, Math.round(((price - hpp) / price) * 100)) : 0;
            return {
                ...item,
                product_id: prod.id || null,
                sku: prod.sku || '',
                name: displayName,
                brand: formatBrandName(prod.brand),
                image_url: prod.image_url || null,
                description: prod.description || '',
                hpp,
                pricelist_distributor: Number(prod.pricelist_distributor) || 0,   // ← tambahkan
                diskon_distributor: Number(prod.diskon_distributor) || 0,        // ← tambahkan
                margin,
                margin_value: Math.max(0, price - hpp),
                price,
            };
        }));
        setOpenDropdownIdx(null);
        setProductSearch('');
    };

    const handleItemChange = (idx, field, value) => {
        setItems(prev => prev.map((item, i) => {
            if (i !== idx) return item;
            const updated = { ...item, [field]: value };
            const hpp = Number(field === 'hpp' ? value : item.hpp) || 0;
            if (field === 'price') {
                const price = Number(value) || 0;
                updated.margin_value = Math.max(0, price - hpp);
                updated.margin = price > 0 ? Math.round(((price - hpp) / price) * 100) : 0;
            }
            if (field === 'margin') {
                const marginPct = Number(value) || 0;
                updated.price = marginPct >= 100 ? item.price : (marginPct > 0 ? Math.round(hpp / (1 - marginPct / 100)) : hpp);
                updated.margin_value = Math.max(0, updated.price - hpp);
            }
            if (field === 'margin_value') {
                const marginRp = Number(value) || 0;
                updated.price = hpp + marginRp;
                updated.margin_value = marginRp;
                updated.margin = updated.price > 0 ? Math.round(((updated.price - hpp) / updated.price) * 100) : 0;
            }
            if (field === 'hpp') {
                if (item.margin_mode === 'rp') {
                    updated.price = hpp + (item.margin_value || 0);
                    updated.margin = updated.price > 0 ? Math.round(((updated.price - hpp) / updated.price) * 100) : 0;
                } else {
                    const marginPct = Number(item.margin) || 0;
                    updated.price = marginPct >= 100 ? item.price : (marginPct > 0 ? Math.round(hpp / (1 - marginPct / 100)) : hpp);
                    updated.margin_value = Math.max(0, updated.price - hpp);
                }
            }
            return updated;
        }));
    };

    const toggleMarginMode = (idx) => {
        setItems(prev => prev.map((item, i) => {
            if (i !== idx) return item;
            return {
                ...item,
                margin_mode: item.margin_mode === 'rp' ? 'percent' : 'rp'
            };
        }));
    };

    const handleItemBlur = (idx) => {
        const item = items[idx];
        if (!item) return;
        const finalMargin = item.price > 0 ? ((item.price - item.hpp) / item.price) * 100 : (item.hpp > 0 ? -100 : 0);
        if (finalMargin < MARGIN_MIN && item.price > 0) {
            setLowMarginAlert({ itemName: item.name || item.sku || 'Item ini', hpp: item.hpp, price: item.price, margin: finalMargin });
        }
    };

    const handleAddItemRow = () => {
        setItems(prev => [...prev, { id: null, product_id: null, sku: '', name: '', brand: '', qty: 1, hpp: 0, margin: 0, margin_value: 0, price: 0, margin_mode: 'percent', is_pph_applied: false }]);
    };

    const handleRemoveItemRow = (idx) => setItems(prev => prev.filter((_, i) => i !== idx));

    // ─── Item Reorder (drag-and-drop) ─────────────────────────────────────────
    const handleDragStart = (e, idx) => {
        if (isReordering) {
            e.preventDefault();
            return;
        }
        setOpenDropdownIdx(null);
        setDragItemIdx(idx);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', String(idx));
    };

    const handleDragEnd = () => {
        setDragItemIdx(null);
        setDragOverIdx(null);
    };

    const handleRowDragOver = (e, idx) => {
        if (dragItemIdx === null || isReordering || idx === dragItemIdx) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (idx !== dragOverIdx) setDragOverIdx(idx);
    };

    const handleRowDrop = (e, idx) => {
        e.preventDefault();
        if (dragItemIdx === null || isReordering) return;
        const from = dragItemIdx;
        const to = idx;
        setDragOverIdx(null);
        setDragItemIdx(null);
        if (from === to) return;
        commitItemReorder(from, to);
    };

    const commitItemReorder = (from, to) => {
        const prevOrder = items;
        const next = [...items];
        const [moved] = next.splice(from, 1);
        next.splice(to, 0, moved);
        const reordered = next.map((it, sortIdx) => ({ ...it, sort_order: sortIdx + 1 }));

        setItems(reordered);

        // Rows that are not saved yet have no DB id; their order is persisted by
        // the regular "Simpan Perubahan" save instead of an immediate request.
        const allSaved = reordered.every(it => it.id != null && it.id !== '');
        if (!allSaved) {
            toast('Urutan item baru akan tersimpan saat Anda klik "Simpan Perubahan".', {
                icon: '↕️',
            });
            return;
        }

        setIsReordering(true);
        axios.post(route('quotations.reorder-items', quotation.id), {
            items: reordered.map(it => Number(it.id)),
        }, {
            headers: { 'Accept': 'application/json' },
        })
            .then(() => toast.success('Urutan item produk berhasil disimpan!'))
            .catch(() => {
                setItems(prevOrder);
                toast.error('Gagal menyimpan urutan item. Urutan dikembalikan ke semula.');
            })
            .finally(() => setIsReordering(false));
    };

    // ─── Terms Templates ──────────────────────────────────────────────────────
    const handleSelectTemplate = (tplId) => {
        const found = termsTemplates.find(t => t.id === tplId);
        if (found) {
            const text = Array.isArray(found.terms) ? found.terms.join('\n') : String(found.terms || '');
            setTermsText(text);
            toast.success(`Template "${found.name}" diterapkan!`);
        }
    };

    const handleSaveTemplate = () => {
        if (!newTplName.trim()) { toast.error('Masukkan nama template!'); return; }
        savePersonalTemplate(userId, newTplName.trim(), termsText);
        setTermsTemplates(getAllTemplatesForUser(userId));
        setShowSaveTplModal(false);
        setNewTplName('');
        toast.success('Template personal berhasil disimpan!');
    };

    const handleDeleteTemplate = () => {
        if (!deleteTargetTemplate) return;
        deletePersonalTemplate(userId, deleteTargetTemplate.id);
        setTermsTemplates(getAllTemplatesForUser(userId));
        toast.success(`Template "${deleteTargetTemplate.name}" berhasil dihapus.`);
        setDeleteTargetTemplate(null);
    };

    // ─── Save ─────────────────────────────────────────────────────────────────
    const handleSaveClick = (e) => {
        e?.preventDefault();
        if (!quotation?.id) return;
        if (status === 'created' || status === 'draft') {
            setShowDraftModal(true);
        } else if (status === 'approved' && quotation?.status !== 'approved') {
            setShowSOConfirmModal(true);
        } else {
            executeSave(status);
        }
    };

    const executeSave = (targetStatus) => {
        setShowDraftModal(false);
        setShowSOConfirmModal(false);
        setIsSaving(true);

        const expDate = new Date();
        expDate.setDate(expDate.getDate() + Number(expiryDays || 7));
        const termsList = termsText.split('\n').map(t => t.trim()).filter(Boolean);

        const payload = {
            customer_id: customerId || quotation.customer_id,
            pic_id: picId && picId !== '' && picId !== '0' ? picId : null,
            status: targetStatus,
            calc_tax: calcTax,
            show_tax: showTax,
            ppn_rate: ppnRate,
            calc_pph: calcPph,
            show_pph: showPph,
            pph_rate: pphRate,
            bank_account_id: bankAccountId || null,
            notes: termsText,
            terms: termsList,
            expired: expDate.toISOString().slice(0, 10),
            subtotal,
            tax_amount: ppnAmount,
            grand_total: grandTotal,
            items: items.filter(i => i.name || i.sku).map((i, sortIdx) => ({
                id: i.id != null ? String(i.id) : null,
                product_id: i.product_id != null ? String(i.product_id) : null,
                sku: i.sku || null,
                name: i.name || null,
                brand: i.brand || null,
                description: i.description || null,
                image_url: i.image_url || null,
                qty: Number(i.qty) || 1,
                price: Number(i.price) || 0,
                hpp: Number(i.hpp) || 0,
                margin: Number(i.margin) || 0,
                is_pph_applied: Boolean(i.is_pph_applied),
                sort_order: sortIdx + 1,
            })),
        };

        router.put(route('quotations.update', quotation.id), payload, {
            preserveScroll: true,
            onSuccess: () => toast.success('Quotation berhasil disimpan!'),
            onError: (errors) => Object.values(errors).forEach(msg => toast.error(msg)),
            onFinish: () => setIsSaving(false),
        });
    };

    // ─── Filtered data ────────────────────────────────────────────────────────
    const filteredCustomers = (customers || []).filter(c =>
        !customerSearch || c.name.toLowerCase().includes(customerSearch.toLowerCase())
    );

    const selectedCustomer = customers?.find(c => String(c.id) === String(customerId));
    const customerPics = selectedCustomer?.pics || [];

    const filteredProducts = (products || []).filter(p => {
        if (!productSearch || !productSearch.trim()) return true;
        const brandName = (typeof p.brand === 'object' ? p.brand?.name : p.brand) || '';
        const searchableText = `${p.name || ''} ${p.sku || ''} ${brandName} ${p.description || ''}`.toLowerCase();
        
        const searchTerms = productSearch.toLowerCase().trim().split(/\s+/).filter(Boolean);
        return searchTerms.every(term => searchableText.includes(term));
    }).slice(0, 50);

    return (
        <AuthenticatedLayout>
            <Head title={`Edit Quotation ${quotation?.id}`} />

            <div className="animate-fade-in-up max-w-6xl">
                {/* ─── Back button ────────────────────────────── */}
                <Link
                    href={route('quotations.index')}
                    className="flex items-center gap-2 text-sm font-semibold text-surface-500 hover:text-brand-600 mb-5 transition-colors w-fit"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Batal &amp; Kembali
                </Link>

                {/* ─── Main card ──────────────────────────────── */}
                <div className="bg-white rounded-2xl border border-surface-200 shadow-sm mb-6">

                    {/* Header */}
                    <div className="px-6 py-5 border-b border-surface-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h2 className="text-xl font-bold text-surface-900">Edit Quotation: <span className="font-mono text-brand-600">{quotation?.id}</span></h2>
                            <p className="text-xs text-surface-400 mt-0.5">Ubah item produk, kalkulasi margin, dan ketentuan penawaran</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <Link
                                href={route('quotations.index')}
                                className="px-4 py-2 text-xs font-semibold text-surface-600 border border-surface-200 rounded-lg hover:bg-surface-50 transition-colors"
                            >
                                Batal
                            </Link>
                            <button
                                onClick={handleSaveClick}
                                disabled={isSaving}
                                className="flex items-center gap-2 px-5 py-2 text-xs font-bold bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-all shadow-sm cursor-pointer disabled:opacity-60"
                            >
                                {isSaving ? <><Loader2 className="w-4 h-4 animate-spin" /> Menyimpan...</> : <><Save className="w-4 h-4" /> Simpan Perubahan</>}
                            </button>
                        </div>
                    </div>

                    {/* ── Customer, PIC, Status, Expiry ─────── */}
                    <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 border-b border-surface-100">
                        {/* Customer */}
                        <div>
                            <label className="text-xs font-semibold text-surface-600 block mb-1">Customer</label>
                            <div className="relative">
                                <div
                                    className="w-full bg-surface-50 border border-surface-200 rounded-lg px-3 py-2.5 text-sm text-surface-700 outline-none cursor-pointer flex items-center justify-between hover:border-brand-400 transition-colors"
                                    onClick={() => setShowCustomerDropdown(v => !v)}
                                >
                                    <span className={selectedCustomer ? 'text-surface-900 font-semibold truncate' : 'text-surface-400'}>
                                        {selectedCustomer?.name || '-- Pilih Customer --'}
                                    </span>
                                    <ChevronDown className="w-4 h-4 text-surface-400 shrink-0 ml-1" />
                                </div>
                                {showCustomerDropdown && (
                                    <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-surface-200 rounded-xl shadow-xl overflow-hidden">
                                        <div className="p-2.5 border-b border-surface-100 bg-surface-50/50">
                                            <div className="flex items-center gap-2 bg-white border border-surface-200 rounded-lg px-3 py-1.5 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20 transition-all">
                                                <Search className="w-4 h-4 text-surface-400 shrink-0" />
                                                <input
                                                    autoFocus
                                                    type="text"
                                                    placeholder="Cari customer..."
                                                    value={customerSearch}
                                                    onChange={e => setCustomerSearch(e.target.value)}
                                                    className="bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-xs w-full text-surface-800 placeholder-surface-400 p-0"
                                                />
                                                {customerSearch && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setCustomerSearch('')}
                                                        className="text-surface-400 hover:text-surface-600 p-0.5"
                                                    >
                                                        <X className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        <div className="max-h-52 overflow-y-auto">
                                            {filteredCustomers.map(c => (
                                                <div
                                                    key={c.id}
                                                    onClick={() => { setCustomerId(String(c.id)); setShowCustomerDropdown(false); setCustomerSearch(''); }}
                                                    className={`px-4 py-2.5 text-sm cursor-pointer hover:bg-brand-50 transition-colors flex items-center justify-between ${String(c.id) === String(customerId) ? 'bg-brand-50 text-brand-700 font-semibold' : 'text-surface-700'}`}
                                                >
                                                    <span>{c.name}</span>
                                                    {String(c.id) === String(customerId) && <Check className="w-4 h-4 text-brand-600" />}
                                                </div>
                                            ))}
                                            {filteredCustomers.length === 0 && <div className="px-4 py-3 text-xs text-surface-400">Tidak ditemukan</div>}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* PIC */}
                        <div>
                            <label className="text-xs font-semibold text-surface-600 block mb-1">PIC Customer</label>
                            <select
                                value={picId}
                                onChange={e => setPicId(e.target.value)}
                                className="w-full bg-surface-50 border border-surface-200 rounded-lg px-3 py-2.5 text-sm text-surface-700 outline-none focus:border-brand-500 cursor-pointer"
                            >
                                <option value="">-- Pilih PIC --</option>
                                {customerPics.map(p => (
                                    <option key={p.id} value={String(p.id)}>
                                        {p.name}{p.is_primary ? ' (Utama)' : ''}{p.phone ? ` — ${p.phone}` : ''}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Status */}
                        <div>
                            <label className="text-xs font-semibold text-surface-600 block mb-1">Status</label>
                            <select
                                value={status}
                                onChange={e => setStatus(e.target.value)}
                                className="w-full bg-surface-50 border border-surface-200 rounded-lg px-3 py-2.5 text-sm text-surface-700 outline-none focus:border-brand-500 cursor-pointer font-semibold"
                            >
                                <option value="created">Created</option>
                                <option value="sent">Sent</option>
                                <option value="approved">PO</option>
                                <option value="rejected">Rejected</option>
                                <option value="expired">Expired</option>
                            </select>
                        </div>

                        {/* Expiry Days */}
                        <div>
                            <label className="text-xs font-semibold text-surface-600 block mb-1">Masa Berlaku (Hari)</label>
                            <input
                                type="number"
                                value={expiryDays}
                                onChange={e => setExpiryDays(Number(e.target.value))}
                                min="1" max="90"
                                className="w-full bg-surface-50 border border-surface-200 rounded-lg px-3 py-2.5 text-sm text-surface-700 outline-none focus:border-brand-500"
                            />
                        </div>
                    </div>

                    {/* ── Tax Options ───────────────────────── */}
                    <div className="px-6 py-4 border-b border-surface-100 flex flex-col xl:flex-row gap-4">
                        <div className="bg-surface-50 rounded-lg px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-4 border border-surface-100 flex-1">
                            <span className="text-xs font-bold text-surface-700 w-32 shrink-0">Pengaturan PPN:</span>
                            <div className="flex flex-wrap items-center gap-5">
                                <label className="flex items-center gap-2 text-sm font-medium text-surface-600 cursor-pointer select-none">
                                    <input type="checkbox" checked={calcTax} onChange={e => setCalcTax(e.target.checked)} className="w-4 h-4 rounded text-brand-500 accent-brand-500 cursor-pointer" />
                                    Hitung PPN 11%
                                </label>
                                <label className={`flex items-center gap-2 text-sm font-medium text-surface-600 cursor-pointer select-none ${!calcTax ? 'opacity-50 pointer-events-none' : ''}`}>
                                    <input type="checkbox" checked={showTax} onChange={e => setShowTax(e.target.checked)} disabled={!calcTax} className="w-4 h-4 rounded text-brand-500 accent-brand-500 cursor-pointer" />
                                    Tampilkan Baris PPN di PDF
                                </label>
                            </div>
                        </div>
                        <div className="bg-surface-50 rounded-lg px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-4 border border-surface-100 flex-1">
                            <span className="text-xs font-bold text-surface-700 w-32 shrink-0">Pengaturan PPh:</span>
                            <div className="flex flex-wrap items-center gap-5">
                                <label className="flex items-center gap-2 text-sm font-medium text-surface-600 cursor-pointer select-none">
                                    <input type="checkbox" checked={calcPph} onChange={e => setCalcPph(e.target.checked)} className="w-4 h-4 rounded text-brand-500 accent-brand-500 cursor-pointer" />
                                    Hitung PPh (2%)
                                </label>
                                <label className={`flex items-center gap-2 text-sm font-medium text-surface-600 cursor-pointer select-none ${!calcPph ? 'opacity-50 pointer-events-none' : ''}`}>
                                    <input type="checkbox" checked={showPph} onChange={e => setShowPph(e.target.checked)} disabled={!calcPph} className="w-4 h-4 rounded text-brand-500 accent-brand-500 cursor-pointer" />
                                    Tampilkan Baris PPh di PDF
                                </label>
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (!calcPph) setCalcPph(true);
                                        setShowPphModal(true);
                                    }}
                                    className="px-3 py-1 text-xs font-bold text-emerald-700 border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                                >
                                    Atur PPh Jasa
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* ── Bank Account ─────────────────────── */}
                    <div className="px-6 py-4 border-b border-surface-100">
                        <div className="bg-surface-50 rounded-lg px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-4 border border-surface-100">
                            <span className="text-xs font-bold text-surface-700 whitespace-nowrap">Rekening Bank:</span>
                            <div className="flex items-center gap-5 flex-1">
                                <select
                                    value={bankAccountId}
                                    onChange={e => setBankAccountId(e.target.value)}
                                    className="w-full max-w-sm bg-white border border-surface-200 rounded-lg px-3 py-1.5 text-sm text-surface-700 outline-none focus:border-brand-500 cursor-pointer"
                                >
                                    <option value="">-- Pilih Rekening --</option>
                                    {(bankAccounts || []).map(b => (
                                        <option key={b.id} value={b.id}>
                                            {b.bank_name} - {b.account_name} ({b.account_number}){b.is_default ? ' [Default]' : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* ── Brand summary ─────────────────────── */}
                    {activeBrands.length > 0 && (
                        <div className="px-6 pb-5 pt-4">
                            <div className="bg-surface-50 rounded-lg px-4 py-3 flex items-center gap-3 border border-surface-100">
                                <span className="text-xs font-semibold text-surface-400">Brand dalam quotation ini:</span>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    {activeBrands.map((b, idx) => (
                                        <span key={idx} className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${brandClasses(b)}`}>{b}</span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* ─── Item Produk Table Card ─────────────── */}
                <div className="bg-white rounded-2xl border border-surface-200 shadow-sm mb-6">
                    <div className="px-6 py-4 border-b border-surface-100 flex items-center justify-between">
                        <div>
                            <h3 className="text-sm font-bold text-surface-800">Item Produk <span className="text-xs font-normal text-surface-400 ml-1">— pilih produk dari brand manapun</span></h3>
                            {isReordering && (
                                <span className="mt-1 inline-flex items-center gap-1.5 text-[11px] font-semibold text-brand-600">
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Menyimpan urutan item...
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => {
                                    setNewProductData({
                                        sku: '',
                                        brand: '',
                                        name: '',
                                        pricelist_distributor: '',
                                        diskon_distributor: '',
                                        hpp: '',
                                        price: '',
                                        description: '',
                                        image_url: null,
                                    });
                                    setShowAddProductModal(true);
                                }}
                                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-white text-surface-700 border border-surface-300 rounded-lg hover:bg-surface-50 transition-all cursor-pointer shadow-2xs"
                            >
                                <Plus className="w-3.5 h-3.5 text-surface-500" />
                                Produk Baru
                            </button>
                            <button
                                type="button"
                                onClick={handleAddItemRow}
                                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-brand-50 text-brand-700 border border-brand-200 rounded-lg hover:bg-brand-100 transition-all cursor-pointer"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                Tambah Baris Produk
                            </button>
                        </div>
                    </div>

                    {/* Backdrop to close dropdown */}
                    {openDropdownIdx !== null && (
                        <div className="fixed inset-0 z-40" onClick={() => setOpenDropdownIdx(null)} />
                    )}
                    {showCustomerDropdown && (
                        <div className="fixed inset-0 z-40" onClick={() => { setShowCustomerDropdown(false); setCustomerSearch(''); }} />
                    )}

                    <div className="overflow-x-auto pb-32">
                        {items.length === 0 ? (
                            <div className="py-12 flex flex-col items-center justify-center text-surface-400">
                                <FileText className="w-10 h-10 mb-3 text-surface-300" />
                                <span className="text-sm font-medium">Belum ada item produk.</span>
                                <span className="text-xs mt-1">Klik "Tambah Baris Produk" untuk mulai menambahkan.</span>
                            </div>
                        ) : (
                            <table className="w-full text-left border-collapse min-w-[1100px]">
                                <thead>
                                    <tr className="bg-surface-50 border-b border-surface-200">
                                        <th className="py-3 px-1.5 w-9"></th>
                                        <th className="py-3 px-3 text-center text-xs font-bold text-surface-400 uppercase w-10">NO</th>
                                        <th className="py-3 px-3 text-left text-xs font-bold text-surface-400 uppercase min-w-[280px]">PRODUK</th>
                                        <th className="py-3 px-3 text-left text-xs font-bold text-surface-400 uppercase w-24">BRAND</th>
                                        <th className="py-3 px-3 text-center text-xs font-bold text-surface-400 uppercase w-16">QTY</th>
                                        <th className="py-3 px-3 text-right text-xs font-bold text-surface-400 uppercase min-w-[130px]">MODAL (HPP)</th>
                                        <th className="py-3 px-3 text-center text-xs font-bold text-surface-400 uppercase min-w-[110px]">MARGIN</th>
                                        <th className="py-3 px-3 text-right text-xs font-bold text-surface-400 uppercase min-w-[130px]">HARGA SATUAN</th>
                                        <th className="py-3 px-3 text-right text-xs font-bold text-surface-400 uppercase min-w-[120px]">TOTAL</th>
                                        <th className="py-3 px-3 w-10"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-surface-100">
                                    {items.map((item, idx) => (
                                        <tr
                                            key={idx}
                                            onDragOver={e => handleRowDragOver(e, idx)}
                                            onDrop={e => handleRowDrop(e, idx)}
                                            className={`transition-colors group ${dragItemIdx === idx ? 'opacity-40 bg-brand-50/40' : ''} ${
                                                dragOverIdx === idx && dragItemIdx !== null && dragItemIdx !== idx
                                                    ? 'ring-2 ring-inset ring-brand-300 bg-brand-50/60'
                                                    : ''
                                            } hover:bg-surface-50/50`}
                                        >
                                            {/* Drag handle */}
                                            <td className="py-2 px-1.5 w-9">
                                                <span
                                                    draggable={!isReordering}
                                                    onDragStart={e => handleDragStart(e, idx)}
                                                    onDragEnd={handleDragEnd}
                                                    title="Drag untuk mengubah urutan item"
                                                    className={`inline-flex items-center justify-center w-6 h-7 rounded-md transition-colors cursor-grab active:cursor-grabbing select-none ${
                                                        isReordering
                                                            ? 'opacity-40 cursor-not-allowed'
                                                            : 'text-surface-300 hover:text-brand-600 hover:bg-brand-50'
                                                    }`}
                                                >
                                                    <GripVertical className="w-4 h-4" />
                                                </span>
                                            </td>
                                            <td className="py-2 px-3 text-xs font-bold text-surface-400 text-center">{idx + 1}</td>

                                            {/* Product selector */}
                                            <td className="py-2 px-3 relative min-w-[320px]">
                                                <div
                                                    className={`w-full bg-white border rounded-lg px-3 py-2 flex items-center justify-between gap-2 transition-all ${
                                                        openDropdownIdx === idx
                                                            ? 'border-brand-500 ring-2 ring-brand-500/20 shadow-xs'
                                                            : 'border-surface-200 hover:border-surface-300 hover:bg-surface-50/30'
                                                    }`}
                                                >
                                                    {openDropdownIdx === idx ? (
                                                        <div className="flex items-center gap-2 min-w-0 flex-1">
                                                            <Search className="w-4 h-4 text-brand-500 shrink-0" />
                                                            <input
                                                                autoFocus
                                                                type="text"
                                                                placeholder="Cari nama / SKU produk..."
                                                                value={productSearch}
                                                                onChange={e => setProductSearch(e.target.value)}
                                                                onClick={e => e.stopPropagation()}
                                                                className="w-full bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-sm font-semibold text-surface-900 p-0"
                                                            />
                                                            {productSearch && (
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => { e.stopPropagation(); setProductSearch(''); }}
                                                                    className="text-surface-400 hover:text-surface-600 p-0.5"
                                                                >
                                                                    <X className="w-3.5 h-3.5" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <div
                                                            className="flex flex-col min-w-0 flex-1 cursor-pointer justify-center"
                                                            onClick={() => setOpenDropdownIdx(idx)}
                                                        >
                                                            <div className={`text-sm font-bold truncate flex items-center gap-2 ${item.name ? 'text-surface-900' : 'text-surface-400'}`}>
                                                                <span className="truncate">{item.name || 'Pilih / cari produk...'}</span>
                                                                {calcPph && item.is_pph_applied && (
                                                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">
                                                                        PPh 2%
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {item.sku && item.sku !== item.name && (
                                                                <div className="text-xs font-mono text-surface-400 truncate mt-0.5">
                                                                    {item.sku}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}

                                                    <div className="flex items-center gap-1.5 shrink-0 text-surface-400">
                                                        {item.name && (   // ← bungkus dengan kondisi ini
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    openEditCustomItem(idx);
                                                                }}
                                                                title="Edit detail item produk"
                                                                className="p-1 hover:text-brand-600 hover:bg-brand-50 rounded transition-colors cursor-pointer"
                                                            >
                                                                <Edit3 className="w-3.5 h-3.5" />
                                                            </button>
                                                        )}
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setOpenDropdownIdx(openDropdownIdx === idx ? null : idx);
                                                            }}
                                                            className="p-1 hover:text-surface-600 transition-colors cursor-pointer"
                                                        >
                                                            <ChevronDown className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </div>

                                                {openDropdownIdx === idx && (
                                                    <div className="absolute top-full left-0 z-50 mt-1.5 w-full min-w-[340px] bg-white border border-surface-200 rounded-xl shadow-xl overflow-hidden animate-fade-in">
                                                        <div className="max-h-60 overflow-y-auto divide-y divide-surface-100">
                                                            {filteredProducts.map(p => (
                                                                <div
                                                                    key={p.id || p.sku}
                                                                    onClick={() => handleSelectProduct(idx, p)}
                                                                    className="p-3 cursor-pointer hover:bg-brand-50/60 transition-colors flex items-center justify-between gap-3 group"
                                                                >
                                                                    <div className="min-w-0 flex-1">
                                                                        <div className="text-xs font-bold text-surface-900 group-hover:text-brand-700 truncate">
                                                                            {getProductDisplayName(p)}
                                                                        </div>
                                                                        {p.sku && p.sku !== p.name && (
                                                                            <div className="text-[11px] text-surface-400 font-mono mt-0.5">
                                                                                {p.sku}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    <div className="shrink-0 text-right flex flex-col items-end gap-1">
                                                                        {p.brand && (
                                                                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border ${brandClasses(p.brand?.name || p.brand)}`}>
                                                                                {p.brand?.name || p.brand}
                                                                            </span>
                                                                        )}
                                                                        <div className="text-xs font-bold text-brand-600">
                                                                            {formatCurrency(Number(p.price) || Number(p.modal) || Number(p.hpp) || (p.pricelist_distributor ? Math.round(p.pricelist_distributor * (1 - (p.diskon_distributor || 0) / 100)) : 0))}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                            {filteredProducts.length === 0 && (
                                                                <div className="p-4 text-center text-xs text-surface-400">
                                                                    Produk tidak ditemukan
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </td>

                                            {/* Brand */}
                                            <td className="py-2 px-3">
                                                {item.brand ? (
                                                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${brandClasses(item.brand)}`}>{item.brand}</span>
                                                ) : (
                                                    <input
                                                        type="text"
                                                        value={item.brand}
                                                        onChange={e => handleItemChange(idx, 'brand', e.target.value)}
                                                        placeholder="Brand"
                                                        className="w-full text-xs border border-surface-200 rounded-lg px-2 py-1.5 outline-none focus:border-brand-500 bg-surface-50"
                                                    />
                                                )}
                                            </td>

                                            {/* QTY */}
                                            <td className="py-2 px-3 w-20 min-w-[70px] text-center">
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={item.qty ?? 1}
                                                    onChange={e => handleItemChange(idx, 'qty', Number(e.target.value))}
                                                    className="w-14 text-center text-xs font-bold text-surface-900 border border-surface-200 rounded-lg px-1 py-1.5 outline-none focus:border-brand-500 bg-white shadow-xs mx-auto block [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                />
                                            </td>

                                            {/* HPP / Modal */}
                                            <td className="py-2 px-3">
                                                <EditableCurrencyInput
                                                    value={item.hpp}
                                                    onChange={val => { handleItemChange(idx, 'hpp', Number(val)); }}
                                                    className="w-full text-right text-xs font-mono border border-surface-200 rounded-lg px-2 py-1.5 outline-none focus:border-brand-500 bg-surface-50"
                                                    placeholder="0"
                                                />
                                            </td>

                                            {/* Margin */}
                                            <td className="py-2 px-3">
                                                <div className="flex items-center gap-1.5 justify-center">
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleMarginMode(idx)}
                                                        title={item.margin_mode === 'rp' ? 'Klik untuk ubah ke mode Persentase (%)' : 'Klik untuk ubah ke mode Nominal (Rp)'}
                                                        className={`px-2 py-1 text-xs font-bold rounded-md shrink-0 select-none cursor-pointer transition-colors ${
                                                            item.margin_mode === 'rp'
                                                                ? 'bg-purple-100 text-purple-800 hover:bg-purple-200 border border-purple-200'
                                                                : 'bg-teal-100 text-teal-800 hover:bg-teal-200 border border-teal-200'
                                                        }`}
                                                    >
                                                        {item.margin_mode === 'rp' ? 'Rp' : '%'}
                                                    </button>

                                                    {item.margin_mode === 'rp' ? (
                                                        <EditableCurrencyInput
                                                            value={item.margin_value}
                                                            onChange={val => handleItemChange(idx, 'margin_value', Number(val))}
                                                            onBlur={() => handleItemBlur(idx)}
                                                            className={`w-28 text-right text-xs font-mono font-bold border rounded-lg px-2 py-1.5 outline-none focus:border-brand-500 ${
                                                                item.margin < MARGIN_MIN && item.price > 0 ? 'border-red-300 bg-red-50 text-red-700' : 'border-surface-200 bg-surface-50 text-surface-700'
                                                            }`}
                                                            placeholder="0"
                                                        />
                                                    ) : (
                                                        <input
                                                            type="number"
                                                            value={item.margin ?? 0}
                                                            onChange={e => handleItemChange(idx, 'margin', Number(e.target.value))}
                                                            onBlur={() => handleItemBlur(idx)}
                                                            className={`w-16 text-center text-xs font-bold border rounded-lg px-2 py-1.5 outline-none focus:border-brand-500 ${
                                                                item.margin < MARGIN_MIN && item.price > 0 ? 'border-red-300 bg-red-50 text-red-700' : 'border-surface-200 bg-surface-50 text-surface-700'
                                                            }`}
                                                            min="0" max="100"
                                                        />
                                                    )}
                                                </div>
                                            </td>

                                            {/* Harga Satuan */}
                                            <td className="py-2 px-3">
                                                <EditableCurrencyInput
                                                    value={item.price}
                                                    onChange={val => { handleItemChange(idx, 'price', Number(val)); }}
                                                    className="w-full text-right text-xs font-mono border border-surface-200 rounded-lg px-2 py-1.5 outline-none focus:border-brand-500 bg-surface-50"
                                                    placeholder="0"
                                                />
                                            </td>

                                            {/* Total */}
                                            <td className="py-2 px-3 text-xs font-extrabold text-right text-surface-900">
                                                {formatCurrency((Number(item.qty) || 0) * (Number(item.price) || 0))}
                                            </td>

                                            {/* Delete */}
                                            <td className="py-2 px-3 text-center">
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveItemRow(idx)}
                                                    className="w-7 h-7 rounded-md flex items-center justify-center text-surface-300 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer mx-auto"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>

                    {/* Subtotal Footer */}
                    {items.length > 0 && (
                        <div className="border-t border-surface-200 px-6 py-4 bg-surface-50/50">
                            <div className="flex flex-col items-end gap-1.5">
                                <div className="flex items-center gap-8 text-xs text-surface-600">
                                    <span className="w-32 text-right">Subtotal</span>
                                    <span className="font-bold text-surface-800 w-36 text-right">{formatCurrency(subtotal)}</span>
                                </div>
                                {calcTax && showTax && (
                                    <div className="flex items-center gap-8 text-xs text-surface-600">
                                        <span className="w-32 text-right">PPN ({Math.round(ppnRate * 100)}%)</span>
                                        <span className="font-bold text-surface-800 w-36 text-right">{formatCurrency(ppnAmount)}</span>
                                    </div>
                                )}
                                {calcPph && (
                                    <div className="flex items-center gap-8 text-xs text-surface-600">
                                        <span className="w-32 text-right">PPh ({Math.round(pphRate * 100)}%)</span>
                                        <span className="font-bold text-surface-800 w-36 text-right">- {formatCurrency(pphAmount)}</span>
                                    </div>
                                )}
                                <div className="w-44 h-px bg-surface-200 ml-auto" />
                                <div className="flex items-center gap-8 text-sm pt-1">
                                    <span className="font-bold text-surface-800 w-32 text-right">Grand Total</span>
                                    <span className="font-extrabold text-brand-700 w-36 text-right text-base">{formatCurrency(grandTotal)}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* ─── Sales Zone Card ────────────────────── */}
                <SalesZoneCard
                    items={items}
                    quotationId={quotation?.id}
                    quotation={{
                        ...quotation,
                        calc_tax: calcTax,
                        calc_pph: calcPph,
                        pph_rate: pphRate,
                        items: items,
                    }}
                    currentUser={currentUser}
                />

                {/* ─── Syarat & Ketentuan Card ─────────────── */}
                <div className="bg-white rounded-2xl border border-surface-200 shadow-sm overflow-hidden mb-6">
                    <div className="px-6 py-4 border-b border-surface-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-surface-400" />
                            <div>
                                <span className="text-sm font-bold text-surface-800">Syarat &amp; Ketentuan</span>
                                <p className="text-xs text-surface-400">Pilih template preset atau tulis poin khusus (satu baris per poin).</p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setShowSaveTplModal(true)}
                            className="flex items-center gap-1.5 text-xs font-semibold text-brand-600 border border-brand-200 bg-brand-50 hover:bg-brand-100 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                        >
                            <BookmarkPlus className="w-3.5 h-3.5" /> Simpan sebagai Template Baru
                        </button>
                    </div>
                    <div className="p-5">
                        {termsTemplates.length > 0 && (
                            <div className="mb-3">
                                <label className="text-xs font-semibold text-surface-500 block mb-1">Template Preset:</label>
                                <select
                                    onChange={e => { if (e.target.value) handleSelectTemplate(e.target.value); e.target.value = ''; }}
                                    className="text-xs border border-surface-200 rounded-lg px-2 py-1.5 bg-surface-50 text-surface-700 outline-none focus:border-brand-500 cursor-pointer max-w-full"
                                    defaultValue=""
                                >
                                    <option value="">-- Pilih template preset --</option>
                                    {termsTemplates.filter(t => t.type === 'master' || !t.type).length > 0 && (
                                        <optgroup label="🏢 Master Template (Global)">
                                            {termsTemplates.filter(t => t.type === 'master' || !t.type).map(t => (
                                                <option key={t.id} value={t.id}>{t.name}</option>
                                            ))}
                                        </optgroup>
                                    )}
                                    {termsTemplates.filter(t => t.type === 'personal').length > 0 && (
                                        <optgroup label="👤 Personal Preset (Saya)">
                                            {termsTemplates.filter(t => t.type === 'personal').map(t => (
                                                <option key={t.id} value={t.id}>{t.name}</option>
                                            ))}
                                        </optgroup>
                                    )}
                                </select>
                            </div>
                        )}
                        <textarea
                            value={termsText}
                            onChange={e => setTermsText(e.target.value)}
                            rows={6}
                            placeholder="Masukkan syarat & ketentuan (satu per baris)..."
                            className="w-full bg-surface-50 border border-surface-200 rounded-lg px-3 py-2.5 text-sm text-surface-700 outline-none focus:border-brand-500 transition-colors resize-y"
                        />
                        <p className="text-[11px] text-surface-400 mt-1.5 flex items-center gap-1">
                            <Info className="w-3.5 h-3.5 shrink-0" />
                            Satu baris = satu poin syarat &amp; ketentuan
                        </p>
                    </div>
                </div>

                {/* ─── Bottom Action ────────────────────────── */}
                <div className="flex items-center justify-between py-4">
                    <Link href={route('quotations.index')} className="px-4 py-2 text-xs font-semibold text-surface-600 border border-surface-200 rounded-lg hover:bg-surface-50 transition-colors">
                        Batal
                    </Link>
                    <button
                        onClick={handleSaveClick}
                        disabled={isSaving}
                        className="flex items-center gap-2 px-6 py-2.5 text-sm font-bold bg-brand-500 text-white rounded-xl hover:bg-brand-600 shadow-sm transition-all cursor-pointer disabled:opacity-60"
                    >
                        {isSaving ? <><Loader2 className="w-4 h-4 animate-spin" /> Menyimpan...</> : <><Save className="w-4 h-4" /> Simpan Perubahan</>}
                    </button>
                </div>
            </div>

            {/* ─── Draft Confirmation Modal ─────── */}
            {showDraftModal && ReactDOM.createPortal(
                <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-surface-900/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center animate-scale-in">
                        <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center mx-auto mb-4 border border-amber-100">
                            <AlertTriangle className="w-6 h-6" />
                        </div>
                        <h3 className="text-base font-bold text-surface-900 mb-1">Simpan sebagai Created?</h3>
                        <p className="text-xs text-surface-500 mb-6 leading-relaxed">
                            Quotation akan disimpan dengan status <strong>Created</strong>. Ubah status ke <strong>Sent</strong> setelah dikirim ke customer.
                        </p>
                        <div className="flex items-center justify-center gap-3">
                            <button onClick={() => setShowDraftModal(false)} className="px-4 py-2 text-xs font-semibold border border-surface-200 rounded-lg text-surface-700 hover:bg-surface-50 transition-colors cursor-pointer">Batal</button>
                            <button onClick={() => executeSave('created')} className="flex items-center gap-2 px-4 py-2 text-xs font-bold bg-brand-500 hover:bg-brand-600 text-white rounded-lg transition-all shadow-sm cursor-pointer">
                                <Save className="w-4 h-4" /> Ya, Simpan
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* ─── PO / SO Confirmation Modal ───── */}
            {showSOConfirmModal && ReactDOM.createPortal(
                <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-surface-900/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-scale-in">
                        <div className="flex items-center gap-3 text-emerald-600 mb-4">
                            <div className="p-3 bg-emerald-100 rounded-full">
                                <AlertTriangle className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-bold text-surface-900">Konfirmasi Purchase Order (PO)</h3>
                        </div>

                        <p className="text-sm text-surface-600 mb-6 leading-relaxed">
                            Anda mengubah status menjadi <span className="font-bold text-emerald-600">PO (Approved)</span>. 
                            Sistem akan secara otomatis <strong>men-generate dokumen Sales Order (SO)</strong> berdasarkan quotation ini. Lanjutkan?
                        </p>

                        <div className="flex items-center justify-end gap-3 pt-4 border-t border-surface-100">
                            <button
                                type="button"
                                onClick={() => setShowSOConfirmModal(false)}
                                className="px-5 py-2.5 text-xs font-semibold text-surface-600 bg-surface-100 rounded-xl hover:bg-surface-200 transition-colors cursor-pointer"
                                disabled={isSaving}
                            >
                                Batal
                            </button>
                            <button
                                type="button"
                                onClick={() => executeSave('approved')}
                                className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition-all shadow-sm flex items-center gap-2 cursor-pointer"
                                disabled={isSaving}
                            >
                                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                Ya, Generate SO
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* ─── Save Template Modal ─────────── */}
            {showSaveTplModal && ReactDOM.createPortal(
                <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-surface-900/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-scale-in">
                        <h3 className="text-base font-bold text-surface-900 mb-4">Simpan Template S&K</h3>
                        <input
                            type="text"
                            placeholder="Nama template..."
                            value={newTplName}
                            onChange={e => setNewTplName(e.target.value)}
                            autoFocus
                            className="w-full bg-surface-50 border border-surface-200 rounded-lg px-3 py-2.5 text-sm text-surface-700 outline-none focus:border-brand-500 mb-4"
                        />
                        <div className="flex items-center justify-end gap-3">
                            <button onClick={() => { setShowSaveTplModal(false); setNewTplName(''); }} className="px-4 py-2 text-xs font-semibold border border-surface-200 rounded-lg text-surface-700 hover:bg-surface-50 cursor-pointer">Batal</button>
                            <button onClick={handleSaveTemplate} className="flex items-center gap-2 px-4 py-2 text-xs font-bold bg-brand-500 hover:bg-brand-600 text-white rounded-lg cursor-pointer">
                                <BookmarkPlus className="w-4 h-4" /> Simpan
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* ─── Low Margin Alert ────────────── */}
            {lowMarginAlert && ReactDOM.createPortal(
                <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-surface-900/50 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-scale-in">
                        {/* Header */}
                        <div className="flex items-center gap-3 px-6 py-5 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-100">
                            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                                <AlertTriangle className="w-5 h-5 text-amber-600" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-amber-900">Margin Di Bawah Batas Minimum</h3>
                                <p className="text-xs text-amber-700 mt-0.5">Diperlukan approval sebelum dikirim ke customer</p>
                            </div>
                        </div>

                        {/* Body */}
                        <div className="px-6 py-5 flex flex-col gap-4">
                            <div className="text-sm text-surface-700">
                                Produk <span className="font-semibold text-surface-900">"{lowMarginAlert.itemName}"</span> memiliki margin sales{' '}
                                <span className="font-bold text-red-600">{lowMarginAlert.margin.toFixed(2)}%</span>,{' '}
                                di bawah batas minimum <span className="font-bold text-amber-700">{MARGIN_MIN}%</span>.
                            </div>

                            {/* Kalkulasi transparan */}
                            <div className="bg-surface-50 border border-surface-200 rounded-xl p-4 flex flex-col gap-2">
                                <div className="text-[11px] font-bold text-surface-400 uppercase tracking-wider mb-1">Perhitungan Margin Aktual</div>
                                <div className="text-xs text-surface-600 font-mono space-y-1">
                                    <div className="flex justify-between">
                                        <span className="text-surface-500">Harga Jual</span>
                                        <span className="font-semibold text-surface-800">{formatCurrency(lowMarginAlert.price)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-surface-500">Modal (HPP)</span>
                                        <span className="font-semibold text-surface-800">- {formatCurrency(lowMarginAlert.hpp)}</span>
                                    </div>
                                    <div className="border-t border-surface-200 my-1" />
                                    <div className="flex justify-between">
                                        <span className="text-surface-500">Selisih</span>
                                        <span className="font-semibold text-surface-800">{formatCurrency(lowMarginAlert.price - lowMarginAlert.hpp)}</span>
                                    </div>
                                    <div className="flex justify-between items-center mt-1 pt-1 border-t border-dashed border-surface-200">
                                        <span className="text-surface-600 font-medium">Margin = Selisih ÷ Harga Jual</span>
                                        <span className="font-bold text-red-600 text-sm">{lowMarginAlert.margin.toFixed(2)}%</span>
                                    </div>
                                </div>
                                <div className="mt-2 text-[10px] text-surface-400 italic">Rumus: (Harga Jual − Modal) ÷ Harga Jual × 100</div>
                            </div>

                            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                                <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                                <p className="text-xs text-amber-800">
                                    Harga jual dapat tetap digunakan, namun penawaran ini <strong>memerlukan approval dari manager</strong> sebelum dikirim ke customer.
                                    Tidak ada perubahan pada nilai yang sudah diinput.
                                </p>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 bg-surface-50 border-t border-surface-100 flex justify-end">
                            <button
                                type="button"
                                onClick={() => setLowMarginAlert(null)}
                                className="flex items-center gap-2 px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer"
                            >
                                <Check className="w-4 h-4" />
                                Saya Mengerti
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* ─── Edit Master Produk Katalog Modal ─────── */}
            {editingCustomItemIdx !== null && ReactDOM.createPortal(
                <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-surface-900/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-scale-in max-h-[90vh] flex flex-col">
                        {/* Header */}
                        <div className="px-6 py-4 border-b border-surface-100 flex items-center justify-between bg-white shrink-0">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-brand-50 text-brand-600 rounded-lg">
                                    <Edit3 className="w-4 h-4" />
                                </div>
                                <h3 className="text-base font-bold text-surface-900">Edit Master Produk Katalog</h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setEditingCustomItemIdx(null)}
                                className="text-surface-400 hover:text-surface-600 transition-colors p-1 rounded-lg hover:bg-surface-100 cursor-pointer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        
                        {/* Body */}
                        <div className="p-6 overflow-y-auto flex flex-col gap-4">
                            {/* Row 1: SKU & Brand */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-semibold text-surface-600 block mb-1">SKU Produk</label>
                                    <input
                                        type="text"
                                        value={editingItemData.sku}
                                        onChange={e => setEditingItemData(prev => ({ ...prev, sku: e.target.value }))}
                                        placeholder="CP700"
                                        className="w-full bg-surface-50 border border-surface-200 rounded-lg px-3 py-2 text-xs text-surface-800 outline-none focus:border-brand-500 font-mono"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-surface-600 block mb-1">Brand</label>
                                    <input
                                        type="text"
                                        value={editingItemData.brand}
                                        onChange={e => setEditingItemData(prev => ({ ...prev, brand: e.target.value }))}
                                        placeholder="Yealink"
                                        className="w-full bg-surface-50 border border-surface-200 rounded-lg px-3 py-2 text-xs text-surface-800 outline-none focus:border-brand-500 font-medium"
                                    />
                                </div>
                            </div>

                            {/* Row 2: Nama Master Produk */}
                            <div>
                                <label className="text-xs font-semibold text-surface-600 block mb-1">
                                    Nama Master Produk <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={editingItemData.name}
                                    onChange={e => setEditingItemData(prev => ({ ...prev, name: e.target.value }))}
                                    placeholder="Contoh: Yealink CP700 Speakerphone"
                                    className="w-full bg-white border border-surface-200 rounded-lg px-3 py-2 text-xs font-bold text-surface-900 outline-none focus:border-brand-500"
                                />
                            </div>

                            {/* Card Section: HARGA DISTRIBUTOR */}
                            <div className="bg-surface-50/60 border border-surface-200 rounded-xl p-4 flex flex-col gap-3">
                                <div className="text-[11px] font-bold text-surface-400 uppercase tracking-wider">HARGA DISTRIBUTOR</div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs font-medium text-surface-600 block mb-1">Pricelist Distributor (Rp)</label>
                                        <EditableCurrencyInput
                                            value={editingItemData.pricelist_distributor}
                                            onChange={val => {
                                                const pl = Number(val);
                                                const disc = Number(editingItemData.diskon_distributor) || 0;
                                                const autoHpp = pl ? Math.round(pl * (1 - disc / 100)) : editingItemData.hpp;
                                                setEditingItemData(prev => ({ ...prev, pricelist_distributor: pl, hpp: autoHpp }));
                                            }}
                                            placeholder="Rp 0"
                                            className="w-full bg-white border border-surface-200 rounded-lg px-3 py-2 text-xs text-surface-800 outline-none focus:border-brand-500 font-mono"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-surface-600 block mb-1">Diskon Distributor (%)</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                value={editingItemData.diskon_distributor || ''}
                                                onChange={e => {
                                                    const disc = Number(e.target.value);
                                                    const pl = Number(editingItemData.pricelist_distributor) || 0;
                                                    const autoHpp = pl ? Math.round(pl * (1 - disc / 100)) : editingItemData.hpp;
                                                    setEditingItemData(prev => ({ ...prev, diskon_distributor: disc, hpp: autoHpp }));
                                                }}
                                                placeholder="0"
                                                className="w-full bg-white border border-surface-200 rounded-lg px-3 py-2 text-xs text-surface-800 outline-none focus:border-brand-500 pr-7 font-mono"
                                            />
                                            <span className="absolute right-3 top-2 text-xs text-surface-400 font-bold">%</span>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <label className="text-xs font-semibold text-surface-600">Harga Modal / HPP (Rp)</label>
                                        <span className="text-[10px] font-bold px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded">Auto</span>
                                    </div>
                                    <EditableCurrencyInput
                                        value={editingItemData.hpp}
                                        onChange={val => {
                                            const hpp = Number(val) || 0;
                                            const pl = Number(editingItemData.pricelist_distributor) || 0;
                                            if (pl > 0) {
                                                const calcDiskon = (1 - hpp / pl) * 100;
                                                setEditingItemData(prev => ({ ...prev, hpp, diskon_distributor: calcDiskon > 0 ? parseFloat(calcDiskon.toFixed(2)) : 0 }));
                                            } else {
                                                setEditingItemData(prev => ({ ...prev, hpp }));
                                            }
                                        }}
                                        placeholder="Rp 0"
                                        className="w-full bg-emerald-50/50 border border-emerald-300 rounded-lg px-3 py-2 text-xs font-bold text-surface-900 outline-none focus:border-emerald-500 font-mono"
                                    />
                                    <p className="text-[10px] text-surface-400 mt-1">Rumus: Pricelist × (1 - Diskon%) - dapat diubah manual</p>
                                </div>
                            </div>

                            {/* HARGA JUAL REFERENSI */}
                            <div>
                                <label className="text-xs font-semibold text-surface-600 block mb-1">
                                    HARGA JUAL REFERENSI (IDR) <span className="text-surface-400 font-normal">(opsional)</span>
                                </label>
                                <EditableCurrencyInput
                                    value={editingItemData.price}
                                    onChange={val => setEditingItemData(prev => ({ ...prev, price: Number(val) }))}
                                    placeholder="Rp 0"
                                    className="w-full bg-white border border-surface-200 rounded-lg px-3 py-2 text-xs font-bold text-surface-900 outline-none focus:border-brand-500 font-mono"
                                />
                                <p className="text-[10px] text-surface-400 mt-1">
                                    Harga referensi di katalog. Harga final penawaran dihitung berdasarkan Margin Sales di form Quotation.
                                </p>
                            </div>

                            {/* Deskripsi Master */}
                            <div>
                                <label className="text-xs font-semibold text-surface-600 block mb-1">Deskripsi Master (Opsional)</label>
                                <textarea
                                    rows={3}
                                    value={editingItemData.description}
                                    onChange={e => setEditingItemData(prev => ({ ...prev, description: e.target.value }))}
                                    placeholder="Ultra-compact Flexible Speakerphone..."
                                    className="w-full bg-surface-50 border border-surface-200 rounded-lg px-3 py-2 text-xs text-surface-800 outline-none focus:border-brand-500 resize-y"
                                />
                            </div>

                            {/* Gambar Produk Master */}
                            <div>
                                <label className="text-xs font-semibold text-surface-600 block mb-1">Gambar Produk Master</label>
                                <input
                                    type="file"
                                    ref={editItemFileInputRef}
                                    onChange={handleEditItemImageSelect}
                                    accept="image/png, image/jpeg, image/webp"
                                    className="hidden"
                                />
                                {editingItemData.image_url ? (
                                    <div className="bg-surface-50 border border-surface-200 rounded-xl p-3 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <img src={editingItemData.image_url} alt="Preview" className="w-10 h-10 object-contain rounded-lg bg-white border border-surface-200 p-1" />
                                            <div className="text-xs text-surface-600 font-medium truncate max-w-[200px]">Gambar Siap Digunakan</div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => editItemFileInputRef.current?.click()}
                                                className="px-2.5 py-1 text-xs font-semibold border border-surface-200 rounded-md hover:bg-white text-surface-700 cursor-pointer"
                                            >
                                                Ganti
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setEditingItemData(prev => ({ ...prev, image_url: null }))}
                                                className="px-2.5 py-1 text-xs font-semibold border border-red-200 text-red-600 rounded-md hover:bg-red-50 cursor-pointer"
                                            >
                                                Hapus
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div
                                        onClick={() => editItemFileInputRef.current?.click()}
                                        onDragOver={handleEditItemImageDragOver}
                                        onDragLeave={handleEditItemImageDragLeave}
                                        onDrop={handleEditItemImageDrop}
                                        className={`w-full border-2 border-dashed rounded-xl p-4 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                                            isDraggingEditItemImage
                                                ? 'border-brand-500 bg-brand-100/60'
                                                : 'border-surface-200 hover:border-brand-400 bg-surface-50/50 hover:bg-surface-50'
                                        }`}
                                    >
                                        <UploadCloud className="w-6 h-6 text-surface-400 mb-0.5" />
                                        <span className="text-xs font-medium text-surface-600">
                                            {isDraggingEditItemImage ? 'Lepaskan gambar di sini...' : 'Klik atau seret file gambar ke sini (PNG, JPG max 2MB)'}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Pengaturan PPh Item */}
                            <div className="bg-emerald-50/50 border border-emerald-200 rounded-xl p-3.5 flex items-center justify-between">
                                <label className="flex items-center gap-2.5 text-xs font-semibold text-emerald-900 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={Boolean(editingItemData.is_pph_applied)}
                                        onChange={e => setEditingItemData(prev => ({ ...prev, is_pph_applied: e.target.checked }))}
                                        className="w-4 h-4 rounded text-emerald-600 accent-emerald-600 cursor-pointer"
                                    />
                                    <span>Kenakan Potongan PPh Pasal 23 (2%) pada item ini</span>
                                </label>
                                {editingItemData.is_pph_applied && (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-200 text-emerald-800">Aktif</span>
                                )}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 border-t border-surface-100 flex items-center justify-end gap-3 bg-surface-50/50 shrink-0">
                            <button
                                type="button"
                                onClick={() => setEditingCustomItemIdx(null)}
                                className="px-4 py-2 text-xs font-semibold border border-surface-200 rounded-lg text-surface-700 hover:bg-white transition-colors cursor-pointer"
                            >
                                Batal
                            </button>
                            <button
                                type="button"
                                onClick={handleSaveCustomItem}
                                className="px-5 py-2 text-xs font-bold bg-brand-500 hover:bg-brand-600 text-white rounded-lg transition-all shadow-sm cursor-pointer"
                            >
                                Simpan Perubahan Master
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* ─── Tambah Produk Baru Modal ─────────────── */}
            {showAddProductModal && ReactDOM.createPortal(
                <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-surface-900/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-scale-in max-h-[90vh] flex flex-col">
                        {/* Header */}
                        <div className="px-6 py-4 border-b border-surface-100 flex items-center justify-between bg-white shrink-0">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
                                    <Box className="w-5 h-5 text-emerald-600" />
                                </div>
                                <h3 className="text-base font-bold text-surface-900">Tambah Produk Baru</h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowAddProductModal(false)}
                                className="text-surface-400 hover:text-surface-600 transition-colors p-1 rounded-lg hover:bg-surface-100 cursor-pointer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-6 overflow-y-auto flex flex-col gap-4">
                            {/* Row 1: SKU & Brand */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-semibold text-surface-700 block mb-1">
                                        SKU Produk <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={newProductData.sku}
                                        onChange={e => setNewProductData(prev => ({ ...prev, sku: e.target.value }))}
                                        placeholder="Contoh: 960-001681"
                                        className="w-full bg-surface-50 border border-surface-200 rounded-xl px-3.5 py-2.5 text-xs text-surface-800 outline-none focus:border-emerald-500 focus:bg-white transition-all font-mono"
                                    />
                                </div>
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <label className="text-xs font-semibold text-surface-700">
                                            Brand <span className="text-red-500">*</span>
                                        </label>
                                        <button
                                            type="button"
                                            onClick={handleOpenAddBrandModal}
                                            className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-0.5 cursor-pointer"
                                        >
                                            + Tambah Brand
                                        </button>
                                    </div>
                                    <select
                                        value={newProductData.brand}
                                        onChange={e => setNewProductData(prev => ({ ...prev, brand: e.target.value }))}
                                        className="w-full bg-surface-50 border border-surface-200 rounded-xl px-3.5 py-2.5 text-xs text-surface-800 outline-none focus:border-emerald-500 focus:bg-white transition-all cursor-pointer font-medium"
                                    >
                                        <option value="">-- Pilih Brand --</option>
                                        {allBrandNames.map((b, i) => (
                                            <option key={i} value={b}>{b}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Row 2: Nama Produk */}
                            <div>
                                <label className="text-xs font-semibold text-surface-700 block mb-1">
                                    Nama Produk <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={newProductData.name}
                                    onChange={e => setNewProductData(prev => ({ ...prev, name: e.target.value }))}
                                    placeholder="Contoh: Meetup 2"
                                    className="w-full bg-surface-50 border border-surface-200 rounded-xl px-3.5 py-2.5 text-xs text-surface-900 outline-none focus:border-emerald-500 focus:bg-white transition-all font-medium"
                                />
                            </div>

                            {/* Card Section: HARGA DISTRIBUTOR */}
                            <div className="bg-surface-50/60 border border-surface-200 rounded-xl p-4 flex flex-col gap-3">
                                <div className="text-[11px] font-bold text-surface-500 uppercase tracking-wider">HARGA DISTRIBUTOR</div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs font-medium text-surface-600 block mb-1">Pricelist Distributor (Rp)</label>
                                        <EditableCurrencyInput
                                            value={newProductData.pricelist_distributor}
                                            onChange={val => {
                                                const pl = val;
                                                const disc = newProductData.diskon_distributor;
                                                const autoHpp = pl ? Math.round(Number(pl) * (1 - (Number(disc) || 0) / 100)) : '';
                                                setNewProductData(prev => ({ ...prev, pricelist_distributor: pl, hpp: autoHpp }));
                                            }}
                                            placeholder="0"
                                            className="w-full bg-white border border-surface-200 rounded-xl px-3.5 py-2 text-xs text-surface-800 outline-none focus:border-emerald-500 font-mono"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-surface-600 block mb-1">Diskon Distributor (%)</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                value={newProductData.diskon_distributor ?? ''}
                                                onChange={e => {
                                                    const disc = e.target.value;
                                                    const pl = newProductData.pricelist_distributor;
                                                    const autoHpp = pl ? Math.round(Number(pl) * (1 - (Number(disc) || 0) / 100)) : '';
                                                    setNewProductData(prev => ({ ...prev, diskon_distributor: disc, hpp: autoHpp }));
                                                }}
                                                placeholder="0"
                                                className="w-full bg-white border border-surface-200 rounded-xl px-3.5 py-2 text-xs text-surface-800 outline-none focus:border-emerald-500 pr-7 font-mono"
                                            />
                                            <span className="absolute right-3.5 top-2 text-xs text-surface-400 font-bold">%</span>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <label className="text-xs font-semibold text-surface-700">Harga Modal / HPP (Rp)</label>
                                        <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded">Auto</span>
                                    </div>
                                    <EditableCurrencyInput
                                        value={newProductData.hpp}
                                        onChange={val => {
                                            const hpp = Number(val) || 0;
                                            const pl = Number(newProductData.pricelist_distributor) || 0;
                                            if (pl > 0) {
                                                const calcDiskon = (1 - hpp / pl) * 100;
                                                setNewProductData(prev => ({ ...prev, hpp, diskon_distributor: calcDiskon > 0 ? parseFloat(calcDiskon.toFixed(2)) : 0 }));
                                            } else {
                                                setNewProductData(prev => ({ ...prev, hpp }));
                                            }
                                        }}
                                        placeholder="= Pricelist × (1 – Diskon%)"
                                        className="w-full bg-emerald-50/50 border border-emerald-300 rounded-xl px-3.5 py-2.5 text-xs font-bold text-surface-900 outline-none focus:border-emerald-500 font-mono"
                                    />
                                    <p className="text-[11px] text-surface-400 mt-1">Rumus: Pricelist × (1 – Diskon%) – dapat diubah manual</p>
                                </div>
                            </div>

                            {/* HARGA JUAL REFERENSI */}
                            <div>
                                <label className="text-xs font-semibold text-surface-700 block mb-1">
                                    HARGA JUAL REFERENSI (IDR) <span className="text-surface-400 font-normal">(opsional)</span>
                                </label>
                                <EditableCurrencyInput
                                    value={newProductData.price}
                                    onChange={val => setNewProductData(prev => ({ ...prev, price: val }))}
                                    placeholder="0"
                                    className="w-full bg-white border border-surface-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-surface-900 outline-none focus:border-emerald-500 font-mono"
                                />
                                <p className="text-[11px] text-surface-400 mt-1">
                                    Harga referensi di katalog. Harga final per-penawaran dihitung berdasarkan Margin Sales di form Quotation.
                                </p>
                            </div>

                            {/* Gambar Produk */}
                            <div>
                                <label className="text-xs font-semibold text-surface-700 block mb-1">Gambar Produk</label>
                                <input
                                    type="file"
                                    ref={productFileInputRef}
                                    onChange={handleProductImageSelect}
                                    accept="image/png, image/jpeg, image/webp"
                                    className="hidden"
                                />
                                {newProductData.image_url ? (
                                    <div className="bg-surface-50 border border-surface-200 rounded-xl p-3 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <img src={newProductData.image_url} alt="Preview" className="w-12 h-12 object-contain rounded-lg bg-white border border-surface-200 p-1" />
                                            <div>
                                                <div className="text-xs text-surface-800 font-bold">Gambar Siap Digunakan</div>
                                                <div className="text-[10px] text-surface-400">Klik 'Ganti' untuk mengubah gambar</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => productFileInputRef.current?.click()}
                                                className="px-2.5 py-1 text-xs font-semibold border border-surface-200 rounded-md hover:bg-white text-surface-700 cursor-pointer"
                                            >
                                                Ganti
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setNewProductData(prev => ({ ...prev, image_url: null }))}
                                                className="px-2.5 py-1 text-xs font-semibold border border-red-200 text-red-600 rounded-md hover:bg-red-50 cursor-pointer"
                                            >
                                                Hapus
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div
                                        onClick={() => productFileInputRef.current?.click()}
                                        onDragOver={handleProductImageDragOver}
                                        onDragLeave={handleProductImageDragLeave}
                                        onDrop={handleProductImageDrop}
                                        className={`w-full border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1.5 ${
                                            isDraggingProductImage
                                                ? 'border-emerald-500 bg-emerald-100/60 scale-[0.99]'
                                                : 'border-emerald-300 hover:border-emerald-500 bg-emerald-50/20 hover:bg-emerald-50/40'
                                        }`}
                                    >
                                        <UploadCloud className={`w-8 h-8 text-emerald-500 mb-0.5 transition-transform ${isDraggingProductImage ? 'scale-110' : ''}`} />
                                        <span className="text-xs font-semibold text-emerald-700">
                                            {isDraggingProductImage ? 'Lepaskan gambar di sini...' : 'Klik untuk unggah gambar produk (PNG, JPG max 2MB)'}
                                        </span>
                                        <span className="text-[10px] text-surface-400">atau seret file gambar langsung ke kotak ini</span>
                                    </div>
                                )}
                            </div>

                            {/* Deskripsi Singkat */}
                            <div>
                                <label className="text-xs font-semibold text-surface-700 block mb-1">Deskripsi Singkat (Opsional)</label>
                                <textarea
                                    rows={3}
                                    value={newProductData.description}
                                    onChange={e => setNewProductData(prev => ({ ...prev, description: e.target.value }))}
                                    placeholder="Tuliskan spesifikasi utama..."
                                    className="w-full bg-surface-50 border border-surface-200 rounded-xl px-3.5 py-2.5 text-xs text-surface-800 outline-none focus:border-emerald-500 focus:bg-white resize-y transition-all"
                                />
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 border-t border-surface-100 flex items-center justify-end gap-3 bg-surface-50/50 shrink-0">
                            <button
                                type="button"
                                onClick={() => setShowAddProductModal(false)}
                                className="px-5 py-2.5 text-xs font-semibold border border-surface-200 rounded-xl text-surface-700 hover:bg-white transition-colors cursor-pointer"
                            >
                                Batal
                            </button>
                            <button
                                type="button"
                                onClick={handleSaveAndAddProduct}
                                disabled={isAddingProduct}
                                className="px-6 py-2.5 text-xs font-bold bg-[#00B092] hover:bg-[#009b80] disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl transition-all shadow-sm cursor-pointer flex items-center gap-2"
                            >
                                {isAddingProduct ? (
                                    <>
                                        <Loader2 size={14} className="animate-spin" />
                                        Menyimpan...
                                    </>
                                ) : (
                                    'Simpan & Tambahkan'
                                )}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* ─── Tambah Brand Baru Sub-Modal ─────────────── */}
            {showAddBrandModal && ReactDOM.createPortal(
                <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-surface-900/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-scale-in flex flex-col">
                        {/* Header */}
                        <div className="px-5 py-4 border-b border-surface-100 flex items-center justify-between bg-white shrink-0">
                            <div className="flex items-center gap-2">
                                <Plus className="w-4 h-4 text-emerald-600" />
                                <h3 className="text-sm font-bold text-surface-900">Tambah Brand Baru</h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowAddBrandModal(false)}
                                className="text-surface-400 hover:text-surface-600 transition-colors p-1 rounded-lg hover:bg-surface-100 cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-5 flex flex-col gap-4">
                            {/* Field 1: Nama Brand */}
                            <div>
                                <label className="text-xs font-bold text-surface-700 uppercase tracking-wider block mb-1">
                                    NAMA BRAND <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    autoFocus
                                    value={newBrandName}
                                    onChange={e => setNewBrandName(e.target.value)}
                                    placeholder="Contoh: Cisco / Yealink"
                                    className="w-full bg-surface-50 border border-surface-200 rounded-xl px-3.5 py-2.5 text-xs text-surface-900 outline-none focus:border-emerald-500 focus:bg-white transition-all font-medium"
                                />
                            </div>

                            {/* Field 2: Warna Label */}
                            <div>
                                <label className="text-xs font-bold text-surface-700 uppercase tracking-wider block mb-1">
                                    WARNA LABEL
                                </label>
                                <div className="flex items-center gap-2">
                                    <div className="relative flex-1">
                                        <div className="flex items-center bg-surface-50 border border-surface-200 rounded-xl px-3 py-2">
                                            <input
                                                type="color"
                                                value={newBrandColor}
                                                onChange={e => setNewBrandColor(e.target.value)}
                                                className="w-6 h-6 rounded-lg border-0 cursor-pointer p-0 bg-transparent shrink-0"
                                            />
                                            <input
                                                type="text"
                                                value={newBrandColor}
                                                onChange={e => setNewBrandColor(e.target.value)}
                                                className="w-full bg-transparent border-none outline-none text-xs font-mono font-bold text-surface-800 ml-2 uppercase"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-5 py-3.5 border-t border-surface-100 flex items-center justify-end gap-2.5 bg-surface-50/50 shrink-0">
                            <button
                                type="button"
                                onClick={() => setShowAddBrandModal(false)}
                                className="px-4 py-2 text-xs font-semibold border border-surface-200 rounded-xl text-surface-700 hover:bg-white transition-colors cursor-pointer"
                            >
                                Batal
                            </button>
                            <button
                                type="button"
                                onClick={handleSaveBrand}
                                disabled={isSavingBrand}
                                className="px-5 py-2 text-xs font-bold bg-[#00B092] hover:bg-[#009b80] text-white rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-60 flex items-center gap-1.5"
                            >
                                {isSavingBrand ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                                Simpan Brand
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* ─── PPh Jasa Modal ────────────── */}
            {showPphModal && ReactDOM.createPortal(
                <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-surface-900/60 backdrop-blur-xs animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-scale-in max-h-[85vh] flex flex-col">
                        <div className="px-6 py-4 border-b border-surface-100 flex items-center justify-between bg-surface-50/50">
                            <div>
                                <h3 className="text-base font-bold text-surface-900 flex items-center gap-2">
                                    <span>Pengaturan PPh 2% per Item (Jasa)</span>
                                </h3>
                                <p className="text-xs text-surface-500 mt-0.5">
                                    Pilih item mana saja yang dikenakan potongan PPh Pasal 23 sebesar 2% (biasanya untuk Jasa / Service / Instalasi).
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowPphModal(false)}
                                className="p-1.5 text-surface-400 hover:text-surface-600 hover:bg-surface-100 rounded-lg transition-colors cursor-pointer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="px-6 py-3 border-b border-surface-100 bg-emerald-50/60 flex flex-wrap items-center justify-between gap-3">
                            <div className="text-xs text-emerald-900 font-medium">
                                Total Dasar PPh: <strong className="font-mono text-emerald-900">{formatCurrency(pphBasis)}</strong>
                                <span className="ml-2.5 text-emerald-800 font-bold">(PPh 2%: <span className="font-mono">{formatCurrency(pphAmount)}</span>)</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setItems(prev => prev.map(item => {
                                            const n = (item.name || '').toLowerCase();
                                            const isJasa = n.includes('jasa') || n.includes('instalasi') || n.includes('service') || n.includes('setting') || n.includes('sewa');
                                            return isJasa ? { ...item, is_pph_applied: true } : item;
                                        }));
                                    }}
                                    className="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-white border border-emerald-300 rounded-lg hover:bg-emerald-50 transition-colors cursor-pointer shadow-2xs"
                                >
                                    Pilih Auto Jasa
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setItems(prev => prev.map(item => ({ ...item, is_pph_applied: true })))}
                                    className="px-2.5 py-1 text-xs font-semibold text-surface-700 bg-white border border-surface-200 rounded-lg hover:bg-surface-50 transition-colors cursor-pointer shadow-2xs"
                                >
                                    Pilih Semua
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setItems(prev => prev.map(item => ({ ...item, is_pph_applied: false })))}
                                    className="px-2.5 py-1 text-xs font-semibold text-surface-600 bg-white border border-surface-200 rounded-lg hover:bg-surface-50 transition-colors cursor-pointer shadow-2xs"
                                >
                                    Reset Semua
                                </button>
                            </div>
                        </div>

                        <div className="p-6 overflow-y-auto max-h-[55vh]">
                            {items.length === 0 ? (
                                <div className="text-center py-8 text-xs text-surface-400">
                                    Belum ada item produk dalam quotation ini.
                                </div>
                            ) : (
                                <div className="flex flex-col gap-2">
                                    {items.map((item, idx) => {
                                        const itemTotal = (Number(item.qty) || 0) * (Number(item.price) || 0);
                                        return (
                                            <div
                                                key={idx}
                                                onClick={() => {
                                                    setItems(prev => prev.map((it, i) => i === idx ? { ...it, is_pph_applied: !it.is_pph_applied } : it));
                                                }}
                                                className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-4 ${
                                                    item.is_pph_applied
                                                        ? 'bg-emerald-50/70 border-emerald-300 ring-1 ring-emerald-400/30'
                                                        : 'bg-white border-surface-200 hover:border-surface-300'
                                                }`}
                                            >
                                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                                    <input
                                                        type="checkbox"
                                                        checked={Boolean(item.is_pph_applied)}
                                                        onChange={(e) => {
                                                            e.stopPropagation();
                                                            setItems(prev => prev.map((it, i) => i === idx ? { ...it, is_pph_applied: e.target.checked } : it));
                                                        }}
                                                        className="w-4 h-4 rounded text-emerald-600 accent-emerald-600 cursor-pointer shrink-0"
                                                    />
                                                    <div className="min-w-0 flex-1">
                                                        <div className="text-xs font-bold text-surface-900 truncate flex items-center gap-2">
                                                            <span>{item.name || `Item #${idx + 1}`}</span>
                                                            {item.is_pph_applied && (
                                                                <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-200/80 text-emerald-800">Kenakan PPh 2%</span>
                                                            )}
                                                        </div>
                                                        {item.sku && (
                                                            <div className="text-[11px] font-mono text-surface-400 mt-0.5">
                                                                SKU: {item.sku}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <div className="text-xs font-bold font-mono text-surface-800">
                                                        {formatCurrency(itemTotal)}
                                                    </div>
                                                    <div className="text-[11px] text-surface-400">
                                                        {item.qty} × {formatCurrency(item.price || 0)}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <div className="px-6 py-3.5 border-t border-surface-100 bg-surface-50/50 flex justify-end">
                            <button
                                type="button"
                                onClick={() => setShowPphModal(false)}
                                className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors cursor-pointer shadow-sm"
                            >
                                Selesai &amp; Simpan
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </AuthenticatedLayout>
    );
}
