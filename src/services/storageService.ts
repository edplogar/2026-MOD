import { ModReportItem, CloudSyncState, PictureItem } from '../types/index.ts';
import { parseCSVToReports, RAW_MOD_CSV, isDateOnOrAfterOctober2026 } from '../data/initialData';
import { getSystemSettings } from './systemSettingsService';
import { syncAllPhotosToDrive, extractDriveFolderId, getDriveFolderUrl } from './driveSyncService';
import { batchSyncReportsToFirestore, saveReportToFirestore, clearAllReportsFromFirestore, deleteReportFromFirestore } from './firebase';

const STORAGE_KEY = 'mod_report_logar_data_v2';
const SYNC_CONFIG_KEY = 'mod_report_logar_sync_config_v1';
const CLEARED_KEY = 'mod_report_logar_cleared_v1';
const DELETED_REPORT_IDS_KEY = 'mod_report_deleted_report_ids_v1';

// In-memory reports cache to ensure data integrity during session even if localStorage is full
let memoryReportsCache: ModReportItem[] | null = null;

export function getDeletedReportIds(): Set<string> {
  try {
    const raw = localStorage.getItem(DELETED_REPORT_IDS_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return new Set(arr);
    }
  } catch {
    // ignore
  }
  return new Set();
}

export function recordDeletedReportId(id: string): void {
  if (!id) return;
  try {
    const set = getDeletedReportIds();
    set.add(id);
    localStorage.setItem(DELETED_REPORT_IDS_KEY, JSON.stringify(Array.from(set)));
    if (memoryReportsCache !== null) {
      memoryReportsCache = memoryReportsCache.filter(r => r && r.id !== id);
    }
  } catch {
    // ignore
  }
}

export function recordDeletedReportIds(ids: string[]): void {
  if (!Array.isArray(ids) || ids.length === 0) return;
  try {
    const set = getDeletedReportIds();
    const idSet = new Set(ids);
    ids.forEach(id => { if (id) set.add(id); });
    localStorage.setItem(DELETED_REPORT_IDS_KEY, JSON.stringify(Array.from(set)));
    if (memoryReportsCache !== null) {
      memoryReportsCache = memoryReportsCache.filter(r => r && !idSet.has(r.id));
    }
  } catch {
    // ignore
  }
}

export function clearDeletedReportIds(): void {
  try {
    localStorage.removeItem(DELETED_REPORT_IDS_KEY);
  } catch {
    // ignore
  }
}

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
  const deletedIds = getDeletedReportIds();

  const getReportKey = (r: ModReportItem) => {
    if (r.id) return r.id;
    return `${r.date || ''}_${r.time || ''}_${r.location || ''}_${r.officerName || ''}`.replace(/\s+/g, '_');
  };

  if (Array.isArray(existing)) {
    existing.forEach(r => {
      if (r && r.id && !deletedIds.has(r.id)) {
        const key = getReportKey(r);
        map.set(key, r);
      }
    });
  }

  if (Array.isArray(incoming)) {
    incoming.forEach(r => {
      if (r && r.id && !deletedIds.has(r.id)) {
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

  const mergedList = Array.from(map.values()).filter(r => isDateOnOrAfterOctober2026(r.date) && isDateOnOrAfterOctober2026(r.timestamp) && !deletedIds.has(r.id));
  mergedList.sort((a, b) => parseReportTimestampMs(b) - parseReportTimestampMs(a));

  return mergedList;
}

export function loadReports(): ModReportItem[] {
  const deletedIds = getDeletedReportIds();
  if (memoryReportsCache !== null) {
    const validCached = memoryReportsCache.filter(r => r && !deletedIds.has(r.id) && isDateOnOrAfterOctober2026(r.date) && isDateOnOrAfterOctober2026(r.timestamp));
    memoryReportsCache = validCached;
    return validCached;
  }

  let loaded: ModReportItem[] = [];
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
        const valid = parsed.filter(Boolean);
        if (valid.length > 0) {
          loaded = valid;
        }
      }
    }
  } catch (e) {
    console.warn('Recovering reports from cache due to read error:', e);
  }

  if (loaded.length === 0) {
    loaded = parseCSVToReports(RAW_MOD_CSV);
  }

  // Strictly filter out deleted reports & reports dated prior to October 1, 2026
  loaded = loaded.filter(r => r && !deletedIds.has(r.id) && isDateOnOrAfterOctober2026(r.date) && isDateOnOrAfterOctober2026(r.timestamp));

  memoryReportsCache = loaded;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitizeReportsForStorage(loaded)));
  } catch {
    // ignore
  }
  return loaded;
}

export function saveReports(reports: ModReportItem[]): void {
  if (!Array.isArray(reports)) return;

  const deletedIds = getDeletedReportIds();
  const validReports = reports.filter(r => r && r.id && !deletedIds.has(r.id) && isDateOnOrAfterOctober2026(r.date) && isDateOnOrAfterOctober2026(r.timestamp));

  // Directly set memory cache to valid target reports to prevent resurrecting deleted items
  memoryReportsCache = validReports;

  const sanitized = sanitizeReportsForStorage(validReports);

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
  clearDeletedReportIds();
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

export function normalizeDateToISO(dateStr: string): string {
  if (!dateStr) return '';
  const clean = dateStr.trim().split(' ')[0];
  if (clean.includes('-')) {
    const parts = clean.split('-');
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
      } else {
        return `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
      }
    }
  } else if (clean.includes('/')) {
    const parts = clean.split('/');
    if (parts.length === 3) {
      const m = parts[0].padStart(2, '0');
      const d = parts[1].padStart(2, '0');
      const y = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
      return `${y}-${m}-${d}`;
    }
  }
  const dateObj = new Date(dateStr);
  if (!isNaN(dateObj.getTime())) {
    return dateObj.toISOString().split('T')[0];
  }
  return '';
}

export async function deleteReportsByDateRange(startDate: string, endDate: string): Promise<{ deletedCount: number; remainingCount: number }> {
  const all = loadReports();
  const start = startDate ? startDate.trim() : '1970-01-01';
  const end = endDate ? endDate.trim() : '2099-12-31';

  const toKeep: ModReportItem[] = [];
  const toDelete: ModReportItem[] = [];

  all.forEach(r => {
    const reportDateIso = normalizeDateToISO(r.date || r.timestamp || '');
    if (reportDateIso && reportDateIso >= start && reportDateIso <= end) {
      toDelete.push(r);
    } else {
      toKeep.push(r);
    }
  });

  if (toDelete.length === 0) {
    return { deletedCount: 0, remainingCount: all.length };
  }

  const deleteIds = toDelete.map(r => r.id);
  recordDeletedReportIds(deleteIds);

  // Update in-memory cache and localStorage
  memoryReportsCache = toKeep;
  saveReports(toKeep);

  // 1. Call server backend endpoint to remove deleted reports from database.json
  fetch('/api/reports/delete-by-date', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idsToDelete: deleteIds, startDate: start, endDate: end }),
  }).catch(err => {
    console.warn('Server delete by date deferred:', err);
  });

  // 2. Delete matching reports from Firestore
  for (const rep of toDelete) {
    deleteReportFromFirestore(rep.id).catch(err => {
      console.warn('Firestore delete report deferred:', err);
    });
  }

  // 3. Dispatch event to update app UI state
  window.dispatchEvent(new CustomEvent('logar_reports_updated', { detail: toKeep }));

  return { deletedCount: toDelete.length, remainingCount: toKeep.length };
}
