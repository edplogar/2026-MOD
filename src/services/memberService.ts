import { HotelMember, MembershipDuration, MembershipCategory, MembershipStatus } from '../types';
import { db } from './firebase';
import { collection, doc, getDocs, setDoc, deleteDoc } from 'firebase/firestore';

const MEMBERS_STORAGE_KEY = 'mod_report_hotel_members_v1';

/**
 * Format YYYY-MM-DD into Indonesian human-readable date, e.g.:
 * '2027-11-07' -> '7 November 2027'
 */
export function formatIndonesianDate(dateStr: string): string {
  if (!dateStr) return '-';
  try {
    const clean = dateStr.trim().split('T')[0];
    const parts = clean.split(/[-/]/);
    if (parts.length === 3) {
      let year = parseInt(parts[0], 10);
      let month = parseInt(parts[1], 10);
      let day = parseInt(parts[2], 10);

      // Handle DD/MM/YYYY vs YYYY-MM-DD
      if (parts[0].length <= 2 && parts[2].length === 4) {
        day = parseInt(parts[0], 10);
        month = parseInt(parts[1], 10);
        year = parseInt(parts[2], 10);
      }

      const months = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
      ];

      if (month >= 1 && month <= 12 && day >= 1 && day <= 31 && year > 1900) {
        return `${day} ${months[month - 1]} ${year}`;
      }
    }

    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      const months = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
      ];
      return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
    }
  } catch {
    // fallback
  }
  return dateStr;
}

/**
 * Accurate Expiry Date Calculation based on Start Date and Selected Duration.
 * Guarantees that:
 * Start '2026-11-07' + Duration '1 Tahun' = Expiry '2027-11-07' (7 November 2027)
 */
export function calculateExpiryDate(startDate: string, duration: MembershipDuration): string {
  if (!startDate) return '';
  try {
    const clean = startDate.trim().split('T')[0];
    const [yStr, mStr, dStr] = clean.split(/[-/]/);
    const startYear = parseInt(yStr, 10);
    const startMonth = parseInt(mStr, 10); // 1-12
    const startDay = parseInt(dStr, 10);

    if (isNaN(startYear) || isNaN(startMonth) || isNaN(startDay)) {
      return '';
    }

    let targetYear = startYear;
    let targetMonth = startMonth;
    let targetDay = startDay;

    switch (duration) {
      case '1 Bulan':
        targetMonth += 1;
        break;
      case '3 Bulan':
        targetMonth += 3;
        break;
      case '6 Bulan':
        targetMonth += 6;
        break;
      case '1 Tahun':
        targetYear += 1;
        break;
      case '2 Tahun':
        targetYear += 2;
        break;
      case 'Custom':
      default:
        return '';
    }

    // Normalize overflowing months (> 12)
    while (targetMonth > 12) {
      targetMonth -= 12;
      targetYear += 1;
    }

    // Handle month end date overflows (e.g. Feb 31st -> Feb 28th/29th)
    const maxDaysInTargetMonth = new Date(targetYear, targetMonth, 0).getDate();
    if (targetDay > maxDaysInTargetMonth) {
      targetDay = maxDaysInTargetMonth;
    }

    const pad = (n: number) => String(n).padStart(2, '0');
    return `${targetYear}-${pad(targetMonth)}-${pad(targetDay)}`;
  } catch {
    return '';
  }
}

/**
 * Calculate Remaining Days between today and Expiry Date
 */
export function getDaysRemaining(expiryDateStr: string): number {
  if (!expiryDateStr) return 0;
  try {
    const exp = new Date(expiryDateStr + 'T23:59:59');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffMs = exp.getTime() - today.getTime();
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  } catch {
    return 0;
  }
}

/**
 * Evaluate Membership Status automatically based on Expiry Date
 */
export function getMembershipStatus(expiryDateStr: string, currentStatus?: MembershipStatus): MembershipStatus {
  if (currentStatus === 'Suspended') return 'Suspended';
  const remaining = getDaysRemaining(expiryDateStr);
  if (remaining < 0) return 'Kadaluarsa';
  if (remaining <= 30) return 'Hampir Habis';
  return 'Aktif';
}

