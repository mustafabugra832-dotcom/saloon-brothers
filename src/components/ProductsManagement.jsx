import React, { useState, useEffect } from 'react';
import { 
  Scissors, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  Layers, 
  Check, 
  X,
  ShoppingBag,
  Sparkles,
  Tag
} from 'lucide-react';

import ConfirmModal from './ConfirmModal';

export default function ProductsManagement() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('all');
  const [filterType, setFilterType] = useState('all');

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [cost, setCost] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [type, setType] = useState('service');
  const [stock, setStock] = useState('9999');
  const [isQuick, setIsQuick] = useState(true);
  const [code, setCode] = useState('');

  // Category modal
  const [showCatModal, setShowCatModal] = useState(false);
  const [catName, setCatName] = useState('');

  // Delete confirm modal state
  const [deleteProductId, setDeleteProductId] = useState(null);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products');
      const data = await res.json();
      setProducts(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories');
      const data = await res.json();
      setCategories(data);
    } catch (err) {
      console.error(err);
    }
  };

  const openAddModal = () => {
    setEditingId(null);
    setName('');
    setPrice('');
    setCost('');
    setCategoryId(categories[0]?.id || '');
    setType('service');
    setStock('9999');
    setIsQuick(true);
    setCode('');
    setShowModal(true);
  };

  const openEditModal = (p) => {
    setEditingId(p.id);
    setName(p.name);
    setPrice(p.price);
    setCost(p.cost);
    setCategoryId(p.category_id || '');
    setType(p.type);
    setStock(p.stock);
    setIsQuick(Boolean(p.is_quick));
    setCode(p.code || '');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !price) return;

    const payload = {
      name,
      price: parseFloat(price),
      cost: parseFloat(cost || 0),
      category_id: categoryId ? parseInt(categoryId) : null,
      type,
      stock: parseInt(stock || 0),
      is_quick: isQuick,
      code
    };

    try {
      const url = editingId ? `/api/products/${editingId}` : '/api/products';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setShowModal(false);
        fetchProducts();
      }
    } catch (err) {
      console.error("Hata oluştu.");
    }
  };

  const confirmDeleteProduct = async () => {
    if (!deleteProductId) return;
    try {
      const res = await fetch(`/api/products/${deleteProductId}`, { method: 'DELETE' });
      if (res.ok) {
        setDeleteProductId(null);
        fetchProducts();
      }
    } catch (err) {
      console.error("Silinemedi.");
    }
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!catName) return;

    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: catName })
      });
      if (res.ok) {
        setCatName('');
        setShowCatModal(false);
        fetchCategories();
      }
    } catch (err) {
      console.error("Kategori eklenemedi.");
    }
  };

  const filteredProducts = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || 
                        (p.code && p.code.toLowerCase().includes(search.toLowerCase()));
    const matchCat = filterCat === 'all' || p.category_id === parseInt(filterCat);
    const matchType = filterType === 'all' || p.type === filterType;
    return matchSearch && matchCat && matchType;
  });

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-4 py-4 space-y-4">
      
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white border-2 border-red-200 p-4 rounded-xl shadow-md">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Scissors className="w-5 h-5 text-red-600" />
            Hizmet & Ürün Kataloğu Yönetimi
          </h2>
          <p className="text-xs text-slate-600">Salondaki kuaför hizmetlerini ve satılan bakım ürünlerini düzenleyin.</p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowCatModal(true)}
            className="flex items-center space-x-1.5 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold rounded-lg border border-red-200 transition"
          >
            <Layers className="w-4 h-4 text-red-600" />
            <span>Kategoriler</span>
          </button>

          <button
            onClick={openAddModal}
            className="flex items-center space-x-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition shadow-md shadow-red-600/30"
          >
            <Plus className="w-4 h-4" />
            <span>Yeni Hizmet / Ürün Ekle</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white border-2 border-red-200 p-3 rounded-xl shadow-sm">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Arama yap..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>

        <select
          value={filterCat}
          onChange={(e) => setFilterCat(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
        >
          <option value="all">Tüm Kategoriler</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
        >
          <option value="all">Tüm Tipler (Hizmet & Ürün)</option>
          <option value="service">Sadece Hizmetler</option>
          <option value="product">Sadece Fiziksel Ürünler</option>
        </select>
      </div>

      {/* Products Table */}
      <div className="bg-white border-2 border-red-200 rounded-xl overflow-hidden shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-red-600 text-white uppercase text-[10px] font-bold border-b border-red-700">
              <tr>
                <th className="py-3 px-4">Kod</th>
                <th className="py-3 px-4">Adı</th>
                <th className="py-3 px-4">Kategori</th>
                <th className="py-3 px-4">Tip</th>
                <th className="py-3 px-4 text-right">Satış Fiyatı</th>
                <th className="py-3 px-4 text-right">Maliyet</th>
                <th className="py-3 px-4 text-center">Stok</th>
                <th className="py-3 px-4 text-center">Hızlı Satış</th>
                <th className="py-3 px-4 text-center">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-red-100 font-medium bg-white">
              {filteredProducts.map((p) => (
                <tr key={p.id} className="hover:bg-red-50/60 transition-colors">
                  <td className="py-3 px-4 font-mono text-slate-500">{p.code || '-'}</td>
                  <td className="py-3 px-4 font-bold text-slate-900">{p.name}</td>
                  <td className="py-3 px-4 text-slate-600">{p.category_name || 'Genel'}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      p.type === 'service' ? 'bg-red-100 text-red-800 border border-red-200' : 'bg-blue-100 text-blue-800 border border-blue-200'
                    }`}>
                      {p.type === 'service' ? 'Hizmet' : 'Ürün'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-red-600 font-mono text-sm">
                    {p.price.toLocaleString('tr-TR')} ₺
                  </td>
                  <td className="py-3 px-4 text-right text-slate-600 font-mono">
                    {p.cost.toLocaleString('tr-TR')} ₺
                  </td>
                  <td className="py-3 px-4 text-center font-mono text-slate-700">
                    {p.type === 'service' ? '∞' : p.stock}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {p.is_quick ? (
                      <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 font-bold border border-emerald-200 rounded text-[10px]">Aktif</span>
                    ) : (
                      <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 border border-slate-200 rounded text-[10px]">Pasif</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center space-x-1">
                    <button
                      onClick={() => openEditModal(p)}
                      className="p-1.5 text-slate-500 hover:text-red-600 rounded hover:bg-red-50 transition"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteProductId(p.id)}
                      className="p-1.5 text-slate-500 hover:text-red-600 rounded hover:bg-red-50 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}

              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan="9" className="py-10 text-center text-slate-500 text-xs">
                    Kayıt bulunamadı.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border-2 border-red-500 rounded-xl p-5 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <h3 className="font-bold text-slate-900 text-base">
                {editingId ? 'Hizmet / Ürün Düzenle' : 'Yeni Hizmet / Ürün Ekle'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-700 font-bold block mb-1">Tip</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-red-500"
                  >
                    <option value="service">✂️ Hizmet (Kesim, Fön vb)</option>
                    <option value="product">🛍️ Ürün (Wax, Sprey vb)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-700 font-bold block mb-1">Kategori</label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-red-500"
                  >
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-700 font-bold block mb-1">Hizmet / Ürün Adı</label>
                <input
                  type="text"
                  required
                  placeholder="Ör: Saç & Sakal Kombin"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-700 font-bold block mb-1">Satış Fiyatı (₺)</label>
                  <input
                    type="number"
                    required
                    step="any"
                    placeholder="250"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-mono font-bold text-red-600 focus:bg-white focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-700 font-bold block mb-1">Maliyet (₺)</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="0"
                    value={cost}
                    onChange={(e) => setCost(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-mono text-slate-900 focus:bg-white focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {type === 'product' && (
                  <div>
                    <label className="text-xs text-slate-700 font-bold block mb-1">Stok Adedi</label>
                    <input
                      type="number"
                      value={stock}
                      onChange={(e) => setStock(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-mono text-slate-900 focus:bg-white focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                )}

                <div>
                  <label className="text-xs text-slate-700 font-bold block mb-1">Barkod / Ürün Kodu</label>
                  <input
                    type="text"
                    placeholder="SK-01"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-mono text-slate-900 focus:bg-white focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="checkbox"
                  id="is_quick"
                  checked={isQuick}
                  onChange={(e) => setIsQuick(e.target.checked)}
                  className="rounded border-slate-300 text-red-600 focus:ring-red-500"
                />
                <label htmlFor="is_quick" className="text-xs text-slate-700 font-medium">
                  Hızlı Satış Ekranında (Ana Grid) Gösterilsin
                </label>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg text-xs transition shadow-md shadow-red-600/30"
              >
                Kaydet
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Category Add Modal */}
      {showCatModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border-2 border-red-500 rounded-xl p-5 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <h3 className="font-bold text-slate-900 text-sm">Yeni Kategori Ekle</h3>
              <button onClick={() => setShowCatModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddCategory} className="space-y-3">
              <div>
                <label className="text-xs text-slate-700 font-bold block mb-1">Kategori Adı</label>
                <input
                  type="text"
                  required
                  placeholder="Ör: Saç Renklendirme & Boya"
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-red-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg text-xs transition shadow-md shadow-red-600/30"
              >
                Kategoriyi Kaydet
              </button>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      <ConfirmModal 
        isOpen={Boolean(deleteProductId)}
        title="Ürün / Hizmet Silme Onayı"
        message="Bu hizmet veya ürünü silmek istediğinize emin misiniz?"
        confirmText="Evet, Ürünü Sil"
        cancelText="Vazgeç"
        onConfirm={confirmDeleteProduct}
        onClose={() => setDeleteProductId(null)}
      />

    </div>
  );
}
