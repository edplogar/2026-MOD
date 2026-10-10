import React, { useState, useRef } from 'react';
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

  // Form State
  const now = new Date();
  const currentDateStr = formatDateToMDY(now);
  const currentDateISO = formatDateToISO(now);
  const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:00`;

  // Petugas MOD strictly locked to current logged in user
  const officerName = currentUser.name;
  const [date, setDate] = useState(currentDateStr);
  const [dateISO, setDateISO] = useState(currentDateISO);
  const [time, setTime] = useState(currentTimeStr);
  const [shift, setShift] = useState<ShiftType>('Sore (15:00 - 23:00)');
  const [location, setLocation] = useState(HOTEL_LOCATIONS[0]);
  const [customLocation, setCustomLocation] = useState('');
  const [problem, setProblem] = useState('');
  const [followUpDept, setFollowUpDept] = useState<Department>('None');
  const [status, setStatus] = useState<ReportStatus>('Aman');
  const [priority, setPriority] = useState<PriorityLevel>('Rendah');

  // Shift auto-suggest based on inspection hour
  const suggestShiftForTime = (timeStr: string) => {
    const hour = parseInt(timeStr.split(':')[0], 10);
    if (!isNaN(hour)) {
      if (hour >= 7 && hour < 15) {
        setShift('Pagi (07:00 - 15:00)');
      } else if (hour >= 15 && hour < 23) {
        setShift('Sore (15:00 - 23:00)');
      } else {
        setShift('Malam (23:00 - 07:00)');
      }
    }
  };

  // Date handlers
  const handleDateCalendarChange = (valISO: string) => {
    setDateISO(valISO);
    if (valISO) {
      const [y, m, day] = valISO.split('-').map(Number);
      const d = new Date(y, (m || 1) - 1, day || 1);
      setDate(formatDateToMDY(d));
    }
  };

  // Time handlers
  const handleTimePickerChange = (val: string) => {
    if (!val) return;
    const finalTime = val.length === 5 ? `${val}:00` : val;
    setTime(finalTime);
    suggestShiftForTime(finalTime);
  };
  
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
    const finalPictures = uploadedPictures.map(p => ({
      ...p,
      driveFolderId: p.driveFolderId || folderId,
      driveFolderName: p.driveFolderName || folderName,
      driveUrl: p.driveUrl || getDriveFolderUrl(folderId),
      uploadedToDrive: true,
      uploadStatus: 'synced' as const,
    }));

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

          {/* Row 2: Tanggal & Waktu Inspeksi Lapangan */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Tanggal Inspeksi (Kalender Date Picker) */}
            <div className="p-3.5 rounded-2xl bg-[#FAFBF5] border border-[#E2E7B8] space-y-2">
              <div className="flex items-center justify-between gap-1">
                <label className="text-xs font-bold text-[#231E1B] flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#95A823]" />
                  <span>Tanggal Inspeksi</span>
                  <span className="text-[#C25941]">*</span>
                </label>
                <span className="text-[10px] text-[#5B6713] font-semibold bg-[#EAEEBB] px-2 py-0.5 rounded-full border border-[#C6CC81] truncate max-w-[150px]">
                  {formatIndonesianDateLong(date)}
                </span>
              </div>

              <div>
                <input
                  type="date"
                  value={dateISO}
                  onChange={(e) => handleDateCalendarChange(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 text-xs rounded-xl border border-[#D9DF98] bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#95A823]/20 focus:border-[#95A823] font-mono font-semibold text-[#231E1B] cursor-pointer"
                  title="Buka kalender untuk memilih tanggal inspeksi"
                />
              </div>
            </div>

            {/* Jam / Waktu Patroli (Time Picker) */}
            <div className="p-3.5 rounded-2xl bg-[#FAFBF5] border border-[#E2E7B8] space-y-2">
              <div className="flex items-center justify-between gap-1">
                <label className="text-xs font-bold text-[#231E1B] flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#95A823]" />
                  <span>Jam Patroli</span>
                  <span className="text-[#C25941]">*</span>
                </label>
                <span className="text-[10px] text-[#7B8C1B] font-mono font-bold bg-[#EAEEBB] px-2 py-0.5 rounded-full border border-[#C6CC81]">
                  {time} WITA / WIB
                </span>
              </div>

              <div>
                <input
                  type="time"
                  step="1"
                  value={time}
                  onChange={(e) => handleTimePickerChange(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 text-xs rounded-xl border border-[#D9DF98] bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#95A823]/20 focus:border-[#95A823] font-mono font-bold text-[#231E1B] cursor-pointer"
                  title="Pilih jam dan menit spesifik"
                />
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
                        <span className="inline-flex items-center gap-1 font-semibold text-[#5B6713] truncate">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#95A823] shrink-0" />
                          <span className="truncate">Folder Drive: <strong className="text-[#231E1B]">{pic.driveFolderName || getSystemSettings().driveFolderName}</strong></span>
                        </span>
                        <a
                          href={pic.driveUrl || getDriveFolderUrl(pic.driveFolderId || getSystemSettings().driveFolderId)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[#7B8C1B] hover:text-[#5B6713] font-bold shrink-0 ml-1 hover:underline"
                        >
                          <span>Buka Drive</span>
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
