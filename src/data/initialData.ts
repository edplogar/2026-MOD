import type { ModReportItem, PictureItem, Department, ReportStatus, PriorityLevel, ShiftType } from '../types/index.ts';

export const RAW_MOD_CSV = `Timestamp,Name,Date,Location,Problem,Follow Up,Picture
10/1/2026 8:15:30,Iwayan Suardana,10/1/2026 8:00:00,Lobby & Reception,Pengecekan area lobby tamu check-in lancar kondisi aman dan bersih,,
10/1/2026 8:45:12,Iwayan Suardana,10/1/2026 8:30:00,Restoran Flamboyan,Kondisi buffet sarapan bersih dan staf standby,,
10/1/2026 9:15:00,Iwayan Suardana,10/1/2026 9:00:00,Swimming Pool Barat,Air kolam jernih dan area sunbed rapi,,
10/1/2026 10:20:45,Candra,10/1/2026 10:00:00,Deluxe Building Lantai 2,Lampu koridor depan kamar 214 mati perlu penggantian bohlam,Engineering,"https://drive.google.com/open?id=1Sa7vhvIFZJ8UY4pjsMONvEm8K29EfSuw"
10/1/2026 11:05:22,Candra,10/1/2026 10:45:00,Kitchen & Pantry,Kondisi kebersihan kitchen aman dan ventilasi berfungsi normal,,
10/1/2026 14:10:05,I Komang Artana,10/1/2026 14:00:00,Melati Ballroom 1 & 2,Persiapan settingan meeting instansi NTB aman terkendali,,
10/1/2026 16:30:19,Ayu Sugiyarti,10/1/2026 16:15:00,Parkiran Depan & Drop Zone,Arus lalu lintas kendaraan tamu rapi dan aman,,
10/1/2026 19:45:00,I Wayan kresna,10/1/2026 19:30:00,Lotus Cafe & Angkringan,Suasana live music tertib dan area bersih,,
10/2/2026 8:30:00,I GD Sukmajaya,10/2/2026 8:15:00,Genset Hotel,Pengecekan parameter bahan bakar dan voltase genset normal,,
10/2/2026 10:15:33,Ayu Sugiyarti,10/2/2026 10:00:00,Deluxe Building Lantai 3,Handle pintu darurat lantai 3 agak longgar perlu dikencangkan,Engineering,"https://drive.google.com/open?id=1ZjvDHprPia26Wq2m85NL-4Qb-fkJMlup"
10/2/2026 14:20:00,Made Sardika,10/2/2026 14:00:00,Cottage Pool Access,Pengecekan privasi dan kebersihan area kolam cottage aman,,
10/2/2026 16:45:10,Defi,10/2/2026 16:30:00,Gym & Spa,Fasilitas gym bersih dan handuk tamu tertata rapi,,
10/2/2026 20:10:00,Iwayan Suardana,10/2/2026 20:00:00,Swimming Pool Timur,Penerangan kolam timur terang dan kondisi aman,,
10/3/2026 7:45:00,Candra,10/3/2026 7:30:00,Lobby & Reception,Pagi hari tertib briefing pagi staf FO dan security lancar,,
10/3/2026 9:30:15,I Komang Artana,10/3/2026 9:15:00,Garden & Venue Marakesh,Penyiraman tanaman taman tengah dan pembersihan dedaunan selesai,Housekeeping,"https://drive.google.com/open?id=1ZbLygFQCGoicgNtWYoExGyuUTr8REWDP"
10/3/2026 11:20:00,Ayu Sugiyarti,10/3/2026 11:00:00,Deluxe Building Lantai 4,Keramik tepi tangga lantai 4 retak halus perlu perbaikan semen,Engineering,"https://drive.google.com/open?id=1vSOHBY5VbvrZHSC0DMdww9xobBDSAhD9"
10/3/2026 13:50:00,I Wayan kresna,10/3/2026 13:30:00,Restoran Flamboyan,Pembersihan pasca lunch selesai tepat waktu,,
10/3/2026 15:40:00,Ahmad Mujaddid,10/3/2026 15:20:00,Parkir Karyawan & Loker,Pemeriksaan loker karyawan bersih dan tertib security siaga,,`;

