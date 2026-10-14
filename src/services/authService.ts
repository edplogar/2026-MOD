import { UserProfile, UserRole, Department } from '../types/index.ts';
import { saveUserToFirestore, deleteUserFromFirestore, batchCleanAndSyncFirestoreUsers } from './firebase';
import { INITIAL_HOTEL_USERS } from '../data/defaultConstants';
import { 
  mergeAndDeduplicateUsers, 
  isPasswordValidForUser, 
  normalizeName, 
  normalizeUsername 
} from './userMergeService';

export { INITIAL_HOTEL_USERS };

const AUTH_STORAGE_KEY = 'mod_report_auth_user_v1';
const ALL_USERS_STORAGE_KEY = 'mod_report_all_users_v3';
const SESSION_AUTH_USER_KEY = 'mod_report_session_active_user_v1';
const SUPER_ADMIN_KEY_STORAGE = 'mod_report_admin_master_key_v1';
const SUPER_ADMIN_PIN_STORAGE = 'mod_report_admin_pin_v1';
const SUPER_ADMIN_SESSION_STORAGE = 'mod_report_admin_session_v1';
const DELETED_USER_IDS_KEY = 'mod_report_deleted_user_ids_v1';

export function getDeletedUserIds(): Set<string> {
  try {
    const raw = localStorage.getItem(DELETED_USER_IDS_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return new Set(arr);
    }
  } catch {
    // ignore
  }
  return new Set();
}

export function recordDeletedUserId(id: string): void {
  try {
    const set = getDeletedUserIds();
    set.add(id);
    localStorage.setItem(DELETED_USER_IDS_KEY, JSON.stringify(Array.from(set)));
  } catch {
    // ignore
  }
}

// Default Master Credentials for Super Admin
export const DEFAULT_SUPER_ADMIN_KEY = 'LOGAR-ADMIN-2026';
export const DEFAULT_SUPER_ADMIN_PIN = '778899';

/**
 * Deduplicates user profiles strictly by ID, username, name, and email.
 * Merges duplicate user entries (such as Rusdi who has 2 passwords used).
 */
export function deduplicateUsers(users: UserProfile[]): UserProfile[] {
  return mergeAndDeduplicateUsers(users, getDeletedUserIds());
}

export function getAllUsers(): UserProfile[] {
  const deletedIds = getDeletedUserIds();
  try {
    const raw = localStorage.getItem(ALL_USERS_STORAGE_KEY);
    if (raw) {
      const parsed: UserProfile[] = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // First deduplicate loaded records and filter deleted ones
        const deduplicatedRaw = deduplicateUsers(parsed).filter(u => !deletedIds.has(u.id));

        // Ensure all users have username and password
        let normalized = deduplicatedRaw.map(u => {
          let updated = { ...u };
          if (!updated.username) {
            updated.username = u.email ? u.email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '').toLowerCase() : u.id;
          }
          if (!updated.password) {
            updated.password = updated.role === 'Super Admin' ? 'admin123' : 'logar123';
          }
          return updated;
        });

        const finalUniqueUsers = deduplicateUsers(normalized).filter(u => !deletedIds.has(u.id));

        // Always save clean deduplicated list
        saveAllUsers(finalUniqueUsers);
        return finalUniqueUsers;
      }
    }
  } catch (e) {
    console.error('Failed reading user database', e);
  }

  const initialUnique = deduplicateUsers(INITIAL_HOTEL_USERS).filter(u => !deletedIds.has(u.id));
  saveAllUsers(initialUnique);
  return initialUnique;
}

export function saveAllUsers(users: UserProfile[]): void {
  try {
    const clean = deduplicateUsers(users);
    localStorage.setItem(ALL_USERS_STORAGE_KEY, JSON.stringify(clean));
  } catch (e) {
    console.error('Failed saving user database', e);
  }
}

