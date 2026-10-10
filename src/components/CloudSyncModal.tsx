import React, { useState } from 'react';
import { 
  X, 
  Cloud, 
  RefreshCw, 
  CheckCircle2, 
  HardDrive, 
  Sparkles, 
  ExternalLink, 
  Check, 
  FolderCheck,
  FolderOpen
} from 'lucide-react';
import { CloudSyncState, ModReportItem } from '../types';
import { calculateStorageSavings } from '../services/storageService';
import { formatBytes } from '../services/imageCompressionService';
import { getDriveFolderUrl, extractDriveFolderId } from '../services/driveSyncService';

interface CloudSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  syncState: CloudSyncState;
  reports: ModReportItem[];
  onTriggerSync: () => void;
  onToggleAutoSync: (enabled: boolean) => void;
}

export const CloudSyncModal: React.FC<CloudSyncModalProps> = ({
  isOpen,
  onClose,
  syncState,
  reports,
  onTriggerSync,
  onToggleAutoSync,
}) => {
  if (!isOpen) return null;

  const storageStats = calculateStorageSavings(reports);
  const [copied, setCopied] = useState(false);

  const cleanFolderId = extractDriveFolderId(syncState.driveFolderId);
  const driveFolderUrl = getDriveFolderUrl(cleanFolderId);

  const copyFolderLink = () => {
    navigator.clipboard.writeText(driveFolderUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#1A1614]/85 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl flex flex-col border border-[#E2E7B8]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#3D352F] flex items-center justify-between bg-[#231E1B] text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#95A823] flex items-center justify-center text-white shadow-md shadow-[#95A823]/30">
              <Cloud className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">
                Sinkronisasi Cloud &amp; Google Drive
              </h3>
              <p className="text-xs text-[#C6CC81]">
                Penyimpanan terdistribusi Hotel Lombok Garden
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#362E2A] text-slate-300 hover:text-white flex items-center justify-center transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Status Box */}
          <div className="bg-[#FAFBF5] border border-[#C6CC81] rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#95A823] text-white flex items-center justify-center shadow-xs">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-[#231E1B]">
                  Koneksi Cloud LOGAR Aktif
                </p>
                <p className="text-[11px] text-[#70635A] mt-0.5">
                  Terakhir sinkron: {syncState.lastSyncedAt ? new Date(syncState.lastSyncedAt).toLocaleString('id-ID') : 'Baru saja'}
                </p>
              </div>
            </div>

            <button
              onClick={onTriggerSync}
              disabled={syncState.isSyncing}
              className="px-3 py-1.5 bg-[#95A823] hover:bg-[#83941F] text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncState.isSyncing ? 'animate-spin' : ''}`} />
              <span>{syncState.isSyncing ? 'Menyinkronkan...' : 'Sinkron Sekarang'}</span>
            </button>
          </div>

          {/* Auto-Sync Toggle */}
          <div className="flex items-center justify-between p-3.5 bg-[#FAFBF5] rounded-2xl border border-[#D9DF98]">
            <div>
              <p className="text-xs font-bold text-[#231E1B]">
                Otomatis Sinkronisasi ke Cloud
              </p>
              <p className="text-[11px] text-[#70635A]">
                Setiap laporan baru langsung dicadangkan saat terhubung internet
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={syncState.isAutoSyncEnabled}
                onChange={(e) => onToggleAutoSync(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-[#D9DF98] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[#C6CC81] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#95A823]"></div>
            </label>
          </div>

          {/* Google Drive Storage Efficiency Box */}
          <div className="bg-[#231E1B] text-white rounded-2xl p-4 space-y-3 border border-[#3D352F]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#EAEEBB] flex items-center gap-1.5">
                <HardDrive className="w-4 h-4 text-[#95A823]" />
                Folder Google Drive Hotel
              </span>
              <span className="text-[10px] bg-[#95A823]/25 text-[#EAEEBB] border border-[#95A823]/50 px-2 py-0.5 rounded-full font-bold">
                Terkoneksi
              </span>
            </div>

            <div className="bg-[#2E2824] p-3 rounded-xl border border-[#453D37] text-xs">
              <p className="text-[#C6CC81] text-[11px]">Nama Folder Cloud:</p>
              <p className="font-bold text-white truncate mt-0.5">
                {syncState.driveFolderName}
              </p>
              <p className="text-[#877465] text-[11px] mt-1 font-mono">
                Folder ID: {cleanFolderId}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center pt-1 text-xs">
              <div className="bg-[#2E2824] p-2 rounded-xl border border-[#453D37]/50">
                <p className="text-[10px] text-[#C6CC81]">Total Bukti</p>
                <p className="font-bold text-white text-sm mt-0.5">
                  {storageStats.totalPictures} File
                </p>
              </div>
              <div className="bg-[#2E2824] p-2 rounded-xl border border-[#453D37]/50">
                <p className="text-[10px] text-[#C6CC81]">Setelah Kompres</p>
                <p className="font-bold text-[#EAEEBB] text-sm mt-0.5">
                  {formatBytes(storageStats.compressedBytes)}
                </p>
              </div>
              <div className="bg-[#2E2824] p-2 rounded-xl border border-[#453D37]/50">
                <p className="text-[10px] text-[#C6CC81]">Kapasitas Hemat</p>
                <p className="font-bold text-[#95A823] text-sm mt-0.5">
                  {storageStats.percentageSaved}%
                </p>
              </div>
            </div>

            <div className="pt-2 flex items-center gap-2">
              <a
                href={driveFolderUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2 px-3 bg-[#95A823] hover:bg-[#83941F] text-white text-xs font-bold rounded-xl transition text-center flex items-center justify-center gap-1.5 shadow-sm"
              >
                <FolderOpen className="w-3.5 h-3.5" />
                <span>Buka Google Drive Hotel</span>
                <ExternalLink className="w-3 h-3 ml-0.5" />
              </a>
              <button
                type="button"
                onClick={copyFolderLink}
                className="py-2 px-3 bg-[#2E2824] hover:bg-[#3B332E] text-[#D9DF98] border border-[#453D37] text-xs font-semibold rounded-xl transition flex items-center gap-1"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-[#95A823]" /> : <FolderCheck className="w-3.5 h-3.5" />}
                <span>{copied ? 'Tersalin' : 'Salin Link'}</span>
              </button>
            </div>
          </div>

          {/* Firebase Firestore Real-time Database Card */}
          <div className="bg-gradient-to-br from-[#1E2B14] to-[#231E1B] text-white rounded-2xl p-4 space-y-2.5 border border-[#95A823]/40 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#EAEEBB] animate-ping"></span>
                <span className="text-xs font-bold text-[#EAEEBB]">
                  Firebase Firestore Real-Time
                </span>
              </div>
              <span className="text-[10px] bg-[#95A823] text-white px-2 py-0.5 rounded-full font-bold">
                Tersinkronisasi
              </span>
            </div>

            <p className="text-[11px] text-[#D9DF98] leading-relaxed">
              Sinkronisasi real-time multi-perangkat dan multi-IP aktif. Setiap perubahan pengguna, hak akses, laporan MOD, dan pengaturan oleh Super Admin langsung tersinkronkan seketika ke seluruh perangkat lain.
            </p>

            <div className="bg-[#171D12]/70 rounded-xl p-2.5 border border-[#95A823]/30 text-[10px] space-y-1 font-mono text-[#C6CC81]">
              <div className="flex justify-between">
                <span>Database:</span>
                <span className="text-white font-semibold">ai-studio-modreportlogar</span>
              </div>
              <div className="flex justify-between">
                <span>Entitas:</span>
                <span className="text-[#EAEEBB]">Users &bull; Settings &bull; Reports &bull; Audit</span>
              </div>
              <div className="flex justify-between">
                <span>Multi-IP Sync:</span>
                <span className="text-[#EAEEBB] font-bold">Aktif &amp; Siaga</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-[#F8F9F3] border-t border-[#E2E7B8] flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#EAEBD9] hover:bg-[#DFE1CA] text-[#231E1B] text-xs font-bold rounded-xl transition"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
