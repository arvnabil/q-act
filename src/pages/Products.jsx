import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Search, Plus, Filter, Image as ImageIcon, Edit, Trash2, Box, X, Loader2, UploadCloud, LayoutGrid, List as ListIcon, AlertCircle, Upload, FileSpreadsheet, CheckCircle, XCircle, Download, AlertTriangle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { saveAs } from 'file-saver';
import { useQueryClient } from '@tanstack/react-query';
import { useProducts, useCreateProduct, useUpdateProduct, useDeleteProduct, useDeleteProducts, useBrands, useCreateBrand, useUpsertProducts } from '../hooks/useSupabase.js';
import * as api from '../services/api.js';
import Pagination from '../components/Pagination.jsx';

const PAGE_SIZE = 8;

export default function Products() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [brandFilter, setBrandFilter] = useState('all');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [page, setPage] = useState(1);
  const [selectedSkus, setSelectedSkus] = useState([]);
  const [deleteModalState, setDeleteModalState] = useState({
    isOpen: false,
    type: 'single',
    sku: null,
    skus: [],
  });
  const [errorModalState, setErrorModalState] = useState({
    isOpen: false,
    title: '',
    message: '',
  });
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [editingSku, setEditingSku] = useState(null);

  const [showAddBrandModal, setShowAddBrandModal] = useState(false);
  const [quickBrand, setQuickBrand] = useState({ name: '', color_hex: '#6366f1' });

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
  const [newProduct, setNewProduct] = useState(EMPTY_PRODUCT);

  // Auto-calculate modal (HPP) dari pricelist dan diskon distributor
  const handleProductPriceChange = (field, value) => {
    setNewProduct(prev => {
      const updated = { ...prev, [field]: value };
      const pricelist = Number(field === 'pricelist_distributor' ? value : prev.pricelist_distributor) || 0;
      
      if (field === 'pricelist_distributor' || field === 'diskon_distributor') {
        const diskon = Number(field === 'diskon_distributor' ? value : prev.diskon_distributor) || 0;
        // Modal = Pricelist * (1 - Diskon%)
        updated.modal = pricelist > 0 ? Math.round(pricelist * (1 - diskon / 100)) : '';
      } else if (field === 'modal') {
        const modal = Number(value) || 0;
        if (pricelist > 0) {
          // Diskon% = (1 - (Modal / Pricelist)) * 100
          const calcDiskon = (1 - (modal / pricelist)) * 100;
          // Format to max 2 decimal places, or 0 if negative
          updated.diskon_distributor = calcDiskon > 0 ? parseFloat(calcDiskon.toFixed(2)) : 0;
        }
      }
      return updated;
    });
  };

  const { data: products, isLoading: isLoadingProducts, isError: isErrorProducts } = useProducts();
  const { data: brands, isLoading: isLoadingBrands } = useBrands();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();
  const deleteProducts = useDeleteProducts();
  const createBrand = useCreateBrand();
  const upsertProducts = useUpsertProducts();

  // === Import Modal State ===
  const [showImportModal, setShowImportModal] = useState(false);
  const [importStep, setImportStep] = useState('upload'); // 'upload' | 'preview' | 'result'
  const [importRows, setImportRows] = useState([]);
  const [importErrors, setImportErrors] = useState([]);
  const [importResult, setImportResult] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const importFileInputRef = useRef(null);

  // === Import Functions ===
  const REQUIRED_COLUMNS = ['sku', 'name'];
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

  const handleImportFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Helper: strip currency symbols, whitespace, and thousand separators then parse as number
    const parseNum = (val) => {
      if (val === '' || val === null || val === undefined) return 0;
      if (typeof val === 'number') return val;
      // Remove Rp, $, spaces, dots used as thousand sep, commas used as thousand sep
      // Support both 16.830.000 (dot thousand) and 16,830,000 (comma thousand)
      const str = String(val)
        .replace(/Rp\.?\s*/gi, '')
        .replace(/[$€¥]/g, '')
        .trim();
      // Detect which separator is decimal vs thousand
      // If last separator after digits is comma with exactly 2 decimals → comma is decimal
      const dotCount = (str.match(/\./g) || []).length;
      const commaCount = (str.match(/,/g) || []).length;
      let normalized;
      if (dotCount > 1) {
        // e.g. 16.830.000 → dots are thousand separators
        normalized = str.replace(/\./g, '').replace(',', '.');
      } else if (commaCount > 1) {
        // e.g. 16,830,000 → commas are thousand separators
        normalized = str.replace(/,/g, '');
      } else {
        // single separator – heuristic: if it's a dot followed by exactly 3 digits at end, it's thousand sep
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
          // Map columns
          const mapped = raw.map((row, i) => {
            const obj = {};
            Object.keys(row).forEach(k => {
              const mapped_key = COLUMN_MAP[k.trim()];
              if (mapped_key) obj[mapped_key] = row[k];
            });
            // Parse all numeric fields robustly
            ['price', 'pricelist_distributor', 'diskon_distributor', 'modal'].forEach(f => {
              if (obj[f] !== undefined) obj[f] = parseNum(obj[f]);
            });

            const pl = obj.pricelist_distributor || 0;
            const dk = obj.diskon_distributor || 0;
            const md = obj.modal || 0;

            if (pl > 0) {
              if (md > 0 && dk === 0) {
                // Pricelist + Modal tersedia → hitung Diskon otomatis
                // Diskon% = (1 - Modal/Pricelist) × 100
                obj.diskon_distributor = parseFloat(((1 - md / pl) * 100).toFixed(2));
              } else if (md === 0) {
                // Pricelist + Diskon tersedia → hitung Modal otomatis
                obj.modal = Math.round(pl * (1 - dk / 100));
              }
            }
            return { _rowNum: i + 2, ...obj };
          });
          // Validate required columns
          const errors = [];
          mapped.forEach(r => {
            if (!r.sku) errors.push(`Baris ${r._rowNum}: SKU kosong.`);
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
    // Reset input so same file can be re-selected
    e.target.value = '';
  };

  const handleExecuteImport = async () => {
    if (importErrors.length > 0) {
      toast.error('Perbaiki error validasi sebelum melanjutkan.');
      return;
    }
    setIsImporting(true);
    try {
      // Resolve brand names → brand_ids, auto-create if needed
      const brandNameMap = new Map();
      (brands || []).forEach(b => brandNameMap.set(b.name.toLowerCase().trim(), b.id));

      const uniqueBrandNames = [...new Set(
        importRows.map(r => (r.brand || '').trim()).filter(Boolean)
      )];
      
      for (const brandName of uniqueBrandNames) {
        if (!brandNameMap.has(brandName.toLowerCase())) {
          try {
            const newBrand = await api.createBrand({ name: brandName, color_hex: '#6366f1' });
            brandNameMap.set(brandName.toLowerCase(), newBrand.id);
          } catch (err) {
            console.warn('Auto-create brand failed:', brandName, err.message);
          }
        }
      }

      const toUpsert = importRows.map(r => {
        const { _rowNum, brand, ...rest } = r;
        const brandId = brandNameMap.get((brand || '').toLowerCase().trim()) || null;
        return {
          sku: String(rest.sku || '').trim(),
          name: String(rest.name || '').trim(),
          description: String(rest.description || '').trim() || null,
          price: Number(rest.price) || 0,
          pricelist_distributor: Number(rest.pricelist_distributor) || 0,
          diskon_distributor: Number(rest.diskon_distributor) || 0,
          modal: Number(rest.modal) || 0,
          ...(brandId ? { brand_id: brandId } : {}),
        };
      });

      const result = await api.upsertProducts(toUpsert);
      setImportResult(result);
      setImportStep('result');
      
      // Refresh the product list in the background
      queryClient.invalidateQueries({ queryKey: ['products'] });
    } catch (err) {
      toast.error('Import gagal: ' + err.message);
    } finally {
      setIsImporting(false);
    }
  };

  const resetImportModal = () => {
    setShowImportModal(false);
    setImportStep('upload');
    setImportRows([]);
    setImportErrors([]);
    setImportResult(null);
    setIsImporting(false);
  };

  const handleQuickCreateBrand = (e) => {
    e.preventDefault();
    if (!quickBrand.name.trim()) {
      toast.error('Nama brand wajib diisi');
      return;
    }
    createBrand.mutate({ name: quickBrand.name.trim(), color_hex: quickBrand.color_hex }, {
      onSuccess: (data) => {
        toast.success(`Brand "${quickBrand.name}" berhasil ditambahkan!`);
        setShowAddBrandModal(false);
        if (data?.id) {
          setNewProduct(prev => ({ ...prev, brand_id: data.id }));
        }
        setQuickBrand({ name: '', color_hex: '#6366f1' });
      },
      onError: (err) => {
        toast.error('Gagal menambahkan brand: ' + (err.message || 'Error'));
      }
    });
  };

  const formatCurrency = (val) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);

  // Reset to page 1 and clear selection when filter/view changes
  useEffect(() => {
    setPage(1);
    setSelectedSkus([]);
  }, [search, brandFilter, viewMode]);

  const [isDragging, setIsDragging] = useState(false);

  const getBrandStyles = (colorHex) => {
    const color = colorHex || '#6B7280';
    return { backgroundColor: `${color}12`, color: color, border: `1px solid ${color}40` };
  };

  const [selectedFile, setSelectedFile] = useState(null);

  const processFile = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Format file tidak didukung, harus berupa gambar (PNG/JPG/WEBP)');
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

  const handleImageSelect = (e) => {
    processFile(e.target.files[0]);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    
    if (!newProduct.sku) {
      toast.error('SKU Produk wajib diisi');
      return;
    }
    
    if (!newProduct.brand_id) {
      toast.error('Silakan pilih brand produk');
      return;
    }

    // Validasi SKU duplikat jika dalam mode Tambah (bukan Edit)
    if (!editingSku) {
      const isSkuExists = products?.some(p => p.sku.toUpperCase() === newProduct.sku.toUpperCase());
      if (isSkuExists) {
        toast.error('SKU Produk sudah terdaftar! Gunakan SKU lain.');
        return;
      }
    }
    
    setIsUploading(true);
    let finalImageUrl = newProduct.image_url;

    try {
      // Upload gambar baru jika dipilih — bekerja di local dev dan cPanel
      if (selectedFile) {
        toast.loading('Mengunggah gambar...', { id: 'upload' });
        finalImageUrl = await api.uploadProductImage(selectedFile, newProduct.sku);
        toast.success('Gambar berhasil diunggah!', { id: 'upload' });
      }

      const payload = {
        ...newProduct,
        pricelist_distributor: parseInt(newProduct.pricelist_distributor) || 0,
        diskon_distributor: parseFloat(newProduct.diskon_distributor) || 0,
        modal: parseInt(newProduct.modal) || 0,
        price: parseInt(newProduct.price) || 0,
        image_url: finalImageUrl
      };

      if (editingSku) {
        // Remove SKU from payload because we don't update PK
        const { sku, ...updatePayload } = payload;
        
        updateProduct.mutate({ sku: editingSku, productData: updatePayload }, {
          onSuccess: () => {
            closeModal();
            toast.success('Produk berhasil diperbarui!');
          },
          onError: (err) => toast.error('Gagal memperbarui produk: ' + err.message)
        });
      } else {
        createProduct.mutate(payload, {
          onSuccess: () => {
            closeModal();
            toast.success('Produk berhasil ditambahkan!');
          },
          onError: (err) => toast.error('Gagal menambahkan produk: ' + err.message)
        });
      }
    } catch (error) {
      toast.error(error.message, { id: 'upload' });
    } finally {
      setIsUploading(false);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingSku(null);
    setImagePreview(null);
    setNewProduct(EMPTY_PRODUCT);
  };

  const openAddModal = () => {
    setEditingSku(null);
    setImagePreview(null);
    setNewProduct(EMPTY_PRODUCT);
    setIsModalOpen(true);
  };

  const handleEdit = (product) => {
    setEditingSku(product.sku);
    setImagePreview(product.image_url || null);
    setNewProduct({
      sku: product.sku,
      name: product.name,
      brand_id: product.brand_id || '',
      pricelist_distributor: product.pricelist_distributor || '',
      diskon_distributor: product.diskon_distributor || '',
      modal: product.modal || '',
      price: product.price || '',
      description: product.description || '',
      image_url: product.image_url || ''
    });
    setIsModalOpen(true);
  };

  const handleDelete = (sku) => {
    setDeleteModalState({
      isOpen: true,
      type: 'single',
      sku,
      skus: [],
    });
  };

  // Filter products based on search and brand filter
  const filteredProducts = products?.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase());
    const matchBrand = brandFilter === 'all' || p.brand_id.toString() === brandFilter;
    return matchSearch && matchBrand;
  }) || [];

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageProducts = viewMode === 'list'
    ? filteredProducts.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)
    : filteredProducts; // grid shows all (or can be paginated later)

  const isAllSelected = pageProducts.length > 0 && pageProducts.every(p => selectedSkus.includes(p.sku));

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedSkus(prev => prev.filter(sku => !pageProducts.some(p => p.sku === sku)));
    } else {
      const newSkus = [...selectedSkus];
      pageProducts.forEach(p => {
        if (!newSkus.includes(p.sku)) newSkus.push(p.sku);
      });
      setSelectedSkus(newSkus);
    }
  };

  const handleToggleSelect = (sku) => {
    setSelectedSkus(prev => 
      prev.includes(sku) ? prev.filter(s => s !== sku) : [...prev, sku]
    );
  };

  const handleBulkDelete = () => {
    setDeleteModalState({
      isOpen: true,
      type: 'bulk',
      sku: null,
      skus: selectedSkus,
    });
  };

  const handleConfirmDelete = () => {
    if (deleteModalState.type === 'single') {
      const skuToDelete = deleteModalState.sku;
      setDeleteModalState(prev => ({ ...prev, isOpen: false }));
      deleteProduct.mutate(skuToDelete, {
        onSuccess: () => {
          toast.success('Produk berhasil dihapus! 🗑️');
          setSelectedSkus(prev => prev.filter(s => s !== skuToDelete));
        },
        onError: (err) => {
          let msg = err?.message || '';
          if (
            err?.code === '23503' ||
            String(msg).includes('406') ||
            String(msg).toLowerCase().includes('foreign key') ||
            String(msg).toLowerCase().includes('violates foreign key')
          ) {
            msg = 'Produk tidak dapat dihapus karena masih digunakan dalam dokumen Quotation.';
          }
          setErrorModalState({ isOpen: true, title: 'Gagal Menghapus Produk', message: msg });
        }
      });
    } else {
      const skusToDelete = deleteModalState.skus;
      const count = skusToDelete.length;
      setDeleteModalState(prev => ({ ...prev, isOpen: false }));
      deleteProducts.mutate(skusToDelete, {
        onSuccess: () => {
          toast.success(`${count} produk berhasil dihapus! 🗑️`);
          setSelectedSkus([]);
        },
        onError: (err) => {
          let msg = err?.message || '';
          if (
            err?.code === '23503' ||
            String(msg).includes('406') ||
            String(msg).toLowerCase().includes('foreign key') ||
            String(msg).toLowerCase().includes('violates foreign key')
          ) {
            msg = 'Beberapa produk tidak dapat dihapus karena masih digunakan dalam dokumen Quotation.';
          }
          setErrorModalState({ isOpen: true, title: 'Gagal Menghapus Produk', message: msg });
        }
      });
    }
  };

  return (
    <div className="animate-fade-in-up">
      {/* Controls */}
      <div className="bg-white rounded-xl border border-surface-200 mb-5">
        <div className="px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 bg-surface-50 border border-surface-200 rounded-lg px-3 py-2 flex-1 max-w-md focus-within:border-brand-400 transition-colors">
            <Search className="w-4 h-4 text-surface-400 shrink-0" />
            <input
              type="text"
              placeholder="Cari SKU, nama produk..."
              className="bg-transparent border-none outline-none text-sm text-surface-700 placeholder-surface-400 w-full"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <select 
              value={brandFilter}
              onChange={(e) => setBrandFilter(e.target.value)}
              className="bg-surface-50 border border-surface-200 text-surface-600 text-sm font-medium px-3 py-2 rounded-lg outline-none focus:border-brand-500 cursor-pointer"
            >
              <option value="all">Semua Brand</option>
              {brands?.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>

            <div className="flex items-center bg-surface-100 p-1 rounded-lg mr-1 border border-surface-200">
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
              onClick={openAddModal}
              className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold px-4 py-2 rounded-lg shadow-sm hover:shadow transition-all shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Produk</span>
            </button>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="relative min-h-[400px]">
        {isLoadingProducts && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-brand-500 mb-2" />
            <span className="text-sm font-medium text-surface-500">Memuat data produk...</span>
          </div>
        )}
        
        {isErrorProducts && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-red-500">
            <span className="text-sm font-bold">Gagal memuat data produk. Periksa koneksi Supabase Anda.</span>
          </div>
        )}

        {!isLoadingProducts && filteredProducts.length === 0 && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-surface-400">
            <Box className="w-12 h-12 mb-3 text-surface-300" />
            <span className="text-sm font-medium">Belum ada produk yang ditemukan.</span>
          </div>
        )}

        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filteredProducts.map((p) => (
              <div key={p.sku} className="bg-white rounded-xl border border-surface-200 overflow-hidden hover:shadow-md hover:border-surface-300 transition-all flex flex-col group animate-scale-in">
                {/* Image placeholder */}
                <div className="h-40 bg-surface-50 flex items-center justify-center relative overflow-hidden border-b border-surface-100 p-4">
                  {p.image_url ? (
                    <img 
                      src={p.image_url} 
                      alt={p.name} 
                      className="w-full h-full object-contain hover:scale-105 transition-transform duration-500" 
                      onError={(e) => {
                        e.target.onerror = null; 
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'block';
                      }}
                    />
                  ) : null}
                  
                  <ImageIcon 
                    className="w-8 h-8 text-surface-300" 
                    style={{ display: p.image_url ? 'none' : 'block' }} 
                  />

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
                    <button onClick={() => handleEdit(p)} className="p-1.5 rounded-lg text-brand-600 hover:bg-brand-100 transition-colors cursor-pointer" title="Edit Produk">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(p.sku)} className="p-1.5 rounded-lg text-red-500 hover:bg-red-100 transition-colors cursor-pointer" title="Hapus Produk">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white border border-surface-200 rounded-xl overflow-hidden">
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
                    <th className="px-6 py-4 text-xs font-bold text-surface-500 uppercase tracking-wider w-16">Image</th>
                    <th className="px-6 py-4 text-xs font-bold text-surface-500 uppercase tracking-wider">SKU</th>
                    <th className="px-6 py-4 text-xs font-bold text-surface-500 uppercase tracking-wider">Nama Produk</th>
                    <th className="px-6 py-4 text-xs font-bold text-surface-500 uppercase tracking-wider">Brand</th>
                    <th className="px-6 py-4 text-xs font-bold text-surface-500 uppercase tracking-wider text-right">Harga Jual</th>
                    <th className="px-6 py-4 text-xs font-bold text-surface-500 uppercase tracking-wider text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100">
                  {pageProducts.map(p => (
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
                              src={p.image_url} 
                              alt={p.name} 
                              className="w-full h-full object-contain p-1"
                              onError={(e) => {
                                e.target.onerror = null; 
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'block';
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
                      <td className="px-6 py-4 text-sm font-extrabold text-brand-700 text-right">
                        {formatCurrency(p.price)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => handleEdit(p)} className="p-1.5 rounded-lg text-brand-600 hover:bg-brand-100 transition-colors cursor-pointer" title="Edit Produk">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(p.sku)} className="p-1.5 rounded-lg text-red-500 hover:bg-red-100 transition-colors cursor-pointer" title="Hapus Produk">
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
        )}

        {/* Pagination for list view */}
        {viewMode === 'list' && !isLoadingProducts && filteredProducts.length > 0 && (
          <Pagination
            page={safePage}
            totalPages={totalPages}
            totalItems={filteredProducts.length}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
            itemLabel="produk"
          />
        )}
      </div>

      {/* Create Modal */}
      {isModalOpen && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-surface-900/40 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-scale-in my-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100 bg-surface-50/50">
              <h2 className="text-lg font-bold text-surface-800 flex items-center gap-2">
                <Box className="w-5 h-5 text-brand-500" />
                {editingSku ? 'Edit Produk' : 'Tambah Produk Baru'}
              </h2>
              <button 
                type="button"
                onClick={closeModal}
                className="text-surface-400 hover:text-surface-600 hover:bg-surface-100 p-2 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSave}>
              <div className="p-6 flex flex-col gap-5">
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-surface-600 uppercase tracking-wider mb-2 block">SKU Produk <span className="text-red-500">*</span></label>
                    <input 
                      type="text"
                      required
                      disabled={!!editingSku}
                      value={newProduct.sku}
                      onChange={e => setNewProduct({...newProduct, sku: e.target.value.toUpperCase()})}
                      className={`w-full border border-surface-200 rounded-xl px-4 py-2.5 text-sm font-mono outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-50 transition-all uppercase ${editingSku ? 'bg-surface-100 cursor-not-allowed text-surface-500' : ''}`}
                      placeholder="Contoh: POLY-X50"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-bold text-surface-600 uppercase tracking-wider">Brand <span className="text-red-500">*</span></label>
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
                          setNewProduct({...newProduct, brand_id: e.target.value});
                        }
                      }}
                      className="w-full border border-surface-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-50 transition-all bg-white cursor-pointer"
                    >
                      <option value="" disabled>-- Pilih Brand --</option>
                      {brands?.map(b => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                      <option value="__add_new__" className="font-semibold text-brand-600">+ Tambah Brand Baru...</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-surface-600 uppercase tracking-wider mb-2 block">Nama Produk <span className="text-red-500">*</span></label>
                  <input 
                    type="text"
                    required
                    value={newProduct.name}
                    onChange={e => setNewProduct({...newProduct, name: e.target.value})}
                    className="w-full border border-surface-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-50 transition-all"
                    placeholder="Contoh: Poly Studio X50 Video Bar"
                  />
                </div>

                {/* === HARGA DISTRIBUTOR === */}
                <div className="border border-surface-100 rounded-xl bg-surface-50/50 p-4 flex flex-col gap-3">
                  <div className="text-xs font-bold text-surface-500 uppercase tracking-wider">Harga Distributor</div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-surface-600 mb-1 block">Pricelist Distributor (Rp)</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <span className="text-surface-400 text-xs font-bold">Rp</span>
                        </div>
                        <input
                          type="number"
                          min="0"
                          value={newProduct.pricelist_distributor}
                          onChange={e => handleProductPriceChange('pricelist_distributor', e.target.value)}
                          className="w-full border border-surface-200 rounded-lg pl-9 pr-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-50 transition-all bg-white"
                          placeholder="0"
                        />
                      </div>
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

                  {/* Modal (HPP) - auto-calculated dari pricelist & diskon */}
                  <div>
                    <label className="text-xs font-semibold text-surface-600 mb-1 flex items-center gap-1.5">
                      Harga Modal / HPP (Rp)
                      <span className="text-[10px] text-brand-500 font-normal bg-brand-50 px-1.5 py-0.5 rounded">Auto</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-surface-400 text-xs font-bold">Rp</span>
                      </div>
                      <input
                        type="number"
                        min="0"
                        value={newProduct.modal}
                        onChange={e => handleProductPriceChange('modal', e.target.value)}
                        className="w-full border border-brand-200 bg-brand-50/30 rounded-lg pl-9 pr-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-50 transition-all font-semibold text-brand-900"
                        placeholder="= Pricelist × (1 − Diskon%)"
                      />
                    </div>
                    <p className="text-[10px] text-surface-400 mt-0.5">Rumus: Pricelist × (1 − Diskon%) − dapat diubah manual</p>
                  </div>
                </div>

                {/* === HARGA JUAL REFERENSI === */}
                <div>
                  <label className="text-xs font-bold text-surface-600 uppercase tracking-wider mb-2 block">
                    Harga Jual Referensi (IDR) <span className="text-surface-400 font-normal normal-case text-[11px]">(opsional)</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <span className="text-surface-500 text-sm font-bold">Rp</span>
                    </div>
                    <input
                      type="number"
                      min="0"
                      value={newProduct.price}
                      onChange={e => setNewProduct(p => ({ ...p, price: e.target.value }))}
                      className="w-full border border-surface-200 rounded-xl pl-12 pr-4 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-50 transition-all"
                      placeholder="0"
                    />
                  </div>
                  <p className="text-[10px] text-surface-400 mt-1">Harga referensi di katalog. Harga final per-penawaran dihitung berdasarkan Margin Sales di form Quotation.</p>
                </div>

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
                        <img src={imagePreview} alt="Preview" className="w-full h-full object-contain" />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity pointer-events-auto">
                          <span className="text-white text-xs font-bold flex items-center gap-1"><UploadCloud className="w-4 h-4" /> Ganti Gambar</span>
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
                  <p className="text-[10px] text-surface-400 mt-1">Gambar akan disimpan di folder <code>public/images/</code> server.</p>
                </div>

                <div>
                  <label className="text-xs font-bold text-surface-600 uppercase tracking-wider mb-2 block">Deskripsi Singkat</label>
                  <textarea 
                    value={newProduct.description}
                    onChange={e => setNewProduct({...newProduct, description: e.target.value})}
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
                  disabled={createProduct.isPending || updateProduct.isPending || isLoadingBrands || isUploading}
                  className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-bold px-6 py-2 rounded-xl shadow-sm hover:shadow-md transition-all disabled:opacity-70 cursor-pointer"
                >
                  {(createProduct.isPending || updateProduct.isPending || isUploading) && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editingSku ? 'Simpan Perubahan' : 'Simpan Produk'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Floating selection action bar */}
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
            onClick={handleBulkDelete}
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

      {/* Confirmation Modal */}
      {deleteModalState.isOpen && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-surface-900/40 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-scale-in my-auto p-6">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-red-500 shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-extrabold text-surface-900">
                  {deleteModalState.type === 'single' ? 'Hapus Produk?' : 'Hapus Produk Terpilih?'}
                </h3>
                <p className="text-sm text-surface-500 mt-1 leading-relaxed">
                  {deleteModalState.type === 'single' 
                    ? `Apakah Anda yakin ingin menghapus produk dengan SKU "${deleteModalState.sku}"? Tindakan ini tidak dapat dibatalkan.`
                    : `Apakah Anda yakin ingin menghapus ${deleteModalState.skus.length} produk terpilih? Tindakan ini tidak dapat dibatalkan.`
                  }
                </p>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <button 
                type="button"
                onClick={() => setDeleteModalState({ isOpen: false, type: 'single', sku: null, skus: [] })}
                className="px-4 py-2 text-sm font-semibold text-surface-600 hover:text-surface-800 transition-colors border border-surface-200 rounded-xl cursor-pointer hover:bg-surface-50"
              >
                Batal
              </button>
              <button 
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleteProduct.isPending || deleteProducts.isPending}
                className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white text-sm font-bold px-5 py-2 rounded-xl shadow-sm hover:shadow transition-all cursor-pointer disabled:opacity-75"
              >
                {(deleteProduct.isPending || deleteProducts.isPending) && <Loader2 className="w-4 h-4 animate-spin" />}
                Hapus
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Error Alert Dialog Modal */}
      {errorModalState.isOpen && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-surface-900/40 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-scale-in my-auto p-6">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center text-orange-500 shrink-0 animate-pulse">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-extrabold text-surface-900">{errorModalState.title}</h3>
                <p className="text-sm text-surface-600 mt-2 font-medium bg-orange-50/50 border border-orange-100 rounded-xl p-3.5 leading-relaxed">
                  {errorModalState.message}
                </p>
              </div>
            </div>
            
            <div className="flex justify-end mt-6">
              <button 
                type="button"
                onClick={() => setErrorModalState({ isOpen: false, title: '', message: '' })}
                className="bg-surface-900 hover:bg-surface-800 text-white text-sm font-bold px-5 py-2.5 rounded-xl shadow-sm hover:shadow transition-all cursor-pointer"
              >
                Mengerti
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Quick Add Brand Modal */}
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
                <label className="text-xs font-bold text-surface-600 uppercase tracking-wider block mb-1.5">Nama Brand <span className="text-red-500">*</span></label>
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
                  disabled={createBrand.isPending}
                  className="flex items-center gap-1.5 bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all disabled:opacity-60 cursor-pointer shadow-sm"
                >
                  {createBrand.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
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
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(4px)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
            {/* Header */}
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

            {/* Body */}
            <div className="overflow-y-auto flex-1 px-6 py-5">

              {/* STEP 1: Upload */}
              {importStep === 'upload' && (
                <div className="space-y-5">
                  <div className="bg-brand-50 border border-brand-100 rounded-xl p-4 flex items-start gap-3">
                    <AlertTriangle className="w-4 h-4 text-brand-500 shrink-0 mt-0.5" />
                    <div className="text-xs text-brand-700">
                      <p className="font-semibold mb-1">Panduan Import</p>
                      <ul className="list-disc list-inside space-y-1 text-brand-600">
                        <li>Gunakan template Excel yang tersedia di bawah</li>
                        <li>Kolom <strong>SKU</strong> dan <strong>Nama Produk</strong> wajib diisi</li>
                        <li>Jika SKU sudah ada, data produk akan <strong>diperbarui</strong></li>
                        <li>Jika SKU belum ada, produk baru akan <strong>dibuat</strong></li>
                        <li>Brand yang belum ada akan dibuat otomatis</li>
                      </ul>
                    </div>
                  </div>

                  <button
                    onClick={handleDownloadTemplate}
                    className="flex items-center gap-2 text-xs font-semibold text-brand-600 hover:text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-200 px-4 py-2.5 rounded-xl transition-all cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    Download Template Excel
                  </button>

                  <div
                    onClick={() => importFileInputRef.current?.click()}
                    className="border-2 border-dashed border-surface-200 hover:border-brand-400 rounded-2xl p-10 flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors group"
                  >
                    <div className="w-14 h-14 rounded-2xl bg-surface-50 group-hover:bg-brand-50 border border-surface-200 group-hover:border-brand-200 flex items-center justify-center transition-colors">
                      <UploadCloud className="w-7 h-7 text-surface-400 group-hover:text-brand-500 transition-colors" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-semibold text-surface-700">Klik untuk pilih file Excel</p>
                      <p className="text-xs text-surface-400 mt-1">Format yang didukung: .xlsx, .xls</p>
                    </div>
                    <input
                      ref={importFileInputRef}
                      type="file"
                      accept=".xlsx,.xls"
                      className="hidden"
                      onChange={handleImportFile}
                    />
                  </div>
                </div>
              )}

              {/* STEP 2: Preview */}
              {importStep === 'preview' && (
                <div className="space-y-4">
                  {importErrors.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                      <p className="text-xs font-bold text-red-700 mb-2 flex items-center gap-1.5"><XCircle className="w-4 h-4" /> {importErrors.length} Error Validasi</p>
                      <ul className="list-disc list-inside space-y-1">
                        {importErrors.map((e, i) => <li key={i} className="text-xs text-red-600">{e}</li>)}
                      </ul>
                    </div>
                  )}
                  <div className="text-xs text-surface-500 font-semibold uppercase tracking-wider mb-2">Preview Data ({importRows.length} baris)</div>
                  <div className="overflow-x-auto rounded-xl border border-surface-200">
                    <table className="w-full text-left border-collapse min-w-[640px]">
                      <thead>
                        <tr className="bg-surface-50 border-b border-surface-200">
                          <th className="px-3 py-2.5 text-xs font-bold text-surface-500">#</th>
                          <th className="px-3 py-2.5 text-xs font-bold text-surface-500">SKU</th>
                          <th className="px-3 py-2.5 text-xs font-bold text-surface-500">Nama Produk</th>
                          <th className="px-3 py-2.5 text-xs font-bold text-surface-500">Brand</th>
                          <th className="px-3 py-2.5 text-xs font-bold text-surface-500 text-right">Harga Jual</th>
                          <th className="px-3 py-2.5 text-xs font-bold text-surface-500 text-right">Modal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-surface-100">
                        {importRows.map((r, i) => {
                          const existingSku = products?.some(p => p.sku?.toLowerCase() === String(r.sku || '').toLowerCase());
                          return (
                            <tr key={i} className="hover:bg-surface-50">
                              <td className="px-3 py-2 text-xs text-surface-400">{r._rowNum}</td>
                              <td className="px-3 py-2">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs font-mono font-bold text-surface-800">{r.sku || <span className="text-red-500">—</span>}</span>
                                  {existingSku
                                    ? <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded font-semibold">Update</span>
                                    : <span className="text-[10px] bg-green-50 text-green-700 border border-green-200 px-1.5 py-0.5 rounded font-semibold">Baru</span>
                                  }
                                </div>
                              </td>
                              <td className="px-3 py-2 text-xs text-surface-700 max-w-[200px] truncate">{r.name || <span className="text-red-500">—</span>}</td>
                              <td className="px-3 py-2 text-xs text-surface-500">{r.brand || '—'}</td>
                              <td className="px-3 py-2 text-xs text-right font-mono">{r.price ? Number(r.price).toLocaleString('id-ID') : '—'}</td>
                              <td className="px-3 py-2 text-xs text-right font-mono">{r.modal ? Number(r.modal).toLocaleString('id-ID') : '—'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* STEP 3: Result */}
              {importStep === 'result' && importResult && (
                <div className="space-y-4">
                  <div className={`rounded-xl p-5 border flex items-start gap-4 ${
                    importResult.errors.length === 0
                      ? 'bg-green-50 border-green-200'
                      : 'bg-amber-50 border-amber-200'
                  }`}>
                    {importResult.errors.length === 0
                      ? <CheckCircle className="w-6 h-6 text-green-500 shrink-0 mt-0.5" />
                      : <AlertTriangle className="w-6 h-6 text-amber-500 shrink-0 mt-0.5" />
                    }
                    <div>
                      <p className="text-sm font-bold text-surface-800 mb-1">Import Selesai</p>
                      <p className="text-xs text-surface-600">✅ <strong>{importResult.inserted}</strong> produk baru ditambahkan</p>
                      <p className="text-xs text-surface-600">✏️ <strong>{importResult.updated}</strong> produk diperbarui</p>
                      {importResult.errors.length > 0 && (
                        <p className="text-xs text-red-600 mt-1">❌ <strong>{importResult.errors.length}</strong> produk gagal diproses</p>
                      )}
                    </div>
                  </div>
                  {importResult.errors.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                      <p className="text-xs font-bold text-red-700 mb-2">Detail Error</p>
                      <ul className="space-y-1">
                        {importResult.errors.map((e, i) => (
                          <li key={i} className="text-xs text-red-600">
                            {e.sku ? `SKU "${e.sku}": ` : ''}{e.message}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-surface-100 flex items-center justify-between shrink-0">
              <div>
                {importStep === 'preview' && (
                  <button
                    onClick={() => { setImportStep('upload'); setImportRows([]); setImportErrors([]); }}
                    className="flex items-center gap-1.5 text-xs text-surface-500 hover:text-surface-700 cursor-pointer transition-colors"
                  >
                    ← Ganti File
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={resetImportModal}
                  className="px-4 py-2 text-xs font-semibold text-surface-600 hover:text-surface-800 transition-colors cursor-pointer"
                >
                  {importStep === 'result' ? 'Tutup' : 'Batal'}
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
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
