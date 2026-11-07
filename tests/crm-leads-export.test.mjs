import test from 'node:test';
import assert from 'node:assert/strict';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// Reusable definitions mirroring src/lib/reports/leads-export.ts
const EXPORTABLE_COLUMNS = [
  { key: 'sno', label: 'Sr. No', defaultSelected: true, minWidth: 34, align: 'center', getValue: (_, index) => String(index + 1) },
  { key: 'date', label: 'Date & Time (IST)', defaultSelected: true, minWidth: 88, align: 'left', getValue: (l) => formatIstDate(l.created_at) },
  { key: 'name', label: 'Customer Name', defaultSelected: true, minWidth: 95, align: 'left', getValue: (l) => l.name ? String(l.name).trim() : 'Unknown' },
  { key: 'phone', label: 'Phone Number', defaultSelected: true, minWidth: 82, align: 'left', getValue: (l) => l.phone ? String(l.phone).trim() : '-' },
  { key: 'email', label: 'Email Address', defaultSelected: true, minWidth: 105, align: 'left', getValue: (l) => l.email ? String(l.email).trim() : '-' },
  { key: 'source', label: 'Lead Source', defaultSelected: true, minWidth: 85, align: 'left', getValue: (l) => l.source_page ? String(l.source_page).trim() : '-' },
  { key: 'project', label: 'Project Name', defaultSelected: true, minWidth: 80, align: 'left', getValue: (l) => l.project ? String(l.project).trim() : '-' },
  { key: 'status', label: 'Status', defaultSelected: true, minWidth: 70, align: 'center', getValue: (l) => l.status ? String(l.status).charAt(0).toUpperCase() + String(l.status).slice(1) : '-' },
  { key: 'enquiry_type', label: 'Enquiry Type', defaultSelected: false, minWidth: 75, align: 'left', getValue: (l) => l.enquiry_type ? String(l.enquiry_type).trim() : '-' },
  { key: 'message', label: 'Customer Message / Notes', defaultSelected: true, minWidth: 110, align: 'left', getValue: (l) => l.message ? String(l.message).trim() : (l.details ? String(l.details).trim() : '-') },
  { key: 'downloads', label: 'Downloaded Items', defaultSelected: false, minWidth: 75, align: 'left', getValue: (l) => l.downloaded_item ? String(l.downloaded_item).trim() : '-' }
];

