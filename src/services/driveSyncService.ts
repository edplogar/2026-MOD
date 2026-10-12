import { PictureItem, ModReportItem } from '../types';

/**
 * Normalizes input from user which might be a full Google Drive URL or just a Folder ID.
 * Examples:
 * - "https://drive.google.com/drive/folders/1LG_MOD_DRIVE_FOLDER_2026?usp=sharing" -> "1LG_MOD_DRIVE_FOLDER_2026"
 * - "https://drive.google.com/drive/u/1/folders/1AbC-123xyz" -> "1AbC-123xyz"
 * - "https://drive.google.com/open?id=1AbC-123xyz" -> "1AbC-123xyz"
 * - "1LG_MOD_DRIVE_FOLDER_2026" -> "1LG_MOD_DRIVE_FOLDER_2026"
 */
export function extractDriveFolderId(input: string): string {
  if (!input) return '';
  const trimmed = input.trim();

  // Pattern for /folders/<ID> (supports /u/0/folders/ID, /mobile/folders/ID, etc.)
  const match = trimmed.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (match && match[1]) {
    return match[1];
  }

  // Pattern for ?id=<ID> or &id=<ID>
  const idMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idMatch && idMatch[1]) {
    return idMatch[1];
  }

  // Pattern for folderview?id=<ID>
  const fvMatch = trimmed.match(/folderview[?&]id=([a-zA-Z0-9_-]+)/);
  if (fvMatch && fvMatch[1]) {
    return fvMatch[1];
  }

  // Strip trailing slashes, view suffixes, and queries if user pasted partial URL
  return trimmed.split('?')[0].replace(/\/view$/, '').replace(/\/+$/, '');
}

/**
 * Returns the direct Google Drive URL to open the specific folder
 */
export function getDriveFolderUrl(folderId: string): string {
  const cleanId = extractDriveFolderId(folderId) || '1LG_MOD_DRIVE_FOLDER_2026';
  return `https://drive.google.com/drive/folders/${cleanId}`;
}

/**
 * Returns direct Google Drive URL for a file, or fallback to folder
 */
export function getDriveFileUrl(fileId?: string, folderId?: string): string {
  if (fileId && fileId.length >= 10 && !fileId.startsWith('pic-') && !fileId.startsWith('file-') && !fileId.startsWith('local-')) {
    return `https://drive.google.com/file/d/${fileId}/view`;
  }
  if (folderId) {
    return getDriveFolderUrl(folderId);
  }
  return `https://drive.google.com/drive/my-drive`;
}

/**
 * Upload an image payload to Google Drive using Google Apps Script Webhook
 * or stamps the photo to the configured Super Admin Google Drive folder.
 */
