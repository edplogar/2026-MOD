import { UserProfile, ModReportItem, SystemSettings, SystemAuditLog } from '../types';
import { normalizeSystemSettings } from './systemSettingsService';
import { saveReports } from './storageService';
import { saveAllUsers, deduplicateUsers } from './authService';

const SYNC_VERSION_KEY = 'mod_report_client_sync_version_v1';
const ALL_USERS_STORAGE_KEY = 'mod_report_all_users_v3';
const STORAGE_KEY = 'mod_report_logar_data_v2';
const SETTINGS_STORAGE_KEY = 'mod_report_system_settings_v1';
const AUDIT_LOG_STORAGE_KEY = 'mod_report_system_audit_logs_v1';
const SUPER_ADMIN_KEY_STORAGE = 'mod_report_admin_master_key_v1';
const SUPER_ADMIN_PIN_STORAGE = 'mod_report_admin_pin_v1';

let currentClientVersion = 0;
try {
  const v = localStorage.getItem(SYNC_VERSION_KEY);
  if (v) currentClientVersion = parseInt(v, 10) || 0;
} catch {
  // ignore
}

let isSyncing = false;
let eventSource: EventSource | null = null;
let pollTimer: any = null;

export interface FullSyncPayload {
  version: number;
  updatedAt: string;
  users: UserProfile[];
  reports: ModReportItem[];
  settings: SystemSettings;
  auditLogs: SystemAuditLog[];
  masterCredentials?: {
    key: string;
    pin: string;
  };
}

/**
 * Applies received sync payload to localStorage and dispatches
 * real-time UI refresh events to all listening components.
 */
export function applyDatabaseSync(data: FullSyncPayload): void {
  try {
    currentClientVersion = data.version;
    localStorage.setItem(SYNC_VERSION_KEY, data.version.toString());

    if (Array.isArray(data.users)) {
      const cleanUsers = deduplicateUsers(data.users);
      saveAllUsers(cleanUsers);
      window.dispatchEvent(new CustomEvent('logar_users_updated', { detail: cleanUsers }));
    }

    if (Array.isArray(data.reports)) {
      saveReports(data.reports);
      window.dispatchEvent(new CustomEvent('logar_reports_updated', { detail: data.reports }));
    }

    if (data.settings) {
      const normalizedSettings = normalizeSystemSettings(data.settings);
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(normalizedSettings));
      window.dispatchEvent(new CustomEvent('logar_settings_updated', { detail: normalizedSettings }));
    }

    if (Array.isArray(data.auditLogs)) {
      localStorage.setItem(AUDIT_LOG_STORAGE_KEY, JSON.stringify(data.auditLogs));
      window.dispatchEvent(new CustomEvent('logar_audit_logs_updated', { detail: data.auditLogs }));
    }

    if (data.masterCredentials) {
      if (data.masterCredentials.key) {
        localStorage.setItem(SUPER_ADMIN_KEY_STORAGE, data.masterCredentials.key);
      }
      if (data.masterCredentials.pin) {
        localStorage.setItem(SUPER_ADMIN_PIN_STORAGE, data.masterCredentials.pin);
      }
    }

    window.dispatchEvent(new CustomEvent('logar_sync_completed', { 
      detail: { version: data.version, updatedAt: data.updatedAt } 
    }));
  } catch (err) {
    console.error('[LiveSync] Error applying synced data:', err);
  }
}

/**
 * Fetches full master state from server and updates local cache.
 */
export async function fetchFullDatabaseSync(): Promise<boolean> {
  if (isSyncing) return false;
  isSyncing = true;
  try {
    const res = await fetch('/api/sync', {
      headers: { 'Cache-Control': 'no-cache' },
    });

    if (!res.ok) {
      throw new Error(`Sync failed with status: ${res.status}`);
    }

    const data: FullSyncPayload = await res.json();
    if (data && typeof data.version === 'number') {
      applyDatabaseSync(data);
      return true;
    }
    return false;
  } catch (err) {
    console.warn('[LiveSync] Unable to fetch sync state from server (working offline):', err);
    return false;
  } finally {
    isSyncing = false;
  }
}

/**
 * Initializes real-time SSE stream and background polling.
 * Ensures any update made on one IP/device is immediately mirrored
 * to all other devices in under 2 seconds.
 */
export function startLiveDatabaseSync(): () => void {
  // 1. Initial fast catch-up sync
  fetchFullDatabaseSync();

  // 2. Connect to Server-Sent Events (SSE)
  const connectSSE = () => {
    if (typeof EventSource === 'undefined') return;
    try {
      if (eventSource) {
        eventSource.close();
      }
      eventSource = new EventSource('/api/sync/events');

      eventSource.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload && payload.version !== currentClientVersion) {
            // Version mismatch - fetch latest full state
            fetchFullDatabaseSync();
          }
        } catch {
          // ignore heartbeat / raw text
        }
      };

      eventSource.onerror = () => {
        // SSE reconnects automatically, but close if fatal
        if (eventSource && eventSource.readyState === EventSource.CLOSED) {
          eventSource.close();
          eventSource = null;
        }
      };
    } catch (e) {
      console.warn('[LiveSync] SSE initialization skipped:', e);
    }
  };

  connectSSE();

  // 3. Fallback heartbeat polling every 3.5 seconds
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = setInterval(async () => {
    try {
      const res = await fetch('/api/sync/status', {
        headers: { 'Cache-Control': 'no-cache' }
      });
      if (res.ok) {
        const status = await res.json();
        if (status && status.version && status.version !== currentClientVersion) {
          await fetchFullDatabaseSync();
        }
      }
    } catch {
      // Offline fallback
    }
  }, 3500);

  // Return teardown function
  return () => {
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  };
}