/**
 * Initial dataset of hotel members, featuring 'mem-2026-007'
 */
export const INITIAL_HOTEL_MEMBERS: HotelMember[] = [
  {
    id: 'mem-2026-001',
    memberNumber: 'MEM-2026-001',
    name: 'Drs. H. M. Zulkifli, M.Si',
    email: 'zulkifli.lombok@gmail.com',
    phone: '+62 812-3789-0011',
    gender: 'Laki-laki',
    category: 'Executive Club',
    startDate: '2026-01-15',
    duration: '1 Tahun',
    expiryDate: '2027-01-15',
    status: 'Aktif',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    address: 'Jl. Pejanggik No. 45, Cakranegara, Mataram',
    idCardNumber: '5271011501720003',
    totalVisits: 48,
    lastVisit: '2026-10-06 08:30',
    notes: 'Member VIP eksekutif - Fasilitas gym & swimming pool lengkap',
    registeredBy: 'Super Administrator LOGAR',
    createdAt: '2026-01-15T08:00:00.000Z',
    updatedAt: '2026-01-15T08:00:00.000Z',
  },
  {
    id: 'mem-2026-002',
    memberNumber: 'MEM-2026-002',
    name: 'Dr. Ni Made Ayu Ratnadi, Sp.A',
    email: 'ratnadi.ayu@lombokmed.id',
    phone: '+62 819-3652-8877',
    gender: 'Perempuan',
    category: 'Gym & Swimming Pool',
    startDate: '2026-02-10',
    duration: '1 Tahun',
    expiryDate: '2027-02-10',
    status: 'Aktif',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    address: 'Jl. Caturwarga No. 12, Mataram',
    idCardNumber: '5271025002810005',
    totalVisits: 32,
    lastVisit: '2026-10-05 17:15',
    notes: 'Piket renang rutin sore bersama keluarga',
    registeredBy: 'Asrul Sani (Duty Manager)',
    createdAt: '2026-02-10T09:30:00.000Z',
    updatedAt: '2026-02-10T09:30:00.000Z',
  },
  {
    id: 'mem-2026-003',
    memberNumber: 'MEM-2026-003',
    name: 'I Gede Bagus Mahendra',
    email: 'bagus.mahendra@ntbbali.co.id',
    phone: '+62 878-6543-2190',
    gender: 'Laki-laki',
    category: 'Fitness & Gym',
    startDate: '2026-03-01',
    duration: '6 Bulan',
    expiryDate: '2026-09-01',
    status: 'Kadaluarsa',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    address: 'Komplek Griya Asri No. 8B, Ampenan',
    idCardNumber: '5271031105900002',
    totalVisits: 65,
    lastVisit: '2026-08-29 19:40',
    notes: 'Perlu follow up perpanjangan langganan gym',
    registeredBy: 'Ayu Sugiyarti (MOD)',
    createdAt: '2026-03-01T10:00:00.000Z',
    updatedAt: '2026-09-02T08:00:00.000Z',
  },
  {
    id: 'mem-2026-004',
    memberNumber: 'MEM-2026-004',
    name: 'Sarah Jessica Wibowo',
    email: 'sarah.wibowo@designlombok.com',
    phone: '+62 813-9876-5432',
    gender: 'Perempuan',
    category: 'Swimming Pool Only',
    startDate: '2026-04-20',
    duration: '6 Bulan',
    expiryDate: '2026-10-20',
    status: 'Hampir Habis',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    address: 'Jl. Majapahit No. 88, Selaparang, Mataram',
    idCardNumber: '5271046004940001',
    totalVisits: 24,
    lastVisit: '2026-10-04 16:00',
    notes: 'Sisa masa aktif kurang dari 2 minggu - notifikasi perpanjangan telah dikirim',
    registeredBy: 'Candra (MOD Officer)',
    createdAt: '2026-04-20T14:15:00.000Z',
    updatedAt: '2026-04-20T14:15:00.000Z',
  },
  {
    id: 'mem-2026-005',
    memberNumber: 'MEM-2026-005',
    name: 'Lalu Hendra Pratama, S.T.',
    email: 'hendra.pratama@indoconsult.com',
    phone: '+62 811-3999-7722',
    gender: 'Laki-laki',
    category: 'Executive Club',
    startDate: '2026-05-12',
    duration: '1 Tahun',
    expiryDate: '2027-05-12',
    status: 'Aktif',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
    address: 'Jl. Airlangga No. 19, Mataram',
    idCardNumber: '5271011205850007',
    totalVisits: 19,
    lastVisit: '2026-10-01 07:15',
    notes: 'Member korporat rekanan Hotel Lombok Garden',
    registeredBy: 'Super Administrator LOGAR',
    createdAt: '2026-05-12T11:00:00.000Z',
    updatedAt: '2026-05-12T11:00:00.000Z',
  },
  {
    id: 'mem-2026-006',
    memberNumber: 'MEM-2026-006',
    name: 'Keluarga Ir. Bambang Suryono',
    email: 'bambang.suryono@suryateknik.co.id',
    phone: '+62 812-4455-6677',
    gender: 'Laki-laki',
    category: 'Family Wellness',
    startDate: '2026-06-01',
    duration: '1 Tahun',
    expiryDate: '2027-06-01',
    status: 'Aktif',
    avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
    address: 'Jl. Sriwijaya No. 102, Mataram',
    idCardNumber: '5271020106750004',
    totalVisits: 38,
    lastVisit: '2026-10-04 10:15',
    notes: 'Paket membership keluarga 4 orang (Pool Timur & Barat)',
    registeredBy: 'Asrul Sani (Duty Manager)',
    createdAt: '2026-06-01T10:00:00.000Z',
    updatedAt: '2026-06-01T10:00:00.000Z',
  },
  // SPECIFIC USER EXAMPLE: MEMBER MEM-2026-007
  {
    id: 'mem-2026-007',
    memberNumber: 'MEM-2026-007',
    name: 'Budi Santoso',
    email: 'budi.santoso2026@gmail.com',
    phone: '+62 817-5788-9900',
    gender: 'Laki-laki',
    category: 'Gym & Swimming Pool',
    startDate: '2026-11-07',
    duration: '1 Tahun',
    expiryDate: '2027-11-07',
    status: 'Aktif',
    avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80',
    address: 'Jl. Bung Karno No. 34, Mataram, NTB',
    idCardNumber: '5271010711880009',
    totalVisits: 14,
    lastVisit: '2026-10-07 16:45',
    notes: 'Member Resmi Hotel Lombok Garden - Akses Swimming Pool Barat & Timur + Fitness Center',
    registeredBy: 'Super Administrator LOGAR',
    createdAt: '2026-10-02T08:00:00.000Z',
    updatedAt: '2026-10-02T08:00:00.000Z',
  },
  {
    id: 'mem-2026-008',
    memberNumber: 'MEM-2026-008',
    name: 'Dewi Anggraini, S.E.',
    email: 'dewi.anggraini@bankntb.co.id',
    phone: '+62 818-0361-2233',
    gender: 'Perempuan',
    category: 'Fitness & Gym',
    startDate: '2026-08-15',
    duration: '3 Bulan',
    expiryDate: '2026-11-15',
    status: 'Aktif',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
    address: 'Jl. Pendidikan No. 7, Mataram',
    idCardNumber: '5271035508930006',
    totalVisits: 18,
    lastVisit: '2026-10-06 18:20',
    notes: 'Member gym reguler kelas pagi & yoga',
    registeredBy: 'Iwayan Suardana (MOD Officer)',
    createdAt: '2026-08-15T09:00:00.000Z',
    updatedAt: '2026-08-15T09:00:00.000Z',
  },
  {
    id: 'mem-2026-009',
    memberNumber: 'MEM-2026-009',
    name: 'Michael Robert Chen',
    email: 'michael.chen@lombokresort.com',
    phone: '+62 821-4567-8901',
    gender: 'Laki-laki',
    category: 'Executive Club',
    startDate: '2026-09-01',
    duration: '1 Tahun',
    expiryDate: '2027-09-01',
    status: 'Aktif',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80',
    address: 'Villa Green Valley No. 5, Batu Layar, Lombok Barat',
    idCardNumber: 'PASSPORT-A98765432',
    totalVisits: 12,
    lastVisit: '2026-10-07 07:00',
    notes: 'Expat member - Akses penuh seluruh fasilitas rekreasi hotel',
    registeredBy: 'Super Administrator LOGAR',
    createdAt: '2026-09-01T08:30:00.000Z',
    updatedAt: '2026-09-01T08:30:00.000Z',
  },
  {
    id: 'mem-2026-010',
    memberNumber: 'MEM-2026-010',
    name: 'Hj. Siti Rohani',
    email: 'siti.rohani@kateringlombok.com',
    phone: '+62 877-6512-3499',
    gender: 'Perempuan',
    category: 'Swimming Pool Only',
    startDate: '2026-07-01',
    duration: '1 Bulan',
    expiryDate: '2026-08-01',
    status: 'Kadaluarsa',
    avatar: 'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=150&auto=format&fit=crop&q=80',
    address: 'Jl. Ragi Genap No. 14, Pagutan, Mataram',
    idCardNumber: '5271015007700008',
    totalVisits: 9,
    lastVisit: '2026-07-28 09:30',
    notes: 'Member renang paket bulanan liburan anak sekolah',
    registeredBy: 'Ayu Sugiyarti (MOD)',
    createdAt: '2026-07-01T11:00:00.000Z',
    updatedAt: '2026-08-02T08:00:00.000Z',
  },
];

