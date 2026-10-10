import { UserProfile, UserRole, Department } from '../types/index.ts';
import { saveUserToFirestore, deleteUserFromFirestore } from './firebase';

export const INITIAL_HOTEL_USERS: UserProfile[] = [
  {
    id: 'user-superadmin',
    username: 'superadmin',
    password: 'admin123',
    name: 'Super Administrator LOGAR',
    email: 'superadmin@lombokgardenhotel.com',
    role: 'Super Admin',
    department: 'General',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    phone: '+62 811-390-999',
    status: 'active',
    createdAt: '2025-12-01',
    lastActive: 'Baru saja',
  },
  {
    id: 'user-gm',
    username: 'gm',
    password: 'logar123',
    name: 'General Manager Logar',
    email: 'gm@lombokgardenhotel.com',
    role: 'General Manager',
    department: 'General',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    phone: '+62 811-390-001',
    status: 'active',
    createdAt: '2025-12-01',
    lastActive: 'Hari ini',
  },
  {
    id: 'user-dm-asrul',
    username: 'asrul',
    password: 'logar123',
    name: 'Asrul Sani',
    email: 'asrul.sani@lombokgardenhotel.com',
    role: 'Duty Manager',
    department: 'Front Office',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    phone: '+62 812-3456-7801',
    status: 'active',
    createdAt: '2025-12-01',
    lastActive: 'Aktif bertugas',
  },
  {
    id: 'user-mod-wayan',
    username: 'wayan',
    password: 'logar123',
    name: 'Iwayan Suardana',
    email: 'wayan.suardana@lombokgardenhotel.com',
    role: 'MOD Officer',
    department: 'Security',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
    phone: '+62 813-2345-6702',
    status: 'active',
    createdAt: '2025-12-05',
    lastActive: 'Kemarin',
  },
  {
    id: 'user-mod-candra',
    username: 'candra',
    password: 'logar123',
    name: 'Candra',
    email: 'candra@lombokgardenhotel.com',
    role: 'MOD Officer',
    department: 'Housekeeping',
    avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
    phone: '+62 819-8765-4321',
    status: 'active',
    createdAt: '2025-12-06',
    lastActive: '2 hari lalu',
  },
  {
    id: 'user-mod-komang',
    username: 'komang',
    password: 'logar123',
    name: 'I Komang Artana',
    email: 'komang.artana@lombokgardenhotel.com',
    role: 'MOD Officer',
    department: 'Engineering',
    avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80',
    phone: '+62 818-7654-3210',
    status: 'active',
    createdAt: '2025-12-09',
    lastActive: 'Hari ini',
  },
  {
    id: 'user-mod-ayu',
    username: 'ayu',
    password: 'logar123',
    name: 'Ayu Sugiyarti',
    email: 'ayu.sugiyarti@lombokgardenhotel.com',
    role: 'MOD Officer',
    department: 'Housekeeping',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    phone: '+62 878-1234-5678',
    status: 'active',
    createdAt: '2026-03-07',
    lastActive: 'Kemarin',
  },
  {
    id: 'user-mod-sardika',
    username: 'made',
    password: 'logar123',
    name: 'Made Sardika',
    email: 'made.sardika@lombokgardenhotel.com',
    role: 'Duty Manager',
    department: 'Front Office',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80',
    phone: '+62 812-9876-5432',
    status: 'active',
    createdAt: '2025-12-29',
    lastActive: '3 hari lalu',
  },
  {
    id: 'user-mod-naning',
    username: 'naning',
    password: 'logar123',
    name: 'Naning',
    email: 'naning@lombokgardenhotel.com',
    role: 'MOD Officer',
    department: 'FB Service',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
    phone: '+62 859-1122-3344',
    status: 'active',
    createdAt: '2025-12-12',
    lastActive: '4 hari lalu',
  },
  {
    id: 'user-mod-defi',
    username: 'defi',
    password: 'logar123',
    name: 'Defi',
    email: 'defi@lombokgardenhotel.com',
    role: 'MOD Officer',
    department: 'Fb Product',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
    phone: '+62 877-2233-4455',
    status: 'active',
    createdAt: '2025-12-11',
    lastActive: '5 hari lalu',
  },
  {
    id: 'user-mod-mujahidin',
    username: 'mujahidin',
    password: 'logar123',
    name: 'Mujahidin',
    email: 'mujahidin@lombokgardenhotel.com',
    role: 'MOD Officer',
    department: 'Engineering',
    avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80',
    phone: '+62 813-5566-7788',
    status: 'active',
    createdAt: '2026-04-05',
    lastActive: 'Hari ini',
  },
  {
    id: 'user-mod-kresna',
    username: 'kresna',
    password: 'logar123',
    name: 'I Wayan kresna',
    email: 'kresna@lombokgardenhotel.com',
    role: 'MOD Officer',
    department: 'Housekeeping',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80',
    phone: '+62 812-3901-2233',
    status: 'active',
    createdAt: '2025-12-01',
    lastActive: 'Aktif bertugas',
  },
  {
    id: 'user-mod-sukmajaya',
    username: 'sukmajaya',
    password: 'logar123',
    name: 'I GD Sukmajaya',
    email: 'sukmajaya@lombokgardenhotel.com',
    role: 'MOD Officer',
    department: 'Engineering',
    avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
    phone: '+62 813-3902-4455',
    status: 'active',
    createdAt: '2025-12-01',
    lastActive: 'Aktif bertugas',
  },
  {
    id: 'user-mod-rusdi',
    username: 'rusdi',
    password: 'logar123',
    name: 'Rusdi',
    email: 'rusdi@lombokgardenhotel.com',
    role: 'MOD Officer',
    department: 'Security',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    phone: '+62 819-3903-5566',
    status: 'active',
    createdAt: '2025-12-01',
    lastActive: 'Hari ini',
  },
  {
    id: 'user-mod-kazwini',
    username: 'kazwini',
    password: 'logar123',
    name: 'Kazwini',
    email: 'kazwini@lombokgardenhotel.com',
    role: 'MOD Officer',
    department: 'FB Service',
    avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80',
    phone: '+62 878-3904-6677',
    status: 'active',
    createdAt: '2025-12-01',
    lastActive: 'Hari ini',
  },
  {
    id: 'user-mod-mujaddid',
    username: 'mujaddid',
    password: 'logar123',
    name: 'Ahmad Mujaddid',
    email: 'mujaddid@lombokgardenhotel.com',
    role: 'MOD Officer',
    department: 'Engineering',
    avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80',
    phone: '+62 812-3905-7788',
    status: 'active',
    createdAt: '2025-12-01',
    lastActive: 'Hari ini',
  }
];

