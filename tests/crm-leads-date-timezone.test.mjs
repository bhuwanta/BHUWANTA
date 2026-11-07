import test from 'node:test'
import assert from 'node:assert/strict'

test('CRM Leads Date Filter: IST Normalization isolates exact calendar days', () => {
  // Test selected date: 24th October 2026
  const startDate = '2026-10-24'
  const endDate = '2026-10-24'

  const dateOnlyStart = startDate.split('T')[0].trim()
  const dateOnlyEnd = endDate.split('T')[0].trim()

  const startIst = new Date(`${dateOnlyStart}T00:00:00+05:30`)
  const endIst = new Date(`${dateOnlyEnd}T23:59:59.999+05:30`)

  // In UTC (what Supabase receives):
  assert.equal(startIst.toISOString(), '2026-10-23T18:30:00.000Z')
  assert.equal(endIst.toISOString(), '2026-10-24T18:29:59.999Z')

  // Lead from user screenshot 1: Chandu (Oct 25, 2026, 05:27 AM IST)
  // In UTC: 2026-10-24T23:57:00.000Z
  const lead1Utc = new Date('2026-10-25T05:27:00+05:30').toISOString()
  assert.equal(lead1Utc, '2026-10-24T23:57:00.000Z')

  // Lead from user screenshot 2: Eidmohmmad Sheikh (Oct 25, 2026, 02:55 AM IST)
  // In UTC: 2026-10-24T21:25:00.000Z
  const lead2Utc = new Date('2026-10-25T02:55:00+05:30').toISOString()
  assert.equal(lead2Utc, '2026-10-24T21:25:00.000Z')

  // Lead from Oct 24 early morning: (Oct 24, 2026, 02:15 AM IST)
  // In UTC: 2026-10-23T20:45:00.000Z
  const lead3Utc = new Date('2026-10-24T02:15:00+05:30').toISOString()
  assert.equal(lead3Utc, '2026-10-23T20:45:00.000Z')

  // Verify that filtering by Oct 24:
  // 1. MUST NOT include Lead 1 (Oct 25)
  assert.equal(lead1Utc >= startIst.toISOString() && lead1Utc <= endIst.toISOString(), false)
  // 2. MUST NOT include Lead 2 (Oct 25)
  assert.equal(lead2Utc >= startIst.toISOString() && lead2Utc <= endIst.toISOString(), false)
  // 3. MUST include Lead 3 (Oct 24 early morning)
  assert.equal(lead3Utc >= startIst.toISOString() && lead3Utc <= endIst.toISOString(), true)

  // Now verify that filtering by Oct 25 includes Lead 1 and Lead 2:
  const oct25Start = new Date('2026-10-25T00:00:00+05:30').toISOString()
  const oct25End = new Date('2026-10-25T23:59:59.999+05:30').toISOString()
  assert.equal(lead1Utc >= oct25Start && lead1Utc <= oct25End, true)
  assert.equal(lead2Utc >= oct25Start && lead2Utc <= oct25End, true)
})

test('CRM Leads Search: Sanitizes PostgREST delimiters to prevent HTTP 400 parse errors', () => {
  const sanitize = (query) => query.replace(/[,()"]/g, ' ').replace(/\s+/g, ' ').trim()

  assert.equal(sanitize('John, Doe'), 'John Doe')
  assert.equal(sanitize('Plot 5, Phase 1'), 'Plot 5 Phase 1')
  assert.equal(sanitize('Villa (East)'), 'Villa East')
  assert.equal(sanitize('"Direct Customer"'), 'Direct Customer')
  assert.equal(sanitize('   '), '')
})

test('Recipient Actions: Guards against non-UUID and master-admin-default crashes', () => {
  const isUuid = (id) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)

  assert.equal(isUuid('master-admin-default'), false)
  assert.equal(isUuid('12345'), false)
  assert.equal(isUuid('8afdf3c6-c3c9-4dba-bfac-cc8fc2446e3f'), true)
})

test('Cron Lead Reports: Normalizes WhatsApp recipient phones to pure digits for Meta API', () => {
  const normalizeForMeta = (val) => {
    const raw = String(val || '').replace(/\D/g, '')
    return raw.length === 10 ? `91${raw}` : raw
  }

  assert.equal(normalizeForMeta('+91 98765 43210'), '919876543210')
  assert.equal(normalizeForMeta('9876543210'), '919876543210')
  assert.equal(normalizeForMeta('919876543210'), '919876543210')
})
