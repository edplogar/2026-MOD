export type Department = 
  | 'Housekeeping'
  | 'Engineering'
  | 'FB Service'
  | 'Fb Product'
  | 'Security'
  | 'Front Office'
  | 'General'
  | 'None';

export type ReportStatus = 'Aman' | 'Perlu Follow Up' | 'Dalam Proses' | 'Selesai';

export type PriorityLevel = 'Rendah' | 'Normal' | 'Tinggi' | 'Urgent';

export type ShiftType = 'Pagi (07:00 - 15:00)' | 'Sore (15:00 - 23:00)' | 'Malam (23:00 - 07:00)' | 'General';

export interface PictureItem {
  id: string;
  driveUrl: string;
  driveId?: string;
  driveFolderId?: string;
  driveFolderName?: string;
  name?: string;
  thumbnailUrl?: string;
  originalSizeBytes?: number;
  compressedSizeBytes?: number;
  compressionRatio?: number; // e.g. 85 (%)
  uploadedToDrive?: boolean;
  uploadStatus?: 'synced' | 'pending' | 'local';
}

export interface ModReportItem {
  id: string;
  timestamp: string; // ISO string or original format
  date: string;
  time: string;
  officerName: string;
  location: string;
  areaGroup: string; // e.g. 'Deluxe Building', 'F&B Area', 'Public Area', 'Back of House', 'Pool & Garden'
  problem: string;
  followUpDept: Department;
  status: ReportStatus;
  priority: PriorityLevel;
  pictures: PictureItem[];
  shift: ShiftType;
  notes?: string;
  synced: boolean;
  syncedAt?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  resolutionDurationHours?: number;
}

export type UserRole = 'Super Admin' | 'General Manager' | 'Duty Manager' | 'MOD Officer' | 'Department Head' | 'Staff';

export interface UserProfile {
  id: string;
  username: string;
  password?: string;
  name: string;
  email: string;
  role: UserRole;
  department: Department;
  avatar: string;
  phone?: string;
  status?: 'active' | 'suspended';
  lastActive?: string;
  createdAt?: string;
}

export interface HotelLocationConfig {
  id: string;
  name: string;
  areaGroup: string;
  isActive: boolean;
}

export type LogoShape = 'rounded' | 'circle' | 'square';

export interface HotelBrandingConfig {
  logoUrl?: string; // Base64 data URL or external image URL
  logoShape: LogoShape; // 'rounded' | 'circle' | 'square'
  bgColor: string; // Background color hex code, e.g. '#95A823'
  tagline: string; // e.g. 'Experience the Green of the City'
  brandTitle: string; // e.g. 'LOMBOK GARDEN'
  brandSubtitle: string; // e.g. 'HOTEL • REPORT LOGAR'
  badgeText: string; // e.g. 'MOD'
  customIconType?: 'default_flower' | 'custom_image' | 'building' | 'shield' | 'leaf';
  updatedAt?: string;
  updatedBy?: string;
}

export interface SystemSettings {
  hotelName: string;
  hotelAddress: string;
  hotelPhone: string;
  hotelEmail: string;
  branding?: HotelBrandingConfig;
  driveFolderId: string;
  driveFolderName: string;
  driveWebhookUrl?: string;
  compressionQuality: number; // e.g. 0.72
  maxImageDimension: number; // e.g. 1280
  autoSyncEnabled: boolean;
  autoSyncIntervalMinutes: number;
  sessionTimeoutMinutes: number;
  shifts: {
    morning: { name: string; time: string };
    afternoon: { name: string; time: string };
    night: { name: string; time: string };
  };
  locations: HotelLocationConfig[];
  departments: string[];
}

export interface SystemAuditLog {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  details: string;
  category: 'USER' | 'SETTING' | 'DATA' | 'SECURITY';
}

export interface FilterState {
  search: string;
  startDate: string;
  endDate: string;
  officer: string;
  department: string;
  location: string;
  status: string;
  hasPhotos: boolean | null;
}

export interface CloudSyncState {
  isAutoSyncEnabled: boolean;
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncedAt: string | null;
  pendingCount: number;
  totalSyncedCount: number;
  driveFolderName: string;
  driveFolderId: string;
  driveWebhookUrl?: string;
}

export interface RolePermissionConfig {
  role: UserRole;
  displayName: string;
  description: string;
  canAccessDashboard: boolean;
  canAccessReports: boolean;
  canCreateReport: boolean;
  canExportPdf: boolean;
  canSyncCloud: boolean;
  canEditReportStatus: boolean;
  canDeleteReport: boolean;
  canAccessSuperAdmin: boolean;
}

export interface SystemPermissionsState {
  roles: Record<UserRole, RolePermissionConfig>;
  userOverrides?: Record<string, Partial<RolePermissionConfig>>;
  updatedAt?: string;
  updatedBy?: string;
}

export type MembershipDuration = '1 Bulan' | '3 Bulan' | '6 Bulan' | '1 Tahun' | '2 Tahun' | 'Custom';
export type MembershipCategory = 'Executive Club' | 'Gym & Swimming Pool' | 'Fitness & Gym' | 'Swimming Pool Only' | 'Family Package' | 'Family Wellness' | 'Spa & Wellness' | 'Silver' | 'Gold' | 'Platinum' | string;
export type MembershipStatus = 'Aktif' | 'Kadaluarsa' | 'Ditangguhkan' | 'Suspended' | 'Segera Berakhir' | 'Hampir Habis';

export interface HotelMember {
  id: string;
  memberNumber: string;
  name: string;
  email?: string;
  phone?: string;
  gender?: 'Laki-laki' | 'Perempuan';
  category: MembershipCategory;
  startDate: string;
  duration: MembershipDuration;
  expiryDate: string;
  status: MembershipStatus;
  avatar?: string;
  address?: string;
  idCardNumber?: string;
  totalVisits?: number;
  lastVisit?: string;
  notes?: string;
  registeredBy?: string;
  createdAt: string;
  updatedAt: string;
}