export function isDateOnOrAfterOctober2026(dateStr: string): boolean {
  if (!dateStr) return true;
  
  const isoMatch = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10);
    if (year > 2026) return true;
    if (year < 2026) return false;
    return month >= 10;
  }

  const usMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (usMatch) {
    const month = parseInt(usMatch[1], 10);
    const year = parseInt(usMatch[3], 10);
    if (year > 2026) return true;
    if (year < 2026) return false;
    return month >= 10;
  }

  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) {
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    if (year > 2026) return true;
    if (year < 2026) return false;
    return month >= 10;
  }

  return true;
}

export function parseCSVToReports(csv: string): ModReportItem[] {
  const lines = csv.trim().split('\n');
  if (lines.length <= 1) return [];

  const reports: ModReportItem[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Parse CSV with quoted strings
    const cols: string[] = [];
    let inQuotes = false;
    let current = '';

    for (let c = 0; c < line.length; c++) {
      const char = line[c];
      if (char === '"' || char === '“' || char === '”') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        cols.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    cols.push(current.trim());

    const timestamp = cols[0] || '';
    const rawName = cols[1] || 'Staff MOD';
    const dateStr = cols[2] || '';
    const location = (cols[3] || 'Area Hotel').replace(/^"|"$/g, '').trim();
    const problem = (cols[4] || 'Sikon aman').replace(/^"|"$/g, '').trim();
    const rawFollowUp = (cols[5] || '').replace(/^"|"$/g, '').trim();
    const rawPictures = (cols[6] || '').replace(/^"|"$/g, '').trim();

    // Clean name
    const officerName = rawName.replace(/\s+/g, ' ').trim();

    // Map department
    let followUpDept: Department = 'None';
    const flLower = rawFollowUp.toLowerCase();
    if (flLower.includes('housekeeping') || flLower.includes('hk')) {
      followUpDept = 'Housekeeping';
    } else if (flLower.includes('eng') || flLower.includes('teknisi')) {
      followUpDept = 'Engineering';
    } else if (flLower.includes('fb service') || flLower.includes('fbs')) {
      followUpDept = 'FB Service';
    } else if (flLower.includes('fb product') || flLower.includes('fbp') || flLower.includes('kitchen')) {
      followUpDept = 'Fb Product';
    } else if (flLower.includes('security') || flLower.includes('scrty')) {
      followUpDept = 'Security';
    } else if (flLower.includes('front office') || flLower.includes('fo') || flLower.includes('reception')) {
      followUpDept = 'Front Office';
    } else if (rawFollowUp) {
      followUpDept = 'General';
    }

    // Determine status & priority
    const probLower = problem.toLowerCase();
    const isSafe = probLower.includes('aman') || 
                  probLower.includes('clean') || 
                  probLower.includes('clear') || 
                  probLower.includes('no problem') || 
                  probLower.includes('tdk ada') || 
                  probLower.includes('tidak ada') ||
                  probLower.includes('kondusif');

    let status: ReportStatus = isSafe ? 'Aman' : 'Perlu Follow Up';
    if (!isSafe && (probLower.includes('sudah') || probLower.includes('selesai') || probLower.includes('ditemukan'))) {
      status = 'Selesai';
    }

    let priority: PriorityLevel = 'Normal';
    if (probLower.includes('pecah') || probLower.includes('bocor') || probLower.includes('mati') || probLower.includes('bahaya') || probLower.includes('karatan') || probLower.includes('patah')) {
      priority = 'Tinggi';
    } else if (isSafe) {
      priority = 'Rendah';
    }

    // Area Grouping
    const locLower = location.toLowerCase();
    let areaGroup = 'Public Area';
    if (locLower.includes('deluxe') || locLower.includes('kamar') || locLower.includes('floor') || locLower.includes('lantai') || locLower.includes('koridor')) {
      areaGroup = 'Deluxe & Rooms';
    } else if (locLower.includes('resto') || locLower.includes('kitchen') || locLower.includes('pantry') || locLower.includes('steward')) {
      areaGroup = 'F&B & Resto';
    } else if (locLower.includes('pool') || locLower.includes('kolam') || locLower.includes('garden')) {
      areaGroup = 'Pool & Garden';
    } else if (locLower.includes('parkir') || locLower.includes('lobby') || locLower.includes('fo')) {
      areaGroup = 'Lobby & Parking';
    } else if (locLower.includes('melati') || locLower.includes('edelweis') || locLower.includes('hall') || locLower.includes('ballroom')) {
      areaGroup = 'Meeting & Ballrooms';
    } else if (locLower.includes('genset') || locLower.includes('laundry') || locLower.includes('loker') || locLower.includes('kantin') || locLower.includes('gudang') || locLower.includes('hrd')) {
      areaGroup = 'Back of House';
    }

    // Extract pictures
    const pictures: PictureItem[] = [];
    if (rawPictures) {
      const urls = rawPictures.split(',').map(s => s.trim().replace(/^"|"$/g, '')).filter(Boolean);
      urls.forEach((url, idx) => {
        const match = url.match(/id=([a-zA-Z0-9_-]+)/);
        const driveId = match ? match[1] : `pic-${i}-${idx}`;
        pictures.push({
          id: `pic-${i}-${idx}`,
          driveUrl: url.startsWith('http') ? url : `https://drive.google.com/open?id=${url}`,
          driveId,
          name: `Bukti_${location.substring(0, 15).replace(/\s+/g, '_')}_${idx + 1}.jpg`,
          originalSizeBytes: 2450000 + (idx * 350000), // ~2.4MB original
          compressedSizeBytes: 135000 + (idx * 25000), // ~135KB compressed (saved 94%)
          compressionRatio: 94,
        });
      });
    }

    // Date & Time extraction
    let datePart = dateStr;
    let timePart = '12:00';
    if (dateStr.includes(' ')) {
      const parts = dateStr.split(' ');
      datePart = parts[0];
      timePart = parts[1] || '12:00';
    } else if (timestamp.includes(' ')) {
      const parts = timestamp.split(' ');
      datePart = parts[0];
      timePart = parts[1] || '12:00';
    }

    // Shift based on time
    let shift: ShiftType = 'Sore (15:00 - 23:00)';
    const hour = parseInt(timePart.split(':')[0] || '15', 10);
    if (hour >= 7 && hour < 15) {
      shift = 'Pagi (07:00 - 15:00)';
    } else if (hour >= 15 && hour < 23) {
      shift = 'Sore (15:00 - 23:00)';
    } else {
      shift = 'Malam (23:00 - 07:00)';
    }

    reports.push({
      id: `rep-${i}-${Date.now().toString(36)}`,
      timestamp,
      date: datePart,
      time: timePart,
      officerName,
      location,
      areaGroup,
      problem,
      followUpDept,
      status,
      priority,
      pictures,
      shift,
      synced: true,
      syncedAt: timestamp,
    });
  }

  return reports;
}

export const INITIAL_OFFICERS = [
  'Iwayan Suardana',
  'Candra',
  'I Komang Artana',
  'Defi',
  'Naning',
  'I Wayan kresna',
  'Asrul Sani',
  'Rusdi',
  'I GD Sukmajaya',
  'Made Sardika',
  'Ayu Sugiyarti',
  'Kazwini',
  'Mujahidin',
  'Ahmad Mujaddid'
];

export const HOTEL_DEPARTMENTS: Department[] = [
  'Housekeeping',
  'Engineering',
  'FB Service',
  'Fb Product',
  'Security',
  'Front Office',
  'General'
];

export const HOTEL_LOCATIONS = [
  'Lobby & Reception',
  'Parkiran Depan & Drop Zone',
  'Parkir Karyawan & Loker',
  'Genset Hotel',
  'Restoran Flamboyan',
  'Kitchen & Pantry',
  'Melati Ballroom 1 & 2',
  'Edelweiss Hall',
  'Lotus Cafe & Angkringan',
  'Swimming Pool Barat',
  'Swimming Pool Timur',
  'Deluxe Building Lantai 1',
  'Deluxe Building Lantai 2',
  'Deluxe Building Lantai 3',
  'Deluxe Building Lantai 4',
  'Deluxe Building Lantai 5',
  'Cottage Pool Access',
  'Garden & Venue Marakesh',
  'Gym & Spa',
  'Gudang Samping Kamar 111',
  'Laundry & Ruang Teknisi',
  'Office HRD & Store',
  'Mushola Bawah Parigata Hall'
];