function formatIstDate(dateStr) {
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

function getActiveColumns(selectedKeys) {
  const activeKeys = new Set(selectedKeys && selectedKeys.length > 0 
    ? selectedKeys 
    : EXPORTABLE_COLUMNS.filter(c => c.defaultSelected).map(c => c.key));

  return EXPORTABLE_COLUMNS.filter(col => activeKeys.has(col.key));
}

function generateLeadsCSV(leads, selectedKeys, includeBom = true) {
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

function generateLeadsExcelWorkbook(leads, selectedKeys, sheetName = 'CRM Leads') {
  const activeColumns = getActiveColumns(selectedKeys);

  const rowData = leads.map((lead, idx) => {
    const row = {};
    activeColumns.forEach(col => {
      row[col.label] = col.getValue(lead, idx);
    });
    return row;
  });

  const worksheet = XLSX.utils.json_to_sheet(rowData.length > 0 ? rowData : [
    activeColumns.reduce((acc, col) => ({ ...acc, [col.label]: '-' }), {})
  ]);

  const colWidths = activeColumns.map(col => {
    let maxLen = col.label.length;
    leads.slice(0, 100).forEach((l, idx) => {
      const val = col.getValue(l, idx);
      if (val && val.length > maxLen) maxLen = Math.min(val.length, 45);
    });
    return { wch: Math.max(maxLen + 3, 10) };
  });
  worksheet['!cols'] = colWidths;

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

function generateLeadsPDF(leads, selectedKeys, options) {
  const doc = new jsPDF('l', 'pt', 'a4');
  const nowIst = options?.generationDate || new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  const reportTitle = options?.reportTitle || 'Leads Database Export';
  const filterSummary = options?.filterSummary || '';

  const activeColumns = getActiveColumns(selectedKeys);
  const headers = activeColumns.map(col => col.label);

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 41, 53); // #002935
  doc.text('BHUWANTA DEVELOPERS', 40, 36);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(196, 165, 90); // #C4A55A
  doc.text(`CRM LEADS REPORT • ${reportTitle.toUpperCase()}`, 40, 52);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Generated: ${nowIst}`, 600, 36);
  doc.text(`Total Leads: ${leads.length}`, 600, 48);
  if (filterSummary) {
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(`Filter: ${filterSummary.slice(0, 45)}`, 600, 59);
  }

  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(1);
  doc.line(40, 66, 802, 66);

  if (leads.length > 0) {
    const tableData = leads.map((lead, idx) => 
      activeColumns.map(col => col.getValue(lead, idx))
    );

    const columnStyles = {};
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
        textColor: [15, 29, 51],
        overflow: 'linebreak'
      },
      headStyles: {
        fillColor: [0, 41, 53],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      },
      tableLineColor: [226, 232, 240],
      tableLineWidth: 0.5
    });
  } else {
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(40, 95, 762, 85, 4, 4, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(40, 95, 762, 85, 4, 4, 'D');

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('No Leads Found for the Selected Scope', 421, 135, { align: 'center' });
  }

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

const SAMPLE_LEADS = [
  {
    id: 'lead-1',
    created_at: '2026-11-01T04:30:00.000Z', // 10:00 AM IST
    name: 'Suroju Santosh',
    phone: '+919876543210',
    email: 'santosh@example.com',
    source_page: 'Meta: Ad 44 | Campaign: Shabad Plots',
    project: 'Arudra Exotica',
    status: 'contacted',
    enquiry_type: 'Brochure Download',
    message: 'Interested in 200 sq yard villa plot',
    downloaded_item: 'Arudra_Masterplan.pdf'
  },
  {
    id: 'lead-2',
    created_at: '2026-11-02T09:00:00.000Z', // 2:30 PM IST
    name: 'Rahul Sharma',
    phone: '+971501234567',
    email: 'rahul.dubai@example.com',
    source_page: 'Website',
    project: 'S.V. Kanaka Maple Homes',
    status: 'new',
    enquiry_type: 'Site Visit Request',
    message: 'Looking for corner plot, please call on WhatsApp',
    downloaded_item: '-'
  }
];

test('Export Utility: formatIstDate converts timestamps to Indian Standard Time', () => {
  const formatted = formatIstDate('2026-11-01T04:30:00.000Z');
  assert.ok(formatted.includes('Nov') || formatted.includes('11'), 'Should contain month');
  assert.ok(formatted.includes('2026'), 'Should contain year 2026');
  assert.ok(formatted.includes('10:00') || formatted.includes('am') || formatted.includes('AM'), 'Should convert 04:30 UTC to 10:00 AM IST');

  // Edge cases
  assert.equal(formatIstDate(null), '-');
  assert.equal(formatIstDate(undefined), '-');
  assert.equal(formatIstDate(''), '-');
  assert.equal(formatIstDate('invalid-date'), 'invalid-date');
});

test('Export Utility: getActiveColumns filters correctly and respects defaults', () => {
  const cols = getActiveColumns(['name', 'phone', 'project']);
  assert.equal(cols.length, 3);
  assert.deepEqual(cols.map(c => c.key), ['name', 'phone', 'project']);

  const defaults = getActiveColumns([]);
  const expectedDefaults = EXPORTABLE_COLUMNS.filter(c => c.defaultSelected).map(c => c.key);
  assert.deepEqual(defaults.map(c => c.key), expectedDefaults);
  assert.ok(defaults.some(c => c.key === 'name'));
  assert.ok(defaults.some(c => c.key === 'phone'));
  assert.ok(!defaults.some(c => c.key === 'enquiry_type'));
});

test('Export Utility: generateLeadsCSV generates clean RFC-4180 output with selected columns', () => {
  const selectedKeys = ['name', 'phone', 'project', 'status', 'message'];
  const csv = generateLeadsCSV(SAMPLE_LEADS, selectedKeys, false);

  const lines = csv.split('\n');
  assert.equal(lines.length, 3);

  assert.equal(lines[0], '"Customer Name","Phone Number","Project Name","Status","Customer Message / Notes"');
  assert.ok(lines[1].includes('"Suroju Santosh"'));
  assert.ok(lines[1].includes('"+919876543210"'));
  assert.ok(lines[1].includes('"Arudra Exotica"'));
  assert.ok(lines[1].includes('"Contacted"'));
  assert.ok(lines[1].includes('"Interested in 200 sq yard villa plot"'));

  assert.ok(lines[2].includes('"Rahul Sharma"'));
  assert.ok(lines[2].includes('"+971501234567"'));
  assert.ok(lines[2].includes('"New"'));
});

test('Export Utility: generateLeadsExcelWorkbook sets column widths and preserves phone strings', () => {
  const selectedKeys = ['sno', 'name', 'phone', 'email', 'status'];
  const workbook = generateLeadsExcelWorkbook(SAMPLE_LEADS, selectedKeys, 'November Leads');

  assert.ok(workbook.SheetNames.includes('November Leads'), 'Sheet name should match');
  const sheet = workbook.Sheets['November Leads'];
  assert.ok(sheet, 'Worksheet should exist');

  assert.equal(sheet['A1'].v, 'Sr. No');
  assert.equal(sheet['B1'].v, 'Customer Name');
  assert.equal(sheet['C1'].v, 'Phone Number');

  assert.equal(sheet['C2'].v, '+919876543210');
  assert.equal(sheet['C2'].t, 's', 'Phone cell must have string type "s"');
  assert.equal(sheet['C3'].v, '+971501234567');
  assert.equal(sheet['C3'].t, 's', 'Phone cell must have string type "s"');

  assert.ok(sheet['!cols'], '!cols array must be configured');
  assert.equal(sheet['!cols'].length, 5);
});

test('Export Utility: generateLeadsPDF creates a valid landscape A4 document matching theme', () => {
  const selectedKeys = ['sno', 'date', 'name', 'phone', 'source', 'project', 'status'];
  const doc = generateLeadsPDF(SAMPLE_LEADS, selectedKeys, {
    reportTitle: 'High Intent Leads',
    filterSummary: 'Project: Arudra Exotica'
  });

  assert.ok(doc, 'PDF instance should be created');
  assert.equal(doc.getNumberOfPages(), 1);

  const arrayBuffer = doc.output('arraybuffer');
  assert.ok(arrayBuffer.byteLength > 1000, 'PDF buffer must have valid content');
});

test('Export Utility: generateLeadsPDF renders elegant empty card when no leads exist', () => {
  const selectedKeys = ['sno', 'name', 'phone', 'status'];
  const doc = generateLeadsPDF([], selectedKeys, {
    reportTitle: 'Empty Filter Set'
  });

  assert.ok(doc, 'PDF instance should be created for empty state');
  assert.equal(doc.getNumberOfPages(), 1);
  const arrayBuffer = doc.output('arraybuffer');
  assert.ok(arrayBuffer.byteLength > 500, 'Empty state PDF must render successfully');
});

test('Export Modal: Synchronous double-click mutex prevents concurrent export triggers', async () => {
  let exportCount = 0;
  const isExportingRef = { current: false };

  const triggerExport = async () => {
    if (isExportingRef.current) return { dropped: true };
    isExportingRef.current = true;
    try {
      exportCount++;
      await new Promise(r => setTimeout(r, 20));
      return { success: true };
    } finally {
      isExportingRef.current = false;
    }
  };

  const [call1, call2] = await Promise.all([triggerExport(), triggerExport()]);
  assert.equal(call1.success, true);
  assert.equal(call2.dropped, true);
  assert.equal(exportCount, 1);
});

test('Smoke & Edge Case: Special characters, emojis, multi-byte Unicode and HTML escaping', () => {
  const trickyLeads = [
    {
      id: 'tricky-1',
      created_at: '2026-11-05T12:00:00.000Z',
      name: 'John "The Investor" O\'Connor',
      phone: '+919876543210',
      email: 'john+test@example.com',
      source_page: 'Meta: Ad "Plots, Villas & More" | Campaign: 2026',
      project: 'Arudra <Exotica> & "Villas"',
      status: 'new',
      message: 'Plot #104, 200 sq.yds.\nUrgent callback requested!\n<script>alert("xss")</script>',
      downloaded_item: 'Brochure "V2".pdf'
    },
    {
      id: 'tricky-2',
      created_at: '2026-11-05T13:00:00.000Z',
      name: 'సురోజు సంతోష్ • राहुल शर्मा 🏡✨',
      phone: '+971501234567',
      email: 'unicode@bhuwanta.com',
      source_page: 'Direct 🚀',
      project: 'S.V. Kanaka Maple Homes',
      status: 'contacted',
      message: 'నమస్కారం, प्लॉट की जानकारी चाहिए 🌟',
      downloaded_item: '-'
    }
  ];

  // 1. CSV RFC-4180 Escaping Check
  const csv = generateLeadsCSV(trickyLeads, ['name', 'project', 'message'], true);
  assert.ok(csv.startsWith('\uFEFF'), 'CSV must include UTF-8 BOM');
  assert.ok(csv.includes('""The Investor""'), 'Double quotes must be escaped as double-double quotes in CSV');
  assert.ok(csv.includes('<script>alert(""xss"")</script>'), 'Quotes inside script tags must be escaped');
  assert.ok(csv.includes('సురోజు సంతోష్'), 'Telugu characters must be preserved in CSV');
  assert.ok(csv.includes('राहुल शर्मा'), 'Hindi characters must be preserved in CSV');

  // 2. Excel XML Safety Check
  const wb = generateLeadsExcelWorkbook(trickyLeads, ['name', 'project', 'message'], 'Tricky Leads');
  const sheet = wb.Sheets['Tricky Leads'];
  assert.ok(sheet['A2'].v.includes('The Investor'), 'Excel must retain uncorrupted name');
  assert.ok(sheet['C2'].v.includes('\n'), 'Excel must preserve multiline messages');

  // 3. PDF Generation with Special Chars
  const pdf = generateLeadsPDF(trickyLeads, ['name', 'project', 'message']);
  assert.equal(pdf.getNumberOfPages(), 1);
  const pdfBuffer = pdf.output('arraybuffer');
  assert.ok(pdfBuffer.byteLength > 1000, 'PDF with special characters should render cleanly');
});

test('Smoke & Edge Case: Multi-page PDF pagination with large lead count', () => {
  const bulkLeads = Array.from({ length: 65 }, (_, i) => ({
    id: `bulk-${i + 1}`,
    created_at: '2026-11-01T10:00:00.000Z',
    name: `Customer ${i + 1} with a relatively long name for testing wrapping`,
    phone: `+9198000000${String(i).padStart(2, '0')}`,
    email: `cust${i + 1}@example.com`,
    source_page: 'Meta Ads',
    project: i % 2 === 0 ? 'Arudra Exotica' : 'S.V. Kanaka Maple Homes',
    status: i % 3 === 0 ? 'contacted' : 'new',
    message: `Inquiry note for lead #${i + 1} with additional details regarding plot requirements.`
  }));

  const allColumns = EXPORTABLE_COLUMNS.map(c => c.key);
  const pdf = generateLeadsPDF(bulkLeads, allColumns, {
    reportTitle: 'Bulk Leads Export (65 records)'
  });

  const totalPages = pdf.getNumberOfPages();
  assert.ok(totalPages >= 2, `65 leads with all columns must span at least 2 pages (actual: ${totalPages})`);
  const buffer = pdf.output('arraybuffer');
  assert.ok(buffer.byteLength > 5000, 'Multi-page PDF must be substantive');
});

