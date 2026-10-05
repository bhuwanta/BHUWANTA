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

export function generateExcelBuffer(leads: LeadReportData[], sheetName = 'Leads'): Buffer {
  // If no leads, provide a dummy row so the Excel file isn't completely blank
  const dataForExcel = leads.length > 0 ? leads : [{
    name: 'NO NEW LEADS', phone: '-', email: '-', source: '-', message: '-', project: '-', downloads: '-', date: '-'
  }];
  const worksheet = XLSX.utils.json_to_sheet(dataForExcel);
  
  // Set nice column widths
  worksheet['!cols'] = [
    { wch: 20 }, // name
    { wch: 15 }, // phone
    { wch: 25 }, // email
    { wch: 15 }, // source
    { wch: 40 }, // message
    { wch: 20 }, // project
    { wch: 30 }, // downloads
    { wch: 20 }, // date
  ];

  const workbook = XLSX.utils.book_new();
  const safeSheetName = sheetName.replace(/[:\\/?*\[\]]/g, '').slice(0, 31) || 'Leads';
  XLSX.utils.book_append_sheet(workbook, worksheet, safeSheetName);
  
  // Return buffer
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
    const dataForExcel = leads.length > 0 ? leads : [{
      name: 'NO NEW LEADS', phone: '-', email: '-', source: '-', message: '-', project: '-', downloads: '-', date: '-'
    }];
    const worksheet = XLSX.utils.json_to_sheet(dataForExcel);
    worksheet['!cols'] = [
      { wch: 20 }, // name
      { wch: 15 }, // phone
      { wch: 25 }, // email
      { wch: 15 }, // source
      { wch: 40 }, // message
      { wch: 20 }, // project
      { wch: 30 }, // downloads
      { wch: 20 }, // date
    ];
    const safeSheetName = sheetName.replace(/[:\\/?*\[\]]/g, '').slice(0, 31) || 'Leads';
    XLSX.utils.book_append_sheet(workbook, worksheet, safeSheetName);
  };

  addSheet(slotLeads, slotSheetName);
  addSheet(todayLeads, 'Today Total Leads');
  addSheet(allTimeLeads, 'All Time Leads');

  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

export async function generatePDFBuffer(leads: LeadReportData[], reportTitle: string): Promise<Buffer> {
  const doc = new jsPDF('l', 'pt', 'a4');

  doc.setFontSize(18);
  doc.text(reportTitle, 40, 40);

  const tableData = leads.length > 0 ? leads.map(l => [
    l.date,
    l.name || '-',
    l.phone || '-',
    l.source || '-',
    l.message || '-',
    l.project || '-',
    l.downloads || '-'
  ]) : [["-", "NO NEW LEADS", "-", "-", "-", "-", "-"]];

  autoTable(doc, {
    startY: 60,
    head: [["Date", "Name", "Phone", "Source", "Message", "Project", "Downloads"]],
    body: tableData,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [30, 58, 95] }, // Matches Bhuwanta Navy #1e3a5f
  });

  const arrayBuffer = doc.output('arraybuffer');
  return Buffer.from(arrayBuffer);
}
