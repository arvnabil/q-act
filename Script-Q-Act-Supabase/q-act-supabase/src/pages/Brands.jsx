import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { Search, Plus, Edit, Trash2, X, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useBrands, useCreateBrand, useUpdateBrand, useDeleteBrand } from '../hooks/useSupabase.js';

export default function Brands() {
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newBrand, setNewBrand] = useState({ name: '', color_hex: '#00B894' });
  const [editBrandId, setEditBrandId] = useState(null);

  const { data: brands, isLoading, isError } = useBrands();
  const createBrand = useCreateBrand();
  const updateBrand = useUpdateBrand();
  const deleteBrand = useDeleteBrand();

  const getBrandStyles = (color) => {
    const validColor = color || '#000000';
    return {
      backgroundColor: `${validColor}12`,
      color: validColor,
      border: `1px solid ${validColor}20`
    };
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (editBrandId) {
      updateBrand.mutate({ id: editBrandId, brandData: newBrand }, {
        onSuccess: () => {
          setIsModalOpen(false);
          setNewBrand({ name: '', color_hex: '#00B894' });
          setEditBrandId(null);
          toast.success('Brand berhasil diperbarui!');
        },
        onError: (err) => {
          toast.error('Gagal memperbarui brand: ' + err.message);
        }
      });
    } else {
      createBrand.mutate(newBrand, {
        onSuccess: () => {
          setIsModalOpen(false);
          setNewBrand({ name: '', color_hex: '#00B894' });
          toast.success('Brand berhasil ditambahkan!');
        },
        onError: (err) => {
          toast.error('Gagal menambahkan brand: ' + err.message);
        }
      });
    }
  };

  const handleEditClick = (b) => {
    setNewBrand({ name: b.name, color_hex: b.color_hex });
    setEditBrandId(b.id);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (id) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus brand ini? Tindakan ini tidak dapat dibatalkan.')) {
      deleteBrand.mutate(id, {
        onSuccess: () => {
          toast.success('Brand berhasil dihapus!');
        },
        onError: (err) => {
          toast.error('Gagal menghapus brand: ' + err.message);
        }
      });
    }
  };

  const filteredBrands = brands?.filter(b => 
    b.name.toLowerCase().includes(search.toLowerCase())
  ) || [];

  return (
    <div className="animate-fade-in-up">
      {/* Controls */}
      <div className="bg-white rounded-xl border border-surface-200 mb-5">
        <div className="px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 bg-surface-50 border border-surface-200 rounded-lg px-3 py-2 flex-1 max-w-md focus-within:border-brand-400 transition-colors">
            <Search className="w-4 h-4 text-surface-400 shrink-0" />
            <input
              type="text"
              placeholder="Cari nama brand..."
              className="bg-transparent border-none outline-none text-sm text-surface-700 placeholder-surface-400 w-full"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button 
            onClick={() => {
              setEditBrandId(null);
              setNewBrand({ name: '', color_hex: '#00B894' });
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold px-4 py-2 rounded-lg shadow-sm hover:shadow transition-all shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Brand</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-surface-200 overflow-hidden relative min-h-[300px]">
        {isLoading && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-brand-500 mb-2" />
            <span className="text-sm font-medium text-surface-500">Memuat data dari Supabase...</span>
          </div>
        )}
        
        {isError && (
          <div className="absolute inset-0 bg-white z-10 flex flex-col items-center justify-center text-red-500">
            <span className="text-sm font-bold">Gagal memuat data. Periksa koneksi Supabase Anda.</span>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-surface-50 border-b border-surface-200">
                <th className="py-3 px-4 w-10"><input type="checkbox" className="w-4 h-4 rounded border-surface-300 text-brand-500 focus:ring-brand-500 accent-brand-500 cursor-pointer" /></th>
                <th className="py-3 px-4 text-left text-xs font-bold text-surface-400 uppercase tracking-wider">Preview Tag</th>
                <th className="py-3 px-4 text-left text-xs font-bold text-surface-400 uppercase tracking-wider">Kode Warna (Hex)</th>
                <th className="py-3 px-4 text-center text-xs font-bold text-surface-400 uppercase tracking-wider w-24">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredBrands.length === 0 && !isLoading && (
                <tr>
                  <td colSpan="4" className="py-8 text-center text-sm text-surface-400">
                    Belum ada brand terdaftar. Silakan tambah brand baru.
                  </td>
                </tr>
              )}
              {filteredBrands.map((b) => (
                <tr key={b.id} className="border-b border-surface-100 hover:bg-surface-50/60 transition-colors">
                  <td className="py-3.5 px-4"><input type="checkbox" className="w-4 h-4 rounded border-surface-300 text-brand-500 focus:ring-brand-500 accent-brand-500 cursor-pointer" /></td>
                  <td className="py-3.5 px-4">
                    <span 
                      className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold"
                      style={getBrandStyles(b.color_hex)}
                    >
                      {b.name}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-sm font-mono text-surface-500 flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full border border-surface-200" style={{ backgroundColor: b.color_hex }}></div>
                    {b.color_hex}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button 
                        onClick={() => handleEditClick(b)}
                        className="text-brand-600 hover:text-brand-700 hover:bg-brand-50 p-1.5 rounded-lg transition-colors cursor-pointer" 
                        title="Edit Brand"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDeleteClick(b.id)}
                        disabled={deleteBrand.isPending}
                        className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-50" 
                        title="Hapus Brand"
                      >
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

      {/* Create/Edit Modal */}
      {isModalOpen && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-surface-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100">
              <h2 className="text-lg font-bold text-surface-800">{editBrandId ? 'Edit Brand' : 'Tambah Brand Baru'}</h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-surface-400 hover:text-surface-600 hover:bg-surface-100 p-2 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSave}>
              <div className="p-6 flex flex-col gap-5">
                <div>
                  <label className="text-xs font-bold text-surface-600 uppercase tracking-wider mb-2 block">Nama Brand</label>
                  <input 
                    type="text"
                    required
                    autoFocus
                    value={newBrand.name}
                    onChange={e => setNewBrand({...newBrand, name: e.target.value})}
                    className="w-full border border-surface-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-50 transition-all"
                    placeholder="Contoh: Poly, Logitech..."
                  />
                </div>
                
                <div>
                  <label className="text-xs font-bold text-surface-600 uppercase tracking-wider mb-2 block">Warna Identitas (Hex)</label>
                  <div className="flex items-center gap-3">
                    <input 
                      type="color"
                      value={newBrand.color_hex}
                      onChange={e => setNewBrand({...newBrand, color_hex: e.target.value})}
                      className="w-10 h-10 rounded cursor-pointer border-0 p-0"
                    />
                    <input 
                      type="text"
                      required
                      value={newBrand.color_hex}
                      onChange={e => setNewBrand({...newBrand, color_hex: e.target.value})}
                      className="flex-1 border border-surface-200 rounded-xl px-4 py-2.5 text-sm font-mono outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-50 transition-all uppercase"
                      placeholder="#000000"
                    />
                  </div>
                </div>

                <div className="bg-surface-50 p-4 rounded-xl border border-surface-200 mt-2">
                  <span className="text-xs text-surface-500 block mb-2 font-medium">Preview Tampilan Tag:</span>
                  <span 
                    className="inline-flex px-3 py-1 rounded-full text-sm font-bold"
                    style={getBrandStyles(newBrand.color_hex)}
                  >
                    {newBrand.name || 'Nama Brand'}
                  </span>
                </div>
              </div>

              <div className="px-6 py-4 bg-surface-50 border-t border-surface-100 flex justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-surface-600 hover:text-surface-800 transition-colors"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  disabled={createBrand.isPending || updateBrand.isPending}
                  className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-bold px-6 py-2 rounded-xl shadow-sm hover:shadow-md transition-all disabled:opacity-70"
                >
                  {(createBrand.isPending || updateBrand.isPending) && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editBrandId ? 'Simpan Perubahan' : 'Simpan Brand'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