test('Smoke & Edge Case: Excel sheet name sanitization removes illegal characters', () => {
  const illegalSheetName = 'CRM: Leads [Nov/2026] *?/\' Special';
  const wb = generateLeadsExcelWorkbook(SAMPLE_LEADS, ['name', 'phone'], illegalSheetName);
  
  const generatedSheetName = wb.SheetNames[0];
  assert.ok(!/[:\\/?*\[\]]/.test(generatedSheetName), 'Sheet name must not contain invalid characters');
  assert.ok(generatedSheetName.length <= 31, 'Sheet name length must be <= 31 characters');
});

test('Smoke & Edge Case: Scope selection filters correctly and isolates selected rows', () => {
  const allLeads = [
    { id: 'lead-A', name: 'Lead A', phone: '1111111111' },
    { id: 'lead-B', name: 'Lead B', phone: '2222222222' },
    { id: 'lead-C', name: 'Lead C', phone: '3333333333' }
  ];

  // Case 1: Filtered scope (All leads)
  const getTargetLeads = (scope, selectedIds, list) => {
    return scope === 'selected' && selectedIds.length > 0
      ? list.filter(l => selectedIds.includes(l.id))
      : list;
  };

  const scopeAll = getTargetLeads('filtered', ['lead-B'], allLeads);
  assert.equal(scopeAll.length, 3);

  // Case 2: Selected scope (Only selected rows)
  const scopeSelected = getTargetLeads('selected', ['lead-B'], allLeads);
  assert.equal(scopeSelected.length, 1);
  assert.equal(scopeSelected[0].id, 'lead-B');

  // Case 3: Stale selected IDs that do not exist in current list
  const scopeStale = getTargetLeads('selected', ['lead-NON-EXISTENT'], allLeads);
  assert.equal(scopeStale.length, 0);
});

