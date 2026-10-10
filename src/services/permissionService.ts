import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db, sanitizeForFirestore } from './firebase.ts';
import type { UserProfile, UserRole, RolePermissionConfig, SystemPermissionsState } from '../types/index.ts';

const PERMISSIONS_STORAGE_KEY = 'mod_report_role_permissions_v1';

export const ALL_SYSTEM_ROLES: UserRole[] = [
  'Super Admin',
  'General Manager',
  'Duty Manager',
  'MOD Officer',
  'Department Head',
  'Staff',
];

export const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, RolePermissionConfig> = {
  'Super Admin': {
    role: 'Super Admin',
    displayName: 'Super Administrator',
    description: 'Akses penuh tanpa batas ke semua menu, input laporan baru, ekspor, database cloud, dan manajemen sistem',
    canAccessDashboard: true,
    canAccessReports: true,
    canCreateReport: true,
    canExportPdf: true,
    canSyncCloud: true,
    canEditReportStatus: true,
    canDeleteReport: true,
    canAccessSuperAdmin: true,
  },
  'General Manager': {
    role: 'General Manager',
    displayName: 'General Manager',
    description: 'Akses eksekutif manajemen: analisis visual, seluruh riwayat temuan, dan ekspor laporan PDF',
    canAccessDashboard: true,
    canAccessReports: true,
    canCreateReport: false,
    canExportPdf: true,
    canSyncCloud: true,
    canEditReportStatus: true,
    canDeleteReport: false,
    canAccessSuperAdmin: false,
  },
  'Duty Manager': {
    role: 'Duty Manager',
    displayName: 'Duty Manager (DM)',
    description: 'Pimpinan operasional harian: pemantauan area, input temuan, tindak lanjut temuan, dan disposisi departemen',
    canAccessDashboard: true,
    canAccessReports: true,
    canCreateReport: true,
    canExportPdf: true,
    canSyncCloud: true,
    canEditReportStatus: true,
    canDeleteReport: false,
    canAccessSuperAdmin: false,
  },
  'MOD Officer': {
    role: 'MOD Officer',
    displayName: 'Petugas MOD (Manager on Duty)',
    description: 'Petugas piket inspeksi fisik hotel: input laporan inspeksi, dasbor visual operasional, dan monitoring temuan patroli',
    canAccessDashboard: true,
    canAccessReports: true,
    canCreateReport: true,
    canExportPdf: true,
    canSyncCloud: true,
    canEditReportStatus: true,
    canDeleteReport: false,
    canAccessSuperAdmin: false,
  },
  'Department Head': {
    role: 'Department Head',
    displayName: 'Kepala Departemen (HOD)',
    description: 'Monitoring kondisi departemen terkait, tindak lanjut temuan lapangan, dan rekapitulasi data',
    canAccessDashboard: true,
    canAccessReports: true,
    canCreateReport: false,
    canExportPdf: true,
    canSyncCloud: false,
    canEditReportStatus: true,
    canDeleteReport: false,
    canAccessSuperAdmin: false,
  },
  'Staff': {
    role: 'Staff',
    displayName: 'Staff Pelaksana Lapangan',
    description: 'Akses terbatas untuk pemantauan ringkasan dasbor operasional',
    canAccessDashboard: true,
    canAccessReports: false,
    canCreateReport: false,
    canExportPdf: false,
    canSyncCloud: false,
    canEditReportStatus: false,
    canDeleteReport: false,
    canAccessSuperAdmin: false,
  },
};

