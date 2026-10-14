import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Upload, 
  Camera, 
  Image as ImageIcon, 
  Sparkles, 
  CheckCircle2, 
  HardDrive, 
  Building2, 
  AlertCircle,
  FileCheck,
  Trash2,
  Calendar,
  Clock,
  Lock,
  ShieldCheck,
  ExternalLink,
  FolderOpen
} from 'lucide-react';
import { 
  ModReportItem, 
  Department, 
  ReportStatus, 
  PriorityLevel, 
  ShiftType, 
  UserProfile, 
  PictureItem 
} from '../types';
import { HOTEL_LOCATIONS, HOTEL_DEPARTMENTS } from '../data/initialData';
import { compressImage, createDrivePictureItem, formatBytes } from '../services/imageCompressionService';
import { getSystemSettings } from '../services/systemSettingsService';
import { uploadPhotoToGoogleDrive, getDriveFolderUrl } from '../services/driveSyncService';

interface NewReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (report: ModReportItem) => void;
  currentUser: UserProfile;
}

export const NewReportModal: React.FC<NewReportModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  currentUser,
}) => {
  if (!isOpen) return null;

  // Date & Time Helpers
  const formatDateToMDY = (d: Date): string => {
    return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
  };

  const formatDateToISO = (d: Date): string => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const parseDateFromAny = (val: string): Date => {
    if (!val) return new Date();
    if (val.includes('-')) {
      const [y, m, d] = val.split('-').map(Number);
      return new Date(y, (m || 1) - 1, d || 1);
    }
    if (val.includes('/')) {
      const [m, d, y] = val.split('/').map(Number);
      return new Date(y || 2026, (m || 1) - 1, d || 1);
    }
    return new Date();
  };

  const formatIndonesianDateLong = (dStr: string): string => {
    try {
      const d = parseDateFromAny(dStr);
      const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
      return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
    } catch {
      return dStr;
    }
  };

  // Auto-detect shift based on inspection hour
  const getAutoShift = (d: Date): ShiftType => {
    const hour = d.getHours();
    if (hour >= 7 && hour < 15) return 'Pagi (07:00 - 15:00)';
    if (hour >= 15 && hour < 23) return 'Sore (15:00 - 23:00)';
    return 'Malam (23:00 - 07:00)';
  };

  // Form State - Default realtime
  const initialNow = new Date();
  const [date, setDate] = useState(formatDateToMDY(initialNow));
  const [dateISO, setDateISO] = useState(formatDateToISO(initialNow));
  const [time, setTime] = useState(
    `${String(initialNow.getHours()).padStart(2, '0')}:${String(initialNow.getMinutes()).padStart(2, '0')}:${String(initialNow.getSeconds()).padStart(2, '0')}`
  );
  const [shift, setShift] = useState<ShiftType>(getAutoShift(initialNow));
  const [location, setLocation] = useState(HOTEL_LOCATIONS[0]);
  const [customLocation, setCustomLocation] = useState('');
  const [problem, setProblem] = useState('');
  const [followUpDept, setFollowUpDept] = useState<Department>('None');
  const [status, setStatus] = useState<ReportStatus>('Aman');
  const [priority, setPriority] = useState<PriorityLevel>('Rendah');

  // Petugas MOD strictly locked to current logged in user
  const officerName = currentUser.name;

  // Real-time live date and time ticker: otomatis mencatat waktu saat ini & user tidak bisa mengubahnya
  useEffect(() => {
    if (!isOpen) return;

    const updateToRealtime = () => {
      const current = new Date();
      setDate(formatDateToMDY(current));
      setDateISO(formatDateToISO(current));
      const hours = String(current.getHours()).padStart(2, '0');
      const minutes = String(current.getMinutes()).padStart(2, '0');
      const seconds = String(current.getSeconds()).padStart(2, '0');
      setTime(`${hours}:${minutes}:${seconds}`);
      setShift(getAutoShift(current));
    };

    updateToRealtime();
    const intervalTimer = setInterval(updateToRealtime, 1000);
    return () => clearInterval(intervalTimer);
  }, [isOpen]);
  
  // Pictures and compression state
  const [isCompressing, setIsCompressing] = useState(false);
  const [uploadedPictures, setUploadedPictures] = useState<PictureItem[]>([]);
  const [totalOriginalSize, setTotalOriginalSize] = useState(0);
  const [totalCompressedSize, setTotalCompressedSize] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle image upload with auto-compression
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsCompressing(true);
    try {
      const settings = getSystemSettings();
      const folderId = settings.driveFolderId || '1LG_MOD_DRIVE_FOLDER_2026';
      const folderName = settings.driveFolderName || 'HOTEL LOMBOK GARDEN / MOD REPORTS 2026';
      const maxDim = settings.maxImageDimension || 1280;
      const quality = settings.compressionQuality || 0.72;

      const newItems: PictureItem[] = [];
      let origSum = 0;
      let compSum = 0;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        // Compress based on Super Admin settings
        const compressed = await compressImage(file, maxDim, Math.round(maxDim * 0.75), quality);
        const picItem = createDrivePictureItem(compressed, folderId, folderName);

        // Automatically upload / link to the configured Google Drive folder
        const uploadResult = await uploadPhotoToGoogleDrive(picItem, folderId, settings.driveWebhookUrl, folderName);
        newItems.push(uploadResult.picture);

        origSum += compressed.originalSizeBytes;
        compSum += compressed.compressedSizeBytes;
      }

      setUploadedPictures(prev => [...prev, ...newItems]);
      setTotalOriginalSize(prev => prev + origSum);
      setTotalCompressedSize(prev => prev + compSum);
    } catch (err) {
      console.error('Compression error:', err);
      alert('Terjadi kesalahan saat memproses gambar.');
    } finally {
      setIsCompressing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemovePicture = (id: string) => {
    setUploadedPictures(prev => {
      const removed = prev.find(p => p.id === id);
      if (removed) {
        setTotalOriginalSize(orig => Math.max(0, orig - (removed.originalSizeBytes || 0)));
        setTotalCompressedSize(comp => Math.max(0, comp - (removed.compressedSizeBytes || 0)));
      }
      return prev.filter(p => p.id !== id);
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const finalLocation = customLocation.trim() || location;
    const finalProblem = problem.trim();

    // Area Grouping
    const locLower = finalLocation.toLowerCase();
    let areaGroup = 'Public Area';
    if (locLower.includes('deluxe') || locLower.includes('kamar') || locLower.includes('floor') || locLower.includes('lantai')) {
      areaGroup = 'Deluxe & Rooms';
    } else if (locLower.includes('resto') || locLower.includes('kitchen') || locLower.includes('pantry')) {
      areaGroup = 'F&B & Resto';
    } else if (locLower.includes('pool') || locLower.includes('kolam') || locLower.includes('garden')) {
      areaGroup = 'Pool & Garden';
    } else if (locLower.includes('parkir') || locLower.includes('lobby')) {
      areaGroup = 'Lobby & Parking';
    } else if (locLower.includes('melati') || locLower.includes('edelweis') || locLower.includes('hall')) {
      areaGroup = 'Meeting & Ballrooms';
    } else if (locLower.includes('genset') || locLower.includes('laundry') || locLower.includes('loker') || locLower.includes('gudang')) {
      areaGroup = 'Back of House';
    }

    // Ensure all pictures have folder metadata and synced status
    const settings = getSystemSettings();
    const folderId = settings.driveFolderId || '1LG_MOD_DRIVE_FOLDER_2026';
    const folderName = settings.driveFolderName || 'HOTEL LOMBOK GARDEN / MOD REPORTS 2026';
    const finalPictures = uploadedPictures.map(p => {
      const isReallyOnDrive = Boolean(p.uploadedToDrive && p.driveId && !p.driveId.startsWith('pic-') && !p.driveId.startsWith('file-') && !p.driveId.startsWith('local-'));
      return {
        ...p,
        driveFolderId: p.driveFolderId || folderId,
        driveFolderName: p.driveFolderName || folderName,
        driveUrl: p.driveUrl || getDriveFolderUrl(folderId),
        uploadedToDrive: isReallyOnDrive,
        uploadStatus: isReallyOnDrive ? ('synced' as const) : ('local' as const),
      };
    });

    const newReport: ModReportItem = {
      id: `rep-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: `${date} ${time}`,
      date,
      time,
      officerName,
      location: finalLocation,
      areaGroup,
      problem: finalProblem,
      followUpDept,
      status,
      priority,
      pictures: finalPictures,
      shift,
      synced: true,
      syncedAt: new Date().toISOString(),
      ...(status === 'Selesai' ? {
        resolvedAt: new Date().toISOString(),
        resolvedBy: officerName,
      } : {}),
    };

    onSubmit(newReport);
    onClose();
  };

  const savedPercent = totalOriginalSize > 0 
    ? Math.round(((totalOriginalSize - totalCompressedSize) / totalOriginalSize) * 100) 
    : 0;

  return (
    <div className="fixed inset-0 z-50 bg-[#1A1614]/85 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] overflow-hidden shadow-2xl flex flex-col border border-[#E2E7B8]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#3D352F] flex items-center justify-between bg-[#231E1B] text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#95A823] flex items-center justify-center text-white font-black shadow-md shadow-[#95A823]/30">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">
                Form Input Laporan MOD LOGAR
              </h3>
              <p className="text-xs text-[#C6CC81]">
                Catat hasil inspeksi lapangan, kondisi area, dan upload bukti pendukung
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          {/* Row 1: Petugas MOD (Locked to Login) & Shift */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-[#231E1B]">
                  Petugas MOD / Duty Manager <span className="text-[#C25941]">*</span>
                </label>
                <span className="text-[10px] text-[#5B6713] bg-[#EAEEBB] border border-[#C6CC81] px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                  <Lock className="w-3 h-3 text-[#7B8C1B]" />
                  Terkunci Sesuai Akun Login
                </span>
              </div>
              
              <div className="p-2.5 rounded-xl border border-[#D9DF98] bg-[#FAFBF5] flex items-center justify-between shadow-2xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <img
                    src={currentUser.avatar}
                    alt={currentUser.name}
                    className="w-8 h-8 rounded-lg object-cover border-2 border-[#95A823] shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="font-bold text-xs text-[#231E1B] leading-tight truncate">
                        {currentUser.name}
                      </p>
                      <span className="text-[9px] font-bold bg-[#95A823]/20 text-[#5B6713] px-1.5 py-0.2 rounded border border-[#95A823]/30 shrink-0">
                        {currentUser.role}
                      </span>
                    </div>
                    <p className="text-[10px] text-[#877465] leading-tight mt-0.5 truncate">
                      Dept: <span className="text-[#231E1B] font-semibold">{currentUser.department}</span> &bull; @{currentUser.username || currentUser.email.split('@')[0]}
                    </p>
                  </div>
                </div>

                <div className="text-right text-[10px] text-[#70635A] hidden md:block shrink-0 pl-2">
                  <span className="inline-flex items-center gap-1 text-[#5B6713] font-semibold bg-white px-2 py-0.5 rounded-md border border-[#D9DF98]">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#95A823]" />
                    Terverifikasi
                  </span>
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-[#231E1B]">
                  Shift Kerja Operasional <span className="text-[#C25941]">*</span>
                </label>
                <span className="text-[10px] text-[#877465]">
                  Otomatis terhubung dengan jam
                </span>
              </div>
              <select
                value={shift}
                onChange={(e) => setShift(e.target.value as ShiftType)}
                required
                className="w-full px-3 py-3 text-xs rounded-xl border border-[#D9DF98] bg-[#FAFBF5] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#95A823]/20 focus:border-[#95A823] font-semibold text-[#231E1B]"
              >
                <option value="Pagi (07:00 - 15:00)">Pagi (07:00 - 15:00)</option>
                <option value="Sore (15:00 - 23:00)">Sore (15:00 - 23:00)</option>
                <option value="Malam (23:00 - 07:00)">Malam (23:00 - 07:00)</option>
                <option value="General">General / Non-Shift</option>
              </select>
            </div>
          </div>

          {/* Row 2: Tanggal & Waktu Inspeksi Lapangan (Default Realtime & Terkunci) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Tanggal Inspeksi (Real-Time Terkunci) */}
            <div className="p-3.5 rounded-2xl bg-[#FAFBF5] border border-[#E2E7B8] space-y-2">
              <div className="flex items-center justify-between gap-1">
                <label className="text-xs font-bold text-[#231E1B] flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#95A823]" />
                  <span>Tanggal Inspeksi</span>
                  <span className="text-[#C25941]">*</span>
                </label>
                <span className="text-[10px] text-[#5B6713] font-semibold bg-[#EAEEBB] px-2 py-0.5 rounded-full border border-[#C6CC81] flex items-center gap-1 shrink-0">
                  <Lock className="w-3 h-3 text-[#7B8C1B]" />
                  Realtime (Terkunci)
                </span>
              </div>

              <div>
                <div className="w-full px-3 py-2.5 text-xs rounded-xl border border-[#D9DF98] bg-[#F4F6EA]/70 font-mono font-bold text-[#231E1B] flex items-center justify-between select-none cursor-not-allowed shadow-2xs">
                  <span className="font-semibold text-xs text-[#231E1B] truncate mr-2">{formatIndonesianDateLong(date)}</span>
                  <span className="text-[10px] text-[#5B6713] bg-white px-2 py-0.5 rounded border border-[#C6CC81] font-mono shrink-0">
                    {dateISO}
                  </span>
                </div>
                <p className="text-[10px] text-[#70635A] mt-1.5 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#95A823] shrink-0" />
                  <span>Tanggal inspeksi terkunci otomatis sesuai kalender resmi hotel.</span>
                </p>
              </div>
            </div>

            {/* Jam / Waktu Patroli (Real-Time Terkunci) */}
            <div className="p-3.5 rounded-2xl bg-[#FAFBF5] border border-[#E2E7B8] space-y-2">
              <div className="flex items-center justify-between gap-1">
                <label className="text-xs font-bold text-[#231E1B] flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#95A823]" />
                  <span>Jam Patroli</span>
                  <span className="text-[#C25941]">*</span>
                </label>
                <span className="text-[10px] text-[#5B6713] font-semibold bg-[#EAEEBB] px-2 py-0.5 rounded-full border border-[#C6CC81] flex items-center gap-1 shrink-0">
                  <Lock className="w-3 h-3 text-[#7B8C1B]" />
                  Realtime (Terkunci)
                </span>
              </div>

              <div>
                <div className="w-full px-3 py-2.5 text-xs rounded-xl border border-[#D9DF98] bg-[#F4F6EA]/70 font-mono font-bold text-[#231E1B] flex items-center justify-between select-none cursor-not-allowed shadow-2xs">
                  <span className="text-sm font-black text-[#231E1B] tracking-wider font-mono flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#95A823] animate-pulse"></span>
                    {time}
                  </span>
                  <span className="text-[10px] text-[#7B8C1B] font-mono font-bold bg-[#EAEEBB] px-2 py-0.5 rounded-full border border-[#C6CC81] shrink-0">
                    Live Realtime
                  </span>
                </div>
                <p className="text-[10px] text-[#70635A] mt-1.5 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#95A823] shrink-0" />
                  <span>Jam patroli terekam langsung detik ini saat temuan ditemukan.</span>
                </p>
              </div>
            </div>
          </div>

          {/* Row 3: Location */}
          <div>
            <label className="block text-xs font-bold text-[#231E1B] mb-1">
              Titik Area / Lokasi Hotel <span className="text-[#C25941]">*</span>
            </label>
            <select
              value={location}
              onChange={(e) => {
                setLocation(e.target.value);
                setCustomLocation('');
              }}
              className="w-full px-3 py-2 text-xs rounded-xl border border-[#D9DF98] bg-[#FAFBF5] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#95A823]/20 focus:border-[#95A823] font-semibold text-[#231E1B] mb-2"
            >
              {HOTEL_LOCATIONS.map(loc => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
              <option value="Lainnya">Lainnya (Ketik Manual)...</option>
            </select>
            {location === 'Lainnya' && (
              <input
                type="text"
                placeholder="Ketik nama spesifik area atau nomor kamar (cth: Kamar 285, Koridor Lantai 4 Barat)..."
                value={customLocation}
                onChange={(e) => setCustomLocation(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs rounded-xl border border-[#95A823] bg-[#FAFBF5] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#95A823]/20 text-[#231E1B]"
              />
            )}
          </div>

          {/* Row 4: Problem / Finding */}
          <div>
            <label className="block text-xs font-bold text-[#231E1B] mb-1">
              Catatan Temuan / Kondisi Lapangan <span className="text-[#C25941]">*</span>
            </label>
            <textarea
              rows={3}
              value={problem}
              onChange={(e) => setProblem(e.target.value)}
              placeholder="Ketik catatan temuan atau kondisi lapangan di sini (cth: Rembesan dinding koridor, lampu mati, persiapan meeting, sikon area)..."
              required
              className="w-full px-3 py-2 text-xs rounded-xl border border-[#D9DF98] bg-[#FAFBF5] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#95A823]/20 focus:border-[#95A823] text-[#231E1B]"
            />
          </div>

          {/* Row 5: Follow-Up Dept & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#231E1B] mb-1">
                Tindak Lanjut Departemen
              </label>
              <select
                value={followUpDept}
                onChange={(e) => setFollowUpDept(e.target.value as Department)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-[#D9DF98] bg-[#FAFBF5] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#95A823]/20 font-semibold text-[#231E1B]"
              >
                <option value="None">Tidak Ada (Aman)</option>
                {HOTEL_DEPARTMENTS.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#231E1B] mb-1">
                Status Temuan
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ReportStatus)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-[#D9DF98] bg-[#FAFBF5] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#95A823]/20 font-bold text-[#231E1B]"
              >
                <option value="Aman">Aman / Bersih</option>
                <option value="Perlu Follow Up">Perlu Follow Up</option>
                <option value="Dalam Proses">Dalam Proses</option>
                <option value="Selesai">Tuntas Selesai</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#231E1B] mb-1">
                Prioritas
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as PriorityLevel)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-[#D9DF98] bg-[#FAFBF5] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#95A823]/20 font-bold text-[#231E1B]"
              >
                <option value="Rendah">Rendah</option>
                <option value="Normal">Normal</option>
                <option value="Tinggi">Tinggi</option>
                <option value="Urgent">Urgent / Segera</option>
              </select>
            </div>
          </div>

          {/* Section: Google Drive & Photo Upload with Compression */}
          <div className="pt-2 border-t border-[#F0F2E2]">
            <div className="flex items-center justify-between mb-2">
              <div>
                <label className="text-xs font-bold text-[#231E1B] flex items-center gap-1.5">
                  <HardDrive className="w-4 h-4 text-[#95A823]" />
                  Bukti Pendukung Google Drive (Auto-Kompresi)
                </label>
                <p className="text-[11px] text-[#70635A]">
                  Gambar akan dikompresi otomatis &gt;90% sebelum di-link ke Google Drive untuk menghemat ruang.
                </p>
              </div>

              {totalOriginalSize > 0 && (
                <span className="text-[10px] font-bold bg-[#EAEEBB] text-[#5B6713] px-2.5 py-0.5 rounded-full border border-[#C6CC81]">
                  Hemat {savedPercent}% ({formatBytes(totalOriginalSize - totalCompressedSize)})
                </span>
              )}
            </div>

            {/* Upload Drag/Click Zone */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              multiple
              accept="image/*,.pdf,.doc,.docx"
              className="hidden"
            />

            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-[#D9DF98] hover:border-[#95A823] bg-[#FAFBF5] hover:bg-[#F4F6EA] rounded-2xl p-4 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2 group"
            >
              <div className="w-10 h-10 rounded-full bg-white shadow-xs flex items-center justify-center text-[#877465] group-hover:text-[#95A823] group-hover:scale-105 transition">
                {isCompressing ? (
                  <Sparkles className="w-5 h-5 text-[#95A823] animate-spin" />
                ) : (
                  <Upload className="w-5 h-5" />
                )}
              </div>
              <div>
                <p className="text-xs font-bold text-[#231E1B]">
                  {isCompressing ? 'Sedang Mengompres Gambar...' : 'Klik atau Tarik File Foto / Dokumen dari Perangkat'}
                </p>
                <p className="text-[11px] text-[#70635A] mt-0.5">
                  Kamera HP, Galeri, JPG, PNG, atau PDF (Otomatis kompres dan simpan ke Google Drive)
                </p>
                <div className="mt-1.5 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#EAEEBB] border border-[#C6CC81] text-[10px] text-[#5B6713] font-semibold">
                  <HardDrive className="w-3 h-3 text-[#7B8C1B]" />
                  <span>Folder Drive: {getSystemSettings().driveFolderName}</span>
                </div>
              </div>
            </div>

            {/* Uploaded File Previews */}
            {uploadedPictures.length > 0 && (
              <div className="mt-3 space-y-2">
                <p className="text-[11px] font-bold text-[#231E1B]">
                  File Siap Tersinkron ({uploadedPictures.length} item):
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {uploadedPictures.map((pic) => (
                    <div
                      key={pic.id}
                      className="p-2.5 rounded-2xl bg-[#FAFBF5] border border-[#D9DF98] text-xs space-y-1.5 shadow-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 overflow-hidden">
                          {pic.thumbnailUrl ? (
                            <img
                              src={pic.thumbnailUrl}
                              alt="preview"
                              className="w-10 h-10 rounded-xl object-cover border border-[#C6CC81] shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-xl bg-[#EAEEBB] flex items-center justify-center text-[#70635A] shrink-0">
                              <ImageIcon className="w-5 h-5" />
                            </div>
                          )}
                          <div className="truncate">
                            <p className="font-bold text-[#231E1B] truncate text-[11px]">
                              {pic.name}
                            </p>
                            <p className="text-[10px] text-[#70635A]">
                              {formatBytes(pic.compressedSizeBytes)} <span className="text-[#95A823] font-bold">(-{pic.compressionRatio}%)</span>
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemovePicture(pic.id)}
                          className="text-[#877465] hover:text-[#C25941] p-1.5 hover:bg-[#FBEBE7] rounded-lg transition shrink-0 cursor-pointer"
                          title="Hapus foto"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Google Drive Folder Sync Badge */}
                      <div className="flex items-center justify-between pt-1.5 border-t border-[#EAEED0] text-[10px]">
                        {pic.uploadedToDrive ? (
                          <span className="inline-flex items-center gap-1 font-semibold text-[#5B6713] truncate">
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#95A823] shrink-0" />
                            <span className="truncate">Tersimpan di Google Drive</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 font-semibold text-[#8C5311] truncate" title="Foto disimpan di server lokal hotel. Akan otomatis diupload ke Google Drive saat Webhook aktif.">
                            <HardDrive className="w-3.5 h-3.5 text-[#E68A00] shrink-0" />
                            <span className="truncate">Server Lokal (Siap ke Drive)</span>
                          </span>
                        )}
                        <a
                          href={pic.driveUrl || getDriveFolderUrl(pic.driveFolderId || getSystemSettings().driveFolderId)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[#7B8C1B] hover:text-[#5B6713] font-bold shrink-0 ml-1 hover:underline"
                        >
                          <span>{pic.uploadedToDrive ? 'Lihat File' : 'Buka Folder'}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-[#F0F2E2] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-[#70635A] hover:text-[#231E1B] hover:bg-[#FAFBF5] rounded-xl transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isCompressing}
              className="px-5 py-2.5 text-xs font-bold bg-[#95A823] hover:bg-[#83941F] text-white rounded-xl shadow-md shadow-[#95A823]/25 transition flex items-center gap-1.5 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Simpan Laporan MOD</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
