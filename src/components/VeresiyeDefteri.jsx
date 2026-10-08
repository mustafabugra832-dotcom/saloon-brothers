import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Plus, 
  BookOpen, 
  Phone, 
  MessageCircle, 
  DollarSign, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Trash2, 
  User, 
  Calendar, 
  AlertTriangle,
  CheckCircle2,
  X,
  Send,
  UserPlus
} from 'lucide-react';

import ConfirmModal from './ConfirmModal';

export default function VeresiyeDefteri({ refreshSummary, showToast }) {
  const [customers, setCustomers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('debtors');
  
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [ledgerData, setLedgerData] = useState(null);
  
  const [loadingLedger, setLoadingLedger] = useState(false);

  // Add Debt / Payment Modal
  const [modalType, setModalType] = useState(null);
  const [inputAmount, setInputAmount] = useState('');
  const [inputMethod, setInputMethod] = useState('cash');
  const [inputNote, setInputNote] = useState('');

  // Add New Customer Modal
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newNotes, setNewNotes] = useState('');

  // Delete Confirm Modal
  const [deleteEntryId, setDeleteEntryId] = useState(null);

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    if (selectedCustomerId) {
      fetchCustomerLedger(selectedCustomerId);
    }
  }, [selectedCustomerId]);

  const fetchCustomers = async () => {
    try {
      const res = await fetch('/api/customers');
      const data = await res.json();
      setCustomers(data);
      
      if (!selectedCustomerId && data.length > 0) {
        const debtor = data.find(c => c.total_debt > 0) || data[0];
        setSelectedCustomerId(debtor.id);
      }
    } catch (err) {
      console.error("Müşteriler çekilemedi:", err);
    }
  };

  const fetchCustomerLedger = async (cid) => {
    setLoadingLedger(true);
    try {
      const res = await fetch(`/api/customers/${cid}/ledger`);
      const data = await res.json();
      setLedgerData(data);
    } catch (err) {
      console.error("Defter detayları çekilemedi:", err);
    } finally {
      setLoadingLedger(false);
    }
  };

  const handleAddLedgerEntry = async (e) => {
    e.preventDefault();
    if (!selectedCustomerId || !inputAmount || parseFloat(inputAmount) <= 0) return;

    try {
      const res = await fetch(`/api/customers/${selectedCustomerId}/ledger`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: modalType,
          amount: parseFloat(inputAmount),
          payment_method: inputMethod,
          note: inputNote
        })
      });

      if (res.ok) {
        if (showToast) {
          if (modalType === 'payment') {
            showToast(
              'Ödeme Alındı / Tahsilat Kaydedildi!',
              `Tutar: ${parseFloat(inputAmount).toLocaleString('tr-TR')} ₺`
            );
          } else {
            showToast(
              'Veresiye Borcu Eklendi!',
              `Tutar: ${parseFloat(inputAmount).toLocaleString('tr-TR')} ₺`
            );
          }
        }
        setModalType(null);
        setInputAmount('');
        setInputNote('');
        fetchCustomerLedger(selectedCustomerId);
        fetchCustomers();
        if (refreshSummary) refreshSummary();
      }
    } catch (err) {
      console.error("Kayıt sırasında bir hata oluştu.");
    }
  };

  const confirmDeleteEntry = async () => {
    if (!deleteEntryId) return;

    try {
      const res = await fetch(`/api/customers/ledger/${deleteEntryId}`, { method: 'DELETE' });
      if (res.ok) {
        setDeleteEntryId(null);
        fetchCustomerLedger(selectedCustomerId);
        fetchCustomers();
        if (refreshSummary) refreshSummary();
      }
    } catch (err) {
      console.error("Silinemedi.");
    }
  };

  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    if (!newName) return;

    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, phone: newPhone, notes: newNotes })
      });
      const data = await res.json();
      if (res.ok) {
        setShowAddCustomer(false);
        setNewName('');
        setNewPhone('');
        setNewNotes('');
        await fetchCustomers();
        setSelectedCustomerId(data.id);
      }
    } catch (err) {
      console.error("Müşteri oluşturulamadı.");
    }
  };

  const sendWhatsAppReminder = () => {
    if (!ledgerData?.customer) return;
    const cust = ledgerData.customer;
    if (!cust.phone) {
      alert("Müşterinin kayıtlı telefon numarası bulunmamaktadır!");
      return;
    }

    const cleanPhone = cust.phone.replace(/[^0-9]/g, '');
    const phoneWithCountry = cleanPhone.startsWith('90') ? cleanPhone : `90${cleanPhone.replace(/^0/, '')}`;
    
    const text = encodeURIComponent(
      `Sayın ${cust.name},\nSaloon Brothers salonumuzda güncel veresiye bakiyeniz ${cust.total_debt.toLocaleString('tr-TR')} ₺ olarak görünmektedir.\nMüsait bir zamanda ödeme yapmanızı rica ederiz.\nİyi günler dileriz! ✂️💈`
    );

    window.open(`https://wa.me/${phoneWithCountry}?text=${text}`, '_blank');
  };

  const filteredCustomers = customers.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        (c.phone && c.phone.includes(searchQuery));
    if (filterType === 'debtors') return matchSearch && c.total_debt > 0;
    if (filterType === 'paid') return matchSearch && c.total_debt <= 0;
    return matchSearch;
  });

  const totalReceivable = customers.reduce((sum, c) => sum + Math.max(0, c.total_debt), 0);
  const totalDebtorsCount = customers.filter(c => c.total_debt > 0).length;

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-4 py-4 space-y-4">
      
      {/* Top Banner KPI Summary Card */}
      <div className="bg-white border-2 border-red-200 rounded-2xl p-5 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-red-700 font-bold uppercase tracking-wider">
              Toplam Veresiye Alacak Defteri
            </div>
            <div className="text-2xl sm:text-3xl font-black text-red-600 font-mono">
              {totalReceivable.toLocaleString('tr-TR')} ₺
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-6">
          <div className="text-right">
            <div className="text-xs text-slate-500 font-medium">Borçlu Müşteri</div>
            <div className="text-lg font-bold text-slate-900">{totalDebtorsCount} Kişi</div>
          </div>

          <button
            onClick={() => setShowAddCustomer(true)}
            className="flex items-center space-x-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition shadow-md shadow-red-600/30"
          >
            <UserPlus className="w-4 h-4" />
            <span>Müşteri Deftere Ekle</span>
          </button>
        </div>
      </div>

      {/* MAIN LAYOUT: Customer List (Left 5 Cols) & Ledger Audit History (Right 7 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* LEFT COLUMN: Customer Search & List */}
        <div className="lg:col-span-5 bg-white border-2 border-red-200 rounded-xl p-4 flex flex-col space-y-3 min-h-[calc(100vh-250px)] shadow-md">
          
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Müşteri adı veya telefon ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          <div className="flex space-x-1 border-b border-slate-200 pb-2">
            <button
              onClick={() => setFilterType('debtors')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition ${
                filterType === 'debtors' ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-red-50 border border-slate-200'
              }`}
            >
              Borçlular ({customers.filter(c => c.total_debt > 0).length})
            </button>
            <button
              onClick={() => setFilterType('all')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition ${
                filterType === 'all' ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-red-50 border border-slate-200'
              }`}
            >
              Tümü ({customers.length})
            </button>
          </div>

          <div className="overflow-y-auto max-h-[calc(100vh-360px)] space-y-2 pr-1">
            {filteredCustomers.map((cust) => {
              const isSelected = selectedCustomerId === cust.id;
              return (
                <div
                  key={cust.id}
                  onClick={() => setSelectedCustomerId(cust.id)}
                  className={`p-3 rounded-xl border-2 transition cursor-pointer flex items-center justify-between ${
                    isSelected 
                      ? 'bg-red-50 border-red-500 shadow-md ring-1 ring-red-500/30' 
                      : 'bg-white border-slate-200 hover:border-red-200 hover:bg-red-50/40'
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                      <User className={`w-3.5 h-3.5 ${isSelected ? 'text-red-600' : 'text-slate-400'}`} />
                      {cust.name}
                    </div>
                    {cust.phone && (
                      <div className="text-xs text-slate-500 flex items-center gap-1 font-mono">
                        <Phone className="w-3 h-3 text-slate-400" />
                        {cust.phone}
                      </div>
                    )}
                  </div>

                  <div className="text-right">
                    <div className={`text-sm font-black font-mono ${cust.total_debt > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                      {cust.total_debt.toLocaleString('tr-TR')} ₺
                    </div>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                      cust.total_debt > 0 ? 'bg-red-100 text-red-800 border-red-200' : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                    }`}>
                      {cust.total_debt > 0 ? 'Borçlu' : 'Bakiyesiz'}
                    </span>
                  </div>
                </div>
              );
            })}

            {filteredCustomers.length === 0 && (
              <div className="py-12 text-center text-slate-500 text-xs">
                Müşteri bulunamadı.
              </div>
            )}
          </div>

        </div>

        {/* RIGHT COLUMN: Customer Veresiye Audit Ledger Details */}
        <div className="lg:col-span-7 bg-white border-2 border-red-200 rounded-xl p-4 flex flex-col justify-between shadow-xl min-h-[calc(100vh-250px)]">
          
          {ledgerData?.customer ? (
            <div className="space-y-4">
              
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="text-xl font-black text-slate-900">{ledgerData.customer.name}</h2>
                    {ledgerData.customer.phone && (
                      <span className="text-xs text-slate-700 bg-white px-2 py-0.5 rounded font-mono border border-slate-300">
                        {ledgerData.customer.phone}
                      </span>
                    )}
                  </div>
                  {ledgerData.customer.notes && (
                    <p className="text-xs text-slate-600 mt-1">Not: {ledgerData.customer.notes}</p>
                  )}
                </div>

                <div className="flex items-center space-x-3">
                  <div className="text-right pr-2">
                    <div className="text-xs text-slate-500 font-semibold">Aktif Bakiyeli Borç</div>
                    <div className={`text-xl font-black font-mono ${ledgerData.customer.total_debt > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                      {ledgerData.customer.total_debt.toLocaleString('tr-TR')} ₺
                    </div>
                  </div>

                  {ledgerData.customer.total_debt > 0 && ledgerData.customer.phone && (
                    <button
                      onClick={sendWhatsAppReminder}
                      className="p-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl font-bold text-xs flex items-center gap-1.5 transition shadow-sm"
                      title="WhatsApp Hatırlatması Gönder"
                    >
                      <MessageCircle className="w-4 h-4 text-emerald-600" />
                      <span className="hidden sm:inline">WhatsApp Hatırlat</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setModalType('debt')}
                  className="flex items-center justify-center space-x-2 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-lg shadow-red-600/30 transition active:scale-95 text-sm"
                >
                  <ArrowUpRight className="w-5 h-5" />
                  <span>YENİ BORÇ EKLE (🔴)</span>
                </button>

                <button
                  onClick={() => setModalType('payment')}
                  className="flex items-center justify-center space-x-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/30 transition active:scale-95 text-sm"
                >
                  <ArrowDownLeft className="w-5 h-5" />
                  <span>TAHSİLAT AL / ÖDEME (🟢)</span>
                </button>
              </div>

              {/* Ledger Transactions Table */}
              <div className="space-y-2">
                <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                  Veresiye Hareket Geçmişi ({ledgerData.ledger.length} İşlem)
                </h3>

                <div className="overflow-y-auto max-h-[350px] space-y-2 pr-1">
                  {ledgerData.ledger.map((entry) => {
                    const isDebt = entry.type === 'debt';
                    return (
                      <div
                        key={entry.id}
                        className={`p-3 rounded-xl border flex items-center justify-between text-xs transition ${
                          isDebt 
                            ? 'bg-red-50/60 border-red-200' 
                            : 'bg-emerald-50/60 border-emerald-200'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${
                            isDebt ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                          }`}>
                            {isDebt ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownLeft className="w-4 h-4" />}
                          </div>

                          <div>
                            <div className="font-bold text-slate-900 text-sm">
                              {isDebt ? 'Borç Yazıldı' : `Tahsilat (${entry.payment_method === 'iban' ? 'IBAN' : 'Nakit'})`}
                            </div>
                            <div className="text-slate-500 text-[11px]">
                              {entry.note || 'Açıklama girilmedi'} • {new Date(entry.created_at).toLocaleString('tr-TR')}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-3">
                          <div className={`text-base font-black font-mono ${isDebt ? 'text-red-600' : 'text-emerald-600'}`}>
                            {isDebt ? '+' : '-'}{entry.amount.toLocaleString('tr-TR')} ₺
                          </div>
                          <button
                            onClick={() => setDeleteEntryId(entry.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 rounded hover:bg-red-100 transition"
                            title="İşlemi Sil"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {ledgerData.ledger.length === 0 && (
                    <div className="py-12 text-center text-slate-500 text-xs border border-dashed border-red-200 rounded-xl">
                      Bu müşteriye ait henüz veresiye hareketi bulunmuyor.
                    </div>
                  )}
                </div>
              </div>

            </div>
          ) : (
            <div className="flex flex-col items-center justify-center my-auto py-20 text-slate-500 space-y-2">
              <BookOpen className="w-12 h-12 text-red-400" />
              <p className="font-semibold text-sm text-slate-700">Defterini görmek istediğiniz müşteriyi sol listeden seçiniz.</p>
            </div>
          )}

        </div>

      </div>

      {/* MODAL 1: Add Debt / Receive Payment Modal */}
      {modalType && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border-2 border-red-500 rounded-xl p-5 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <h3 className={`font-bold text-slate-900 flex items-center gap-2 ${modalType === 'debt' ? 'text-red-600' : 'text-emerald-600'}`}>
                {modalType === 'debt' ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownLeft className="w-5 h-5" />}
                {modalType === 'debt' ? 'Borç Kaydı Ekle' : 'Tahsilat Al'}
              </h3>
              <button onClick={() => setModalType(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddLedgerEntry} className="space-y-3">
              <div>
                <label className="text-xs text-slate-700 font-bold block mb-1">Miktar (₺)</label>
                <input
                  type="number"
                  required
                  min="1"
                  step="any"
                  placeholder="150"
                  value={inputAmount}
                  onChange={(e) => setInputAmount(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-base font-mono font-bold text-red-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              {modalType === 'payment' && (
                <div>
                  <label className="text-xs text-slate-700 font-bold block mb-1">Ödeme Yöntemi</label>
                  <select
                    value={inputMethod}
                    onChange={(e) => setInputMethod(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="cash">💵 Nakit</option>
                    <option value="iban">🏦 IBAN / Havale</option>
                  </select>
                </div>
              )}

              <div>
                <label className="text-xs text-slate-700 font-bold block mb-1">Açıklama / Not</label>
                <input
                  type="text"
                  placeholder={modalType === 'debt' ? 'Ör: Ek fön veresiyesi' : 'Ör: Elden kısmi ödeme'}
                  value={inputNote}
                  onChange={(e) => setInputNote(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <button
                type="submit"
                className={`w-full py-3 font-bold rounded-lg transition text-white shadow-md ${
                  modalType === 'debt' ? 'bg-red-600 hover:bg-red-700 shadow-red-600/30' : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30'
                }`}
              >
                {modalType === 'debt' ? 'Borcu Deftere Yaz' : 'Tahsilatı Kaydet'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Add Customer Modal */}
      {showAddCustomer && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border-2 border-red-500 rounded-xl p-5 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-red-600" />
                Müşteri Kaydet
              </h3>
              <button onClick={() => setShowAddCustomer(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="space-y-3">
              <div>
                <label className="text-xs text-slate-700 font-bold block mb-1">Müşteri Ad Soyad</label>
                <input
                  type="text"
                  required
                  placeholder="Ör: Selim Arslan"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-700 font-bold block mb-1">Telefon Numarası</label>
                <input
                  type="text"
                  placeholder="0530 000 0000"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-sm text-slate-900 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-700 font-bold block mb-1">Müşteri Notu</label>
                <input
                  type="text"
                  placeholder="Ör: Ay sonu maaşını alınca ödüyor"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition shadow-md shadow-red-600/30"
              >
                Müşteriyi Kaydet
              </button>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      <ConfirmModal 
        isOpen={Boolean(deleteEntryId)}
        title="Veresiye Kaydı Silme Onayı"
        message="Bu veresiye defter kaydını silmek istediğinize emin misiniz?"
        confirmText="Evet, Kaydı Sil"
        cancelText="Vazgeç"
        onConfirm={confirmDeleteEntry}
        onClose={() => setDeleteEntryId(null)}
      />

    </div>
  );
}
