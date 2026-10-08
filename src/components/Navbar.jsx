import React, { useState, useEffect } from 'react';
import { 
  Zap, 
  BookOpen, 
  TrendingUp, 
  Scissors, 
  DollarSign, 
  Wallet, 
  Clock, 
  Store,
  Sparkles,
  LogOut,
  UserCheck,
  CalendarDays
} from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, dashboardSummary, currentUser, onLogout }) {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const navItems = [
    { id: 'pos', label: 'Hızlı Satış', icon: Zap, badge: null, color: 'text-red-400' },
    { id: 'appointments', label: 'Randevu Defteri', icon: CalendarDays, badge: null, color: 'text-red-400' },
    { id: 'veresiye', label: 'Veresiye Defteri', icon: BookOpen, badge: dashboardSummary?.total_veresiye > 0 ? `${dashboardSummary.total_veresiye.toLocaleString('tr-TR')} ₺` : null, color: 'text-rose-400' },
    { id: 'ciro', label: 'Ciro & Raporlar', icon: TrendingUp, badge: null, color: 'text-emerald-400' },
    { id: 'products', label: 'Hizmet & Ürünler', icon: Scissors, badge: null, color: 'text-blue-400' },
    { id: 'expenses', label: 'Giderler', icon: DollarSign, badge: null, color: 'text-purple-400' },
    { id: 'my_debts', label: 'Kendi Borçlarım', icon: Wallet, badge: dashboardSummary?.total_my_debts > 0 ? `${dashboardSummary.total_my_debts.toLocaleString('tr-TR')} ₺` : null, color: 'text-cyan-400' },
  ];

  return (
    <header className="bg-white/95 backdrop-blur-xl border-b-2 border-red-600 sticky top-0 z-40 shadow-lg shadow-red-600/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Logo & Branding */}
          <div className="flex items-center space-x-3 cursor-pointer group" onClick={() => setActiveTab('pos')}>
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-red-600 via-rose-600 to-red-700 flex items-center justify-center shadow-lg shadow-red-600/30 ring-2 ring-red-200 group-hover:scale-105 transition duration-200">
              <Scissors className="w-6 h-6 text-white font-black transform -rotate-45 group-hover:rotate-0 transition duration-300" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-black text-xl sm:text-2xl tracking-wider red-text-gradient uppercase drop-shadow-sm">
                  SALOON BROTHERS
                </span>
                <span className="hidden sm:inline-block text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-red-600 text-white border border-red-700 tracking-wider">
                  PRO
                </span>
              </div>
              <p className="text-[11px] text-red-700 font-bold tracking-wider uppercase flex items-center gap-1.5 whitespace-nowrap">
                <Sparkles className="w-3 h-3 text-red-600 shrink-0" />
                <span>
                  {currentUser?.saloon_title || 'Erkek Kuaför & Kişisel Bakım'}
                </span>
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1.5 bg-slate-100 p-1.5 rounded-2xl border border-red-200/80 shadow-inner">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center space-x-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 relative ${
                    isActive 
                      ? 'bg-red-600 text-white shadow-md shadow-red-600/30 scale-[1.02]' 
                      : 'text-slate-700 hover:text-red-600 hover:bg-red-50'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : item.color}`} />
                  <span>{item.label}</span>

                  {item.badge && (
                    <span className={`ml-1 px-2 py-0.5 text-[10px] font-black rounded-full border ${
                      isActive 
                        ? 'bg-white text-red-700 border-white' 
                        : 'bg-red-100 text-red-700 border-red-200'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* User Profile & Switch Account Button */}
          <div className="flex items-center space-x-3">
            
            {/* Active User Pill */}
            {currentUser && (
              <div className="flex items-center space-x-2 bg-red-50 border border-red-200 px-3 py-1.5 rounded-xl text-xs">
                <div className="w-6 h-6 rounded-lg bg-red-600 text-white flex items-center justify-center font-bold">
                  <UserCheck className="w-3.5 h-3.5" />
                </div>
                <div className="text-left hidden sm:block">
                  <div className="font-extrabold text-slate-900 text-xs">{currentUser.name}</div>
                  <div className="text-[9px] text-red-600 font-mono font-bold">@{currentUser.username}</div>
                </div>
              </div>
            )}

            <button
              onClick={onLogout}
              className="p-2 bg-white hover:bg-red-50 text-slate-700 hover:text-red-700 border border-slate-200 hover:border-red-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
              title="Kullanıcı Değiştir / Çıkış"
            >
              <LogOut className="w-4 h-4 text-red-600" />
              <span className="hidden lg:inline">Çıkış</span>
            </button>

            {/* Time display */}
            <div className="hidden sm:flex items-center space-x-2 text-red-700 text-xs font-mono bg-red-50 px-3 py-1.5 rounded-xl border border-red-200 font-bold">
              <Clock className="w-3.5 h-3.5 text-red-600 animate-pulse" />
              <span>
                {currentTime.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

          </div>

        </div>
      </div>

      {/* Mobile Nav Bar */}
      <div className="md:hidden flex overflow-x-auto px-2 py-2.5 bg-white border-t border-red-200 space-x-1.5 no-scrollbar">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                isActive ? 'bg-red-600 text-white font-black shadow-md shadow-red-600/30' : 'text-slate-700 bg-slate-100 border border-slate-200'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
}
