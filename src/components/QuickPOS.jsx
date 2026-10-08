import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  User, 
  Landmark, 
  Banknote, 
  BookOpen, 
  Layers, 
  Printer, 
  CheckCircle2, 
  Scissors, 
  Sparkles, 
  X,
  Tag,
  AlertCircle,
  Phone,
  AlertTriangle
} from 'lucide-react';

export default function QuickPOS({ onSaleComplete, refreshSummary, showToast }) {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [cart, setCart] = useState([]);
  const [discount, setDiscount] = useState(0);
  const [saleNote, setSaleNote] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successToast, setSuccessToast] = useState(null);

  // Custom Item Modal State
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customItemName, setCustomItemName] = useState('');
  const [customItemPrice, setCustomItemPrice] = useState('');

  // Veresiye Direct Name & Phone Modal
  const [showVeresiyeModal, setShowVeresiyeModal] = useState(false);
  const [veresiyeName, setVeresiyeName] = useState('');
  const [veresiyePhone, setVeresiyePhone] = useState('');
  const [veresiyeError, setVeresiyeError] = useState('');

  // Split Payment Modal State
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [splitCash, setSplitCash] = useState(0);
  const [splitIban, setSplitIban] = useState(0);
  const [splitVeresiye, setSplitVeresiye] = useState(0);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [resProd, resCat] = await Promise.all([
        fetch('/api/products'),
        fetch('/api/categories')
      ]);
      const dataProd = await resProd.json();
      const dataCat = await resCat.json();

      setProducts(dataProd);
      setCategories(dataCat);
    } catch (err) {
      console.error("Veriler alınamadı:", err);
    }
  };

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchCat = selectedCategory === 'all' || p.category_id === parseInt(selectedCategory);
      const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (p.code && p.code.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchCat && matchSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  const addToCart = (product) => {
    setErrorMsg('');
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id && item.name === product.name);
      if (existing) {
        return prev.map(item => 
          (item.id === product.id && item.name === product.name)
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const updateQuantity = (index, delta) => {
    setCart(prev => {
      const updated = [...prev];
      const newQty = updated[index].quantity + delta;
      if (newQty <= 0) {
        updated.splice(index, 1);
      } else {
        updated[index].quantity = newQty;
      }
      return updated;
    });
  };

  const removeFromCart = (index) => {
    setCart(prev => prev.filter((_, i) => i !== index));
  };

  const addCustomItem = (e) => {
    e.preventDefault();
    if (!customItemName || !customItemPrice || parseFloat(customItemPrice) <= 0) return;
    
    addToCart({
      id: null,
      name: customItemName,
      price: parseFloat(customItemPrice),
      type: 'service'
    });

    setCustomItemName('');
    setCustomItemPrice('');
    setShowCustomModal(false);
  };

  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }, [cart]);

  const totalAmount = useMemo(() => {
    return Math.max(0, subtotal - parseFloat(discount || 0));
  }, [subtotal, discount]);

  const handleCheckout = async (paymentType, custInfo = null, splitDetails = null) => {
    if (cart.length === 0) {
      setErrorMsg("Lütfen önce sepete işlem veya ürün ekleyiniz.");
      return;
    }

    setErrorMsg('');
    setLoading(true);

    try {
      const payload = {
        items: cart,
        customer_name: custInfo ? custInfo.name : 'Misafir Müşteri',
        customer_phone: custInfo ? custInfo.phone : '',
        payment_type: paymentType,
        cash_amount: splitDetails ? splitDetails.cash : (paymentType === 'cash' ? totalAmount : 0),
        iban_amount: splitDetails ? splitDetails.iban : (paymentType === 'iban' ? totalAmount : 0),
        veresiye_amount: splitDetails ? splitDetails.veresiye : (paymentType === 'veresiye' ? totalAmount : 0),
        subtotal: subtotal,
        discount: parseFloat(discount || 0),
        total_amount: totalAmount,
        note: saleNote
      };

      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await res.json();

      if (res.ok && result.success) {
        if (showToast) {
          const payTypeStr = paymentType === 'cash' ? 'Nakit' : paymentType === 'iban' ? 'IBAN / Havale' : paymentType === 'veresiye' ? 'Veresiye' : 'Parçalı';
          showToast(
            'Satış Tamamlandı - Ödeme Alındı!',
            `Tutar: ${totalAmount.toLocaleString('tr-TR')} ₺ • Ödeme Yöntemi: ${payTypeStr}`
          );
        } else {
          setSuccessToast({
            id: result.sale_id,
            amount: totalAmount,
            type: paymentType
          });
          setTimeout(() => setSuccessToast(null), 4000);
        }

        // Reset Cart
        setCart([]);
        setDiscount(0);
        setSaleNote('');
        setShowVeresiyeModal(false);
        setVeresiyeName('');
        setVeresiyePhone('');
        setShowSplitModal(false);

        if (refreshSummary) refreshSummary();
        if (onSaleComplete) onSaleComplete();
        fetchData();
      } else {
        setErrorMsg(result.error || "Satış kaydedilirken bir sorun oluştu.");
      }
    } catch (err) {
      setErrorMsg("Bağlantı hatası oluştu. Lütfen tekrar deneyiniz.");
    } finally {
      setLoading(false);
    }
  };

  const openVeresiyeModal = () => {
    if (cart.length === 0) {
      setErrorMsg("Lütfen önce sepete işlem veya ürün ekleyiniz.");
      return;
    }
    setVeresiyeError('');
    setShowVeresiyeModal(true);
  };

  const handleConfirmVeresiye = (e) => {
    e.preventDefault();
    if (!veresiyeName || veresiyeName.trim() === '') {
      setVeresiyeError("Müşteri Ad Soyad zorunludur!");
      return;
    }
    if (!veresiyePhone || veresiyePhone.trim() === '') {
      setVeresiyeError("Telefon Numarası zorunludur!");
      return;
    }

    handleCheckout('veresiye', { name: veresiyeName.trim(), phone: veresiyePhone.trim() });
  };

  const handleOpenSplitModal = () => {
    if (cart.length === 0) {
      setErrorMsg("Lütfen önce sepete işlem veya ürün ekleyiniz.");
      return;
    }
    setSplitCash(totalAmount);
    setSplitIban(0);
    setSplitVeresiye(0);
    setShowSplitModal(true);
  };

  const handleConfirmSplitSale = () => {
    const totalSplit = parseFloat(splitCash || 0) + parseFloat(splitIban || 0) + parseFloat(splitVeresiye || 0);
    if (Math.abs(totalSplit - totalAmount) > 0.01) {
      setErrorMsg(`Girilen toplam ödeme miktarı (${totalSplit} ₺) toplam tutara (${totalAmount} ₺) eşit olmalıdır!`);
      return;
    }
    
    if (parseFloat(splitVeresiye) > 0) {
      if (!veresiyeName || !veresiyePhone) {
        openVeresiyeModal();
        return;
      }
    }

    handleCheckout('split', { name: veresiyeName || 'Misafir Müşteri', phone: veresiyePhone }, { cash: parseFloat(splitCash), iban: parseFloat(splitIban), veresiye: parseFloat(splitVeresiye) });
  };

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-4 py-4 grid grid-cols-1 lg:grid-cols-12 gap-4">
      
      {/* LEFT COLUMN: Catalog / Quick Items Selection (7 Cols) */}
      <div className="lg:col-span-7 flex flex-col space-y-4">
        
        {/* Search & Category Filter Bar */}
        <div className="bg-white border-2 border-red-200 p-4 rounded-xl shadow-md space-y-3">
          
          <div className="flex items-center space-x-3">
            <div className="relative flex-1">
              <Search className="w-5 h-5 absolute left-3 top-2.5 text-slate-400" />
              <input 
                type="text" 
                placeholder="Hizmet veya ürün ara (ör: Saç, Sakal, Wax)..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-700">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <button
              onClick={() => setShowCustomModal(true)}
              className="flex items-center space-x-1.5 px-3 py-2 bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 rounded-lg text-sm font-semibold transition"
            >
              <Plus className="w-4 h-4 text-red-600" />
              <span>Özel İşlem</span>
            </button>
          </div>

          {/* Categories Horizontal Tabs */}
          <div className="flex items-center space-x-2 overflow-x-auto pb-1 pt-1 no-scrollbar">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                selectedCategory === 'all'
                  ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                  : 'bg-slate-100 text-slate-700 border border-slate-200 hover:bg-red-50'
              }`}
            >
              Tümü ({products.length})
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id.toString())}
                className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                  selectedCategory === cat.id.toString()
                    ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                    : 'bg-slate-100 text-slate-700 border border-slate-200 hover:bg-red-50'
                }`}
              >
                <span>{cat.name}</span>
              </button>
            ))}
          </div>

        </div>

        {/* Products & Services Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 overflow-y-auto max-h-[calc(100vh-230px)] pr-1">
          {filteredProducts.map((item) => (
            <button
              key={item.id}
              onClick={() => addToCart(item)}
              className="bg-white border-2 border-red-100 hover:border-red-500 hover:bg-red-50/50 p-3.5 rounded-xl text-left transition-all duration-150 flex flex-col justify-between h-28 relative group shadow-sm active:scale-95"
            >
              <div className="flex items-start justify-between">
                <span className="font-semibold text-slate-900 text-sm line-clamp-2 group-hover:text-red-700">
                  {item.name}
                </span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                  item.type === 'service' ? 'bg-red-100 text-red-800 border border-red-200' : 'bg-blue-100 text-blue-800 border border-blue-200'
                }`}>
                  {item.type === 'service' ? 'Hizmet' : 'Ürün'}
                </span>
              </div>

              <div className="flex items-end justify-between mt-2">
                <div>
                  {item.type === 'product' && (
                    <span className="text-xs text-slate-500 block">Stok: {item.stock}</span>
                  )}
                  <span className="text-xs text-slate-400">{item.code || ''}</span>
                </div>
                <div className="text-base font-extrabold text-red-600 font-mono">
                  {item.price.toLocaleString('tr-TR')} ₺
                </div>
              </div>
            </button>
          ))}

          {filteredProducts.length === 0 && (
            <div className="col-span-full py-12 text-center text-slate-500 bg-white rounded-xl border-2 border-red-200 shadow-sm">
              <Scissors className="w-10 h-10 mx-auto text-red-400 mb-2" />
              <p className="font-semibold text-slate-700">Hizmet veya ürün bulunamadı.</p>
            </div>
          )}
        </div>

      </div>

      {/* RIGHT COLUMN: Active Cart & Quick Checkout Panel (5 Cols) */}
      <div className="lg:col-span-5 bg-white border-2 border-red-200 rounded-xl p-4 flex flex-col justify-between shadow-xl min-h-[calc(100vh-140px)]">
        
        <div>
          {/* Cart Header */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-200 mb-3">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Tag className="w-4 h-4 text-red-600" />
              Sepet Listesi ({cart.reduce((a, b) => a + b.quantity, 0)} İşlem)
            </h3>
            {cart.length > 0 && (
              <button 
                onClick={() => setCart([])}
                className="text-xs text-red-600 hover:text-red-700 font-bold"
              >
                Temizle
              </button>
            )}
          </div>

          {/* ERROR BANNER */}
          {errorMsg && (
            <div className="mb-3 p-3 bg-red-50 border border-red-300 text-red-700 text-xs rounded-xl flex items-center justify-between font-bold">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{errorMsg}</span>
              </div>
              <button onClick={() => setErrorMsg('')} className="text-red-600 hover:text-red-800">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Cart Items Scroll Area */}
          <div className="overflow-y-auto max-h-[350px] space-y-2 pr-1">
            {cart.map((item, idx) => (
              <div 
                key={idx}
                className="flex items-center justify-between bg-red-50/50 p-2.5 rounded-lg border border-red-100 text-sm"
              >
                <div className="flex-1 pr-2">
                  <div className="font-semibold text-slate-900">{item.name}</div>
                  <div className="text-xs text-red-600 font-mono">
                    {item.price.toLocaleString('tr-TR')} ₺ x {item.quantity} = <span className="font-bold font-mono">{(item.price * item.quantity).toLocaleString('tr-TR')} ₺</span>
                  </div>
                </div>

                <div className="flex items-center space-x-1.5">
                  <button
                    onClick={() => updateQuantity(idx, -1)}
                    className="w-6 h-6 rounded bg-slate-200 hover:bg-slate-300 text-slate-800 flex items-center justify-center font-bold"
                  >
                    -
                  </button>
                  <span className="w-6 text-center font-bold text-slate-900 text-xs">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(idx, 1)}
                    className="w-6 h-6 rounded bg-slate-200 hover:bg-slate-300 text-slate-800 flex items-center justify-center font-bold"
                  >
                    +
                  </button>
                  <button
                    onClick={() => removeFromCart(idx)}
                    className="w-6 h-6 rounded bg-red-100 hover:bg-red-200 text-red-600 flex items-center justify-center ml-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}

            {cart.length === 0 && (
              <div className="py-14 text-center text-slate-500 border border-dashed border-red-200 bg-slate-50/50 rounded-lg">
                Sol taraftan işlem veya ürün seçiniz.
              </div>
            )}
          </div>
        </div>

        {/* Footer & Payment Calculation Area */}
        <div className="pt-4 border-t border-slate-200 space-y-3">
          
          {/* Discount & Subtotal summary */}
          <div className="space-y-1.5 text-xs text-slate-700 font-medium">
            <div className="flex justify-between">
              <span>Ara Toplam:</span>
              <span className="font-mono font-semibold text-slate-900">{subtotal.toLocaleString('tr-TR')} ₺</span>
            </div>

            <div className="flex items-center justify-between">
              <span>İndirim Tutarı (₺):</span>
              <input
                type="number"
                min="0"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                className="w-24 px-2 py-1 bg-slate-50 border border-slate-300 rounded text-right text-xs font-mono font-bold text-red-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="0"
              />
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-slate-200 text-base font-extrabold text-slate-900">
              <span>ÖDENECEK TUTAR:</span>
              <span className="text-xl text-red-600 font-mono">
                {totalAmount.toLocaleString('tr-TR')} ₺
              </span>
            </div>
          </div>

          {/* Quick Payment Action Buttons */}
          <div className="grid grid-cols-2 gap-2 pt-2">
            <button
              disabled={cart.length === 0 || loading}
              onClick={() => handleCheckout('cash')}
              className="flex items-center justify-center space-x-2 py-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-extrabold rounded-xl shadow-lg shadow-red-600/30 transition active:scale-95 text-sm"
            >
              <Banknote className="w-4 h-4" />
              <span>NAKİT ÖDE</span>
            </button>

            <button
              disabled={cart.length === 0 || loading}
              onClick={() => handleCheckout('iban')}
              className="flex items-center justify-center space-x-2 py-3 bg-white hover:bg-red-50 border-2 border-red-600 disabled:opacity-50 text-red-700 font-extrabold rounded-xl shadow-md transition active:scale-95 text-sm"
            >
              <Landmark className="w-4 h-4 text-red-600" />
              <span>IBAN / HAVALE</span>
            </button>

            <button
              disabled={cart.length === 0 || loading}
              onClick={openVeresiyeModal}
              className="flex items-center justify-center space-x-2 py-3 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-extrabold rounded-xl shadow-lg shadow-rose-600/30 transition active:scale-95 text-sm"
            >
              <BookOpen className="w-4 h-4" />
              <span>VERESİYE YAZ</span>
            </button>

            <button
              disabled={cart.length === 0 || loading}
              onClick={handleOpenSplitModal}
              className="flex items-center justify-center space-x-2 py-3 bg-red-50 hover:bg-red-100 disabled:opacity-50 text-red-800 font-extrabold rounded-xl border-2 border-red-200 transition active:scale-95 text-sm"
            >
              <Layers className="w-4 h-4 text-red-600" />
              <span>PARÇALI ÖDE</span>
            </button>
          </div>

        </div>

      </div>

      {/* MODAL 1: Custom Item Modal */}
      {showCustomModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border-2 border-red-500 rounded-xl p-5 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-red-600" />
                Özel İşlem veya Ürün Ekle
              </h3>
              <button onClick={() => setShowCustomModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={addCustomItem} className="space-y-3">
              <div>
                <label className="text-xs text-slate-700 font-bold block mb-1">İşlem Adı</label>
                <input
                  type="text"
                  required
                  placeholder="Ör: Özel VIP Saç Tasarımı"
                  value={customItemName}
                  onChange={(e) => setCustomItemName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-700 font-bold block mb-1">Fiyat (₺)</label>
                <input
                  type="number"
                  required
                  min="1"
                  step="any"
                  placeholder="250"
                  value={customItemPrice}
                  onChange={(e) => setCustomItemPrice(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-sm font-mono text-red-600 font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition shadow-md shadow-red-600/30"
              >
                Sepete Ekle
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: DIRECT VERESİYE NAME & PHONE POPUP */}
      {showVeresiyeModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border-2 border-red-500 rounded-xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <h3 className="font-bold text-red-600 flex items-center gap-2 text-base">
                <BookOpen className="w-5 h-5 text-red-600" />
                Veresiye Kaydı Girişi
              </h3>
              <button onClick={() => setShowVeresiyeModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-red-50 p-2.5 rounded-lg border border-red-200 text-xs flex justify-between font-mono">
              <span className="text-slate-700 font-medium">Veresiye Yazılacak Tutar:</span>
              <span className="font-bold text-red-600 text-sm">{totalAmount.toLocaleString('tr-TR')} ₺</span>
            </div>

            {veresiyeError && (
              <div className="p-2 bg-red-100 border border-red-300 text-red-800 text-xs rounded-lg text-center font-bold">
                {veresiyeError}
              </div>
            )}

            <form onSubmit={handleConfirmVeresiye} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Müşteri Ad Soyad <span className="text-red-600">* ZORUNLU</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="Ör: Hasan Kaya"
                    value={veresiyeName}
                    onChange={(e) => setVeresiyeName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Telefon Numarası <span className="text-slate-400">(İsteğe Bağlı)</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    placeholder="0532 000 0000"
                    value={veresiyePhone}
                    onChange={(e) => setVeresiyePhone(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-extrabold rounded-lg transition shadow-lg shadow-red-600/30 text-sm mt-2"
              >
                VERESİYE BORCU KAYDET
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Split Payment Modal */}
      {showSplitModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border-2 border-red-500 rounded-xl p-5 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-red-600" />
                Parçalı Ödeme Bölüştürme
              </h3>
              <button onClick={() => setShowSplitModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-red-50 rounded-lg border border-red-200 text-xs flex justify-between font-mono">
              <span className="text-slate-700 font-medium">Toplam Ödenecek Tutar:</span>
              <span className="font-bold text-red-600 text-sm">{totalAmount.toLocaleString('tr-TR')} ₺</span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-700 font-bold block mb-1">Nakit Ödenen (₺)</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={splitCash}
                  onChange={(e) => setSplitCash(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-sm font-mono text-emerald-600 font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-700 font-bold block mb-1">IBAN / Havale Ödenen (₺)</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={splitIban}
                  onChange={(e) => setSplitIban(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-sm font-mono text-blue-600 font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-700 font-bold block mb-1">Veresiye Borç Yazılan (₺)</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={splitVeresiye}
                  onChange={(e) => setSplitVeresiye(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-sm font-mono text-rose-600 font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
            </div>

            <button
              onClick={handleConfirmSplitSale}
              className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition shadow-md shadow-red-600/30"
            >
              Parçalı Satışı Tamamla
            </button>
          </div>
        </div>
      )}

      {/* TOP-RIGHT SUCCESS TOAST NOTIFICATION */}
      {successToast && (
        <div className="fixed top-24 right-5 z-[9999] flex items-center space-x-3 bg-red-600 text-white px-5 py-4 rounded-2xl shadow-2xl animate-in slide-in-from-top-3 duration-300 border-2 border-white">
          <div className="w-10 h-10 rounded-xl bg-white text-red-600 flex items-center justify-center font-black shrink-0 shadow-md">
            <CheckCircle2 className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <div className="font-extrabold text-white text-sm flex items-center gap-1.5">
              <span>Satış Tamamlandı - Ödeme Alındı!</span>
              <span className="text-xs text-red-200 font-mono">#{successToast.id}</span>
            </div>
            <div className="text-xs text-red-100 font-mono mt-0.5">
              Tutar: <span className="font-bold text-white font-mono text-xs">{successToast.amount.toLocaleString('tr-TR')} ₺</span> • {
                successToast.type === 'cash' ? 'Nakit' : 
                successToast.type === 'iban' ? 'IBAN / Havale' : 
                successToast.type === 'veresiye' ? 'Veresiye' : 'Parçalı'
              }
            </div>
          </div>
          <button onClick={() => setSuccessToast(null)} className="text-white hover:text-red-200 p-1.5 ml-2 hover:bg-red-700 rounded-lg transition">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

    </div>
  );
}
