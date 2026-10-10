import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Upload, 
  Link as LinkIcon, 
  Sparkles, 
  Check, 
  RefreshCw, 
  Image as ImageIcon, 
  Eye, 
  Layers, 
  Palette, 
  CheckCircle2, 
  AlertCircle,
  Building2,
  Shield,
  Leaf,
  Sliders,
  Type,
  Maximize2
} from 'lucide-react';
import { HotelBrandingConfig, LogoShape, UserProfile } from '../types';
import { getHotelBranding, updateHotelBranding, DEFAULT_BRANDING } from '../services/systemSettingsService';
import { HotelFlowerIcon, LogarLogo, getShapeClass } from './LogarLogo';

interface ChangeLogoModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: UserProfile | null;
  onSuccess?: (newBranding: HotelBrandingConfig) => void;
}

const BRAND_PALETTE = [
  { name: 'Olive Green (Resmi)', hex: '#95A823', desc: 'Warna hijau zaitun khas Lombok Garden' },
  { name: 'Forest Deep Green', hex: '#5D6B19', desc: 'Hijau hutan tropis teduh' },
  { name: 'Emerald Garden', hex: '#2E7D32', desc: 'Hijau zamrud lanskap taman' },
  { name: 'Dark Timber Earth', hex: '#231E1B', desc: 'Kayu gelap kayu jati hotel' },
  { name: 'Espresso Timber', hex: '#1A1614', desc: 'Hitam arang eksklusif' },
  { name: 'Warm Earth Stone', hex: '#877465', desc: 'Batu alam hangat Lombok' },
  { name: 'Royal Amber Gold', hex: '#D4AF37', desc: 'Aksen emas elegan' },
  { name: 'Sunset Terracotta', hex: '#C25941', desc: 'Terracotta hangat matahari terbenam' },
  { name: 'Deep Lagoon Navy', hex: '#1B3B4B', desc: 'Biru kolam renang garden pool' },
];

