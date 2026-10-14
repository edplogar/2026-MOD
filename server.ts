import express from 'express';
import type { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { parseCSVToReports, RAW_MOD_CSV, isDateOnOrAfterOctober2026 } from './src/data/initialData.ts';
import { parseReportTimestampMs } from './src/services/storageService.ts';
import { INITIAL_HOTEL_USERS, DEFAULT_SYSTEM_SETTINGS } from './src/data/defaultConstants.ts';
import { mergeAndDeduplicateUsers } from './src/services/userMergeService.ts';
import type { UserProfile, ModReportItem, SystemSettings, SystemAuditLog } from './src/types/index.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const HOST = '0.0.0.0';
const isProduction = process.env.NODE_ENV === 'production';

// Ensure data directory exists
const DATA_DIR = path.resolve(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const UPLOADS_DIR = path.resolve(DATA_DIR, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const DB_FILE = path.join(DATA_DIR, 'database.json');

interface MasterCredentials {
  key: string;
  pin: string;
}

interface DatabaseSchema {
  version: number;
  updatedAt: string;
  users: UserProfile[];
  reports: ModReportItem[];
  settings: SystemSettings;
  auditLogs: SystemAuditLog[];
  masterCredentials: MasterCredentials;
  deletedUserIds?: string[];
  deletedReportIds?: string[];
}

function initDefaultDatabase(): DatabaseSchema {
  const initialReports = parseCSVToReports(RAW_MOD_CSV).filter(r => isDateOnOrAfterOctober2026(r.date) && isDateOnOrAfterOctober2026(r.timestamp));
  const now = new Date().toISOString();
  return {
    version: 1,
    updatedAt: now,
    users: JSON.parse(JSON.stringify(INITIAL_HOTEL_USERS)),
    reports: initialReports,
    settings: JSON.parse(JSON.stringify(DEFAULT_SYSTEM_SETTINGS)),
    deletedUserIds: [],
    deletedReportIds: [],
    auditLogs: [
      {
        id: `audit-init-${Date.now()}`,
        timestamp: now,
        action: 'SYSTEM_BOOT',
        details: 'Sistem LOGAR Backend Database Server berhasil diinisialisasi.',
        actor: 'System',
        category: 'SECURITY',
      },
    ],
    masterCredentials: {
      key: 'LOGAR-ADMIN-2026',
      pin: '778899',
    },
  };
}

let db: DatabaseSchema;

try {
  if (fs.existsSync(DB_FILE)) {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.users) && Array.isArray(parsed.reports)) {
      db = parsed;
      // Ensure masterCredentials exists
      if (!db.masterCredentials) {
        db.masterCredentials = { key: 'LOGAR-ADMIN-2026', pin: '778899' };
      }
      // Ensure auditLogs exists
      if (!Array.isArray(db.auditLogs)) {
        db.auditLogs = [];
      }
      // Ensure branding is normalized
      if (!db.settings) {
        db.settings = JSON.parse(JSON.stringify(DEFAULT_SYSTEM_SETTINGS));
      }
      if (!db.settings.branding) {
        db.settings.branding = {
          logoUrl: '/logo-emblem.svg',
          logoShape: 'rounded',
          bgColor: '#16A34A',
          tagline: 'Experience the Green of the City',
          brandTitle: 'LOMBOK GARDEN HOTEL',
          brandSubtitle: 'MOD REPORT LOGAR',
          badgeText: 'MOD',
          customIconType: 'default_flower',
        };
      } else {
        if (!db.settings.branding.brandTitle || db.settings.branding.brandTitle === 'LOMBOK GARDEN' || db.settings.branding.brandTitle === 'MOD REPORT LOGAR') {
          db.settings.branding.brandTitle = 'LOMBOK GARDEN HOTEL';
        }
        if (!db.settings.branding.brandSubtitle || db.settings.branding.brandSubtitle === 'HOTEL • REPORT LOGAR' || db.settings.branding.brandSubtitle === 'Sistem Pelaporan & Monitoring Lapangan Manager on Duty') {
          db.settings.branding.brandSubtitle = 'MOD REPORT LOGAR';
        }
      }
      // Deduplicate & deep-merge existing users loaded from disk without resurrecting deleted users
      if (!Array.isArray(db.deletedUserIds)) {
        db.deletedUserIds = [];
      }
      const deletedSet = new Set<string>(db.deletedUserIds);
      db.users = mergeAndDeduplicateUsers(db.users, deletedSet);
      if (db.users.length === 0) {
        db.users = mergeAndDeduplicateUsers(JSON.parse(JSON.stringify(INITIAL_HOTEL_USERS)), deletedSet);
      }

      // Ensure reports exist and merge with default initial reports
      if (!Array.isArray(db.deletedReportIds)) {
        db.deletedReportIds = [];
      }
      if (!Array.isArray(db.reports)) {
        db.reports = [];
      }
      const deletedReportSet = new Set<string>(db.deletedReportIds);
      const initialCsvReports = parseCSVToReports(RAW_MOD_CSV);
      db.reports = mergeReports(initialCsvReports, db.reports)
        .filter(r => r && r.id && !deletedReportSet.has(r.id) && isDateOnOrAfterOctober2026(r.date) && isDateOnOrAfterOctober2026(r.timestamp));

      saveDatabaseToDisk();
      console.log(`[DB] Database loaded from disk. Users: ${db.users.length}, Reports: ${db.reports.length}, Version: ${db.version}`);
    } else {
      console.log('[DB] Corrupted database file found. Re-initializing default database...');
      db = initDefaultDatabase();
      saveDatabaseToDisk();
    }
  } else {
    console.log('[DB] No database file found. Initializing master hotel dataset...');
    db = initDefaultDatabase();
    saveDatabaseToDisk();
  }
} catch (e) {
  console.error('[DB] Error loading database, creating fallback defaults:', e);
  db = initDefaultDatabase();
  saveDatabaseToDisk();
}

function saveDatabaseToDisk(): void {
  try {
    db.updatedAt = new Date().toISOString();
    const tempFile = `${DB_FILE}.tmp.${Date.now()}`;
    fs.writeFileSync(tempFile, JSON.stringify(db, null, 2), 'utf-8');
    fs.renameSync(tempFile, DB_FILE);
  } catch (err) {
    console.error('[DB] Failed saving database to disk:', err);
  }
}

// SSE Clients for Real-time push notifications
const sseClients = new Set<Response>();

function broadcastSyncEvent(type: string, data?: any) {
  db.version = (db.version || 0) + 1;
  saveDatabaseToDisk();

  const payload = JSON.stringify({
    type,
    version: db.version,
    updatedAt: db.updatedAt,
    data,
  });

  for (const client of sseClients) {
    try {
      client.write(`data: ${payload}\n\n`);
    } catch {
      sseClients.delete(client);
    }
  }
}

const app = express();

// Increase JSON payload limit to handle photos / base64 report attachments
app.use(express.json({ limit: '60mb' }));
app.use(express.urlencoded({ extended: true, limit: '60mb' }));

// CORS headers for multi-device / multi-IP access
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Serve uploaded inspection photos statically
app.use('/uploads', express.static(UPLOADS_DIR));

// Photo Upload Endpoint: Saves photo permanently to disk and uploads to Google Drive webhook if available
app.post('/api/upload-photo', async (req: Request, res: Response) => {
  try {
    const { base64Data, dataUrl, fileName, folderId, webhookUrl } = req.body;
    let rawBase64 = base64Data || '';
    if (!rawBase64 && dataUrl && typeof dataUrl === 'string') {
      rawBase64 = dataUrl.includes('base64,') ? dataUrl.split('base64,')[1] : dataUrl;
    }

    if (!rawBase64) {
      return res.status(400).json({ error: 'Data foto base64 tidak ditemukan' });
    }

    // Extract clean folder ID
    let rawFolderId = String(folderId || db.settings.driveFolderId || '1LG_MOD_DRIVE_FOLDER_2026').trim();
    const folderMatch = rawFolderId.match(/\/folders\/([a-zA-Z0-9_-]+)/);
    const idParamMatch = rawFolderId.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    const cleanFolderId = folderMatch ? folderMatch[1] : (idParamMatch ? idParamMatch[1] : rawFolderId.split('?')[0].replace(/\/+$/, ''));

    const timestamp = Date.now();
    const cleanFileName = (fileName || `MOD_INSPECTION_${timestamp}.jpg`).replace(/[^a-zA-Z0-9_.-]/g, '_');
    const localFileName = `photo_${timestamp}_${cleanFileName}`;
    const filePath = path.join(UPLOADS_DIR, localFileName);

    const buffer = Buffer.from(rawBase64, 'base64');
    fs.writeFileSync(filePath, buffer);

    const localUrl = `/uploads/${localFileName}`;
    let driveUrl = `https://drive.google.com/drive/folders/${cleanFolderId}`;
    let driveId = `file-${timestamp}`;
    let uploadedToDrive = false;
    let driveFolderName = db.settings.driveFolderName || 'HOTEL LOMBOK GARDEN / MOD REPORTS 2026';
    let driveError: string | null = null;

    // Check if Webhook URL is provided in request or database settings
    const targetWebhook = (webhookUrl || db.settings.driveWebhookUrl || '').trim();
    if (targetWebhook && targetWebhook.startsWith('http')) {
      try {
        console.log(`[Google Drive Upload] Forwarding photo "${cleanFileName}" to webhook...`);
        const driveRes = await fetch(targetWebhook, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: 'upload_image',
            folderId: cleanFolderId,
            fileName: cleanFileName,
            mimeType: 'image/jpeg',
            base64Data: rawBase64,
          }),
        });

        const rawText = await driveRes.text();
        let driveJson: any = null;
        try {
          driveJson = JSON.parse(rawText);
        } catch {
          console.warn('[Google Drive Webhook] Received non-JSON response:', rawText.slice(0, 150));
        }

        if (driveJson && (driveJson.status === 'success' || driveJson.fileId)) {
          driveId = driveJson.fileId || driveId;
          driveUrl = driveJson.fileUrl || `https://drive.google.com/file/d/${driveId}/view`;
          uploadedToDrive = true;
          if (driveJson.folderName) {
            driveFolderName = driveJson.folderName;
          }
          console.log(`[Google Drive Upload] Success! File ID: ${driveId}`);
        } else if (driveJson && driveJson.status === 'error') {
          driveError = driveJson.message || 'Error dari Google Apps Script';
          console.warn('[Google Drive Webhook] Error response:', driveError);
        }
      } catch (webhookErr: any) {
        driveError = webhookErr.message || 'Gagal menghubungi Google Apps Script';
        console.warn('[Google Drive Webhook] Forwarding error:', webhookErr);
      }
    }

    return res.json({
      success: true,
      url: localUrl,
      driveUrl,
      driveId,
      driveFolderId: cleanFolderId,
      driveFolderName,
      fileName: cleanFileName,
      uploadedToDrive,
      driveError,
      sizeBytes: buffer.length,
    });
  } catch (err: any) {
    console.error('Error uploading photo:', err);
    return res.status(500).json({ error: err.message || 'Gagal menyimpan foto' });
  }
});

