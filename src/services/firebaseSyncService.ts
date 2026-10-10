import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  getDocs, 
  writeBatch 
} from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile, ModReportItem, SystemSettings, SystemAuditLog } from '../types';
import { INITIAL_HOTEL_USERS } from './authService';
import { loadReports } from './storageService';
import { getSystemSettings, getAuditLogs } from './systemSettingsService';

const USERS_COL = 'users';
const REPORTS_COL = 'reports';
const SYSTEM_COL = 'system';

let isListening = false;
let unsubscribeUsers: (() => void) | null = null;
let unsubscribeReports: (() => void) | null = null;
let unsubscribeSettings: (() => void) | null = null;

/**
 * Initializes real-time two-way synchronization with Firestore across all devices and IPs.
 */
export function startFirebaseLiveSync(): () => void {
  if (isListening) return stopFirebaseLiveSync;
  isListening = true;

  console.info('[FirebaseSync] Starting real-time Firestore listeners...');

  // 1. Listen to Users Collection in real time
  try {
    const usersRef = collection(db, USERS_COL);
    unsubscribeUsers = onSnapshot(usersRef, (snapshot) => {
      if (snapshot.empty) {
        // Bootstrap initial users if Firestore has none
        bootstrapFirestoreUsers();
        return;
      }

      const remoteUsers: UserProfile[] = [];
      snapshot.forEach((d) => {
        remoteUsers.push(d.data() as UserProfile);
      });

      if (remoteUsers.length > 0) {
        try {
          localStorage.setItem('mod_report_all_users_v2', JSON.stringify(remoteUsers));
          window.dispatchEvent(new CustomEvent('logar_users_updated', { detail: remoteUsers }));
        } catch (e) {
          console.error('[FirebaseSync] Error caching remote users:', e);
        }
      }
    }, (error) => {
      console.warn('[FirebaseSync] Users listener error:', error);
    });
  } catch (e) {
    console.warn('[FirebaseSync] Failed initializing users listener:', e);
  }

  // 2. Listen to Reports Collection in real time
  try {
    const reportsRef = collection(db, REPORTS_COL);
    unsubscribeReports = onSnapshot(reportsRef, (snapshot) => {
      if (snapshot.empty) {
        // Bootstrap initial reports if Firestore has none
        bootstrapFirestoreReports();
        return;
      }

      const remoteReports: ModReportItem[] = [];
      snapshot.forEach((d) => {
        remoteReports.push(d.data() as ModReportItem);
      });

      if (remoteReports.length > 0) {
        try {
          // Sort reports descending by date/time
          remoteReports.sort((a, b) => new Date(`${b.date}T${b.time || '00:00'}`).getTime() - new Date(`${a.date}T${a.time || '00:00'}`).getTime());
          localStorage.setItem('mod_report_logar_data_v2', JSON.stringify(remoteReports));
          window.dispatchEvent(new CustomEvent('logar_reports_updated', { detail: remoteReports }));
        } catch (e) {
          console.error('[FirebaseSync] Error caching remote reports:', e);
        }
      }
    }, (error) => {
      console.warn('[FirebaseSync] Reports listener error:', error);
    });
  } catch (e) {
    console.warn('[FirebaseSync] Failed initializing reports listener:', e);
  }

  // 3. Listen to System settings and master credentials
  try {
    const systemDocRef = doc(db, SYSTEM_COL, 'settings');
    unsubscribeSettings = onSnapshot(systemDocRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data && data.settings) {
          localStorage.setItem('mod_report_system_settings_v1', JSON.stringify(data.settings));
          window.dispatchEvent(new CustomEvent('logar_settings_updated', { detail: data.settings }));
        }
        if (data && data.masterCredentials) {
          localStorage.setItem('mod_report_super_admin_key_v1', data.masterCredentials.key);
          localStorage.setItem('mod_report_super_admin_pin_v1', data.masterCredentials.pin);
        }
      }
    }, (error) => {
      console.warn('[FirebaseSync] Settings listener error:', error);
    });
  } catch (e) {
    console.warn('[FirebaseSync] Failed initializing settings listener:', e);
  }

  return stopFirebaseLiveSync;
}