export async function uploadPhotoToGoogleDrive(
  picture: PictureItem,
  folderId: string,
  webhookUrl?: string,
  folderName?: string
): Promise<{ success: boolean; picture: PictureItem; error?: string }> {
  const cleanFolderId = extractDriveFolderId(folderId) || '1LG_MOD_DRIVE_FOLDER_2026';
  const cleanFolderName = folderName || picture.driveFolderName || 'HOTEL LOMBOK GARDEN / MOD REPORTS 2026';

  const rawData = picture.thumbnailUrl || '';
  const base64Data = rawData.includes('base64,') 
    ? rawData.split('base64,')[1] 
    : rawData;

  let localThumbnailUrl = picture.thumbnailUrl;

  // 1. First, attempt uploading to full-stack server backend /api/upload-photo (saves locally and forwards to Google Drive webhook)
  if (base64Data && base64Data.length > 50) {
    try {
      const serverRes = await fetch('/api/upload-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base64Data,
          fileName: picture.name || `MOD_LOGAR_${Date.now()}.jpg`,
          folderId: cleanFolderId,
          webhookUrl: webhookUrl || '',
        }),
      });

      if (serverRes.ok) {
        const serverJson = await serverRes.json();
        if (serverJson && serverJson.success) {
          localThumbnailUrl = serverJson.url || localThumbnailUrl;

          // If server successfully forwarded to Google Drive
          if (serverJson.uploadedToDrive && serverJson.driveId && !serverJson.driveId.startsWith('file-')) {
            const updated: PictureItem = {
              ...picture,
              thumbnailUrl: localThumbnailUrl,
              driveFolderId: cleanFolderId,
              driveFolderName: serverJson.driveFolderName || cleanFolderName,
              driveId: serverJson.driveId,
              driveUrl: serverJson.driveUrl || `https://drive.google.com/file/d/${serverJson.driveId}/view`,
              uploadedToDrive: true,
              uploadStatus: 'synced',
            };
            return { success: true, picture: updated };
          }
        }
      }
    } catch (serverErr) {
      console.warn('[Server Photo Upload] Deferred, trying direct client sync:', serverErr);
    }
  }

  // 2. If server didn't forward to Drive, but client has a direct Google Apps Script Webhook URL configured
  if (webhookUrl && webhookUrl.trim().startsWith('http') && base64Data) {
    try {
      const payload = {
        action: 'upload_image',
        folderId: cleanFolderId,
        fileName: picture.name || `MOD_LOGAR_${Date.now()}.jpg`,
        mimeType: 'image/jpeg',
        base64Data,
      };

      const res = await fetch(webhookUrl.trim(), {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8', // Avoid CORS preflight on Apps Script
        },
        body: JSON.stringify(payload),
      });

      const rawText = await res.text();
      let json: any = null;
      try {
        json = JSON.parse(rawText);
      } catch {
        console.warn('Apps Script returned non-JSON:', rawText.slice(0, 100));
      }

      if (json && (json.status === 'success' || json.fileId)) {
        const fileId = json.fileId;
        const updated: PictureItem = {
          ...picture,
          thumbnailUrl: localThumbnailUrl,
          driveFolderId: cleanFolderId,
          driveFolderName: json.folderName || cleanFolderName,
          driveId: fileId,
          driveUrl: json.fileUrl || `https://drive.google.com/file/d/${fileId}/view`,
          uploadedToDrive: true,
          uploadStatus: 'synced',
        };
        return { success: true, picture: updated };
      }
    } catch (webhookErr: any) {
      console.warn('Google Drive direct upload notice:', webhookErr);
    }
  }

  // 3. Fallback: Saved on server/device, ready for later sync to Google Drive
  const fallback: PictureItem = {
    ...picture,
    thumbnailUrl: localThumbnailUrl,
    driveFolderId: cleanFolderId,
    driveFolderName: cleanFolderName,
    driveUrl: picture.driveId && !picture.driveId.startsWith('pic-') && !picture.driveId.startsWith('file-')
      ? `https://drive.google.com/file/d/${picture.driveId}/view`
      : getDriveFolderUrl(cleanFolderId),
    uploadedToDrive: false,
    uploadStatus: 'local',
  };
  return { success: true, picture: fallback };
}

/**
 * Tests connection to Google Drive folder using Webhook
 */