export function addUser(user: Omit<UserProfile, 'id'>): UserProfile {
  const users = getAllUsers();
  const id = `user-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
  const cleanUsername = (user.username || user.email.split('@')[0] || `user_${Date.now()}`)
    .trim()
    .toLowerCase()
    .replace(/[^a-zA-Z0-9_]/g, '');

  const newUser: UserProfile = {
    ...user,
    id,
    username: cleanUsername,
    password: user.password || 'logar123',
    alternatePasswords: user.password ? [user.password, 'logar123'] : ['logar123'],
    mergedUserIds: [id],
    status: user.status || 'active',
    createdAt: user.createdAt || new Date().toISOString().split('T')[0],
    lastActive: 'Belum pernah login',
  };

  // Merge with existing users if same name/username/email
  const mergedList = mergeAndDeduplicateUsers([newUser, ...users], getDeletedUserIds());
  saveAllUsers(mergedList);

  // Sync to Express backend server /api/users
  fetch('/api/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user: newUser }),
  }).catch(err => {
    console.warn('Real-time sync to server API deferred:', err);
  });

  // Real-time Firestore sync across all devices
  saveUserToFirestore(newUser).catch(err => {
    console.warn('Real-time sync to Firestore deferred:', err);
  });

  const finalUser = mergedList.find(u => 
    u.id === id || 
    (u.mergedUserIds && u.mergedUserIds.includes(id)) ||
    normalizeUsername(u.username) === cleanUsername || 
    normalizeName(u.name) === normalizeName(user.name)
  ) || newUser;

  return finalUser;
}

export function updateUser(id: string, updates: Partial<UserProfile>): UserProfile | null {
  const users = getAllUsers();
  let updatedUser: UserProfile | null = null;
  const updated = users.map(u => {
    if (u.id === id || (u.mergedUserIds && u.mergedUserIds.includes(id))) {
      const passSet = new Set<string>();
      if (u.password) passSet.add(u.password);
      if (updates.password) passSet.add(updates.password);
      if (Array.isArray(u.alternatePasswords)) u.alternatePasswords.forEach(p => p && passSet.add(p));
      if (Array.isArray(updates.alternatePasswords)) updates.alternatePasswords.forEach(p => p && passSet.add(p));

      updatedUser = { 
        ...u, 
        ...updates,
        alternatePasswords: Array.from(passSet).filter(Boolean)
      };
      return updatedUser;
    }
    return u;
  });

  if (updatedUser) {
    const cleanMerged = mergeAndDeduplicateUsers(updated, getDeletedUserIds());
    saveAllUsers(cleanMerged);

    // Sync to Express backend server /api/users/:id
    fetch(`/api/users/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    }).catch(err => {
      console.warn('Real-time update to server API deferred:', err);
    });

    // Also update stored active user if it matches
    const active = getStoredUser();
    if (active.id === id || (active.mergedUserIds && active.mergedUserIds.includes(id))) {
      saveStoredUser(updatedUser);
    }
    const session = getSessionUser();
    if (session && (session.id === id || (session.mergedUserIds && session.mergedUserIds.includes(id)))) {
      setSessionUser(updatedUser);
    }

    // Real-time Firestore sync across all devices
    saveUserToFirestore(updatedUser).catch(err => {
      console.warn('Real-time sync to Firestore deferred:', err);
    });
  }
  return updatedUser;
}