// Test Google Drive Webhook Connection Endpoint
app.post('/api/drive/test-connection', async (req: Request, res: Response) => {
  try {
    const { webhookUrl, folderId } = req.body;
    const targetWebhook = (webhookUrl || db.settings.driveWebhookUrl || '').trim();
    let rawFolderId = String(folderId || db.settings.driveFolderId || '').trim();
    const folderMatch = rawFolderId.match(/\/folders\/([a-zA-Z0-9_-]+)/);
    const idParamMatch = rawFolderId.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    const cleanFolderId = folderMatch ? folderMatch[1] : (idParamMatch ? idParamMatch[1] : rawFolderId.split('?')[0].replace(/\/+$/, ''));

    if (!targetWebhook || !targetWebhook.startsWith('http')) {
      return res.status(400).json({
        success: false,
        message: 'Google Apps Script Webhook URL belum diatur (harus diawali https://script.google.com...).',
      });
    }

    if (targetWebhook.endsWith('/dev')) {
      return res.status(400).json({
        success: false,
        message: 'URL berakhiran "/dev" memerlukan login Google. Mohon gunakan Web App URL berakhiran "/exec" dari menu Deploy -> New deployment.',
      });
    }

    const driveRes = await fetch(targetWebhook, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'test',
        folderId: cleanFolderId,
      }),
    });

    const rawText = await driveRes.text();
    let driveJson: any = null;
    try {
      driveJson = JSON.parse(rawText);
    } catch {
      // non JSON, check for Google auth redirect
      if (rawText.includes('<!DOCTYPE html>') || rawText.includes('<html') || rawText.includes('accounts.google.com')) {
        return res.status(400).json({
          success: false,
          message: 'Google Apps Script meminta login (akses ditolak). Pastikan saat Deployment di script.google.com Anda memilih "Execute as: Me" dan "Who has access: Anyone".',
        });
      }
    }

    if (driveJson && (driveJson.status === 'success' || driveJson.fileId)) {
      return res.json({
        success: true,
        message: driveJson.message || 'Koneksi ke Google Drive Webhook berhasil!',
        folderName: driveJson.folderName || db.settings.driveFolderName,
        folderId: cleanFolderId,
      });
    } else if (driveJson && driveJson.status === 'error') {
      let errMsg = driveJson.message || 'Akses ditolak oleh Google Apps Script.';
      if (errMsg.includes('not found') || errMsg.includes('Invalid argument') || errMsg.includes('Folder ID')) {
        errMsg += ' (Pastikan Folder ID di Google Drive valid dan dapat diakses oleh akun Google Anda).';
      }
      return res.status(400).json({
        success: false,
        message: errMsg,
      });
    }

    if (rawText.includes('<!DOCTYPE html>') || rawText.includes('<html') || rawText.includes('accounts.google.com')) {
      return res.status(400).json({
        success: false,
        message: 'Google Apps Script meminta login (akses ditolak). Pastikan saat Deployment di script.google.com Anda memilih "Execute as: Me" dan "Who has access: Anyone".',
      });
    }

    return res.json({
      success: driveRes.ok,
      message: driveRes.ok ? 'Webhook merespon dengan baik.' : `Status HTTP: ${driveRes.status}`,
      raw: rawText.slice(0, 200),
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: `Gagal menghubungi Webhook: ${err.message}`,
    });
  }
});

