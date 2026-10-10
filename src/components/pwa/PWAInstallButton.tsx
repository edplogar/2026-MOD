import React, { useState } from 'react';
import { Download, Smartphone, X, Sparkles } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

export const PWAInstallButton: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running as an installed PWA, hide the button
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        onClick={install}
        className={`flex items-center gap-2 bg-[#95A823] hover:bg-[#83941F] text-white font-bold transition shadow-md shadow-[#95A823]/30 cursor-pointer ${
          compact ? 'px-2.5 py-1.5 rounded-xl text-xs' : 'px-3.5 py-2 rounded-2xl text-xs sm:text-sm'
        }`}
        title="Install PWA MOD LOGAR di perangkat Anda"
      >
        <Download className="w-4 h-4 shrink-0" />
        <span>Install App</span>
      </button>
    );
  }

  // iOS Safari or manual fallback / always accessible install trigger
  if (isIOS || !compact) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className={`flex items-center gap-2 bg-[#231E1B] hover:bg-[#38302A] text-[#EAEEBB] hover:text-white font-bold border border-white/20 transition shadow-sm cursor-pointer ${
            compact ? 'px-2.5 py-1.5 rounded-xl text-xs' : 'px-3.5 py-2 rounded-2xl text-xs sm:text-sm'
          }`}
          title="Panduan Install PWA Hotel Lombok Garden"
        >
          <Smartphone className="w-4 h-4 text-[#95A823] shrink-0" />
          <span>Install PWA</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1A1614]/85 backdrop-blur-xs p-4 animate-fade-in">
            <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl border border-[#E2E7B8] text-[#231E1B]">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#95A823] text-white flex items-center justify-center font-bold">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-black text-base text-[#231E1B]">Install Aplikasi MOD LOGAR</h3>
                    <p className="text-xs text-[#70635A]">Hotel Lombok Garden</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="w-8 h-8 rounded-full bg-[#F4F6EA] text-[#61554D] hover:bg-[#EAEEBB] flex items-center justify-center transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs text-[#61554D] bg-[#FAFBF5] p-4 rounded-2xl border border-[#E2E7B8]">
                {isIOS ? (
                  <>
                    <p className="font-bold text-[#231E1B]">Panduan Pengguna iOS (Safari):</p>
                    <ol className="list-decimal list-inside space-y-1.5">
                      <li>Ketuk tombol <strong>Share</strong> (ikon panah keluar) di bilah bawah Safari.</li>
                      <li>Gulir menu dan ketuk <strong>Add to Home Screen</strong> (Tambah ke Layar Utama).</li>
                      <li>Ketuk <strong>Add</strong> di sudut kanan atas. Aplikasi siap digunakan seperti aplikasi native!</li>
                    </ol>
                  </>
                ) : (
                  <>
                    <p className="font-bold text-[#231E1B]">Panduan Install Cepat:</p>
                    <ol className="list-decimal list-inside space-y-1.5">
                      <li>Buka menu titik tiga (⋮) di browser Chrome / Edge / Android Anda.</li>
                      <li>Pilih <strong>Install app</strong> atau <strong>Add to Home screen</strong>.</li>
                      <li>Nikmati akses offline instan & performa kilat MOD LOGAR!</li>
                    </ol>
                  </>
                )}
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full py-2.5 rounded-2xl bg-[#95A823] hover:bg-[#83941F] text-white font-bold text-xs shadow-md shadow-[#95A823]/25 transition cursor-pointer"
              >
                Mengerti &amp; Tutup
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