const AUTH_STORAGE_KEY = 'mod_report_auth_user_v1';
const ALL_USERS_STORAGE_KEY = 'mod_report_all_users_v3';
const SESSION_AUTH_USER_KEY = 'mod_report_session_active_user_v1';
const SUPER_ADMIN_KEY_STORAGE = 'mod_report_admin_master_key_v1';
const SUPER_ADMIN_PIN_STORAGE = 'mod_report_admin_pin_v1';
const SUPER_ADMIN_SESSION_STORAGE = 'mod_report_admin_session_v1';

// Default Master Credentials for Super Admin
export const DEFAULT_SUPER_ADMIN_KEY = 'LOGAR-ADMIN-2026';
export const DEFAULT_SUPER_ADMIN_PIN = '778899';

/**
 * Deduplicates user profiles strictly by ID, username, and email.
 * Prevents duplicate React keys and identical records in storage.
 */
export function deduplicateUsers(users: UserProfile[]): UserProfile[] {
  if (!Array.isArray(users)) return [];

  const mapById = new Map<string, UserProfile>();
  const seenUsernames = new Map<string, string>(); // username -> canonical id
  const seenEmails = new Map<string, string>(); // email -> canonical id

  for (const rawUser of users) {
    if (!rawUser || !rawUser.id) continue;
    const cleanId = String(rawUser.id).trim();
    const cleanUsername = (rawUser.username || rawUser.email?.split('@')[0] || cleanId).trim().toLowerCase();
    const cleanEmail = (rawUser.email || '').trim().toLowerCase();

    // 1. If ID already seen, merge fields without duplicating entry
    if (mapById.has(cleanId)) {
      const existing = mapById.get(cleanId)!;
      mapById.set(cleanId, {
        ...existing,
        ...rawUser,
        username: existing.username || rawUser.username,
        password: rawUser.password || existing.password,
      });
      continue;
    }

    // 2. If username matches an existing user under another ID, merge into that existing user
    if (cleanUsername && seenUsernames.has(cleanUsername)) {
      const canonicalId = seenUsernames.get(cleanUsername)!;
      if (mapById.has(canonicalId)) {
        const existing = mapById.get(canonicalId)!;
        mapById.set(canonicalId, {
          ...existing,
          ...rawUser,
          id: canonicalId,
        });
        continue;
      }
    }

    // 3. If email matches an existing user, merge into that user
    if (cleanEmail && seenEmails.has(cleanEmail)) {
      const canonicalId = seenEmails.get(cleanEmail)!;
      if (mapById.has(canonicalId)) {
        const existing = mapById.get(canonicalId)!;
        mapById.set(canonicalId, {
          ...existing,
          ...rawUser,
          id: canonicalId,
        });
        continue;
      }
    }

    // 4. Register new unique user
    mapById.set(cleanId, { ...rawUser });
    if (cleanUsername) seenUsernames.set(cleanUsername, cleanId);
    if (cleanEmail) seenEmails.set(cleanEmail, cleanId);
  }

  return Array.from(mapById.values());
}

