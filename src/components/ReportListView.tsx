import React, { useState, useMemo } from 'react';
import { 
  ModReportItem, 
  Department, 
  ReportStatus, 
  UserProfile,
  PictureItem,
  RolePermissionConfig
} from '../types';
import { 
  Search, 
  Filter, 
  ExternalLink, 
  Image as ImageIcon, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Trash2, 
  Calendar, 
  User, 
  MapPin, 
  Eye, 
  X, 
  FileDown, 
  Layers, 
  Sparkles, 
  FolderOpen, 
  Download, 
  HardDrive, 
  RotateCcw, 
  FileText,
  Lock
} from 'lucide-react';
import { formatBytes } from '../services/imageCompressionService';
import { getDriveFolderUrl } from '../services/driveSyncService';
import { getSystemSettings } from '../services/systemSettingsService';
import { getUserPermissions } from '../services/permissionService';
import { isDateOnOrAfterOctober2026 } from '../data/initialData';
import { getReportResolutionItem, isFollowUpFinding } from '../services/kpiResolutionService';

export type SearchScope = 'all' | 'location' | 'officer' | 'description';

interface ReportListViewProps {
  reports: ModReportItem[];
  currentUser: UserProfile;
  userPermissions?: RolePermissionConfig;
  onUpdateStatus: (reportId: string, newStatus: ReportStatus) => void;
  onDeleteReport: (reportId: string) => void;
  onOpenPdfExport: () => void;
  onClearAllReports?: () => void;
  initialFilterStatus?: string;
}

