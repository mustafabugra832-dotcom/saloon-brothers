import React, { useState, useEffect } from 'react';
import { 
  CalendarDays, 
  Clock, 
  UserCheck, 
  Scissors, 
  CheckCircle2, 
  AlertCircle, 
  Save, 
  Trash2, 
  User, 
  Phone, 
  FileText, 
  Sparkles,
  ChevronRight,
  Search
} from 'lucide-react';

const TIME_SLOTS = [
  "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "12:00", "12:30", "13:00", "13:30", "14:00", "14:30",
  "15:00", "15:30", "16:00", "16:30", "17:00", "17:30",
  "18:00", "18:30", "19:00", "19:30", "20:00", "20:30",
  "21:00", "21:30", "22:00", "22:30", "23:00", "23:30", "00:00"
];

export default function AppointmentsManagement({ showToast }) {
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [appointmentsMap, setAppointmentsMap] = useState({});
  const [stats, setStats] = useState({ filled_count: 0, waiting_count: 0, completed_count: 0, total_slots: 31 });
  
  // Local Form Draft State for each time slot
  const [slotDrafts, setSlotDrafts] = useState({});
  const [savingSlot, setSavingSlot] = useState(null);
  const [msgSlot, setMsgSlot] = useState({ slot: null, text: '', type: '' });

  useEffect(() => {
    fetchAppointments(selectedDate);
  }, [selectedDate]);

  const fetchAppointments = async (dateStr) => {
    try {
      const res = await fetch(`/api/appointments?date=${dateStr}`);
      const data = await res.json();
      setAppointmentsMap(data.appointments || {});
      setStats(data.stats || { filled_count: 0, waiting_count: 0, completed_count: 0, total_slots: 31 });

      // Initialize drafts for all slots
      const newDrafts = {};
      TIME_SLOTS.forEach(slot => {
        const existing = (data.appointments && data.appointments[slot]) || {};
        newDrafts[slot] = {
          customer_name: existing.customer_name || '',
          customer_phone: existing.customer_phone || '',
          note: existing.note || '',
          status: existing.status || 'waiting'
        };
      });
      setSlotDrafts(newDrafts);
    } catch (err) {
      console.error("Randevular çekilemedi:", err);
    }
  };

  const handleDraftChange = (slot, field, value) => {
    setSlotDrafts(prev => ({
      ...prev,
      [slot]: {
        ...prev[slot],
        [field]: value
      }
    }));
  };

  const handleSaveSlot = async (slot) => {
    const draft = slotDrafts[slot];
    if (!draft || !draft.customer_name || draft.customer_name.trim() === '') {
      setMsgSlot({ slot, text: 'Müşteri Adı Soyadı girmek ZORUNLUDUR!', type: 'error' });
      setTimeout(() => setMsgSlot({ slot: null, text: '', type: '' }), 3000);
      return;
    }

    setSavingSlot(slot);
    setMsgSlot({ slot: null, text: '', type: '' });

    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: selectedDate,
          time_slot: slot,
          customer_name: draft.customer_name.trim(),
          customer_phone: draft.customer_phone ? draft.customer_phone.trim() : '', // OPTIONAL
          note: draft.note ? draft.note.trim() : '',
          status: draft.status || 'waiting'
        })
      });

      const result = await res.json();
      if (res.ok && result.success) {
        setMsgSlot({ slot, text: 'Kaydedildi', type: 'success' });
        setTimeout(() => setMsgSlot({ slot: null, text: '', type: '' }), 2500);
        fetchAppointments(selectedDate);
      } else {
        setMsgSlot({ slot, text: result.error || 'Hata oluştu', type: 'error' });
      }
    } catch (err) {
      setMsgSlot({ slot, text: 'Bağlantı hatası', type: 'error' });
    } finally {
      setSavingSlot(null);
    }
  };

  const handleFinishSlot = async (slot) => {
    const draft = slotDrafts[slot];
    if (!draft || !draft.customer_name || draft.customer_name.trim() === '') {
      setMsgSlot({ slot, text: 'Önce Müşteri Adı Soyadı girilmelidir!', type: 'error' });
      setTimeout(() => setMsgSlot({ slot: null, text: '', type: '' }), 3000);
      return;
    }

    setSavingSlot(slot);
    setMsgSlot({ slot: null, text: '', type: '' });

    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: selectedDate,
          time_slot: slot,
          customer_name: draft.customer_name.trim(),
          customer_phone: draft.customer_phone ? draft.customer_phone.trim() : '',
          note: draft.note ? draft.note.trim() : '',
          status: 'completed'
        })
      });

      const result = await res.json();
      if (res.ok && result.success) {
        if (showToast) {
          showToast(
            'Tıraş Tamamlandı!',
            `${draft.customer_name} randevusu bitirildi.`
          );
        }
        setMsgSlot({ slot, text: 'Tıraş Bitti!', type: 'success' });
        setTimeout(() => setMsgSlot({ slot: null, text: '', type: '' }), 2500);
        fetchAppointments(selectedDate);
      } else {
        setMsgSlot({ slot, text: result.error || 'Hata oluştu', type: 'error' });
      }
    } catch (err) {
      setMsgSlot({ slot, text: 'Bağlantı hatası', type: 'error' });
    } finally {
      setSavingSlot(null);
    }
  };

  const handleClearSlot = async (slot) => {
    setSavingSlot(slot);
    try {
      const res = await fetch('/api/appointments/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: selectedDate,
          time_slot: slot
        })
      });

      if (res.ok) {
        setSlotDrafts(prev => ({
          ...prev,
          [slot]: {
            customer_name: '',
            customer_phone: '',
            note: '',
            status: 'waiting'
          }
        }));
        fetchAppointments(selectedDate);
      }
    } catch (err) {
      console.error("Randevu silinemedi:", err);
    } finally {
      setSavingSlot(null);
    }
  };

  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' });
  };

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-4 py-4 space-y-5">
      
      {/* Top Main Banner & Header */}
      <div className="bg-white border-2 border-red-200 rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <CalendarDays className="w-6 h-6 text-red-600" />
            <h1 className="font-extrabold text-xl sm:text-2xl text-slate-900">
              Saloon Brothers Günlük Randevu Defteri
            </h1>
          </div>
          <p className="text-xs text-red-700 mt-1 font-semibold">
            Sabah 09:00 - Gece 00:00 Saat Çizelgesi İle Müşterilerinizi Kaydedin
          </p>
        </div>

        {/* Date Selector */}
        <div className="flex items-center space-x-3 bg-red-50 p-2.5 rounded-xl border border-red-200">
          <span className="text-xs font-bold text-slate-700 whitespace-nowrap">Defter Tarihi:</span>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-white border border-red-300 rounded-lg px-3 py-1.5 text-xs text-red-600 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-red-500 cursor-pointer shadow-sm"
          />
        </div>
      </div>

      {/* KPI Summary Cards Grid (3 Cards matching user design) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        {/* Card 1: Dolu Saat Dilimi */}
        <div className="bg-white border-2 border-red-200 rounded-2xl p-4 space-y-2 shadow-lg relative overflow-hidden">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">DOLU SAAT DİLİMİ</span>
          <div className="text-3xl font-black text-red-600 font-mono">
            {stats.filled_count} / {stats.total_slots}
          </div>
          <p className="text-xs text-slate-600">Günün dolu randevu sayısı</p>
        </div>

        {/* Card 2: Bekleyen Müşteriler */}
        <div className="bg-white border-2 border-red-200 rounded-2xl p-4 space-y-2 shadow-lg relative overflow-hidden">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">BEKLEYEN MÜŞTERİLER</span>
          <div className="text-3xl font-black text-blue-600 font-mono">
            {stats.waiting_count}
          </div>
          <p className="text-xs text-slate-600">Gelecek olanlar</p>
        </div>

        {/* Card 3: Tamamlanan Tıraşlar */}
        <div className="bg-white border-2 border-red-200 rounded-2xl p-4 space-y-2 shadow-lg relative overflow-hidden">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">TAMAMLANAN TIRAŞLAR</span>
          <div className="text-3xl font-black text-emerald-600 font-mono">
            {stats.completed_count}
          </div>
          <p className="text-xs text-slate-600">Tıraşı biten randevular</p>
        </div>

      </div>

      {/* Hourly Appointments Table (09:00 to 00:00) */}
      <div className="bg-white border-2 border-red-200 rounded-2xl p-4 shadow-xl space-y-4">
        
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
            <Clock className="w-4 h-4 text-red-600" />
            {formatDateDisplay(selectedDate)} Randevu Saat Çizelgesi
          </h3>
          <span className="text-xs text-slate-500 font-mono">
            31 Saat Dilimi (09:00 - 00:00)
          </span>
        </div>

        {/* Main Table View */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 min-w-[900px]">
            <thead className="bg-red-600 text-white uppercase text-[10px] font-bold border-b border-red-700">
              <tr>
                <th className="py-3 px-3 w-20">Saat</th>
                <th className="py-3 px-3">Müşteri Adı Soyadı <span className="text-red-200">* ZORUNLU</span></th>
                <th className="py-3 px-3">Telefon Numarası <span className="text-red-200">(Opsiyonel)</span></th>
                <th className="py-3 px-3">Not / Hizmet</th>
                <th className="py-3 px-3 text-center w-52">İşlemler & Aksiyon</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-red-100 font-medium bg-white">
              {TIME_SLOTS.map((slot) => {
                const draft = slotDrafts[slot] || { customer_name: '', customer_phone: '', note: '', status: 'waiting' };
                const saved = appointmentsMap[slot];
                const isBooked = saved && saved.customer_name && saved.customer_name.trim() !== '';

                return (
                  <tr 
                    key={slot} 
                    className={`transition-colors ${
                      isBooked ? 'bg-red-50/70 hover:bg-red-100/60' : 'hover:bg-slate-50'
                    }`}
                  >
                    {/* Saat Badge */}
                    <td className="py-2.5 px-3">
                      <span className="inline-block px-2.5 py-1 rounded-lg bg-red-600 text-white font-mono font-bold text-xs shadow-sm">
                        {slot}
                      </span>
                    </td>

                    {/* Müşteri Adı Soyadı Input (REQUIRED) */}
                    <td className="py-2.5 px-3">
                      <input
                        type="text"
                        placeholder="Müşteri Adı Soyadı..."
                        value={draft.customer_name}
                        onChange={(e) => handleDraftChange(slot, 'customer_name', e.target.value)}
                        className={`w-full bg-slate-50 border rounded-lg px-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 ${
                          !draft.customer_name && msgSlot.slot === slot ? 'border-red-500 focus:ring-red-500' : 'border-slate-300 focus:ring-red-500'
                        }`}
                      />
                    </td>

                    {/* Telefon Numarası Input (OPTIONAL - NOT REQUIRED) */}
                    <td className="py-2.5 px-3">
                      <input
                        type="text"
                        placeholder="Telefon No (05XX...)"
                        value={draft.customer_phone}
                        onChange={(e) => handleDraftChange(slot, 'customer_phone', e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 font-mono placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                    </td>

                    {/* Not / Hizmet Input */}
                    <td className="py-2.5 px-3">
                      <input
                        type="text"
                        placeholder="Not (Opsiyonel)"
                        value={draft.note}
                        onChange={(e) => handleDraftChange(slot, 'note', e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                    </td>

                    {/* Action Buttons (Kaydet / Bitir / Sil) */}
                    <td className="py-2.5 px-3 text-center">
                      <div className="flex items-center justify-center space-x-1.5">
                        <button
                          onClick={() => handleSaveSlot(slot)}
                          disabled={savingSlot === slot}
                          className="flex items-center space-x-1 px-2.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition shadow-sm active:scale-95 disabled:opacity-50"
                          title="Randevuyu Kaydet"
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>Kaydet</span>
                        </button>

                        {(isBooked || (draft.customer_name && draft.customer_name.trim() !== '')) && (
                          <button
                            onClick={() => handleFinishSlot(slot)}
                            disabled={savingSlot === slot}
                            className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-extrabold transition shadow-sm active:scale-95 disabled:opacity-50 ${
                              draft.status === 'completed' 
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            }`}
                            title="Tıraşı Bitir"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>{draft.status === 'completed' ? 'Bitti' : 'Bitir'}</span>
                          </button>
                        )}

                        {isBooked && (
                          <button
                            onClick={() => handleClearSlot(slot)}
                            disabled={savingSlot === slot}
                            className="p-1.5 bg-slate-100 hover:bg-red-50 text-slate-500 hover:text-red-600 border border-slate-300 rounded-lg transition"
                            title="Randevuyu Temizle"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Error or Success Toast below button */}
                      {msgSlot.slot === slot && (
                        <div className={`text-[10px] font-bold mt-1 ${msgSlot.type === 'error' ? 'text-red-600' : 'text-emerald-600'}`}>
                          {msgSlot.text}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

      </div>

    </div>
  );
}
