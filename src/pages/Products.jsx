import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Search, Plus, Filter, Image as ImageIcon, Edit, Trash2, Box, X, Loader2, UploadCloud, LayoutGrid, List as ListIcon, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useProducts, useCreateProduct, useUpdateProduct, useDeleteProduct, useDeleteProducts, useBrands } from '../hooks/useSupabase.js';
import * as api from '../services/api.js';
import Pagination from '../components/Pagination.jsx';

const PAGE_SIZE = 8;

export default function Products() {
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

  const [newProduct, setNewProduct] = useState({ 
    sku: '', 
    name: '', 
    brand_id: '', 
    price: '', 
    description: '',
    image_url: ''
  });

  const { data: products, isLoading: isLoadingProducts, isError: isErrorProducts } = useProducts();
  const { data: brands, isLoading: isLoadingBrands } = useBrands();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();
  const deleteProducts = useDeleteProducts();

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
      // If we selected a new file (imagePreview is a base64 string and not a regular url)
      if (imagePreview && imagePreview.startsWith('data:image')) {
        if (!newProduct.sku) throw new Error('Harap isi SKU terlebih dahulu sebelum mengunggah gambar');
        
        toast.loading('Menyimpan gambar ke lokal...', { id: 'upload' });
        const ext = imagePreview.substring(imagePreview.indexOf('/') + 1, imagePreview.indexOf(';base64'));
        const filename = `${newProduct.sku.toLowerCase()}-${Date.now()}.${ext}`;
        
        const res = await fetch('/api/upload-local', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ base64: imagePreview, filename })
        });
        
        if (!res.ok) throw new Error('Gagal menyimpan gambar di server lokal');
        const data = await res.json();
        finalImageUrl = data.url; // e.g. /images/poly-x50-123.png
        toast.success('Gambar berhasil disimpan!', { id: 'upload' });
      }

      const payload = {
        ...newProduct,
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
    setNewProduct({ sku: '', name: '', brand_id: '', price: '', description: '', image_url: '' });
  };

  const openAddModal = () => {
    setEditingSku(null);
    setImagePreview(null);
    setNewProduct({ sku: '', name: '', brand_id: '', price: '', description: '', image_url: '' });
    setIsModalOpen(true);
  };

  const handleEdit = (product) => {
    setEditingSku(product.sku);
    setImagePreview(product.image_url || null);
    setNewProduct({
      sku: product.sku,
      name: product.name,
      brand_id: product.brand_id || '',
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
                    <label className="text-xs font-bold text-surface-600 uppercase tracking-wider mb-2 block">Brand <span className="text-red-500">*</span></label>
                    <select 
                      required
                      value={newProduct.brand_id}
                      onChange={e => setNewProduct({...newProduct, brand_id: e.target.value})}
                      className="w-full border border-surface-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-50 transition-all bg-white cursor-pointer"
                    >
                      <option value="" disabled>Pilih Brand</option>
                      {brands?.map(b => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
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

                <div>
                  <label className="text-xs font-bold text-surface-600 uppercase tracking-wider mb-2 block">Harga Jual (IDR) <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <span className="text-surface-500 text-sm font-bold">Rp</span>
                    </div>
                    <input 
                      type="number"
                      required
                      min="0"
                      value={newProduct.price}
                      onChange={e => setNewProduct({...newProduct, price: e.target.value})}
                      className="w-full border border-surface-200 rounded-xl pl-12 pr-4 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-50 transition-all"
                      placeholder="0"
                    />
                  </div>
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
                  <p className="text-[10px] text-surface-400 mt-1">File akan disimpan di `public/images/` lokal, dan path-nya ke Supabase.</p>
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
    </div>
  );
}