export function updateUserPassword(userId: string, newPassword: string): boolean {
  if (!newPassword || newPassword.trim().length === 0) return false;
  const cleanPass = newPassword.trim();
  const users = getAllUsers();
  const target = users.find(u => u.id === userId || (u.mergedUserIds && u.mergedUserIds.includes(userId)));
  if (!target) return false;

  const passSet = new Set<string>(target.alternatePasswords || []);
  if (target.password) passSet.add(target.password);
  passSet.add(cleanPass);

  const updated = updateUser(target.id, { 
    password: cleanPass,
    alternatePasswords: Array.from(passSet)
  });

  // Also sync to server backend /api/users/:id/password
  fetch(`/api/users/${encodeURIComponent(target.id)}/password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: cleanPass }),
  }).catch(err => {
    console.warn('Real-time password sync to server deferred:', err);
  });

  return !!updated;
}

export function deleteUser(id: string): boolean {
  const users = getAllUsers();
  const target = users.find(u => u.id === id);
  if (!target) return false;

  // Protect last Super Admin
  if (target.role === 'Super Admin') {
    const adminCount = users.filter(u => u.role === 'Super Admin').length;
    if (adminCount <= 1) {
      throw new Error('Tidak dapat menghapus Super Admin terakhir pada sistem.');
    }
  }

  // Blacklist ID so it can never be resurrected
  recordDeletedUserId(id);

  const updated = users.filter(u => u.id !== id);
  saveAllUsers(updated);

  // 1. Delete from Backend Express Server so database.json is saved to disk and SSE broadcast is emitted
  fetch(`/api/users/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  }).catch(err => {
    console.warn('Real-time delete from server API deferred:', err);
  });

  // 2. Real-time Firestore sync across all devices
  deleteUserFromFirestore(id).catch(err => {
    console.warn('Real-time delete from Firestore deferred:', err);
  });

  // If deleted user was active user, reset to GM
  const active = getStoredUser();
  if (active.id === id) {
    saveStoredUser(updated[0] || INITIAL_HOTEL_USERS[0]);
  }
  const session = getSessionUser();
  if (session && session.id === id) {
    clearSessionUser();
  }

  try {
    window.dispatchEvent(new CustomEvent('logar_users_updated', { detail: updated }));
  } catch {
    // ignore
  }

  return true;
}

export function setUsersFromCloud(cloudUsers: UserProfile[]): void {
  if (!cloudUsers || cloudUsers.length === 0) return;
  const deletedIds = getDeletedUserIds();
  const clean = deduplicateUsers(cloudUsers).filter(u => !deletedIds.has(u.id));
  saveAllUsers(clean);
  try {
    window.dispatchEvent(new CustomEvent('logar_users_updated', { detail: clean }));
  } catch {
    // ignore in non-browser
  }
}

export function getStoredUser(): UserProfile {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Failed reading auth state', e);
  }
  // Default fallback user
  return INITIAL_HOTEL_USERS[2];
}

export function saveStoredUser(user: UserProfile): void {
  try {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
  } catch (e) {
    console.error('Failed saving auth state', e);
  }
}

export function clearStoredUser(): void {
  localStorage.removeItem(AUTH_STORAGE_KEY);
}

