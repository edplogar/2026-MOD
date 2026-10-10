import React, { useMemo, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Bar, Doughnut, Pie } from 'react-chartjs-2';
import type { 
  ModReportItem, 
  UserProfile,
  RolePermissionConfig
} from '../types/index.ts';
import { getUserPermissions } from '../services/permissionService.ts';
import { isDateOnOrAfterOctober2026 } from '../data/initialData';
import { 
  calculateStorageSavings 
} from '../services/storageService';
import { 
  formatBytes 
} from '../services/imageCompressionService';
import {
  CheckCircle2,
  AlertTriangle,
  Clock,
  HardDrive,
  Sparkles,
  TrendingUp,
  MapPin,
  Users,
  ShieldAlert,
  ArrowRight,
  Filter,
  Zap
} from 'lucide-react';
import { ResolutionKpiSection } from './ResolutionKpiSection';
import { calculateResolutionKpi } from '../services/kpiResolutionService';
import type { ReportStatus } from '../types/index.ts';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const INDONESIAN_MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export function getReportMonthYear(dateStr: string): { month: number; year: number; key: string; label: string } | null {
  if (!dateStr) return null;
  const clean = dateStr.trim().split(' ')[0];
  const parts = clean.split(/[\/\-]/);
  let month = 0;
  let year = 0;

  if (parts.length >= 3) {
    if (parts[0].length === 4) {
      year = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10);
    } else {
      month = parseInt(parts[0], 10);
      year = parseInt(parts[2], 10);
    }
  } else {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      year = d.getFullYear();
      month = d.getMonth() + 1;
    }
  }

  if (month >= 1 && month <= 12 && year >= 2000) {
    return {
      month,
      year,
      key: `${month}/${year}`,
      label: `${INDONESIAN_MONTHS[month - 1]} ${year}`,
    };
  }
  return null;
}

