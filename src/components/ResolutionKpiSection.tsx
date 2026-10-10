import React, { useMemo, useState } from 'react';
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  Zap,
  TrendingDown,
  Building2,
  Calendar,
  ArrowRight,
  ShieldCheck,
  Check,
  ChevronRight,
  AlertCircle,
  RotateCcw
} from 'lucide-react';
import { Bar, Doughnut } from 'react-chartjs-2';
import { ModReportItem, ReportStatus, RolePermissionConfig } from '../types/index.ts';
import { calculateResolutionKpi, ResolutionKpiSummary, ReportResolutionItem } from '../services/kpiResolutionService';

interface ResolutionKpiSectionProps {
  reports: ModReportItem[];
  userPermissions?: RolePermissionConfig;
  onUpdateStatus?: (reportId: string, newStatus: ReportStatus) => void;
  onNavigateToReports?: (filterStatus?: string) => void;
}

export const ResolutionKpiSection: React.FC<ResolutionKpiSectionProps> = ({
  reports,
  userPermissions,
  onUpdateStatus,
  onNavigateToReports,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'departments' | 'aging'>('overview');
  const [slaTargetHours, setSlaTargetHours] = useState<number>(6); // Default 6 hours target SLA

  const kpi: ResolutionKpiSummary = useMemo(() => {
    return calculateResolutionKpi(reports, new Date(), slaTargetHours);
  }, [reports, slaTargetHours]);

  // Chart: Rata-rata jam penyelesaian per departemen
  const deptBarData = useMemo(() => {
    const labels = kpi.departmentStats.map(d => d.department);
    const avgHours = kpi.departmentStats.map(d => d.avgResolutionHours);
    const backgroundColors = kpi.departmentStats.map(d => {
      if (d.avgResolutionHours <= 4) return '#95A823'; // Fast - Lombok Garden Olive
      if (d.avgResolutionHours <= slaTargetHours) return '#C6CC81'; // Target met - Sage
      return '#C25941'; // Exceeds target - Terracotta
    });

    return {
      labels,
      datasets: [
        {
          label: 'Rata-rata Waktu Penyelesaian (Jam)',
          data: avgHours,
          backgroundColor: backgroundColors,
          borderRadius: 8,
          barThickness: 24,
        },
      ],
    };
  }, [kpi.departmentStats, slaTargetHours]);

  // Chart: Distribusi Waktu Penyelesaian (SLA Tier)
  const slaTierData = useMemo(() => {
    return {
      labels: [
        `Same-Shift (< 4 Jam): ${kpi.sameShiftCount}`,
        `Same-Day (4 - 24 Jam): ${kpi.sameDayCount}`,
        `Multi-Day (> 24 Jam): ${kpi.multiDayCount}`,
      ],
      datasets: [
        {
          data: [kpi.sameShiftCount, kpi.sameDayCount, kpi.multiDayCount],
          backgroundColor: ['#95A823', '#FFBC7D', '#C25941'],
          borderWidth: 2,
          borderColor: '#FAFBF5',
        },
      ],
    };
  }, [kpi]);

  const canEditStatus = userPermissions?.canEditReportStatus ?? true;

  return (
    <div className="bg-white rounded-3xl border border-[#E2E7B8] p-5 sm:p-7 shadow-xs space-y-6">
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#F0F2E2]">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-[#EAEEBB] text-[#5B6713] border border-[#C6CC81] flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#7B8C1B]" />
              SLA &amp; KPI RESOLUTION TIME
            </span>
            <span className="text-[11px] text-[#70635A]">
              Standar Layanan Hotel Lombok Garden
            </span>
          </div>
          <h3 className="text-lg sm:text-xl font-black text-[#231E1B] tracking-tight flex items-center gap-2">
            KPI Waktu Penyelesaian Temuan Follow-Up
          </h3>
          <p className="text-xs text-[#70635A] max-w-2xl">
            Indikator performa kecepatan penanganan dari status <strong>Perlu Follow Up</strong> hingga berstatus <strong>Tuntas Selesai</strong> di seluruh departemen operasional.
          </p>
        </div>

        {/* SLA Target Selector & Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2 self-start md:self-center">
          <div className="flex items-center gap-1.5 bg-[#FAFBF5] px-3 py-1.5 rounded-2xl border border-[#D9DF98] text-xs">
            <span className="text-[11px] font-semibold text-[#61554D]">Target SLA:</span>
            <select
              value={slaTargetHours}
              onChange={(e) => setSlaTargetHours(Number(e.target.value))}
              className="bg-transparent font-bold text-[#231E1B] focus:outline-none cursor-pointer"
            >
              <option value={4}>4 Jam (Shift Standar)</option>
              <option value={6}>6 Jam (Rekomendasi GM)</option>
              <option value={12}>12 Jam (Same-Day)</option>
              <option value={24}>24 Jam (Maksimal)</option>
            </select>
          </div>

          <div className="flex items-center bg-[#F4F6EA] p-1 rounded-2xl border border-[#D9DF98] text-xs">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-3 py-1 rounded-xl font-bold transition cursor-pointer ${
                activeTab === 'overview'
                  ? 'bg-[#95A823] text-white shadow-2xs'
                  : 'text-[#61554D] hover:text-[#231E1B]'
              }`}
            >
              Ringkasan KPI
            </button>
            <button
              onClick={() => setActiveTab('departments')}
              className={`px-3 py-1 rounded-xl font-bold transition cursor-pointer ${
                activeTab === 'departments'
                  ? 'bg-[#95A823] text-white shadow-2xs'
                  : 'text-[#61554D] hover:text-[#231E1B]'
              }`}
            >
              Per Departemen ({kpi.departmentStats.length})
            </button>
            <button
              onClick={() => setActiveTab('aging')}
              className={`px-3 py-1 rounded-xl font-bold transition cursor-pointer flex items-center gap-1 ${
                activeTab === 'aging'
                  ? 'bg-[#95A823] text-white shadow-2xs'
                  : 'text-[#61554D] hover:text-[#231E1B]'
              }`}
            >
              <span>Temuan Aktif</span>
              {kpi.activeAgingFindings.length > 0 && (
                <span className="w-4 h-4 rounded-full bg-[#C25941] text-white text-[10px] flex items-center justify-center font-bold">
                  {kpi.activeAgingFindings.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 4 Primary KPI Highlight Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Rata-Rata Waktu Penyelesaian (MTTR) */}
        <div className="bg-gradient-to-br from-[#FAFBF5] to-[#F4F6EA] rounded-2xl p-4 border border-[#D9DF98] shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#70635A] uppercase tracking-wider">
              Rata-Rata Waktu Tuntas
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#EAEEBB] text-[#5B6713] flex items-center justify-center font-bold">
              <Clock className="w-4 h-4 text-[#7B8C1B]" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-[#231E1B]">
              {kpi.avgResolutionHours}
            </span>
            <span className="text-xs font-bold text-[#70635A]">Jam ({kpi.avgResolutionText})</span>
          </div>
          <div className="mt-2.5 pt-2 border-t border-[#E2E7B8] flex items-center justify-between text-[11px]">
            <span className="text-[#61554D]">
              Tercepat: <strong>{kpi.fastestResolutionHours} Jam</strong>
            </span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
              kpi.avgResolutionHours <= slaTargetHours
                ? 'bg-[#EAEEBB] text-[#5B6713] border-[#C6CC81]'
                : 'bg-[#FBEBE7] text-[#C25941] border-[#F2D7D0]'
            }`}>
              {kpi.avgResolutionHours <= slaTargetHours ? 'Target SLA Tercapai' : 'Melebihi Target SLA'}
            </span>
          </div>
        </div>

        {/* Card 2: Rasio Ketuntasan Follow-Up */}
        <div className="bg-gradient-to-br from-[#FAFBF5] to-[#F4F6EA] rounded-2xl p-4 border border-[#D9DF98] shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#70635A] uppercase tracking-wider">
              Tingkat Ketuntasan
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#EAEEBB] text-[#5B6713] flex items-center justify-center font-bold">
              <CheckCircle2 className="w-4 h-4 text-[#7B8C1B]" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-[#95A823]">
              {kpi.resolutionRate}%
            </span>
            <span className="text-xs text-[#70635A]">
              ({kpi.resolvedCount} dari {kpi.totalFollowUpFindings} tuntas)
            </span>
          </div>
          <div className="mt-2.5 pt-2 border-t border-[#E2E7B8]">
            <div className="w-full bg-[#E5E9C0] h-2 rounded-full overflow-hidden">
              <div
                className="bg-[#95A823] h-full transition-all duration-500 rounded-full"
                style={{ width: `${kpi.resolutionRate}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Card 3: Selesai Dalam 1 Shift (< 4 Jam) */}
        <div className="bg-gradient-to-br from-[#FAFBF5] to-[#F4F6EA] rounded-2xl p-4 border border-[#D9DF98] shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#70635A] uppercase tracking-wider">
              Selesai Same-Shift
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#EAEEBB] text-[#5B6713] flex items-center justify-center font-bold">
              <Zap className="w-4 h-4 text-[#7B8C1B]" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-[#231E1B]">
              {kpi.sameShiftRate}%
            </span>
            <span className="text-xs text-[#70635A]">
              ({kpi.sameShiftCount} temuan &lt; 4 jam)
            </span>
          </div>
          <div className="mt-2.5 pt-2 border-t border-[#E2E7B8] flex items-center justify-between text-[11px] text-[#61554D]">
            <span>Langsung tuntas di shift sama</span>
            <span className="font-bold text-[#5B6713]">Respons Cepat</span>
          </div>
        </div>

        {/* Card 4: Temuan Belum Tuntas / Active Aging */}
        <div 
          onClick={() => setActiveTab('aging')}
          className="bg-gradient-to-br from-[#FAFBF5] to-[#FBEBE7]/40 rounded-2xl p-4 border border-[#F2D7D0] shadow-2xs cursor-pointer hover:border-[#C25941] transition group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#C25941] uppercase tracking-wider">
              Sedang Ditangani (Aging)
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#FBEBE7] text-[#C25941] flex items-center justify-center font-bold group-hover:bg-[#C25941] group-hover:text-white transition">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-[#C25941]">
              {kpi.activeAgingFindings.length}
            </span>
            <span className="text-xs text-[#70635A]">temuan aktif</span>
          </div>
          <div className="mt-2.5 pt-2 border-t border-[#F0F2E2] flex items-center justify-between text-[11px] text-[#C25941] font-bold">
            <span>{kpi.pendingCount} Baru &bull; {kpi.inProgressCount} Proses</span>
            <span className="flex items-center gap-0.5 group-hover:translate-x-0.5 transition">
              Lihat antrean <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </div>
      </div>

      {/* Tab 1: Ringkasan Overview & Grafik Visual */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
          {/* Bar Chart: Waktu Penyelesaian per Departemen */}
          <div className="lg:col-span-2 bg-[#FAFBF5] rounded-2xl p-4 sm:p-5 border border-[#E2E7B8] space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-black text-[#231E1B] uppercase tracking-wider">
                  Rata-Rata Waktu Penyelesaian per Departemen (Jam)
                </h4>
                <p className="text-[11px] text-[#70635A]">
                  Semakin rendah grafik, semakin cepat temuan follow-up diselesaikan oleh tim terkait.
                </p>
              </div>
              <span className="text-[10px] bg-white border border-[#D9DF98] text-[#5B6713] px-2.5 py-1 rounded-full font-bold">
                Target: &le; {slaTargetHours} Jam
              </span>
            </div>

            <div className="h-56 w-full pt-2">
              <Bar
                data={deptBarData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      callbacks: {
                        label: (ctx) => `Rata-rata: ${ctx.parsed.y} Jam`,
                      },
                    },
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      title: { display: true, text: 'Jam', font: { size: 10 } },
                      grid: { color: '#EAEBD9' },
                    },
                    x: {
                      grid: { display: false },
                      ticks: { font: { size: 11, weight: 'bold' } },
                    },
                  },
                }}
              />
            </div>
          </div>

          {/* Doughnut: Distribusi SLA Tiers */}
          <div className="bg-[#FAFBF5] rounded-2xl p-4 sm:p-5 border border-[#E2E7B8] flex flex-col justify-between space-y-3">
            <div>
              <h4 className="text-xs font-black text-[#231E1B] uppercase tracking-wider">
                Distribusi Kecepatan SLA
              </h4>
              <p className="text-[11px] text-[#70635A]">
                Proporsi kecepatan respon terhadap seluruh temuan follow-up.
              </p>
            </div>

            <div className="h-44 flex items-center justify-center my-1">
              <Doughnut
                data={slaTierData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'bottom',
                      labels: { boxWidth: 10, font: { size: 10 } },
                    },
                  },
                }}
              />
            </div>

            <div className="pt-2 border-t border-[#E2E7B8] text-[11px] space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[#61554D]">Kepatuhan SLA (&le; {slaTargetHours} Jam):</span>
                <strong className="text-[#95A823] font-black">{kpi.slaComplianceRate}%</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#61554D]">Median Waktu Selesai:</span>
                <strong className="text-[#231E1B] font-bold">{kpi.medianResolutionHours} Jam</strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Tabel Rinci per Departemen */}
      {activeTab === 'departments' && (
        <div className="space-y-4 pt-1">
          <div className="overflow-x-auto rounded-2xl border border-[#E2E7B8]">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#231E1B] text-[#EAEEBB] text-[11px] uppercase tracking-wider">
                  <th className="py-3 px-4 font-bold">Departemen</th>
                  <th className="py-3 px-3 text-center font-bold">Total Temuan</th>
                  <th className="py-3 px-3 text-center font-bold">Selesai</th>
                  <th className="py-3 px-3 text-center font-bold">Proses / Baru</th>
                  <th className="py-3 px-4 text-center font-bold">Rata-rata Waktu</th>
                  <th className="py-3 px-3 text-center font-bold">Tercepat</th>
                  <th className="py-3 px-4 text-center font-bold">Tingkat Ketuntasan</th>
                  <th className="py-3 px-3 text-center font-bold">Kepatuhan SLA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0F2E2] bg-white">
                {kpi.departmentStats.map((dept) => {
                  const isCompliant = dept.avgResolutionHours <= slaTargetHours;
                  return (
                    <tr key={dept.department} className="hover:bg-[#FAFBF5] transition">
                      <td className="py-3 px-4 font-bold text-[#231E1B]">
                        <span className="flex items-center gap-2">
                          <Building2 className="w-3.5 h-3.5 text-[#95A823]" />
                          <span>{dept.department}</span>
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center font-semibold text-[#61554D]">
                        {dept.totalFindings}
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-[#95A823]">
                        {dept.resolvedCount}
                      </td>
                      <td className="py-3 px-3 text-center font-semibold text-[#C25941]">
                        {dept.pendingCount + dept.inProgressCount > 0 ? (
                          <span className="bg-[#FBEBE7] text-[#C25941] px-2 py-0.5 rounded-full font-bold">
                            {dept.pendingCount + dept.inProgressCount}
                          </span>
                        ) : (
                          <span className="text-[#877465]">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-block px-2.5 py-1 rounded-lg font-bold text-xs ${
                          isCompliant ? 'bg-[#EAEEBB] text-[#5B6713]' : 'bg-[#FBEBE7] text-[#C25941]'
                        }`}>
                          {dept.avgResolutionHours > 0 ? `${dept.avgResolutionHours} Jam (${dept.avgResolutionText})` : '-'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-[#70635A]">
                        {dept.fastestHours > 0 ? `${dept.fastestHours} Jam` : '-'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-16 bg-[#E5E9C0] h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-[#95A823] h-full rounded-full"
                              style={{ width: `${dept.resolutionRate}%` }}
                            ></div>
                          </div>
                          <span className="font-bold text-[#231E1B]">{dept.resolutionRate}%</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-[#5B6713]">
                        {dept.slaComplianceRate}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Antrean Temuan Aktif & Durasi Berjalan (Aging Tracker) */}
      {activeTab === 'aging' && (
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between text-xs text-[#70635A]">
            <p>
              Menampilkan <strong className="text-[#231E1B]">{kpi.activeAgingFindings.length} temuan</strong> yang masih berstatus butuh tindak lanjut.
            </p>
            <span className="text-[11px] text-[#C25941] font-semibold">
              *Diurutkan berdasarkan waktu tunggu paling lama
            </span>
          </div>

          {kpi.activeAgingFindings.length === 0 ? (
            <div className="text-center py-8 bg-[#FAFBF5] rounded-2xl border border-[#D9DF98]">
              <CheckCircle2 className="w-8 h-8 text-[#95A823] mx-auto mb-2" />
              <p className="font-bold text-sm text-[#231E1B]">Semua Temuan Follow-Up Tuntas!</p>
              <p className="text-xs text-[#70635A] mt-0.5">
                Tidak ada temuan lapangan yang sedang tertunda atau dalam penanganan saat ini.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {kpi.activeAgingFindings.map((item) => {
                const rep = item.report;
                const isOverdue = item.durationHours > 12;
                const isWarning = item.durationHours > 4 && item.durationHours <= 12;

                return (
                  <div
                    key={rep.id}
                    className={`p-3.5 sm:p-4 rounded-2xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isOverdue 
                        ? 'bg-[#FBEBE7]/40 border-[#F2D7D0] hover:border-[#C25941]' 
                        : isWarning 
                        ? 'bg-[#FFF8EE] border-[#FFDEB5] hover:border-[#FFBC7D]' 
                        : 'bg-[#FAFBF5] border-[#E2E7B8] hover:border-[#95A823]'
                    }`}
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-black border ${
                          rep.status === 'Perlu Follow Up' 
                            ? 'bg-[#FBEBE7] text-[#C25941] border-[#F2D7D0]' 
                            : 'bg-[#FFDEB5] text-[#8C5311] border-[#FFBC7D]'
                        }`}>
                          {rep.status}
                        </span>
                        <span className="text-xs font-bold text-[#231E1B] truncate">
                          {rep.location}
                        </span>
                        <span className="text-[10px] text-[#61554D] bg-white border border-[#D9DF98] px-2 py-0.5 rounded font-semibold">
                          Dept: {rep.followUpDept}
                        </span>
                      </div>
                      <p className="text-xs text-[#61554D] line-clamp-2">
                        {rep.problem}
                      </p>
                      <div className="flex items-center gap-3 text-[11px] text-[#70635A]">
                        <span>Dilaporkan: {rep.date} ({rep.time})</span>
                        <span>&bull;</span>
                        <span>Petugas: {rep.officerName}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                      <div className="text-right">
                        <div className="text-xs font-black text-[#231E1B] flex items-center gap-1 justify-end">
                          <Clock className="w-3.5 h-3.5 text-[#C25941]" />
                          <span>Tertunda {item.durationText}</span>
                        </div>
                        <span className={`inline-block mt-0.5 text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                          isOverdue 
                            ? 'bg-[#C25941] text-white border-[#A8452F]' 
                            : isWarning 
                            ? 'bg-[#FFBC7D] text-[#5C3408] border-[#E09D5B]' 
                            : 'bg-[#EAEEBB] text-[#5B6713] border-[#C6CC81]'
                        }`}>
                          {item.slaBadgeText}
                        </span>
                      </div>

                      {canEditStatus && onUpdateStatus && (
                        <div className="flex items-center gap-1.5 pl-2 border-l border-[#E2E7B8]">
                          {rep.status === 'Perlu Follow Up' && (
                            <button
                              type="button"
                              onClick={() => onUpdateStatus(rep.id, 'Dalam Proses')}
                              className="px-2.5 py-1.5 rounded-xl bg-[#FAFBF5] hover:bg-[#EAEEBB] border border-[#D9DF98] text-[#231E1B] text-xs font-bold transition shadow-2xs cursor-pointer"
                              title="Tandai sedang dalam pengerjaan"
                            >
                              Proses
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => onUpdateStatus(rep.id, 'Selesai')}
                            className="px-3 py-1.5 rounded-xl bg-[#95A823] hover:bg-[#83941F] text-white text-xs font-bold transition shadow-2xs flex items-center gap-1 cursor-pointer"
                            title="Tandai tuntas selesai sekarang"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Selesai</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Footer Quick Insight & Action Bar */}
      <div className="pt-3 border-t border-[#F0F2E2] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#70635A]">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#95A823] shrink-0" />
          <span>
            Standar SLA Follow-up: Prioritas Utama diselesaikan dalam 1 shift (&lt; 4 Jam) untuk kenyamanan tamu Hotel Lombok Garden.
          </span>
        </div>

        {onNavigateToReports && (
          <button
            onClick={() => onNavigateToReports('Perlu Follow Up')}
            className="text-[#95A823] hover:text-[#7B8C1B] font-bold flex items-center gap-1 transition cursor-pointer shrink-0"
          >
            <span>Buka Data Laporan Terperinci</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
