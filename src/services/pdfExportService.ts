import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ModReportItem, UserProfile } from '../types';
import { getHotelBranding, getSystemSettings } from './systemSettingsService';

export interface PdfExportOptions {
  title?: string;
  shift?: string;
  startDate?: string;
  endDate?: string;
  officerName?: string;
  departmentFilter?: string;
  user: UserProfile;
}

export function exportModReportToPdf(
  reports: ModReportItem[],
  options: PdfExportOptions
): void {
  const branding = getHotelBranding();
  const settings = getSystemSettings();

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Header Hotel Lombok Garden (Official Dark Timber #231E1B)
  doc.setFillColor(35, 30, 27);
  doc.rect(0, 0, pageWidth, 28, 'F');

  // Decorative Accent bar (Custom brand background color or #95A823)
  doc.setFillColor(149, 168, 35);
  doc.rect(0, 28, pageWidth, 2.5, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  const pdfHotelName = `HOTEL ${branding.brandTitle || 'LOMBOK GARDEN'}`;
  doc.text(pdfHotelName, 14, 11);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(217, 223, 152); // #D9DF98
  doc.text(branding.tagline || 'Experience the Green of the City', 14, 16);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(198, 204, 129); // #C6CC81
  const contactText = `${settings.hotelAddress || 'Jl. Bung Karno No. 7, Mataram, NTB'} | Telp: ${settings.hotelPhone || '0370 636015'} | ${settings.hotelEmail || 'hotellombokgarden@gmail.com'}`;
  doc.text(contactText, 14, 22);

  // Document Title Box
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(35, 30, 27);
  const docTitleText = `LAPORAN RESMI MANAGER ON DUTY (${branding.brandSubtitle || 'MOD REPORT LOGAR'})`;
  doc.text(docTitleText, 14, 38);

  const printDate = new Date().toLocaleString('id-ID', {
    dateStyle: 'full',
    timeStyle: 'short',
  });

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(112, 99, 90);

  // Metadata Grid in soft ivory/garden sand
  const startY = 44;
  doc.setFillColor(250, 251, 245);
  doc.roundedRect(14, startY, pageWidth - 28, 22, 2, 2, 'F');
  doc.setDrawColor(217, 223, 152);
  doc.roundedRect(14, startY, pageWidth - 28, 22, 2, 2, 'S');

  // Left col
  doc.setFont('helvetica', 'bold');
  doc.text('Periode Laporan:', 18, startY + 6);
  doc.setFont('helvetica', 'normal');
  const periodText = options.startDate && options.endDate 
    ? `${options.startDate} s/d ${options.endDate}`
    : 'Semua Periode Aktif';
  doc.text(periodText, 52, startY + 6);

  doc.setFont('helvetica', 'bold');
  doc.text('Shift / Waktu:', 18, startY + 12);
  doc.setFont('helvetica', 'normal');
  doc.text(options.shift || 'Semua Shift Operasional', 52, startY + 12);

  doc.setFont('helvetica', 'bold');
  doc.text('Petugas MOD / DM:', 18, startY + 18);
  doc.setFont('helvetica', 'normal');
  doc.text(options.officerName || options.user.name, 52, startY + 18);

  // Right col
  doc.setFont('helvetica', 'bold');
  doc.text('Tanggal Cetak:', pageWidth - 85, startY + 6);
  doc.setFont('helvetica', 'normal');
  doc.text(printDate, pageWidth - 85 + 23, startY + 6);

  doc.setFont('helvetica', 'bold');
  doc.text('Total Inspeksi:', pageWidth - 85, startY + 12);
  doc.setFont('helvetica', 'normal');
  doc.text(`${reports.length} Titik Area`, pageWidth - 85 + 23, startY + 12);

  const safeCount = reports.filter(r => r.status === 'Aman' || r.status === 'Selesai').length;
  const issueCount = reports.filter(r => r.status === 'Perlu Follow Up' || r.status === 'Dalam Proses').length;

  doc.setFont('helvetica', 'bold');
  doc.text('Kondisi Fisik:', pageWidth - 85, startY + 18);
  doc.setFont('helvetica', 'normal');
  doc.text(`${safeCount} Aman / ${issueCount} Perlu Follow Up`, pageWidth - 85 + 23, startY + 18);

  // Section 1: Ringkasan Status & Tindak Lanjut
  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('1. DAFTAR INSPEKSI & TEMUAN OPERASIONAL', 14, 73);

  // Table columns
  const tableRows = reports.map((r, index) => {
    let driveLinkNote = '-';
    if (r.pictures && r.pictures.length > 0) {
      driveLinkNote = `${r.pictures.length} Foto (Google Drive)`;
    }

    return [
      (index + 1).toString(),
      `${r.date}\n${r.time}`,
      r.officerName,
      r.location,
      r.problem,
      r.followUpDept !== 'None' ? r.followUpDept : '-',
      r.status,
      driveLinkNote,
    ];
  });

  autoTable(doc, {
    startY: 76,
    head: [['No', 'Waktu', 'Petugas', 'Area / Lokasi', 'Temuan / Kondisi', 'Follow Up', 'Status', 'Bukti']],
    body: tableRows,
    theme: 'grid',
    styles: {
      fontSize: 7.5,
      cellPadding: 2,
      font: 'helvetica',
      textColor: [35, 30, 27],
      lineColor: [226, 231, 184],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [35, 30, 27],
      textColor: [250, 251, 245],
      fontStyle: 'bold',
      halign: 'center',
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 20, halign: 'center' },
      2: { cellWidth: 26 },
      3: { cellWidth: 34 },
      4: { cellWidth: 42 },
      5: { cellWidth: 22, halign: 'center' },
      6: { cellWidth: 20, halign: 'center' },
      7: { cellWidth: 18, halign: 'center' },
    },
    didParseCell: (data) => {
      if (data.section === 'body') {
        const rowData = reports[data.row.index];
        if (data.column.index === 6) {
          if (rowData.status === 'Perlu Follow Up') {
            data.cell.styles.textColor = [194, 89, 65]; // Terracotta Red
            data.cell.styles.fontStyle = 'bold';
          } else if (rowData.status === 'Dalam Proses') {
            data.cell.styles.textColor = [212, 130, 39]; // Warm Amber
          } else {
            data.cell.styles.textColor = [149, 168, 35]; // Lombok Garden Olive
          }
        }
      }
    },
  });

  // Get final Y from table
  let finalY = (doc as any).lastAutoTable?.finalY || 180;

  // Check if enough space for summary and signatures, else add page
  if (finalY > pageHeight - 50) {
    doc.addPage();
    finalY = 20;
  } else {
    finalY += 8;
  }

  // Signature Block
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);

  const leftSignX = 25;
  const rightSignX = pageWidth - 65;

  doc.text('Mataram, ' + new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }), rightSignX, finalY + 5);

  doc.text('Dibuat oleh (MOD):', leftSignX, finalY + 12);
  doc.text('Mengetahui (General Manager):', rightSignX, finalY + 12);

  // Line for sign
  doc.setDrawColor(148, 163, 184);
  doc.line(leftSignX, finalY + 32, leftSignX + 45, finalY + 32);
  doc.line(rightSignX, finalY + 32, rightSignX + 50, finalY + 32);

  doc.setFont('helvetica', 'bold');
  doc.text(options.user.name, leftSignX, finalY + 36);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(`Duty Manager / MOD Officer`, leftSignX, finalY + 40);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('General Manager', rightSignX, finalY + 36);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text('Hotel Lombok Garden', rightSignX, finalY + 40);

  // Page numbering in footer
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text(
      `MOD REPORT LOGAR - Dokumen Resmi Hotel Lombok Garden | Halaman ${i} dari ${pageCount}`,
      pageWidth / 2,
      pageHeight - 6,
      { align: 'center' }
    );
  }

  const filename = `MOD_REPORT_LOGAR_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
}
