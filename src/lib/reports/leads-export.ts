import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export interface ExportColumnDef {
  key: string;
  label: string;
  defaultSelected: boolean;
  minWidth?: number; // Base width in points for PDF landscape
  align?: 'left' | 'center' | 'right';
  getValue: (lead: any, index: number) => string;
}

export function formatIstDate(dateStr: string | Date | undefined | null): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    const datePart = d.toLocaleDateString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
    const timePart = d.toLocaleTimeString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
    return `${datePart}, ${timePart}`;
  } catch {
    return String(dateStr);
  }
}

export const EXPORTABLE_COLUMNS: ExportColumnDef[] = [
  {
    key: 'sno',
    label: 'Sr. No',
    defaultSelected: true,
    minWidth: 34,
    align: 'center',
    getValue: (_, index) => String(index + 1)
  },
  {
    key: 'date',
    label: 'Date & Time (IST)',
    defaultSelected: true,
    minWidth: 88,
    align: 'left',
    getValue: (lead) => formatIstDate(lead.created_at)
  },
  {
    key: 'name',
    label: 'Customer Name',
    defaultSelected: true,
    minWidth: 95,
    align: 'left',
    getValue: (lead) => lead.name ? String(lead.name).trim() : 'Unknown'
  },
  {
    key: 'phone',
    label: 'Phone Number',
    defaultSelected: true,
    minWidth: 82,
    align: 'left',
    getValue: (lead) => lead.phone ? String(lead.phone).trim() : '-'
  },
  {
    key: 'email',
    label: 'Email Address',
    defaultSelected: true,
    minWidth: 105,
    align: 'left',
    getValue: (lead) => lead.email ? String(lead.email).trim() : '-'
  },
  {
    key: 'source',
    label: 'Lead Source',
    defaultSelected: true,
    minWidth: 85,
    align: 'left',
    getValue: (lead) => lead.source_page ? String(lead.source_page).trim() : '-'
  },
  {
    key: 'project',
    label: 'Project Name',
    defaultSelected: true,
    minWidth: 80,
    align: 'left',
    getValue: (lead) => lead.project ? String(lead.project).trim() : '-'
  },
  {
    key: 'status',
    label: 'Status',
    defaultSelected: true,
    minWidth: 70,
    align: 'center',
    getValue: (lead) => {
      if (!lead.status) return '-';
      const s = String(lead.status).trim();
      return s.charAt(0).toUpperCase() + s.slice(1);
    }
  },
  {
    key: 'enquiry_type',
    label: 'Enquiry Type',
    defaultSelected: false,
    minWidth: 75,
    align: 'left',
    getValue: (lead) => lead.enquiry_type ? String(lead.enquiry_type).trim() : '-'
  },
  {
    key: 'message',
    label: 'Customer Message / Notes',
    defaultSelected: true,
    minWidth: 110,
    align: 'left',
    getValue: (lead) => {
      const msg = lead.message || lead.details || '';
      return msg ? String(msg).trim() : '-';
    }
  },
  {
    key: 'downloads',
    label: 'Downloaded Items',
    defaultSelected: false,
    minWidth: 75,
    align: 'left',
    getValue: (lead) => lead.downloaded_item ? String(lead.downloaded_item).trim() : '-'
  }
];

export interface ExportPDFOptions {
  reportTitle?: string;
  filterSummary?: string;
  generationDate?: string;
}

/**
 * Filter columns according to user's selections.
 * Falls back to defaultSelected columns if selectedKeys is empty.
 */
export function getActiveColumns(selectedKeys: string[]): ExportColumnDef[] {
  const activeKeys = new Set(selectedKeys.length > 0 
    ? selectedKeys 
    : EXPORTABLE_COLUMNS.filter(c => c.defaultSelected).map(c => c.key));

  return EXPORTABLE_COLUMNS.filter(col => activeKeys.has(col.key));
}

/**
 * Generates an executive jsPDF document in landscape A4 matching the Bhuwanta theme.
 */