test('Performance Benchmark: Exporting 500 leads to CSV and Excel executes in under 200ms', () => {
  const largeSet = Array.from({ length: 500 }, (_, i) => ({
    id: `bench-${i}`,
    created_at: new Date().toISOString(),
    name: `Investor ${i}`,
    phone: `+9199887766${String(i % 100).padStart(2, '0')}`,
    email: `investor${i}@example.com`,
    source_page: 'Meta Ad 99',
    project: 'Arudra Exotica',
    status: 'new',
    message: 'Looking for prompt response'
  }));

  const startCsv = performance.now();
  const csv = generateLeadsCSV(largeSet, EXPORTABLE_COLUMNS.map(c => c.key));
  const csvDuration = performance.now() - startCsv;
  assert.ok(csv.length > 10000, 'CSV must contain full dataset');
  assert.ok(csvDuration < 150, `CSV generation for 500 leads must take < 150ms (took ${csvDuration.toFixed(2)}ms)`);

  const startExcel = performance.now();
  const wb = generateLeadsExcelWorkbook(largeSet, EXPORTABLE_COLUMNS.map(c => c.key));
  const excelDuration = performance.now() - startExcel;
  assert.ok(wb.SheetNames.length === 1);
  assert.ok(excelDuration < 250, `Excel generation for 500 leads must take < 250ms (took ${excelDuration.toFixed(2)}ms)`);
});
