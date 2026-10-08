import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Login from './components/Login';
import QuickPOS from './components/QuickPOS';
import VeresiyeDefteri from './components/VeresiyeDefteri';
import CiroRaporlar from './components/CiroRaporlar';
import ProductsManagement from './components/ProductsManagement';
import ExpensesManagement from './components/ExpensesManagement';
import MyDebtsManagement from './components/MyDebtsManagement';
import AppointmentsManagement from './components/AppointmentsManagement';
import { CheckCircle2, X } from 'lucide-react';

// Synchronously override window.fetch BEFORE components render
const getSavedUserId = () => {
  try {
    const saved = localStorage.getItem('saloon_user');
    if (saved) {
      const u = JSON.parse(saved);
      if (u && u.id) return u.id.toString();
    }
  } catch (e) {}
  return '1';
};

if (typeof window !== 'undefined' && !window.__fetch_intercepted__) {
  const nativeFetch = window.fetch;
  window.fetch = function (resource, init = {}) {
    const userId = getSavedUserId();
    init.headers = {
      ...(init.headers || {}),
      'X-User-Id': userId
    };
    return nativeFetch(resource, init);
  };
  window.__fetch_intercepted__ = true;
}

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('saloon_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [activeTab, setActiveTab] = useState('pos');
  const [dashboardSummary, setDashboardSummary] = useState(null);
  const [toastNotification, setToastNotification] = useState(null);

  const showToast = (title, message, type = 'success') => {
    setToastNotification({ title, message, type, id: Date.now() });
    setTimeout(() => {
      setToastNotification(null);
    }, 4500);
  };

  useEffect(() => {
    if (currentUser) {
      fetchSummary();
    }
  }, [currentUser, activeTab]);

  const fetchSummary = async () => {
    if (!currentUser?.id) return;
    try {
      const res = await fetch('/api/dashboard');
      const data = await res.json();
      setDashboardSummary(data);
    } catch (err) {
      console.error("Dashboard verileri alınamadı:", err);
    }
  };

  const handleLoginSuccess = (userObj) => {
    localStorage.setItem('saloon_user', JSON.stringify(userObj));
    setCurrentUser(userObj);
    setActiveTab('pos');
  };

  const handleLogout = () => {
    localStorage.removeItem('saloon_user');
    setCurrentUser(null);
  };

  // If not logged in, render Luxury Login Screen
  if (!currentUser) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-saloon-pattern bg-grid-pattern text-slate-100 flex flex-col font-sans selection:bg-red-600 selection:text-white relative overflow-hidden">
      
      {/* Background Ambient Red & White Glowing Orbs */}
      <div className="fixed top-[-10%] left-[-10%] w-[550px] h-[550px] bg-red-600/25 rounded-full blur-[140px] pointer-events-none animate-float" />
      <div className="fixed top-[40%] right-[-10%] w-[500px] h-[500px] bg-white/10 rounded-full blur-[150px] pointer-events-none animate-float" style={{ animationDelay: '3s' }} />
      <div className="fixed bottom-[-10%] left-[20%] w-[600px] h-[600px] bg-rose-600/20 rounded-full blur-[160px] pointer-events-none animate-float" style={{ animationDelay: '5s' }} />

      {/* GLOBAL TOP-RIGHT FLOATING TOAST NOTIFICATION (BELOW NAVBAR) */}
      {toastNotification && (
        <div className="fixed top-24 right-5 z-[9999] flex items-center space-x-3.5 bg-slate-900/95 border border-emerald-500/50 text-emerald-100 px-5 py-4 rounded-2xl shadow-2xl shadow-emerald-950/90 animate-in slide-in-from-top-4 duration-300 backdrop-blur-md max-w-md border-l-4 border-l-emerald-500">
          <div className="w-10 h-10 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center font-black shrink-0 shadow-lg shadow-emerald-500/30">
            <CheckCircle2 className="w-6 h-6 text-slate-950" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-black text-white text-sm tracking-wide">
              {toastNotification.title}
            </div>
            {toastNotification.message && (
              <div className="text-xs text-emerald-300 font-mono mt-0.5 font-semibold">
                {toastNotification.message}
              </div>
            )}
          </div>
          <button 
            onClick={() => setToastNotification(null)} 
            className="text-slate-400 hover:text-white p-1.5 hover:bg-slate-800 rounded-lg transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Header Navbar */}
      <Navbar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        dashboardSummary={dashboardSummary}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      {/* Main App Content View */}
      <main className="flex-1 pb-10 z-10">
        {activeTab === 'pos' && (
          <QuickPOS 
            refreshSummary={fetchSummary} 
            showToast={showToast}
          />
        )}

        {activeTab === 'appointments' && (
          <AppointmentsManagement 
            showToast={showToast}
          />
        )}

        {activeTab === 'veresiye' && (
          <VeresiyeDefteri 
            refreshSummary={fetchSummary} 
            showToast={showToast}
          />
        )}

        {activeTab === 'ciro' && (
          <CiroRaporlar 
            refreshSummary={fetchSummary} 
          />
        )}

        {activeTab === 'products' && (
          <ProductsManagement />
        )}

        {activeTab === 'expenses' && (
          <ExpensesManagement 
            refreshSummary={fetchSummary} 
          />
        )}

        {activeTab === 'my_debts' && (
          <MyDebtsManagement 
            refreshSummary={fetchSummary} 
            showToast={showToast}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-slate-950/80 backdrop-blur-md border-t border-slate-800/80 py-3 text-center text-xs text-slate-500 z-10">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span className="font-bold tracking-widest text-red-400 uppercase text-[11px]">
            {currentUser.name} • MULTI-USER ISOLATED POS
          </span>
          <span className="text-[11px]">
            Saloon Brothers Kasa & Veresiye Takip © 2026
          </span>
        </div>
      </footer>

    </div>
  );
}
