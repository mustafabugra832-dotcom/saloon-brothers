import React, { useState, useEffect } from 'react';
import { 
  Wallet, 
  Plus, 
  Search, 
  User, 
  Phone, 
  FileText, 
  Trash2, 
  Edit, 
  ArrowUpRight, 
  ArrowDownLeft, 
  DollarSign, 
  Calendar,
  CheckCircle2,
  AlertCircle,
  X,
  CreditCard,
  Banknote,
  Landmark,
  UserPlus
} from 'lucide-react';
import ConfirmModal from './ConfirmModal';

export default function MyDebtsManagement({ refreshSummary, showToast }) {
  const [creditors, setCreditors] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCreditorId, setSelectedCreditorId] = useState(null);
  const [ledgerData, setLedgerData] = useState(null);
  const [loadingLedger, setLoadingLedger] = useState(false);

  // New Creditor Person Modal State
  const [showAddPersonModal, setShowAddPersonModal] = useState(false);
  const [newPersonName, setNewPersonName] = useState('');
  const [newPersonPhone, setNewPersonPhone] = useState('');
  const [newPersonNotes, setNewPersonNotes] = useState('');
  const [initialDebt, setInitialDebt] = useState('');

  // Transaction Modal State (Borç Ekleme veya Ödeme Yapma)
  const [transactionModalType, setTransactionModalType] = useState(null); // 'debt' or 'payment'
  const [transAmount, setTransAmount] = useState('');
  const [transPaymentMethod, setTransPaymentMethod] = useState('cash');
  const [transNote, setTransNote] = useState('');

  // Delete Confirm Modal State
  const [deletePersonId, setDeletePersonId] = useState(null);
  const [deleteEntryId, setDeleteEntryId] = useState(null);

  useEffect(() => {
    fetchCreditors();
  }, []);

  useEffect(() => {
    if (selectedCreditorId) {
      fetchCreditorLedger(selectedCreditorId);
    }
  }, [selectedCreditorId]);

  const fetchCreditors = async () => {
    try {
      const res = await fetch('/api/my-debts');
      const data = await res.json();
      setCreditors(data);

      if (!selectedCreditorId && data.length > 0) {
        // Select first person by default
        const topPerson = data.find(c => c.total_debt > 0) || data[0];
        setSelectedCreditorId(topPerson.id);
      }
    } catch (err) {
      console.error("Kendi borçlarım listesi alınamadı:", err);
    }
  };

  const fetchCreditorLedger = async (cid) => {
    setLoadingLedger(true);
    try {
      const res = await fetch(`/api/my-debts/${cid}/ledger`);
      const data = await res.json();
      setLedgerData(data);
    } catch (err) {
      console.error("Borç defteri çekilemedi:", err);
    } finally {
      setLoadingLedger(false);
    }
  };

  const handleCreatePerson = async (e) => {
    e.preventDefault();
    if (!newPersonName.trim()) return;

    try {
      const res = await fetch('/api/my-debts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newPersonName.trim(),
          phone: newPersonPhone.trim(),
          notes: newPersonNotes.trim(),
          initial_debt: parseFloat(initialDebt || 0)
        })
      });

      const newRecord = await res.json();
      if (res.ok) {
        setShowAddPersonModal(false);
        setNewPersonName('');
        setNewPersonPhone('');
        setNewPersonNotes('');
        setInitialDebt('');
        await fetchCreditors();
        setSelectedCreditorId(newRecord.id);
        if (refreshSummary) refreshSummary();
      }
    } catch (err) {
      console.error("Kişi eklenemedi:", err);
    }
  };

  const handleAddLedgerEntry = async (e) => {
    e.preventDefault();
    if (!selectedCreditorId || !transAmount || parseFloat(transAmount) <= 0) return;

    try {
      const res = await fetch(`/api/my-debts/${selectedCreditorId}/ledger`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: transactionModalType,
          amount: parseFloat(transAmount),
          payment_method: transPaymentMethod,
          note: transNote.trim()
        })
      });

      if (res.ok) {
        if (showToast) {
          if (transactionModalType === 'payment') {
            showToast(
              'Ödeme Yapıldı!',
              `Tutar: ${parseFloat(transAmount).toLocaleString('tr-TR')} ₺`
            );
          } else {
            showToast(
              'Borç Eklendi!',
              `Tutar: ${parseFloat(transAmount).toLocaleString('tr-TR')} ₺`
            );
          }
        }
        setTransactionModalType(null);
        setTransAmount('');
        setTransNote('');
        fetchCreditorLedger(selectedCreditorId);
        fetchCreditors();
        if (refreshSummary) refreshSummary();
      }
    } catch (err) {
      console.error("İşlem kaydedilemedi:", err);
    }
  };

  const confirmDeletePerson = async () => {
    if (!deletePersonId) return;

    try {
      const res = await fetch(`/api/my-debts/${deletePersonId}`, { method: 'DELETE' });
      if (res.ok) {
        setDeletePersonId(null);
        setSelectedCreditorId(null);
        setLedgerData(null);
        fetchCreditors();
        if (refreshSummary) refreshSummary();
      }
    } catch (err) {
      console.error("Kişi silinemedi.");
    }
  };

  const confirmDeleteEntry = async () => {
    if (!deleteEntryId) return;

    try {
      const res = await fetch(`/api/my-debts/ledger/${deleteEntryId}`, { method: 'DELETE' });
      if (res.ok) {
        setDeleteEntryId(null);
        fetchCreditorLedger(selectedCreditorId);
        fetchCreditors();
        if (refreshSummary) refreshSummary();
      }
    } catch (err) {
      console.error("İşlem kaydı silinemedi.");
    }
  };

  const filteredCreditors = creditors.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (c.phone && c.phone.includes(searchQuery))
  );

  const totalMyDebtsSum = creditors.reduce((sum, c) => sum + (c.total_debt || 0), 0);

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-4 py-4 space-y-4">
      
      {/* KPI Header Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        <div className="bg-white border-2 border-red-200 rounded-2xl p-4 shadow-lg flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Kendi Toplam Borcum</span>
            <span className="text-2xl font-black text-red-600 font-mono">
              {totalMyDebtsSum.toLocaleString('tr-TR')} ₺
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center font-bold border border-red-200">
            <Wallet className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border-2 border-red-200 rounded-2xl p-4 shadow-lg flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Borçlu Olunan Kişi Sayısı</span>
            <span className="text-2xl font-black text-red-600 font-mono">
              {creditors.length} Kişi
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center font-bold border border-red-200">
            <User className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border-2 border-red-200 rounded-2xl p-4 shadow-lg flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Aktif Seçili Kişi</span>
            <span className="text-lg font-bold text-slate-900 truncate block">
              {ledgerData?.creditor?.name || 'Seçilmedi'}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold border border-blue-200">
            <UserPlus className="w-5 h-5" />
          </div>
        </div>

      </div>

      {/* Main Content Layout (4 Cols Creditors List / 8 Cols Ledger Detail) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* LEFT COLUMN: Persons/Creditors List (4 Cols) */}
        <div className="lg:col-span-4 bg-white border-2 border-red-200 rounded-2xl p-4 space-y-4 shadow-xl flex flex-col justify-between">
          
          <div className="space-y-3">
            {/* Header & Add Button */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Wallet className="w-4 h-4 text-red-600" />
                Borçlu Olduğum Kişiler
              </h3>
              
              <button
                onClick={() => setShowAddPersonModal(true)}
                className="flex items-center space-x-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition shadow-md shadow-red-600/30 active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Kişi Ekle</span>
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Kişi ara (ör: Babam, Ahmet Toptancı)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            {/* Creditors List */}
            <div className="overflow-y-auto max-h-[calc(100vh-320px)] space-y-2 pr-1">
              {filteredCreditors.map((person) => {
                const isSelected = selectedCreditorId === person.id;
                return (
                  <button
                    key={person.id}
                    onClick={() => setSelectedCreditorId(person.id)}
                    className={`w-full p-3 rounded-xl border-2 text-left transition-all duration-150 flex items-center justify-between ${
                      isSelected 
                        ? 'bg-red-50 border-red-500 text-slate-900 ring-1 ring-red-500/30 shadow-md' 
                        : 'bg-white border-slate-200 text-slate-700 hover:border-red-200 hover:bg-red-50/40'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                        <User className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-red-600' : 'text-slate-400'}`} />
                        <span>{person.name}</span>
                      </div>
                      {person.phone && (
                        <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{person.phone}</span>
                        </div>
                      )}
                    </div>

                    <div className="text-right font-mono">
                      <span className="text-[10px] text-slate-500 block">Kalan Borç</span>
                      <span className={`text-sm font-extrabold ${person.total_debt > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                        {person.total_debt.toLocaleString('tr-TR')} ₺
                      </span>
                    </div>
                  </button>
                );
              })}

              {filteredCreditors.length === 0 && (
                <div className="py-12 text-center text-slate-500 border border-dashed border-red-200 rounded-xl">
                  Henüz borçlu olduğunuz kişi eklenmemiş.
                </div>
              )}
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Ledger Detail & Payments for Selected Creditor (8 Cols) */}
        <div className="lg:col-span-8 bg-white border-2 border-red-200 rounded-2xl p-4 sm:p-5 space-y-5 shadow-xl min-h-[calc(100vh-180px)] flex flex-col justify-between">
          
          {ledgerData && ledgerData.creditor ? (
            <div className="space-y-5">
              
              {/* Selected Creditor Header & Action Buttons */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
                
                <div>
                  <span className="text-[11px] font-bold text-red-600 uppercase tracking-widest block">SEÇİLİ ALACAKLI KİŞİ</span>
                  <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                    <User className="w-5 h-5 text-red-600" />
                    {ledgerData.creditor.name}
                  </h2>
                  {ledgerData.creditor.notes && (
                    <p className="text-xs text-slate-600 mt-1 italic">"{ledgerData.creditor.notes}"</p>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <div className="bg-red-50 px-4 py-2 rounded-xl border border-red-200 text-right">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">KALAN BORÇ</span>
                    <span className="text-xl font-black text-red-600 font-mono">
                      {ledgerData.creditor.total_debt.toLocaleString('tr-TR')} ₺
                    </span>
                  </div>

                  <button
                    onClick={() => setDeletePersonId(ledgerData.creditor.id)}
                    className="p-2.5 bg-slate-100 hover:bg-red-50 text-slate-500 hover:text-red-600 rounded-xl border border-slate-300 transition"
                    title="Kişiyi Sil"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

              </div>

              {/* ACTION BUTTONS: Add Debt vs Make Payment */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                
                <button
                  onClick={() => {
                    setTransactionModalType('debt');
                    setTransAmount('');
                    setTransNote('');
                  }}
                  className="flex items-center justify-center space-x-2 py-3 bg-red-600 hover:bg-red-700 text-white font-extrabold rounded-xl shadow-lg shadow-red-600/30 transition active:scale-95 text-sm"
                >
                  <ArrowUpRight className="w-4 h-4" />
                  <span>➕ YENİ BORÇ EKLE (Borçlandım)</span>
                </button>

                <button
                  onClick={() => {
                    setTransactionModalType('payment');
                    setTransAmount('');
                    setTransNote('');
                  }}
                  className="flex items-center justify-center space-x-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl shadow-lg shadow-emerald-600/30 transition active:scale-95 text-sm"
                >
                  <ArrowDownLeft className="w-4 h-4" />
                  <span>💳 ÖDEME YAP (Kısmi / Tam Ödeme)</span>
                </button>

              </div>

              {/* LEDGER TRANSACTION HISTORY TABLE */}
              <div className="space-y-3">
                <h3 className="font-bold text-slate-900 text-sm flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-red-600" />
                    Borç & Ödeme Hesap Geçmişi
                  </span>
                  <span className="text-xs text-slate-500 font-normal">
                    Toplam {ledgerData.ledger ? ledgerData.ledger.length : 0} İşlem
                  </span>
                </h3>

                <div className="overflow-x-auto max-h-[400px] border border-red-200 rounded-xl bg-white">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-red-600 text-white uppercase text-[10px] font-bold border-b border-red-700 sticky top-0">
                      <tr>
                        <th className="py-2.5 px-3">Tarih</th>
                        <th className="py-2.5 px-3">İşlem Türü</th>
                        <th className="py-2.5 px-3">Ödeme Yöntemi</th>
                        <th className="py-2.5 px-3">Açıklama / Not</th>
                        <th className="py-2.5 px-3 text-right">Tutar</th>
                        <th className="py-2.5 px-3 text-center">Sil</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-red-100 font-medium bg-white">
                      {ledgerData.ledger && ledgerData.ledger.length > 0 ? (
                        ledgerData.ledger.map((entry) => {
                          const isDebt = entry.type === 'debt';
                          return (
                            <tr key={entry.id} className="hover:bg-red-50/60 transition-colors">
                              <td className="py-2.5 px-3 font-mono text-slate-500">
                                {new Date(entry.created_at).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </td>
                              <td className="py-2.5 px-3">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                  isDebt ? 'bg-red-100 text-red-800 border border-red-200' : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                }`}>
                                  {isDebt ? 'Borç Alındı' : 'Ödeme Yapıldı'}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-slate-600 font-mono">
                                {entry.payment_method === 'cash' ? 'Nakit' :
                                 entry.payment_method === 'iban' ? 'IBAN / Havale' :
                                 entry.payment_method === 'other' ? 'Diğer' : '-'}
                              </td>
                              <td className="py-2.5 px-3 text-slate-900">
                                {entry.note || '-'}
                              </td>
                              <td className={`py-2.5 px-3 text-right font-bold font-mono text-sm ${
                                isDebt ? 'text-red-600' : 'text-emerald-600'
                              }`}>
                                {isDebt ? `+${entry.amount.toLocaleString('tr-TR')} ₺` : `-${entry.amount.toLocaleString('tr-TR')} ₺`}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <button
                                  onClick={() => setDeleteEntryId(entry.id)}
                                  className="p-1 text-slate-400 hover:text-red-600 rounded transition"
                                  title="Kaydı Sil"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan="6" className="py-12 text-center text-slate-500 text-xs">
                            Bu kişi için henüz kaydedilmiş borç veya ödeme hareketi bulunmuyor.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          ) : (
            <div className="py-24 text-center text-slate-500 space-y-2">
              <Wallet className="w-12 h-12 text-red-400 mx-auto" />
              <p className="font-semibold text-sm text-slate-700">Lütfen sol taraftan bir borçlu olduğunuz kişiyi seçiniz veya yeni kişi ekleyiniz.</p>
            </div>
          )}

        </div>

      </div>

      {/* MODAL 1: ADD NEW CREDITOR PERSON */}
      {showAddPersonModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border-2 border-red-500 rounded-2xl p-5 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <h3 className="font-bold text-slate-900 flex items-center gap-2 text-base">
                <UserPlus className="w-5 h-5 text-red-600" />
                Borçlu Olduğum Kişiyi Ekle
              </h3>
              <button onClick={() => setShowAddPersonModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePerson} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Kişi / Kurum Adı <span className="text-red-600">* (ör: Babam, Ahmet Toptancı)</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ör: Babam veya Akif Toptancı"
                  value={newPersonName}
                  onChange={(e) => setNewPersonName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Telefon Numarası (Opsiyonel)
                </label>
                <input
                  type="text"
                  placeholder="0532 000 0000"
                  value={newPersonPhone}
                  onChange={(e) => setNewPersonPhone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-sm font-mono text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  İlk Borç Tutarı (₺) (Varsa)
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="0"
                  value={initialDebt}
                  onChange={(e) => setInitialDebt(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-sm font-mono font-bold text-red-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Not / Açıklama (Opsiyonel)
                </label>
                <textarea
                  rows="2"
                  placeholder="Ör: Araba taksiti için alınan borç..."
                  value={newPersonNotes}
                  onChange={(e) => setNewPersonNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-extrabold rounded-xl transition shadow-lg shadow-red-600/30 text-sm mt-2"
              >
                KİŞİYİ KAYDET
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD DEBT OR MAKE PAYMENT MODAL */}
      {transactionModalType && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border-2 border-red-500 rounded-2xl p-5 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <h3 className={`font-bold text-base flex items-center gap-2 ${
                transactionModalType === 'debt' ? 'text-red-600' : 'text-emerald-600'
              }`}>
                {transactionModalType === 'debt' ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownLeft className="w-5 h-5" />}
                {transactionModalType === 'debt' ? 'Yeni Borç Ekle (Borçlandım)' : 'Ödeme Yap (Kısmi / Tam Ödeme)'}
              </h3>
              <button onClick={() => setTransactionModalType(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddLedgerEntry} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Kişi: <span className="text-slate-900 font-extrabold">{ledgerData?.creditor?.name}</span>
                </label>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  İşlem Tutarı (₺) <span className="text-red-600">* ZORUNLU</span>
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  step="any"
                  placeholder="500"
                  value={transAmount}
                  onChange={(e) => setTransAmount(e.target.value)}
                  className={`w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-base font-mono font-extrabold focus:bg-white focus:outline-none focus:ring-2 ${
                    transactionModalType === 'debt' ? 'text-red-600 focus:ring-red-500' : 'text-emerald-600 focus:ring-emerald-500'
                  }`}
                />
              </div>

              {transactionModalType === 'payment' && (
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Ödeme Yöntemi</label>
                  <select
                    value={transPaymentMethod}
                    onChange={(e) => setTransPaymentMethod(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="cash">Nakit Elden Ödeme</option>
                    <option value="iban">IBAN / Banka Havalesi</option>
                    <option value="other">Diğer</option>
                  </select>
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Açıklama / Detay <span className="text-slate-500">(ör: Babama taksit ödemesi yapıldı)</span>
                </label>
                <input
                  type="text"
                  placeholder={transactionModalType === 'debt' ? 'Ör: Borç alındı' : 'Ör: Kısmi ödeme yapıldı'}
                  value={transNote}
                  onChange={(e) => setTransNote(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <button
                type="submit"
                className={`w-full py-3 font-extrabold rounded-xl transition shadow-lg text-sm mt-2 text-white ${
                  transactionModalType === 'debt' ? 'bg-red-600 hover:bg-red-700 shadow-red-600/30' : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30'
                }`}
              >
                {transactionModalType === 'debt' ? 'BORCU KAYDET' : 'ÖDEMEYİ KAYDET'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE PERSON MODAL */}
      <ConfirmModal 
        isOpen={Boolean(deletePersonId)}
        title="Kişiyi ve Borç Kaydını Sil"
        message="Bu kişiyi ve ona ait tüm borç/ödeme geçmişini silmek istediğinize emin misiniz?"
        confirmText="Evet, Kişiyi Sil"
        cancelText="Vazgeç"
        onConfirm={confirmDeletePerson}
        onClose={() => setDeletePersonId(null)}
      />

      {/* CONFIRM DELETE ENTRY MODAL */}
      <ConfirmModal 
        isOpen={Boolean(deleteEntryId)}
        title="İşlem Kaydını Sil"
        message="Bu borç/ödeme işlem kaydını silmek istediğinize emin misiniz?"
        confirmText="Evet, Kaydı Sil"
        cancelText="Vazgeç"
        onConfirm={confirmDeleteEntry}
        onClose={() => setDeleteEntryId(null)}
      />

    </div>
  );
}
