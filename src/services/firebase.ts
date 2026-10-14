import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  collection, 
  setDoc, 
  getDoc, 
  getDocs, 
  deleteDoc, 
  onSnapshot, 
  writeBatch,
  getDocFromServer
} from 'firebase/firestore';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  signInAnonymously
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { ModReportItem, UserProfile, SystemSettings, SystemAuditLog } from '../types/index.ts';

// Initialize Firebase App
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// CRITICAL: Initialize Firestore with database ID from config
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Operation Types & Error Handling as mandated by Firebase Integration Skill
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

let firestoreQuotaExceededState = false;

export function isQuotaExceededError(error: unknown): boolean {
  if (!error) return false;
  const msg = error instanceof Error ? error.message : String(error);
  return (
    msg.includes('resource-exhausted') ||
    msg.includes('quota metric') ||
    msg.includes('Quota exceeded') ||
    msg.includes('Quota limit exceeded') ||
    msg.includes('Free daily write units')
  );
}

export function isFirestoreQuotaExceeded(): boolean {
  return firestoreQuotaExceededState;
}

export function setFirestoreQuotaExceeded(exceeded: boolean): void {
  if (firestoreQuotaExceededState === exceeded) return;
  firestoreQuotaExceededState = exceeded;
  if (exceeded) {
    console.warn(
      '[Firestore Spark Quota] Free daily write limit reached (20,000 writes/day). Seamlessly maintaining data in local & backend server storage. Quota will automatically reset tomorrow.'
    );
    try {
      window.dispatchEvent(new CustomEvent('logar_firestore_quota_exceeded', { detail: true }));
    } catch {
      // ignore
    }
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  if (isQuotaExceededError(error)) {
    setFirestoreQuotaExceeded(true);
    console.warn(`[Firestore Quota] Operation ${operationType} on path "${path}" deferred due to daily quota.`);
    return;
  }

  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Recursively strips undefined values from objects and arrays so Firestore setDoc/updateDoc never fails.
 * Firestore strictly rejects undefined field values.
 */
export function sanitizeForFirestore<T>(data: T): T {
  if (data === null || data === undefined) {
    return data;
  }
  if (Array.isArray(data)) {
    return data
      .filter((item) => item !== undefined)
      .map((item) => sanitizeForFirestore(item)) as unknown as T;
  }
  if (typeof data === 'object') {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        cleaned[key] = sanitizeForFirestore(value);
      }
    }
    return cleaned as T;
  }
  return data;
}

// Connection test as required by Firebase skill
export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client is offline, using offline persistence cache.');
      return false;
    }
    return false;
  }
}

// Run connection test on init
testConnection();

// Try quiet auth init: if unauthenticated, attempt anonymous if supported, or wait for user/google sign-in
export async function initFirebaseAuth(): Promise<FirebaseUser | null> {
  if (auth.currentUser) return auth.currentUser;
  try {
    const cred = await signInAnonymously(auth);
    return cred.user;
  } catch {
    // Anonymous sign-in may not be enabled by default in ProvisionFirebase, which is expected
    return null;
  }
}

// Google Sign-In with Popup
export async function signInWithGoogleAccount(): Promise<FirebaseUser> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error('Error signing in with Google:', error);
    throw error;
  }
}

export async function signOutFirebaseUser(): Promise<void> {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Error signing out:', error);
  }
}

// -------------------------------------------------------------
// REAL-TIME FIRESTORE SYNCHRONIZATION SERVICES
// -------------------------------------------------------------

/**
 * Real-time listener for Reports collection
 */
