import { SystemSettings, SystemAuditLog, HotelLocationConfig, HotelBrandingConfig } from '../types/index.ts';
import { HOTEL_LOCATIONS, HOTEL_DEPARTMENTS, RAW_MOD_CSV, parseCSVToReports } from '../data/initialData';
import { saveReports, saveSyncConfig } from './storageService';
import { saveAllUsers, INITIAL_HOTEL_USERS } from './authService';
import { extractDriveFolderId } from './driveSyncService';
import { saveSettingsToFirestore, addAuditLogToFirestore } from './firebase';

const SETTINGS_STORAGE_KEY = 'mod_report_system_settings_v1';
const AUDIT_LOG_STORAGE_KEY = 'mod_report_system_audit_logs_v1';

export const DEFAULT_BRANDING: HotelBrandingConfig = {
  logoUrl: '/logo-emblem.svg',
  logoShape: 'rounded',
  bgColor: '#16A34A',
  tagline: 'Experience the Green of the City',
  brandTitle: 'LOMBOK GARDEN HOTEL',
  brandSubtitle: 'MOD REPORT LOGAR',
  badgeText: 'MOD',
  customIconType: 'default_flower',
};

export function normalizeBranding(rawBranding?: any): HotelBrandingConfig {
  const merged: HotelBrandingConfig = {
    ...DEFAULT_BRANDING,
    ...(rawBranding || {}),
  };

  if (!merged.brandTitle || merged.brandTitle === 'LOMBOK GARDEN' || merged.brandTitle === 'MOD REPORT LOGAR') {
    merged.brandTitle = 'LOMBOK GARDEN HOTEL';
  }

  if (
    !merged.brandSubtitle ||
    merged.brandSubtitle === 'HOTEL • REPORT LOGAR' ||
    merged.brandSubtitle === 'Sistem Pelaporan & Monitoring Lapangan Manager on Duty'
  ) {
    merged.brandSubtitle = 'MOD REPORT LOGAR';
  }

  return merged;
}

export function normalizeSystemSettings(rawSettings?: any): SystemSettings {
  if (!rawSettings) return DEFAULT_SYSTEM_SETTINGS;
  return {
    ...DEFAULT_SYSTEM_SETTINGS,
    ...rawSettings,
    branding: normalizeBranding(rawSettings.branding),
  };
}

export const DEFAULT_SYSTEM_SETTINGS: SystemSettings = {
  hotelName: 'Hotel Lombok Garden',
  hotelAddress: 'Jl. Bung Karno No. 7, Mataram, Nusa Tenggara Barat 83127',
  hotelPhone: '(0370) 636015 / +62 811-390-001',
  hotelEmail: 'hotellombokgarden@gmail.com',
  branding: DEFAULT_BRANDING,
  driveFolderId: '1LG_MOD_DRIVE_FOLDER_2026',
  driveFolderName: 'HOTEL LOMBOK GARDEN / MOD REPORTS 2026',
  driveWebhookUrl: '',
  compressionQuality: 0.72,
  maxImageDimension: 1280,
  autoSyncEnabled: true,
  autoSyncIntervalMinutes: 5,
  sessionTimeoutMinutes: 60,
  shifts: {
    morning: { name: 'Shift Pagi', time: '07:00 - 15:00' },
    afternoon: { name: 'Shift Sore', time: '15:00 - 23:00' },
    night: { name: 'Shift Malam', time: '23:00 - 07:00' },
  },
  locations: HOTEL_LOCATIONS.map((loc, idx) => {
    let areaGroup = 'Public Area';
    const locLower = loc.toLowerCase();
    if (locLower.includes('deluxe') || locLower.includes('kamar') || locLower.includes('floor') || locLower.includes('lantai')) {
      areaGroup = 'Deluxe & Rooms';
    } else if (locLower.includes('resto') || locLower.includes('kitchen') || locLower.includes('pantry')) {
      areaGroup = 'F&B & Resto';
    } else if (locLower.includes('pool') || locLower.includes('kolam') || locLower.includes('garden')) {
      areaGroup = 'Pool & Garden';
    } else if (locLower.includes('parkir') || locLower.includes('lobby')) {
      areaGroup = 'Lobby & Parking';
    } else if (locLower.includes('melati') || locLower.includes('edelweis') || locLower.includes('hall')) {
      areaGroup = 'Meeting & Ballrooms';
    } else if (locLower.includes('genset') || locLower.includes('laundry') || locLower.includes('loker') || locLower.includes('gudang')) {
      areaGroup = 'Back of House';
    }
    return {
      id: `loc-${idx + 1}`,
      name: loc,
      areaGroup,
      isActive: true,
    };
  }),
  departments: [...HOTEL_DEPARTMENTS],
};

