import React, { useState, useEffect, useCallback } from 'react';
import { 
  loadReports, 
  saveReports, 
  getSyncState, 
  syncReportsToCloud, 
  saveSyncConfig,
  clearAllReports,
  recordDeletedReportId
} from './services/storageService';
import { 
  getStoredUser, 
  saveStoredUser, 
  getSessionUser,
  setSessionUser,
  clearSessionUser,
  isSuperAdminSessionValid,
  setSuperAdminSession,
  clearSuperAdminSession,
  getAllUsers,
  INITIAL_HOTEL_USERS,
  setUsersFromCloud
} from './services/authService';
import { setSettingsFromCloud } from './services/systemSettingsService';
import { startLiveDatabaseSync } from './services/liveSyncService';
import { 
  subscribeToFirestoreReports, 
  subscribeToFirestoreUsers, 
  subscribeToFirestoreSettings, 
  saveReportToFirestore, 
  deleteReportFromFirestore, 
  initFirebaseAuth, 
  seedUsersToFirestore,
  isFirestoreQuotaExceeded
} from './services/firebase';
import { ModReportItem, ReportStatus, UserProfile, CloudSyncState, SystemPermissionsState, RolePermissionConfig } from './types';
import { 
  getStoredPermissions, 
  subscribeToFirestorePermissions, 
  fetchPermissionsFromFirestore, 
  getUserPermissions 
} from './services/permissionService';
import { parseReportDateTime } from './services/kpiResolutionService';
import { LoginPage } from './components/LoginPage';
import { Navbar } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { ReportListView } from './components/ReportListView';
import { NewReportModal } from './components/NewReportModal';
import { PdfExportModal } from './components/PdfExportModal';
import { CloudSyncModal } from './components/CloudSyncModal';
import { AuthModal } from './components/AuthModal';
import { SuperAdminDashboard } from './components/admin/SuperAdminDashboard';
import { SuperAdminLoginModal } from './components/admin/SuperAdminLoginModal';
import { ChangeLogoModal } from './components/ChangeLogoModal';
import { OfflineIndicator } from './components/pwa/OfflineIndicator';
import { 
  Building2, 
  CheckCircle, 
  ShieldCheck, 
  Cloud, 
  Sparkles, 
  ArrowUpRight,
  HardDrive
} from 'lucide-react';