let inMemoryMembersCache: HotelMember[] | null = null;

/**
 * Retrieve all members from memory, local storage, or server API
 */
export function getAllMembers(): HotelMember[] {
  if (inMemoryMembersCache && inMemoryMembersCache.length > 0) {
    return inMemoryMembersCache;
  }

  try {
    const raw = localStorage.getItem(MEMBERS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Automatically re-evaluate real-time status (Aktif, Hampir Habis, Kadaluarsa)
        const evaluated = parsed.map(m => ({
          ...m,
          status: getMembershipStatus(m.expiryDate, m.status),
        }));
        inMemoryMembersCache = evaluated;
        return evaluated;
      }
    }
  } catch (err) {
    console.warn('Error reading stored members:', err);
  }

  // Seed default members
  const seeded = INITIAL_HOTEL_MEMBERS.map(m => ({
    ...m,
    status: getMembershipStatus(m.expiryDate, m.status),
  }));
  inMemoryMembersCache = seeded;
  saveMembersLocally(seeded);

  // Sync to backend asynchronously
  syncMembersWithBackend(seeded).catch(() => {});

  return seeded;
}

/**
 * Save members locally and broadcast update event
 */
function saveMembersLocally(members: HotelMember[]): void {
  inMemoryMembersCache = members;
  try {
    localStorage.setItem(MEMBERS_STORAGE_KEY, JSON.stringify(members));
  } catch (err) {
    console.warn('Error persisting members to localStorage:', err);
  }

  try {
    window.dispatchEvent(new CustomEvent('logar_members_updated', { detail: members }));
  } catch {
    // ignore
  }
}