interface DashboardViewProps {
  reports: ModReportItem[];
  currentUser: UserProfile;
  userPermissions?: RolePermissionConfig;
  onNavigateToReports: (filterStatus?: string) => void;
  onOpenNewReport?: () => void;
  onUpdateStatus?: (reportId: string, newStatus: ReportStatus) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  reports,
  currentUser,
  userPermissions,
  onNavigateToReports,
  onUpdateStatus,
}) => {
  const perms = userPermissions || getUserPermissions(currentUser);

  // Enforce removal of all records prior to October 2026
  const postOctoberReports = useMemo(() => {
    return reports.filter(r => {
      const dateVal = r.date || r.timestamp || '';
      if (dateVal.includes('2025')) return false;
      return isDateOnOrAfterOctober2026(dateVal);
    });
  }, [reports]);

  // Dynamically extract month list from valid reports (>= October 2026), guaranteeing active October 2026 is present
  const availableMonths = useMemo(() => {
    const monthMap = new Map<string, { key: string; label: string; year: number; month: number }>();
    
    // Always guarantee current active month October 2026 is available
    monthMap.set('10/2026', {
      key: '10/2026',
      label: 'Oktober 2026',
      year: 2026,
      month: 10,
    });

    // Extract any additional months from post-October reports
    postOctoberReports.forEach(r => {
      const my = getReportMonthYear(r.date || r.timestamp);
      if (my && (my.year > 2026 || (my.year === 2026 && my.month >= 10))) {
        if (!monthMap.has(my.key)) {
          monthMap.set(my.key, {
            key: my.key,
            label: my.label,
            year: my.year,
            month: my.month,
          });
        }
      }
    });

    // Sort in reverse chronological order (newest first)
    return Array.from(monthMap.values()).sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    });
  }, [postOctoberReports]);

  const [selectedMonth, setSelectedMonth] = useState<string>('all');

  // Filtered reports by selected month
  const activeReports = useMemo(() => {
    if (selectedMonth === 'all') return postOctoberReports;
    return postOctoberReports.filter(r => {
      const my = getReportMonthYear(r.date || r.timestamp);
      return my && my.key === selectedMonth;
    });
  }, [postOctoberReports, selectedMonth]);

  // KPI Calculations
  const stats = useMemo(() => {
    const total = activeReports.length;
    const safe = activeReports.filter(r => r.status === 'Aman' || r.status === 'Selesai').length;
    const needFollowUp = activeReports.filter(r => r.status === 'Perlu Follow Up').length;
    const inProgress = activeReports.filter(r => r.status === 'Dalam Proses').length;
    const highPriority = activeReports.filter(r => r.priority === 'Tinggi' || r.priority === 'Urgent').length;

    const safePercentage = total > 0 ? Math.round((safe / total) * 100) : 100;
    const storage = calculateStorageSavings(activeReports);

    return {
      total,
      safe,
      needFollowUp,
      inProgress,
      highPriority,
      safePercentage,
      storage,
    };
  }, [activeReports]);

  // Resolution Turnaround KPI
  const resolutionKpi = useMemo(() => {
    return calculateResolutionKpi(activeReports);
  }, [activeReports]);

  // Inspection Volume Over Months (Starting from October 2026)
  const monthlyTrendData = useMemo(() => {
    const months = ['10/2026', '11/2026', '12/2026', '1/2027', '2/2027', '3/2027'];
    const monthLabels = ['Okt 2026', 'Nov 2026', 'Des 2026', 'Jan 2027', 'Feb 2027', 'Mar 2027'];
    const safeCounts = new Array(months.length).fill(0);
    const issueCounts = new Array(months.length).fill(0);

    postOctoberReports.forEach(r => {
      const my = getReportMonthYear(r.date || r.timestamp);
      if (my) {
        const idx = months.indexOf(my.key);
        if (idx !== -1) {
          if (r.status === 'Aman' || r.status === 'Selesai') {
            safeCounts[idx]++;
          } else {
            issueCounts[idx]++;
          }
        }
      }
    });

    return {
      labels: monthLabels,
      datasets: [
        {
          label: 'Area Aman & Bersih',
          data: safeCounts,
          borderColor: '#95A823', // Official Lombok Garden Olive Green
          backgroundColor: 'rgba(149, 168, 35, 0.18)',
          fill: true,
          tension: 0.35,
          pointBackgroundColor: '#95A823',
          pointBorderColor: '#ffffff',
          pointHoverRadius: 6,
        },
        {
          label: 'Temuan / Perlu Follow-Up',
          data: issueCounts,
          borderColor: '#C25941', // Warm Terracotta Red
          backgroundColor: 'rgba(194, 89, 65, 0.12)',
          fill: true,
          tension: 0.35,
          pointBackgroundColor: '#C25941',
          pointBorderColor: '#ffffff',
          pointHoverRadius: 6,
        },
      ],
    };
  }, [postOctoberReports]);

  // Locations Distribution (Top 8 locations)
  const locationBarData = useMemo(() => {
    const counts: Record<string, { total: number; issues: number }> = {};

    activeReports.forEach(r => {
      let loc = r.location;
      if (loc.toLowerCase().includes('deluxe') || loc.toLowerCase().includes('kamar')) loc = 'Deluxe Building';
      else if (loc.toLowerCase().includes('pool barat') || loc.toLowerCase().includes('cottage pool')) loc = 'Pool Barat & Cottage';
      else if (loc.toLowerCase().includes('pool timur')) loc = 'Pool Timur';
      else if (loc.toLowerCase().includes('flamboyan') || loc.toLowerCase().includes('resto')) loc = 'Flamboyan Resto';
      else if (loc.toLowerCase().includes('kitchen') || loc.toLowerCase().includes('pantry')) loc = 'Kitchen & Pantry';
      else if (loc.toLowerCase().includes('melati')) loc = 'Melati Ballroom';
      else if (loc.toLowerCase().includes('lobby') || loc.toLowerCase().includes('reception')) loc = 'Lobby & Reception';
      else if (loc.toLowerCase().includes('parkir')) loc = 'Parkiran Depan/Tamu';
      else if (loc.toLowerCase().includes('genset')) loc = 'Area Genset';
      else if (loc.toLowerCase().includes('lotus')) loc = 'Lotus Cafe';
      else if (loc.toLowerCase().includes('laundry') || loc.toLowerCase().includes('teknisi')) loc = 'Laundry & Teknisi';

      if (!counts[loc]) counts[loc] = { total: 0, issues: 0 };
      counts[loc].total++;
      if (r.status === 'Perlu Follow Up' || r.status === 'Dalam Proses') {
        counts[loc].issues++;
      }
    });

    const sorted = Object.entries(counts)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 8);

    return {
      labels: sorted.map(s => s[0]),
      datasets: [
        {
          label: 'Total Patroli / Cek',
          data: sorted.map(s => s[1].total),
          backgroundColor: '#95A823', // Lombok Garden Olive
          borderRadius: 6,
        },
        {
          label: 'Temuan Masalah',
          data: sorted.map(s => s[1].issues),
          backgroundColor: '#877465', // Lombok Garden Warm Earth
          borderRadius: 6,
        },
      ],
    };
  }, [activeReports]);

  // Department Distribution (Follow Up Breakdown)
  const departmentDoughnutData = useMemo(() => {
    const deptCounts: Record<string, number> = {
      'Housekeeping': 0,
      'Engineering': 0,
      'FB Service': 0,
      'Fb Product': 0,
      'Security': 0,
      'Front Office': 0,
    };

    activeReports.forEach(r => {
      if (r.followUpDept && r.followUpDept !== 'None' && r.followUpDept !== 'General') {
        deptCounts[r.followUpDept] = (deptCounts[r.followUpDept] || 0) + 1;
      }
    });

    return {
      labels: ['Housekeeping', 'Engineering', 'FB Service', 'FB Product', 'Security', 'Front Office'],
      datasets: [
        {
          data: [
            deptCounts['Housekeeping'] || 0,
            deptCounts['Engineering'] || 0,
            deptCounts['FB Service'] || 0,
            deptCounts['Fb Product'] || 0,
            deptCounts['Security'] || 0,
            deptCounts['Front Office'] || 0,
          ],
          backgroundColor: [
            '#95A823', // Housekeeping - Olive Garden
            '#877465', // Engineering - Warm Earth Taupe
            '#C6CC81', // FB Service - Sage Leaf
            '#FFBC7D', // FB Product - Amber Peach
            '#61554D', // Security - Deep Espresso
            '#528A3B', // Front Office - Classic Garden Green
          ],
          borderWidth: 2,
          borderColor: '#FAFBF5',
        },
      ],
    };
  }, [activeReports]);

  // Status Ratio Pie
  const statusPieData = useMemo(() => {
    return {
      labels: ['Aman & Kondusif', 'Perlu Tindak Lanjut', 'Dalam Penanganan', 'Tuntas Diselesaikan'],
      datasets: [
        {
          data: [
            stats.safe,
            stats.needFollowUp,
            stats.inProgress,
            activeReports.filter(r => r.status === 'Selesai').length,
          ],
          backgroundColor: ['#95A823', '#C25941', '#FFBC7D', '#C6CC81'],
          borderWidth: 2,
          borderColor: '#FAFBF5',
        },
      ],
    };
  }, [activeReports, stats]);

  // Latest critical reports
  const urgentReports = useMemo(() => {
    return activeReports
      .filter(r => r.status === 'Perlu Follow Up')
      .slice(0, 5);
  }, [activeReports]);

  return (
    <div className="space-y-6">
      {/* Top Welcome & Quick Filter Bar */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#E2E7B8] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#EAEEBB] text-[#61554D] border border-[#C6CC81]">
              MOD Active Shift
            </span>
            <span className="text-xs text-[#70635A]">
              Selamat bertugas, <strong className="text-[#231E1B]">{currentUser.name}</strong> ({currentUser.role})
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-[#231E1B] mt-1.5 tracking-tight">
            MANAGER ON DUTY REPORT
          </h2>
          <p className="text-xs text-[#70635A] mt-0.5">
            Monitoring kondisi fisik hotel, patroli keamanan, kebersihan, dan follow-up departemen Hotel Lombok Garden.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-[#F4F6EA] px-3.5 py-2 rounded-2xl border border-[#D9DF98]">
            <Filter className="w-3.5 h-3.5 text-[#70635A]" />
            <span className="text-xs font-semibold text-[#61554D]">Filter Bulan:</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-xs font-bold text-[#231E1B] focus:outline-none cursor-pointer"
            >
              <option value="all">Semua Periode (Mulai Okt 2026)</option>
              {availableMonths.map((m) => (
                <option key={m.key} value={m.key}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 5 Big KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* KPI 1: Total Inspeksi */}
        <div 
          onClick={() => {
            if (perms.canAccessReports) {
              onNavigateToReports();
            }
          }}
          className={`bg-white rounded-3xl p-5 border border-[#E2E7B8] shadow-xs transition group ${
            perms.canAccessReports 
              ? 'hover:border-[#95A823] hover:shadow-md cursor-pointer' 
              : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#70635A] uppercase tracking-wider">
              Total Laporan MOD
            </span>
            <div className="w-10 h-10 rounded-2xl bg-[#EAEEBB] text-[#70635A] flex items-center justify-center font-bold group-hover:bg-[#95A823] group-hover:text-white transition">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-[#231E1B]">{stats.total}</span>
            <span className="text-xs text-[#70635A]">titik inspeksi</span>
          </div>
          <div className="mt-3 pt-3 border-t border-[#F0F2E2] flex items-center justify-between text-xs text-[#70635A]">
            <span>Rata-rata 4-8 titik/shift</span>
            {perms.canAccessReports ? (
              <span className="text-[#95A823] font-bold flex items-center gap-0.5">
                Lihat data <ArrowRight className="w-3 h-3" />
              </span>
            ) : (
              <span className="text-[#877465] text-[11px] font-medium">Monitoring MOD</span>
            )}
          </div>
        </div>

        {/* KPI 2: Kondisi Aman */}
        <div 
          onClick={() => {
            if (perms.canAccessReports) {
              onNavigateToReports('Aman');
            }
          }}
          className={`bg-white rounded-3xl p-5 border border-[#C6CC81] shadow-xs transition group ${
            perms.canAccessReports 
              ? 'hover:border-[#95A823] hover:shadow-md cursor-pointer' 
              : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#70635A] uppercase tracking-wider">
              Kondusif &amp; Bersih
            </span>
            <div className="w-10 h-10 rounded-2xl bg-[#EAEEBB] text-[#95A823] flex items-center justify-center font-bold group-hover:bg-[#95A823] group-hover:text-white transition">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-[#95A823]">{stats.safe}</span>
            <span className="text-xs font-black text-[#5B6713] bg-[#EAEEBB] px-2.5 py-0.5 rounded-full border border-[#D9DF98]">
              {stats.safePercentage}%
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-[#F0F2E2] flex items-center justify-between text-xs text-[#70635A]">
            <span>Sikon operasional standar</span>
            {perms.canAccessReports ? (
              <span className="text-[#95A823] font-bold flex items-center gap-0.5">
                Filter aman <ArrowRight className="w-3 h-3" />
              </span>
            ) : (
              <span className="text-[#5B6713] text-[11px] font-semibold">Terkendali</span>
            )}
          </div>
        </div>

        {/* KPI 3: Temuan / Perlu Follow Up */}
        <div 
          onClick={() => {
            if (perms.canAccessReports) {
              onNavigateToReports('Perlu Follow Up');
            }
          }}
          className={`bg-white rounded-3xl p-5 border border-[#F2D7D0] shadow-xs transition group ${
            perms.canAccessReports 
              ? 'hover:border-[#C25941] hover:shadow-md cursor-pointer' 
              : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#70635A] uppercase tracking-wider">
              Perlu Follow-Up
            </span>
            <div className="w-10 h-10 rounded-2xl bg-[#FBEBE7] text-[#C25941] flex items-center justify-center font-bold group-hover:bg-[#C25941] group-hover:text-white transition">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-[#C25941]">{stats.needFollowUp}</span>
            <span className="text-xs font-semibold text-[#877465]">
              {stats.inProgress > 0 && `(${stats.inProgress} proses)`}
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-[#F0F2E2] flex items-center justify-between text-xs text-[#70635A]">
            <span>HK &amp; Engineering</span>
            {perms.canAccessReports ? (
              <span className="text-[#C25941] font-bold flex items-center gap-0.5">
                Tindak lanjut <ArrowRight className="w-3 h-3" />
              </span>
            ) : (
              <span className="text-[#C25941] text-[11px] font-semibold">Prioritas</span>
            )}
          </div>
        </div>

        {/* KPI 4: KPI Waktu Penyelesaian Follow-Up (SLA) */}
        <div 
          onClick={() => {
            if (perms.canAccessReports) {
              onNavigateToReports('Selesai');
            }
          }}
          className={`bg-white rounded-3xl p-5 border border-[#D9DF98] shadow-xs transition group ${
            perms.canAccessReports 
              ? 'hover:border-[#95A823] hover:shadow-md cursor-pointer' 
              : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#70635A] uppercase tracking-wider">
              Waktu Selesai (SLA)
            </span>
            <div className="w-10 h-10 rounded-2xl bg-[#EAEEBB] text-[#5B6713] flex items-center justify-center font-bold group-hover:bg-[#95A823] group-hover:text-white transition">
              <Clock className="w-5 h-5 text-[#7B8C1B]" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-[#231E1B]">{resolutionKpi.avgResolutionHours}</span>
            <span className="text-xs font-bold text-[#70635A]">Jam Rata-rata</span>
          </div>
          <div className="mt-3 pt-3 border-t border-[#F0F2E2] flex items-center justify-between text-xs text-[#70635A]">
            <span className="font-semibold text-[#5B6713] bg-[#EAEEBB] px-2 py-0.5 rounded-full text-[10px]">
              {resolutionKpi.resolutionRate}% Tuntas
            </span>
            <span className="text-[#95A823] font-bold text-[11px]">
              Target &le; 6 Jam
            </span>
          </div>
        </div>

        {/* KPI 5: Google Drive & Kompresi Storage */}
        <div className="bg-gradient-to-br from-[#231E1B] to-[#362F2B] text-white rounded-3xl p-5 shadow-md border border-[#4A403A]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#EAEEBB] uppercase tracking-wider flex items-center gap-1.5">
              <HardDrive className="w-4 h-4 text-[#95A823]" />
              Drive Kompresi
            </span>
            <span className="text-[10px] font-black bg-[#95A823]/30 text-[#EAEEBB] px-2 py-0.5 rounded-full border border-[#95A823]/50">
              Hemat {stats.storage.percentageSaved}%
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-white truncate">
              {formatBytes(stats.storage.savedBytes)}
            </span>
            <span className="text-xs text-[#D9DF98]">hemat</span>
          </div>
          <div className="mt-3 pt-3 border-t border-[#4A403A] flex items-center justify-between text-xs text-slate-300">
            <span className="truncate">{stats.storage.totalPictures} bukti foto</span>
            <span className="text-[#95A823] font-bold shrink-0">Sinkron</span>
          </div>
        </div>
      </div>

      {/* Dedicated Follow-Up Resolution KPI & SLA Section */}
      <ResolutionKpiSection
        reports={activeReports}
        userPermissions={perms}
        onUpdateStatus={onUpdateStatus}
        onNavigateToReports={onNavigateToReports}
      />

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend Inspection Timeline (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-5 sm:p-6 border border-[#E2E7B8] shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-[#231E1B] text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#95A823]" />
                Tren Jumlah Inspeksi &amp; Temuan per Bulan
              </h3>
              <p className="text-xs text-[#70635A]">
                Visualisasi kontinuitas pelaporan shift MOD Hotel Lombok Garden
              </p>
            </div>
            <span className="text-xs bg-[#F4F6EA] text-[#61554D] font-semibold px-2.5 py-1 rounded-xl border border-[#D9DF98]">
              10 Bulan Terakhir
            </span>
          </div>
          <div className="h-72 w-full">
            <Line
              data={monthlyTrendData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                  mode: 'index',
                  intersect: false,
                },
                plugins: {
                  legend: {
                    position: 'top',
                    labels: {
                      boxWidth: 12,
                      font: { size: 11, weight: 'bold' },
                    },
                  },
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    grid: { color: '#F4F6EA' },
                    ticks: { font: { size: 10 } },
                  },
                  x: {
                    grid: { display: false },
                    ticks: { font: { size: 10 } },
                  },
                },
              }}
            />
          </div>
        </div>

        {/* Department Workload Doughnut (1 col) */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#E2E7B8] shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-[#231E1B] text-base flex items-center gap-2">
                <Users className="w-4 h-4 text-[#877465]" />
                Distribusi Follow-Up Departemen
              </h3>
            </div>
            <p className="text-xs text-[#70635A] mb-3">
              Pemberian tugas perbaikan ke Housekeeping, Engineering, FBS, dll.
            </p>
            <div className="h-56 w-full flex items-center justify-center">
              <Doughnut
                data={departmentDoughnutData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'bottom',
                      labels: {
                        boxWidth: 10,
                        font: { size: 10 },
                        padding: 10,
                      },
                    },
                  },
                  cutout: '65%',
                }}
              />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-[#F0F2E2] flex items-center justify-between text-xs">
            <span className="text-[#70635A]">Prioritas Terbanyak:</span>
            <span className="font-bold text-[#231E1B]">Housekeeping &amp; Engineering</span>
          </div>
        </div>
      </div>

      {/* Second Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Inspected Areas Bar Chart (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-5 sm:p-6 border border-[#E2E7B8] shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-[#231E1B] text-base flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#95A823]" />
                Intensitas Inspeksi &amp; Temuan per Area Hotel
              </h3>
              <p className="text-xs text-[#70635A]">
                Area dengan volume patroli dan titik perhatian tertinggi
              </p>
            </div>
          </div>
          <div className="h-64 w-full">
            <Bar
              data={locationBarData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'top',
                    labels: { boxWidth: 12, font: { size: 11, weight: 'bold' } },
                  },
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    grid: { color: '#F4F6EA' },
                  },
                  x: {
                    grid: { display: false },
                    ticks: {
                      font: { size: 9.5 },
                      maxRotation: 25,
                      minRotation: 0,
                    },
                  },
                },
              }}
            />
          </div>
        </div>

        {/* Status Ratio & Urgent Alerts (1 col) */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#E2E7B8] shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-[#231E1B] text-base flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-[#877465]" />
                Rasio Status Temuan
              </h3>
            </div>
            <p className="text-xs text-[#70635A] mb-3">
              Perbandingan area yang aman vs perlu tindak lanjut
            </p>
            <div className="h-44 w-full flex items-center justify-center">
              <Pie
                data={statusPieData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'bottom',
                      labels: { boxWidth: 10, font: { size: 9.5 } },
                    },
                  },
                }}
              />
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#F0F2E2]">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-bold text-[#231E1B]">Catatan Perhatian Khusus:</span>
              <button 
                onClick={() => onNavigateToReports('Perlu Follow Up')}
                className="text-[#C25941] font-bold hover:underline"
              >
                Lihat Semua ({stats.needFollowUp})
              </button>
            </div>
            <div className="space-y-2">
              {urgentReports.slice(0, 2).map((item) => (
                <div 
                  key={item.id}
                  className="bg-[#FDF9EE] border border-[#EEDFB8] rounded-2xl p-2.5 text-xs"
                >
                  <div className="flex items-center justify-between font-bold text-[#231E1B]">
                    <span className="truncate max-w-[170px]">{item.location}</span>
                    <span className="text-[10px] bg-[#FBEBE7] text-[#C25941] px-2 py-0.5 rounded font-bold border border-[#F2D7D0]">
                      {item.followUpDept}
                    </span>
                  </div>
                  <p className="text-[#70635A] text-[11px] mt-1 line-clamp-1">
                    {item.problem}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
