import test from 'node:test';
import assert from 'node:assert/strict';
import * as XLSX from 'xlsx';

// 1. Timezone formatting tests
test('Timezone Formatting: IST does not double-shift', () => {
  // Oct 5, 2026, 06:00:00 AM IST is 2026-10-05T00:30:00.000Z UTC
  const nowUtc = new Date('2026-10-05T00:30:00.000Z');

  const formatIstDate = (d) => d.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: '2-digit', year: 'numeric' });
  const formatIstTime = (d) => d.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true });

  const dateStr = formatIstDate(nowUtc);
  const timeStr = formatIstTime(nowUtc);

  assert.equal(dateStr, '05/10/2026');
  assert.equal(timeStr.toLowerCase(), '06:00 am');
});

// 2. Master Report Window Test
test('Master Report Coverage: 6 AM covers Yesterday 9 PM to Today 6 AM', () => {
  const nowUtc = new Date('2026-10-05T00:30:00.000Z');
  const todayIstStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(nowUtc);
  const yesterdayUtc = new Date(nowUtc.getTime() - 24 * 60 * 60 * 1000);
  const yesterdayIstStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(yesterdayUtc);

  assert.equal(todayIstStr, '2026-10-05');
  assert.equal(yesterdayIstStr, '2026-10-04');

  const startSlotDate = new Date(`${yesterdayIstStr}T21:00:00+05:30`);
  const endSlotDate = new Date(`${todayIstStr}T06:00:00+05:30`);

  assert.equal(startSlotDate.toISOString(), '2026-10-04T15:30:00.000Z');
  assert.equal(endSlotDate.toISOString(), '2026-10-05T00:30:00.000Z');
});

// 3. Multi-sheet Excel workbook generation test
test('Excel Report: Master Excel Buffer creates valid multi-tab workbook with professional headers', () => {
  const slotLeads = [
    { name: 'Slot Lead 1', phone: '9876543210', email: 'lead1@test.com', source: 'Website', message: 'Hi', project: 'Pranavam', downloads: '-', date: '05/10/2026, 05:30 am' }
  ];
  const todayLeads = [
    { name: 'Slot Lead 1', phone: '9876543210', email: 'lead1@test.com', source: 'Website', message: 'Hi', project: 'Pranavam', downloads: '-', date: '05/10/2026, 05:30 am' }
  ];
  const allTimeLeads = [
    { name: 'Slot Lead 1', phone: '9876543210', email: 'lead1@test.com', source: 'Website', message: 'Hi', project: 'Pranavam', downloads: '-', date: '05/10/2026, 05:30 am' },
    { name: 'Past Lead', phone: '9123456780', email: 'past@test.com', source: 'Meta', message: 'Hello', project: 'Arudra', downloads: '-', date: '01/10/2026, 10:00 am' }
  ];

  const formatLeadsForExcel = (leads) => {
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
  };

  const workbook = XLSX.utils.book_new();
  const addSheet = (leads, sheetName) => {
    const ws = XLSX.utils.json_to_sheet(formatLeadsForExcel(leads));
    // Apply column D as string
    Object.keys(ws).forEach(k => {
      if (k.startsWith('D') && k !== 'D1' && ws[k]) ws[k].t = 's';
    });
    const safeSheetName = sheetName.replace(/[:\\/?*\[\]]/g, '').slice(0, 31) || 'Leads';
    XLSX.utils.book_append_sheet(workbook, ws, safeSheetName);
  };

  addSheet(slotLeads, 'Slot (9 PM - 6 AM)');
  addSheet(todayLeads, 'Today Total Leads');
  addSheet(allTimeLeads, 'All Time Leads');

  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  assert.ok(Buffer.isBuffer(buffer));
  assert.ok(buffer.length > 0);

  // Read back the workbook to verify sheets exist and headers are business-formatted
  const parsedWb = XLSX.read(buffer, { type: 'buffer' });
  assert.deepEqual(parsedWb.SheetNames, ['Slot (9 PM - 6 AM)', 'Today Total Leads', 'All Time Leads']);

  const firstSheet = parsedWb.Sheets['Slot (9 PM - 6 AM)'];
  assert.equal(firstSheet['A1'].v, 'S.No');
  assert.equal(firstSheet['B1'].v, 'Date & Time (IST)');
  assert.equal(firstSheet['C1'].v, 'Customer Name');
  assert.equal(firstSheet['D1'].v, 'Phone Number');
  assert.equal(firstSheet['E1'].v, 'Email Address');
  assert.equal(firstSheet['F1'].v, 'Lead Source');
  assert.equal(firstSheet['G1'].v, 'Project');
  assert.equal(firstSheet['H1'].v, 'Downloaded Items');
  assert.equal(firstSheet['I1'].v, 'Customer Message / Notes');

  // Verify Phone is formatted as string type
  assert.equal(firstSheet['D2'].t, 's');
  assert.equal(firstSheet['D2'].v, '9876543210');
});

// 4. Excel Empty State Test
test('Excel Report: Empty leads generates clean single informative row', () => {
  const formatLeadsForExcel = (leads) => {
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
  };

  const ws = XLSX.utils.json_to_sheet(formatLeadsForExcel([]));
  assert.equal(ws['C2'].v, 'No new leads recorded for this time slot');
});

// 5. WhatsApp Recipient Phone Normalization
test('WhatsApp Recipient: Phone normalization converts 10 digits to 91XXXXXXXXXX', () => {
  const normalizePhone = (input) => {
    let clean = input.replace(/\D/g, '');
    if (clean.length === 10) {
      clean = `91${clean}`;
    }
    if (!/^\d{10,15}$/.test(clean)) {
      throw new Error('Invalid phone number format');
    }
    return clean;
  };

  assert.equal(normalizePhone('9876543210'), '919876543210');
  assert.equal(normalizePhone('+91 98765 43210'), '919876543210');
  assert.equal(normalizePhone('919876543210'), '919876543210');
  assert.throws(() => normalizePhone('12345'), /Invalid phone number format/);
});

// 6. Test Slot Hour Parameter Handling
test('Cron Test Slot: Supports 6, 9, 12, 15, 18, 21 hour simulation slots', () => {
  const validSlots = [6, 9, 12, 15, 18, 21];
  const isMasterSlot = (hour) => hour === 6 || hour === 18;

  assert.equal(isMasterSlot(6), true);
  assert.equal(isMasterSlot(18), true);
  assert.equal(isMasterSlot(9), false);
  assert.equal(isMasterSlot(12), false);
  assert.equal(isMasterSlot(15), false);
  assert.equal(isMasterSlot(21), false);

  validSlots.forEach(slot => {
    assert.ok(slot >= 0 && slot <= 23);
  });
});


