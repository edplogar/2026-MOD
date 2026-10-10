import React, { useState, useRef } from 'react';
import { 
  X, 
  User, 
  ShieldCheck, 
  LogOut, 
  Building2, 
  Mail, 
  Phone,
  Clock,
  Lock,
  CheckCircle2,
  Camera,
  Upload,
  Sparkles,
  RotateCcw,
  Image as ImageIcon
} from 'lucide-react';
import { UserProfile } from '../types';
import { updateUser } from '../services/authService';
import { compressImage, formatBytes } from '../services/imageCompressionService';
import { saveUserToFirestore } from '../services/firebase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onLogout?: () => void;
  onUpdateUser?: (updated: UserProfile) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onLogout,
  onUpdateUser,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadFeedback, setUploadFeedback] = useState<string | null>(null);

  if (!isOpen) return null;

  // Handle direct file upload from user's device (phone camera, gallery, file explorer)
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Mohon pilih file gambar yang valid (JPG, PNG, WEBP).');
      return;
    }

    setIsUploading(true);
    setUploadFeedback(null);

    try {
      // Auto-compress avatar: max 400x400, quality 0.82 (crisp yet ultra lightweight ~25-45KB)
      const compressed = await compressImage(file, 400, 400, 0.82);

      // Persist in local storage & active session
      const updatedUser = updateUser(currentUser.id, { avatar: compressed.dataUrl });

      if (updatedUser) {
        // Sync to Firebase Firestore cloud database
        await saveUserToFirestore(updatedUser).catch(err => {
          console.warn('Real-time sync to Firestore deferred:', err);
        });

        // Notify parent component to update active state across UI
        if (onUpdateUser) {
          onUpdateUser(updatedUser);
        }

        setUploadFeedback(`Foto profil berhasil diunggah (${formatBytes(compressed.compressedSizeBytes)})!`);
        setTimeout(() => setUploadFeedback(null), 4000);
      }
    } catch (err: any) {
      console.error('Failed uploading profile photo:', err);
      alert('Gagal mengunggah foto profil: ' + (err.message || 'Format tidak didukung'));
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleResetToDefaultAvatar = async () => {
    if (window.confirm('Kembalikan foto profil ke avatar standar sistem?')) {
      setIsUploading(true);
      try {
        const defaultAvatar = `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80`;
        const updatedUser = updateUser(currentUser.id, { avatar: defaultAvatar });
        if (updatedUser) {
          await saveUserToFirestore(updatedUser).catch(console.warn);
          if (onUpdateUser) {
            onUpdateUser(updatedUser);
          }
          setUploadFeedback('Foto profil dikembalikan ke default.');
          setTimeout(() => setUploadFeedback(null), 3000);
        }
      } finally {
        setIsUploading(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#1A1614]/85 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl flex flex-col border border-[#E2E7B8] animate-in fade-in zoom-in-95 duration-150 max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#3D352F] flex items-center justify-between bg-[#231E1B] text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#95A823] flex items-center justify-center text-white shadow-md shadow-[#95A823]/30">
              <User className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">
                Profil Petugas Aktif
              </h3>
              <p className="text-xs text-[#C6CC81]">
                Identitas &amp; Foto Akun Sistem MOD LOGAR
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#362E2A] text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4">
          {/* Active User Card with Interactive Avatar Upload */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-[#231E1B] to-[#362E2A] text-white flex flex-col sm:flex-row items-center sm:items-start gap-4 shadow-sm border border-[#4A3F38]">
            {/* Avatar with Camera Trigger */}
            <div className="relative group shrink-0">
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className="w-20 h-20 rounded-2xl object-cover border-2 border-[#95A823] shadow-md bg-[#1A1614]"
              />

              {/* Hover overlay button to trigger file input */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="absolute inset-0 rounded-2xl bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white"
                title="Klik untuk mengganti foto dari perangkat"
              >
                <Camera className="w-5 h-5 text-[#EAEEBB]" />
                <span className="text-[9px] font-bold mt-1 text-[#EAEEBB]">Ganti Foto</span>
              </button>

              {/* Camera icon badge */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="absolute -bottom-1 -right-1 w-7 h-7 rounded-xl bg-[#95A823] hover:bg-[#83941F] text-white flex items-center justify-center shadow-md border-2 border-[#231E1B] transition cursor-pointer"
                title="Unggah foto profil dari perangkat"
              >
                {isUploading ? (
                  <Sparkles className="w-3.5 h-3.5 text-white animate-spin" />
                ) : (
                  <Camera className="w-3.5 h-3.5 text-white" />
                )}
              </button>
            </div>

            {/* User Meta Information */}
            <div className="flex-1 min-w-0 text-center sm:text-left">
              <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2">
                <h4 className="font-bold text-sm text-white truncate">
                  {currentUser.name}
                </h4>
                <span className="text-[10px] font-bold bg-[#95A823]/30 text-[#EAEEBB] px-2 py-0.5 rounded-full border border-[#95A823]/50 inline-block self-center sm:self-auto shrink-0">
                  {currentUser.role}
                </span>
              </div>
              <p className="text-xs text-[#C6CC81] font-mono mt-0.5 truncate">
                @{currentUser.username || currentUser.email.split('@')[0]}
              </p>
              <p className="text-[11px] text-[#EAEEBB] mt-0.5 truncate flex items-center justify-center sm:justify-start gap-1.5">
                <Building2 className="w-3 h-3 text-[#C6CC81]" />
                Departemen: {currentUser.department}
              </p>
            </div>
          </div>

          {/* Hidden File Input for Device Upload */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
          />

          {/* Dedicated Photo Upload Actions Card */}
          <div className="bg-[#FAFBF5] border border-[#D9DF98] rounded-2xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#231E1B] flex items-center gap-1.5">
                <Upload className="w-4 h-4 text-[#95A823]" />
                Foto Profil dari Perangkat
              </span>
              <span className="text-[10px] text-[#70635A] font-semibold bg-[#EAEEBB] px-2 py-0.5 rounded-md border border-[#C6CC81]">
                Galeri &bull; Kamera HP &bull; File
              </span>
            </div>

            <p className="text-[11px] text-[#70635A]">
              Pilih foto asli dari memori perangkat atau ambil foto baru langsung dengan kamera ponsel. Gambar akan otomatis dioptimasi secara instan.
            </p>

            <div className="flex items-center gap-2 pt-1 flex-wrap">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="flex-1 min-w-[170px] flex items-center justify-center gap-2 px-3.5 py-2 bg-[#95A823] hover:bg-[#83941F] text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer disabled:opacity-50"
              >
                {isUploading ? (
                  <>
                    <Sparkles className="w-4 h-4 animate-spin" />
                    <span>Memproses Foto...</span>
                  </>
                ) : (
                  <>
                    <Camera className="w-4 h-4" />
                    <span>Pilih Foto dari Perangkat</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleResetToDefaultAvatar}
                disabled={isUploading}
                className="px-3 py-2 bg-white hover:bg-[#F2F4DE] text-[#70635A] hover:text-[#231E1B] border border-[#D9DF98] rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                title="Kembalikan foto profil default"
              >
                <RotateCcw className="w-3.5 h-3.5 text-[#877465]" />
                <span>Reset</span>
              </button>
            </div>

            {/* Success Feedback Alert */}
            {uploadFeedback && (
              <div className="flex items-center gap-2 p-2 rounded-xl bg-[#E8F0E4] border border-[#A8CC98] text-[#43752E] text-xs font-semibold animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-[#43752E] shrink-0" />
                <span>{uploadFeedback}</span>
              </div>
            )}
          </div>

          {/* User Details Grid */}
          <div className="bg-[#FAFBF5] border border-[#E2E7B8] rounded-2xl p-4 space-y-2.5 text-xs text-[#231E1B]">
            <div className="flex items-center justify-between pb-2 border-b border-[#F0F2E2]">
              <span className="text-[#877465] flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-[#95A823]" /> Email Terdaftar:
              </span>
              <span className="font-semibold text-[#231E1B] truncate max-w-[200px]">{currentUser.email}</span>
            </div>

            <div className="flex items-center justify-between pb-2 border-b border-[#F0F2E2]">
              <span className="text-[#877465] flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-[#95A823]" /> Nomor Kontak:
              </span>
              <span className="font-mono font-medium">{currentUser.phone || '-'}</span>
            </div>

            <div className="flex items-center justify-between pb-2 border-b border-[#F0F2E2]">
              <span className="text-[#877465] flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#95A823]" /> Status Akun:
              </span>
              <span className="px-2 py-0.5 bg-[#EAEEBB] text-[#5B6713] rounded-full text-[10px] font-bold border border-[#C6CC81]">
                Aktif (Active)
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[#877465] flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#95A823]" /> Sesi Login:
              </span>
              <span className="text-[#5B6713] font-semibold">{currentUser.lastActive || 'Sedang aktif'}</span>
            </div>
          </div>

          {/* Security Policy Notice */}
          <div className="p-3.5 rounded-2xl bg-[#F8F9F3] border border-[#E2E7B8] text-xs text-[#70635A] space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-[#231E1B]">
              <Lock className="w-3.5 h-3.5 text-[#95A823]" />
              <span>Sinkronisasi Foto Profil Real-Time</span>
            </div>
            <p className="text-[11px] leading-relaxed text-[#877465]">
              Foto profil yang diunggah akan tersimpan di cloud Firebase dan langsung tampil pada seluruh laporan inspeksi MOD, navigasi, dan identitas petugas.
            </p>
          </div>
        </div>

        {/* Footer with Logout / Switch Account via Credentials */}
        <div className="px-6 py-3.5 bg-[#F8F9F3] border-t border-[#E2E7B8] flex items-center justify-between text-xs">
          {onLogout && (
            <button
              onClick={() => {
                onClose();
                onLogout();
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-[#FBEBE7] text-[#C25941] border border-[#F2D7D0] font-bold transition cursor-pointer shadow-xs"
              title="Keluar dari sesi untuk login dengan akun lain"
            >
              <LogOut className="w-3.5 h-3.5 text-[#C25941]" />
              <span>Keluar Sesi</span>
            </button>
          )}

          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#EAEBD9] hover:bg-[#DFE1CA] text-[#231E1B] font-bold rounded-xl transition cursor-pointer ml-auto"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