export function getSystemSettings(): SystemSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const normalized = normalizeSystemSettings(parsed);
      return normalized;
    }
  } catch (e) {
    console.error('Failed loading system settings', e);
  }
  saveSystemSettings(DEFAULT_SYSTEM_SETTINGS);
  return DEFAULT_SYSTEM_SETTINGS;
}

export function getHotelBranding(): HotelBrandingConfig {
  const settings = getSystemSettings();
  return settings.branding || DEFAULT_BRANDING;
}

export function updateHotelBranding(brandingUpdates: Partial<HotelBrandingConfig>, actor: string = 'Super Admin'): SystemSettings {
  const currentSettings = getSystemSettings();
  const currentBranding = currentSettings.branding || DEFAULT_BRANDING;
  
  const updatedBranding: HotelBrandingConfig = normalizeBranding({
    ...currentBranding,
    ...brandingUpdates,
    updatedAt: new Date().toISOString(),
    updatedBy: actor,
  });

  return updateSystemSettings({
    branding: updatedBranding,
    hotelName: updatedBranding.brandTitle ? `Hotel ${updatedBranding.brandTitle}` : currentSettings.hotelName,
  }, actor);
}

export function saveSystemSettings(settings: SystemSettings): void {
  try {
    const normalized = normalizeSystemSettings(settings);
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(normalized));
  } catch (e) {
    console.error('Failed saving system settings', e);
  }
}

export function updateSystemSettings(updates: Partial<SystemSettings>, actor: string = 'Super Admin'): SystemSettings {
  const current = getSystemSettings();
  
  // Normalize drive folder ID if updated
  const cleanUpdates = { ...updates };
  if (cleanUpdates.driveFolderId) {
    cleanUpdates.driveFolderId = extractDriveFolderId(cleanUpdates.driveFolderId);
  }

  const updated: SystemSettings = { ...current, ...cleanUpdates };
  saveSystemSettings(updated);

  // Sync with CloudSync configuration
  saveSyncConfig({
    driveFolderId: updated.driveFolderId,
    driveFolderName: updated.driveFolderName,
    driveWebhookUrl: updated.driveWebhookUrl,
    isAutoSyncEnabled: updated.autoSyncEnabled,
  });

  // Notify components across the application
  try {
    window.dispatchEvent(new CustomEvent('logar_settings_updated', { detail: updated }));
  } catch {
    // ignore in non-browser environments
  }

  addAuditLog(
    'SETTING_UPDATED',
    `Parameter sistem diperbarui: ${Object.keys(updates).join(', ')} (Folder Drive: ${updated.driveFolderName})`,
    'SETTING',
    actor
  );

  // Sync to Firestore in real-time across all devices & IPs
  saveSettingsToFirestore(updated).catch(err => {
    console.warn('Real-time sync to Firestore deferred:', err);
  });

  return updated;
}