// --- API ENDPOINTS ---

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    version: db.version,
    updatedAt: db.updatedAt,
    uptimeSeconds: Math.floor(process.uptime()),
    usersCount: db.users.length,
    reportsCount: db.reports.length,
  });
});

// Master Sync Status (Fast Polling)
app.get('/api/sync/status', (_req, res) => {
  res.json({
    version: db.version,
    updatedAt: db.updatedAt,
    usersCount: db.users.length,
    reportsCount: db.reports.length,
  });
});

// Master Full Sync (Fetches all synchronized state across devices)
app.get('/api/sync', (_req, res) => {
  res.json({
    version: db.version,
    updatedAt: db.updatedAt,
    users: db.users,
    deletedUserIds: db.deletedUserIds || [],
    reports: db.reports,
    deletedReportIds: db.deletedReportIds || [],
    settings: db.settings,
    auditLogs: db.auditLogs.slice(0, 300),
    masterCredentials: db.masterCredentials,
  });
});

// Real-Time SSE Stream for Instant Push to All Devices & IPs
app.get('/api/sync/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable proxy buffering
  res.flushHeaders?.();

  sseClients.add(res);

  // Send initial connection handshake
  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', version: db.version, updatedAt: db.updatedAt })}\n\n`);

  // Heartbeat ping every 20 seconds to keep connection alive across proxies
  const heartbeatTimer = setInterval(() => {
    try {
      res.write(': heartbeat\n\n');
    } catch {
      clearInterval(heartbeatTimer);
      sseClients.delete(res);
    }
  }, 20000);

  req.on('close', () => {
    clearInterval(heartbeatTimer);
    sseClients.delete(res);
  });
});

