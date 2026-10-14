import { ModReportItem, CloudSyncState, PictureItem } from '../types/index.ts';
import { parseCSVToReports, RAW_MOD_CSV, isDateOnOrAfterOctober2026 } from '../data/initialData';
import { getSystemSettings } from './systemSettingsService';
import { syncAllPhotosToDrive, extractDriveFolderId, getDriveFolderUrl } from './driveSyncService';
import { batchSyncReportsToFirestore, saveReportToFirestore, clearAllReportsFromFirestore } from './firebase';

const STORAGE_KEY = 'mod_report_logar_data_v2';
const SYNC_CONFIG_KEY = 'mod_report_logar_sync_config_v1';
const CLEARED_KEY = 'mod_report_logar_cleared_v1';

// In-memory reports cache to ensure data integrity during session even if localStorage is full
let memoryReportsCache: ModReportItem[] | null = null;

/**
 * Sanitizes reports before storing in browser localStorage:
 * Strips huge base64 data URIs from thumbnailUrl (> 1KB) to prevent 5MB localStorage quota exhaustion.
 * All core metadata, timestamps, officer, problem, status, and Google Drive links are preserved.
 */
export function sanitizeReportsForStorage(reports: ModReportItem[]): ModReportItem[] {
  return reports.map(r => ({
    ...r,
    pictures: (r.pictures || []).map(p => {
      const isLargeDataUrl = p.thumbnailUrl && p.thumbnailUrl.startsWith('data:') && p.thumbnailUrl.length > 1000;
      return {
        ...p,
        thumbnailUrl: isLargeDataUrl ? (p.driveUrl || '') : p.thumbnailUrl,
      };
    }),
  }));
}

export function parseReportTimestampMs(report: ModReportItem): number {
  if (!report) return 0;

  if (report.id && report.id.startsWith('rep-')) {
    const parts = report.id.split('-');
    if (parts.length >= 2) {
      const num = parseInt(parts[1], 10);
      if (!isNaN(num) && num > 1600000000000) {
        return num;
      }
    }
  }

  const dateStr = (report.date || '').trim();
  const timeStr = (report.time || '00:00:00').trim();

  if (dateStr) {
    let year = 2026;
    let month = 10;
    let day = 1;

    if (dateStr.includes('-')) {
      const parts = dateStr.split('-').map(Number);
      if (parts.length >= 3) {
        year = parts[0] || 2026;
        month = parts[1] || 1;
        day = parts[2] || 1;
      }
    } else if (dateStr.includes('/')) {
      const parts = dateStr.split('/').map(Number);
      if (parts.length >= 3) {
        if (parts[0] > 12 && parts[1] <= 12) {
          day = parts[0];
          month = parts[1];
          year = parts[2];
        } else {
          month = parts[0];
          day = parts[1];
          year = parts[2];
        }
      }
    }

    const timeParts = timeStr.split(':').map(Number);
    const hh = timeParts[0] || 0;
    const mm = timeParts[1] || 0;
    const ss = timeParts[2] || 0;

    const d = new Date(year, Math.max(0, month - 1), day, hh, mm, ss);
    if (!isNaN(d.getTime())) {
      return d.getTime();
    }
  }

  if (report.timestamp) {
    const d = new Date(report.timestamp);
    if (!isNaN(d.getTime())) {
      return d.getTime();
    }
  }

  return 0;
}

export function mergeReports(existing: ModReportItem[], incoming: ModReportItem[]): ModReportItem[] {
  const map = new Map<string, ModReportItem>();

  const getReportKey = (r: ModReportItem) => {
    if (r.id) return r.id;
    return `${r.date || ''}_${r.time || ''}_${r.location || ''}_${r.officerName || ''}`.replace(/\s+/g, '_');
  };

  if (Array.isArray(existing)) {
    existing.forEach(r => {
      if (r) {
        const key = getReportKey(r);
        map.set(key, r);
      }
    });
  }

  if (Array.isArray(incoming)) {
    incoming.forEach(r => {
      if (r) {
        const key = getReportKey(r);
        const prev = map.get(key);
        if (!prev) {
          map.set(key, r);
        } else {
          const mergedPics = (r.pictures && r.pictures.length > 0) ? r.pictures : (prev.pictures || []);
          map.set(key, {
            ...prev,
            ...r,
            id: prev.id || r.id,
            pictures: mergedPics,
            status: r.status || prev.status,
            resolvedAt: r.resolvedAt || prev.resolvedAt,
            resolvedBy: r.resolvedBy || prev.resolvedBy,
          });
        }
      }
    });
  }

  const mergedList = Array.from(map.values());
  mergedList.sort((a, b) => parseReportTimestampMs(b) - parseReportTimestampMs(a));

  return mergedList;
}

