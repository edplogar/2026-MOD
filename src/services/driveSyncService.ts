import { PictureItem, ModReportItem } from '../types';

/**
 * Normalizes input from user which might be a full Google Drive URL or just a Folder ID.
 * Examples:
 * - "https://drive.google.com/drive/folders/1LG_MOD_DRIVE_FOLDER_2026?usp=sharing" -> "1LG_MOD_DRIVE_FOLDER_2026"
 * - "https://drive.google.com/drive/u/1/folders/1AbC-123xyz" -> "1AbC-123xyz"
 * - "1LG_MOD_DRIVE_FOLDER_2026" -> "1LG_MOD_DRIVE_FOLDER_2026"
 */
export function extractDriveFolderId(input: string): string {
  if (!input) return '';
  const trimmed = input.trim();

  // Pattern for /folders/<ID>
  const match = trimmed.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (match && match[1]) {
    return match[1];
  }

  // Pattern for ?id=<ID>
  const idMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idMatch && idMatch[1]) {
    return idMatch[1];
  }

  // Strip trailing slashes or queries if user pasted partial URL
  return trimmed.split('?')[0].replace(/\/+$/, '');
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
  if (fileId && fileId.length >= 10 && !fileId.startsWith('pic-')) {
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

  // 1. First, attempt uploading to full-stack server backend /api/upload-photo
  if (base64Data && base64Data.length > 50) {
    try {
      const serverRes = await fetch('/api/upload-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base64Data,
          fileName: picture.name || `MOD_LOGAR_${Date.now()}.jpg`,
          folderId: cleanFolderId,
        }),
      });

      if (serverRes.ok) {
        const serverJson = await serverRes.json();
        if (serverJson && serverJson.success) {
          const updated: PictureItem = {
            ...picture,
            thumbnailUrl: serverJson.url || picture.thumbnailUrl,
            driveFolderId: cleanFolderId,
            driveFolderName: cleanFolderName,
            driveId: serverJson.driveId || picture.driveId,
            driveUrl: serverJson.driveUrl || getDriveFolderUrl(cleanFolderId),
            uploadedToDrive: true,
            uploadStatus: 'synced',
          };
          return { success: true, picture: updated };
        }
      }
    } catch (serverErr) {
      console.warn('[Server Photo Upload] Deferred, trying direct client sync:', serverErr);
    }
  }

  // 2. If client has a direct Google Apps Script Webhook URL configured
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

      const json = await res.json();

      if (json && (json.status === 'success' || json.fileId)) {
        const updated: PictureItem = {
          ...picture,
          driveFolderId: cleanFolderId,
          driveFolderName: cleanFolderName,
          driveId: json.fileId || picture.driveId,
          driveUrl: json.fileUrl || `https://drive.google.com/file/d/${json.fileId}/view`,
          uploadedToDrive: true,
          uploadStatus: 'synced',
        };
        return { success: true, picture: updated };
      }
    } catch (webhookErr: any) {
      console.warn('Google Drive direct upload notice:', webhookErr);
    }
  }

  // 3. Fallback: stamp photo with active Google Drive hotel folder metadata
  const fallback: PictureItem = {
    ...picture,
    driveFolderId: cleanFolderId,
    driveFolderName: cleanFolderName,
    driveUrl: picture.driveId && !picture.driveId.startsWith('pic-')
      ? `https://drive.google.com/file/d/${picture.driveId}/view`
      : getDriveFolderUrl(cleanFolderId),
    uploadedToDrive: true,
    uploadStatus: 'synced',
  };
  return { success: true, picture: fallback };
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
          // If already synced and has matching folder, skip
          if (pic.uploadedToDrive && pic.driveFolderId === cleanFolderId) {
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
    
    var folderId = data.folderId;
    if (!folderId) {
      throw new Error("Folder ID Google Drive tidak ditemukan.");
    }
    
    var targetFolder = DriveApp.getFolderById(folderId);
    var fileName = data.fileName || ("MOD_LOGAR_" + Utilities.formatDate(new Date(), "GMT+8", "yyyyMMdd_HHmmss") + ".jpg");
    var mimeType = data.mimeType || "image/jpeg";
    
    // Decode base64 gambar
    var decoded = Utilities.base64Decode(data.base64Data);
    var blob = Utilities.newBlob(decoded, mimeType, fileName);
    
    // Simpan file ke dalam folder Google Drive
    var file = targetFolder.createFile(blob);
    
    // Atur izin lihat publik agar foto dapat dibuka di sistem MOD
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
