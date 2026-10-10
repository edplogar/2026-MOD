import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  ShieldCheck, 
  Users, 
  Settings, 
  MapPin, 
  Layers, 
  History, 
  Database, 
  ArrowLeft, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  KeyRound, 
  HardDrive, 
  Building2, 
  CheckCircle2, 
  AlertTriangle, 
  Lock, 
  RefreshCw, 
  Download, 
  Upload, 
  Phone, 
  Mail, 
  Check, 
  X, 
  FileCheck, 
  Server, 
  Eye, 
  EyeOff, 
  Sparkles, 
  ExternalLink, 
  Copy, 
  CheckCheck, 
  FolderOpen, 
  Info,
  Camera
} from 'lucide-react';
import type { 
  UserProfile, 
  UserRole, 
  Department, 
  SystemSettings, 
  SystemAuditLog, 
  ModReportItem,
  HotelLocationConfig,
  SystemPermissionsState
} from '../../types/index.ts';
import { RolePermissionsManager } from './RolePermissionsManager.tsx';
import { ChangeLogoModal } from '../ChangeLogoModal.tsx';
import { LogarLogo } from '../LogarLogo.tsx';
import { 
  getStoredPermissions, 
  saveStoredPermissions,
  subscribeToFirestorePermissions, 
  syncPermissionsToFirestore 
} from '../../services/permissionService.ts';
import { 
  getAllUsers, 
  addUser, 
  updateUser, 
  updateUserPassword,
  deleteUser, 
  clearSuperAdminSession,
  getSuperAdminMasterKey,
  getSuperAdminPin,
  updateSuperAdminCredentials
} from '../../services/authService';
import { 
  getSystemSettings, 
  updateSystemSettings, 
  getAuditLogs, 
  addAuditLog, 
  clearAuditLogs,
  exportSystemBackupJson,
  restoreSystemFromBackup,
  factoryResetSystem
} from '../../services/systemSettingsService';
import { formatBytes, compressImage } from '../../services/imageCompressionService';
import { calculateStorageSavings, saveReports } from '../../services/storageService';
import { 
  extractDriveFolderId, 
  getDriveFolderUrl, 
  syncAllPhotosToDrive, 
  GOOGLE_APPS_SCRIPT_CODE 
} from '../../services/driveSyncService';

interface SuperAdminDashboardProps {
  onBackToApp: () => void;
  reports: ModReportItem[];
  onRefreshData: () => void;
}

type AdminTab = 'overview' | 'users' | 'permissions' | 'parameters' | 'locations' | 'audit' | 'backup';