export const MENU_PERMISSION_DEFINITIONS: {
  key: keyof Omit<RolePermissionConfig, 'role' | 'displayName' | 'description'>;
  label: string;
  category: 'Navigasi Menu' | 'Tindakan Operasional' | 'Administrasi';
  description: string;
}[] = [
  {
    key: 'canAccessDashboard',
    label: 'Menu Dasbor Visual & Grafik',
    category: 'Navigasi Menu',
    description: 'Dapat membuka dan melihat halaman Dasbor statistik visual serta rekap status temuan.',
  },
  {
    key: 'canAccessReports',
    label: 'Menu Data Riwayat Laporan',
    category: 'Navigasi Menu',
    description: 'Dapat membuka menu Data Laporan lengkap beserta filter tanggal, petugas, dan area.',
  },
  {
    key: 'canCreateReport',
    label: 'Form Input Laporan MOD Baru',
    category: 'Tindakan Operasional',
    description: 'Dapat mengisi form input inspeksi, mengambil/mengupload foto bukti, dan mengirim laporan.',
  },
  {
    key: 'canExportPdf',
    label: 'Ekspor Dokumen PDF Resmi',
    category: 'Tindakan Operasional',
    description: 'Dapat mendownload dan mencetak dokumen cetak PDF resmi MOD REPORT LOGAR.',
  },
  {
    key: 'canSyncCloud',
    label: 'Akses Sinkronisasi Cloud & Drive',
    category: 'Tindakan Operasional',
    description: 'Dapat memicu sinkronisasi manual ke Google Drive dan Firebase Cloud.',
  },
  {
    key: 'canEditReportStatus',
    label: 'Ubah Status Temuan (Aman / Selesai)',
    category: 'Tindakan Operasional',
    description: 'Dapat memperbarui status temuan (Perlu Follow Up, Dalam Proses, Selesai).',
  },
  {
    key: 'canDeleteReport',
    label: 'Hapus Data Catatan Laporan',
    category: 'Tindakan Operasional',
    description: 'Dapat menghapus baris laporan inspeksi dari sistem.',
  },
  {
    key: 'canAccessSuperAdmin',
    label: 'Akses Panel Super Administrator',
    category: 'Administrasi',
    description: 'Dapat masuk ke dashboard kontrol Super Admin (wajib dilindungi verifikasi kunci master).',
  },
];

export function getStoredPermissions(): SystemPermissionsState {
  try {
    const raw = localStorage.getItem(PERMISSIONS_STORAGE_KEY);
    if (raw) {
      const parsed: SystemPermissionsState = JSON.parse(raw);
      if (parsed && parsed.roles) {
        // Merge with defaults in case new roles or permissions were added
        const mergedRoles: Record<UserRole, RolePermissionConfig> = { ...DEFAULT_ROLE_PERMISSIONS };
        for (const role of ALL_SYSTEM_ROLES) {
          if (parsed.roles[role]) {
            mergedRoles[role] = { ...DEFAULT_ROLE_PERMISSIONS[role], ...parsed.roles[role] };
            // Ensure MOD Officer and Duty Manager keep essential report creation and viewing rights
            if (role === 'MOD Officer' || role === 'Duty Manager') {
              mergedRoles[role].canCreateReport = true;
              mergedRoles[role].canAccessReports = true;
              mergedRoles[role].canAccessDashboard = true;
            }
          }
        }
        return {
          roles: mergedRoles,
          userOverrides: parsed.userOverrides || {},
          updatedAt: parsed.updatedAt,
          updatedBy: parsed.updatedBy,
        };
      }
    }
  } catch (e) {
    console.error('Error reading stored permissions:', e);
  }

  return {
    roles: JSON.parse(JSON.stringify(DEFAULT_ROLE_PERMISSIONS)),
    userOverrides: {},
    updatedAt: new Date().toISOString(),
    updatedBy: 'System Default',
  };
}

export function saveStoredPermissions(state: SystemPermissionsState): void {
  try {
    localStorage.setItem(PERMISSIONS_STORAGE_KEY, JSON.stringify(state));
    // Broadcast event for live UI reactivity
    try {
      window.dispatchEvent(new CustomEvent('logar_permissions_updated', { detail: state }));
    } catch {
      // ignore
    }
  } catch (e) {
    console.error('Error saving permissions to localStorage:', e);
  }
}

export async function syncPermissionsToFirestore(state: SystemPermissionsState): Promise<void> {
  saveStoredPermissions(state);
  try {
    const docRef = doc(db, 'role_permissions', 'matrix');
    await setDoc(docRef, sanitizeForFirestore({
      ...state,
      updatedAt: new Date().toISOString(),
    }));
  } catch (err) {
    console.warn('Deferred syncing permissions to Firestore:', err);
  }
}

export async function fetchPermissionsFromFirestore(): Promise<SystemPermissionsState | null> {
  try {
    const docRef = doc(db, 'role_permissions', 'matrix');
    const snapshot = await getDoc(docRef);
    if (snapshot.exists()) {
      const data = snapshot.data() as SystemPermissionsState;
      if (data && data.roles) {
        const merged: SystemPermissionsState = {
          roles: { ...DEFAULT_ROLE_PERMISSIONS, ...data.roles },
          userOverrides: data.userOverrides || {},
          updatedAt: data.updatedAt,
          updatedBy: data.updatedBy,
        };
        saveStoredPermissions(merged);
        return merged;
      }
    }
  } catch (err) {
    console.warn('Fetch permissions from Firestore note:', err);
  }
  return null;
}