export function generateLeadsPDF(
  leads: any[],
  selectedKeys: string[],
  options?: ExportPDFOptions
): jsPDF {
  const doc = new jsPDF('l', 'pt', 'a4');
  const nowIst = options?.generationDate || new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  const reportTitle = options?.reportTitle || 'Leads Database Export';
  const filterSummary = options?.filterSummary || '';

  const activeColumns = getActiveColumns(selectedKeys);
  const headers = activeColumns.map(col => col.label);

  // 1. Executive Brand Header (Bhuwanta Navy #002935 & Gold #C4A55A)
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 41, 53); // #002935 Deep Navy
  doc.text('BHUWANTA DEVELOPERS', 40, 36);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(196, 165, 90); // #C4A55A Gold Accent
  doc.text(`CRM LEADS REPORT • ${reportTitle.toUpperCase()}`, 40, 52);

  // Right-aligned Metadata Block
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139); // Slate-500
  doc.text(`Generated: ${nowIst}`, 600, 36);
  doc.text(`Total Leads: ${leads.length}`, 600, 48);
  if (filterSummary) {
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(`Filter: ${filterSummary.slice(0, 45)}`, 600, 59);
  }

  // Divider line
  doc.setDrawColor(226, 232, 240); // #E2E8F0
  doc.setLineWidth(1);
  doc.line(40, 66, 802, 66);

  if (leads.length > 0) {
    // 2. Format Table Rows based on selected columns
    const tableData = leads.map((lead, idx) => 
      activeColumns.map(col => col.getValue(lead, idx))
    );

    // Map alignment per column
    const columnStyles: Record<number, any> = {};
    activeColumns.forEach((col, idx) => {
      columnStyles[idx] = {
        halign: col.align || 'left',
      };
    });

    autoTable(doc, {
      startY: 76,
      tableWidth: 'auto',
      margin: { top: 76, bottom: 45, left: 40, right: 40 },
      head: [headers],
      body: tableData,
      columnStyles,
      styles: {
        fontSize: 7.5,
        cellPadding: 4.5,
        textColor: [15, 29, 51], // #0F1D33
        overflow: 'linebreak'
      },
      headStyles: {
        fillColor: [0, 41, 53], // #002935
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252] // #F8FAFC
      },
      tableLineColor: [226, 232, 240],
      tableLineWidth: 0.5
    });
  } else {
    // Elegant Empty State
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(40, 95, 762, 85, 4, 4, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(40, 95, 762, 85, 4, 4, 'D');

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('No Leads Found for the Selected Scope', 421, 135, { align: 'center' });

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('Adjust filters or date range in the CRM to view and export records.', 421, 153, { align: 'center' });
  }

  // 3. Multi-page Footer
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(40, 565, 802, 565);

    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text('Bhuwanta Developers • Confidential Internal CRM Export', 40, 578);
    doc.text(`Page ${i} of ${totalPages}`, 755, 578);
  }

  return doc;
}

/**
 * Triggers a client-side download of the styled PDF.
 */
export function exportLeadsToPDF(
  leads: any[],
  selectedKeys: string[],
  filename = `bhuwanta_leads_${new Date().toISOString().split('T')[0]}.pdf`,
  options?: ExportPDFOptions
): void {
  const doc = generateLeadsPDF(leads, selectedKeys, options);
  doc.save(filename);
}

/**
 * Generates an XLSX workbook for the selected columns with auto column widths and string preservation.
 */
export function generateLeadsExcelWorkbook(
  leads: any[],
  selectedKeys: string[],
  sheetName = 'CRM Leads'
): XLSX.WorkBook {
  const activeColumns = getActiveColumns(selectedKeys);

  const rowData = leads.map((lead, idx) => {
    const row: Record<string, any> = {};
    activeColumns.forEach(col => {
      row[col.label] = col.getValue(lead, idx);
    });
    return row;
  });

  const worksheet = XLSX.utils.json_to_sheet(rowData.length > 0 ? rowData : [
    activeColumns.reduce((acc, col) => ({ ...acc, [col.label]: '-' }), {})
  ]);

  // Apply column width auto-calculation
  const colWidths = activeColumns.map(col => {
    let maxLen = col.label.length;
    leads.slice(0, 100).forEach((l, idx) => {
      const val = col.getValue(l, idx);
      if (val && val.length > maxLen) maxLen = Math.min(val.length, 45);
    });
    return { wch: Math.max(maxLen + 3, 10) };
  });
  worksheet['!cols'] = colWidths;

  // Enforce Phone Number column as string type to prevent scientific notation
  const phoneColIndex = activeColumns.findIndex(c => c.key === 'phone');
  if (phoneColIndex !== -1) {
    const colLetter = XLSX.utils.encode_col(phoneColIndex);
    Object.keys(worksheet).forEach(cellKey => {
      if (cellKey.startsWith(colLetter) && cellKey !== `${colLetter}1`) {
        if (worksheet[cellKey]) {
          worksheet[cellKey].t = 's';
        }
      }
    });
  }

  const workbook = XLSX.utils.book_new();
  const safeSheetName = sheetName.replace(/[:\\/?*\[\]]/g, '').slice(0, 31) || 'Leads';
  XLSX.utils.book_append_sheet(workbook, worksheet, safeSheetName);

  return workbook;
}

/**
 * Triggers a client-side download of the styled Excel workbook.
 */
export function exportLeadsToExcel(
  leads: any[],
  selectedKeys: string[],
  filename = `bhuwanta_leads_${new Date().toISOString().split('T')[0]}.xlsx`,
  sheetName = 'CRM Leads'
): void {
  const workbook = generateLeadsExcelWorkbook(leads, selectedKeys, sheetName);
  XLSX.writeFile(workbook, filename);
}

/**
 * Generates an RFC-4180 compliant CSV string for the selected columns.
 */
export function generateLeadsCSV(
  leads: any[],
  selectedKeys: string[],
  includeBom = true
): string {
  const activeColumns = getActiveColumns(selectedKeys);
  const headerRow = activeColumns.map(col => `"${col.label.replace(/"/g, '""')}"`).join(',');

  const rows = leads.map((lead, idx) => {
    return activeColumns.map(col => {
      const val = col.getValue(lead, idx) || '';
      return `"${val.replace(/"/g, '""')}"`;
    }).join(',');
  });

  const csv = [headerRow, ...rows].join('\n');
  return includeBom ? '\uFEFF' + csv : csv;
}

/**
 * Triggers a client-side download of the CSV file.
 */
export function exportLeadsToCSV(
  leads: any[],
  selectedKeys: string[],
  filename = `bhuwanta_leads_${new Date().toISOString().split('T')[0]}.csv`
): void {
  const csvContent = generateLeadsCSV(leads, selectedKeys);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
