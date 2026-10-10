import React, { useState } from 'react';
import { 
  Cloud, 
  CloudOff, 
  RefreshCw, 
  FileText, 
  PlusCircle, 
  HardDrive, 
  CheckCircle2, 
  BarChart3, 
  ListFilter,
  KeyRound,
  LogOut,
  Menu,
  X,
  Pin,
  PinOff,
  ShieldCheck,
  User,
  Sparkles,
  ChevronRight,
  ShieldAlert
} from 'lucide-react';
import type { UserProfile, CloudSyncState, RolePermissionConfig } from '../types/index.ts';
import { LogarLogo } from './LogarLogo';
import { getUserPermissions } from '../services/permissionService.ts';
import { PWAInstallButton } from './pwa/PWAInstallButton';

interface NavbarProps {
  activeTab: 'dashboard' | 'reports';
  setActiveTab: (tab: 'dashboard' | 'reports') => void;
  currentUser: UserProfile;
  syncState: CloudSyncState;
  userPermissions?: RolePermissionConfig;
  onTriggerSync: () => void;
  onOpenNewReport: () => void;
  onOpenPdfExport: () => void;
  onOpenCloudSync: () => void;
  onOpenAuth: () => void;
  onOpenSuperAdmin: () => void;
  onOpenChangeLogo?: () => void;
  isSuperAdminAuth: boolean;
  onLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  currentUser,
  syncState,
  userPermissions,
  onTriggerSync,
  onOpenNewReport,
  onOpenPdfExport,
  onOpenCloudSync,
  onOpenAuth,
  onOpenSuperAdmin,
  onOpenChangeLogo,
  isSuperAdminAuth,
  onLogout,
}) => {
  // Autohide state: unpinned by default so autohide activates on mouse hover
  const [isPinned, setIsPinned] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Computed state: sidebar expands on hover, when pinned, or when opened on mobile
  const isExpanded = isPinned || isHovered || isMobileOpen;

  // Permissions resolved from RBAC system
  const perms = userPermissions || getUserPermissions(currentUser);

  // Strict RBAC: Check if current user has Super Admin authority
  const isSuperAdmin = currentUser.role === 'Super Admin' || isSuperAdminAuth || perms.canAccessSuperAdmin;

  const handleTabChange = (tab: 'dashboard' | 'reports') => {
    setActiveTab(tab);
    setIsMobileOpen(false);
  };

  const handleActionClick = (action: () => void) => {
    action();
    setIsMobileOpen(false);
  };

  return (
    <>
      {/* Mobile Top Bar with Hamburger Toggle */}
      <div className="lg:hidden sticky top-0 z-30 bg-[#231E1B] border-b border-[#3D352F] text-white px-4 py-2.5 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsMobileOpen(true)}
            className="p-2 rounded-xl bg-[#2E2824] hover:bg-[#3D352F] text-[#EAEEBB] border border-[#453D37] transition"
            title="Buka Menu Navigasi"
          >
            <Menu className="w-5 h-5" />
          </button>
          <LogarLogo variant="full" light={true} className="h-7 w-auto" />
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Input MOD button on mobile */}
          {perms.canCreateReport && (
            <button
              onClick={onOpenNewReport}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#95A823] hover:bg-[#83941F] text-white shadow-sm transition"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Input</span>
            </button>
          )}

          {/* User Avatar */}
          <button
            onClick={onOpenAuth}
            className="w-8 h-8 rounded-xl overflow-hidden border border-[#95A823] shrink-0"
            title={currentUser.name}
          >
            <img src={currentUser.avatar} alt={currentUser.name} className="w-full h-full object-cover" />
          </button>
        </div>
      </div>

      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div
          onClick={() => setIsMobileOpen(false)}
          className="fixed inset-0 bg-black/70 backdrop-blur-xs z-40 lg:hidden transition-opacity"
        />
      )}

      {/* Left Sidebar with Smooth Autohide Feature */}
      <aside
        onMouseEnter={() => { if (!isPinned) setIsHovered(true); }}
        onMouseLeave={() => { if (!isPinned) setIsHovered(false); }}
        className={`fixed left-0 top-0 bottom-0 z-40 bg-[#231E1B] border-r border-[#3D352F] text-white flex flex-col justify-between transition-all duration-300 ease-in-out shadow-2xl ${
          isExpanded ? 'w-64' : 'w-[72px]'
        } ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Top Section: Branding & Pin Toggle */}
        <div className="p-3.5 border-b border-[#3D352F] flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            {isExpanded ? (
              <div 
                className="flex items-center gap-2 cursor-pointer overflow-hidden min-w-0 flex-1" 
                onClick={() => handleTabChange('dashboard')}
              >
                <LogarLogo 
                  variant="full" 
                  light={true} 
                  showEditButton={perms.canAccessSuperAdmin && Boolean(onOpenChangeLogo)} 
                  onEdit={perms.canAccessSuperAdmin ? onOpenChangeLogo : undefined} 
                />
              </div>
            ) : (
              <div 
                className="mx-auto cursor-pointer" 
                onClick={() => {
                  setIsPinned(true);
                  setIsHovered(true);
                }}
                title="Buka Menu Navigasi Lengkap"
              >
                <LogarLogo 
                  variant="icon" 
                  className="w-10 h-10 hover:scale-105 transition-transform" 
                  showEditButton={perms.canAccessSuperAdmin && Boolean(onOpenChangeLogo)} 
                  onEdit={perms.canAccessSuperAdmin ? onOpenChangeLogo : undefined} 
                />
              </div>
            )}

            {/* Action Buttons: Pin & Always-Visible Close Button */}
            {isExpanded && (
              <div className="flex items-center gap-1.5 shrink-0">
                {/* Desktop Pin / Autohide Toggle Button */}
                <button
                  type="button"
                  onClick={() => setIsPinned(!isPinned)}
                  className={`hidden sm:flex items-center justify-center w-8 h-8 rounded-xl transition cursor-pointer ${
                    isPinned 
                      ? 'bg-[#95A823] text-white shadow-xs border border-[#95A823]' 
                      : 'bg-[#2E2824] hover:bg-[#3B332E] text-[#C6CC81] hover:text-white border border-[#453D37]'
                  }`}
                  title={isPinned ? 'Lepas Sematan (Aktifkan Mode Autohide)' : 'Sematkan Sidebar (Tetap Terbuka)'}
                  aria-label={isPinned ? 'Lepas Sematan' : 'Sematkan Sidebar'}
                >
                  {isPinned ? <Pin className="w-4 h-4" /> : <PinOff className="w-4 h-4 text-[#877465]" />}
                </button>

                {/* Close Button - VISIBLE ON ALL DEVICES (Mobile, Tablet, Desktop, Laptop) */}
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileOpen(false);
                    setIsPinned(false);
                    setIsHovered(false);
                  }}
                  className="w-8 h-8 rounded-xl bg-[#2E2824] hover:bg-[#C25941] text-[#EAEEBB] hover:text-white border border-[#453D37] hover:border-[#C25941] flex items-center justify-center transition shadow-xs cursor-pointer"
                  title="Tutup Menu (Close)"
                  aria-label="Tutup Menu"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Role Status Tag when Expanded */}
          {isExpanded && (
            <div className={`px-2.5 py-1 rounded-xl text-[10px] font-bold flex items-center justify-between border ${
              isSuperAdmin 
                ? 'bg-[#FFBC7D]/15 text-[#FFBC7D] border-[#FFBC7D]/30' 
                : 'bg-[#EAEEBB]/15 text-[#EAEEBB] border-[#C6CC81]/30'
            }`}>
              <span className="flex items-center gap-1.5 truncate">
                {isSuperAdmin ? <ShieldCheck className="w-3 h-3 text-[#FFBC7D]" /> : <User className="w-3 h-3 text-[#95A823]" />}
                <span className="truncate">Role: {currentUser.role}</span>
              </span>
              <span className="text-[9px] opacity-75">
                {isSuperAdmin ? 'Akses Penuh' : 'Akses Terotorisasi'}
              </span>
            </div>
          )}
        </div>

        {/* Middle Section: Navigation Menu Items (Strictly Filtered by Role) */}
        <div className="flex-1 overflow-y-auto px-2.5 py-4 space-y-4">
          {/* Section 1: Main View Navigation */}
          <div className="space-y-1">
            {isExpanded && (
              <p className="px-2.5 text-[9px] font-black uppercase tracking-wider text-[#877465]">
                Menu Tampilan
              </p>
            )}

            {/* 1. Dasbor Visual */}
            {perms.canAccessDashboard && (
              <button
                onClick={() => handleTabChange('dashboard')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                  activeTab === 'dashboard'
                    ? 'bg-[#95A823] text-white shadow-md shadow-[#95A823]/30'
                    : 'text-[#D9DF98] hover:text-white hover:bg-[#2E2824]'
                } ${!isExpanded ? 'justify-center px-0' : ''}`}
                title="Dasbor Visual & Statistik"
              >
                <BarChart3 className="w-4 h-4 shrink-0" />
                {isExpanded && (
                  <div className="text-left flex-1 truncate">
                    <p className="leading-tight truncate">Dasbor Visual</p>
                    <p className="text-[10px] opacity-80 font-normal truncate">Statistik &amp; Grafik Temuan</p>
                  </div>
                )}
              </button>
            )}

            {/* 2. Data Laporan (ReportListView) */}
            {perms.canAccessReports && (
              <button
                onClick={() => handleTabChange('reports')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                  activeTab === 'reports'
                    ? 'bg-[#95A823] text-white shadow-md shadow-[#95A823]/30'
                    : 'text-[#D9DF98] hover:text-white hover:bg-[#2E2824]'
                } ${!isExpanded ? 'justify-center px-0' : ''}`}
                title="Data Riwayat Laporan Lengkap"
              >
                <ListFilter className="w-4 h-4 shrink-0" />
                {isExpanded && (
                  <div className="text-left flex-1 truncate">
                    <p className="leading-tight truncate">Data Laporan</p>
                    <p className="text-[10px] opacity-80 font-normal truncate">Riwayat &amp; Filter Inspeksi</p>
                  </div>
                )}
                {isExpanded && isSuperAdmin && (
                  <span className="text-[9px] bg-[#231E1B] text-[#EAEEBB] px-1.5 py-0.5 rounded font-mono font-bold">
                    Admin
                  </span>
                )}
              </button>
            )}
          </div>

          {/* Section 2: Input & Actions */}
          {(perms.canCreateReport || perms.canExportPdf) && (
            <div className="space-y-1 pt-2 border-t border-[#3D352F]">
              {isExpanded && (
                <p className="px-2.5 text-[9px] font-black uppercase tracking-wider text-[#877465]">
                  Tindakan Operasional
                </p>
              )}

              {/* 3. Input Laporan MOD */}
              {perms.canCreateReport && (
                <button
                  onClick={() => handleActionClick(onOpenNewReport)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-xs font-black transition-all bg-[#95A823] hover:bg-[#83941F] text-white shadow-md shadow-[#95A823]/25 transform hover:-translate-y-0.5 ${
                    !isExpanded ? 'justify-center px-0' : ''
                  }`}
                  title="Input Laporan Inspeksi Baru"
                >
                  <PlusCircle className="w-4 h-4 shrink-0 text-white" />
                  {isExpanded && (
                    <div className="text-left flex-1 truncate">
                      <p className="leading-tight truncate">+ Input Data MOD</p>
                      <p className="text-[10px] opacity-85 font-normal truncate">Patroli &amp; Temuan Baru</p>
                    </div>
                  )}
                </button>
              )}

              {/* 4. Ekspor PDF */}
              {perms.canExportPdf && (
                <button
                  onClick={() => handleActionClick(onOpenPdfExport)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-xs font-bold transition-all bg-[#2E2824] hover:bg-[#3B332E] text-[#EAEEBB] border border-[#453D37] ${
                    !isExpanded ? 'justify-center px-0' : ''
                  }`}
                  title="Ekspor PDF Format Resmi LOGAR"
                >
                  <FileText className="w-4 h-4 shrink-0 text-[#EAEEBB]" />
                  {isExpanded && (
                    <div className="text-left flex-1 truncate">
                      <p className="leading-tight truncate">Ekspor PDF Resmi</p>
                      <p className="text-[10px] text-[#70635A] font-normal truncate">Format Cetak Laporan</p>
                    </div>
                  )}
                </button>
              )}
            </div>
          )}

          {/* Section 3: Cloud & Super Admin Controls */}
          {(perms.canSyncCloud || perms.canAccessSuperAdmin) && (
            <div className="space-y-1 pt-2 border-t border-[#3D352F]">
              {isExpanded && (
                <p className="px-2.5 text-[9px] font-black uppercase tracking-wider text-[#FFBC7D]">
                  Administrasi &amp; Cloud
                </p>
              )}

              {/* Cloud Sync Status Button */}
              {perms.canSyncCloud && (
                <button
                  onClick={() => handleActionClick(onOpenCloudSync)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-xs font-bold transition-all bg-[#2E2824] hover:bg-[#3B332E] border border-[#453D37] text-[#D9DF98] ${
                    !isExpanded ? 'justify-center px-0' : ''
                  }`}
                  title="Pengaturan Google Drive & Cloud Sync"
                >
                  {syncState.isOnline ? (
                    syncState.isSyncing ? (
                      <RefreshCw className="w-4 h-4 text-[#FFBC7D] animate-spin shrink-0" />
                    ) : syncState.pendingCount > 0 ? (
                      <Cloud className="w-4 h-4 text-[#FFBC7D] shrink-0" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-[#95A823] shrink-0" />
                    )
                  ) : (
                    <CloudOff className="w-4 h-4 text-rose-400 shrink-0" />
                  )}
                  {isExpanded && (
                    <div className="text-left flex-1 truncate">
                      <p className="leading-tight truncate">Sinkronisasi Cloud</p>
                      <p className="text-[10px] text-[#70635A] font-normal truncate">
                        {syncState.isSyncing ? 'Menyinkronkan...' : 'Google Drive & Firestore'}
                      </p>
                    </div>
                  )}
                </button>
              )}

              {/* Ganti Logo & Kustomisasi Brand - ONLY FOR SUPER ADMIN */}
              {perms.canAccessSuperAdmin && onOpenChangeLogo && (
                <button
                  onClick={() => handleActionClick(onOpenChangeLogo)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-xs font-bold transition-all bg-[#2E2824] hover:bg-[#3B332E] text-[#EAEEBB] hover:text-white border border-[#453D37] hover:border-[#95A823] ${
                    !isExpanded ? 'justify-center px-0' : ''
                  }`}
                  title="Ganti Logo & Ikon Hotel Lombok Garden (Khusus Super Admin)"
                >
                  <Sparkles className="w-4 h-4 text-[#95A823] shrink-0" />
                  {isExpanded && (
                    <div className="text-left flex-1 truncate">
                      <p className="leading-tight truncate text-white">Ganti Logo &amp; Ikon</p>
                      <p className="text-[10px] text-[#C6CC81] font-normal truncate">Khusus Super Admin</p>
                    </div>
                  )}
                </button>
              )}

              {/* Super Admin Control Center */}
              {perms.canAccessSuperAdmin && (
                <button
                  onClick={() => handleActionClick(onOpenSuperAdmin)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-xs font-bold transition-all border ${
                    isSuperAdminAuth
                      ? 'bg-[#FFBC7D]/20 text-[#FFBC7D] border-[#FFBC7D]/60 hover:bg-[#FFBC7D]/30'
                      : 'bg-[#2E2824] text-[#D9DF98] border-[#453D37] hover:text-[#FFBC7D]'
                  } ${!isExpanded ? 'justify-center px-0' : ''}`}
                  title="Super Admin Backend Control Center"
                >
                  <KeyRound className="w-4 h-4 text-[#FFBC7D] shrink-0" />
                  {isExpanded && (
                    <div className="text-left flex-1 truncate">
                      <p className="leading-tight truncate text-[#FFBC7D]">Super Admin Panel</p>
                      <p className="text-[10px] text-[#FFBC7D]/70 font-normal truncate">Hak Akses, User &amp; Backup</p>
                    </div>
                  )}
                </button>
              )}

              {/* PWA Install Button in Sidebar */}
              <div className={!isExpanded ? 'flex justify-center' : 'w-full'}>
                <PWAInstallButton compact={!isExpanded} />
              </div>
            </div>
          )}

          {/* Non-admin notice when expanded */}
          {!isSuperAdmin && isExpanded && (
            <div className="p-2.5 rounded-2xl bg-[#2A2420] border border-[#3D352F] text-[10px] text-[#A89E96] space-y-1">
              <p className="font-bold text-[#EAEEBB] flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5 text-[#95A823]" />
                <span>Hak Akses: {currentUser.role}</span>
              </p>
              <p className="leading-relaxed">
                Menu dan fitur yang aktif disesuaikan oleh Super Administrator berdasarkan wewenang peran jabatan Anda.
              </p>
            </div>
          )}
        </div>

        {/* Bottom Section: User Profile & Logout */}
        <div className="p-3 border-t border-[#3D352F] bg-[#1E1917] space-y-2">
          {/* User Profile Card */}
          <div 
            onClick={() => handleActionClick(onOpenAuth)}
            className={`flex items-center gap-2.5 p-1.5 rounded-2xl bg-[#28211D] hover:bg-[#342C27] border border-[#453D37] transition cursor-pointer ${
              !isExpanded ? 'justify-center p-1' : ''
            }`}
            title={`Petugas: ${currentUser.name} (${currentUser.role})`}
          >
            <div className="relative shrink-0">
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className="w-9 h-9 rounded-xl object-cover border-2 border-[#95A823]"
              />
              <span className="w-2.5 h-2.5 rounded-full bg-[#95A823] border-2 border-[#1E1917] absolute -bottom-0.5 -right-0.5"></span>
            </div>

            {isExpanded && (
              <div className="text-left flex-1 min-w-0">
                <p className="text-xs font-bold text-white truncate">
                  {currentUser.name}
                </p>
                <p className="text-[10px] text-[#C6CC81] truncate font-medium">
                  {currentUser.role} &bull; {currentUser.department}
                </p>
              </div>
            )}
          </div>

          {/* Logout Button */}
          {onLogout && (
            <button
              onClick={() => handleActionClick(onLogout)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold bg-[#28211D] hover:bg-[#C25941]/20 text-[#D9DF98] hover:text-[#FFBC7D] border border-[#453D37] hover:border-[#C25941]/60 transition ${
                !isExpanded ? 'justify-center px-0' : ''
              }`}
              title="Keluar / Logout dari Sistem"
            >
              <LogOut className="w-3.5 h-3.5 text-[#FFBC7D] shrink-0" />
              {isExpanded && <span className="truncate">Keluar Sistem</span>}
            </button>
          )}

          {/* Autohide Hint Footer & Quick Close */}
          {isExpanded && (
            <div className="flex items-center justify-between pt-1 px-1 text-[10px] text-[#A89E96]">
              <span className="truncate">
                {isPinned ? '📌 Tersemat' : '🔓 Mode Autohide'}
              </span>
              <button
                type="button"
                onClick={() => {
                  setIsMobileOpen(false);
                  setIsPinned(false);
                  setIsHovered(false);
                }}
                className="text-[#D9DF98] hover:text-[#EAEEBB] hover:underline font-semibold cursor-pointer shrink-0"
                title="Tutup Menu"
              >
                Tutup Menu &times;
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
