import { UserProfile, UserRole } from '../types';

/**
 * Normalizes user name for exact match comparison.
 * e.g. " Rusdi  " -> "rusdi", "I Wayan Kresna" -> "i wayan kresna"
 */
export function normalizeName(name?: string): string {
  if (!name) return '';
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Normalizes username for match comparison.
 */
export function normalizeUsername(username?: string): string {
  if (!username) return '';
  return username.trim().toLowerCase().replace(/[^a-zA-Z0-9_]/g, '');
}

/**
 * Normalizes email address for match comparison.
 */
export function normalizeEmail(email?: string): string {
  if (!email) return '';
  return email.trim().toLowerCase();
}

/**
 * Role hierarchy score to ensure merged profiles retain proper operational privilege.
 */
const ROLE_HIERARCHY: Record<UserRole, number> = {
  'Super Admin': 100,
  'General Manager': 80,
  'Duty Manager': 60,
  'Department Head': 50,
  'MOD Officer': 40,
  'Staff': 20,
};

/**
 * Checks whether an entered password matches the user's single valid password.
 * Strictly 1 user = 1 valid password.
 */
export function isPasswordValidForUser(user: UserProfile, passwordInput: string): boolean {
  if (!user || !passwordInput) return false;
  const cleanInput = passwordInput.trim();
  if (!cleanInput) return false;

  const userPass = (user.password || '').trim();
  if (!userPass) {
    const defaultPass = user.role === 'Super Admin' ? 'admin123' : 'logar123';
    return cleanInput === defaultPass;
  }
  return cleanInput === userPass;
}

/**
 * Deduplicates and deep-merges an array of UserProfiles.
 * Handles duplicate users having the same name, username, email, or IDs.
 * Enforces single password integrity.
 */
export function mergeAndDeduplicateUsers(
  users: UserProfile[],
  deletedIds: Set<string> = new Set()
): UserProfile[] {
  if (!Array.isArray(users)) return [];

  // canonicalId -> UserProfile
  const canonicalMap = new Map<string, UserProfile>();
  const idToCanonical = new Map<string, string>();
  const usernameToCanonical = new Map<string, string>();
  const emailToCanonical = new Map<string, string>();
  const nameToCanonical = new Map<string, string>();

  for (const raw of users) {
    if (!raw || !raw.id) continue;
    const cleanId = String(raw.id).trim();

    // Skip if deleted
    if (deletedIds.has(cleanId)) continue;

    const normName = normalizeName(raw.name);
    const normUser = normalizeUsername(raw.username || (raw.email ? raw.email.split('@')[0] : ''));
    const normEmail = normalizeEmail(raw.email);

    if (deletedIds.has(normUser) || (normEmail && deletedIds.has(normEmail))) {
      continue;
    }

    // Determine if this user matches any already registered canonical user
    let canonicalId: string | null = null;

    if (idToCanonical.has(cleanId)) {
      canonicalId = idToCanonical.get(cleanId)!;
    } else if (normUser && usernameToCanonical.has(normUser)) {
      canonicalId = usernameToCanonical.get(normUser)!;
    } else if (normName && nameToCanonical.has(normName)) {
      // MERGE BY NAME: e.g. Rusdi matches another Rusdi record!
      canonicalId = nameToCanonical.get(normName)!;
    } else if (normEmail && emailToCanonical.has(normEmail)) {
      canonicalId = emailToCanonical.get(normEmail)!;
    }

    if (canonicalId && canonicalMap.has(canonicalId)) {
      // --- MERGE WITH EXISTING USER ---
      const existing = canonicalMap.get(canonicalId)!;

      // Single primary password
      let primaryPass = (raw.password && raw.password.trim()) || (existing.password && existing.password.trim()) || 'logar123';

      // 2. Merge Roles (keep higher privilege)
      const existingScore = ROLE_HIERARCHY[existing.role] || 0;
      const incomingScore = ROLE_HIERARCHY[raw.role] || 0;
      const finalRole = incomingScore > existingScore ? raw.role : existing.role;

      // 3. Merge Merged IDs list
      const mergedIds = new Set<string>([
        canonicalId,
        cleanId,
        ...(existing.mergedUserIds || []),
        ...(raw.mergedUserIds || []),
      ]);

      // 4. Merge profile attributes
      const merged: UserProfile = {
        ...existing,
        ...raw,
        id: canonicalId, // retain canonical ID
        username: existing.username || raw.username || normUser,
        name: (existing.name && existing.name.length >= (raw.name || '').length) ? existing.name : raw.name,
        email: existing.email || raw.email,
        password: primaryPass,
        alternatePasswords: [primaryPass],
        mergedUserIds: Array.from(mergedIds),
        role: finalRole,
        department: (existing.department && existing.department !== 'General' && existing.department !== 'None') 
          ? existing.department 
          : (raw.department || existing.department),
        phone: existing.phone || raw.phone || '',
        avatar: (existing.avatar && !existing.avatar.includes('placeholder')) ? existing.avatar : (raw.avatar || existing.avatar),
        status: (existing.status === 'suspended' || raw.status === 'suspended') ? 'suspended' : 'active',
        createdAt: existing.createdAt || raw.createdAt,
        lastActive: (raw.lastActive && raw.lastActive !== 'Belum pernah login') ? raw.lastActive : existing.lastActive,
      };

      canonicalMap.set(canonicalId, merged);

      // Map incoming keys to canonical
      idToCanonical.set(cleanId, canonicalId);
      if (raw.mergedUserIds) {
        raw.mergedUserIds.forEach(mId => idToCanonical.set(mId, canonicalId!));
      }
      if (normUser) usernameToCanonical.set(normUser, canonicalId);
      if (normEmail) emailToCanonical.set(normEmail, canonicalId);
      if (normName) nameToCanonical.set(normName, canonicalId);
    } else {
      // --- REGISTER NEW CANONICAL USER ---
      const primaryPass = (raw.password && raw.password.trim()) || (raw.role === 'Super Admin' ? 'admin123' : 'logar123');
      const cleanUser: UserProfile = {
        ...raw,
        id: cleanId,
        username: raw.username || normUser || cleanId,
        name: raw.name || 'Petugas LOGAR',
        password: primaryPass,
        alternatePasswords: [primaryPass],
        mergedUserIds: Array.from(new Set([cleanId, ...(raw.mergedUserIds || [])])),
        role: raw.role || 'MOD Officer',
        department: raw.department || 'General',
        avatar: raw.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        status: raw.status || 'active',
      };

      canonicalMap.set(cleanId, cleanUser);
      idToCanonical.set(cleanId, cleanId);
      if (raw.mergedUserIds) {
        raw.mergedUserIds.forEach(mId => idToCanonical.set(mId, cleanId));
      }
      if (normUser) usernameToCanonical.set(normUser, cleanId);
      if (normEmail) emailToCanonical.set(normEmail, cleanId);
      if (normName) nameToCanonical.set(normName, cleanId);
    }
  }

  return Array.from(canonicalMap.values());
}
