import React, { useState, useMemo } from 'react';
import { 
  X, 
  FileText, 
  Download, 
  CheckCircle2, 
  Calendar, 
  Layers, 
  Sparkles,
  Eye
} from 'lucide-react';
import { ModReportItem, UserProfile } from '../types';
import { exportModReportToPdf } from '../services/pdfExportService';
import { INITIAL_OFFICERS, HOTEL_DEPARTMENTS, isDateOnOrAfterOctober2026 } from '../data/initialData';
import { getSystemSettings } from '../services/systemSettingsService';
import { LogarLogo } from './LogarLogo';

interface PdfExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  reports: ModReportItem[];
  currentUser: UserProfile;
}

export const PdfExportModal: React.FC<PdfExportModalProps> = ({
  isOpen,
  onClose,
  reports,
  currentUser,
}) => {
  if (!isOpen) return null;

  const settings = getSystemSettings();
  const [dateFilterType, setDateFilterType] = useState<'all' | 'custom' | 'oktober'>('oktober');
  const [startDate, setStartDate] = useState('10/1/2026');
  const [endDate, setEndDate] = useState('10/31/2026');
  const [shiftFilter, setShiftFilter] = useState<string>('all');
  const [officerFilter, setOfficerFilter] = useState<string>('all');
  const [deptFilter, setDeptFilter] = useState<string>('all');

  // Filter reports according to choices (enforcing data >= October 2026)
  const filteredReports = useMemo(() => {
    return reports.filter(r => {
      // Must be on or after October 2026
      if (!isDateOnOrAfterOctober2026(r.date || r.timestamp)) return false;

      if (dateFilterType === 'oktober') {
        const clean = (r.date || r.timestamp).trim().split(' ')[0];
        if (!clean.startsWith('10/') && !clean.startsWith('10-') && !clean.startsWith('2026-10')) return false;
      } else if (dateFilterType === 'custom') {
        if (startDate && endDate) {
          // simple check
        }
      }

      if (shiftFilter !== 'all' && !r.shift.startsWith(shiftFilter)) {
        return false;
      }

      if (officerFilter !== 'all' && r.officerName !== officerFilter) {
        return false;
      }

      if (deptFilter !== 'all' && r.followUpDept !== deptFilter) {
        return false;
      }

      return true;
    });
  }, [reports, dateFilterType, startDate, endDate, shiftFilter, officerFilter, deptFilter]);

  const handleExport = () => {
    exportModReportToPdf(filteredReports, {
      title: 'MOD REPORT LOGAR',
      shift: shiftFilter !== 'all' ? shiftFilter : 'Semua Shift Operasional',
      startDate: dateFilterType === 'oktober' ? '1 Okt 2026' : (dateFilterType === 'custom' ? startDate : undefined),
      endDate: dateFilterType === 'oktober' ? '31 Okt 2026' : (dateFilterType === 'custom' ? endDate : undefined),
      officerName: officerFilter !== 'all' ? officerFilter : undefined,
      departmentFilter: deptFilter !== 'all' ? deptFilter : undefined,
      user: currentUser,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#1A1614]/85 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl flex flex-col border border-[#E2E7B8]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#3D352F] flex items-center justify-between bg-[#231E1B] text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#95A823] flex items-center justify-center text-white shadow-md shadow-[#95A823]/30">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">
                Ekspor Laporan PDF Otomatis
              </h3>
              <p className="text-xs text-[#C6CC81]">
                Format resmi MOD REPORT LOGAR Hotel Lombok Garden
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
          {/* Live Kop Preview */}
          <div className="bg-[#231E1B] rounded-2xl p-3.5 text-white border border-[#3D352F] shadow-sm relative overflow-hidden">
            <div 
              className="absolute left-0 right-0 bottom-0 h-1" 
              style={{ backgroundColor: settings.branding?.bgColor || '#95A823' }} 
            />
            <div className="flex items-center gap-3">
              <LogarLogo variant="icon" className="w-9 h-9 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="font-extrabold text-xs tracking-wider uppercase text-white truncate">
                  {settings.hotelName || 'HOTEL LOMBOK GARDEN'}
                </p>
                <p className="text-[10px] text-[#EAEEBB] italic truncate">
                  {settings.branding?.tagline || 'Experience the Green of the City'}
                </p>
                <p className="text-[9px] text-[#C6CC81] truncate">
                  {settings.hotelAddress}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-[#FAFBF5] border border-[#D9DF98] rounded-2xl p-3.5 text-xs text-[#61554D]">
            <p className="font-bold text-[#231E1B] flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#95A823]"></span>
              Format Dokumen Cetak Standar Manajemen LOGAR
            </p>
            <p className="text-[#70635A] mt-1">
              Menghasilkan PDF siap cetak dengan kop surat resmi {settings.hotelName || 'Hotel Lombok Garden'}, logo/ikon aktif, tabel temuan, status tindak lanjut, dan lembar tanda tangan General Manager.
            </p>
          </div>

          {/* Date Scope */}
          <div>
            <label className="block text-xs font-bold text-[#231E1B] mb-1.5">
              Cakupan Periode Laporan
            </label>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setDateFilterType('oktober')}
                className={`py-2 px-2.5 rounded-xl font-bold border text-center transition ${
                  dateFilterType === 'oktober'
                    ? 'bg-[#95A823] text-white border-[#95A823] shadow-xs'
                    : 'bg-[#FAFBF5] text-[#70635A] border-[#D9DF98] hover:bg-[#F4F6EA]'
                }`}
              >
                Bulan Ini (Okt 2026)
              </button>
              <button
                type="button"
                onClick={() => setDateFilterType('all')}
                className={`py-2 px-2.5 rounded-xl font-bold border text-center transition ${
                  dateFilterType === 'all'
                    ? 'bg-[#95A823] text-white border-[#95A823] shadow-xs'
                    : 'bg-[#FAFBF5] text-[#70635A] border-[#D9DF98] hover:bg-[#F4F6EA]'
                }`}
              >
                Semua Riwayat
              </button>
              <button
                type="button"
                onClick={() => setDateFilterType('custom')}
                className={`py-2 px-2.5 rounded-xl font-bold border text-center transition ${
                  dateFilterType === 'custom'
                    ? 'bg-[#95A823] text-white border-[#95A823] shadow-xs'
                    : 'bg-[#FAFBF5] text-[#70635A] border-[#D9DF98] hover:bg-[#F4F6EA]'
                }`}
              >
                Kustom Tanggal
              </button>
            </div>
          </div>

          {/* Shift filter */}
          <div>
            <label className="block text-xs font-bold text-[#231E1B] mb-1">
              Shift Tertentu
            </label>
            <select
              value={shiftFilter}
              onChange={(e) => setShiftFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-[#D9DF98] bg-[#FAFBF5] focus:bg-white text-[#231E1B] font-semibold"
            >
              <option value="all">Semua Shift (24 Jam)</option>
              <option value="Pagi">Shift Pagi (07:00 - 15:00)</option>
              <option value="Sore">Shift Sore (15:00 - 23:00)</option>
              <option value="Malam">Shift Malam (23:00 - 07:00)</option>
            </select>
          </div>

          {/* Department Filter */}
          <div>
            <label className="block text-xs font-bold text-[#231E1B] mb-1">
              Departemen Terkait
            </label>
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-[#D9DF98] bg-[#FAFBF5] focus:bg-white text-[#231E1B] font-semibold"
            >
              <option value="all">Semua Departemen (Lengkap)</option>
              {HOTEL_DEPARTMENTS.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* Officer Filter */}
          <div>
            <label className="block text-xs font-bold text-[#231E1B] mb-1">
              Petugas MOD
            </label>
            <select
              value={officerFilter}
              onChange={(e) => setOfficerFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-[#D9DF98] bg-[#FAFBF5] focus:bg-white text-[#231E1B] font-semibold"
            >
              <option value="all">Semua Petugas Lapangan</option>
              {INITIAL_OFFICERS.map(o => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>

          {/* Summary Preview */}
          <div className="bg-[#FAFBF5] border border-[#E2E7B8] rounded-2xl p-3.5 flex items-center justify-between text-xs">
            <div>
              <span className="text-[#70635A]">Jumlah Baris Laporan:</span>
              <p className="font-black text-[#231E1B] text-sm mt-0.5">
                {filteredReports.length} Catatan Inspeksi
              </p>
            </div>
            <span className="text-[11px] font-bold text-[#5B6713] bg-[#EAEEBB] border border-[#C6CC81] px-2.5 py-1 rounded-full">
              Format A4 Otomatis
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-[#F8F9F3] border-t border-[#E2E7B8] flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-[#70635A] hover:text-[#231E1B] hover:bg-[#FAFBF5] rounded-xl transition"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={filteredReports.length === 0}
            className="px-5 py-2.5 text-xs font-bold bg-[#95A823] hover:bg-[#83941F] text-white rounded-xl shadow-md shadow-[#95A823]/25 transition flex items-center gap-2 disabled:opacity-50"
          >
            <Download className="w-4 h-4 text-white" />
            <span>Unduh Laporan PDF Sekarang</span>
          </button>
        </div>
      </div>
    </div>
  );
};
