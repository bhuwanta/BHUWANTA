import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface LeadReportData {
  name: string;
  phone: string;
  email: string;
  source: string;
  message: string;
  project: string;
  downloads: string;
  date: string;
}

export interface PDFReportOptions {
  subtitle?: string;
  generationDate?: string;
}

const EXCEL_COLS = [
  { wch: 8 },  // S.No
  { wch: 22 }, // Date & Time (IST)
  { wch: 26 }, // Customer Name
  { wch: 18 }, // Phone Number
  { wch: 30 }, // Email Address
  { wch: 25 }, // Lead Source
  { wch: 22 }, // Project
  { wch: 22 }, // Downloaded Items
  { wch: 45 }, // Customer Message / Notes
];

function formatLeadsForExcel(leads: LeadReportData[]) {
  if (leads.length === 0) {
    return [{
      'S.No': '-',
      'Date & Time (IST)': '-',
      'Customer Name': 'No new leads recorded for this time slot',
      'Phone Number': '-',
      'Email Address': '-',
      'Lead Source': '-',
      'Project': '-',
      'Downloaded Items': '-',
      'Customer Message / Notes': '-'
    }];
  }

  return leads.map((lead, index) => ({
    'S.No': index + 1,
    'Date & Time (IST)': lead.date || '-',
    'Customer Name': lead.name || 'Unknown',
    'Phone Number': lead.phone || '-',
    'Email Address': lead.email || '-',
    'Lead Source': lead.source || '-',
    'Project': lead.project || '-',
    'Downloaded Items': lead.downloads || '-',
    'Customer Message / Notes': lead.message || '-'
  }));
}

function applyWorksheetStyles(worksheet: XLSX.WorkSheet) {
  worksheet['!cols'] = EXCEL_COLS;
  // Ensure Phone Number (Column D) is stored explicitly as string to avoid scientific notation
  Object.keys(worksheet).forEach(cellKey => {
    if (cellKey.startsWith('D') && cellKey !== 'D1') {
      if (worksheet[cellKey]) {
        worksheet[cellKey].t = 's';
      }
    }
  });
}

export function generateExcelBuffer(leads: LeadReportData[], sheetName = 'Leads'): Buffer {
  const dataForExcel = formatLeadsForExcel(leads);
  const worksheet = XLSX.utils.json_to_sheet(dataForExcel);
  applyWorksheetStyles(worksheet);

  const workbook = XLSX.utils.book_new();
  const safeSheetName = sheetName.replace(/[:\\/?*\[\]]/g, '').slice(0, 31) || 'Leads';
  XLSX.utils.book_append_sheet(workbook, worksheet, safeSheetName);
  
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

export function generateMasterExcelBuffer(
  slotLeads: LeadReportData[],
  todayLeads: LeadReportData[],
  allTimeLeads: LeadReportData[],
  slotSheetName: string = 'Slot Leads'
): Buffer {
  const workbook = XLSX.utils.book_new();

  const addSheet = (leads: LeadReportData[], sheetName: string) => {
    const dataForExcel = formatLeadsForExcel(leads);
    const worksheet = XLSX.utils.json_to_sheet(dataForExcel);
    applyWorksheetStyles(worksheet);
    const safeSheetName = sheetName.replace(/[:\\/?*\[\]]/g, '').slice(0, 31) || 'Leads';
    XLSX.utils.book_append_sheet(workbook, worksheet, safeSheetName);
  };

  addSheet(slotLeads, slotSheetName);
  addSheet(todayLeads, 'Today Total Leads');
  addSheet(allTimeLeads, 'All Time Leads');

  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

export async function generatePDFBuffer(
  leads: LeadReportData[], 
  reportTitle: string,
  options?: PDFReportOptions
): Promise<Buffer> {
  const doc = new jsPDF('l', 'pt', 'a4');
  const nowIst = options?.generationDate || new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

  // 1. Executive Brand Header
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 58, 95); // Deep Bhuwanta Navy #1E3A5F
  doc.text('BHUWANTA DEVELOPERS', 40, 36);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(13, 148, 136); // Teal #0D9488
  doc.text(`CRM LEADS REPORT • ${reportTitle}`, 40, 52);

  // Metadata block (top right)
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139); // Slate #64748B
  doc.text(`Generated: ${nowIst}`, 570, 36);
  doc.text(`Total Leads: ${leads.length}`, 570, 52);

  // Divider rule
  doc.setDrawColor(226, 232, 240); // Slate #E2E8F0
  doc.setLineWidth(1);
  doc.line(40, 62, 802, 62);

  if (leads.length > 0) {
    // 2. Leads Data Table
    const tableData = leads.map((l, index) => [
      index + 1,
      l.date || '-',
      l.name || 'Unknown',
      l.phone || '-',
      l.email || '-',
      l.source || '-',
      l.project || '-',
      l.downloads || '-',
      l.message || '-'
    ]);

    autoTable(doc, {
      startY: 74,
      margin: { top: 74, bottom: 45, left: 40, right: 40 },
      head: [["S.No", "Date & Time (IST)", "Customer Name", "Phone", "Email Address", "Source", "Project", "Downloads", "Message / Notes"]],
      body: tableData,
      columnStyles: {
        0: { cellWidth: 32, halign: 'center' }, // S.No
        1: { cellWidth: 85 },                   // Date & Time
        2: { cellWidth: 85 },                   // Name
        3: { cellWidth: 75 },                   // Phone
        4: { cellWidth: 105 },                  // Email Address
        5: { cellWidth: 85 },                   // Source
        6: { cellWidth: 75 },                   // Project
        7: { cellWidth: 65 },                   // Downloads
        8: { cellWidth: 'auto' }                // Message / Notes
      },
      styles: {
        fontSize: 8,
        cellPadding: 5,
        textColor: [30, 41, 59],
        overflow: 'linebreak'
      },
      headStyles: {
        fillColor: [30, 58, 95], // Bhuwanta Navy #1E3A5F
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8.5
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252] // Slate 50
      },
      tableLineColor: [226, 232, 240],
      tableLineWidth: 0.5
    });
  } else {
    // 3. Elegant Empty State Card
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(40, 95, 762, 90, 4, 4, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(40, 95, 762, 90, 4, 4, 'D');

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('No New Leads Recorded During This Slot', 421, 135, { align: 'center' });

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('All channels (Website, WhatsApp, Meta Ads) are active and monitored continuously.', 421, 155, { align: 'center' });
  }

  // 4. Professional Footers across all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(40, 565, 802, 565);

    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text('Bhuwanta Developers • Confidential & Proprietary Internal CRM Document', 40, 578);
    doc.text(`Page ${i} of ${totalPages}`, 755, 578);
  }

  const arrayBuffer = doc.output('arraybuffer');
  return Buffer.from(arrayBuffer);
}