export function subscribeToFirestoreReports(
  onUpdate: (reports: ModReportItem[]) => void,
  onError?: (err: any) => void
): () => void {
  const path = 'reports';
  const reportsCol = collection(db, path);
  
  return onSnapshot(
    reportsCol,
    (snapshot) => {
      const items: ModReportItem[] = [];
      snapshot.forEach((d) => {
        const data = d.data() as ModReportItem;
        items.push({ ...data, id: d.id });
      });
      // Sort newest first by date and time
      items.sort((a, b) => {
        const dtA = `${a.date} ${a.time}`;
        const dtB = `${b.date} ${b.time}`;
        return dtB.localeCompare(dtA);
      });
      onUpdate(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
      if (onError) onError(error);
    }
  );
}

/**
 * Upsert a single report in Firestore
 */
export async function saveReportToFirestore(report: ModReportItem): Promise<void> {
  if (firestoreQuotaExceededState) return;
  const path = `reports/${report.id}`;
  try {
    const cleanedReport = sanitizeForFirestore({
      ...report,
      synced: true,
      syncedAt: new Date().toISOString(),
    });
    await setDoc(doc(db, 'reports', report.id), cleanedReport);
  } catch (error) {
    if (isQuotaExceededError(error)) {
      setFirestoreQuotaExceeded(true);
      return;
    }
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Batch upload reports to Firestore (used on initial seed or cloud sync)
 */
export async function batchSyncReportsToFirestore(reports: ModReportItem[]): Promise<number> {
  if (!reports || reports.length === 0 || firestoreQuotaExceededState) return 0;
  const path = 'reports';
  try {
    const batch = writeBatch(db);
    let count = 0;
    const now = new Date().toISOString();

    for (const report of reports) {
      const ref = doc(db, 'reports', report.id);
      const cleanedReport = sanitizeForFirestore({
        ...report,
        synced: true,
        syncedAt: now,
      });
      batch.set(ref, cleanedReport);
      count++;
    }

    await batch.commit();
    return count;
  } catch (error) {
    if (isQuotaExceededError(error)) {
      setFirestoreQuotaExceeded(true);
      return 0;
    }
    handleFirestoreError(error, OperationType.WRITE, path);
    return 0;
  }
}

/**
 * Delete a report from Firestore
 */
export async function deleteReportFromFirestore(reportId: string): Promise<void> {
  if (firestoreQuotaExceededState) return;
  const path = `reports/${reportId}`;
  try {
    await deleteDoc(doc(db, 'reports', reportId));
  } catch (error) {
    if (isQuotaExceededError(error)) {
      setFirestoreQuotaExceeded(true);
      return;
    }
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Clear all reports from Firestore
 */
export async function clearAllReportsFromFirestore(): Promise<number> {
  if (firestoreQuotaExceededState) return 0;
  const path = 'reports';
  try {
    const snap = await getDocs(collection(db, path));
    if (snap.empty) return 0;
    const batch = writeBatch(db);
    let count = 0;
    snap.docs.forEach((docSnap) => {
      batch.delete(docSnap.ref);
      count++;
    });
    await batch.commit();
    return count;
  } catch (error) {
    if (isQuotaExceededError(error)) {
      setFirestoreQuotaExceeded(true);
      return 0;
    }
    handleFirestoreError(error, OperationType.DELETE, path);
    return 0;
  }
}

/**
 * Real-time listener for Users and Permissions collection
 */
export function subscribeToFirestoreUsers(
  onUpdate: (users: UserProfile[]) => void,
  onError?: (err: any) => void
): () => void {
  const path = 'users';
  const usersCol = collection(db, path);

  return onSnapshot(
    usersCol,
    (snapshot) => {
      const items: UserProfile[] = [];
      snapshot.forEach((d) => {
        const data = d.data() as UserProfile;
        items.push({ ...data, id: d.id });
      });
      if (items.length > 0) {
        onUpdate(items);
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
      if (onError) onError(error);
    }
  );
}

/**
 * Upsert a user in Firestore
 */
export async function saveUserToFirestore(user: UserProfile): Promise<void> {
  if (firestoreQuotaExceededState) return;
  const path = `users/${user.id}`;
  try {
    await setDoc(doc(db, 'users', user.id), sanitizeForFirestore(user));
  } catch (error) {
    if (isQuotaExceededError(error)) {
      setFirestoreQuotaExceeded(true);
      return;
    }
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Batch seed initial users to Firestore if collection is empty
 */
export async function seedUsersToFirestore(users: UserProfile[]): Promise<void> {
  if (firestoreQuotaExceededState) return;
  const path = 'users';
  try {
    const snap = await getDocs(collection(db, path));
    if (snap.empty) {
      const batch = writeBatch(db);
      users.forEach((u) => {
        batch.set(doc(db, 'users', u.id), sanitizeForFirestore(u));
      });
      await batch.commit();
    }
  } catch (error) {
    if (isQuotaExceededError(error)) {
      setFirestoreQuotaExceeded(true);
      return;
    }
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Delete a user from Firestore
 */
export async function deleteUserFromFirestore(userId: string): Promise<void> {
  if (firestoreQuotaExceededState) return;
  const path = `users/${userId}`;
  try {
    await deleteDoc(doc(db, 'users', userId));
  } catch (error) {
    if (isQuotaExceededError(error)) {
      setFirestoreQuotaExceeded(true);
      return;
    }
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Batch clean and synchronize deduplicated users to Firestore.
 * Removes obsolete duplicate documents and guarantees single consistent records.
 */
export async function batchCleanAndSyncFirestoreUsers(cleanUsers: UserProfile[]): Promise<void> {
  if (firestoreQuotaExceededState) return;
  const path = 'users';
  try {
    const snap = await getDocs(collection(db, path));
    const batch = writeBatch(db);
    const validIds = new Set(cleanUsers.map((u) => u.id));
    
    // Delete documents that are not in the canonical list
    snap.docs.forEach((docSnap) => {
      if (!validIds.has(docSnap.id)) {
        batch.delete(docSnap.ref);
      }
    });

    // Write all canonical merged users
    cleanUsers.forEach((u) => {
      batch.set(doc(db, 'users', u.id), sanitizeForFirestore(u), { merge: true });
    });

    await batch.commit();
  } catch (error) {
    if (isQuotaExceededError(error)) {
      setFirestoreQuotaExceeded(true);
      return;
    }
    console.warn('[Firestore] Batch clean and sync users deferred:', error);
  }
}

/**
 * Real-time listener for Super Admin System Settings (doc: settings/system)
 */
export function subscribeToFirestoreSettings(
  onUpdate: (settings: SystemSettings) => void,
  onError?: (err: any) => void
): () => void {
  const path = 'settings/system';
  const settingDoc = doc(db, 'settings', 'system');

  return onSnapshot(
    settingDoc,
    (snapshot) => {
      if (snapshot.exists()) {
        onUpdate(snapshot.data() as SystemSettings);
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
      if (onError) onError(error);
    }
  );
}

/**
 * Save System Settings to Firestore
 */
export async function saveSettingsToFirestore(settings: SystemSettings): Promise<void> {
  if (firestoreQuotaExceededState) return;
  const path = 'settings/system';
  try {
    await setDoc(doc(db, 'settings', 'system'), sanitizeForFirestore(settings));
  } catch (error) {
    if (isQuotaExceededError(error)) {
      setFirestoreQuotaExceeded(true);
      return;
    }
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Real-time listener for System Audit Logs
 */
export function subscribeToFirestoreAuditLogs(
  onUpdate: (logs: SystemAuditLog[]) => void,
  onError?: (err: any) => void
): () => void {
  const path = 'audit_logs';
  const logsCol = collection(db, path);

  return onSnapshot(
    logsCol,
    (snapshot) => {
      const logs: SystemAuditLog[] = [];
      snapshot.forEach((d) => {
        logs.push(d.data() as SystemAuditLog);
      });
      logs.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
      onUpdate(logs);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
      if (onError) onError(error);
    }
  );
}

/**
 * Add Audit Log to Firestore
 */
export async function addAuditLogToFirestore(log: SystemAuditLog): Promise<void> {
  if (firestoreQuotaExceededState) return;
  const path = `audit_logs/${log.id}`;
  try {
    await setDoc(doc(db, 'audit_logs', log.id), sanitizeForFirestore(log));
  } catch (error) {
    if (isQuotaExceededError(error)) {
      setFirestoreQuotaExceeded(true);
      return;
    }
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}