export function setSettingsFromCloud(cloudSettings: SystemSettings): void {
  if (!cloudSettings) return;
  const normalized = normalizeSystemSettings(cloudSettings);
  saveSystemSettings(normalized);
  saveSyncConfig({
    driveFolderId: normalized.driveFolderId,
    driveFolderName: normalized.driveFolderName,
    driveWebhookUrl: normalized.driveWebhookUrl,
    isAutoSyncEnabled: normalized.autoSyncEnabled,
  });

  try {
    window.dispatchEvent(new CustomEvent('logar_settings_updated', { detail: normalized }));
  } catch {
    // ignore
  }
}

// Audit Logs Management
export function getAuditLogs(): SystemAuditLog[] {
  try {
    const raw = localStorage.getItem(AUDIT_LOG_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error('Failed loading audit logs', e);
  }
  return [
    {
      id: 'log-init-1',
      timestamp: new Date().toISOString(),
      actor: 'System Initialization',
      action: 'SYSTEM_BOOT',
      details: 'Sistem MOD REPORT LOGAR diinisialisasi dengan master data Hotel Lombok Garden',
      category: 'SECURITY',
    }
  ];
}

export function addAuditLog(
  action: string,
  details: string,
  category: 'USER' | 'SETTING' | 'DATA' | 'SECURITY',
  actor: string = 'Super Admin'
): void {
  try {
    const logs = getAuditLogs();
    const newLog: SystemAuditLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      actor,
      action,
      details,
      category,
    };
    const updated = [newLog, ...logs].slice(0, 150); // keep recent 150
    localStorage.setItem(AUDIT_LOG_STORAGE_KEY, JSON.stringify(updated));

    // Real-time Firestore sync
    addAuditLogToFirestore(newLog).catch(err => {
      console.warn('Real-time audit log sync deferred:', err);
    });
  } catch (e) {
    console.error('Failed writing audit log', e);
  }
}

export function clearAuditLogs(): void {
  localStorage.removeItem(AUDIT_LOG_STORAGE_KEY);
}

// Full System Backup and Factory Reset
export function exportSystemBackupJson(): string {
  const settings = getSystemSettings();
  const reportsRaw = localStorage.getItem('mod_report_logar_data_v2') || '[]';
  const usersRaw = localStorage.getItem('mod_report_all_users_v2') || '[]';
  const logs = getAuditLogs();

  const backupPacket = {
    app: 'MOD REPORT LOGAR',
    version: '2.6-enterprise',
    exportedAt: new Date().toISOString(),
    settings,
    users: JSON.parse(usersRaw),
    reports: JSON.parse(reportsRaw),
    auditLogs: logs,
  };

  return JSON.stringify(backupPacket, null, 2);
}

export function restoreSystemFromBackup(jsonString: string, actor: string = 'Super Admin'): { success: boolean; message: string } {
  try {
    const packet = JSON.parse(jsonString);
    if (!packet.settings || !Array.isArray(packet.reports)) {
      return { success: false, message: 'Format file cadangan tidak valid atau rusak.' };
    }

    if (packet.settings) saveSystemSettings(packet.settings);
    if (packet.users) saveAllUsers(packet.users);
    if (packet.reports) saveReports(packet.reports);

    addAuditLog('SYSTEM_RESTORE', `Memulihkan sistem dari file cadangan (${packet.reports.length} laporan, ${packet.users?.length || 0} pengguna)`, 'DATA', actor);

    return { success: true, message: `Berhasil memulihkan ${packet.reports.length} laporan dan ${packet.users?.length || 0} pengguna.` };
  } catch (e: any) {
    return { success: false, message: 'Gagal memproses file cadangan: ' + e.message };
  }
}

export function factoryResetSystem(actor: string = 'Super Admin'): void {
  saveReports([]);
  saveAllUsers(INITIAL_HOTEL_USERS);
  saveSystemSettings(DEFAULT_SYSTEM_SETTINGS);
  addAuditLog('FACTORY_RESET', 'Sistem dibersihkan ke kondisi awal Hotel Lombok Garden', 'DATA', actor);
}
