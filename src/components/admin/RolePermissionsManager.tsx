import React, { useState, useMemo } from 'react';
import { 
  ShieldCheck, 
  KeyRound, 
  CheckCircle2, 
  XCircle, 
  Save, 
  RotateCcw, 
  Users, 
  Sparkles, 
  Layers, 
  Lock, 
  AlertTriangle, 
  Search, 
  UserCheck, 
  Check, 
  Info,
  BarChart3,
  ListFilter,
  PlusCircle,
  FileText,
  Cloud,
  Edit,
  Trash2,
  Shield,
  X,
  Eye,
  CheckCheck
} from 'lucide-react';
import type { UserProfile, UserRole, RolePermissionConfig, SystemPermissionsState } from '../../types/index.ts';
import { 
  ALL_SYSTEM_ROLES, 
  MENU_PERMISSION_DEFINITIONS, 
  DEFAULT_ROLE_PERMISSIONS,
  syncPermissionsToFirestore, 
  resetPermissionsToDefault 
} from '../../services/permissionService.ts';

interface RolePermissionsManagerProps {
  permissions: SystemPermissionsState;
  onUpdatePermissions: (newPerms: SystemPermissionsState) => void;
  users: UserProfile[];
  onShowToast: (msg: string) => void;
}

export const RolePermissionsManager: React.FC<RolePermissionsManagerProps> = ({
  permissions,
  onUpdatePermissions,
  users,
  onShowToast,
}) => {
  const [selectedRole, setSelectedRole] = useState<UserRole>('Duty Manager');
  const [viewMode, setViewMode] = useState<'roles' | 'matrix' | 'users'>('roles');
  const [selectedUserId, setSelectedUserId] = useState<string>(users[0]?.id || '');
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Helper icon for each permission
  const getPermissionIcon = (key: string) => {
    switch (key) {
      case 'canAccessDashboard':
        return <BarChart3 className="w-4 h-4 text-[#95A823]" />;
      case 'canAccessReports':
        return <ListFilter className="w-4 h-4 text-[#2A9D8F]" />;
      case 'canCreateReport':
        return <PlusCircle className="w-4 h-4 text-[#E76F51]" />;
      case 'canExportPdf':
        return <FileText className="w-4 h-4 text-[#E9C46A]" />;
      case 'canSyncCloud':
        return <Cloud className="w-4 h-4 text-[#3A86FF]" />;
      case 'canEditReportStatus':
        return <Edit className="w-4 h-4 text-[#F4A261]" />;
      case 'canDeleteReport':
        return <Trash2 className="w-4 h-4 text-[#E63946]" />;
      case 'canAccessSuperAdmin':
        return <Shield className="w-4 h-4 text-[#95A823]" />;
      default:
        return <KeyRound className="w-4 h-4 text-[#95A823]" />;
    }
  };

  const handleToggleRolePermission = (
    role: UserRole,
    permKey: keyof Omit<RolePermissionConfig, 'role' | 'displayName' | 'description'>
  ) => {
    // Safety guard: Super Admin canAccessSuperAdmin cannot be disabled to prevent accidental lockout
    if (role === 'Super Admin' && permKey === 'canAccessSuperAdmin') {
      onShowToast('Proteksi Keamanan: Hak akses Super Admin tidak dapat dinonaktifkan.');
      return;
    }

    const currentVal = permissions.roles[role][permKey];
    const updatedRoleConfig: RolePermissionConfig = {
      ...permissions.roles[role],
      [permKey]: !currentVal,
    };

    const updatedPermissions: SystemPermissionsState = {
      ...permissions,
      roles: {
        ...permissions.roles,
        [role]: updatedRoleConfig,
      },
      updatedAt: new Date().toISOString(),
      updatedBy: 'Super Administrator',
    };

    onUpdatePermissions(updatedPermissions);
    setIsDirty(true);
  };

  const handleToggleUserPermission = (
    userId: string,
    permKey: keyof Omit<RolePermissionConfig, 'role' | 'displayName' | 'description'>
  ) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;

    if (user.role === 'Super Admin' && permKey === 'canAccessSuperAdmin') {
      onShowToast('Proteksi Keamanan: Akses Super Admin pada akun ini wajib tetap aktif.');
      return;
    }

    const baseRolePerms = permissions.roles?.[user.role] || DEFAULT_ROLE_PERMISSIONS[user.role] || DEFAULT_ROLE_PERMISSIONS['Staff'];
    const existingOverride = permissions.userOverrides?.[userId] || 
      (user.username ? permissions.userOverrides?.[user.username] : {}) || 
      (user.email ? permissions.userOverrides?.[user.email] : {}) || {};
    
    const currentValue = existingOverride[permKey] !== undefined 
      ? existingOverride[permKey] 
      : (baseRolePerms as any)[permKey];

    const nextValue = !currentValue;

    const updatedOverrideForUser = {
      ...existingOverride,
      [permKey]: nextValue,
    };

    // If enabling canEditReportStatus, ensure canAccessReports is also enabled so user can access the table
    if (permKey === 'canEditReportStatus' && nextValue === true) {
      updatedOverrideForUser.canAccessReports = true;
    }

    const updatedOverrides = {
      ...(permissions.userOverrides || {}),
      [userId]: updatedOverrideForUser,
    };

    // Also mirror to username if different for maximum lookup compatibility
    if (user.username && user.username !== userId) {
      updatedOverrides[user.username] = updatedOverrideForUser;
    }

    const updatedPermissions: SystemPermissionsState = {
      ...permissions,
      userOverrides: updatedOverrides,
      updatedAt: new Date().toISOString(),
      updatedBy: 'Super Administrator',
    };

    onUpdatePermissions(updatedPermissions);
    setIsDirty(true);
  };

  const handleResetUserOverride = (userId: string) => {
    if (!permissions.userOverrides || !permissions.userOverrides[userId]) return;
    const updatedOverrides = { ...permissions.userOverrides };
    delete updatedOverrides[userId];

    const updatedPermissions: SystemPermissionsState = {
      ...permissions,
      userOverrides: updatedOverrides,
      updatedAt: new Date().toISOString(),
    };

    onUpdatePermissions(updatedPermissions);
    setIsDirty(true);
    onShowToast('Hak akses pengguna dikembalikan sesuai standar role.');
  };

  const handleSelectAllRolePermissions = (role: UserRole) => {
    const updatedRoleConfig: RolePermissionConfig = { ...permissions.roles[role] };
    MENU_PERMISSION_DEFINITIONS.forEach(m => {
      // Don't grant canAccessSuperAdmin to non-Super Admin automatically for safety
      if (m.key === 'canAccessSuperAdmin' && role !== 'Super Admin') {
        return;
      }
      (updatedRoleConfig as any)[m.key] = true;
    });

    const updatedPermissions: SystemPermissionsState = {
      ...permissions,
      roles: {
        ...permissions.roles,
        [role]: updatedRoleConfig,
      },
      updatedAt: new Date().toISOString(),
      updatedBy: 'Super Administrator',
    };

    onUpdatePermissions(updatedPermissions);
    setIsDirty(true);
    onShowToast(`Semua menu berhasil diaktifkan untuk role "${permissions.roles[role].displayName}".`);
  };

  const handleDeselectAllRolePermissions = (role: UserRole) => {
    const updatedRoleConfig: RolePermissionConfig = { ...permissions.roles[role] };
    MENU_PERMISSION_DEFINITIONS.forEach(m => {
      // Super Admin must keep canAccessSuperAdmin and canAccessDashboard
      if (role === 'Super Admin' && (m.key === 'canAccessSuperAdmin' || m.key === 'canAccessDashboard')) {
        return;
      }
      (updatedRoleConfig as any)[m.key] = false;
    });

    const updatedPermissions: SystemPermissionsState = {
      ...permissions,
      roles: {
        ...permissions.roles,
        [role]: updatedRoleConfig,
      },
      updatedAt: new Date().toISOString(),
      updatedBy: 'Super Administrator',
    };

    onUpdatePermissions(updatedPermissions);
    setIsDirty(true);
    onShowToast(`Semua menu dibatasi untuk role "${permissions.roles[role].displayName}".`);
  };

  const handleResetSingleRoleToDefault = (role: UserRole) => {
    const defaultRoleConfig = DEFAULT_ROLE_PERMISSIONS[role];
    if (!defaultRoleConfig) return;

    const updatedPermissions: SystemPermissionsState = {
      ...permissions,
      roles: {
        ...permissions.roles,
        [role]: { ...defaultRoleConfig },
      },
      updatedAt: new Date().toISOString(),
      updatedBy: 'Super Administrator',
    };

    onUpdatePermissions(updatedPermissions);
    setIsDirty(true);
    onShowToast(`Hak akses role "${defaultRoleConfig.displayName}" dikembalikan ke standar rekomendasi.`);
  };

  const handleSelectAllUserPermissions = (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;

    const override: Partial<RolePermissionConfig> = {};
    MENU_PERMISSION_DEFINITIONS.forEach(m => {
      if (m.key === 'canAccessSuperAdmin' && user.role !== 'Super Admin') return;
      (override as any)[m.key] = true;
    });

    const updatedOverrides = {
      ...(permissions.userOverrides || {}),
      [userId]: override,
    };

    const updatedPermissions: SystemPermissionsState = {
      ...permissions,
      userOverrides: updatedOverrides,
      updatedAt: new Date().toISOString(),
      updatedBy: 'Super Administrator',
    };

    onUpdatePermissions(updatedPermissions);
    setIsDirty(true);
    onShowToast(`Semua menu diaktifkan khusus untuk ${user.name}.`);
  };

  const handleDeselectAllUserPermissions = (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;

    const override: Partial<RolePermissionConfig> = {};
    MENU_PERMISSION_DEFINITIONS.forEach(m => {
      if (user.role === 'Super Admin' && (m.key === 'canAccessSuperAdmin' || m.key === 'canAccessDashboard')) {
        (override as any)[m.key] = true;
        return;
      }
      (override as any)[m.key] = false;
    });

    const updatedOverrides = {
      ...(permissions.userOverrides || {}),
      [userId]: override,
    };

    const updatedPermissions: SystemPermissionsState = {
      ...permissions,
      userOverrides: updatedOverrides,
      updatedAt: new Date().toISOString(),
      updatedBy: 'Super Administrator',
    };

    onUpdatePermissions(updatedPermissions);
    setIsDirty(true);
    onShowToast(`Semua menu dibatasi khusus untuk ${user.name}.`);
  };

  const handleSaveAndSync = async () => {
    setIsSaving(true);
    try {
      await syncPermissionsToFirestore(permissions);
      setIsDirty(false);
      onShowToast('Hak akses menu & peran berhasil disimpan & disinkronkan ke seluruh perangkat!');
    } catch (err) {
      console.error(err);
      onShowToast('Gagal menyinkronkan hak akses ke cloud.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetDefault = () => {
    if (window.confirm('Apakah Anda yakin ingin mengembalikan seluruh hak akses menu ke pengaturan standar hotel?')) {
      const resetState = resetPermissionsToDefault();
      onUpdatePermissions(resetState);
      setIsDirty(false);
      onShowToast('Seluruh hak akses peran berhasil dikembalikan ke standar rekomendasi!');
    }
  };

  const selectedUser = users.find(u => u.id === selectedUserId) || users[0];
  const userOverride = selectedUser ? permissions.userOverrides?.[selectedUser.id] : undefined;

  const filteredUsers = useMemo<UserProfile[]>(() => {
    const list = users.filter((u: UserProfile) => 
      u.name.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
      u.role.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
      u.department.toLowerCase().includes(userSearchQuery.toLowerCase())
    );
    const seen = new Set<string>();
    return list.filter((u: UserProfile): u is UserProfile => {
      if (!u || !u.id || seen.has(u.id)) return false;
      seen.add(u.id);
      return true;
    });
  }, [users, userSearchQuery]);

  return (
    <div className="space-y-6">
      {/* Top Banner Card */}
      <div className="bg-gradient-to-r from-[#231E1B] via-[#2E2824] to-[#362E2A] text-white rounded-3xl p-6 sm:p-8 border border-[#3D352F] shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2.5 mb-2">
              <span className="w-8 h-8 rounded-xl bg-[#95A823] flex items-center justify-center text-white shadow-md shadow-[#95A823]/30">
                <KeyRound className="w-4 h-4" />
              </span>
              <span className="text-xs font-black tracking-widest text-[#EAEEBB] uppercase">
                Role-Based Access Control (RBAC) &bull; Sistem Hak Akses
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Manajemen Peran &amp; Hak Akses Menu
            </h2>
            <p className="text-xs sm:text-sm text-[#D9DF98] mt-1.5 leading-relaxed">
              Sesuaikan visibilitas menu navigasi, fitur ekspor dokumen, izin perubahan status laporan, 
              serta proteksi panel administrasi untuk setiap Role jabatan atau personil tertentu di Hotel Lombok Garden.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleResetDefault}
              className="px-3.5 py-2.5 rounded-xl bg-[#28211D] hover:bg-[#3D352F] text-[#D9DF98] hover:text-white border border-[#453D37] text-xs font-bold flex items-center gap-2 transition cursor-pointer"
              title="Reset seluruh hak akses ke standar default"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Standar</span>
            </button>

            <button
              type="button"
              onClick={handleSaveAndSync}
              disabled={isSaving}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer shadow-lg ${
                isDirty 
                  ? 'bg-[#95A823] hover:bg-[#83941F] text-white shadow-[#95A823]/30 animate-pulse' 
                  : 'bg-[#95A823] hover:bg-[#83941F] text-white shadow-[#95A823]/20'
              }`}
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Menyimpan...' : (isDirty ? 'Simpan & Sinkron Cloud *' : 'Tersimpan & Sinkron')}</span>
            </button>
          </div>
        </div>

        {/* Ambient background decoration */}
        <div className="absolute right-0 bottom-0 translate-x-12 translate-y-12 w-64 h-64 rounded-full bg-[#95A823]/10 blur-3xl pointer-events-none"></div>
      </div>

      {/* Mode Navigation Tabs */}
      <div className="flex items-center justify-between border-b border-[#E2E7B8] pb-3 flex-wrap gap-3">
        <div className="flex items-center gap-2 bg-[#EAEEBB]/60 p-1.5 rounded-2xl border border-[#D9DF98]">
          <button
            type="button"
            onClick={() => setViewMode('roles')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              viewMode === 'roles'
                ? 'bg-white text-[#231E1B] shadow-xs'
                : 'text-[#61554D] hover:text-[#231E1B] hover:bg-white/50'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-[#95A823]" />
            <span>Hak Akses per Role (Jabatan)</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('matrix')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              viewMode === 'matrix'
                ? 'bg-white text-[#231E1B] shadow-xs'
                : 'text-[#61554D] hover:text-[#231E1B] hover:bg-white/50'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-[#2A9D8F]" />
            <span>Matriks Perbandingan Menu</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('users')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              viewMode === 'users'
                ? 'bg-white text-[#231E1B] shadow-xs'
                : 'text-[#61554D] hover:text-[#231E1B] hover:bg-white/50'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-[#E76F51]" />
            <span>Kustomisasi Khusus per User ({Object.keys(permissions.userOverrides || {}).length})</span>
          </button>
        </div>

        <div className="text-[11px] text-[#70635A] font-medium flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-[#95A823]" />
          <span>Perubahan berlaku seketika di peramban seluruh personil secara *real-time*.</span>
        </div>
      </div>

      {/* MODE 1: HAK AKSES PER ROLE */}
      {viewMode === 'roles' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Role Selector List */}
          <div className="lg:col-span-4 space-y-2.5">
            <div className="bg-white rounded-2xl p-3 border border-[#E2E7B8] shadow-xs">
              <p className="text-[10px] font-black uppercase tracking-wider text-[#70635A] px-2 mb-2">
                Pilih Role yang Ingin Disesuaikan
              </p>
              <div className="space-y-1.5">
                {ALL_SYSTEM_ROLES.map((role) => {
                  const roleConfig = permissions.roles[role];
                  const userCount = users.filter(u => u.role === role).length;
                  const isSelected = selectedRole === role;
                  const enabledCount = MENU_PERMISSION_DEFINITIONS.filter(m => roleConfig[m.key]).length;

                  return (
                    <button
                      key={role}
                      type="button"
                      onClick={() => setSelectedRole(role)}
                      className={`w-full text-left p-3 rounded-xl transition flex items-center justify-between border cursor-pointer ${
                        isSelected
                          ? 'bg-[#231E1B] text-white border-[#231E1B] shadow-md'
                          : 'bg-[#FAFBF5] hover:bg-[#EAEEBB]/50 text-[#231E1B] border-[#E2E7B8]'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 font-bold text-xs ${
                          isSelected ? 'bg-[#95A823] text-white' : 'bg-[#EAEEBB] text-[#5B6713]'
                        }`}>
                          {role.charAt(0)}
                        </div>
                        <div className="truncate">
                          <p className="font-bold text-xs truncate">
                            {roleConfig.displayName}
                          </p>
                          <p className={`text-[10px] truncate ${isSelected ? 'text-[#C6CC81]' : 'text-[#70635A]'}`}>
                            {userCount} Pengguna Terdaftar
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                          isSelected 
                            ? 'bg-[#95A823]/30 text-[#EAEEBB] border border-[#95A823]/50' 
                            : 'bg-[#EAEEBB] text-[#5B6713]'
                        }`}>
                          {enabledCount} / {MENU_PERMISSION_DEFINITIONS.length} Menu
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick role info callout */}
            <div className="bg-[#FAFBF5] rounded-2xl p-4 border border-[#E2E7B8] text-xs text-[#70635A] space-y-2">
              <div className="flex items-center gap-2 font-bold text-[#231E1B]">
                <ShieldCheck className="w-4 h-4 text-[#95A823]" />
                <span>Prinsip Keamanan Role LOGAR</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                Setiap peran yang diberi akses ke menu tertentu akan otomatis melihat tombol menu terkait di navigasi sidebar atau dashboard.
              </p>
            </div>
          </div>

          {/* Right Column: Permission Checkboxes for Selected Role */}
          <div className="lg:col-span-8 space-y-4">
            <div className="bg-white rounded-3xl p-6 border border-[#E2E7B8] shadow-xs space-y-5">
              {/* Header of selected role */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#E2E7B8] gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-[#EAEEBB] text-[#5B6713] border border-[#C6CC81]">
                      Konfigurasi Role
                    </span>
                    <h3 className="text-xl font-black text-[#231E1B]">
                      {permissions.roles[selectedRole].displayName}
                    </h3>
                  </div>
                  <p className="text-xs text-[#70635A] mt-1">
                    {permissions.roles[selectedRole].description}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] text-[#70635A]">
                    Terapkan untuk {users.filter(u => u.role === selectedRole).length} user aktif
                  </span>
                </div>
              </div>

              {/* Quick Batch Menu Controls */}
              <div className="flex flex-wrap items-center justify-between gap-2.5 bg-[#FAFBF5] p-3 rounded-2xl border border-[#E2E7B8]">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#231E1B] flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#95A823]" />
                    <span>Aksi Cepat Menu Role:</span>
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleSelectAllRolePermissions(selectedRole)}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#EAEEBB] hover:bg-[#D9DF98] text-[#5B6713] transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
                    title="Beri akses penuh ke seluruh menu untuk role ini"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span>Beri Akses Semua Menu</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeselectAllRolePermissions(selectedRole)}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#FAF0ED] hover:bg-[#FCDFD7] text-[#C25941] border border-[#F4BDB0] transition cursor-pointer flex items-center gap-1.5"
                    title="Batasi semua menu (nonaktifkan) untuk role ini"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Batasi Semua Menu</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleResetSingleRoleToDefault(selectedRole)}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white hover:bg-gray-50 text-[#70635A] border border-[#E2E7B8] transition cursor-pointer flex items-center gap-1.5"
                    title="Kembalikan konfigurasi role ini ke rekomendasi standar"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Standar Rekomendasi</span>
                  </button>
                </div>
              </div>

              {/* Grouped Checklist */}
              <div className="space-y-4">
                {(['Navigasi Menu', 'Tindakan Operasional', 'Administrasi'] as const).map(category => {
                  const items = MENU_PERMISSION_DEFINITIONS.filter(m => m.category === category);
                  if (items.length === 0) return null;

                  return (
                    <div key={category} className="space-y-2.5">
                      <p className="text-[11px] font-black uppercase tracking-wider text-[#877465] px-1">
                        {category}
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {items.map(item => {
                          const isEnabled = permissions.roles[selectedRole][item.key];
                          const isLockedSuperAdmin = selectedRole === 'Super Admin' && item.key === 'canAccessSuperAdmin';

                          return (
                            <div
                              key={item.key}
                              onClick={() => {
                                if (!isLockedSuperAdmin) {
                                  handleToggleRolePermission(selectedRole, item.key);
                                }
                              }}
                              className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between gap-3 cursor-pointer ${
                                isEnabled
                                  ? 'bg-[#FAFBF5] border-[#95A823] shadow-xs'
                                  : 'bg-white border-[#E2E7B8] hover:border-[#C6CC81]'
                              } ${isLockedSuperAdmin ? 'opacity-80 cursor-not-allowed' : ''}`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                                    isEnabled ? 'bg-[#95A823]/15' : 'bg-gray-100'
                                  }`}>
                                    {getPermissionIcon(item.key)}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-xs font-bold text-[#231E1B] truncate">
                                      {item.label}
                                    </p>
                                    <span className={`text-[10px] font-bold ${
                                      isEnabled ? 'text-[#5B6713]' : 'text-gray-400'
                                    }`}>
                                      {isEnabled ? '● Diizinkan (Aktif)' : '○ Dibatasi (Nonaktif)'}
                                    </span>
                                  </div>
                                </div>

                                {/* Custom Toggle Pill */}
                                <div className={`w-11 h-6 rounded-full transition-colors p-0.5 shrink-0 ${
                                  isEnabled ? 'bg-[#95A823]' : 'bg-gray-300'
                                }`}>
                                  <div className={`w-5 h-5 rounded-full bg-white transition-transform shadow-xs ${
                                    isEnabled ? 'translate-x-5' : 'translate-x-0'
                                  }`} />
                                </div>
                              </div>

                              <p className="text-[11px] text-[#70635A] leading-snug">
                                {item.description}
                              </p>

                              {isLockedSuperAdmin && (
                                <div className="text-[9px] text-[#C25941] font-bold flex items-center gap-1 pt-1 border-t border-[#E2E7B8]">
                                  <Lock className="w-3 h-3" />
                                  <span>Terkunci permanen demi keamanan sistem</span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Live Mini Sidebar Preview */}
              <div className="bg-[#1E1917] rounded-2xl p-5 border border-[#3D352F] text-white space-y-3.5 mt-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#3D352F] pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-[#95A823] flex items-center justify-center text-white">
                      <Eye className="w-3.5 h-3.5" />
                    </span>
                    <h4 className="text-xs font-bold text-[#EAEEBB]">
                      Pratinjau Navigasi Live untuk Role: {permissions.roles[selectedRole].displayName}
                    </h4>
                  </div>
                  <span className="text-[10px] text-[#A89E96]">
                    * Tampilan menu yang otomatis muncul di aplikasi petugas
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-[#231E1B] p-3 rounded-xl border border-[#3D352F] space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-wider text-[#877465]">
                      Menu Navigasi Sidebar yang Tampil:
                    </p>
                    <div className="space-y-1.5">
                      {permissions.roles[selectedRole].canAccessDashboard ? (
                        <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-[#95A823] text-white text-xs font-bold shadow-xs">
                          <BarChart3 className="w-4 h-4 shrink-0" />
                          <span>Dasbor Visual &amp; Statistik</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-[#2A2420] text-[#70635A] text-xs line-through opacity-60">
                          <BarChart3 className="w-4 h-4 shrink-0" />
                          <span>Dasbor Visual (Disembunyikan)</span>
                        </div>
                      )}

                      {permissions.roles[selectedRole].canAccessReports ? (
                        <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-[#2E2824] text-[#D9DF98] border border-[#453D37] text-xs font-bold">
                          <ListFilter className="w-4 h-4 text-[#2A9D8F] shrink-0" />
                          <span>Data Laporan &amp; Riwayat Lengkap</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-[#2A2420] text-[#70635A] text-xs line-through opacity-60">
                          <ListFilter className="w-4 h-4 shrink-0" />
                          <span>Data Laporan (Disembunyikan)</span>
                        </div>
                      )}

                      {permissions.roles[selectedRole].canCreateReport && (
                        <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-[#95A823]/80 text-white text-xs font-bold">
                          <PlusCircle className="w-4 h-4 shrink-0" />
                          <span>+ Input Data MOD (Form Inspeksi)</span>
                        </div>
                      )}

                      {permissions.roles[selectedRole].canExportPdf && (
                        <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-[#2E2824] text-[#EAEEBB] border border-[#453D37] text-xs font-bold">
                          <FileText className="w-4 h-4 text-[#E9C46A] shrink-0" />
                          <span>Ekspor PDF Resmi LOGAR</span>
                        </div>
                      )}

                      {permissions.roles[selectedRole].canSyncCloud && (
                        <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-[#2E2824] text-[#D9DF98] border border-[#453D37] text-xs font-bold">
                          <Cloud className="w-4 h-4 text-[#3A86FF] shrink-0" />
                          <span>Sinkronisasi Google Drive &amp; Cloud</span>
                        </div>
                      )}

                      {permissions.roles[selectedRole].canAccessSuperAdmin && (
                        <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-[#FFBC7D]/20 text-[#FFBC7D] border border-[#FFBC7D]/50 text-xs font-bold">
                          <KeyRound className="w-4 h-4 shrink-0" />
                          <span>Super Admin Backend Panel</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-[#231E1B] p-3 rounded-xl border border-[#3D352F] space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-wider text-[#877465]">
                      Izin Operasional &amp; Keamanan:
                    </p>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-center justify-between p-2 rounded-lg bg-[#28211D] border border-[#3D352F]">
                        <span className="text-[#C6CC81]">Ubah Status Temuan:</span>
                        <span className={`font-bold ${permissions.roles[selectedRole].canEditReportStatus ? 'text-[#95A823]' : 'text-rose-400'}`}>
                          {permissions.roles[selectedRole].canEditReportStatus ? 'Bisa (Editable)' : 'Terkunci (Read-only)'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between p-2 rounded-lg bg-[#28211D] border border-[#3D352F]">
                        <span className="text-[#C6CC81]">Hapus Baris Laporan:</span>
                        <span className={`font-bold ${permissions.roles[selectedRole].canDeleteReport ? 'text-[#95A823]' : 'text-rose-400'}`}>
                          {permissions.roles[selectedRole].canDeleteReport ? 'Diizinkan' : 'Dilarang'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between p-2 rounded-lg bg-[#28211D] border border-[#3D352F]">
                        <span className="text-[#C6CC81]">Akses Panel Super Admin:</span>
                        <span className={`font-bold ${permissions.roles[selectedRole].canAccessSuperAdmin ? 'text-[#FFBC7D]' : 'text-gray-400'}`}>
                          {permissions.roles[selectedRole].canAccessSuperAdmin ? 'Terbuka' : 'Terkunci'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODE 2: MATRIKS PERBANDINGAN MENU (OVERVIEW MATRIX) */}
      {viewMode === 'matrix' && (
        <div className="bg-white rounded-3xl p-6 border border-[#E2E7B8] shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E2E7B8]">
            <div>
              <h3 className="text-lg font-black text-[#231E1B]">
                Matriks Hak Akses Seluruh Peran (Role Matrix)
              </h3>
              <p className="text-xs text-[#70635A]">
                Klik tombol centang/silang pada tabel berikut untuk langsung mengubah hak akses secara cepat.
              </p>
            </div>
            <span className="text-xs font-bold text-[#5B6713] bg-[#EAEEBB] px-3 py-1 rounded-xl border border-[#C6CC81]">
              6 Role Terkonfigurasi
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#FAFBF5] border-b border-[#E2E7B8] text-[#231E1B]">
                  <th className="p-3.5 font-black uppercase text-[10px] tracking-wider min-w-[200px]">
                    Menu / Fitur Operasional
                  </th>
                  {ALL_SYSTEM_ROLES.map(role => (
                    <th key={role} className="p-3 font-bold text-center min-w-[110px]">
                      <div className="truncate text-xs font-black">{role}</div>
                      <span className="text-[9px] text-[#70635A] font-normal">
                        ({users.filter(u => u.role === role).length} user)
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E7B8]">
                {MENU_PERMISSION_DEFINITIONS.map(item => (
                  <tr key={item.key} className="hover:bg-[#FAFBF5]/80 transition">
                    <td className="p-3.5">
                      <div className="flex items-center gap-2">
                        {getPermissionIcon(item.key)}
                        <div>
                          <p className="font-bold text-xs text-[#231E1B]">{item.label}</p>
                          <p className="text-[10px] text-[#70635A] truncate max-w-xs">{item.description}</p>
                        </div>
                      </div>
                    </td>
                    {ALL_SYSTEM_ROLES.map(role => {
                      const isEnabled = permissions.roles[role][item.key];
                      const isLocked = role === 'Super Admin' && item.key === 'canAccessSuperAdmin';

                      return (
                        <td key={role} className="p-3 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              if (!isLocked) {
                                handleToggleRolePermission(role, item.key);
                              }
                            }}
                            disabled={isLocked}
                            className={`w-8 h-8 rounded-xl inline-flex items-center justify-center transition cursor-pointer ${
                              isEnabled
                                ? 'bg-[#95A823]/15 text-[#5B6713] hover:bg-[#95A823]/30 border border-[#95A823]/30'
                                : 'bg-gray-100 text-gray-400 hover:bg-gray-200 border border-gray-200'
                            } ${isLocked ? 'cursor-not-allowed opacity-80' : ''}`}
                            title={isEnabled ? `Nonaktifkan untuk ${role}` : `Aktifkan untuk ${role}`}
                          >
                            {isEnabled ? <Check className="w-4 h-4 font-black" /> : <X className="w-3.5 h-3.5" />}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODE 3: KUSTOMISASI KHUSUS PER USER */}
      {viewMode === 'users' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* User selector list */}
          <div className="lg:col-span-4 bg-white rounded-3xl p-4 border border-[#E2E7B8] shadow-xs space-y-3">
            <div>
              <p className="text-xs font-bold text-[#231E1B] mb-1">Cari Akun Pengguna</p>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#70635A]" />
                <input
                  type="text"
                  placeholder="Ketik nama atau role..."
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-[#FAFBF5] border border-[#E2E7B8] rounded-xl text-xs focus:outline-none focus:border-[#95A823]"
                />
              </div>
            </div>

            <div className="max-h-[460px] overflow-y-auto space-y-1.5 pr-1">
              {filteredUsers.map(user => {
                const isSelected = selectedUserId === user.id;
                const hasOverride = permissions.userOverrides?.[user.id] && Object.keys(permissions.userOverrides[user.id] || {}).length > 0;

                return (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => setSelectedUserId(user.id)}
                    className={`w-full text-left p-2.5 rounded-xl border transition flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? 'bg-[#231E1B] text-white border-[#231E1B]'
                        : 'bg-[#FAFBF5] hover:bg-[#EAEEBB]/50 text-[#231E1B] border-[#E2E7B8]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={user.avatar}
                        alt={user.name}
                        className="w-8 h-8 rounded-lg object-cover border border-[#E2E7B8] shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-bold truncate">{user.name}</p>
                        <p className={`text-[10px] truncate ${isSelected ? 'text-[#C6CC81]' : 'text-[#70635A]'}`}>
                          {user.role} &bull; {user.department}
                        </p>
                      </div>
                    </div>

                    {hasOverride && (
                      <span className="text-[9px] font-bold bg-[#E76F51]/20 text-[#E76F51] border border-[#E76F51]/30 px-1.5 py-0.5 rounded-md shrink-0">
                        Kustom
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* User Permission Config Card */}
          <div className="lg:col-span-8 bg-white rounded-3xl p-6 border border-[#E2E7B8] shadow-xs space-y-5">
            {selectedUser ? (
              <>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#E2E7B8] gap-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={selectedUser.avatar}
                      alt={selectedUser.name}
                      className="w-12 h-12 rounded-2xl object-cover border-2 border-[#95A823]"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-black text-[#231E1B]">{selectedUser.name}</h3>
                        {userOverride && Object.keys(userOverride).length > 0 ? (
                          <span className="text-[10px] font-bold bg-[#E76F51]/15 text-[#E76F51] border border-[#E76F51]/30 px-2 py-0.5 rounded-full">
                            Izin Kustom Aktif
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold bg-[#EAEEBB] text-[#5B6713] border border-[#C6CC81] px-2 py-0.5 rounded-full">
                            Mengikuti Role Standar
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#70635A]">
                        Role Default: <span className="font-bold text-[#231E1B]">{selectedUser.role}</span> &bull; Departemen: {selectedUser.department}
                      </p>
                    </div>
                  </div>

                  {userOverride && Object.keys(userOverride).length > 0 && (
                    <button
                      type="button"
                      onClick={() => handleResetUserOverride(selectedUser.id)}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold text-[#C25941] bg-[#C25941]/10 hover:bg-[#C25941]/20 border border-[#C25941]/30 transition cursor-pointer"
                    >
                      Hapus Izin Kustom (Kembali ke Role)
                    </button>
                  )}
                </div>

                {/* Batch controls for specific user */}
                <div className="flex flex-wrap items-center justify-between gap-2 bg-[#FAFBF5] p-3 rounded-2xl border border-[#E2E7B8]">
                  <span className="text-xs font-bold text-[#231E1B] flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#95A823]" />
                    <span>Aksi Cepat Pengguna:</span>
                  </span>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleSelectAllUserPermissions(selectedUser.id)}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#EAEEBB] hover:bg-[#D9DF98] text-[#5B6713] transition cursor-pointer flex items-center gap-1.5"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      <span>Beri Semua Akses</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeselectAllUserPermissions(selectedUser.id)}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#FAF0ED] hover:bg-[#FCDFD7] text-[#C25941] border border-[#F4BDB0] transition cursor-pointer flex items-center gap-1.5"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Batasi Semua Akses</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-xs font-bold text-[#231E1B]">
                    Izin Menu Spesifik untuk {selectedUser.name}:
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {MENU_PERMISSION_DEFINITIONS.map(item => {
                      const baseRolePerm = permissions.roles[selectedUser.role][item.key];
                      const isOverridden = userOverride && userOverride[item.key] !== undefined;
                      const effectiveValue = isOverridden ? userOverride[item.key] : baseRolePerm;
                      const isLockedSuperAdmin = selectedUser.role === 'Super Admin' && item.key === 'canAccessSuperAdmin';

                      return (
                        <div
                          key={item.key}
                          onClick={() => {
                            if (!isLockedSuperAdmin) {
                              handleToggleUserPermission(selectedUser.id, item.key);
                            }
                          }}
                          className={`p-3.5 rounded-2xl border transition flex items-start justify-between gap-3 cursor-pointer ${
                            effectiveValue
                              ? 'bg-[#FAFBF5] border-[#95A823]'
                              : 'bg-white border-[#E2E7B8] hover:border-[#C6CC81]'
                          } ${isLockedSuperAdmin ? 'opacity-80 cursor-not-allowed' : ''}`}
                        >
                          <div className="flex items-start gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-xl bg-[#EAEEBB]/60 flex items-center justify-center shrink-0">
                              {getPermissionIcon(item.key)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-[#231E1B] truncate">{item.label}</p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className={`text-[10px] font-bold ${
                                  effectiveValue ? 'text-[#5B6713]' : 'text-gray-400'
                                }`}>
                                  {effectiveValue ? '● Diizinkan' : '○ Dibatasi'}
                                </span>
                                {isOverridden && (
                                  <span className="text-[9px] text-[#E76F51] font-bold bg-[#E76F51]/10 px-1.5 py-0.2 rounded">
                                    Override
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className={`w-10 h-5 rounded-full transition-colors p-0.5 shrink-0 ${
                            effectiveValue ? 'bg-[#95A823]' : 'bg-gray-300'
                          }`}>
                            <div className={`w-4 h-4 rounded-full bg-white transition-transform ${
                              effectiveValue ? 'translate-x-5' : 'translate-x-0'
                            }`} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-12 text-[#70635A]">
                <Users className="w-10 h-10 mx-auto text-[#C6CC81] mb-2" />
                <p className="font-bold text-sm">Pilih pengguna di kolom kiri untuk mengatur hak akses khusus.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
