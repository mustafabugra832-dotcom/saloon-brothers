import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Search, Phone, Edit3, Trash2, X, BookOpen, MessageCircle } from 'lucide-react';

export default function CustomersManagement({ onSelectCustomerForVeresiye }) {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const res = await fetch('/api/customers');
      const data = await res.json();
      setCustomers(data);
    } catch (err) {
      console.error(err);
    }
  };

  const openAddModal = () => {
    setEditingCustomer(null);
    setName('');
    setPhone('');
    setNotes('');
    setShowModal(true);
  };

  const openEditModal = (c) => {
    setEditingCustomer(c);
    setName(c.name);
    setPhone(c.phone || '');
    setNotes(c.notes || '');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name) return;

    try {
      const url = editingCustomer ? `/api/customers/${editingCustomer.id}` : '/api/customers';
      const method = editingCustomer ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, notes })
      });

      if (res.ok) {
        setShowModal(false);
        fetchCustomers();
      }
    } catch (err) {
      alert("Müşteri kaydedilemedi.");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Bu müşteriyi silmek istediğinize emin misiniz?")) return;
    try {
      const res = await fetch(`/api/customers/${id}`, { method: 'DELETE' });
      if (res.ok) fetchCustomers();
    } catch (err) {
      alert("Müşteri silinemedi.");
    }
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.phone && c.phone.includes(search))
  );

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-4 py-4 space-y-4">
      
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white border-2 border-red-200 p-4 rounded-xl shadow-md">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Müşteri Rehberi & Veresiye Takibi</h2>
            <p className="text-xs text-slate-600">Kayıtlı müşterileri inceleyin, telefon ve özel notlarını güncelleyin.</p>
          </div>
        </div>

        <button
          onClick={openAddModal}
          className="flex items-center space-x-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition shadow-md shadow-red-600/30"
        >
          <UserPlus className="w-4 h-4" />
          <span>Yeni Müşteri Kaydet</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white border-2 border-red-200 p-3 rounded-xl relative shadow-sm">
        <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
        <input
          type="text"
          placeholder="Müşteri adı veya telefon numarası ara..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
        />
      </div>

      {/* Customers Table */}
      <div className="bg-white border-2 border-red-200 rounded-xl overflow-hidden shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-red-600 text-white uppercase text-[10px] font-bold border-b border-red-700">
              <tr>
                <th className="py-3 px-4">Müşteri Ad Soyad</th>
                <th className="py-3 px-4">Telefon</th>
                <th className="py-3 px-4">Özel Notlar</th>
                <th className="py-3 px-4 text-right">Veresiye Borcu</th>
                <th className="py-3 px-4 text-center">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-red-100 font-medium bg-white">
              {filteredCustomers.map((c) => (
                <tr key={c.id} className="hover:bg-red-50/60 transition-colors">
                  <td className="py-3 px-4 font-bold text-slate-900">{c.name}</td>
                  <td className="py-3 px-4 font-mono text-slate-700">{c.phone || '-'}</td>
                  <td className="py-3 px-4 text-slate-600">{c.notes || '-'}</td>
                  <td className="py-3 px-4 text-right font-bold font-mono text-sm">
                    <span className={c.total_debt > 0 ? 'text-red-600' : 'text-emerald-600'}>
                      {c.total_debt.toLocaleString('tr-TR')} ₺
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center space-x-1">
                    <button
                      onClick={() => openEditModal(c)}
                      className="p-1.5 text-slate-500 hover:text-red-600 rounded hover:bg-red-50 transition"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(c.id)}
                      className="p-1.5 text-slate-500 hover:text-red-600 rounded hover:bg-red-50 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}

              {filteredCustomers.length === 0 && (
                <tr>
                  <td colSpan="5" className="py-10 text-center text-slate-500 text-xs">
                    Müşteri bulunamadı.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border-2 border-red-500 rounded-xl p-5 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <h3 className="font-bold text-slate-900 text-sm">
                {editingCustomer ? 'Müşteri Bilgilerini Düzenle' : 'Yeni Müşteri Ekle'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="text-xs text-slate-700 font-bold block mb-1">Müşteri Adı Soyadı</label>
                <input
                  type="text"
                  required
                  placeholder="Ör: Ömer Can"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-700 font-bold block mb-1">Telefon Numarası</label>
                <input
                  type="text"
                  placeholder="0532 123 4567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs text-slate-900 font-mono focus:bg-white focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-700 font-bold block mb-1">Özel Notlar</label>
                <input
                  type="text"
                  placeholder="Tercih ettiği kesim stili veya notlar..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-red-500"
                />
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

    </div>
  );
}