// --- USERS MANAGEMENT API ---

// Get all users
app.get('/api/users', (_req, res) => {
  res.json({
    users: db.users,
    deletedUserIds: db.deletedUserIds || [],
    version: db.version,
    updatedAt: db.updatedAt,
  });
});

// Deep-merge users across database, disk, and client
app.post('/api/users/sync-merge', (req: Request, res: Response) => {
  try {
    const { users, deletedUserIds } = req.body;

    if (!Array.isArray(db.deletedUserIds)) {
      db.deletedUserIds = [];
    }
    if (Array.isArray(deletedUserIds)) {
      const set = new Set<string>(db.deletedUserIds);
      deletedUserIds.forEach((id: string) => id && set.add(String(id).trim()));
      db.deletedUserIds = Array.from(set);
    }

    const deletedSet = new Set<string>(db.deletedUserIds);
    const incoming = Array.isArray(users) ? users : [];

    // Deep merge current server users + incoming users + defaults
    db.users = mergeAndDeduplicateUsers([...incoming, ...db.users], deletedSet);

    if (db.users.length === 0) {
      db.users = mergeAndDeduplicateUsers(JSON.parse(JSON.stringify(INITIAL_HOTEL_USERS)), deletedSet);
    }

    broadcastSyncEvent('DATABASE_USERS_MERGED', { count: db.users.length });
    res.json({
      success: true,
      users: db.users,
      deletedUserIds: db.deletedUserIds,
      version: db.version,
      updatedAt: db.updatedAt,
      message: `Database berhasil disinkronisasi & dimerge (${db.users.length} user aktif konsisten)`
    });
  } catch (err: any) {
    console.error('Error in /api/users/sync-merge:', err);
    res.status(500).json({ error: err.message || 'Gagal melakukan sinkronisasi database' });
  }
});