/**
 * Update a member by ID with automatic expiry calculation if dates or duration change
 */
export function updateMember(id: string, updates: Partial<HotelMember>): HotelMember | null {
  const current = getAllMembers();
  const index = current.findIndex(m => m.id === id || m.memberNumber.toLowerCase() === id.toLowerCase());
  if (index === -1) return null;

  const target = current[index];
  const now = new Date().toISOString();

  // Resolve startDate and duration
  const newStartDate = updates.startDate !== undefined ? updates.startDate : target.startDate;
  const newDuration = updates.duration !== undefined ? updates.duration : target.duration;

  // CRITICAL: Calculate expiry date automatically if startDate or duration changed,
  // or use explicit expiryDate if supplied
  let newExpiryDate = target.expiryDate;
  if (updates.expiryDate !== undefined) {
    newExpiryDate = updates.expiryDate;
  } else if (updates.startDate !== undefined || updates.duration !== undefined) {
    if (newDuration !== 'Custom') {
      const calculated = calculateExpiryDate(newStartDate, newDuration);
      if (calculated) {
        newExpiryDate = calculated;
      }
    }
  }

  // Auto-evaluate membership status based on new expiry date
  const newStatus = getMembershipStatus(newExpiryDate, updates.status !== undefined ? updates.status : target.status);

  const updatedMember: HotelMember = {
    ...target,
    ...updates,
    startDate: newStartDate,
    duration: newDuration,
    expiryDate: newExpiryDate,
    status: newStatus,
    updatedAt: now,
  };

  const updatedList = [...current];
  updatedList[index] = updatedMember;

  saveMembersLocally(updatedList);

  // Background server & Firestore sync
  persistMemberToBackend(updatedMember).catch(console.warn);
  saveMemberToFirestore(updatedMember).catch(console.warn);

  return updatedMember;
}

