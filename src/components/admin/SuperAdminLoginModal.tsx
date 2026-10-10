import React, { useState } from 'react';
import { 
  X, 
  ShieldCheck, 
  Lock, 
  KeyRound, 
  AlertCircle, 
  CheckCircle2, 
  Eye, 
  EyeOff,
  Building2,
  Terminal
} from 'lucide-react';
import { 
  verifySuperAdminCredentials, 
  setSuperAdminSession,
  DEFAULT_SUPER_ADMIN_KEY,
  DEFAULT_SUPER_ADMIN_PIN
} from '../../services/authService';
import { fetchFullDatabaseSync } from '../../services/liveSyncService';
import { addAuditLog } from '../../services/systemSettingsService';

interface SuperAdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: () => void;
}

export const SuperAdminLoginModal: React.FC<SuperAdminLoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
}) => {
  if (!isOpen) return null;

  const [masterKey, setMasterKey] = useState('');
  const [pin, setPin] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!masterKey.trim() || !pin.trim()) {
      setErrorMsg('Harap masukkan Master Security Key dan 6-digit PIN Admin.');
      return;
    }

    try {
      await fetchFullDatabaseSync();
    } catch {
      // offline fallback
    }

    const isValid = verifySuperAdminCredentials(masterKey, pin);

    if (isValid) {
      setSuperAdminSession();
      addAuditLog('SUPER_ADMIN_LOGIN', 'Login berhasil ke Super Admin Backend Control Center', 'SECURITY', 'Super Admin');
      onLoginSuccess();
      onClose();
    } else {
      const nextAttempts = attempts + 1;
      setAttempts(nextAttempts);
      setErrorMsg(`Autentikasi gagal! Kunci Keamanan atau PIN salah (Percobaan ke-${nextAttempts}).`);
      addAuditLog('FAILED_LOGIN_ATTEMPT', `Percobaan login Super Admin gagal (${nextAttempts})`, 'SECURITY', 'Unknown');
    }
  };

  const handleUseDefault = () => {
    setMasterKey(DEFAULT_SUPER_ADMIN_KEY);
    setPin(DEFAULT_SUPER_ADMIN_PIN);
    setErrorMsg(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#1A1614]/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#231E1B] border border-[#3D352F] rounded-3xl max-w-md w-full overflow-hidden shadow-2xl text-white">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-[#3D352F] flex items-center justify-between bg-[#231E1B]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#95A823] flex items-center justify-center text-white font-bold shadow-lg shadow-[#95A823]/25">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base text-white tracking-tight">
                  Super Admin Gateway
                </h3>
                <span className="text-[10px] bg-[#FFBC7D]/20 text-[#FFBC7D] font-mono px-1.5 py-0.5 rounded border border-[#FFBC7D]/40 font-bold">
                  RESTRICTED
                </span>
              </div>
              <p className="text-xs text-[#C6CC81]">
                Pintu Akses Terproteksi Backend Sistem LOGAR
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#362E2A] text-slate-300 hover:text-white flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-[#2E2824] border border-[#453D37] rounded-2xl p-3.5 text-xs text-[#D9DF98] space-y-1">
            <div className="flex items-center gap-1.5 text-[#FFBC7D] font-bold">
              <Lock className="w-3.5 h-3.5" />
              <span>Otorisasi Tingkat Tinggi Diperlukan</span>
            </div>
            <p className="text-[#C6CC81] text-[11px] leading-relaxed">
              Panel backend memungkinkan pengelolaan seluruh data pengguna, parameter kompresi Google Drive, master lokasi, dan pengaturan sistem Hotel Lombok Garden.
            </p>
          </div>

          {errorMsg && (
            <div className="bg-rose-500/15 border border-rose-500/40 rounded-xl p-3 text-xs text-rose-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Master Security Key */}
          <div>
            <label className="block text-xs font-semibold text-[#D9DF98] mb-1.5">
              Master Security Key (Passphrase) <span className="text-[#FFBC7D]">*</span>
            </label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={masterKey}
                onChange={(e) => setMasterKey(e.target.value)}
                placeholder="Masukkan Master Key..."
                required
                className="w-full pl-9 pr-10 py-2.5 bg-[#2E2824] border border-[#453D37] rounded-xl text-xs font-mono text-white placeholder-[#877465] focus:outline-none focus:border-[#95A823] focus:ring-1 focus:ring-[#95A823]"
              />
              <KeyRound className="w-4 h-4 text-[#877465] absolute left-3 top-3" />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-3 text-[#C6CC81] hover:text-white"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Security PIN */}
          <div>
            <label className="block text-xs font-semibold text-[#D9DF98] mb-1.5">
              6-Digit Admin Security PIN <span className="text-[#FFBC7D]">*</span>
            </label>
            <div className="relative">
              <input
                type="password"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                placeholder="••••••"
                required
                className="w-full pl-9 pr-3 py-2.5 bg-[#2E2824] border border-[#453D37] rounded-xl text-xs font-mono text-white placeholder-[#877465] tracking-widest focus:outline-none focus:border-[#95A823] focus:ring-1 focus:ring-[#95A823] text-center text-sm"
              />
              <Lock className="w-4 h-4 text-[#877465] absolute left-3 top-3" />
            </div>
          </div>

          {/* Quick Demo Helper */}
          <div className="bg-[#2E2824]/60 rounded-xl p-2.5 border border-[#453D37] flex items-center justify-between text-[11px]">
            <span className="text-[#C6CC81]">Kredensial Default Sistem:</span>
            <button
              type="button"
              onClick={handleUseDefault}
              className="text-[#FFBC7D] hover:text-[#FFAE64] font-bold underline"
            >
              Isi Otomatis Kredensial
            </button>
          </div>

          {/* Buttons */}
          <div className="pt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-[#453D37] text-[#D9DF98] text-xs font-semibold hover:bg-[#2E2824] transition"
            >
              Batal
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-[#95A823] hover:bg-[#83941F] text-white text-xs font-bold shadow-lg shadow-[#95A823]/25 transition flex items-center justify-center gap-1.5"
            >
              <ShieldCheck className="w-4 h-4 text-white" />
              <span>Verifikasi &amp; Masuk</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