// Batch save or single add
app.post('/api/users', (req: Request, res: Response) => {
  try {
    const { users, user } = req.body;
    if (!Array.isArray(db.deletedUserIds)) {
      db.deletedUserIds = [];
    }
    const deletedSet = new Set<string>(db.deletedUserIds);

    if (Array.isArray(users)) {
      db.users = mergeAndDeduplicateUsers(users, deletedSet);
      broadcastSyncEvent('USERS_SYNCED', { count: db.users.length });
      return res.json({ success: true, users: db.users, version: db.version });
    }

    const targetUser: UserProfile = user || req.body;
    if (!targetUser || !targetUser.name) {
      return res.status(400).json({ error: 'Data pengguna tidak lengkap' });
    }

    db.users = mergeAndDeduplicateUsers([targetUser, ...db.users], deletedSet);
    broadcastSyncEvent('USER_ADDED_OR_UPDATED', { userId: targetUser.id });
    res.json({ success: true, user: targetUser, users: db.users, version: db.version });
  } catch (err: any) {
    console.error('Error saving user:', err);
    res.status(500).json({ error: err.message || 'Gagal menyimpan data pengguna' });
  }
});

// Update specific user
app.put('/api/users/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const userIndex = db.users.findIndex(u => u.id === id || (u.mergedUserIds && u.mergedUserIds.includes(id)));
    if (userIndex === -1) {
      return res.status(404).json({ error: 'Pengguna tidak ditemukan' });
    }

    const passSet = new Set<string>(db.users[userIndex].alternatePasswords || []);
    if (db.users[userIndex].password) passSet.add(db.users[userIndex].password!);
    if (updates.password) passSet.add(updates.password);

    db.users[userIndex] = { 
      ...db.users[userIndex], 
      ...updates,
      alternatePasswords: Array.from(passSet)
    };
    broadcastSyncEvent('USER_UPDATED', { userId: id });

    res.json({ success: true, user: db.users[userIndex], version: db.version });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Gagal memperbarui pengguna' });
  }
});

// Delete specific user
app.delete('/api/users/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const target = db.users.find(u => u.id === id || (u.mergedUserIds && u.mergedUserIds.includes(id)));
    if (!target) {
      return res.status(404).json({ error: 'Pengguna tidak ditemukan' });
    }

    if (target.role === 'Super Admin') {
      const superAdminCount = db.users.filter(u => u.role === 'Super Admin').length;
      if (superAdminCount <= 1) {
        return res.status(400).json({ error: 'Tidak dapat menghapus Super Admin terakhir pada sistem.' });
      }
    }

    if (!Array.isArray(db.deletedUserIds)) {
      db.deletedUserIds = [];
    }
    const set = new Set<string>(db.deletedUserIds);
    set.add(id);
    if (target.username) set.add(target.username);
    if (target.email) set.add(target.email);
    if (target.mergedUserIds) {
      target.mergedUserIds.forEach(mId => set.add(mId));
    }
    db.deletedUserIds = Array.from(set);

    db.users = db.users.filter(u => u.id !== id && (!u.mergedUserIds || !u.mergedUserIds.includes(id)));
    broadcastSyncEvent('USER_DELETED', { userId: id });

    res.json({ success: true, version: db.version, users: db.users, deletedUserIds: db.deletedUserIds });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Gagal menghapus pengguna' });
  }
});