export const ReportListView: React.FC<ReportListViewProps> = ({
  reports,
  currentUser,
  userPermissions,
  onUpdateStatus,
  onDeleteReport,
  onOpenPdfExport,
  onClearAllReports,
  initialFilterStatus = 'all',
}) => {
  const perms = userPermissions || getUserPermissions(currentUser);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchScope, setSearchScope] = useState<SearchScope>('all');
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>(initialFilterStatus);
  const [selectedOfficer, setSelectedOfficer] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // Photo viewer modal state
  const [activePhotoModal, setActivePhotoModal] = useState<{
    isOpen: boolean;
    report: ModReportItem | null;
  }>({
    isOpen: false,
    report: null,
  });

  const handleDownloadPhoto = (pic: PictureItem) => {
    if (!pic.thumbnailUrl) return;
    const a = document.createElement('a');
    a.href = pic.thumbnailUrl;
    a.download = pic.name || `MOD_Bukti_${pic.id}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Extract unique officers
  const uniqueOfficers = useMemo(() => {
    const list = Array.from(new Set(reports.map(r => r.officerName))).filter(Boolean);
    return list.sort();
  }, [reports]);

  // Filtered reports with real-time multi-field matching
  const filteredReports = useMemo(() => {
    return reports.filter(item => {
      // Must be on or after October 2026 (exclude 2025 historical seed data)
      const dateVal = item.date || item.timestamp || '';
      if (dateVal.includes('2025')) return false;
      if (!isDateOnOrAfterOctober2026(dateVal)) return false;

      // Real-time search keyword
      if (searchTerm.trim()) {
        const query = searchTerm.trim().toLowerCase();
        const matchesLoc = item.location.toLowerCase().includes(query) || (item.areaGroup && item.areaGroup.toLowerCase().includes(query));
        const matchesOfficer = item.officerName.toLowerCase().includes(query);
        const matchesDesc = item.problem.toLowerCase().includes(query) || (item.notes && item.notes.toLowerCase().includes(query)) || (item.followUpDept && item.followUpDept.toLowerCase().includes(query));

        if (searchScope === 'location' && !matchesLoc) return false;
        if (searchScope === 'officer' && !matchesOfficer) return false;
        if (searchScope === 'description' && !matchesDesc) return false;
        if (searchScope === 'all' && !matchesLoc && !matchesOfficer && !matchesDesc) return false;
      }

      // Dept filter
      if (selectedDept !== 'all') {
        if (item.followUpDept !== selectedDept) return false;
      }

      // Status filter
      if (selectedStatus !== 'all') {
        if (item.status !== selectedStatus) return false;
      }

      // Officer filter
      if (selectedOfficer !== 'all') {
        if (item.officerName !== selectedOfficer) return false;
      }

      return true;
    });
  }, [reports, searchTerm, searchScope, selectedDept, selectedStatus, selectedOfficer]);

  const handleResetFilters = () => {
    setSearchTerm('');
    setSearchScope('all');
    setSelectedDept('all');
    setSelectedStatus('all');
    setSelectedOfficer('all');
    setCurrentPage(1);
  };

  const isFiltered = searchTerm.trim() !== '' || selectedDept !== 'all' || selectedStatus !== 'all' || selectedOfficer !== 'all' || searchScope !== 'all';

  const totalPages = Math.ceil(filteredReports.length / pageSize) || 1;
  const paginatedReports = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredReports.slice(start, start + pageSize);
  }, [filteredReports, currentPage, pageSize]);

  const getStatusBadge = (status: ReportStatus) => {
    switch (status) {
      case 'Aman':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-[#EAEEBB] text-[#5B6713] border border-[#C6CC81]">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#95A823]" />
            Aman
          </span>
        );
      case 'Perlu Follow Up':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-[#FBEBE7] text-[#C25941] border border-[#F2D7D0]">
            <AlertTriangle className="w-3.5 h-3.5 text-[#C25941]" />
            Perlu Follow Up
          </span>
        );
      case 'Dalam Proses':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-[#FEF3E2] text-[#D48227] border border-[#FCE1B8]">
            <Clock className="w-3.5 h-3.5 text-[#D48227]" />
            Dalam Proses
          </span>
        );
      case 'Selesai':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-[#E8F0E4] text-[#43752E] border border-[#BBDDB0]">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#43752E]" />
            Selesai
          </span>
        );
    }
  };

  const getDeptColor = (dept: Department) => {
    switch (dept) {
      case 'Housekeeping':
        return 'bg-[#EAEEBB]/70 text-[#5B6713] border-[#C6CC81]';
      case 'Engineering':
        return 'bg-[#F4EFEA] text-[#877465] border-[#D6C7BC]';
      case 'FB Service':
        return 'bg-[#F3F6D9] text-[#7B8C1B] border-[#C6CC81]';
      case 'Fb Product':
        return 'bg-[#FFF2E2] text-[#C77726] border-[#FFBC7D]';
      case 'Security':
        return 'bg-[#EDEAE7] text-[#61554D] border-[#D1CCC7]';
      case 'Front Office':
        return 'bg-[#E8F0E4] text-[#43752E] border-[#A8CC98]';
      default:
        return 'bg-[#FAFBF5] text-[#70635A] border-[#DFE4C4]';
    }
  };

  return (
    <div className="space-y-4">
      {/* Real-time Multi-Field Search Card at the Top */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#E2E7B8] shadow-sm space-y-4">
        {/* Top Header of the Search Panel */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#95A823] animate-pulse"></span>
              <h2 className="text-base sm:text-lg font-black text-[#231E1B] tracking-tight flex items-center gap-2">
                <Search className="w-5 h-5 text-[#95A823]" />
                Pencarian &amp; Filter Real-Time Laporan MOD
              </h2>
            </div>
            <p className="text-xs text-[#70635A] mt-0.5">
              Cari seketika berdasarkan <strong>Lokasi/Area</strong>, <strong>Petugas Pelapor</strong>, atau <strong>Isi Temuan &amp; Deskripsi</strong>.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {isFiltered && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FAFBF5] hover:bg-[#F2F4DE] text-[#C25941] hover:text-[#9F3E28] border border-[#F2D7D0] rounded-xl text-xs font-bold transition cursor-pointer"
                title="Reset semua filter pencarian"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Filter</span>
              </button>
            )}

            {reports.length > 0 && onClearAllReports && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('PERINGATAN: Apakah Anda yakin ingin menghapus SEMUA data laporan inspeksi? Seluruh riwayat laporan akan dikosongkan.')) {
                    onClearAllReports();
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FAFBF5] hover:bg-[#FBEBE7] text-[#C25941] border border-[#F2D7D0] rounded-xl text-xs font-bold transition cursor-pointer"
                title="Hapus seluruh data laporan inspeksi"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus Semua Laporan</span>
              </button>
            )}

            {perms.canExportPdf && (
              <button
                onClick={onOpenPdfExport}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#877465] hover:bg-[#70635A] text-white rounded-xl text-xs font-bold shadow-xs transition"
              >
                <FileDown className="w-4 h-4 text-[#EAEEBB]" />
                <span>Ekspor PDF Format Resmi</span>
              </button>
            )}
          </div>
        </div>

        {/* Big Prominent Real-time Search Input */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <Search className="w-5 h-5 text-[#95A823]" />
          </div>
          <input
            type="text"
            placeholder={
              searchScope === 'location'
                ? "Ketik nama lokasi atau area hotel (misal: Deluxe 102, Resto, Lobby, Pool, Ballroom)..."
                : searchScope === 'officer'
                ? "Ketik nama petugas pelapor (misal: Asrul, Wayan, Made, Candra, Komang)..."
                : searchScope === 'description'
                ? "Ketik isi temuan atau deskripsi masalah (misal: AC bocor, Keran air, Lampu mati, Aman)..."
                : "Ketik untuk mencari real-time berdasarkan Lokasi, Petugas Pelapor, atau Isi Temuan..."
            }
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-11 pr-28 py-3 text-xs sm:text-sm font-semibold rounded-2xl bg-[#FAFBF5] border-2 border-[#D9DF98] text-[#231E1B] placeholder-[#877465]/70 focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#95A823]/20 focus:border-[#95A823] transition shadow-inner"
          />

          <div className="absolute inset-y-0 right-0 pr-3 flex items-center gap-2">
            {searchTerm && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setCurrentPage(1);
                }}
                className="w-6 h-6 rounded-full bg-[#EAEBD9] hover:bg-[#D9DF98] text-[#70635A] hover:text-[#231E1B] flex items-center justify-center transition cursor-pointer"
                title="Hapus kata kunci pencarian"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            <span className="inline-block px-2.5 py-0.5 rounded-lg bg-[#EAEEBB] border border-[#C6CC81] text-[11px] font-bold text-[#5B6713]">
              {filteredReports.length} Ditemukan
            </span>
          </div>
        </div>

        {/* Search Scope Filter Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-[11px] font-bold text-[#877465] mr-1">Fokus Bidang:</span>
            <button
              type="button"
              onClick={() => { setSearchScope('all'); setCurrentPage(1); }}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                searchScope === 'all'
                  ? 'bg-[#95A823] text-white shadow-xs'
                  : 'bg-[#FAFBF5] text-[#70635A] hover:bg-[#EAEEBB]/60 border border-[#D9DF98]'
              }`}
            >
              <span>Semua Kategori</span>
            </button>
            <button
              type="button"
              onClick={() => { setSearchScope('location'); setCurrentPage(1); }}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                searchScope === 'location'
                  ? 'bg-[#95A823] text-white shadow-xs'
                  : 'bg-[#FAFBF5] text-[#70635A] hover:bg-[#EAEEBB]/60 border border-[#D9DF98]'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>Lokasi / Area</span>
            </button>
            <button
              type="button"
              onClick={() => { setSearchScope('officer'); setCurrentPage(1); }}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                searchScope === 'officer'
                  ? 'bg-[#95A823] text-white shadow-xs'
                  : 'bg-[#FAFBF5] text-[#70635A] hover:bg-[#EAEEBB]/60 border border-[#D9DF98]'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Petugas Pelapor</span>
            </button>
            <button
              type="button"
              onClick={() => { setSearchScope('description'); setCurrentPage(1); }}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                searchScope === 'description'
                  ? 'bg-[#95A823] text-white shadow-xs'
                  : 'bg-[#FAFBF5] text-[#70635A] hover:bg-[#EAEEBB]/60 border border-[#D9DF98]'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Isi Temuan / Deskripsi</span>
            </button>
          </div>

          <div className="text-[11px] text-[#70635A]">
            Menampilkan <strong className="text-[#231E1B]">{filteredReports.length}</strong> dari <strong className="text-[#231E1B]">{reports.length}</strong> total catatan inspeksi
          </div>
        </div>

        {/* Secondary Filter Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-[#F0F2E2]">
          {/* Department Filter */}
          <div>
            <label className="block text-[10px] font-bold uppercase text-[#877465] mb-1 tracking-wider">
              Departemen Follow-Up
            </label>
            <select
              value={selectedDept}
              onChange={(e) => {
                setSelectedDept(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 text-xs rounded-xl bg-[#FAFBF5] border border-[#D9DF98] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#95A823]/20 focus:border-[#95A823] font-semibold text-[#231E1B] transition"
            >
              <option value="all">Semua Departemen Follow-Up</option>
              <option value="Housekeeping">Housekeeping (HK)</option>
              <option value="Engineering">Engineering &amp; Teknisi</option>
              <option value="FB Service">Food &amp; Beverage Service</option>
              <option value="Fb Product">FB Product (Kitchen)</option>
              <option value="Security">Security &amp; Keamanan</option>
              <option value="Front Office">Front Office (Reception)</option>
              <option value="None">Tidak Ada Follow-Up (Kondusif)</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-[10px] font-bold uppercase text-[#877465] mb-1 tracking-wider">
              Status Kondisi
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 text-xs rounded-xl bg-[#FAFBF5] border border-[#D9DF98] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#95A823]/20 focus:border-[#95A823] font-semibold text-[#231E1B] transition"
            >
              <option value="all">Semua Status Kondisi</option>
              <option value="Aman">Aman &amp; Bersih</option>
              <option value="Perlu Follow Up">Perlu Follow-Up</option>
              <option value="Dalam Proses">Dalam Proses</option>
              <option value="Selesai">Tuntas Selesai</option>
            </select>
          </div>

          {/* Officer Filter */}
          <div>
            <label className="block text-[10px] font-bold uppercase text-[#877465] mb-1 tracking-wider">
              Pilihan Petugas MOD
            </label>
            <select
              value={selectedOfficer}
              onChange={(e) => {
                setSelectedOfficer(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 text-xs rounded-xl bg-[#FAFBF5] border border-[#D9DF98] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#95A823]/20 focus:border-[#95A823] font-semibold text-[#231E1B] transition"
            >
              <option value="all">Semua Petugas MOD</option>
              {uniqueOfficers.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-3xl border border-[#E2E7B8] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#231E1B] text-[#EAEEBB] text-[11px] font-bold tracking-wider uppercase border-b-2 border-[#95A823]">
                <th className="py-3 px-4 w-12 text-center text-[#C6CC81]">No</th>
                <th className="py-3 px-4 w-32">Waktu &amp; Shift</th>
                <th className="py-3 px-4 w-40">Petugas MOD</th>
                <th className="py-3 px-4 w-48">Area / Lokasi</th>
                <th className="py-3 px-4">Temuan &amp; Kondisi Lapangan</th>
                <th className="py-3 px-4 w-36">Follow Up Dept</th>
                <th className="py-3 px-4 w-32 text-center">Status</th>
                <th className="py-3 px-4 w-28 text-center">Bukti / Foto</th>
                <th className="py-3 px-3 w-16 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0F2E2] text-xs text-[#61554D]">
              {paginatedReports.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-14 text-center text-[#877465]">
                    <div className="max-w-md mx-auto space-y-2">
                      <div className="w-12 h-12 rounded-2xl bg-[#FAFBF5] border border-[#D9DF98] flex items-center justify-center mx-auto text-[#95A823] shadow-xs">
                        <Search className="w-6 h-6" />
                      </div>
                      <p className="font-bold text-sm text-[#231E1B]">
                        {searchTerm ? `Tidak ditemukan laporan untuk "${searchTerm}"` : 'Tidak ada data inspeksi yang sesuai.'}
                      </p>
                      <p className="text-xs text-[#70635A]">
                        {searchTerm
                          ? 'Periksa kembali ejaan lokasi, nama petugas pelapor, atau pilih "Semua Kategori".'
                          : 'Coba ubah kriteria filter departemen, status, atau petugas.'}
                      </p>
                      {isFiltered && (
                        <button
                          type="button"
                          onClick={handleResetFilters}
                          className="mt-3 px-4 py-2 bg-[#95A823] hover:bg-[#83941F] text-white rounded-xl text-xs font-bold transition inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Reset Semua Filter &amp; Pencarian</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedReports.map((report, idx) => {
                  const itemIndex = (currentPage - 1) * pageSize + idx + 1;
                  return (
                    <tr 
                      key={report.id}
                      className="hover:bg-[#FAFBF5] transition-colors group"
                    >
                      {/* Index */}
                      <td className="py-3 px-4 text-center font-mono text-[#877465] text-[11px]">
                        {itemIndex}
                      </td>

                      {/* Date, Time, Shift */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-[#231E1B] flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-[#877465]" />
                          <span>{report.date}</span>
                        </div>
                        <div className="text-[11px] text-[#70635A] font-mono mt-0.5">
                          {report.time} &bull; {report.shift.split(' ')[0]}
                        </div>
                      </td>

                      {/* Officer */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-[#231E1B] flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-[#95A823]" />
                          <span className="truncate max-w-[140px]">{report.officerName}</span>
                        </div>
                      </td>

                      {/* Location */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-[#231E1B] flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-[#877465] shrink-0" />
                          <span className="line-clamp-2 leading-tight">{report.location}</span>
                        </div>
                        <span className="inline-block mt-1 text-[10px] bg-[#EAEEBB]/60 text-[#5B6713] border border-[#C6CC81]/40 px-1.5 py-0.5 rounded font-medium">
                          {report.areaGroup}
                        </span>
                      </td>

                      {/* Problem / Condition */}
                      <td className="py-3 px-4">
                        <p className={`line-clamp-3 leading-relaxed ${
                          report.status === 'Perlu Follow Up' ? 'text-[#231E1B] font-semibold' : 'text-[#61554D]'
                        }`}>
                          {report.problem}
                        </p>
                      </td>

                      {/* Follow up Dept */}
                      <td className="py-3 px-4">
                        {report.followUpDept && report.followUpDept !== 'None' ? (
                          <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold border ${getDeptColor(report.followUpDept)}`}>
                            {report.followUpDept}
                          </span>
                        ) : (
                          <span className="text-[#877465] text-xs">-</span>
                        )}
                      </td>

                      {/* Status + Toggle Dropdown */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex flex-col items-center gap-1">
                          {perms.canEditReportStatus ? (
                            <select
                              value={report.status}
                              onChange={(e) => onUpdateStatus(report.id, e.target.value as ReportStatus)}
                              className="text-xs font-semibold px-2 py-1 rounded-lg border border-[#D9DF98] bg-[#FAFBF5] focus:bg-white text-[#231E1B] focus:outline-none cursor-pointer"
                            >
                              <option value="Aman">Aman</option>
                              <option value="Perlu Follow Up">Perlu Follow Up</option>
                              <option value="Dalam Proses">Dalam Proses</option>
                              <option value="Selesai">Selesai</option>
                            </select>
                          ) : (
                            getStatusBadge(report.status)
                          )}

                          {/* SLA Resolution / Aging Duration for Follow-Up Findings */}
                          {isFollowUpFinding(report) && (() => {
                            const resItem = getReportResolutionItem(report);
                            if (report.status === 'Selesai') {
                              return (
                                <span 
                                  className="text-[9px] font-bold text-[#5B6713] bg-[#EAEEBB] px-1.5 py-0.5 rounded border border-[#C6CC81] flex items-center gap-0.5"
                                  title={`Tuntas dalam ${resItem.durationText}`}
                                >
                                  <Clock className="w-2.5 h-2.5 text-[#7B8C1B]" />
                                  <span>Tuntas {resItem.durationText}</span>
                                </span>
                              );
                            } else {
                              const isOverdue = resItem.durationHours > 12;
                              return (
                                <span 
                                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded border flex items-center gap-0.5 ${
                                    isOverdue 
                                      ? 'text-[#C25941] bg-[#FBEBE7] border-[#F2D7D0]' 
                                      : 'text-[#8C5311] bg-[#FFF8EE] border-[#FFDEB5]'
                                  }`}
                                  title={`Durasi aktif: ${resItem.durationText}`}
                                >
                                  <Clock className="w-2.5 h-2.5" />
                                  <span>{resItem.durationText}</span>
                                </span>
                              );
                            }
                          })()}
                        </div>
                      </td>

                      {/* Pictures & Google Drive Link */}
                      <td className="py-3 px-4 text-center">
                        {report.pictures && report.pictures.length > 0 ? (
                          <button
                            onClick={() => setActivePhotoModal({ isOpen: true, report })}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#EAEEBB]/70 hover:bg-[#EAEEBB] border border-[#C6CC81] text-[#5B6713] text-xs font-bold transition shadow-2xs"
                            title="Buka bukti foto Google Drive"
                          >
                            <ImageIcon className="w-3.5 h-3.5 text-[#95A823]" />
                            <span>{report.pictures.length} Foto</span>
                          </button>
                        ) : (
                          <span className="text-[#877465]/60 text-xs font-mono">-</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {perms.canEditReportStatus && (
                            <button
                              type="button"
                              onClick={() => {
                                const statuses: ReportStatus[] = ['Aman', 'Perlu Follow Up', 'Dalam Proses', 'Selesai'];
                                const currentIndex = statuses.indexOf(report.status);
                                const nextStatus = statuses[(currentIndex + 1) % statuses.length];
                                onUpdateStatus(report.id, nextStatus);
                              }}
                              className="p-1.5 rounded-lg text-[#5B6713] bg-[#EAEEBB]/60 hover:bg-[#EAEEBB] border border-[#C6CC81] transition cursor-pointer flex items-center gap-1"
                              title={`Ubah status cepat ke tahap berikutnya (Saat ini: ${report.status})`}
                            >
                              <RotateCcw className="w-3.5 h-3.5 text-[#7B8C1B]" />
                            </button>
                          )}

                          {perms.canDeleteReport && (
                            <button
                              onClick={() => {
                                if (window.confirm('Hapus baris laporan inspeksi ini?')) {
                                  onDeleteReport(report.id);
                                }
                              }}
                              className="p-1.5 rounded-lg text-[#877465] hover:text-[#C25941] hover:bg-[#FBEBE7] transition cursor-pointer"
                              title="Hapus baris laporan"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {!perms.canEditReportStatus && !perms.canDeleteReport && (
                            <span className="text-gray-300 text-xs">-</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="bg-[#F8F9F3] px-4 py-3 border-t border-[#E2E7B8] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#70635A]">
          <div>
            Halaman <strong className="text-[#231E1B]">{currentPage}</strong> dari{' '}
            <strong className="text-[#231E1B]">{totalPages}</strong> ({filteredReports.length} data ditemukan)
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 rounded-lg border border-[#D9DF98] bg-white text-[#231E1B] font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#EAEEBB]/50 transition"
            >
              Sebelumnya
            </button>
            <div className="px-2 font-mono text-[#70635A]">
              {currentPage} / {totalPages}
            </div>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 rounded-lg border border-[#D9DF98] bg-white text-[#231E1B] font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#EAEEBB]/50 transition"
            >
              Selanjutnya
            </button>
          </div>
        </div>
      </div>

      {/* Picture Viewer Modal (Google Drive Evidence) */}
      {activePhotoModal.isOpen && activePhotoModal.report && (
        <div className="fixed inset-0 z-50 bg-[#1A1614]/85 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col border border-[#E2E7B8]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-[#3D352F] flex items-center justify-between bg-[#231E1B] text-white">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#95A823] flex items-center justify-center text-white">
                  <ImageIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">
                    Bukti Pendukung Google Drive ({activePhotoModal.report.pictures.length} File)
                  </h3>
                  <p className="text-xs text-[#C6CC81] mt-0.5">
                    {activePhotoModal.report.location} &bull; {activePhotoModal.report.date}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActivePhotoModal({ isOpen: false, report: null })}
                className="w-8 h-8 rounded-full bg-[#3B332E] text-slate-300 hover:text-white flex items-center justify-center transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-4">
              <div className="bg-[#FAFBF5] border border-[#D9DF98] rounded-2xl p-4 text-xs text-[#61554D] flex items-center justify-between">
                <div>
                  <p className="font-bold text-[#231E1B] flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-[#95A823]" />
                    Penyimpanan Terkompresi Google Drive Hotel (Hemat 94% Kuota)
                  </p>
                  <p className="text-[#70635A] mt-1">
                    Semua gambar telah dikompres secara instan sebelum disimpan untuk efisiensi penyimpanan server dan cloud.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {activePhotoModal.report.pictures.map((pic, idx) => (
                  <div
                    key={pic.id || idx}
                    className="border border-[#E2E7B8] rounded-2xl p-3.5 bg-[#FAFBF5] flex flex-col justify-between"
                  >
                    <div>
                      {/* Image Thumbnail Preview */}
                      <div className="w-full h-44 rounded-xl bg-[#231E1B]/5 flex items-center justify-center overflow-hidden border border-[#D9DF98] relative group">
                        {pic.thumbnailUrl ? (
                          <img
                            src={pic.thumbnailUrl}
                            alt={pic.name || 'Bukti MOD'}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="text-center p-4">
                            <ImageIcon className="w-10 h-10 text-[#877465] mx-auto mb-2" />
                            <span className="text-xs text-[#70635A] font-mono">
                              File ID: {pic.driveId}
                            </span>
                          </div>
                        )}
                        <span className="absolute bottom-2 left-2 text-[10px] bg-[#231E1B]/80 text-[#EAEEBB] font-mono px-2 py-0.5 rounded backdrop-blur-xs">
                          Foto #{idx + 1}
                        </span>
                      </div>

                      <div className="mt-2.5 text-xs">
                        <p className="font-bold text-[#231E1B] truncate">
                          {pic.name || `Bukti_Foto_${idx + 1}.jpg`}
                        </p>
                        <p className="text-[11px] text-[#70635A] mt-0.5">
                          Ukuran: {formatBytes(pic.compressedSizeBytes)} (Asli: {formatBytes(pic.originalSizeBytes)})
                        </p>
                      </div>
                    </div>

                    {/* Google Drive Folder Info */}
                    <div className="mt-2 px-2.5 py-1.5 rounded-lg bg-[#FAFBF5] border border-[#E2E7B8] flex items-center justify-between text-[10px]">
                      <span className="text-[#5B6713] truncate flex items-center gap-1 font-semibold">
                        <HardDrive className="w-3 h-3 text-[#7B8C1B] shrink-0" />
                        <span className="truncate">{pic.driveFolderName || getSystemSettings().driveFolderName}</span>
                      </span>
                    </div>

                    {/* Google Drive Link Action */}
                    <div className="mt-2.5 pt-2.5 border-t border-[#E2E7B8] flex items-center justify-between gap-1.5 flex-wrap">
                      <a
                        href={getDriveFolderUrl(pic.driveFolderId || getSystemSettings().driveFolderId)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-[#95A823] hover:bg-[#82921D] text-white rounded-xl text-xs font-bold transition shadow-xs"
                      >
                        <FolderOpen className="w-3.5 h-3.5" />
                        <span>Buka Folder Drive</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>

                      {pic.thumbnailUrl && (
                        <button
                          type="button"
                          onClick={() => handleDownloadPhoto(pic)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-[#FAFBF5] hover:bg-[#EAEEBB] text-[#231E1B] border border-[#D9DF98] rounded-xl text-xs font-semibold transition cursor-pointer"
                          title="Unduh file foto ini"
                        >
                          <Download className="w-3.5 h-3.5 text-[#70635A]" />
                          <span>Unduh</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 bg-[#FAFBF5] border-t border-[#E2E7B8] flex items-center justify-end">
              <button
                onClick={() => setActivePhotoModal({ isOpen: false, report: null })}
                className="px-4 py-2 bg-[#EAEBD9] hover:bg-[#DFE1CA] text-[#231E1B] text-xs font-bold rounded-xl transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