export async function testGoogleDriveWebhook(
  folderId: string,
  webhookUrl: string
): Promise<{ success: boolean; message: string; folderName?: string; folderId?: string }> {
  const cleanFolderId = extractDriveFolderId(folderId);
  const targetWebhook = (webhookUrl || '').trim();

  if (!targetWebhook || !targetWebhook.startsWith('http')) {
    return {
      success: false,
      message: 'URL Google Apps Script Webhook belum diisi atau tidak valid (harus diawali https://script.google.com...).',
    };
  }

  // 1. Try server endpoint
  try {
    const serverRes = await fetch('/api/drive/test-connection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        webhookUrl: targetWebhook,
        folderId: cleanFolderId,
      }),
    });

    if (serverRes.ok) {
      const serverJson = await serverRes.json();
      return serverJson;
    }
  } catch (serverErr) {
    console.warn('[Test Drive] Server proxy error, trying direct client fetch:', serverErr);
  }

  // 2. Direct client fetch fallback
  try {
    const clientRes = await fetch(targetWebhook, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'test',
        folderId: cleanFolderId,
      }),
    });

    const text = await clientRes.text();
    let json: any = null;
    try {
      json = JSON.parse(text);
    } catch {
      // non JSON
    }

    if (json && (json.status === 'success' || json.message)) {
      return {
        success: true,
        message: json.message || 'Koneksi ke Google Drive Webhook berhasil!',
        folderName: json.folderName || 'Folder Google Drive',
        folderId: cleanFolderId,
      };
    } else if (json && json.status === 'error') {
      return {
        success: false,
        message: json.message || 'Akses ditolak oleh Google Apps Script.',
      };
    }

    return {
      success: clientRes.ok,
      message: clientRes.ok ? 'Webhook merespon.' : `HTTP status: ${clientRes.status}`,
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Gagal menghubungi Webhook: ${err.message || 'Network error'}`,
    };
  }
}

/**
 * Batch upload photos across reports to Google Drive folder
 */
export async function syncAllPhotosToDrive(
  reports: ModReportItem[],
  folderId: string,
  webhookUrl?: string
): Promise<{ 
  updatedReports: ModReportItem[]; 
  uploadedCount: number; 
  failedCount: number;
  totalPhotos: number;
}> {
  const cleanFolderId = extractDriveFolderId(folderId);
  let uploadedCount = 0;
  let failedCount = 0;
  let totalPhotos = 0;

  const updatedReports = await Promise.all(
    reports.map(async (report) => {
      if (!report.pictures || report.pictures.length === 0) {
        return report;
      }

      totalPhotos += report.pictures.length;

      const newPictures = await Promise.all(
        report.pictures.map(async (pic) => {
          // If already synced to real Google Drive file ID, skip
          if (pic.uploadedToDrive && pic.driveId && !pic.driveId.startsWith('pic-') && !pic.driveId.startsWith('file-') && !pic.driveId.startsWith('local-')) {
            return pic;
          }

          const res = await uploadPhotoToGoogleDrive(pic, cleanFolderId, webhookUrl);
          if (res.success && res.picture.uploadedToDrive) {
            uploadedCount++;
          } else {
            failedCount++;
          }
          return res.picture;
        })
      );

      return {
        ...report,
        pictures: newPictures,
      };
    })
  );

  return {
    updatedReports,
    uploadedCount,
    failedCount,
    totalPhotos,
  };
}

/**
 * Standard Google Apps Script deployment code for the Hotel Lombok Garden Google Drive folder
 */
export const GOOGLE_APPS_SCRIPT_CODE = `/**
 * HOTEL LOMBOK GARDEN - MOD REPORTS DRIVE UPLOADER
 * Script ini otomatis menerima foto laporan MOD LOGAR dan menyimpannya 
 * langsung ke folder Google Drive yang ditentukan di Super Admin.
 */
function doPost(e) {
  try {
    var rawData = e.postData.contents;
    var data = JSON.parse(rawData);
    
    // Normalisasi Folder ID jika pengguna menempelkan tautan lengkap Google Drive
    var rawFolderId = String(data.folderId || "").trim();
    var folderMatch = rawFolderId.match(/\\/folders\\/([a-zA-Z0-9_-]+)/);
    var idParamMatch = rawFolderId.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    var folderId = folderMatch ? folderMatch[1] : (idParamMatch ? idParamMatch[1] : rawFolderId.replace(/[?&].*$/, '').replace(/\\/+$/, ''));
    
    if (!folderId) {
      throw new Error("Folder ID Google Drive tidak ditemukan.");
    }
    
    var targetFolder = DriveApp.getFolderById(folderId);
    
    // 1. Mode Uji Koneksi (Test Ping)
    if (data.action === "test" || data.action === "ping") {
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        message: "Koneksi Google Drive Webhook berhasil!",
        folderId: folderId,
        folderName: targetFolder.getName(),
        time: new Date().toISOString()
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // 2. Mode Upload Foto Bukti Inspeksi
    var fileName = data.fileName || ("MOD_LOGAR_" + Utilities.formatDate(new Date(), "GMT+8", "yyyyMMdd_HHmmss") + ".jpg");
    var mimeType = data.mimeType || "image/jpeg";
    
    // Decode base64 gambar
    var decoded = Utilities.base64Decode(data.base64Data);
    var blob = Utilities.newBlob(decoded, mimeType, fileName);
    
    // Simpan file ke dalam folder Google Drive yang ditentukan
    var file = targetFolder.createFile(blob);
    
    // Atur izin lihat publik agar foto dapat dibuka dan diakses langsung
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    var response = {
      status: "success",
      fileId: file.getId(),
      fileName: file.getName(),
      fileUrl: file.getUrl(),
      downloadUrl: file.getDownloadUrl(),
      folderId: folderId,
      folderName: targetFolder.getName()
    };
    
    return ContentService.createTextOutput(JSON.stringify(response))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    var errorResponse = {
      status: "error",
      message: error.toString()
    };
    return ContentService.createTextOutput(JSON.stringify(errorResponse))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: "online",
    service: "Hotel Lombok Garden MOD Drive Sync Engine",
    time: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}
`;
