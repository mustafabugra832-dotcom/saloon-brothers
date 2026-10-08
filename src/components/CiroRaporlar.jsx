import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Banknote, 
  Landmark, 
  BookOpen, 
  Calendar, 
  DollarSign, 
  ShoppingBag, 
  Trash2, 
  Award,
  BarChart3,
  Eye,
  Scissors,
  X,
  Filter,
  Layers,
  History,
  Clock,
  CheckCircle2,
  CalendarDays
} from 'lucide-react';

import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts';

import ConfirmModal from './ConfirmModal';

export default function CiroRaporlar({ refreshSummary }) {
  const [turnoverData, setTurnoverData] = useState(null);
  const [salesList, setSalesList] = useState([]);
  const [period, setPeriod] = useState('today');
  
  // Custom Date Filter State
  const [customDate, setCustomDate] = useState(new Date().toISOString().split('T')[0]);

  // Daily Detail Modal State
  const [selectedDateDetail, setSelectedDateDetail] = useState(null);
  const [dailyDetailData, setDailyDetailData] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Delete Confirm Modal State
  const [deleteSaleId, setDeleteSaleId] = useState(null);

  useEffect(() => {
    fetchTurnoverReports();
  }, []);

  useEffect(() => {
    if (period !== 'custom') {
      fetchSalesList(period);
    } else {
      fetchSalesList('custom', customDate);
    }
  }, [period]);

  const fetchTurnoverReports = async () => {
    try {
      const res = await fetch('/api/reports/turnover');
      const data = await res.json();
      setTurnoverData(data);
    } catch (err) {
      console.error("Ciro verileri çekilemedi:", err);
    }
  };

  const fetchSalesList = async (p = period, dateVal = customDate) => {
    try {
      let url = `/api/sales?period=${p}`;
      if (p === 'custom' && dateVal) {
        url += `&start_date=${dateVal}&end_date=${dateVal}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      setSalesList(data);
    } catch (err) {
      console.error("Satış listesi çekilemedi:", err);
    }
  };

  const handleApplyCustomDate = (e) => {
    e.preventDefault();
    if (!customDate) return;
    setPeriod('custom');
    fetchSalesList('custom', customDate);
  };

  const openDailyDetailModal = async (dateStr) => {
    setSelectedDateDetail(dateStr);
    setLoadingDetail(true);
    setDailyDetailData(null);

    try {
      const res = await fetch(`/api/reports/daily-detail?date=${dateStr}`);
      const data = await res.json();
      setDailyDetailData(data);
    } catch (err) {
      console.error("Günlük detay çekilemedi:", err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const confirmDeleteSale = async () => {
    if (!deleteSaleId) return;

    try {
      const res = await fetch(`/api/sales/${deleteSaleId}`, { method: 'DELETE' });
      if (res.ok) {
        setDeleteSaleId(null);
        fetchSalesList();
        fetchTurnoverReports();
        if (selectedDateDetail) {
          openDailyDetailModal(selectedDateDetail);
        }
        if (refreshSummary) refreshSummary();
      }
    } catch (err) {
      console.error("Satış silinemedi.");
    }
  };

  const formatDateLabel = (dateStr) => {
    if (!dateStr) return '';
    const todayStr = new Date().toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;

    const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    const formatted = d.toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric', weekday: 'long' });

    if (dateStr === todayStr) return `${formatted} (BUGÜN)`;
    if (dateStr === yesterdayStr) return `${formatted} (DÜN)`;
    return formatted;
  };

  const COLORS = ['#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'];

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-4 py-4 space-y-6">
      
      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Today Turnover Card */}
        <div className="bg-white border-2 border-red-200 rounded-2xl p-4 space-y-2 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Bugünkü Ciro</span>
            <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center font-bold border border-red-200">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          
          <div className="text-2xl font-black text-red-600 font-mono">
            {turnoverData?.today?.total ? `${turnoverData.today.total.toLocaleString('tr-TR')} ₺` : '0 ₺'}
          </div>

          <div className="grid grid-cols-3 gap-1 pt-2 border-t border-slate-200 text-[11px]">
            <div className="bg-slate-50 p-1.5 rounded text-center border border-slate-200">
              <span className="text-slate-500 block">Nakit</span>
              <span className="font-bold text-emerald-600">{turnoverData?.today?.cash || 0} ₺</span>
            </div>
            <div className="bg-slate-50 p-1.5 rounded text-center border border-slate-200">
              <span className="text-slate-500 block">IBAN</span>
              <span className="font-bold text-blue-600">{turnoverData?.today?.iban || turnoverData?.today?.card || 0} ₺</span>
            </div>
            <div className="bg-slate-50 p-1.5 rounded text-center border border-slate-200">
              <span className="text-slate-500 block">Veresiye</span>
              <span className="font-bold text-red-600">{turnoverData?.today?.veresiye || 0} ₺</span>
            </div>
          </div>
        </div>

        {/* Weekly Turnover */}
        <div className="bg-white border-2 border-red-200 rounded-2xl p-4 space-y-2 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Bu Hafta Ciro</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold border border-blue-200">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          
          <div className="text-2xl font-black text-blue-600 font-mono">
            {turnoverData?.this_week ? `${turnoverData.this_week.toLocaleString('tr-TR')} ₺` : '0 ₺'}
          </div>
          
          <p className="text-xs text-slate-600 pt-3">Son 7 günlük toplam elde edilen ciro.</p>
        </div>

        {/* Monthly Turnover */}
        <div className="bg-white border-2 border-red-200 rounded-2xl p-4 space-y-2 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Bu Ayki Ciro</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold border border-emerald-200">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          
          <div className="text-2xl font-black text-emerald-600 font-mono">
            {turnoverData?.this_month ? `${turnoverData.this_month.toLocaleString('tr-TR')} ₺` : '0 ₺'}
          </div>

          <p className="text-xs text-slate-600 pt-3">Bu ay içinde kasaya giren ciro tutarı.</p>
        </div>

        {/* Popular Item KPI */}
        <div className="bg-white border-2 border-red-200 rounded-2xl p-4 space-y-2 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">En Çok Yapılan İşlem</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold border border-purple-200">
              <Award className="w-4 h-4" />
            </div>
          </div>
          
          <div className="text-lg font-bold text-purple-700 truncate">
            {turnoverData?.top_items?.[0]?.product_name || 'Henüz Yok'}
          </div>

          <p className="text-xs text-slate-600 pt-2 font-mono">
            {turnoverData?.top_items?.[0] ? `${turnoverData.top_items[0].total_qty} Adet Yapıldı (${turnoverData.top_items[0].total_revenue.toLocaleString('tr-TR')} ₺)` : '0 İşlem'}
          </p>
        </div>

      </div>

      {/* CHARTS SECTION (2 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* Chart 1: Son 60 Günlük Ciro Grafiği (8 Cols) */}
        <div className="lg:col-span-8 bg-white border-2 border-red-200 rounded-xl p-4 space-y-3 shadow-md">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-red-600" />
              Günlük Ciro Gelişim Grafiği
            </h3>
          </div>

          <div className="h-64 w-full pt-2">
            {turnoverData?.daily_chart && turnoverData.daily_chart.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={turnoverData.daily_chart}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#dc2626" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#dc2626" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickFormatter={(str) => str.split('-').slice(1).join('/')} />
                  <YAxis stroke="#64748b" fontSize={11} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', color: '#0f172a', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                    formatter={(val) => [`${val.toLocaleString('tr-TR')} ₺`, 'Ciro']}
                  />
                  <Area type="monotone" dataKey="total" stroke="#dc2626" strokeWidth={3} fillOpacity={1} fill="url(#colorTotal)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-500 text-xs">
                Grafik için henüz yeterli satış verisi bulunmuyor.
              </div>
            )}
          </div>
        </div>

        {/* Chart 2: Top Selling Items (4 Cols) */}
        <div className="lg:col-span-4 bg-white border-2 border-red-200 rounded-xl p-4 space-y-3 shadow-md">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-red-600" />
            En Çok Satan Hizmet & Ürünler
          </h3>

          <div className="h-64 w-full">
            {turnoverData?.top_items && turnoverData.top_items.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={turnoverData.top_items} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" stroke="#64748b" fontSize={10} />
                  <YAxis dataKey="product_name" type="category" stroke="#64748b" fontSize={10} width={90} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', color: '#0f172a', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                    formatter={(val) => [`${val} Adet`, 'Satış Sayısı']}
                  />
                  <Bar dataKey="total_qty" radius={[0, 4, 4, 0]}>
                    {turnoverData.top_items.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-500 text-xs">
                Satış verisi bulunamadı.
              </div>
            )}
          </div>
        </div>

      </div>

      {/* NEW SECTION 1: GEÇMİŞ GÜNLÜK RAPORLAR (DÜN & GEÇMİŞ GÜNLER) */}
      <div className="bg-white border-2 border-red-200 rounded-xl p-4 space-y-4 shadow-md">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div>
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <History className="w-5 h-5 text-red-600" />
              Geçmiş Günlük Raporlar (Dün & Geçmiş Günler)
            </h3>
            <p className="text-xs text-slate-600 mt-0.5">
              İstediğiniz günün yanındaki <strong>"Günlük Rapor Detayı"</strong> butonuna basarak o gün hangi traşların yapıldığını ve ödemelerin nasıl alındığını inceleyebilirsiniz.
            </p>
          </div>
        </div>

        {/* Past Days Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-red-600 text-white uppercase text-[10px] font-bold border-b border-red-700">
              <tr>
                <th className="py-2.5 px-3">Tarih</th>
                <th className="py-2.5 px-3">Toplam Ciro</th>
                <th className="py-2.5 px-3">Nakit</th>
                <th className="py-2.5 px-3">IBAN / Havale</th>
                <th className="py-2.5 px-3">Veresiye</th>
                <th className="py-2.5 px-3 text-center">İşlem / Traş Adedi</th>
                <th className="py-2.5 px-3 text-right">Detay Raporu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-red-100 font-medium bg-white">
              {turnoverData?.past_days && turnoverData.past_days.length > 0 ? (
                turnoverData.past_days.map((day) => (
                  <tr key={day.date} className="hover:bg-red-50/60 transition">
                    <td className="py-3 px-3 font-bold text-slate-900 flex items-center gap-2">
                      <CalendarDays className="w-4 h-4 text-red-600 shrink-0" />
                      <span>{formatDateLabel(day.date)}</span>
                    </td>
                    <td className="py-3 px-3 font-bold font-mono text-red-600 text-sm">
                      {day.total.toLocaleString('tr-TR')} ₺
                    </td>
                    <td className="py-3 px-3 font-mono text-emerald-600 font-semibold">
                      {day.cash.toLocaleString('tr-TR')} ₺
                    </td>
                    <td className="py-3 px-3 font-mono text-blue-600 font-semibold">
                      {day.iban.toLocaleString('tr-TR')} ₺
                    </td>
                    <td className="py-3 px-3 font-mono text-red-600 font-semibold">
                      {day.veresiye.toLocaleString('tr-TR')} ₺
                    </td>
                    <td className="py-3 px-3 text-center font-bold font-mono text-slate-900">
                      {day.transaction_count} İşlem
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => openDailyDetailModal(day.date)}
                        className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-xs font-bold transition shadow-sm active:scale-95"
                      >
                        <Eye className="w-3.5 h-3.5 text-red-600" />
                        <span>Günlük Rapor Detayı</span>
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-500 text-xs">
                    Geçmiş günlere ait kaydedilmiş rapor bulunmamaktadır.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SALES HISTORY LOG TABLE & CUSTOM DATE FILTER */}
      <div className="bg-white border-2 border-red-200 rounded-xl p-4 space-y-4 shadow-md">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div>
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <Layers className="w-5 h-5 text-red-600" />
              Satış İşlem Defteri & Özel Tarih Filtresi
            </h3>
            <p className="text-xs text-slate-600 mt-0.5">Tarih aralığı seçerek veya hazır filtreleri kullanarak satış kayıtlarını inceleyin.</p>
          </div>

          {/* Filter Period Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
            <button
              onClick={() => setPeriod('today')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                period === 'today' ? 'bg-red-600 text-white shadow-md shadow-red-600/30' : 'text-slate-700 hover:bg-red-50'
              }`}
            >
              Bugün
            </button>
            <button
              onClick={() => setPeriod('week')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                period === 'week' ? 'bg-red-600 text-white shadow-md shadow-red-600/30' : 'text-slate-700 hover:bg-red-50'
              }`}
            >
              Bu Hafta
            </button>
            <button
              onClick={() => setPeriod('month')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                period === 'month' ? 'bg-red-600 text-white shadow-md shadow-red-600/30' : 'text-slate-700 hover:bg-red-50'
              }`}
            >
              Bu Ay
            </button>
            <button
              onClick={() => setPeriod('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                period === 'all' ? 'bg-red-600 text-white shadow-md shadow-red-600/30' : 'text-slate-700 hover:bg-red-50'
              }`}
            >
              Tümü
            </button>
            <button
              onClick={() => setPeriod('custom')}
              className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                period === 'custom' ? 'bg-red-600 text-white shadow-md shadow-red-600/30' : 'text-slate-700 hover:bg-red-50'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Özel Tarih Seç</span>
            </button>
          </div>
        </div>

        {/* SINGLE CUSTOM DATE SELECTION INPUT */}
        {period === 'custom' && (
          <form onSubmit={handleApplyCustomDate} className="bg-red-50 p-3 rounded-xl border border-red-200 flex items-center gap-3">
            <div className="flex items-center space-x-2">
              <label className="text-xs font-bold text-slate-700">Tarih Seçin:</label>
              <input
                type="date"
                required
                value={customDate}
                onChange={(e) => {
                  const val = e.target.value;
                  setCustomDate(val);
                  fetchSalesList('custom', val);
                }}
                className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-red-500 cursor-pointer shadow-sm"
              />
            </div>

            <button
              type="submit"
              className="flex items-center space-x-1 px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg text-xs transition shadow-md shadow-red-600/30"
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Tarihe Göre Getir</span>
            </button>
          </form>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-red-600 text-white uppercase text-[10px] font-bold border-b border-red-700">
              <tr>
                <th className="py-2.5 px-3">Fiş ID</th>
                <th className="py-2.5 px-3">Tarih</th>
                <th className="py-2.5 px-3">Müşteri</th>
                <th className="py-2.5 px-3">Ödeme Tipi</th>
                <th className="py-2.5 px-3">Yapılan İşlemler</th>
                <th className="py-2.5 px-3 text-right">Tutar</th>
                <th className="py-2.5 px-3 text-center">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-red-100 font-medium bg-white">
              {salesList.map((sale) => (
                <tr key={sale.id} className="hover:bg-red-50/60 transition-colors">
                  <td className="py-2.5 px-3 font-mono text-slate-500">#{sale.id}</td>
                  <td className="py-2.5 px-3 font-mono text-slate-500">
                    {new Date(sale.created_at).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="py-2.5 px-3 font-bold text-slate-900">{sale.customer_name}</td>
                  <td className="py-2.5 px-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      sale.payment_type === 'cash' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                      sale.payment_type === 'iban' || sale.payment_type === 'card' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                      sale.payment_type === 'veresiye' ? 'bg-red-100 text-red-800 border border-red-200' :
                      'bg-red-50 text-red-700 border border-red-200'
                    }`}>
                      {sale.payment_type === 'cash' ? 'Nakit' :
                       sale.payment_type === 'iban' || sale.payment_type === 'card' ? 'IBAN / Havale' :
                       sale.payment_type === 'veresiye' ? 'Veresiye' : 'Parçalı'}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-600 max-w-xs truncate">
                    {sale.items ? sale.items.map(i => `${i.product_name} (x${i.quantity})`).join(', ') : '-'}
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold font-mono text-red-600 text-sm">
                    {sale.total_amount.toLocaleString('tr-TR')} ₺
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <button
                      onClick={() => setDeleteSaleId(sale.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded hover:bg-red-50 transition"
                      title="Satışı İptal Et & Sil"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}

              {salesList.length === 0 && (
                <tr>
                  <td colSpan="7" className="py-10 text-center text-slate-500 text-xs">
                    Seçilen filtre kriterlerine uygun kaydedilmiş satış bulunmuyor.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* MODAL: DAILY REPORT DETAIL (O GÜNÜN RAPORU & TRAŞLARI & ÖDEMELERİ) */}
      {selectedDateDetail && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white border-2 border-red-500 rounded-2xl max-w-3xl w-full p-5 space-y-5 shadow-2xl my-auto">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <span className="text-[11px] font-bold text-red-600 uppercase tracking-widest block">GÜNLÜK DETAYLI RAPOR</span>
                <h3 className="font-extrabold text-lg text-slate-900 flex items-center gap-2">
                  <CalendarDays className="w-5 h-5 text-red-600" />
                  {formatDateLabel(selectedDateDetail)}
                </h3>
              </div>
              <button 
                onClick={() => setSelectedDateDetail(null)} 
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-red-50 transition"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {loadingDetail ? (
              <div className="py-16 text-center text-slate-400 text-sm space-y-2">
                <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p>Günlük rapor detayları hazırlanıyor...</p>
              </div>
            ) : dailyDetailData ? (
              <div className="space-y-5">

                {/* Day Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-white p-3 rounded-xl border-2 border-red-200 text-center shadow-sm">
                    <span className="text-xs text-slate-500 block font-semibold">Toplam Ciro</span>
                    <span className="text-lg font-black text-red-600 font-mono">
                      {dailyDetailData.totals?.total ? `${dailyDetailData.totals.total.toLocaleString('tr-TR')} ₺` : '0 ₺'}
                    </span>
                  </div>

                  <div className="bg-white p-3 rounded-xl border-2 border-red-200 text-center shadow-sm">
                    <span className="text-xs text-slate-500 block font-semibold">Nakit Ödeme</span>
                    <span className="text-base font-bold text-emerald-600 font-mono">
                      {dailyDetailData.totals?.cash ? `${dailyDetailData.totals.cash.toLocaleString('tr-TR')} ₺` : '0 ₺'}
                    </span>
                  </div>

                  <div className="bg-white p-3 rounded-xl border-2 border-red-200 text-center shadow-sm">
                    <span className="text-xs text-slate-500 block font-semibold">IBAN / Havale</span>
                    <span className="text-base font-bold text-blue-600 font-mono">
                      {dailyDetailData.totals?.iban ? `${dailyDetailData.totals.iban.toLocaleString('tr-TR')} ₺` : '0 ₺'}
                    </span>
                  </div>

                  <div className="bg-white p-3 rounded-xl border-2 border-red-200 text-center shadow-sm">
                    <span className="text-xs text-slate-500 block font-semibold">Veresiye Borç</span>
                    <span className="text-base font-bold text-red-600 font-mono">
                      {dailyDetailData.totals?.veresiye ? `${dailyDetailData.totals.veresiye.toLocaleString('tr-TR')} ₺` : '0 ₺'}
                    </span>
                  </div>
                </div>

                {/* 2-Column Grid: Services Summary & Payment Breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* Column 1: Performans & Traşlar */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                    <h4 className="font-bold text-slate-900 text-xs flex items-center gap-2 border-b border-slate-200 pb-2">
                      <Scissors className="w-4 h-4 text-red-600" />
                      O Gün Yapılan Traşlar & Hizmetler
                    </h4>

                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {dailyDetailData.items_summary && dailyDetailData.items_summary.length > 0 ? (
                        dailyDetailData.items_summary.map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center text-xs p-2 bg-white rounded-lg border border-slate-200 shadow-sm">
                            <div>
                              <span className="font-bold text-slate-900 block">{item.product_name}</span>
                              <span className="text-[11px] text-slate-500 font-mono">{item.total_qty} Adet Yapıldı</span>
                            </div>
                            <div className="font-bold font-mono text-red-600 text-sm">
                              {item.total_revenue.toLocaleString('tr-TR')} ₺
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="py-6 text-center text-slate-500 text-xs">
                          O gün herhangi bir işlem kaydı bulunamadı.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Column 2: Payment Distribution */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                    <h4 className="font-bold text-slate-900 text-xs flex items-center gap-2 border-b border-slate-200 pb-2">
                      <Banknote className="w-4 h-4 text-emerald-600" />
                      Ödeme Alınma Yöntemleri Dağılımı
                    </h4>

                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between items-center p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg">
                        <span className="font-bold text-emerald-800">Nakit Alınan:</span>
                        <span className="font-mono font-extrabold text-emerald-600 text-sm">
                          {dailyDetailData.totals?.cash ? `${dailyDetailData.totals.cash.toLocaleString('tr-TR')} ₺` : '0 ₺'}
                        </span>
                      </div>

                      <div className="flex justify-between items-center p-2.5 bg-blue-50 border border-blue-200 rounded-lg">
                        <span className="font-bold text-blue-800">IBAN / Havale Alınan:</span>
                        <span className="font-mono font-extrabold text-blue-600 text-sm">
                          {dailyDetailData.totals?.iban ? `${dailyDetailData.totals.iban.toLocaleString('tr-TR')} ₺` : '0 ₺'}
                        </span>
                      </div>

                      <div className="flex justify-between items-center p-2.5 bg-red-50 border border-red-200 rounded-lg">
                        <span className="font-bold text-red-800">Veresiye Yazılan:</span>
                        <span className="font-mono font-extrabold text-red-600 text-sm">
                          {dailyDetailData.totals?.veresiye ? `${dailyDetailData.totals.veresiye.toLocaleString('tr-TR')} ₺` : '0 ₺'}
                        </span>
                      </div>

                      <div className="flex justify-between items-center p-2.5 bg-white border border-slate-200 rounded-lg shadow-sm">
                        <span className="font-bold text-slate-700">Toplam İşlem Sayısı:</span>
                        <span className="font-mono font-extrabold text-red-600 text-sm">
                          {dailyDetailData.totals?.transaction_count || 0} Adet Satış
                        </span>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Sales List Table for that Day */}
                <div className="space-y-2">
                  <h4 className="font-bold text-slate-900 text-xs flex items-center gap-2">
                    <Clock className="w-4 h-4 text-red-600" />
                    O Gün Yapılan Tüm Satışlar ({dailyDetailData.sales ? dailyDetailData.sales.length : 0})
                  </h4>

                  <div className="overflow-x-auto max-h-60 rounded-xl border border-red-200 bg-white">
                    <table className="w-full text-left text-xs text-slate-700">
                      <thead className="bg-red-600 text-white uppercase text-[10px] font-bold border-b border-red-700 sticky top-0">
                        <tr>
                          <th className="py-2 px-3">Saat</th>
                          <th className="py-2 px-3">Müşteri</th>
                          <th className="py-2 px-3">Ödeme Tipi</th>
                          <th className="py-2 px-3">İçerik / Traşlar</th>
                          <th className="py-2 px-3 text-right">Tutar</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-red-100 bg-white">
                        {dailyDetailData.sales && dailyDetailData.sales.length > 0 ? (
                          dailyDetailData.sales.map((s) => (
                            <tr key={s.id} className="hover:bg-red-50/60 transition-colors">
                              <td className="py-2 px-3 font-mono text-slate-500">
                                {new Date(s.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                              </td>
                              <td className="py-2 px-3 font-bold text-slate-900">{s.customer_name}</td>
                              <td className="py-2 px-3">
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                                  s.payment_type === 'cash' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                                  s.payment_type === 'iban' || s.payment_type === 'card' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                                  s.payment_type === 'veresiye' ? 'bg-red-100 text-red-800 border border-red-200' :
                                  'bg-red-50 text-red-700 border border-red-200'
                                }`}>
                                  {s.payment_type === 'cash' ? 'Nakit' :
                                   s.payment_type === 'iban' || s.payment_type === 'card' ? 'IBAN' :
                                   s.payment_type === 'veresiye' ? 'Veresiye' : 'Parçalı'}
                                </span>
                              </td>
                              <td className="py-2 px-3 text-slate-600">
                                {s.items ? s.items.map(i => `${i.product_name} (x${i.quantity})`).join(', ') : '-'}
                              </td>
                              <td className="py-2 px-3 text-right font-bold font-mono text-red-600">
                                {s.total_amount.toLocaleString('tr-TR')} ₺
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="5" className="py-6 text-center text-slate-500 text-xs">
                              Satış kaydı bulunamadı.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            ) : null}

          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      <ConfirmModal 
        isOpen={Boolean(deleteSaleId)}
        title="Satış İptali ve Silme Onayı"
        message={`#${deleteSaleId} numaralı satış işlemini iptal edip kalıcı olarak silmek istediğinize emin misiniz?`}
        confirmText="Evet, Satışı İptal Et"
        cancelText="Vazgeç"
        onConfirm={confirmDeleteSale}
        onClose={() => setDeleteSaleId(null)}
      />

    </div>
  );
}