// Update user password
app.post('/api/users/:id/password', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    if (!password || typeof password !== 'string' || password.trim().length === 0) {
      return res.status(400).json({ error: 'Password baru tidak boleh kosong' });
    }

    const cleanPass = password.trim();
    const userIndex = db.users.findIndex(u => u.id === id || (u.mergedUserIds && u.mergedUserIds.includes(id)));
    if (userIndex === -1) {
      return res.status(404).json({ error: 'Pengguna tidak ditemukan' });
    }

    const passSet = new Set<string>(db.users[userIndex].alternatePasswords || []);
    if (db.users[userIndex].password) passSet.add(db.users[userIndex].password!);
    passSet.add(cleanPass);

    db.users[userIndex].password = cleanPass;
    db.users[userIndex].alternatePasswords = Array.from(passSet);
    broadcastSyncEvent('USER_PASSWORD_CHANGED', { userId: id });

    res.json({ success: true, version: db.version, user: db.users[userIndex] });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Gagal mengubah password' });
  }
});

// Update Master Credentials (Super Admin key & PIN)
app.post('/api/admin/master-key', (req: Request, res: Response) => {
  try {
    const { key, pin } = req.body;
    if (key && typeof key === 'string') {
      db.masterCredentials.key = key.trim();
    }
    if (pin && typeof pin === 'string') {
      db.masterCredentials.pin = pin.trim();
    }

    broadcastSyncEvent('MASTER_CREDENTIALS_CHANGED');
    res.json({ success: true, masterCredentials: db.masterCredentials, version: db.version });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Gagal memperbarui master key' });
  }
});