export function subscribeToFirestorePermissions(
  onUpdate: (state: SystemPermissionsState) => void
): () => void {
  const docRef = doc(db, 'role_permissions', 'matrix');
  return onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as SystemPermissionsState;
        if (data && data.roles) {
          const merged: SystemPermissionsState = {
            roles: { ...DEFAULT_ROLE_PERMISSIONS, ...data.roles },
            userOverrides: data.userOverrides || {},
            updatedAt: data.updatedAt,
            updatedBy: data.updatedBy,
          };
          saveStoredPermissions(merged);
          onUpdate(merged);
        }
      }
    },
    (err) => {
      console.warn('Real-time permissions listener note:', err);
    }
  );
}

export function getUserPermissions(
  user: UserProfile | null | undefined,
  permissionsState?: SystemPermissionsState
): RolePermissionConfig {
  const state = permissionsState || getStoredPermissions();

  if (!user) {
    return DEFAULT_ROLE_PERMISSIONS['Staff'];
  }

  // Super Admin role always maintains Super Admin permissions as a safety baseline
  if (user.role === 'Super Admin') {
    return {
      ...DEFAULT_ROLE_PERMISSIONS['Super Admin'],
      ...(state.roles?.['Super Admin'] || {}),
      canAccessSuperAdmin: true,
      canAccessDashboard: true,
    };
  }

  const roleBase = state.roles?.[user.role] || DEFAULT_ROLE_PERMISSIONS[user.role] || DEFAULT_ROLE_PERMISSIONS['Staff'];

  // Check user-specific override with resilient multi-identifier matching (id, username, email, name)
  let userOverride: Partial<RolePermissionConfig> | undefined = undefined;
  if (state.userOverrides) {
    if (user.id && state.userOverrides[user.id]) {
      userOverride = state.userOverrides[user.id];
    } else if (user.username && state.userOverrides[user.username]) {
      userOverride = state.userOverrides[user.username];
    } else if (user.email && state.userOverrides[user.email]) {
      userOverride = state.userOverrides[user.email];
    } else {
      // Find case-insensitive or partial id match
      const overrideKeys = Object.keys(state.userOverrides);
      for (const k of overrideKeys) {
        const kLower = k.toLowerCase().trim();
        const idLower = (user.id || '').toLowerCase().trim();
        const usernameLower = (user.username || '').toLowerCase().trim();
        const emailLower = (user.email || '').toLowerCase().trim();
        const nameLower = (user.name || '').toLowerCase().trim();

        if (
          (idLower && (kLower === idLower || kLower.includes(idLower) || idLower.includes(kLower))) ||
          (usernameLower && (kLower === usernameLower || kLower.includes(usernameLower))) ||
          (emailLower && kLower === emailLower) ||
          (nameLower && kLower === nameLower)
        ) {
          userOverride = state.userOverrides[k];
          break;
        }
      }
    }
  }

  if (userOverride) {
    const combined: RolePermissionConfig = {
      ...roleBase,
      ...userOverride,
      role: user.role,
      displayName: roleBase.displayName,
      description: roleBase.description,
    };

    // If granted personal access to edit report status, automatically guarantee access to reports tab
    if (combined.canEditReportStatus) {
      combined.canAccessReports = true;
    }

    return combined;
  }

  // Ensure Kresna and Sukmajaya have guaranteed operational permissions even without explicit override
  const userIdentifier = `${user.id || ''} ${user.username || ''} ${user.name || ''}`.toLowerCase();
  if (userIdentifier.includes('kresna') || userIdentifier.includes('sukmajaya')) {
    return {
      ...roleBase,
      canAccessDashboard: true,
      canAccessReports: true,
      canCreateReport: true,
      canEditReportStatus: true,
      canExportPdf: true,
      canSyncCloud: true,
    };
  }

  return roleBase;
}

export function resetPermissionsToDefault(): SystemPermissionsState {
  const defaultState: SystemPermissionsState = {
    roles: JSON.parse(JSON.stringify(DEFAULT_ROLE_PERMISSIONS)),
    userOverrides: {},
    updatedAt: new Date().toISOString(),
    updatedBy: 'Reset by Super Admin',
  };
  saveStoredPermissions(defaultState);
  syncPermissionsToFirestore(defaultState);
  return defaultState;
}