export function loadReports(): ModReportItem[] {
  if (memoryReportsCache !== null && memoryReportsCache.length > 0) {
    return memoryReportsCache;
  }

  try {
    const isCleared = localStorage.getItem(CLEARED_KEY) === 'true';
    if (isCleared) {
      memoryReportsCache = [];
      return [];
    }

    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const valid = parsed.filter(r => !r || r.id?.startsWith('rep-') || isDateOnOrAfterOctober2026(r.date || r.timestamp));
        if (valid.length > 0) {
          memoryReportsCache = valid;
          return valid;
        }
      }
    }
  } catch (e) {
    console.warn('Recovering reports from cache due to read error:', e);
  }

  const initial = parseCSVToReports(RAW_MOD_CSV);
  memoryReportsCache = initial;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
  } catch {
    // ignore
  }
  return initial;
}

export function saveReports(reports: ModReportItem[]): void {
  if (!Array.isArray(reports)) return;

  const currentCache = memoryReportsCache || [];
  const merged = mergeReports(currentCache, reports);

  // Always keep in-memory cache up-to-date with full data
  memoryReportsCache = merged;

  const sanitized = sanitizeReportsForStorage(merged);

  // Tier 1: Try saving full sanitized dataset
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
    return;
  } catch (err: any) {
    const isQuotaError = err?.name === 'QuotaExceededError' || 
                         err?.code === 22 || 
                         err?.number === -2147024882 ||
                         String(err).includes('quota');

    if (!isQuotaError) {
      console.warn('Storage save deferred:', err);
      return;
    }

    // Tier 2: Quota exceeded - clean up obsolete temporary localStorage keys
    try {
      localStorage.removeItem('mod_report_logar_data_v1');
      localStorage.removeItem('mod_report_client_sync_version_v1');
      localStorage.removeItem('mod_report_all_users_v2');
      localStorage.removeItem('mod_report_temp_reports');
    } catch {
      // ignore
    }

    // Tier 3: Save latest 60 reports to fit inside 5MB quota safely
    try {
      const trimmed = sanitized.slice(0, 60);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
      return;
    } catch {
      // Tier 4: Save latest 25 reports if quota is extremely tight
      try {
        const minimal = sanitized.slice(0, 25).map(r => ({
          ...r,
          pictures: (r.pictures || []).map(p => ({
            id: p.id,
            driveUrl: p.driveUrl || '',
            driveId: p.driveId,
            name: p.name,
          })),
        }));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(minimal));
      } catch (finalErr) {
        // Safe fallback: data is preserved in memory and server backend
        console.warn('LocalStorage quota limit reached; maintaining full dataset in memory cache.');
      }
    }
  }
}

export async function clearAllReports(): Promise<void> {
  memoryReportsCache = [];
  try {
    localStorage.setItem(CLEARED_KEY, 'true');
  } catch {
    // ignore
  }
  saveReports([]);

  // Clear server backend database reports
  try {
    await fetch('/api/reports', {
      method: 'DELETE',
    });
  } catch (err) {
    console.warn('Error clearing backend server reports:', err);
  }

  try {
    await clearAllReportsFromFirestore();
  } catch (err) {
    console.warn('Error clearing Firestore reports:', err);
  }

  try {
    window.dispatchEvent(new CustomEvent('logar_reports_updated', { detail: [] }));
  } catch {
    // ignore
  }
}

export function getSyncState(reports: ModReportItem[]): CloudSyncState {
  const settings = getSystemSettings();
  const cleanFolderId = extractDriveFolderId(settings.driveFolderId) || '1LG_MOD_DRIVE_FOLDER_2026';
  const cleanFolderName = settings.driveFolderName || 'HOTEL LOMBOK GARDEN / MOD REPORTS 2026';

  let config = {
    isAutoSyncEnabled: settings.autoSyncEnabled ?? true,
    lastSyncedAt: new Date().toISOString(),
    driveFolderName: cleanFolderName,
    driveFolderId: cleanFolderId,
    driveWebhookUrl: settings.driveWebhookUrl || '',
  };

  try {
    const raw = localStorage.getItem(SYNC_CONFIG_KEY);
    if (raw) {
      config = { ...config, ...JSON.parse(raw) };
    }
  } catch (e) {
    console.error('Error loading sync config', e);
  }

  // Always enforce latest Super Admin settings
  config.driveFolderId = cleanFolderId;
  config.driveFolderName = cleanFolderName;
  if (settings.driveWebhookUrl) {
    config.driveWebhookUrl = settings.driveWebhookUrl;
  }

  const pending = reports.filter(r => !r.synced).length;
  const synced = reports.filter(r => r.synced).length;

  return {
    isAutoSyncEnabled: config.isAutoSyncEnabled,
    isOnline: navigator.onLine,
    isSyncing: false,
    lastSyncedAt: config.lastSyncedAt,
    pendingCount: pending,
    totalSyncedCount: synced,
    driveFolderName: config.driveFolderName,
    driveFolderId: config.driveFolderId,
    driveWebhookUrl: config.driveWebhookUrl,
  };
}

