import React, { useEffect, useState } from 'react';
import { WifiOff, Wifi } from 'lucide-react';

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();
  const [showAlert, setShowAlert] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setShowAlert(true);
    }
  }, [isOnline]);

  if (isOnline && !showAlert) return null;

  return (
    <div className="fixed bottom-5 left-5 z-50 flex items-center gap-2.5 rounded-2xl bg-[#C25941] px-4 py-3 text-xs font-bold text-white shadow-2xl border border-white/20 animate-bounce">
      <WifiOff className="w-4 h-4 shrink-0" />
      <div>
        <p className="leading-tight">Mode Offline Aktif</p>
        <p className="text-[10px] text-[#FFBC7D] font-normal">Menggunakan cache lokal PWA</p>
      </div>
      {isOnline && (
        <button
          onClick={() => setShowAlert(false)}
          className="ml-2 px-2 py-0.5 rounded bg-black/20 hover:bg-black/40 text-white text-[10px]"
        >
          Tutup
        </button>
      )}
    </div>
  );
};
