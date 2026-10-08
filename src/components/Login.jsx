import React, { useState, useEffect, useRef } from 'react';
import { Store, UserCheck, Key, UserPlus, Lock, Sparkles, LogIn, ArrowRight, ShieldCheck } from 'lucide-react';

export default function Login({ onLoginSuccess }) {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const passwordInputRef = useRef(null);

  // New Account Registration state
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regName, setRegName] = useState('');
  const [regSaloonTitle, setRegSaloonTitle] = useState('Saloon Brothers');

  useEffect(() => {
    fetchUsersList();
  }, []);

  const fetchUsersList = async () => {
    try {
      const res = await fetch('/api/auth/users');
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectUser = (u) => {
    setSelectedUser(u);
    setUsername(u.username);
    setPassword('');
    setError('');
    
    // Focus password input
    setTimeout(() => {
      if (passwordInputRef.current) {
        passwordInputRef.current.focus();
      }
    }, 100);
  };

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    if (!username || !password) {
      setError("Lütfen kullanıcı adı ve şifrenizi giriniz.");
      return;
    }

    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        onLoginSuccess(data.user);
      } else {
        setError(data.error || "Hatalı şifre!");
      }
    } catch (err) {
      setError("Sunucuya bağlanılamadı.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: regUsername,
          password: regPassword,
          name: regName,
          saloon_title: regSaloonTitle
        })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        onLoginSuccess(data.user);
      } else {
        setError(data.error || "Kullanıcı oluşturulamadı.");
      }
    } catch (err) {
      setError("Hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-saloon-pattern bg-grid-pattern flex items-center justify-center p-4 relative overflow-hidden">
      
      {/* Background glowing ambient light (Red & White) */}
      <div className="absolute top-1/4 left-1/3 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-red-600/25 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 w-[500px] h-[500px] bg-white/10 rounded-full blur-[150px] pointer-events-none" />

      <div className="max-w-md w-full bg-white border-2 border-red-600 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-red-600/15 space-y-6 relative z-10 text-slate-900">
        
        {/* Branding Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-600 via-rose-600 to-red-700 flex items-center justify-center mx-auto shadow-lg shadow-red-600/30 ring-2 ring-red-200">
            <Store className="w-8 h-8 text-white font-black" />
          </div>

          <h1 className="text-2xl sm:text-3xl font-black tracking-wider red-text-gradient uppercase">
            SALOON BROTHERS
          </h1>
          <p className="text-xs text-red-700 font-semibold tracking-wide">
            Kullanıcı Şifreli Giriş & Kasa İzolasyon Sistemi
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl text-center font-bold">
            {error}
          </div>
        )}

        {/* 5 USER SELECTION BUTTONS */}
        {!isRegisterMode && users.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-slate-200">
            <label className="text-[11px] text-red-700 font-bold uppercase tracking-wider block text-center">
              👤 Giriş Yapılacak Hesabı Seçiniz
            </label>
            
            <div className="grid grid-cols-1 gap-1.5">
              {users.map((u) => {
                const isSelected = selectedUser?.id === u.id || username === u.username;
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => handleSelectUser(u)}
                    className={`flex items-center justify-between p-2.5 rounded-xl text-left transition ${
                      isSelected 
                        ? 'bg-red-600 border-2 border-red-700 text-white shadow-md shadow-red-600/30' 
                        : 'bg-slate-50 hover:bg-red-50 border border-slate-200 hover:border-red-300 text-slate-800'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                        isSelected ? 'bg-white text-red-700' : 'bg-red-100 text-red-700'
                      }`}>
                        #{u.id}
                      </div>
                      <div>
                        <div className={`font-bold text-sm ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                          {u.name}
                        </div>
                        <div className={`text-[10px] font-mono ${isSelected ? 'text-red-100' : 'text-slate-500'}`}>
                          Kullanıcı: {u.username}
                        </div>
                      </div>
                    </div>

                    <ShieldCheck className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* LOGIN FORM WITH PASSWORD REQUIREMENT */}
        {!isRegisterMode ? (
          <form onSubmit={handleLogin} className="space-y-3 pt-2 border-t border-slate-200">
            <div className="text-xs font-bold text-slate-700 uppercase tracking-wider text-center flex items-center justify-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-red-600" />
              <span>{selectedUser ? `${selectedUser.name} Şifre Girişi` : 'Şifreli Giriş'}</span>
            </div>

            <div>
              <label className="text-xs text-slate-600 font-bold block mb-1">Kullanıcı Adı</label>
              <input
                type="text"
                required
                placeholder="berat, izzethan, akif, sinan, turgut"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 font-medium"
              />
            </div>

            <div>
              <label className="text-xs text-slate-600 font-bold block mb-1">Şifre Giriniz</label>
              <input
                ref={passwordInputRef}
                type="password"
                required
                placeholder="••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-extrabold rounded-xl transition shadow-lg shadow-red-600/30 flex items-center justify-center space-x-2 text-sm"
            >
              <LogIn className="w-4 h-4" />
              <span>ŞİFRE İLE GİRİŞ YAP</span>
            </button>

            <button
              type="button"
              onClick={() => setIsRegisterMode(true)}
              className="w-full text-center text-xs text-red-600 hover:text-red-700 font-bold pt-1"
            >
              + Yeni Kullanıcı Oluştur
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-3 pt-2 border-t border-slate-200">
            <div className="text-xs font-bold text-red-700 uppercase tracking-wider text-center">
              YENİ KULLANICI KAYDI
            </div>

            <div>
              <label className="text-xs text-slate-600 font-bold block mb-1">Kuaför / Kullanıcı Adı Soyadı</label>
              <input
                type="text"
                required
                placeholder="Ör: Caner Usta"
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
            </div>

            <div>
              <label className="text-xs text-slate-600 font-bold block mb-1">Giriş Kullanıcı Adı</label>
              <input
                type="text"
                required
                placeholder="caner"
                value={regUsername}
                onChange={(e) => setRegUsername(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
            </div>

            <div>
              <label className="text-xs text-slate-600 font-bold block mb-1">Şifre Belirleyin</label>
              <input
                type="password"
                required
                placeholder="••••••"
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-extrabold rounded-xl transition shadow-lg shadow-red-600/30 text-sm"
            >
              Kullanıcıyı Kaydet ve Giriş Yap
            </button>

            <button
              type="button"
              onClick={() => setIsRegisterMode(false)}
              className="w-full text-center text-xs text-slate-600 hover:text-slate-900 font-semibold pt-1"
            >
              ← Giriş Ekranına Dön
            </button>
          </form>
        )}

      </div>
    </div>
  );
}