export const ChangeLogoModal: React.FC<ChangeLogoModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'url' | 'presets' | 'style'>('upload');
  const [previewContext, setPreviewContext] = useState<'navbar' | 'login' | 'badge' | 'pdf'>('navbar');
  
  // Branding state form
  const [branding, setBranding] = useState<HotelBrandingConfig>(() => getHotelBranding());
  const [urlInput, setUrlInput] = useState('');
  const [urlTestLoading, setUrlTestLoading] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);

  // Upload file handling
  const [isDragging, setIsDragging] = useState(false);
  const [uploadInfo, setUploadInfo] = useState<{
    fileName?: string;
    fileSize?: string;
    dimensions?: string;
    compressionInfo?: string;
  } | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Sync with current branding on modal open
  useEffect(() => {
    if (isOpen) {
      const current = getHotelBranding();
      setBranding(current);
      if (current.logoUrl && current.logoUrl.startsWith('http')) {
        setUrlInput(current.logoUrl);
      } else {
        setUrlInput('');
      }
      setUploadInfo(null);
      setSaveSuccessMsg(null);
      setUrlError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Process and compress image file via Canvas
  const processImageFile = (file: File) => {
    if (!file.type.match(/image\/(png|jpeg|jpg|webp|svg\+xml)/)) {
      alert('Format file tidak didukung. Harap pilih gambar bertipe PNG, JPG, JPEG, WEBP, atau SVG.');
      return;
    }

    setIsProcessingFile(true);
    const originalSizeKb = (file.size / 1024).toFixed(1);

    const reader = new FileReader();
    reader.onload = (e) => {
      const resultDataUrl = e.target?.result as string;

      // If SVG, keep as is
      if (file.type === 'image/svg+xml') {
        setBranding(prev => ({
          ...prev,
          logoUrl: resultDataUrl,
          customIconType: 'custom_image',
        }));
        setUploadInfo({
          fileName: file.name,
          fileSize: `${originalSizeKb} KB (Vektor SVG)`,
          dimensions: 'Resolusi Bebas (Scalable)',
          compressionInfo: 'Format Vektor SVG Siap Digunakan',
        });
        setIsProcessingFile(false);
        return;
      }

      // Create Image to compress & normalize
      const img = new Image();
      img.onload = () => {
        const maxWidth = 600;
        const maxHeight = 600;
        let { width, height } = img;

        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (ctx) {
          // Transparent PNG handling
          ctx.clearRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);

          // If PNG with transparency, output as PNG, else JPEG
          const outputType = file.type === 'image/png' ? 'image/png' : 'image/webp';
          const compressedDataUrl = canvas.toDataURL(outputType, 0.92);
          const compressedSizeKb = (compressedDataUrl.length * (3 / 4) / 1024).toFixed(1);

          setBranding(prev => ({
            ...prev,
            logoUrl: compressedDataUrl,
            customIconType: 'custom_image',
          }));

          setUploadInfo({
            fileName: file.name,
            fileSize: `${compressedSizeKb} KB (Asli: ${originalSizeKb} KB)`,
            dimensions: `${width} x ${height} px`,
            compressionInfo: `Terkonsolidasi & Terkompresi Otomatis`,
          });
        }
        setIsProcessingFile(false);
      };
      img.onerror = () => {
        alert('Gagal memuat file gambar.');
        setIsProcessingFile(false);
      };
      img.src = resultDataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processImageFile(e.dataTransfer.files[0]);
    }
  };

  // Convert Google Drive sharing URL to direct image URL
  const convertDriveUrlToDirect = (url: string): string => {
    const trimmed = url.trim();
    const driveMatch = trimmed.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (driveMatch && driveMatch[1]) {
      return `https://lh3.googleusercontent.com/d/${driveMatch[1]}`;
    }
    const idParamMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (idParamMatch && idParamMatch[1] && trimmed.includes('drive.google.com')) {
      return `https://lh3.googleusercontent.com/d/${idParamMatch[1]}`;
    }
    return trimmed;
  };

  const handleApplyUrl = () => {
    setUrlError(null);
    if (!urlInput.trim()) {
      setUrlError('Harap masukkan URL tautan gambar.');
      return;
    }

    setUrlTestLoading(true);
    const directUrl = convertDriveUrlToDirect(urlInput);

    const testImg = new Image();
    testImg.onload = () => {
      setUrlTestLoading(false);
      setBranding(prev => ({
        ...prev,
        logoUrl: directUrl,
        customIconType: 'custom_image',
      }));
      setUploadInfo({
        fileName: 'Tautan URL Eksternal',
        fileSize: 'URL Langsung',
        dimensions: `${testImg.width} x ${testImg.height} px`,
        compressionInfo: directUrl.includes('googleusercontent') ? 'Google Drive Direct Image' : 'Web Image Link',
      });
    };
    testImg.onerror = () => {
      setUrlTestLoading(false);
      setUrlError('Gagal memuat gambar dari URL tersebut. Pastikan URL dapat diakses publik atau izin link Google Drive disetel "Siapa saja yang memiliki tautan".');
    };
    testImg.src = directUrl;
  };

  // Save changes to System Settings and sync across app
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const actor = currentUser ? `${currentUser.name} (${currentUser.role})` : 'Super Admin';
      const updated = updateHotelBranding(branding, actor);
      
      setSaveSuccessMsg('Logo & Identitas Hotel Lombok Garden berhasil diperbarui & disinkronkan secara real-time!');
      if (onSuccess && updated.branding) {
        onSuccess(updated.branding);
      }

      setTimeout(() => {
        setIsSaving(false);
        onClose();
      }, 1000);
    } catch (err: any) {
      alert(`Terjadi kesalahan saat menyimpan: ${err?.message || 'Gagal menyimpan'}`);
      setIsSaving(false);
    }
  };

  // Reset to default Lombok Garden 5-petal flower emblem
  const handleResetToDefault = () => {
    if (confirm('Kembalikan ke emblem logo resmi bunga 5 kelopak Hotel Lombok Garden?')) {
      setBranding({
        ...DEFAULT_BRANDING,
        logoShape: branding.logoShape || 'rounded',
      });
      setUrlInput('');
      setUploadInfo(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-[#FAFBF5] text-[#231E1B] rounded-3xl w-full max-w-4xl shadow-2xl border border-[#E2E7B8] overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-[#231E1B] px-6 py-4 border-b border-[#3D352F] flex items-center justify-between text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#95A823] flex items-center justify-center text-white shadow-md shadow-[#95A823]/30">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
                  Pengubah Logo &amp; Ikon Brand Hotel
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#95A823]/30 text-[#EAEEBB] border border-[#95A823]/50">
                  Real-Time Sync
                </span>
              </div>
              <p className="text-xs text-[#C6CC81] font-medium">
                Hotel Lombok Garden &bull; Kustomisasi Logo, Bentuk, Warna, &amp; Tipografi
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-[#2E2824] hover:bg-[#3B332E] text-[#D9DF98] hover:text-white flex items-center justify-center transition border border-[#453D37]"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Split into Left Config Tabs and Right Live Multi-Context Preview */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-[#E2E7B8]">
          {/* Left Column: Configuration Controls (7 cols) */}
          <div className="lg:col-span-7 p-5 sm:p-6 space-y-6">
            {/* Top Navigation Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-[#EEF2CE] rounded-2xl border border-[#D9DF98]">
              <button
                type="button"
                onClick={() => setActiveTab('upload')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition ${
                  activeTab === 'upload'
                    ? 'bg-[#95A823] text-white shadow-xs'
                    : 'text-[#5C534D] hover:text-[#231E1B] hover:bg-white/50'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload File</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('url')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition ${
                  activeTab === 'url'
                    ? 'bg-[#95A823] text-white shadow-xs'
                    : 'text-[#5C534D] hover:text-[#231E1B] hover:bg-white/50'
                }`}
              >
                <LinkIcon className="w-3.5 h-3.5" />
                <span>Tautan URL</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('presets')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition ${
                  activeTab === 'presets'
                    ? 'bg-[#95A823] text-white shadow-xs'
                    : 'text-[#5C534D] hover:text-[#231E1B] hover:bg-white/50'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Ikon Bawaan</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('style')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition ${
                  activeTab === 'style'
                    ? 'bg-[#95A823] text-white shadow-xs'
                    : 'text-[#5C534D] hover:text-[#231E1B] hover:bg-white/50'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Bentuk &amp; Teks</span>
              </button>
            </div>

            {/* TAB 1: UPLOAD FILE GAMBAR */}
            {activeTab === 'upload' && (
              <div className="space-y-4 animate-fadeIn">
                <div>
                  <h3 className="text-sm font-bold text-[#231E1B] flex items-center gap-2">
                    <Upload className="w-4 h-4 text-[#95A823]" />
                    <span>Unggah File Gambar Logo Kustom</span>
                  </h3>
                  <p className="text-xs text-[#70635A] mt-0.5">
                    Mendukung file PNG (transparan direkomendasikan), JPG, JPEG, WebP, dan SVG langsung dari komputer atau HP.
                  </p>
                </div>

                {/* Drag and Drop Box */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-3xl p-6 text-center cursor-pointer transition-all ${
                    isDragging
                      ? 'border-[#95A823] bg-[#EAEEBB]/30 scale-[1.01]'
                      : 'border-[#C6CC81] hover:border-[#95A823] bg-white hover:bg-[#FAFBF5]'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        processImageFile(e.target.files[0]);
                      }
                    }}
                    className="hidden"
                  />

                  <div className="w-14 h-14 rounded-2xl bg-[#EEF2CE] text-[#95A823] flex items-center justify-center mx-auto mb-3 shadow-inner">
                    {isProcessingFile ? (
                      <RefreshCw className="w-6 h-6 animate-spin" />
                    ) : (
                      <ImageIcon className="w-6 h-6" />
                    )}
                  </div>

                  <p className="text-sm font-extrabold text-[#231E1B]">
                    {isProcessingFile ? 'Sedang Memproses & Mengompres...' : 'Klik untuk Memilih File atau Seret ke Sini'}
                  </p>
                  <p className="text-xs text-[#877465] mt-1">
                    Format: PNG Transparan, JPG, WebP, SVG &bull; Kompresi Otomatis
                  </p>
                </div>

                {/* Upload Status Info Card */}
                {uploadInfo && (
                  <div className="p-3.5 rounded-2xl bg-[#E8EDC4]/50 border border-[#C6CC81] text-xs space-y-1.5">
                    <div className="flex items-center justify-between font-bold text-[#231E1B]">
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-[#95A823]" />
                        <span>File Berhasil Dimuat</span>
                      </span>
                      <span className="text-[11px] text-[#5D6B19] bg-white px-2 py-0.5 rounded-md border border-[#C6CC81]">
                        {uploadInfo.dimensions}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px] text-[#5C534D] pt-1">
                      <div><span className="font-semibold text-[#231E1B]">File:</span> {uploadInfo.fileName}</div>
                      <div><span className="font-semibold text-[#231E1B]">Ukuran:</span> {uploadInfo.fileSize}</div>
                    </div>
                    <div className="text-[10px] text-[#5D6B19] font-medium italic">
                      &bull; {uploadInfo.compressionInfo}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: TAUTAN URL GAMBAR */}
            {activeTab === 'url' && (
              <div className="space-y-4 animate-fadeIn">
                <div>
                  <h3 className="text-sm font-bold text-[#231E1B] flex items-center gap-2">
                    <LinkIcon className="w-4 h-4 text-[#95A823]" />
                    <span>Tautan URL Gambar (Web atau Google Drive)</span>
                  </h3>
                  <p className="text-xs text-[#70635A] mt-0.5">
                    Masukkan URL link gambar langsung dari website atau link share Google Drive.
                  </p>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-[#231E1B] mb-1.5">
                      URL Gambar Logo:
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        value={urlInput}
                        onChange={(e) => {
                          setUrlInput(e.target.value);
                          setUrlError(null);
                        }}
                        placeholder="https://example.com/logo.png atau https://drive.google.com/file/d/..."
                        className="flex-1 px-3.5 py-2.5 rounded-xl border border-[#C6CC81] bg-white text-xs text-[#231E1B] focus:outline-none focus:ring-2 focus:ring-[#95A823]"
                      />
                      <button
                        type="button"
                        onClick={handleApplyUrl}
                        disabled={urlTestLoading}
                        className="px-4 py-2.5 rounded-xl bg-[#95A823] hover:bg-[#7B8C1B] text-white font-bold text-xs flex items-center gap-1.5 transition shrink-0 disabled:opacity-50"
                      >
                        {urlTestLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        <span>Terapkan</span>
                      </button>
                    </div>
                  </div>

                  {urlError && (
                    <div className="p-3 rounded-xl bg-[#FBEBE7] border border-[#F2D7D0] text-xs text-[#C25941] flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{urlError}</span>
                    </div>
                  )}

                  <div className="p-3 rounded-2xl bg-[#EEF2CE]/70 border border-[#D9DF98] text-[11px] text-[#5C534D] space-y-1">
                    <p className="font-bold text-[#231E1B] flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-[#95A823]" />
                      Tips Google Drive Link:
                    </p>
                    <p className="leading-relaxed">
                      Cukup salin link Google Drive Anda (misal: <code className="bg-white px-1 py-0.5 rounded text-[10px]">https://drive.google.com/file/d/ABC123XYZ/view</code>). Sistem akan otomatis mengubahnya menjadi format direct image.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: IKON BAWAAN HOTEL */}
            {activeTab === 'presets' && (
              <div className="space-y-4 animate-fadeIn">
                <div>
                  <h3 className="text-sm font-bold text-[#231E1B] flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#95A823]" />
                    <span>Pilih Ikon Bawaan Hotel Lombok Garden</span>
                  </h3>
                  <p className="text-xs text-[#70635A] mt-0.5">
                    Gunakan salah satu dari koleksi simbol resmi bawaan sistem LOGAR.
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {/* Preset 1: Official Flower */}
                  <button
                    type="button"
                    onClick={() => {
                      setBranding(prev => ({
                        ...prev,
                        logoUrl: '',
                        customIconType: 'default_flower',
                      }));
                    }}
                    className={`p-3.5 rounded-2xl border text-center transition flex flex-col items-center justify-between gap-2.5 ${
                      !branding.logoUrl && (branding.customIconType === 'default_flower' || !branding.customIconType)
                        ? 'border-[#95A823] bg-[#EAEEBB]/40 ring-2 ring-[#95A823]'
                        : 'border-[#D9DF98] bg-white hover:bg-[#FAFBF5]'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-xl bg-[#95A823] flex items-center justify-center p-1.5 shadow-sm text-white">
                      <HotelFlowerIcon className="w-full h-full" color="#FFFFFF" centerColor="#EAEEBB" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#231E1B]">Bunga 5 Kelopak</p>
                      <p className="text-[10px] text-[#877465]">Emblem Resmi LOGAR</p>
                    </div>
                  </button>

                  {/* Preset 2: Resort Building */}
                  <button
                    type="button"
                    onClick={() => {
                      setBranding(prev => ({
                        ...prev,
                        logoUrl: '',
                        customIconType: 'building',
                      }));
                    }}
                    className={`p-3.5 rounded-2xl border text-center transition flex flex-col items-center justify-between gap-2.5 ${
                      !branding.logoUrl && branding.customIconType === 'building'
                        ? 'border-[#95A823] bg-[#EAEEBB]/40 ring-2 ring-[#95A823]'
                        : 'border-[#D9DF98] bg-white hover:bg-[#FAFBF5]'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-xl bg-[#95A823] flex items-center justify-center p-2 shadow-sm text-white">
                      <Building2 className="w-full h-full text-white" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#231E1B]">Hotel &amp; Resort</p>
                      <p className="text-[10px] text-[#877465]">Bangunan Properti</p>
                    </div>
                  </button>

                  {/* Preset 3: Security & MOD Shield */}
                  <button
                    type="button"
                    onClick={() => {
                      setBranding(prev => ({
                        ...prev,
                        logoUrl: '',
                        customIconType: 'shield',
                      }));
                    }}
                    className={`p-3.5 rounded-2xl border text-center transition flex flex-col items-center justify-between gap-2.5 ${
                      !branding.logoUrl && branding.customIconType === 'shield'
                        ? 'border-[#95A823] bg-[#EAEEBB]/40 ring-2 ring-[#95A823]'
                        : 'border-[#D9DF98] bg-white hover:bg-[#FAFBF5]'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-xl bg-[#95A823] flex items-center justify-center p-2 shadow-sm text-white">
                      <Shield className="w-full h-full text-white" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#231E1B]">MOD Shield</p>
                      <p className="text-[10px] text-[#877465]">Pengawasan &amp; Kontrol</p>
                    </div>
                  </button>

                  {/* Preset 4: Garden Leaf */}
                  <button
                    type="button"
                    onClick={() => {
                      setBranding(prev => ({
                        ...prev,
                        logoUrl: '',
                        customIconType: 'leaf',
                      }));
                    }}
                    className={`p-3.5 rounded-2xl border text-center transition flex flex-col items-center justify-between gap-2.5 ${
                      !branding.logoUrl && branding.customIconType === 'leaf'
                        ? 'border-[#95A823] bg-[#EAEEBB]/40 ring-2 ring-[#95A823]'
                        : 'border-[#D9DF98] bg-white hover:bg-[#FAFBF5]'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-xl bg-[#95A823] flex items-center justify-center p-2 shadow-sm text-white">
                      <Leaf className="w-full h-full text-white" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#231E1B]">Garden Leaf</p>
                      <p className="text-[10px] text-[#877465]">Green Garden</p>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* TAB 4: BENTUK, WARNA, & TIPOGRAFI BRAND */}
            <div className="space-y-4 pt-2 border-t border-[#E2E7B8]">
              {/* Shape Selector */}
              <div>
                <label className="block text-xs font-extrabold text-[#231E1B] mb-2 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-[#95A823]" />
                  <span>Bentuk Wadah Ikon Logo:</span>
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setBranding(prev => ({ ...prev, logoShape: 'rounded' }))}
                    className={`p-2.5 rounded-2xl border flex items-center justify-center gap-2 text-xs font-bold transition ${
                      branding.logoShape === 'rounded'
                        ? 'border-[#95A823] bg-[#EAEEBB]/50 text-[#231E1B] ring-2 ring-[#95A823]'
                        : 'border-[#D9DF98] bg-white text-[#5C534D] hover:bg-[#FAFBF5]'
                    }`}
                  >
                    <div className="w-5 h-5 rounded-lg bg-[#95A823]"></div>
                    <span>Rounded (Modern)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBranding(prev => ({ ...prev, logoShape: 'circle' }))}
                    className={`p-2.5 rounded-2xl border flex items-center justify-center gap-2 text-xs font-bold transition ${
                      branding.logoShape === 'circle'
                        ? 'border-[#95A823] bg-[#EAEEBB]/50 text-[#231E1B] ring-2 ring-[#95A823]'
                        : 'border-[#D9DF98] bg-white text-[#5C534D] hover:bg-[#FAFBF5]'
                    }`}
                  >
                    <div className="w-5 h-5 rounded-full bg-[#95A823]"></div>
                    <span>Circle (Bulat)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBranding(prev => ({ ...prev, logoShape: 'square' }))}
                    className={`p-2.5 rounded-2xl border flex items-center justify-center gap-2 text-xs font-bold transition ${
                      branding.logoShape === 'square'
                        ? 'border-[#95A823] bg-[#EAEEBB]/50 text-[#231E1B] ring-2 ring-[#95A823]'
                        : 'border-[#D9DF98] bg-white text-[#5C534D] hover:bg-[#FAFBF5]'
                    }`}
                  >
                    <div className="w-5 h-5 rounded-xs bg-[#95A823]"></div>
                    <span>Square (Kotak)</span>
                  </button>
                </div>
              </div>

              {/* Color Palette Selector */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-extrabold text-[#231E1B] flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5 text-[#95A823]" />
                    <span>Warna Latar Ikon (Palet Lombok Garden):</span>
                  </label>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-[#877465]">Custom:</span>
                    <input
                      type="color"
                      value={branding.bgColor || '#95A823'}
                      onChange={(e) => setBranding(prev => ({ ...prev, bgColor: e.target.value }))}
                      className="w-6 h-6 rounded-md border border-[#C6CC81] cursor-pointer p-0.5 bg-white"
                      title="Pilih Warna Kustom Bebas"
                    />
                    <input
                      type="text"
                      value={branding.bgColor || '#95A823'}
                      onChange={(e) => setBranding(prev => ({ ...prev, bgColor: e.target.value }))}
                      className="w-18 px-2 py-0.5 text-[10px] font-mono rounded border border-[#C6CC81] bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-9 gap-1.5">
                  {BRAND_PALETTE.map((pal) => (
                    <button
                      key={pal.hex}
                      type="button"
                      onClick={() => setBranding(prev => ({ ...prev, bgColor: pal.hex }))}
                      className={`h-9 rounded-xl flex items-center justify-center transition-all ${
                        branding.bgColor?.toLowerCase() === pal.hex.toLowerCase()
                          ? 'ring-2 ring-offset-2 ring-[#231E1B] scale-105 shadow-md'
                          : 'hover:scale-105 opacity-90 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: pal.hex }}
                      title={`${pal.name} (${pal.hex})`}
                    >
                      {branding.bgColor?.toLowerCase() === pal.hex.toLowerCase() && (
                        <Check className="w-4 h-4 text-white drop-shadow-xs" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Typography Text Settings */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-xs font-bold text-[#231E1B] mb-1">
                    Judul Brand Hotel:
                  </label>
                  <input
                    type="text"
                    value={branding.brandTitle || 'LOMBOK GARDEN'}
                    onChange={(e) => setBranding(prev => ({ ...prev, brandTitle: e.target.value }))}
                    className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-[#C6CC81] bg-white"
                    placeholder="LOMBOK GARDEN"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#231E1B] mb-1">
                    Subjudul / Label Laporan:
                  </label>
                  <input
                    type="text"
                    value={branding.brandSubtitle || 'HOTEL • REPORT LOGAR'}
                    onChange={(e) => setBranding(prev => ({ ...prev, brandSubtitle: e.target.value }))}
                    className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-[#C6CC81] bg-white"
                    placeholder="HOTEL • REPORT LOGAR"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#231E1B] mb-1">
                    Badge Singkatan Menu:
                  </label>
                  <input
                    type="text"
                    value={branding.badgeText || 'MOD'}
                    onChange={(e) => setBranding(prev => ({ ...prev, badgeText: e.target.value }))}
                    className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-[#C6CC81] bg-white"
                    placeholder="MOD"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#231E1B] mb-1">
                    Tagline Resmi Properti:
                  </label>
                  <input
                    type="text"
                    value={branding.tagline || 'Experience the Green of the City'}
                    onChange={(e) => setBranding(prev => ({ ...prev, tagline: e.target.value }))}
                    className="w-full px-3 py-2 text-xs font-medium italic rounded-xl border border-[#C6CC81] bg-white font-serif"
                    placeholder="Experience the Green of the City"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Live Multi-Context Interactive Preview (5 cols) */}
          <div className="lg:col-span-5 p-5 sm:p-6 bg-[#FAF6F0] flex flex-col justify-between space-y-5">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-black text-[#231E1B] uppercase tracking-wider flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-[#95A823]" />
                  <span>Pratinjau Langsung (Live Preview)</span>
                </h3>
                <span className="text-[10px] text-[#5D6B19] font-bold bg-[#EAEEBB] px-2 py-0.5 rounded-md">
                  Aktif Real-Time
                </span>
              </div>

              {/* Preview Context Switcher */}
              <div className="grid grid-cols-4 gap-1 p-1 bg-[#E2E7B8] rounded-xl mb-4 text-[10px] font-bold">
                <button
                  type="button"
                  onClick={() => setPreviewContext('navbar')}
                  className={`py-1.5 rounded-lg transition ${
                    previewContext === 'navbar' ? 'bg-[#231E1B] text-white' : 'text-[#5C534D] hover:bg-white/40'
                  }`}
                >
                  Navbar
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewContext('login')}
                  className={`py-1.5 rounded-lg transition ${
                    previewContext === 'login' ? 'bg-[#231E1B] text-white' : 'text-[#5C534D] hover:bg-white/40'
                  }`}
                >
                  Login Card
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewContext('badge')}
                  className={`py-1.5 rounded-lg transition ${
                    previewContext === 'badge' ? 'bg-[#231E1B] text-white' : 'text-[#5C534D] hover:bg-white/40'
                  }`}
                >
                  Ikon Badge
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewContext('pdf')}
                  className={`py-1.5 rounded-lg transition ${
                    previewContext === 'pdf' ? 'bg-[#231E1B] text-white' : 'text-[#5C534D] hover:bg-white/40'
                  }`}
                >
                  Kop PDF
                </button>
              </div>

              {/* Preview Display Stage */}
              <div className="rounded-3xl border border-[#D9DF98] overflow-hidden shadow-md">
                {/* Context: Navbar Simulation */}
                {previewContext === 'navbar' && (
                  <div className="bg-[#231E1B] p-4 text-white space-y-3">
                    <div className="text-[10px] text-[#877465] font-mono border-b border-[#3D352F] pb-1.5 flex items-center justify-between">
                      <span>SIMULASI BILAH NAVIGASI / HEADER ATAS</span>
                      <span className="w-2 h-2 rounded-full bg-[#95A823] animate-pulse"></span>
                    </div>
                    <div className="py-2 flex items-center justify-between">
                      <LogarLogo variant="full" light={true} branding={branding} />
                    </div>
                    <p className="text-[10px] text-[#D9DF98] font-serif italic text-center pt-1 border-t border-[#3D352F]">
                      &ldquo;{branding.tagline || 'Experience the Green of the City'}&rdquo;
                    </p>
                  </div>
                )}

                {/* Context: Login Card Simulation */}
                {previewContext === 'login' && (
                  <div className="bg-white p-6 text-[#231E1B] text-center space-y-3">
                    <div className="text-[10px] text-[#877465] font-mono pb-1 border-b border-[#F0F2D8]">
                      SIMULASI KARTU SELAMAT DATANG HALAMAN LOGIN
                    </div>
                    <div className="py-2">
                      <div
                        className={`w-16 h-16 flex items-center justify-center mx-auto mb-3 shadow-lg p-2.5 transition-all ${getShapeClass(
                          branding.logoShape
                        )}`}
                        style={{ backgroundColor: branding.bgColor || '#95A823' }}
                      >
                        {branding.logoUrl ? (
                          <img
                            src={branding.logoUrl}
                            alt={branding.brandTitle}
                            className="w-full h-full object-contain filter drop-shadow-xs"
                          />
                        ) : branding.customIconType === 'building' ? (
                          <Building2 className="w-full h-full text-white" />
                        ) : branding.customIconType === 'shield' ? (
                          <Shield className="w-full h-full text-white" />
                        ) : branding.customIconType === 'leaf' ? (
                          <Leaf className="w-full h-full text-white" />
                        ) : (
                          <HotelFlowerIcon className="w-full h-full" color="#FFFFFF" centerColor="#EAEEBB" />
                        )}
                      </div>
                      <h4 className="font-black text-base text-[#231E1B]">{branding.brandTitle || 'LOMBOK GARDEN'}</h4>
                      <p className="text-xs text-[#70635A] font-medium">{branding.brandSubtitle || 'HOTEL • REPORT LOGAR'}</p>
                      <p className="text-[11px] text-[#95A823] font-serif italic mt-0.5">
                        {branding.tagline || 'Experience the Green of the City'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Context: Isolated Icon Badge */}
                {previewContext === 'badge' && (
                  <div className="bg-[#FAFBF5] p-6 text-center space-y-4">
                    <div className="text-[10px] text-[#877465] font-mono pb-1 border-b border-[#E2E7B8]">
                      SIMULASI UKURAN IKON &amp; BENTUK
                    </div>
                    <div className="flex items-center justify-center gap-4 py-3">
                      {/* Small */}
                      <div
                        className={`w-8 h-8 flex items-center justify-center p-1 shadow-sm ${getShapeClass(
                          branding.logoShape
                        )}`}
                        style={{ backgroundColor: branding.bgColor || '#95A823' }}
                      >
                        {branding.logoUrl ? (
                          <img src={branding.logoUrl} alt="" className="w-full h-full object-contain" />
                        ) : (
                          <HotelFlowerIcon className="w-full h-full" color="#FFFFFF" centerColor="#EAEEBB" />
                        )}
                      </div>
                      {/* Medium */}
                      <div
                        className={`w-12 h-12 flex items-center justify-center p-1.5 shadow-md ${getShapeClass(
                          branding.logoShape
                        )}`}
                        style={{ backgroundColor: branding.bgColor || '#95A823' }}
                      >
                        {branding.logoUrl ? (
                          <img src={branding.logoUrl} alt="" className="w-full h-full object-contain" />
                        ) : (
                          <HotelFlowerIcon className="w-full h-full" color="#FFFFFF" centerColor="#EAEEBB" />
                        )}
                      </div>
                      {/* Large */}
                      <div
                        className={`w-18 h-18 flex items-center justify-center p-2.5 shadow-lg ${getShapeClass(
                          branding.logoShape
                        )}`}
                        style={{ backgroundColor: branding.bgColor || '#95A823' }}
                      >
                        {branding.logoUrl ? (
                          <img src={branding.logoUrl} alt="" className="w-full h-full object-contain" />
                        ) : (
                          <HotelFlowerIcon className="w-full h-full" color="#FFFFFF" centerColor="#EAEEBB" />
                        )}
                      </div>
                    </div>
                    <p className="text-[11px] text-[#5C534D] font-semibold">
                      Bentuk: <span className="text-[#95A823] capitalize">{branding.logoShape || 'Rounded'}</span> &bull; Warna: <span className="font-mono">{branding.bgColor || '#95A823'}</span>
                    </p>
                  </div>
                )}

                {/* Context: PDF Kop Document Simulation */}
                {previewContext === 'pdf' && (
                  <div className="bg-white p-4 border border-[#CCC] space-y-2 text-left">
                    <div className="text-[10px] text-[#877465] font-mono border-b pb-1">
                      SIMULASI KOP DOKUMEN CETAK PDF RESMI
                    </div>
                    <div className="flex items-center gap-3 py-1">
                      <div
                        className={`w-10 h-10 flex items-center justify-center p-1.5 shrink-0 ${getShapeClass(
                          branding.logoShape
                        )}`}
                        style={{ backgroundColor: branding.bgColor || '#95A823' }}
                      >
                        {branding.logoUrl ? (
                          <img src={branding.logoUrl} alt="" className="w-full h-full object-contain" />
                        ) : (
                          <HotelFlowerIcon className="w-full h-full" color="#FFFFFF" centerColor="#EAEEBB" />
                        )}
                      </div>
                      <div className="leading-tight">
                        <h5 className="font-extrabold text-xs text-[#231E1B] tracking-wide">
                          HOTEL {branding.brandTitle || 'LOMBOK GARDEN'}
                        </h5>
                        <p className="text-[9px] text-[#5D6B19] font-bold">
                          {branding.brandSubtitle || 'MOD REPORT OFFICIAL LOGBOOK'}
                        </p>
                        <p className="text-[8px] text-[#877465] italic">
                          {branding.tagline || 'Experience the Green of the City'} &bull; Mataram, NTB
                        </p>
                      </div>
                    </div>
                    <div className="h-0.5 bg-[#95A823]"></div>
                  </div>
                )}
              </div>
            </div>

            {/* Save feedback banner */}
            {saveSuccessMsg && (
              <div className="p-3 rounded-2xl bg-[#E8EDC4] border border-[#95A823] text-xs text-[#5D6B19] font-bold flex items-center gap-2 animate-bounce">
                <CheckCircle2 className="w-4 h-4 text-[#95A823] shrink-0" />
                <span>{saveSuccessMsg}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="w-full py-3 px-4 rounded-2xl bg-[#95A823] hover:bg-[#7B8C1B] text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#95A823]/30 transition transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 cursor-pointer"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Menyimpan ke Cloud &amp; Perangkat...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Simpan &amp; Terapkan Real-Time</span>
                  </>
                )}
              </button>

              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={handleResetToDefault}
                  className="text-xs font-semibold text-[#877465] hover:text-[#C25941] flex items-center gap-1.5 py-1.5 px-2.5 rounded-xl hover:bg-[#E8EDC4]/50 transition"
                  title="Kembalikan ke emblem default bunga 5 kelopak"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Reset ke Logo Standar Bunga Logar</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="text-xs font-bold text-[#5C534D] hover:text-[#231E1B] py-1.5 px-3 rounded-xl hover:bg-[#E2E7B8] transition"
                >
                  Batal
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