export const SuperAdminDashboard: React.FC<SuperAdminDashboardProps> = ({
  onBackToApp,
  reports,
  onRefreshData,
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('users');
  const [permissions, setPermissions] = useState<SystemPermissionsState>(getStoredPermissions());
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [settings, setSettings] = useState<SystemSettings>(getSystemSettings());
  const [auditLogs, setAuditLogs] = useState<SystemAuditLog[]>([]);

  // User management state
  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);

  // User Form State
  const [formName, setFormName] = useState('');
  const [formUsername, setFormUsername] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formRole, setFormRole] = useState<UserRole>('MOD Officer');
  const [formDept, setFormDept] = useState<Department>('Housekeeping');
  const [formPhone, setFormPhone] = useState('');
  const [formAvatar, setFormAvatar] = useState('');
  const [formStatus, setFormStatus] = useState<'active' | 'suspended'>('active');

  // Password Management State
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordTargetUser, setPasswordTargetUser] = useState<UserProfile | null>(null);
  const [newTargetPassword, setNewTargetPassword] = useState('');
  const [showTargetPassword, setShowTargetPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showFormPassword, setShowFormPassword] = useState(false);

  // Master Key state
  const [currentMasterKey, setCurrentMasterKey] = useState(getSuperAdminMasterKey());
  const [currentPin, setCurrentPin] = useState(getSuperAdminPin());
  const [newMasterKey, setNewMasterKey] = useState('');
  const [newPin, setNewPin] = useState('');
  const [keySuccessMsg, setKeySuccessMsg] = useState<string | null>(null);

  // Google Drive Script Modal & Sync State
  const [showScriptModal, setShowScriptModal] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);
  const [isSyncingPhotos, setIsSyncingPhotos] = useState(false);
  const [isChangeLogoModalOpen, setIsChangeLogoModalOpen] = useState(false);

  // New location state
  const [newLocName, setNewLocName] = useState('');
  const [newLocArea, setNewLocArea] = useState('Public Area');

  // Notification toast
  const [toast, setToast] = useState<string | null>(null);

  // Avatar upload ref from device
  const adminAvatarInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingAdminAvatar, setIsUploadingAdminAvatar] = useState(false);

  const handleAdminAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Mohon pilih file gambar yang valid (JPG, PNG, WEBP).');
      return;
    }
    setIsUploadingAdminAvatar(true);
    try {
      const compressed = await compressImage(file, 400, 400, 0.82);
      setFormAvatar(compressed.dataUrl);
      showToast(`Foto profil berhasil diunggah dari perangkat (${formatBytes(compressed.compressedSizeBytes)})!`);
    } catch (err: any) {
      alert('Gagal memproses gambar: ' + (err.message || 'Error'));
    } finally {
      setIsUploadingAdminAvatar(false);
      if (adminAvatarInputRef.current) adminAvatarInputRef.current.value = '';
    }
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const loadData = () => {
    setUsers(getAllUsers());
    setSettings(getSystemSettings());
    setAuditLogs(getAuditLogs());
    setCurrentMasterKey(getSuperAdminMasterKey());
    setCurrentPin(getSuperAdminPin());
  };

  useEffect(() => {
    loadData();

    const handleUsersUpdated = () => {
      setUsers(getAllUsers());
    };
    const handleSettingsUpdated = () => {
      setSettings(getSystemSettings());
    };
    const handlePermsUpdated = (e: any) => {
      if (e.detail) {
        setPermissions(e.detail);
      }
    };

    window.addEventListener('logar_users_updated', handleUsersUpdated);
    window.addEventListener('logar_settings_updated', handleSettingsUpdated);
    window.addEventListener('logar_permissions_updated', handlePermsUpdated);

    const unsubPerms = subscribeToFirestorePermissions((newPerms) => {
      setPermissions(newPerms);
    });

    return () => {
      window.removeEventListener('logar_users_updated', handleUsersUpdated);
      window.removeEventListener('logar_settings_updated', handleSettingsUpdated);
      window.removeEventListener('logar_permissions_updated', handlePermsUpdated);
      unsubPerms();
    };
  }, []);

  // Filtered Users
  const filteredUsers = useMemo(() => {
    const list = users.filter(u => {
      if (userSearch) {
        const q = userSearch.toLowerCase();
        const mName = u.name.toLowerCase().includes(q);
        const mEmail = u.email.toLowerCase().includes(q);
        const mDept = u.department.toLowerCase().includes(q);
        if (!mName && !mEmail && !mDept) return false;
      }
      if (roleFilter !== 'all' && u.role !== roleFilter) return false;
      return true;
    });

    const seen = new Set<string>();
    return list.filter(u => {
      if (!u || !u.id || seen.has(u.id)) return false;
      seen.add(u.id);
      return true;
    });
  }, [users, userSearch, roleFilter]);

  const handleOpenAddUser = () => {
    setEditingUser(null);
    setFormName('');
    setFormUsername('');
    setFormPassword('logar123');
    setFormEmail('');
    setFormRole('MOD Officer');
    setFormDept('Housekeeping');
    setFormPhone('+62 8');
    setFormAvatar('https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80');
    setFormStatus('active');
    setIsAddUserModalOpen(true);
  };

  const handleOpenEditUser = (user: UserProfile) => {
    setEditingUser(user);
    setFormName(user.name);
    setFormUsername(user.username || '');
    setFormPassword(user.password || '');
    setFormEmail(user.email);
    setFormRole(user.role);
    setFormDept(user.department);
    setFormPhone(user.phone || '+62 8');
    setFormAvatar(user.avatar);
    setFormStatus(user.status || 'active');
    setIsAddUserModalOpen(true);
  };

  const handleOpenChangePassword = (user: UserProfile) => {
    setPasswordTargetUser(user);
    setNewTargetPassword('');
    setShowTargetPassword(false);
    setShowCurrentPassword(false);
    setIsPasswordModalOpen(true);
  };

  const handleGenerateRandomPassword = () => {
    const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let res = '';
    for (let i = 0; i < 8; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewTargetPassword(res);
    setShowTargetPassword(true);
  };

  const handleSaveUserPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordTargetUser || !newTargetPassword.trim()) {
      alert('Password baru tidak boleh kosong.');
      return;
    }

    if (newTargetPassword.trim().length < 4) {
      alert('Password minimal 4 karakter untuk keamanan akun.');
      return;
    }

    const success = updateUserPassword(passwordTargetUser.id, newTargetPassword.trim());
    if (success) {
      addAuditLog(
        'USER_PASSWORD_CHANGED',
        `Super Admin mengubah password untuk pengguna ${passwordTargetUser.name} (@${passwordTargetUser.username || passwordTargetUser.email})`,
        'SECURITY'
      );
      showToast(`Password untuk ${passwordTargetUser.name} berhasil diperbarui.`);
      setIsPasswordModalOpen(false);
      loadData();
      if (onRefreshData) onRefreshData();
    } else {
      alert('Gagal memperbarui password pengguna.');
    }
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formEmail.trim()) {
      alert('Nama dan Email wajib diisi.');
      return;
    }

    const cleanUser = (formUsername.trim().toLowerCase().replace(/[^a-zA-Z0-9_]/g, '') || formEmail.split('@')[0]);

    if (editingUser) {
      // Update
      const updates: Partial<UserProfile> = {
        name: formName.trim(),
        username: cleanUser,
        email: formEmail.trim(),
        role: formRole,
        department: formDept,
        phone: formPhone.trim(),
        avatar: formAvatar.trim(),
        status: formStatus,
      };
      if (formPassword.trim()) {
        updates.password = formPassword.trim();
      }

      const updated = updateUser(editingUser.id, updates);
      if (updated) {
        addAuditLog('USER_UPDATED', `Mengubah profil pengguna ${updated.name} (${updated.role})`, 'USER');
        showToast(`Profil pengguna ${updated.name} berhasil diperbarui.`);
      }
    } else {
      // Add
      const created = addUser({
        name: formName.trim(),
        username: cleanUser,
        password: formPassword.trim() || 'logar123',
        email: formEmail.trim(),
        role: formRole,
        department: formDept,
        phone: formPhone.trim(),
        avatar: formAvatar.trim(),
        status: formStatus,
      });
      addAuditLog('USER_CREATED', `Membuat akun pengguna baru ${created.name} (${created.role})`, 'USER');
      showToast(`Pengguna ${created.name} berhasil didaftarkan.`);
    }

    setIsAddUserModalOpen(false);
    loadData();
  };

  const handleDeleteUser = (id: string, name: string) => {
    if (window.confirm(`Yakin ingin menghapus pengguna "${name}"? Tindakan ini tidak dapat dibatalkan.`)) {
      try {
        deleteUser(id);
        addAuditLog('USER_DELETED', `Menghapus pengguna ${name} (ID: ${id})`, 'USER');
        showToast(`Pengguna ${name} berhasil dihapus.`);
        loadData();
      } catch (err: any) {
        alert(err.message || 'Gagal menghapus pengguna.');
      }
    }
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanFolderId = extractDriveFolderId(settings.driveFolderId) || '1LG_MOD_DRIVE_FOLDER_2026';
    const cleanFolderName = settings.driveFolderName || 'HOTEL LOMBOK GARDEN / MOD REPORTS 2026';
    
    const updatedSettings = {
      ...settings,
      driveFolderId: cleanFolderId,
      driveFolderName: cleanFolderName,
    };
    const saved = updateSystemSettings(updatedSettings);
    setSettings(saved);

    // Also update all existing reports' pictures with this target Google Drive folder
    const folderUrl = getDriveFolderUrl(cleanFolderId);
    const updatedReports = reports.map(r => ({
      ...r,
      pictures: (r.pictures || []).map(p => ({
        ...p,
        driveFolderId: cleanFolderId,
        driveFolderName: cleanFolderName,
        driveUrl: p.uploadedToDrive && p.driveId && !p.driveId.startsWith('pic-') 
          ? p.driveUrl 
          : folderUrl,
      })),
    }));
    saveReports(updatedReports);
    if (onRefreshData) onRefreshData();

    showToast('Parameter sistem & Folder Google Drive berhasil disimpan dan ditautkan ke semua laporan.');
    loadData();
  };

  const handleSyncAllPhotosToDrive = async () => {
    setIsSyncingPhotos(true);
    try {
      const cleanFolderId = extractDriveFolderId(settings.driveFolderId) || '1LG_MOD_DRIVE_FOLDER_2026';
      const cleanFolderName = settings.driveFolderName || 'HOTEL LOMBOK GARDEN / MOD REPORTS 2026';
      
      const res = await syncAllPhotosToDrive(reports, cleanFolderId, settings.driveWebhookUrl);
      saveReports(res.updatedReports);
      if (onRefreshData) onRefreshData();

      if (settings.driveWebhookUrl) {
        showToast(`Berhasil mengunggah ${res.uploadedCount} foto langsung ke Google Drive Hotel!`);
      } else {
        showToast(`Berhasil menautkan ${res.totalPhotos} foto laporan ke folder: "${cleanFolderName}"`);
      }
    } catch (err: any) {
      alert(`Terjadi kendala saat menyinkronkan foto: ${err.message}`);
    } finally {
      setIsSyncingPhotos(false);
    }
  };

  const handleUpdateMasterCredentials = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMasterKey.trim() || newPin.trim().length !== 6) {
      alert('Kunci Keamanan baru harus diisi dan PIN harus 6-digit angka.');
      return;
    }
    updateSuperAdminCredentials(newMasterKey, newPin);
    addAuditLog('SECURITY_KEY_CHANGED', 'Kredensial Super Admin Master Key & PIN berhasil diperbarui', 'SECURITY');
    setKeySuccessMsg('Kredensial Master Key dan PIN berhasil diperbarui!');
    setNewMasterKey('');
    setNewPin('');
    setTimeout(() => setKeySuccessMsg(null), 4000);
    loadData();
  };

  const handleAddLocation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLocName.trim()) return;

    const newLoc: HotelLocationConfig = {
      id: `loc-${Date.now()}`,
      name: newLocName.trim(),
      areaGroup: newLocArea,
      isActive: true,
    };

    const updatedLocations = [...settings.locations, newLoc];
    const newSettings = updateSystemSettings({ locations: updatedLocations });
    setSettings(newSettings);
    setNewLocName('');
    showToast(`Lokasi "${newLoc.name}" ditambahkan.`);
    loadData();
  };

  const handleToggleLocation = (locId: string) => {
    const updatedLocations = settings.locations.map(l => 
      l.id === locId ? { ...l, isActive: !l.isActive } : l
    );
    const newSettings = updateSystemSettings({ locations: updatedLocations });
    setSettings(newSettings);
    loadData();
  };

  const handleDeleteLocation = (locId: string, locName: string) => {
    if (window.confirm(`Hapus lokasi inspeksi "${locName}" dari daftar master?`)) {
      const updatedLocations = settings.locations.filter(l => l.id !== locId);
      const newSettings = updateSystemSettings({ locations: updatedLocations });
      setSettings(newSettings);
      showToast(`Lokasi "${locName}" dihapus.`);
      loadData();
    }
  };

  const handleBackupDownload = () => {
    const jsonStr = exportSystemBackupJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MOD_REPORT_LOGAR_BACKUP_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    showToast('File cadangan sistem berhasil diunduh.');
  };

  const handleRestoreFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const res = restoreSystemFromBackup(content);
      if (res.success) {
        showToast(res.message);
        loadData();
        onRefreshData();
      } else {
        alert(res.message);
      }
    };
    reader.readAsText(file);
  };

  const handleFactoryReset = () => {
    const code = prompt('Ketik "RESET" dengan huruf kapital untuk mengembalikan seluruh sistem ke data awal pabrik:');
    if (code === 'RESET') {
      factoryResetSystem();
      showToast('Sistem telah di-reset ke data bawaan awal Hotel Lombok Garden.');
      loadData();
      onRefreshData();
    }
  };

  const storageStats = calculateStorageSavings(reports);

  return (
    <div className="min-h-screen bg-[#1A1614] text-[#FAFBF5] flex flex-col font-sans">
      {/* Toast */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 bg-[#95A823] text-white font-bold px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 text-xs">
          <CheckCircle2 className="w-4 h-4 text-white" />
          <span>{toast}</span>
        </div>
      )}

      {/* Top Header */}
      <header className="bg-[#231E1B] border-b border-[#3D352F] px-6 py-4 flex items-center justify-between sticky top-0 z-30 shadow-md">
        <div className="flex items-center gap-4">
          <button
            onClick={onBackToApp}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#2E2824] hover:bg-[#3B332E] text-[#D9DF98] hover:text-white text-xs font-semibold border border-[#453D37] transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke MOD</span>
          </button>

          <div className="h-6 w-px bg-[#3D352F]"></div>

          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#95A823] flex items-center justify-center text-white font-bold shadow-md shadow-[#95A823]/30">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-extrabold text-white tracking-tight">
                  Super Admin <span className="text-[#95A823]">Backend Control</span>
                </h1>
                <span className="text-[10px] font-mono bg-[#FFBC7D]/20 text-[#FFBC7D] border border-[#FFBC7D]/40 px-1.5 py-0.5 rounded font-bold">
                  LOGAR-ROOT
                </span>
              </div>
              <p className="text-[11px] text-[#C6CC81]">
                Pusat Kontrol Parameter, Pengguna, &amp; Keamanan Hotel Lombok Garden
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-xl bg-[#1E2B14] border border-[#95A823]/50 text-[11px] text-[#EAEEBB] font-semibold">
            <span className="w-2 h-2 rounded-full bg-[#95A823] animate-pulse"></span>
            <span>⚡ Firestore Multi-IP Real-Time Aktif</span>
          </div>

          <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-xl bg-[#2E2824] border border-[#453D37] text-[11px] text-[#D9DF98]">
            <span className="w-2 h-2 rounded-full bg-[#95A823] animate-ping"></span>
            <span>Server: Operational (Active)</span>
          </div>

          <button
            onClick={() => {
              clearSuperAdminSession();
              onBackToApp();
            }}
            className="px-3.5 py-1.5 rounded-xl bg-[#362E2A] hover:bg-[#453B36] border border-[#524540] text-[#FFBC7D] text-xs font-semibold transition"
          >
            Kunci &amp; Keluar
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto p-4 sm:p-6 gap-6">
        {/* Navigation Sidebar */}
        <aside className="w-64 shrink-0 hidden md:block space-y-1">
          <div className="p-3 mb-2">
            <p className="text-[10px] uppercase font-bold text-[#877465] tracking-wider">
              Navigasi Backend
            </p>
          </div>

          <button
            onClick={() => setActiveTab('users')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
              activeTab === 'users'
                ? 'bg-[#95A823] text-white shadow-md shadow-[#95A823]/30 font-bold'
                : 'text-[#D9DF98] hover:text-white hover:bg-[#2E2824]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Users className="w-4 h-4 text-[#EAEEBB]" />
              <span>Manajemen Petugas</span>
            </div>
            <span className="text-[10px] bg-[#231E1B] px-1.5 py-0.5 rounded font-mono text-[#FAFBF5]">
              {users.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('permissions')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
              activeTab === 'permissions'
                ? 'bg-[#95A823] text-white shadow-md shadow-[#95A823]/30 font-bold'
                : 'text-[#D9DF98] hover:text-white hover:bg-[#2E2824]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <KeyRound className="w-4 h-4 text-[#EAEEBB]" />
              <span>Hak Akses &amp; Peran Menu</span>
            </div>
            <span className="text-[10px] bg-[#95A823]/25 text-[#EAEEBB] border border-[#95A823]/40 px-1.5 py-0.5 rounded font-mono font-bold">
              RBAC
            </span>
          </button>

          <button
            onClick={() => setActiveTab('parameters')}
            className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
              activeTab === 'parameters'
                ? 'bg-[#95A823] text-white shadow-md shadow-[#95A823]/30 font-bold'
                : 'text-[#D9DF98] hover:text-white hover:bg-[#2E2824]'
            }`}
          >
            <Settings className="w-4 h-4 text-[#C6CC81]" />
            <span>Parameter Sistem &amp; Drive</span>
          </button>

          <button
            onClick={() => setActiveTab('locations')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
              activeTab === 'locations'
                ? 'bg-[#95A823] text-white shadow-md shadow-[#95A823]/30 font-bold'
                : 'text-[#D9DF98] hover:text-white hover:bg-[#2E2824]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <MapPin className="w-4 h-4 text-[#EAEEBB]" />
              <span>Master Lokasi Hotel</span>
            </div>
            <span className="text-[10px] bg-[#231E1B] px-1.5 py-0.5 rounded font-mono text-[#FAFBF5]">
              {settings.locations.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
              activeTab === 'audit'
                ? 'bg-[#95A823] text-white shadow-md shadow-[#95A823]/30 font-bold'
                : 'text-[#D9DF98] hover:text-white hover:bg-[#2E2824]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <History className="w-4 h-4 text-[#FFBC7D]" />
              <span>Audit Log &amp; Kunci Master</span>
            </div>
            <span className="text-[10px] bg-[#231E1B] px-1.5 py-0.5 rounded font-mono text-[#FAFBF5]">
              {auditLogs.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('backup')}
            className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
              activeTab === 'backup'
                ? 'bg-[#95A823] text-white shadow-md shadow-[#95A823]/30 font-bold'
                : 'text-[#D9DF98] hover:text-white hover:bg-[#2E2824]'
            }`}
          >
            <Database className="w-4 h-4 text-[#C6CC81]" />
            <span>Cadangan &amp; Reset Data</span>
          </button>

          <div className="pt-6">
            <div className="bg-[#231E1B] border border-[#3D352F] rounded-2xl p-4 space-y-2 text-xs">
              <div className="flex items-center gap-2 text-[#95A823] font-bold">
                <HardDrive className="w-4 h-4" />
                <span>Status Drive Kompresi</span>
              </div>
              <p className="text-[11px] text-[#C6CC81]">
                Penyimpanan hemat {storageStats.percentageSaved}% ({formatBytes(storageStats.savedBytes)} dihemat).
              </p>
              <div className="w-full bg-[#2E2824] h-1.5 rounded-full overflow-hidden">
                <div 
                  className="bg-[#95A823] h-full"
                  style={{ width: `${storageStats.percentageSaved}%` }}
                ></div>
              </div>
            </div>
          </div>
        </aside>

        {/* Content Area */}
        <main className="flex-1 bg-[#231E1B] border border-[#3D352F] rounded-3xl p-4 sm:p-6 min-h-[600px] overflow-y-auto">
          {/* Mobile Horizontal Navigation Tabs */}
          <div className="md:hidden flex items-center gap-1.5 overflow-x-auto pb-3 mb-4 border-b border-[#3D352F] shrink-0">
            <button
              onClick={() => setActiveTab('users')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition cursor-pointer ${
                activeTab === 'users' ? 'bg-[#95A823] text-white shadow-xs' : 'bg-[#2E2824] text-[#D9DF98]'
              }`}
            >
              Petugas ({users.length})
            </button>
            <button
              onClick={() => setActiveTab('permissions')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition cursor-pointer ${
                activeTab === 'permissions' ? 'bg-[#95A823] text-white shadow-xs' : 'bg-[#2E2824] text-[#D9DF98]'
              }`}
            >
              Hak Akses Menu (RBAC)
            </button>
            <button
              onClick={() => setActiveTab('parameters')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition cursor-pointer ${
                activeTab === 'parameters' ? 'bg-[#95A823] text-white shadow-xs' : 'bg-[#2E2824] text-[#D9DF98]'
              }`}
            >
              Parameter
            </button>
            <button
              onClick={() => setActiveTab('locations')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition cursor-pointer ${
                activeTab === 'locations' ? 'bg-[#95A823] text-white shadow-xs' : 'bg-[#2E2824] text-[#D9DF98]'
              }`}
            >
              Lokasi ({settings.locations.length})
            </button>
            <button
              onClick={() => setActiveTab('audit')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition cursor-pointer ${
                activeTab === 'audit' ? 'bg-[#95A823] text-white shadow-xs' : 'bg-[#2E2824] text-[#D9DF98]'
              }`}
            >
              Audit Log
            </button>
            <button
              onClick={() => setActiveTab('backup')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition cursor-pointer ${
                activeTab === 'backup' ? 'bg-[#95A823] text-white shadow-xs' : 'bg-[#2E2824] text-[#D9DF98]'
              }`}
            >
              Cadangan
            </button>
          </div>

          {/* TAB 1: USER MANAGEMENT */}
          {activeTab === 'users' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Users className="w-5 h-5 text-[#95A823]" />
                    Manajemen Pengguna &amp; Petugas MOD
                  </h2>
                  <p className="text-xs text-[#C6CC81] mt-0.5">
                    Kelola akun personil, penetapan peran (Role), hak akses, dan status operasional
                  </p>
                </div>

                <button
                  onClick={handleOpenAddUser}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-[#95A823] hover:bg-[#83941F] text-white rounded-xl text-xs font-bold transition shadow-lg shadow-[#95A823]/20"
                >
                  <Plus className="w-4 h-4 text-white" />
                  <span>Tambah Pengguna Baru</span>
                </button>
              </div>

              {/* Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Cari nama, email, departemen..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500 font-medium"
                  >
                    <option value="all">Semua Peran (All Roles)</option>
                    <option value="Super Admin">Super Admin</option>
                    <option value="General Manager">General Manager</option>
                    <option value="Duty Manager">Duty Manager</option>
                    <option value="MOD Officer">MOD Officer</option>
                    <option value="Department Head">Department Head</option>
                    <option value="Staff">Staff</option>
                  </select>
                </div>
              </div>

              {/* Users Table */}
              <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-900/90 shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-800/80 text-slate-300 text-[11px] font-semibold tracking-wider uppercase border-b border-slate-800">
                        <th className="py-3 px-4">Pengguna</th>
                        <th className="py-3 px-4">Peran (Role)</th>
                        <th className="py-3 px-4">Departemen</th>
                        <th className="py-3 px-4">Kredensial &amp; Password</th>
                        <th className="py-3 px-4 text-center">Status</th>
                        <th className="py-3 px-4 text-center w-28">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-300">
                      {filteredUsers.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-500">
                            Tidak ada pengguna yang sesuai kriteria pencarian.
                          </td>
                        </tr>
                      ) : (
                        filteredUsers.map((u) => (
                          <tr key={u.id} className="hover:bg-slate-800/50 transition">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                <img
                                  src={u.avatar}
                                  alt={u.name}
                                  className="w-9 h-9 rounded-xl object-cover border border-[#D9DF98] shrink-0"
                                />
                                <div className="truncate">
                                  <p className="font-bold text-white text-xs truncate max-w-[160px]">
                                    {u.name}
                                  </p>
                                  <p className="text-[11px] text-[#C6CC81] truncate max-w-[180px]">
                                    {u.email}
                                  </p>
                                </div>
                              </div>
                            </td>

                            <td className="py-3 px-4">
                              <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                u.role === 'Super Admin'
                                  ? 'bg-[#FFBC7D]/20 text-[#FFBC7D] border border-[#FFBC7D]/40'
                                  : u.role === 'General Manager'
                                  ? 'bg-[#EAEEBB]/30 text-[#EAEEBB] border border-[#C6CC81]/40'
                                  : u.role === 'Duty Manager'
                                  ? 'bg-[#95A823]/20 text-[#D9DF98] border border-[#95A823]/30'
                                  : 'bg-[#2E2824] text-[#C6CC81]'
                              }`}>
                                {u.role}
                              </span>
                            </td>

                            <td className="py-3 px-4">
                              <span className="text-[#D9DF98] font-medium">
                                {u.department}
                              </span>
                            </td>

                            <td className="py-3 px-4">
                              <div className="flex items-center justify-between gap-2 bg-slate-950/70 px-2.5 py-1.5 rounded-xl border border-slate-800 max-w-[200px]">
                                <div className="min-w-0">
                                  <div className="font-mono text-xs text-[#FAFBF5] font-bold truncate">
                                    @{u.username}
                                  </div>
                                  <div className="text-[10px] text-[#877465] flex items-center gap-1 font-mono">
                                    <span>Pass:</span>
                                    <span className="text-[#FFBC7D]">••••••••</span>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleOpenChangePassword(u)}
                                  className="px-2 py-1 rounded-lg bg-[#FFBC7D]/15 hover:bg-[#FFBC7D]/30 text-[#FFBC7D] border border-[#FFBC7D]/40 text-[10px] font-bold flex items-center gap-1 transition shrink-0 cursor-pointer"
                                  title={`Edit password untuk ${u.name}`}
                                >
                                  <KeyRound className="w-3 h-3 text-[#FFBC7D]" />
                                  <span>Edit</span>
                                </button>
                              </div>
                            </td>

                            <td className="py-3 px-4 text-center">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                u.status === 'suspended'
                                  ? 'bg-rose-500/20 text-rose-300'
                                  : 'bg-[#95A823]/25 text-[#D9DF98]'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${
                                  u.status === 'suspended' ? 'bg-rose-400' : 'bg-[#95A823]'
                                }`}></span>
                                {u.status === 'suspended' ? 'Ditangguhkan' : 'Aktif'}
                              </span>
                            </td>

                            <td className="py-3 px-4 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => handleOpenChangePassword(u)}
                                  className="p-1.5 rounded-lg bg-[#2E2824] hover:bg-[#3B332E] text-[#FFBC7D] border border-[#453D37] hover:border-[#FFBC7D]/60 transition cursor-pointer"
                                  title={`Ubah Password ${u.name}`}
                                >
                                  <KeyRound className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleOpenEditUser(u)}
                                  className="p-1.5 rounded-lg bg-[#2E2824] hover:bg-[#3B332E] text-[#D9DF98] border border-[#453D37] hover:text-white transition cursor-pointer"
                                  title="Edit Profil Pengguna"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteUser(u.id, u.name)}
                                  className="p-1.5 rounded-lg bg-[#2E2824] hover:bg-[#C25941]/20 text-[#877465] hover:text-[#C25941] border border-[#453D37] transition cursor-pointer"
                                  title="Hapus Pengguna"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB: ROLE & MENU PERMISSIONS (RBAC) */}
          {activeTab === 'permissions' && (
            <div className="space-y-6">
              <RolePermissionsManager
                permissions={permissions}
                onUpdatePermissions={(newPerms) => {
                  setPermissions(newPerms);
                  saveStoredPermissions(newPerms);
                  syncPermissionsToFirestore(newPerms).catch((err) => {
                    console.warn('Auto-sync permissions note:', err);
                  });
                  addAuditLog('PERMISSION_UPDATED', 'Super Admin memperbarui konfigurasi peran & hak akses menu (RBAC)', 'SECURITY');
                }}
                users={users}
                onShowToast={showToast}
              />
            </div>
          )}

          {/* TAB 2: SYSTEM & DRIVE PARAMETERS */}
          {activeTab === 'parameters' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Settings className="w-5 h-5 text-blue-400" />
                  Parameter Sistem &amp; Integrasi Google Drive
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Konfigurasikan metadata hotel, folder target cloud Google Drive, resolusi kompresi foto, dan shift kerja
                </p>
              </div>

              <form onSubmit={handleSaveSettings} className="space-y-5">
                {/* Hotel Metadata */}
                {/* Brand Logo & Visual Emblem Customization Section */}
                <div className="bg-gradient-to-r from-slate-800/90 via-[#231E1B]/90 to-slate-800/90 border border-[#95A823]/40 rounded-2xl p-5 space-y-4 shadow-xl">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-[#95A823] flex items-center justify-center text-white shadow-md">
                        <Sparkles className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white tracking-wide">
                          Kustomisasi Logo &amp; Identitas Brand Hotel
                        </h3>
                        <p className="text-[11px] text-[#C6CC81]">
                          Upload file logo baru (PNG/SVG/JPG), tautan Google Drive, bentuk &amp; palet warna properti
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsChangeLogoModalOpen(true)}
                      className="px-4 py-2 bg-[#95A823] hover:bg-[#7B8C1B] text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Buka Pengubah Logo &amp; Ikon</span>
                    </button>
                  </div>

                  <div className="bg-[#1A1614] border border-[#3D352F] rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <LogarLogo 
                        variant="full" 
                        light={true} 
                        branding={settings.branding} 
                        showEditButton={true} 
                        onEdit={() => setIsChangeLogoModalOpen(true)} 
                      />
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-300">
                      <div className="text-right hidden sm:block">
                        <p className="text-[10px] text-slate-400">Bentuk Ikon:</p>
                        <p className="font-bold text-[#EAEEBB] capitalize">{settings.branding?.logoShape || 'Rounded'}</p>
                      </div>
                      <div className="text-right hidden sm:block">
                        <p className="text-[10px] text-slate-400">Warna Latar:</p>
                        <p className="font-mono font-bold text-white">{settings.branding?.bgColor || '#95A823'}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsChangeLogoModalOpen(true)}
                        className="px-3 py-1.5 bg-[#2E2824] hover:bg-[#3B332E] text-[#EAEEBB] hover:text-white border border-[#453D37] rounded-xl text-xs font-semibold transition flex items-center gap-1"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-[#95A823]" />
                        <span>Kustomisasi</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-5 space-y-4">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-emerald-400" />
                    Identitas &amp; Kontak Hotel
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <label className="block text-slate-300 mb-1 font-semibold">Nama Properti Hotel</label>
                      <input
                        type="text"
                        value={settings.hotelName}
                        onChange={(e) => setSettings({ ...settings, hotelName: e.target.value })}
                        required
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 mb-1 font-semibold">Email Resmi Hotel</label>
                      <input
                        type="email"
                        value={settings.hotelEmail}
                        onChange={(e) => setSettings({ ...settings, hotelEmail: e.target.value })}
                        required
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-slate-300 mb-1 font-semibold">Alamat Lengkap</label>
                      <input
                        type="text"
                        value={settings.hotelAddress}
                        onChange={(e) => setSettings({ ...settings, hotelAddress: e.target.value })}
                        required
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Google Drive & Compression Settings */}
                <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <HardDrive className="w-4 h-4 text-blue-400" />
                      Koneksi Google Drive Hotel &amp; Aturan Kompresi Foto
                    </h3>
                    <div className="flex items-center gap-2">
                      <a
                        href={getDriveFolderUrl(settings.driveFolderId)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 border border-blue-500/40 rounded-lg text-xs font-bold transition"
                      >
                        <FolderOpen className="w-3.5 h-3.5" />
                        <span>Buka Folder di Drive</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                      <button
                        type="button"
                        onClick={() => setShowScriptModal(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-bold transition cursor-pointer"
                      >
                        <Info className="w-3.5 h-3.5" />
                        <span>Panduan Auto-Upload</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <label className="block text-slate-300 mb-1 font-semibold">
                        Nama Folder Google Drive Hotel <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={settings.driveFolderName}
                        onChange={(e) => setSettings({ ...settings, driveFolderName: e.target.value })}
                        required
                        placeholder="cth: HOTEL LOMBOK GARDEN / MOD REPORTS 2026"
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500"
                      />
                      <p className="text-[10px] text-slate-400 mt-1">
                        Nama folder induk tempat seluruh bukti inspeksi disimpan di Google Drive hotel.
                      </p>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-slate-300 font-semibold">
                          Google Drive Folder ID atau Link Folder <span className="text-rose-400">*</span>
                        </label>
                        {settings.driveFolderId && (
                          <span className="text-[10px] text-emerald-400 font-mono">
                            ID: {extractDriveFolderId(settings.driveFolderId)}
                          </span>
                        )}
                      </div>
                      <input
                        type="text"
                        value={settings.driveFolderId}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSettings({ ...settings, driveFolderId: val });
                        }}
                        onBlur={(e) => {
                          const clean = extractDriveFolderId(e.target.value);
                          if (clean) setSettings({ ...settings, driveFolderId: clean });
                        }}
                        required
                        placeholder="Tempel Folder ID atau Link Folder Google Drive (cth: 1aB-cdEf...)"
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl font-mono text-white focus:outline-none focus:border-amber-500"
                      />
                      <p className="text-[10px] text-slate-400 mt-1">
                        Bisa tempelkan langsung link folder Google Drive hotel (otomatis diekstrak ID-nya).
                      </p>
                    </div>

                    {/* Google Apps Script Webhook URL */}
                    <div className="sm:col-span-2 bg-slate-900/60 p-3 rounded-xl border border-slate-700/60 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-slate-300 font-semibold flex items-center gap-1.5">
                          <span>Google Apps Script Webhook URL (Opsional - Auto-Upload Nyata ke Drive)</span>
                        </label>
                        <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
                          {settings.driveWebhookUrl ? 'Webhook Aktif' : 'Mode Tautan Langsung'}
                        </span>
                      </div>
                      <input
                        type="url"
                        value={settings.driveWebhookUrl || ''}
                        onChange={(e) => setSettings({ ...settings, driveWebhookUrl: e.target.value })}
                        placeholder="https://script.google.com/macros/s/AKfycbx.../exec"
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl font-mono text-xs text-white focus:outline-none focus:border-amber-500"
                      />
                      <div className="flex items-center justify-between flex-wrap gap-2 pt-1 text-[11px]">
                        <p className="text-slate-400 text-[10px]">
                          Jika diisi, foto yang diupload petugas akan otomatis terkirim langsung ke Google Drive hotel tanpa perlu login akun Google masing-masing staf.
                        </p>
                        <button
                          type="button"
                          onClick={handleSyncAllPhotosToDrive}
                          disabled={isSyncingPhotos}
                          className="px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg font-bold text-xs transition flex items-center gap-1 disabled:opacity-50 cursor-pointer"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isSyncingPhotos ? 'animate-spin' : ''}`} />
                          <span>{isSyncingPhotos ? 'Menyinkronkan...' : 'Tautkan Semua Foto ke Folder Ini'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Quality Slider */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-slate-300 font-semibold">
                          Kualitas Kompresi Gambar ({Math.round(settings.compressionQuality * 100)}%)
                        </label>
                        <span className="text-[11px] text-emerald-400 font-bold">
                          Hemat ~92-96% Ruang
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.5"
                        max="0.9"
                        step="0.02"
                        value={settings.compressionQuality}
                        onChange={(e) => setSettings({ ...settings, compressionQuality: parseFloat(e.target.value) })}
                        className="w-full accent-emerald-500 cursor-pointer"
                      />
                      <p className="text-[10px] text-slate-400 mt-1">
                        Rekomendasi 70-75% untuk rasio kompresi optimal tanpa mengurangi kejelasan dokumen.
                      </p>
                    </div>

                    {/* Max Image Dimension */}
                    <div>
                      <label className="block text-slate-300 mb-1 font-semibold">
                        Batas Maksimum Resolusi (Lebar px)
                      </label>
                      <select
                        value={settings.maxImageDimension}
                        onChange={(e) => setSettings({ ...settings, maxImageDimension: parseInt(e.target.value, 10) })}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500"
                      >
                        <option value="1024">1024 px (Sangat Ringan, ~80KB)</option>
                        <option value="1280">1280 px (Standar Optimal, ~130KB)</option>
                        <option value="1600">1600 px (Detail Tinggi, ~220KB)</option>
                        <option value="1920">1920 px (Full HD, ~350KB)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Shift Hours Settings */}
                <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-5 space-y-4">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Layers className="w-4 h-4 text-purple-400" />
                    Jadwal Shift Kerja Hotel
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                    <div>
                      <label className="block text-slate-300 mb-1 font-semibold">Shift Pagi</label>
                      <input
                        type="text"
                        value={settings.shifts.morning.time}
                        onChange={(e) => setSettings({
                          ...settings,
                          shifts: {
                            ...settings.shifts,
                            morning: { ...settings.shifts.morning, time: e.target.value }
                          }
                        })}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 mb-1 font-semibold">Shift Sore</label>
                      <input
                        type="text"
                        value={settings.shifts.afternoon.time}
                        onChange={(e) => setSettings({
                          ...settings,
                          shifts: {
                            ...settings.shifts,
                            afternoon: { ...settings.shifts.afternoon, time: e.target.value }
                          }
                        })}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 mb-1 font-semibold">Shift Malam</label>
                      <input
                        type="text"
                        value={settings.shifts.night.time}
                        onChange={(e) => setSettings({
                          ...settings,
                          shifts: {
                            ...settings.shifts,
                            night: { ...settings.shifts.night, time: e.target.value }
                          }
                        })}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg shadow-amber-500/20 transition flex items-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4 text-slate-950" />
                    <span>Simpan Perubahan Parameter</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 3: LOCATIONS MASTER */}
          {activeTab === 'locations' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-emerald-400" />
                    Master Titik Lokasi &amp; Area Inspeksi
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Daftar area hotel yang wajib diperiksa oleh petugas MOD pada setiap putaran patroli
                  </p>
                </div>
              </div>

              {/* Add Location Form */}
              <form onSubmit={handleAddLocation} className="bg-slate-800/70 border border-slate-700 rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-3">
                <input
                  type="text"
                  placeholder="Ketik nama titik lokasi baru (cth: Koridor Kamar 320-330)..."
                  value={newLocName}
                  onChange={(e) => setNewLocName(e.target.value)}
                  className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 w-full"
                />
                <select
                  value={newLocArea}
                  onChange={(e) => setNewLocArea(e.target.value)}
                  className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500 w-full sm:w-48"
                >
                  <option value="Deluxe & Rooms">Deluxe &amp; Rooms</option>
                  <option value="F&B & Resto">F&amp;B &amp; Resto</option>
                  <option value="Pool & Garden">Pool &amp; Garden</option>
                  <option value="Lobby & Parking">Lobby &amp; Parking</option>
                  <option value="Meeting & Ballrooms">Meeting &amp; Ballrooms</option>
                  <option value="Back of House">Back of House</option>
                  <option value="Public Area">Public Area</option>
                </select>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shrink-0 transition flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah Titik</span>
                </button>
              </form>

              {/* Location Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {settings.locations.map((loc) => (
                  <div
                    key={loc.id}
                    className={`p-3 rounded-2xl border transition-all flex items-center justify-between ${
                      loc.isActive 
                        ? 'bg-slate-800/80 border-slate-700 text-slate-200' 
                        : 'bg-slate-900/40 border-slate-800/60 text-slate-500'
                    }`}
                  >
                    <div className="truncate mr-2">
                      <p className="font-semibold text-xs truncate">
                        {loc.name}
                      </p>
                      <span className="text-[10px] text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded font-mono">
                        {loc.areaGroup}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleToggleLocation(loc.id)}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition ${
                          loc.isActive
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-slate-700 text-slate-400'
                        }`}
                      >
                        {loc.isActive ? 'Aktif' : 'Nonaktif'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteLocation(loc.id, loc.name)}
                        className="p-1 text-slate-500 hover:text-rose-400 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: AUDIT LOG & SECURITY */}
          {activeTab === 'audit' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <History className="w-5 h-5 text-purple-400" />
                  Audit Log Sistem &amp; Pengaturan Kunci Keamanan
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Rekam jejak seluruh perubahan data serta pembaruan Master Security Key Super Admin
                </p>
              </div>

              {/* Change Credentials Box */}
              <div className="bg-slate-800/70 border border-slate-700 rounded-2xl p-5 space-y-4">
                <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-amber-400" />
                  Perbarui Master Security Key &amp; 6-Digit PIN Admin
                </h3>

                {keySuccessMsg && (
                  <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 rounded-xl text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>{keySuccessMsg}</span>
                  </div>
                )}

                <form onSubmit={handleUpdateMasterCredentials} className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block text-slate-300 mb-1 font-semibold">
                      Master Key Baru (Passphrase Kuat)
                    </label>
                    <input
                      type="text"
                      placeholder="cth: LOGAR-SECURE-2026"
                      value={newMasterKey}
                      onChange={(e) => setNewMasterKey(e.target.value)}
                      required
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl font-mono text-white focus:outline-none focus:border-amber-500"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">Kunci saat ini: {currentMasterKey}</p>
                  </div>

                  <div>
                    <label className="block text-slate-300 mb-1 font-semibold">
                      6-Digit PIN Baru
                    </label>
                    <input
                      type="password"
                      maxLength={6}
                      placeholder="••••••"
                      value={newPin}
                      onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                      required
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl font-mono text-white tracking-widest text-center focus:outline-none focus:border-amber-500"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">PIN saat ini: {currentPin}</p>
                  </div>

                  <div className="sm:col-span-2 flex justify-end">
                    <button
                      type="submit"
                      className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs shadow-md transition"
                    >
                      Perbarui Kredensial Admin
                    </button>
                  </div>
                </form>
              </div>

              {/* Audit Log Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    Riwayat Log Aktivitas Sistem ({auditLogs.length})
                  </h3>
                  <button
                    onClick={() => {
                      if (window.confirm('Bersihkan riwayat log audit sistem?')) {
                        clearAuditLogs();
                        loadData();
                      }
                    }}
                    className="text-xs text-rose-400 hover:underline"
                  >
                    Bersihkan Log
                  </button>
                </div>

                <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-900">
                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/80 text-xs font-mono">
                    {auditLogs.map((log) => (
                      <div key={log.id} className="p-3 hover:bg-slate-800/40 flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded font-bold">
                              {log.action}
                            </span>
                            <span className="text-slate-400 text-[11px]">
                              Oleh: <strong className="text-slate-200">{log.actor}</strong>
                            </span>
                          </div>
                          <p className="text-slate-300 text-xs mt-1 font-sans">
                            {log.details}
                          </p>
                        </div>
                        <span className="text-[10px] text-slate-500 shrink-0">
                          {new Date(log.timestamp).toLocaleTimeString('id-ID')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: BACKUP & RESTORE */}
          {activeTab === 'backup' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Database className="w-5 h-5 text-rose-400" />
                  Cadangan &amp; Pemulihan Data Sistem
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Ekspor seluruh database, pulihkan dari cadangan, atau lakukan reset pabrik
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Backup Box */}
                <div className="bg-slate-800/70 border border-slate-700 rounded-2xl p-5 space-y-3 flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-white text-sm flex items-center gap-2">
                      <Download className="w-4 h-4 text-emerald-400" />
                      Cadangkan Data (JSON Export)
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      Unduh arsip lengkap mencakup {reports.length} laporan MOD, {users.length} akun pengguna, pengaturan sistem, dan log audit.
                    </p>
                  </div>
                  <button
                    onClick={handleBackupDownload}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm"
                  >
                    <Download className="w-4 h-4" />
                    <span>Unduh Cadangan Sistem</span>
                  </button>
                </div>

                {/* Restore Box */}
                <div className="bg-slate-800/70 border border-slate-700 rounded-2xl p-5 space-y-3 flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-white text-sm flex items-center gap-2">
                      <Upload className="w-4 h-4 text-blue-400" />
                      Pulihkan Data (JSON Restore)
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      Unggah file cadangan JSON yang sebelumnya diekspor untuk memulihkan seluruh laporan dan pengaturan.
                    </p>
                  </div>
                  <label className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-sm">
                    <Upload className="w-4 h-4" />
                    <span>Pilih File Cadangan JSON</span>
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleRestoreFile}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Danger Zone */}
              <div className="border border-rose-900/60 bg-rose-950/20 rounded-2xl p-5 space-y-3">
                <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Zona Bahaya: Reset ke Pengaturan Awal Pabrik</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Mengembalikan semua data inspeksi MOD ke dataset asli Hotel Lombok Garden, menghapus akun tambahan, dan mereset konfigurasi ke bawaan.
                </p>
                <button
                  onClick={handleFactoryReset}
                  className="px-4 py-2 bg-rose-600/80 hover:bg-rose-600 text-white text-xs font-bold rounded-xl transition"
                >
                  Reset Sistem ke Data Awal
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Add / Edit User Modal */}
      {isAddUserModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl text-white">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-400" />
                {editingUser ? 'Edit Data Pengguna' : 'Tambah Pengguna Baru'}
              </h3>
              <button
                onClick={() => setIsAddUserModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="p-6 space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Nama Lengkap Petugas <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Contoh: I Putu Suryawan"
                  required
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Email Akun <span className="text-rose-400">*</span>
                </label>
                <input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="nama@lombokgardenhotel.com"
                  required
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Peran (Role)</label>
                  <select
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500 font-medium"
                  >
                    <option value="Super Admin">Super Admin</option>
                    <option value="General Manager">General Manager</option>
                    <option value="Duty Manager">Duty Manager</option>
                    <option value="MOD Officer">MOD Officer</option>
                    <option value="Department Head">Department Head</option>
                    <option value="Staff">Staff</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Departemen</label>
                  <select
                    value={formDept}
                    onChange={(e) => setFormDept(e.target.value as Department)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500 font-medium"
                  >
                    <option value="Housekeeping">Housekeeping</option>
                    <option value="Engineering">Engineering</option>
                    <option value="FB Service">FB Service</option>
                    <option value="Fb Product">Fb Product</option>
                    <option value="Security">Security</option>
                    <option value="Front Office">Front Office</option>
                    <option value="General">General</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Username Login <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={formUsername}
                    onChange={(e) => setFormUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    placeholder="Contoh: asrul"
                    required
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Password Akun {editingUser ? '(Opsional)' : <span className="text-rose-400">*</span>}
                  </label>
                  <div className="relative">
                    <input
                      type={showFormPassword ? 'text' : 'password'}
                      value={formPassword}
                      onChange={(e) => setFormPassword(e.target.value)}
                      placeholder={editingUser ? 'Kosongkan jika tak diubah' : 'Default: logar123'}
                      className="w-full pl-3 pr-8 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono focus:outline-none focus:border-amber-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowFormPassword(!showFormPassword)}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white"
                    >
                      {showFormPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Nomor Telepon / WA</label>
                  <input
                    type="text"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Status Akun</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as 'active' | 'suspended')}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500 font-medium"
                  >
                    <option value="active">Aktif (Active)</option>
                    <option value="suspended">Ditangguhkan (Suspended)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-slate-300 font-semibold text-xs">
                  Foto Profil (Avatar) Pengguna
                </label>
                
                <div className="flex items-center gap-3 p-3 bg-slate-900 border border-slate-700/80 rounded-2xl">
                  {/* Avatar Preview */}
                  <div className="relative shrink-0">
                    <img
                      src={formAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                      alt="Preview"
                      className="w-14 h-14 rounded-2xl object-cover border-2 border-amber-500/60 bg-slate-950 shadow-xs"
                    />
                    {isUploadingAdminAvatar && (
                      <div className="absolute inset-0 rounded-2xl bg-black/60 flex items-center justify-center">
                        <Sparkles className="w-4 h-4 text-amber-400 animate-spin" />
                      </div>
                    )}
                  </div>

                  {/* Upload from Device Controls */}
                  <div className="flex-1 space-y-1.5">
                    <input
                      type="file"
                      ref={adminAvatarInputRef}
                      onChange={handleAdminAvatarUpload}
                      accept="image/*"
                      className="hidden"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => adminAvatarInputRef.current?.click()}
                        disabled={isUploadingAdminAvatar}
                        className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>{isUploadingAdminAvatar ? 'Mengunggah...' : 'Unggah dari Device'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setFormAvatar('https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80')}
                        className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs transition cursor-pointer"
                        title="Gunakan avatar default"
                      >
                        Reset
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-400">
                      Pilih file foto dari galeri / kamera HP atau masukkan tautan URL di bawah.
                    </p>
                  </div>
                </div>

                <input
                  type="text"
                  value={formAvatar}
                  onChange={(e) => setFormAvatar(e.target.value)}
                  placeholder="Atau tempel URL gambar (https://...)"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono text-[11px] focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddUserModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 text-slate-950 font-bold transition shadow-md cursor-pointer"
                >
                  {editingUser ? 'Perbarui Pengguna' : 'Simpan Pengguna'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Super Admin Dedicated Change User Password Modal */}
      {isPasswordModalOpen && passwordTargetUser && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#231E1B] border border-[#453D37] rounded-3xl max-w-md w-full overflow-hidden shadow-2xl text-white">
            {/* Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-[#231E1B] via-[#2F2723] to-[#231E1B] border-b border-[#3D352F] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#FFBC7D]/20 border border-[#FFBC7D]/40 flex items-center justify-center text-[#FFBC7D]">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">
                    Ubah Password Pengguna
                  </h3>
                  <p className="text-[10px] text-[#C6CC81]">
                    Fungsi Super Admin Backend Control Center
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPasswordModalOpen(false)}
                className="w-8 h-8 rounded-full bg-[#1A1614] text-[#877465] hover:text-white hover:bg-[#3D352F] flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Target User Info Card */}
            <div className="p-6 space-y-4 text-xs">
              <div className="p-3.5 rounded-2xl bg-[#1A1614] border border-[#3D352F] flex items-center gap-3">
                <img
                  src={passwordTargetUser.avatar}
                  alt={passwordTargetUser.name}
                  className="w-12 h-12 rounded-xl object-cover border border-[#95A823] shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <p className="font-bold text-white text-xs truncate">
                      {passwordTargetUser.name}
                    </p>
                    <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-[#95A823]/25 text-[#EAEEBB] border border-[#95A823]/40 shrink-0">
                      {passwordTargetUser.role}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#C6CC81] font-mono mt-0.5 truncate">
                    @{passwordTargetUser.username} &bull; {passwordTargetUser.email}
                  </p>
                  <p className="text-[10px] text-[#877465] mt-0.5">
                    Departemen: <span className="text-[#D9DF98]">{passwordTargetUser.department}</span>
                  </p>
                </div>
              </div>

              {/* Current Password Reveal Box */}
              <div className="p-3 rounded-xl bg-[#28221E] border border-[#3D352F] flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-[#877465] block">Password Saat Ini:</span>
                  <span className="font-mono font-bold text-xs text-[#FFBC7D]">
                    {showCurrentPassword 
                      ? (passwordTargetUser.password || (passwordTargetUser.role === 'Super Admin' ? 'admin123' : 'logar123'))
                      : '••••••••••••'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="px-2.5 py-1 rounded-lg bg-[#1A1614] hover:bg-[#332A25] text-[#C6CC81] border border-[#453D37] text-[10px] font-semibold flex items-center gap-1.5 transition cursor-pointer"
                >
                  {showCurrentPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  <span>{showCurrentPassword ? 'Sembunyikan' : 'Lihat'}</span>
                </button>
              </div>

              {/* New Password Form */}
              <form onSubmit={handleSaveUserPassword} className="space-y-3.5 pt-1">
                <div>
                  <label className="block text-slate-300 font-bold mb-1.5 text-xs">
                    Password Baru <span className="text-[#C25941]">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showTargetPassword ? 'text' : 'password'}
                      value={newTargetPassword}
                      onChange={(e) => setNewTargetPassword(e.target.value)}
                      placeholder="Ketik password baru pengguna..."
                      required
                      autoFocus
                      className="w-full pl-9 pr-10 py-2.5 bg-[#1A1614] border border-[#453D37] focus:border-[#FFBC7D] rounded-xl text-white font-mono text-xs focus:outline-none transition"
                    />
                    <Lock className="w-4 h-4 text-[#877465] absolute left-3 top-2.5" />
                    <button
                      type="button"
                      onClick={() => setShowTargetPassword(!showTargetPassword)}
                      className="absolute right-3 top-2.5 text-[#877465] hover:text-white transition cursor-pointer"
                      title={showTargetPassword ? 'Sembunyikan password' : 'Lihat password'}
                    >
                      {showTargetPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4 text-[#877465]" />}
                    </button>
                  </div>
                </div>

                {/* Quick Presets */}
                <div>
                  <span className="text-[10px] text-[#877465] font-semibold block mb-1.5">
                    Pilihan Cepat / Preset Sandi:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setNewTargetPassword('logar123');
                        setShowTargetPassword(true);
                      }}
                      className="px-2 py-1 bg-[#1A1614] hover:bg-[#3D352F] text-[#EAEEBB] border border-[#453D37] rounded-lg text-[10px] font-mono transition cursor-pointer"
                    >
                      logar123 (Default Hotel)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setNewTargetPassword('Lombok2026!');
                        setShowTargetPassword(true);
                      }}
                      className="px-2 py-1 bg-[#1A1614] hover:bg-[#3D352F] text-[#FFBC7D] border border-[#453D37] rounded-lg text-[10px] font-mono transition cursor-pointer"
                    >
                      Lombok2026! (Kuat)
                    </button>
                    <button
                      type="button"
                      onClick={handleGenerateRandomPassword}
                      className="px-2 py-1 bg-[#1A1614] hover:bg-[#3D352F] text-[#D9DF98] border border-[#453D37] rounded-lg text-[10px] font-mono transition flex items-center gap-1 cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3 text-[#95A823]" />
                      Acak 8 Karakter
                    </button>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-[#28221E] border border-[#3D352F] text-[10px] text-[#877465] leading-relaxed">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#95A823] inline mr-1" />
                  Sebagai Super Admin, Anda dapat mengganti password staf kapan saja jika lupa password atau pergantian tugas. Perubahan akan langsung aktif untuk login.
                </div>

                {/* Action Buttons */}
                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsPasswordModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-[#877465] hover:text-white hover:bg-[#1A1614] transition font-semibold cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#95A823] to-[#7B8C1B] hover:from-[#85971E] hover:to-[#6E7D17] text-white font-bold transition shadow-md shadow-[#95A823]/30 flex items-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Simpan Password Baru</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Google Apps Script Deployment Modal */}
      {showScriptModal && (
        <div className="fixed inset-0 z-50 bg-[#1A1614]/85 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#231E1B] rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col border border-[#453D37]">
            <div className="px-6 py-4 border-b border-[#3D352F] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HardDrive className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-white text-base">
                  Panduan Auto-Upload ke Folder Google Drive Hotel
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowScriptModal(false)}
                className="w-8 h-8 rounded-full bg-[#2E2824] text-slate-300 hover:text-white flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs text-slate-300">
              <div className="p-3.5 rounded-2xl bg-[#2E2824] border border-[#453D37] space-y-2">
                <p className="font-bold text-white text-sm">
                  Langkah Mudah Menghubungkan Google Drive Hotel:
                </p>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-300">
                  <li>
                    Buka <a href="https://script.google.com" target="_blank" rel="noopener noreferrer" className="text-amber-400 underline font-semibold">script.google.com</a> menggunakan akun Google Hotel Lombok Garden.
                  </li>
                  <li>
                    Klik <strong>Project Baru</strong>, beri nama misalnya <span className="font-mono text-emerald-400">"LOGAR Drive Uploader"</span>.
                  </li>
                  <li>
                    Hapus kode bawaan, lalu salin dan tempelkan <strong>Kode Script di bawah</strong> ini.
                  </li>
                  <li>
                    Klik tombol <strong>Deploy &rarr; New Deployment</strong>, pilih tipe <strong>Web app</strong>.
                  </li>
                  <li>
                    Atur <em>Execute as</em>: <strong>Me (Akun Google Hotel)</strong> dan <em>Who has access</em>: <strong>Anyone</strong>.
                  </li>
                  <li>
                    Klik Deploy, lalu salin <strong>Web App URL</strong> yang dihasilkan ke kolom <em>Google Apps Script Webhook URL</em> di dasbor ini.
                  </li>
                </ol>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-white">Kode Google Apps Script:</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_CODE);
                      setCopiedScript(true);
                      setTimeout(() => setCopiedScript(false), 2500);
                    }}
                    className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer"
                  >
                    {copiedScript ? <CheckCheck className="w-3.5 h-3.5 text-slate-950" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedScript ? 'Kode Tersalin!' : 'Salin Kode Script'}</span>
                  </button>
                </div>
                <pre className="p-3 bg-slate-950 rounded-xl border border-slate-800 font-mono text-[11px] text-emerald-300 overflow-x-auto max-h-64 leading-relaxed">
                  {GOOGLE_APPS_SCRIPT_CODE}
                </pre>
              </div>

              <div className="p-3 rounded-xl bg-blue-950/40 border border-blue-800/40 text-[11px] text-blue-300 flex items-start gap-2">
                <Info className="w-4 h-4 shrink-0 text-blue-400 mt-0.5" />
                <p>
                  Dengan script ini, setiap petugas di lapangan yang mengunggah foto tidak perlu login ke Google Drive. Foto akan langsung tersimpan rapi di folder Google Drive yang ditentukan oleh Super Admin.
                </p>
              </div>
            </div>

            <div className="px-6 py-3 bg-[#1A1614] border-t border-[#3D352F] flex justify-end">
              <button
                type="button"
                onClick={() => setShowScriptModal(false)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Logo & Branding Modal */}
      <ChangeLogoModal
        isOpen={isChangeLogoModalOpen}
        onClose={() => setIsChangeLogoModalOpen(false)}
        currentUser={null}
        onSuccess={(newBranding) => {
          setSettings(prev => ({ ...prev, branding: newBranding }));
          showToast('Logo & Identitas Brand Hotel berhasil diperbarui!');
          if (onRefreshData) onRefreshData();
        }}
      />
    </div>
  );
};