/**
 * Add a new member
 */
export function addMember(memberData: Omit<HotelMember, 'id' | 'createdAt' | 'updatedAt'>): HotelMember {
  const current = getAllMembers();
  const now = new Date().toISOString();

  // Generate ID and Member Number if not present
  const nextNum = current.length + 1;
  const id = `mem-2026-${String(nextNum).padStart(3, '0')}`;
  const memberNumber = memberData.memberNumber || `MEM-2026-${String(nextNum).padStart(3, '0')}`;

  // Automatically calculate expiry date if not manually set
  let expiryDate = memberData.expiryDate;
  if (!expiryDate && memberData.duration !== 'Custom') {
    expiryDate = calculateExpiryDate(memberData.startDate, memberData.duration);
  }

  const status = getMembershipStatus(expiryDate, memberData.status);

  const newMember: HotelMember = {
    ...memberData,
    id,
    memberNumber,
    expiryDate,
    status,
    totalVisits: memberData.totalVisits || 0,
    createdAt: now,
    updatedAt: now,
  };

  const updatedList = [newMember, ...current];
  saveMembersLocally(updatedList);

  persistMemberToBackend(newMember).catch(console.warn);
  saveMemberToFirestore(newMember).catch(console.warn);

  return newMember;
}

/**
 * Delete a member
 */
export function deleteMember(id: string): boolean {
  const current = getAllMembers();
  const filtered = current.filter(m => m.id !== id && m.memberNumber !== id);
  if (filtered.length === current.length) return false;

  saveMembersLocally(filtered);

  // Delete from server backend & Firestore
  fetch(`/api/members/${id}`, { method: 'DELETE' }).catch(() => {});
  deleteMemberFromFirestore(id).catch(() => {});

  return true;
}

/**
 * Sync members array to Express backend database
 */
async function syncMembersWithBackend(members: HotelMember[]): Promise<void> {
  try {
    await fetch('/api/members/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ members }),
    });
  } catch {
    // ignore
  }
}

/**
 * Save single member to Express backend
 */
async function persistMemberToBackend(member: HotelMember): Promise<void> {
  try {
    await fetch(`/api/members/${member.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(member),
    });
  } catch {
    // ignore
  }
}

/**
 * Save member to Firestore
 */
async function saveMemberToFirestore(member: HotelMember): Promise<void> {
  try {
    const docRef = doc(db, 'members', member.id);
    await setDoc(docRef, member);
  } catch (err) {
    console.warn('Sync member to Firestore deferred:', err);
  }
}

/**
 * Delete member from Firestore
 */
async function deleteMemberFromFirestore(memberId: string): Promise<void> {
  try {
    const docRef = doc(db, 'members', memberId);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn('Delete member from Firestore deferred:', err);
  }
}