export function getAllUsers(): UserProfile[] {
  try {
    const raw = localStorage.getItem(ALL_USERS_STORAGE_KEY);
    if (raw) {
      const parsed: UserProfile[] = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // First deduplicate loaded records
        const deduplicatedRaw = deduplicateUsers(parsed);

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

        // Ensure newly registered initial hotel staff (e.g. Kresna, Sukmajaya) are present without duplicating
        const existingIds = new Set(normalized.map(u => u.id));
        const existingUsernames = new Set(normalized.map(u => (u.username || '').toLowerCase()));
        const missingInitial = INITIAL_HOTEL_USERS.filter(u => 
          !existingIds.has(u.id) && !existingUsernames.has(u.username.toLowerCase())
        );

        if (missingInitial.length > 0) {
          normalized = [...normalized, ...missingInitial];
        }

        const finalUniqueUsers = deduplicateUsers(normalized);

        // Always save clean deduplicated list
        saveAllUsers(finalUniqueUsers);
        return finalUniqueUsers;
      }
    }
  } catch (e) {
    console.error('Failed reading user database', e);
  }

  const initialUnique = deduplicateUsers(INITIAL_HOTEL_USERS);
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
    status: user.status || 'active',
    createdAt: user.createdAt || new Date().toISOString().split('T')[0],
    lastActive: 'Belum pernah login',
  };

  const updated = [newUser, ...users];
  saveAllUsers(updated);

  // Real-time Firestore sync across all devices
  saveUserToFirestore(newUser).catch(err => {
    console.warn('Real-time sync to Firestore deferred:', err);
  });

  return newUser;
}

export function updateUser(id: string, updates: Partial<UserProfile>): UserProfile | null {
  const users = getAllUsers();
  let updatedUser: UserProfile | null = null;
  const updated = users.map(u => {
    if (u.id === id) {
      updatedUser = { ...u, ...updates };
      return updatedUser;
    }
    return u;
  });

  if (updatedUser) {
    saveAllUsers(updated);
    // Also update stored active user if it matches
    const active = getStoredUser();
    if (active.id === id) {
      saveStoredUser(updatedUser);
    }
    const session = getSessionUser();
    if (session && session.id === id) {
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
  const updated = updateUser(userId, { password: newPassword.trim() });
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

  const updated = users.filter(u => u.id !== id);
  saveAllUsers(updated);

  // Real-time Firestore sync across all devices
  deleteUserFromFirestore(id).catch(err => {
    console.warn('Real-time delete from Firestore deferred:', err);
  });

  // If deleted user was active user, reset to GM
  const active = getStoredUser();
  if (active.id === id) {
    saveStoredUser(updated[0] || INITIAL_HOTEL_USERS[1]);
  }
  const session = getSessionUser();
  if (session && session.id === id) {
    clearSessionUser();
  }
  return true;
}

export function setUsersFromCloud(cloudUsers: UserProfile[]): void {
  if (!cloudUsers || cloudUsers.length === 0) return;
  const clean = deduplicateUsers(cloudUsers);
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
    return matchUsername || matchEmail;
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

  const expectedPassword = matchedUser.password || (matchedUser.role === 'Super Admin' ? 'admin123' : 'logar123');

  if (cleanPass !== expectedPassword) {
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