export default function App() {
  const [reports, setReports] = useState<ModReportItem[]>([]);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => getSessionUser());
  const [syncState, setSyncState] = useState<CloudSyncState>({
    isAutoSyncEnabled: true,
    isOnline: navigator.onLine,
    isSyncing: false,
    lastSyncedAt: null,
    pendingCount: 0,
    totalSyncedCount: 0,
    driveFolderName: 'HOTEL LOMBOK GARDEN / MOD REPORTS 2026',
    driveFolderId: '1LG_MOD_DRIVE_FOLDER_2026',
  });

  const [activeTab, setActiveTab] = useState<'dashboard' | 'reports'>('dashboard');
  const [reportFilterStatus, setReportFilterStatus] = useState<string>('all');
  const [permissions, setPermissions] = useState<SystemPermissionsState>(getStoredPermissions());
  const [firestoreQuotaExceeded, setFirestoreQuotaExceededState] = useState(() => isFirestoreQuotaExceeded());

  // Modals
  const [isNewReportOpen, setIsNewReportOpen] = useState(false);
  const [isPdfExportOpen, setIsPdfExportOpen] = useState(false);
  const [isCloudSyncOpen, setIsCloudSyncOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isChangeLogoOpen, setIsChangeLogoOpen] = useState(false);
  const [isSuperAdminLoginOpen, setIsSuperAdminLoginOpen] = useState(false);
  const [isAdminView, setIsAdminView] = useState(false);
  const [isSuperAdminAuth, setIsSuperAdminAuth] = useState(isSuperAdminSessionValid());

  // Calculate current user's effective RBAC permissions
  const currentPermissions = getUserPermissions(currentUser, permissions);

  // Toast banner
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  }, []);

  // Initialize data & real-time Firestore sync listeners
  useEffect(() => {
    // Load cached reports immediately for zero-delay UI display
    const loaded = loadReports();
    setReports(loaded);
    setSyncState(getSyncState(loaded));

    // Initialize Firebase Auth & seed initial users to Firestore once
    const isUsersSeeded = localStorage.getItem('mod_report_users_seeded_cloud_v1');
    if (!isUsersSeeded && !isFirestoreQuotaExceeded()) {
      initFirebaseAuth().then(() => {
        seedUsersToFirestore(getAllUsers()).then(() => {
          localStorage.setItem('mod_report_users_seeded_cloud_v1', 'true');
        }).catch(() => {});
      }).catch(err => {
        console.warn('Firebase init note:', err);
      });
    }

    // Real-time synchronization for role permissions matrix across all devices & IPs
    fetchPermissionsFromFirestore().then((cloudPerms) => {
      if (cloudPerms) {
        setPermissions(cloudPerms);
      }
    });

    const unsubPerms = subscribeToFirestorePermissions((cloudPerms) => {
      if (cloudPerms) {
        setPermissions(cloudPerms);
      }
    });

    // Real-time synchronization for MOD reports across all devices & IPs
    const unsubReports = subscribeToFirestoreReports(
      (cloudReports) => {
        if (cloudReports && cloudReports.length > 0) {
          saveReports(cloudReports);
          const mergedAll = loadReports();
          setReports(mergedAll);
          setSyncState(getSyncState(mergedAll));
        }
      },
      (err) => console.warn('Real-time reports listener note:', err)
    );

    // Real-time synchronization for users and permissions across all devices & IPs
    const unsubUsers = subscribeToFirestoreUsers(
      (cloudUsers) => {
        if (cloudUsers && cloudUsers.length > 0) {
          setUsersFromCloud(cloudUsers);
        }
      },
      (err) => console.warn('Real-time users listener note:', err)
    );

    // Real-time synchronization for system settings across all devices & IPs
    const unsubSettings = subscribeToFirestoreSettings(
      (cloudSettings) => {
        if (cloudSettings) {
          setSettingsFromCloud(cloudSettings);
        }
      },
      (err) => console.warn('Real-time settings listener note:', err)
    );

    const handlePermsUpdated = (e: any) => {
      if (e.detail) {
        setPermissions(e.detail);
      }
    };
    window.addEventListener('logar_permissions_updated', handlePermsUpdated);

    const handleQuotaExceeded = () => {
      setFirestoreQuotaExceededState(true);
    };
    window.addEventListener('logar_firestore_quota_exceeded', handleQuotaExceeded);

    // Start real-time server database SSE synchronization & polling
    const stopLiveSync = startLiveDatabaseSync();

    return () => {
      stopLiveSync();
      unsubReports();
      unsubUsers();
      unsubSettings();
      unsubPerms();
      window.removeEventListener('logar_permissions_updated', handlePermsUpdated);
      window.removeEventListener('logar_firestore_quota_exceeded', handleQuotaExceeded);
    };
  }, []);

  // Listen to network status
  useEffect(() => {
    const handleOnline = () => {
      setSyncState(prev => ({ ...prev, isOnline: true }));
      showToast('Koneksi internet kembali aktif & cloud tersambung.');
    };
    const handleOffline = () => {
      setSyncState(prev => ({ ...prev, isOnline: false }));
      showToast('Mode Offline. Data tetap disimpan lokal & akan disinkronkan saat online.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const handleSettingsUpdated = () => {
      setSyncState(prev => ({ ...prev }));
    };
    window.addEventListener('logar_settings_updated', handleSettingsUpdated);

    const handleReportsUpdated = (e: any) => {
      if (e.detail && Array.isArray(e.detail)) {
        setReports(e.detail);
        setSyncState(getSyncState(e.detail));
      }
    };
    window.addEventListener('logar_reports_updated', handleReportsUpdated);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('logar_settings_updated', handleSettingsUpdated);
      window.removeEventListener('logar_reports_updated', handleReportsUpdated);
    };
  }, [showToast]);

  // Cloud sync trigger
  const handleTriggerSync = useCallback(async () => {
    setSyncState(prev => ({ ...prev, isSyncing: true }));
    try {
      const res = await syncReportsToCloud(reports);
      if (res.success) {
        setReports(res.updatedReports);
        setSyncState(getSyncState(res.updatedReports));
        showToast(
          res.syncedCount > 0 
            ? `Berhasil menyinkronkan ${res.syncedCount} laporan ke Firebase & Google Drive!`
            : 'Semua laporan sudah tersinkronisasi dengan Cloud.'
        );
      }
    } catch (e) {
      console.error(e);
      showToast('Gagal melakukan sinkronisasi cloud.');
    } finally {
      setSyncState(prev => ({ ...prev, isSyncing: false }));
    }
  }, [reports, showToast]);

  // Add new report
  const handleAddReport = (newReport: ModReportItem) => {
    saveReports([newReport, ...reports]);
    const merged = loadReports();
    setReports(merged);
    setSyncState(getSyncState(merged));

    // Instant server-side multi-device synchronization via REST API
    fetch('/api/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ report: newReport }),
    })
      .then(res => res.json())
      .then(data => {
        if (data && Array.isArray(data.reports)) {
          saveReports(data.reports);
          const updatedServerReports = loadReports();
          setReports(updatedServerReports);
          setSyncState(getSyncState(updatedServerReports));
        }
      })
      .catch(err => {
        console.warn('Real-time server sync deferred:', err);
      });

    // Real-time Firestore sync across all devices & IPs
    saveReportToFirestore(newReport).catch(err => {
      console.warn('Real-time Firestore write deferred:', err);
    });

    showToast(`Laporan MOD area "${newReport.location}" berhasil dicatat & disinkronkan real-time!`);

    // Auto-sync in background if enabled and online
    if (syncState.isAutoSyncEnabled && navigator.onLine) {
      setTimeout(() => {
        handleTriggerSync();
      }, 1200);
    }
  };

  // Update report status
  const handleUpdateStatus = (reportId: string, newStatus: ReportStatus) => {
    let targetReport: ModReportItem | null = null;
    const nowIso = new Date().toISOString();
    const nowMs = Date.now();

    const updated = reports.map(r => {
      if (r.id === reportId) {
        let resolvedAt = r.resolvedAt;
        let resolvedBy = r.resolvedBy;
        let resolutionDurationHours = r.resolutionDurationHours;

        if (newStatus === 'Selesai') {
          if (!resolvedAt) {
            resolvedAt = nowIso;
            resolvedBy = currentUser?.name || 'Petugas MOD';
            const createdMs = parseReportDateTime(r).getTime();
            const diffHours = Math.max(0.1, (nowMs - createdMs) / (1000 * 3600));
            resolutionDurationHours = Math.round(diffHours * 10) / 10;
          }
        } else {
          // If moved back to Perlu Follow Up or Dalam Proses, clear completion timestamp
          resolvedAt = undefined;
          resolvedBy = undefined;
          resolutionDurationHours = undefined;
        }

        targetReport = { 
          ...r, 
          status: newStatus, 
          synced: false 
        };

        if (newStatus === 'Selesai') {
          targetReport.resolvedAt = resolvedAt;
          targetReport.resolvedBy = resolvedBy;
          targetReport.resolutionDurationHours = resolutionDurationHours;
        } else {
          delete targetReport.resolvedAt;
          delete targetReport.resolvedBy;
          delete targetReport.resolutionDurationHours;
        }

        return targetReport;
      }
      return r;
    });
    setReports(updated);
    saveReports(updated);
    setSyncState(getSyncState(updated));

    if (targetReport) {
      // Instant server-side multi-device update
      fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report: targetReport }),
      }).catch(err => {
        console.warn('Real-time server status update deferred:', err);
      });

      // Real-time Firestore update across all devices & IPs
      saveReportToFirestore(targetReport).catch(err => {
        console.warn('Real-time Firestore update deferred:', err);
      });
    }

    showToast(`Status temuan diperbarui menjadi: ${newStatus}`);
  };

  // Delete report
  const handleDeleteReport = (reportId: string) => {
    recordDeletedReportId(reportId);
    const updated = reports.filter(r => r.id !== reportId);
    setReports(updated);
    saveReports(updated);
    setSyncState(getSyncState(updated));

    // Instant server-side multi-device delete
    fetch(`/api/reports/${reportId}`, {
      method: 'DELETE',
    }).catch(err => {
      console.warn('Real-time server delete deferred:', err);
    });

    // Real-time Firestore delete across all devices & IPs
    deleteReportFromFirestore(reportId).catch(err => {
      console.warn('Real-time Firestore delete deferred:', err);
    });

    showToast('Catatan inspeksi dihapus.');
  };

  // Clear all reports across Firestore & Local Storage (Strictly Super Admin only)
  const handleClearAllReports = async () => {
    if (!isSuperAdmin && currentUser?.role !== 'Super Admin') {
      showToast('Akses ditolak: Hanya Super Administrator yang berhak mengosongkan seluruh laporan.');
      return;
    }
    setReports([]);
    saveReports([]);
    setSyncState(getSyncState([]));
    await clearAllReports();
    showToast('Seluruh data laporan inspeksi berhasil dihapus tuntas.');
  };

  const handleLogout = () => {
    clearSessionUser();
    clearSuperAdminSession();
    setIsSuperAdminAuth(false);
    setIsAdminView(false);
    setCurrentUser(null);
    showToast('Anda telah berhasil keluar dari sistem MOD LOGAR.');
  };

  // Check if current user is Super Admin
  const isSuperAdmin = currentUser?.role === 'Super Admin' || isSuperAdminAuth;

  // Enforce RBAC: Ensure current user stays on a permitted tab
  useEffect(() => {
    if (currentUser) {
      if (activeTab === 'reports' && !currentPermissions.canAccessReports) {
        setActiveTab('dashboard');
      } else if (activeTab === 'dashboard' && !currentPermissions.canAccessDashboard && currentPermissions.canAccessReports) {
        setActiveTab('reports');
      }
    }
  }, [currentUser, currentPermissions.canAccessReports, currentPermissions.canAccessDashboard, activeTab]);

  // Navigate to reports tab with optional filter - checked against role permissions
  const handleNavigateToReports = (statusFilter?: string) => {
    if (!currentPermissions.canAccessReports) {
      showToast('Akses dibatasi: Role Anda tidak memiliki izin untuk melihat riwayat data laporan.');
      return;
    }
    if (statusFilter) {
      setReportFilterStatus(statusFilter);
    } else {
      setReportFilterStatus('all');
    }
    setActiveTab('reports');
  };

  const handleOpenSuperAdmin = () => {
    if (!currentPermissions.canAccessSuperAdmin && !isSuperAdmin) {
      showToast('Akses dibatasi: Khusus untuk akun dengan izin Super Administrator.');
      return;
    }
    if (isSuperAdminSessionValid()) {
      setIsSuperAdminAuth(true);
      setIsAdminView(true);
    } else {
      setIsSuperAdminLoginOpen(true);
    }
  };

  const handleRefreshData = () => {
    const loaded = loadReports();
    setReports(loaded);
    setSyncState(getSyncState(loaded));
  };

  // Default Landing Page: If user is not authenticated, show LoginPage
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#FAFBF5]">
        {/* Toast Banner */}
        {toastMessage && (
          <div className="fixed bottom-5 right-5 z-50 bg-[#231E1B] text-[#FAFBF5] px-4 py-3 rounded-2xl shadow-2xl border border-[#95A823]/50 flex items-center gap-2.5 text-xs animate-bounce font-medium">
            <Sparkles className="w-4 h-4 text-[#95A823] shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        <LoginPage
          onLoginSuccess={(user) => {
            setCurrentUser(user);
            setSessionUser(user);
            if (user.role === 'Super Admin') {
              setIsSuperAdminAuth(true);
              setSuperAdminSession();
            }
            showToast(`Selamat datang, ${user.name} (${user.role})!`);
          }}
          onOpenSuperAdmin={handleOpenSuperAdmin}
        />

        <SuperAdminLoginModal
          isOpen={isSuperAdminLoginOpen}
          onClose={() => setIsSuperAdminLoginOpen(false)}
          onLoginSuccess={() => {
            setIsSuperAdminAuth(true);
            const superAdminUser = getAllUsers().find(u => u.role === 'Super Admin') || INITIAL_HOTEL_USERS[0];
            setSessionUser(superAdminUser);
            setCurrentUser(superAdminUser);
            setIsAdminView(true);
            showToast('Selamat datang di Super Admin Backend Control Center.');
          }}
        />
      </div>
    );
  }

  // If in Super Admin Backend mode, show full backend control center
  if (isAdminView) {
    return (
      <SuperAdminDashboard
        onBackToApp={() => {
          setIsAdminView(false);
          setIsSuperAdminAuth(isSuperAdminSessionValid());
        }}
        reports={reports}
        onRefreshData={handleRefreshData}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFBF5] text-[#231E1B] flex flex-col font-sans">
      <OfflineIndicator />
      {/* Toast Banner */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-[#231E1B] text-[#FAFBF5] px-4 py-3 rounded-2xl shadow-2xl border border-[#95A823]/50 flex items-center gap-2.5 text-xs animate-bounce font-medium">
          <Sparkles className="w-4 h-4 text-[#95A823] shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Left Sidebar Navigation with Autohide Feature & Role-based Access */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={currentUser}
        syncState={syncState}
        userPermissions={currentPermissions}
        onTriggerSync={handleTriggerSync}
        onOpenNewReport={() => {
          if (!currentPermissions.canCreateReport) {
            showToast('Akses dibatasi: Role Anda tidak memiliki izin input laporan.');
            return;
          }
          setIsNewReportOpen(true);
        }}
        onOpenPdfExport={() => {
          if (!currentPermissions.canExportPdf) {
            showToast('Akses dibatasi: Role Anda tidak memiliki izin ekspor PDF.');
            return;
          }
          setIsPdfExportOpen(true);
        }}
        onOpenCloudSync={() => {
          if (!currentPermissions.canSyncCloud) {
            showToast('Akses dibatasi: Role Anda tidak memiliki izin sinkronisasi cloud.');
            return;
          }
          setIsCloudSyncOpen(true);
        }}
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenSuperAdmin={handleOpenSuperAdmin}
        onOpenChangeLogo={currentPermissions.canAccessSuperAdmin ? () => setIsChangeLogoOpen(true) : undefined}
        isSuperAdminAuth={isSuperAdminAuth}
        onLogout={handleLogout}
      />

      {/* Main Content Layout with Left Offset on Desktop for Autohide Sidebar */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-[72px] transition-all duration-300">
        {/* Top Slim Hotel Identity Bar */}
        <div className="bg-[#95A823] px-3 sm:px-4 py-1.5 text-xs text-white font-medium flex items-center justify-between border-b border-[#7B8C1B]/40 gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="inline-block w-2 h-2 rounded-full bg-[#EAEEBB] animate-pulse shrink-0"></span>
            <span className="font-semibold tracking-wide text-white text-[11px] truncate">
              LOMBOK GARDEN HOTEL &bull; SISTEM RESMI MANAGER ON DUTY (MOD LOGAR)
            </span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 text-[11px] text-[#FAFBF5] opacity-95 shrink-0">
            <span className="hidden md:inline">www.lombokgardenhotel.com</span>
            <span className="hidden md:inline">&bull;</span>
            <span className="font-bold text-[#EAEEBB] bg-[#231E1B]/30 px-2 py-0.5 rounded text-[10px] sm:text-xs">
              {currentUser?.role || (isSuperAdmin ? 'Super Admin' : 'Petugas MOD')}
            </span>
          </div>
        </div>

        {/* Firestore Free Tier Quota Notice Banner */}
        {firestoreQuotaExceeded && (
          <div className="bg-[#2E2824] border-b border-[#F2D7D0]/30 px-4 py-2 text-xs text-[#FAFBF5] flex flex-col sm:flex-row items-center justify-between gap-2 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0"></span>
              <p className="text-[11px] leading-relaxed">
                <strong>Batas Kuota Gratis Firebase Firestore Tercapai Hari Ini</strong> (Spark Free Tier limit: 20.000 unit tulis/hari). Seluruh data tetap aman tersimpan di database lokal &amp; server hotel. Kuota akan direset otomatis besok oleh Google.
              </p>
            </div>
            <a
              href="https://console.firebase.google.com/project/liquid-splicer-94mm2/firestore/databases/ai-studio-modreportlogar-a8954153-8d4f-4d57-91ff-5afb4e0a8bff/data?openUpgradeDialog=true"
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 px-2.5 py-1 bg-[#95A823] hover:bg-[#83941F] text-white rounded-lg text-[10px] font-bold transition flex items-center gap-1 shadow-xs"
            >
              <span>Upgrade / Cek Kuota</span>
              <ArrowUpRight className="w-3 h-3" />
            </a>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {activeTab === 'dashboard' ? (
            <DashboardView
              reports={reports}
              currentUser={currentUser}
              userPermissions={currentPermissions}
              onNavigateToReports={handleNavigateToReports}
              onUpdateStatus={handleUpdateStatus}
              onOpenNewReport={() => {
                if (!currentPermissions.canCreateReport) {
                  showToast('Akses dibatasi: Role Anda tidak memiliki izin input laporan.');
                  return;
                }
                setIsNewReportOpen(true);
              }}
            />
          ) : (
            <ReportListView
              reports={reports}
              currentUser={currentUser}
              userPermissions={currentPermissions}
              onUpdateStatus={handleUpdateStatus}
              onDeleteReport={handleDeleteReport}
              onOpenPdfExport={() => {
                if (!currentPermissions.canExportPdf) {
                  showToast('Akses dibatasi: Role Anda tidak memiliki izin ekspor PDF.');
                  return;
                }
                setIsPdfExportOpen(true);
              }}
              onClearAllReports={isSuperAdmin || currentUser?.role === 'Super Admin' ? handleClearAllReports : undefined}
              initialFilterStatus={reportFilterStatus}
            />
          )}
        </main>

        {/* Footer in Official Lombok Garden Hotel Dark Earth Timber */}
        <footer className="bg-[#231E1B] border-t border-[#3D352F] text-[#C6CC81] py-6 text-xs mt-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#95A823]"></span>
                <span className="font-extrabold text-white tracking-wide">LOMBOK GARDEN HOTEL</span>
              </div>
              <span className="hidden sm:inline text-[#877465]">&bull;</span>
              <span className="text-[#D9DF98] font-serif italic text-sm">Experience the Green of the City</span>
              <span className="hidden md:inline text-[#877465]">&bull;</span>
              <span className="text-[#877465] hidden md:inline">MOD REPORT LOGAR</span>
            </div>

            <div className="flex items-center gap-3 text-[11px] text-[#FAFBF5]/90">
              <span className="flex items-center gap-1 text-[#95A823] font-semibold">
                <Cloud className="w-3.5 h-3.5" /> Auto-Sync Aktif
              </span>
              {isSuperAdmin && (
                <>
                  <span className="text-[#877465]">&bull;</span>
                  <button
                    onClick={handleOpenSuperAdmin}
                    className="text-[#FFBC7D] hover:text-[#FFAE64] underline font-bold cursor-pointer"
                  >
                    Super Admin Backend
                  </button>
                </>
              )}
            </div>
          </div>
        </footer>
      </div>

      {/* Modals */}
      <NewReportModal
        isOpen={isNewReportOpen}
        onClose={() => setIsNewReportOpen(false)}
        onSubmit={handleAddReport}
        currentUser={currentUser}
      />

      <PdfExportModal
        isOpen={isPdfExportOpen}
        onClose={() => setIsPdfExportOpen(false)}
        reports={reports}
        currentUser={currentUser}
      />

      <CloudSyncModal
        isOpen={isCloudSyncOpen}
        onClose={() => setIsCloudSyncOpen(false)}
        syncState={syncState}
        reports={reports}
        onTriggerSync={handleTriggerSync}
        onToggleAutoSync={(enabled) => {
          saveSyncConfig({ isAutoSyncEnabled: enabled });
          setSyncState(prev => ({ ...prev, isAutoSyncEnabled: enabled }));
          showToast(`Auto-sync cloud ${enabled ? 'diaktifkan' : 'dinonaktifkan'}.`);
        }}
      />

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        currentUser={currentUser}
        onLogout={handleLogout}
        onUpdateUser={(updated) => {
          setCurrentUser(updated);
          setSessionUser(updated);
          saveStoredUser(updated);
          showToast('Foto profil berhasil diperbarui!');
        }}
      />

      <ChangeLogoModal
        isOpen={isChangeLogoOpen}
        onClose={() => setIsChangeLogoOpen(false)}
        currentUser={currentUser}
        onSuccess={() => showToast('Logo dan Identitas Hotel berhasil disimpan & disinkronkan!')}
      />

      <SuperAdminLoginModal
        isOpen={isSuperAdminLoginOpen}
        onClose={() => setIsSuperAdminLoginOpen(false)}
        onLoginSuccess={() => {
          setIsSuperAdminAuth(true);
          setIsAdminView(true);
          showToast('Selamat datang di Super Admin Backend Control Center.');
        }}
      />
    </div>
  );
}