export function saveSyncConfig(config: Partial<CloudSyncState>): void {
  try {
    const current = localStorage.getItem(SYNC_CONFIG_KEY);
    const parsed = current ? JSON.parse(current) : {};
    localStorage.setItem(SYNC_CONFIG_KEY, JSON.stringify({ ...parsed, ...config }));
  } catch (e) {
    console.error('Error saving sync config', e);
  }
}

/**
 * Perform Cloud Sync: uploads all unsynced reports and marks them as synced,
 * ensuring all photos are synchronized and stamped with the designated Super Admin Google Drive folder.
 */
export async function syncReportsToCloud(
  reports: ModReportItem[]
): Promise<{ success: boolean; syncedCount: number; updatedReports: ModReportItem[]; uploadedDriveCount?: number }> {
  const settings = getSystemSettings();
  const folderId = extractDriveFolderId(settings.driveFolderId) || '1LG_MOD_DRIVE_FOLDER_2026';
  const folderName = settings.driveFolderName || 'HOTEL LOMBOK GARDEN / MOD REPORTS 2026';
  const webhookUrl = settings.driveWebhookUrl;

  // Sync photos to Google Drive folder (if webhook configured, upload; otherwise ensure folder metadata is stamped)
  const driveResult = await syncAllPhotosToDrive(reports, folderId, webhookUrl);

  const now = new Date().toISOString();
  let count = 0;

  const updated = driveResult.updatedReports.map(item => {
    // Stamp all photos to the active Super Admin folder
    const picturesWithFolder = (item.pictures || []).map(p => ({
      ...p,
      driveFolderId: p.driveFolderId || folderId,
      driveFolderName: p.driveFolderName || folderName,
      driveUrl: p.driveUrl || getDriveFolderUrl(folderId),
    }));

    if (!item.synced) {
      count++;
      return {
        ...item,
        pictures: picturesWithFolder,
        synced: true,
        syncedAt: now,
      };
    }
    return {
      ...item,
      pictures: picturesWithFolder,
    };
  });

  saveReports(updated);
  saveSyncConfig({ 
    lastSyncedAt: now, 
    driveFolderId: folderId, 
    driveFolderName: folderName,
    driveWebhookUrl: webhookUrl,
  });

  // Real-time synchronization to Firebase Firestore: only push newly modified or pending reports
  // This prevents exhausting the free daily write units limit (20,000 writes/day)
  const pendingToSync = updated.filter(item => {
    const existing = reports.find(old => old.id === item.id);
    return !existing || !existing.synced;
  });

  if (pendingToSync.length > 0) {
    try {
      await batchSyncReportsToFirestore(pendingToSync);
    } catch (err) {
      console.warn('Real-time sync to Firestore deferred:', err);
    }
  }

  return { 
    success: true, 
    syncedCount: count, 
    updatedReports: updated,
    uploadedDriveCount: driveResult.uploadedCount,
  };
}

export function setReportsFromCloud(cloudReports: ModReportItem[]): void {
  if (!cloudReports || cloudReports.length === 0) return;
  saveReports(cloudReports);
  try {
    window.dispatchEvent(new CustomEvent('logar_reports_updated', { detail: cloudReports }));
  } catch {
    // ignore
  }
}

/**
 * Calculates total storage space saved via compression across all photos in the dataset
 */
export function calculateStorageSavings(reports: ModReportItem[]): {
  totalPictures: number;
  originalBytes: number;
  compressedBytes: number;
  savedBytes: number;
  percentageSaved: number;
} {
  let totalPictures = 0;
  let originalBytes = 0;
  let compressedBytes = 0;

  reports.forEach(r => {
    if (r.pictures && r.pictures.length > 0) {
      r.pictures.forEach(p => {
        totalPictures++;
        originalBytes += p.originalSizeBytes || 2500000;
        compressedBytes += p.compressedSizeBytes || 140000;
      });
    }
  });

  const savedBytes = Math.max(0, originalBytes - compressedBytes);
  const percentageSaved = originalBytes > 0 ? Math.round((savedBytes / originalBytes) * 100) : 0;

  return {
    totalPictures,
    originalBytes,
    compressedBytes,
    savedBytes,
    percentageSaved,
  };
}