// Session authentication for landing page
export function getSessionUser(): UserProfile | null {
  try {
    const raw = sessionStorage.getItem(SESSION_AUTH_USER_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Failed reading session user', e);
  }
  return null;
}

export function setSessionUser(user: UserProfile): void {
  try {
    sessionStorage.setItem(SESSION_AUTH_USER_KEY, JSON.stringify(user));
    saveStoredUser(user);
  } catch (e) {
    console.error('Failed setting session user', e);
  }
}

export function clearSessionUser(): void {
  try {
    sessionStorage.removeItem(SESSION_AUTH_USER_KEY);
  } catch (e) {
    console.error('Failed clearing session user', e);
  }
}

export function authenticateUser(
  usernameOrEmail: string,
  pass: string
): { success: boolean; user?: UserProfile; message?: string } {
  const cleanInput = usernameOrEmail.trim().toLowerCase();
  const cleanPass = pass.trim();

  if (!cleanInput || !cleanPass) {
    return {
      success: false,
      message: 'Harap masukkan username dan password.',
    };
  }

  const users = getAllUsers();
  const matchedUser = users.find(u => {
    const matchUsername = u.username && u.username.toLowerCase() === cleanInput;
    const matchEmail = u.email && u.email.toLowerCase() === cleanInput;
    const matchName = normalizeName(u.name) === normalizeName(cleanInput);
    return matchUsername || matchEmail || matchName;
  });

  if (!matchedUser) {
    return {
      success: false,
      message: 'Username atau email tidak terdaftar dalam sistem LOGAR.',
    };
  }

  if (matchedUser.status === 'suspended') {
    return {
      success: false,
      message: 'Akun Anda sedang ditangguhkan. Silakan hubungi Super Admin.',
    };
  }

  // Multi-password authentication: handles users with 2 or more passwords (such as Rusdi)
  if (!isPasswordValidForUser(matchedUser, cleanPass)) {
    return {
      success: false,
      message: 'Password yang Anda masukkan salah. Coba lagi atau hubungi Super Admin.',
    };
  }

  // Update last active
  const nowStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' hari ini';
  const updated = updateUser(matchedUser.id, { lastActive: nowStr }) || matchedUser;
  setSessionUser(updated);

  if (updated.role === 'Super Admin') {
    setSuperAdminSession();
  }

  return {
    success: true,
    user: updated,
  };
}

/**
 * Deeply reconciles and synchronizes user database across Client localStorage,
 * Backend Express Server (/api/users/sync-merge), and Firebase Firestore.
 * Merges duplicate entries and guarantees multi-password support.
 */
export async function syncAndMergeAllDatabase(): Promise<{
  success: boolean;
  userCount: number;
  mergedCount: number;
  message: string;
}> {
  try {
    const localUsers = getAllUsers();
    const deletedIds = getDeletedUserIds();

    // 1. Call Backend Server Deep-Merge Endpoint
    const res = await fetch('/api/users/sync-merge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        users: localUsers,
        deletedUserIds: Array.from(deletedIds)
      }),
    });

    let mergedUsers: UserProfile[] = localUsers;
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.users)) {
        mergedUsers = data.users;
      }
    }

    const finalClean = mergeAndDeduplicateUsers(mergedUsers, deletedIds);
    saveAllUsers(finalClean);

    // 2. Synchronize clean users to Firestore
    batchCleanAndSyncFirestoreUsers(finalClean).catch(err => {
      console.warn('Real-time sync to Firestore users deferred:', err);
    });

    // 3. Real-time broadcast to UI
    try {
      window.dispatchEvent(new CustomEvent('logar_users_updated', { detail: finalClean }));
    } catch {
      // ignore
    }

    return {
      success: true,
      userCount: finalClean.length,
      mergedCount: Math.max(0, localUsers.length - finalClean.length),
      message: `Database berhasil disinkronisasi & dimerge secara menyeluruh (${finalClean.length} akun terverifikasi konsisten).`,
    };
  } catch (err: any) {
    console.error('Deep sync and merge error:', err);
    return {
      success: false,
      userCount: getAllUsers().length,
      mergedCount: 0,
      message: err.message || 'Gagal menjalankan sinkronisasi menyeluruh.',
    };
  }
}

// Super Admin Secure Credentials & Session Management
export function getSuperAdminMasterKey(): string {
  return localStorage.getItem(SUPER_ADMIN_KEY_STORAGE) || DEFAULT_SUPER_ADMIN_KEY;
}

export function getSuperAdminPin(): string {
  return localStorage.getItem(SUPER_ADMIN_PIN_STORAGE) || DEFAULT_SUPER_ADMIN_PIN;
}

export function updateSuperAdminCredentials(newKey: string, newPin: string): void {
  localStorage.setItem(SUPER_ADMIN_KEY_STORAGE, newKey.trim());
  localStorage.setItem(SUPER_ADMIN_PIN_STORAGE, newPin.trim());
}

export function verifySuperAdminCredentials(key: string, pin: string): boolean {
  const validKey = getSuperAdminMasterKey();
  const validPin = getSuperAdminPin();
  return key.trim() === validKey && pin.trim() === validPin;
}

export function isSuperAdminSessionValid(): boolean {
  try {
    const raw = sessionStorage.getItem(SUPER_ADMIN_SESSION_STORAGE);
    if (!raw) return false;
    const session = JSON.parse(raw);
    const now = Date.now();
    // 2 hours validity
    if (session.expiresAt && now < session.expiresAt) {
      return true;
    }
  } catch (e) {
    console.error('Admin session error', e);
  }
  return false;
}

export function setSuperAdminSession(): void {
  const expiresAt = Date.now() + 2 * 60 * 60 * 1000; // 2 hours
  sessionStorage.setItem(SUPER_ADMIN_SESSION_STORAGE, JSON.stringify({
    authenticated: true,
    role: 'Super Admin',
    timestamp: new Date().toISOString(),
    expiresAt,
  }));
}

export function clearSuperAdminSession(): void {
  sessionStorage.removeItem(SUPER_ADMIN_SESSION_STORAGE);
}