export function mergeReports(existing: ModReportItem[], incoming: ModReportItem[]): ModReportItem[] {
  const map = new Map<string, ModReportItem>();
  const deletedSet = new Set<string>(db?.deletedReportIds || []);

  const getReportKey = (r: ModReportItem) => {
    if (r.id) return r.id;
    return `${r.date || ''}_${r.time || ''}_${r.location || ''}_${r.officerName || ''}`.replace(/\s+/g, '_');
  };

  if (Array.isArray(existing)) {
    existing.forEach(r => {
      if (r && r.id && !deletedSet.has(r.id)) {
        const key = getReportKey(r);
        map.set(key, r);
      }
    });
  }

  if (Array.isArray(incoming)) {
    incoming.forEach(r => {
      if (r && r.id && !deletedSet.has(r.id)) {
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

  const mergedList = Array.from(map.values()).filter(r => r && r.id && !deletedSet.has(r.id));
  mergedList.sort((a, b) => parseReportTimestampMs(b) - parseReportTimestampMs(a));

  return mergedList;
}

// --- REPORTS API ---

// Get all reports
app.get('/api/reports', (_req, res) => {
  res.json({
    reports: db.reports,
    deletedReportIds: db.deletedReportIds || [],
    version: db.version,
    updatedAt: db.updatedAt,
  });
});

// Save / Batch save / Add report / Merge reports
app.post('/api/reports', (req: Request, res: Response) => {
  try {
    const { reports, report } = req.body;

    if (Array.isArray(reports)) {
      db.reports = mergeReports(db.reports, reports);
      db.version = (db.version || 1) + 1;
      saveDatabaseToDisk();
      broadcastSyncEvent('REPORTS_SYNCED', { count: db.reports.length, reports: db.reports, deletedReportIds: db.deletedReportIds });
      return res.json({ success: true, count: db.reports.length, reports: db.reports, version: db.version });
    }

    const targetReport: ModReportItem = report || req.body;
    if (!targetReport || !targetReport.id) {
      return res.status(400).json({ error: 'Format data laporan tidak valid' });
    }

    db.reports = mergeReports(db.reports, [targetReport]);
    db.version = (db.version || 1) + 1;
    saveDatabaseToDisk();
    broadcastSyncEvent('REPORT_UPSERTED', { reportId: targetReport.id, report: targetReport });
    res.json({ success: true, report: targetReport, reports: db.reports, version: db.version });
  } catch (err: any) {
    console.error('Error saving report:', err);
    res.status(500).json({ error: err.message || 'Gagal menyimpan laporan' });
  }
});

// Delete all reports
app.delete('/api/reports', (_req: Request, res: Response) => {
  try {
    db.reports = [];
    db.deletedReportIds = [];
    db.version = (db.version || 1) + 1;
    saveDatabaseToDisk();
    broadcastSyncEvent('REPORTS_SYNCED', { count: 0, reports: [], deletedReportIds: [] });
    res.json({ success: true, count: 0, version: db.version });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Gagal menghapus seluruh laporan' });
  }
});

// Delete specific report
app.delete('/api/reports/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!Array.isArray(db.deletedReportIds)) {
      db.deletedReportIds = [];
    }
    if (id && !db.deletedReportIds.includes(id)) {
      db.deletedReportIds.push(id);
    }
    db.reports = db.reports.filter(r => r.id !== id);
    db.version = (db.version || 1) + 1;
    saveDatabaseToDisk();
    broadcastSyncEvent('REPORT_DELETED', { reportId: id, deletedReportIds: db.deletedReportIds });
    res.json({ success: true, version: db.version, deletedReportIds: db.deletedReportIds });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Gagal menghapus laporan' });
  }
});

// Delete reports by date range or list of IDs
app.post('/api/reports/delete-by-date', (req: Request, res: Response) => {
  try {
    const { idsToDelete, startDate, endDate } = req.body;
    const initialCount = db.reports.length;

    if (!Array.isArray(db.deletedReportIds)) {
      db.deletedReportIds = [];
    }

    const removedIds: string[] = [];
    if (Array.isArray(idsToDelete) && idsToDelete.length > 0) {
      const deleteSet = new Set<string>(idsToDelete);
      db.reports = db.reports.filter(r => {
        if (deleteSet.has(r.id)) {
          removedIds.push(r.id);
          return false;
        }
        return true;
      });
    } else if (startDate && endDate) {
      db.reports = db.reports.filter(r => {
        const reportDate = (r.date || r.timestamp || '').split('T')[0];
        const isMatch = reportDate >= startDate && reportDate <= endDate;
        if (isMatch) {
          removedIds.push(r.id);
          return false;
        }
        return true;
      });
    }

    removedIds.forEach(id => {
      if (id && !db.deletedReportIds!.includes(id)) {
        db.deletedReportIds!.push(id);
      }
    });

    const deletedCount = initialCount - db.reports.length;
    db.version = (db.version || 1) + 1;
    saveDatabaseToDisk();
    broadcastSyncEvent('REPORTS_SYNCED', { count: db.reports.length, reports: db.reports, deletedReportIds: db.deletedReportIds });
    res.json({ success: true, deletedCount, remainingCount: db.reports.length, version: db.version, deletedReportIds: db.deletedReportIds });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Gagal menghapus laporan berdasarkan tanggal' });
  }
});

// --- SYSTEM SETTINGS API ---

// Get settings
app.get('/api/settings', (_req, res) => {
  res.json({
    settings: db.settings,
    version: db.version,
    updatedAt: db.updatedAt,
  });
});

// Update settings
app.post('/api/settings', (req: Request, res: Response) => {
  try {
    const updates = req.body;
    db.settings = { ...db.settings, ...updates };
    broadcastSyncEvent('SETTINGS_UPDATED');
    res.json({ success: true, settings: db.settings, version: db.version });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Gagal memperbarui pengaturan sistem' });
  }
});

// --- AUDIT LOGS API ---

// Get audit logs
app.get('/api/audit-logs', (_req, res) => {
  res.json({
    auditLogs: db.auditLogs,
    version: db.version,
  });
});

// Add audit log
app.post('/api/audit-logs', (req: Request, res: Response) => {
  try {
    const log: SystemAuditLog = req.body.log || req.body;
    if (log && log.action) {
      db.auditLogs.unshift(log);
      if (db.auditLogs.length > 500) {
        db.auditLogs = db.auditLogs.slice(0, 500);
      }
      broadcastSyncEvent('AUDIT_LOG_ADDED');
    }
    res.json({ success: true, version: db.version });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Gagal mencatat audit log' });
  }
});

// --- VITE MIDDLEWARE IN DEV OR STATIC SERVING IN PRODUCTION ---

async function startServer() {
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      root: __dirname,
      configFile: path.resolve(__dirname, 'vite.config.ts'),
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });

    app.use(vite.middlewares);

    app.use('*', async (req, res, next) => {
      const url = req.originalUrl;
      try {
        let template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, HOST, () => {
    console.log(`[LOGAR Server] Running on http://${HOST}:${PORT} (Mode: ${isProduction ? 'Production' : 'Development'})`);
  });
}

startServer().catch(err => {
  console.error('[LOGAR Server] Failed to start server:', err);
  process.exit(1);
});
