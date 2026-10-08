import React, { useState, useEffect } from 'react';
import { DollarSign, Plus, Trash2, Calendar, Tag, X } from 'lucide-react';

export default function ExpensesManagement({ refreshSummary }) {
  const [expenses, setExpenses] = useState([]);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Kira / Faturalar');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    try {
      const res = await fetch('/api/expenses');
      const data = await res.json();
      setExpenses(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    if (!title || !amount || parseFloat(amount) <= 0) return;

    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          category,
          amount: parseFloat(amount),
          note
        })
      });

      if (res.ok) {
        setTitle('');
        setAmount('');
        setNote('');
        setShowModal(false);
        fetchExpenses();
        if (refreshSummary) refreshSummary();
      }
    } catch (err) {
      alert("Gider eklenemedi.");
    }
  };

  const handleDeleteExpense = async (id) => {
    if (!window.confirm("Bu gider kaydını silmek istediğinize emin misiniz?")) return;

    try {
      const res = await fetch(`/api/expenses/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchExpenses();
        if (refreshSummary) refreshSummary();
      }
    } catch (err) {
      alert("Silinemedi.");
    }
  };

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-4 py-4 space-y-4">
      
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white border-2 border-red-200 p-4 rounded-xl shadow-md">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Salon Gider Takibi</h2>
            <p className="text-xs text-slate-600">Kira, fatura, malzeme alımları ve günlük dükkan giderlerini kaydedin.</p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="text-right">
            <span className="text-xs text-slate-500 font-medium">Toplam Kayıtlı Gider:</span>
            <div className="text-xl font-black text-red-600 font-mono">
              {totalExpenses.toLocaleString('tr-TR')} ₺
            </div>
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="flex items-center space-x-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition shadow-md shadow-red-600/30"
          >
            <Plus className="w-4 h-4" />
            <span>Gider Ekle</span>
          </button>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-white border-2 border-red-200 rounded-xl overflow-hidden shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-red-600 text-white uppercase text-[10px] font-bold border-b border-red-700">
              <tr>
                <th className="py-3 px-4">Tarih</th>
                <th className="py-3 px-4">Gider Başlığı</th>
                <th className="py-3 px-4">Kategori</th>
                <th className="py-3 px-4">Not / Açıklama</th>
                <th className="py-3 px-4 text-right">Tutar</th>
                <th className="py-3 px-4 text-center">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-red-100 font-medium bg-white">
              {expenses.map((exp) => (
                <tr key={exp.id} className="hover:bg-red-50/60 transition-colors">
                  <td className="py-3 px-4 font-mono text-slate-600">
                    {new Date(exp.created_at).toLocaleDateString('tr-TR')}
                  </td>
                  <td className="py-3 px-4 font-bold text-slate-900">{exp.title}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
                      {exp.category}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-600">{exp.note || '-'}</td>
                  <td className="py-3 px-4 text-right font-bold text-red-600 font-mono text-sm">
                    -{exp.amount.toLocaleString('tr-TR')} ₺
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => handleDeleteExpense(exp.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded hover:bg-red-50 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}

              {expenses.length === 0 && (
                <tr>
                  <td colSpan="6" className="py-10 text-center text-slate-500 text-xs">
                    Henüz kayıtlı gider bulunmuyor.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border-2 border-red-500 rounded-xl p-5 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <h3 className="font-bold text-slate-900 text-sm">Yeni Gider Kaydı</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddExpense} className="space-y-3">
              <div>
                <label className="text-xs text-slate-700 font-bold block mb-1">Gider Başlığı</label>
                <input
                  type="text"
                  required
                  placeholder="Ör: Dükkan Kirası veya Malzeme Alımı"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-700 font-bold block mb-1">Kategori</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-red-500"
                >
                  <option value="Kira / Faturalar">🏢 Kira / Faturalar</option>
                  <option value="Malzeme / Kozmetik">💈 Malzeme & Şampuan</option>
                  <option value="Personel / Yemek">☕ Çay / Kahve / Yemek</option>
                  <option value="Temizlik / Bakım">🧹 Temizlik & Bakım</option>
                  <option value="Diğer">📦 Diğer Giderler</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-700 font-bold block mb-1">Tutar (₺)</label>
                <input
                  type="number"
                  required
                  min="1"
                  step="any"
                  placeholder="500"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-mono text-red-600 font-bold focus:bg-white focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-700 font-bold block mb-1">Açıklama</label>
                <input
                  type="text"
                  placeholder="Detay veya fatura no..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-red-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg text-xs transition shadow-md shadow-red-600/30"
              >
                Gideri Kaydet
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