export function stopFirebaseLiveSync(): void {
  if (unsubscribeUsers) {
    unsubscribeUsers();
    unsubscribeUsers = null;
  }
  if (unsubscribeReports) {
    unsubscribeReports();
    unsubscribeReports = null;
  }
  if (unsubscribeSettings) {
    unsubscribeSettings();
    unsubscribeSettings = null;
  }
  isListening = false;
  console.info('[FirebaseSync] Stopped real-time listeners.');
}

/**
 * Push user creation or update to Firestore
 */
export async function pushUserToFirestore(user: UserProfile): Promise<void> {
  try {
    const userRef = doc(db, USERS_COL, user.id);
    await setDoc(userRef, user, { merge: true });
  } catch (err) {
    console.warn('[FirebaseSync] Push user to Firestore failed:', err);
  }
}

/**
 * Delete user from Firestore
 */
export async function deleteUserFromFirestore(userId: string): Promise<void> {
  try {
    const userRef = doc(db, USERS_COL, userId);
    await deleteDoc(userRef);
  } catch (err) {
    console.warn('[FirebaseSync] Delete user from Firestore failed:', err);
  }
}

/**
 * Push report to Firestore
 */
export async function pushReportToFirestore(report: ModReportItem): Promise<void> {
  try {
    const reportRef = doc(db, REPORTS_COL, report.id);
    await setDoc(reportRef, report, { merge: true });
  } catch (err) {
    console.warn('[FirebaseSync] Push report to Firestore failed:', err);
  }
}

/**
 * Delete report from Firestore
 */
export async function deleteReportFromFirestore(reportId: string): Promise<void> {
  try {
    const reportRef = doc(db, REPORTS_COL, reportId);
    await deleteDoc(reportRef);
  } catch (err) {
    console.warn('[FirebaseSync] Delete report from Firestore failed:', err);
  }
}

/**
 * Push system settings and master credentials to Firestore
 */
export async function pushSettingsToFirestore(
  settings: SystemSettings, 
  masterCredentials?: { key: string; pin: string }
): Promise<void> {
  try {
    const settingRef = doc(db, SYSTEM_COL, 'settings');
    const payload: any = {
      settings,
      updatedAt: new Date().toISOString()
    };
    if (masterCredentials) {
      payload.masterCredentials = masterCredentials;
    }
    await setDoc(settingRef, payload, { merge: true });
  } catch (err) {
    console.warn('[FirebaseSync] Push settings to Firestore failed:', err);
  }
}

/**
 * Push master credentials specifically to Firestore
 */
export async function pushMasterCredentialsToFirestore(key: string, pin: string): Promise<void> {
  try {
    const settingRef = doc(db, SYSTEM_COL, 'settings');
    await setDoc(settingRef, {
      masterCredentials: { key, pin },
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (err) {
    console.warn('[FirebaseSync] Push master credentials to Firestore failed:', err);
  }
}

/**
 * Bootstrap Firestore with initial users if collection is empty
 */
async function bootstrapFirestoreUsers(): Promise<void> {
  try {
    const batch = writeBatch(db);
    const usersToSave = INITIAL_HOTEL_USERS;
    usersToSave.forEach(u => {
      const ref = doc(db, USERS_COL, u.id);
      batch.set(ref, u);
    });
    await batch.commit();
    console.info(`[FirebaseSync] Bootstrapped ${usersToSave.length} hotel users to Firestore.`);
  } catch (err) {
    console.warn('[FirebaseSync] User bootstrap failed:', err);
  }
}

/**
 * Bootstrap Firestore with initial reports if collection is empty
 */
async function bootstrapFirestoreReports(): Promise<void> {
  try {
    const reports = loadReports();
    // Batch in chunks of 100 docs
    const chunkSize = 100;
    for (let i = 0; i < reports.length; i += chunkSize) {
      const chunk = reports.slice(i, i + chunkSize);
      const batch = writeBatch(db);
      chunk.forEach(r => {
        const ref = doc(db, REPORTS_COL, r.id);
        batch.set(ref, r);
      });
      await batch.commit();
    }
    console.info(`[FirebaseSync] Bootstrapped ${reports.length} MOD reports to Firestore.`);
  } catch (err) {
    console.warn('[FirebaseSync] Reports bootstrap failed:', err);
  }
}
