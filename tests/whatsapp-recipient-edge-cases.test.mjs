import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import ts from 'typescript'

const require = createRequire(import.meta.url)
const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')

function loadSource(relativePath, mocks = {}) {
  const loaded = { exports: {} }
  const code = ts.transpileModule(readFileSync(resolve(repositoryRoot, relativePath), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText
  const localRequire = name => {
    if (Object.hasOwn(mocks, name)) return mocks[name]
    if (name.startsWith('@/')) return loadSource(`src/${name.slice(2)}.ts`, mocks)
    return require(name)
  }
  new Function('require', 'module', 'exports', code)(localRequire, loaded, loaded.exports)
  return loaded.exports
}

const {
  normalizeWaRecipientPhone,
  extractTenDigitWaPhone,
  normalizeWaReportTimings,
  toggleWaReportTiming,
  ALL_WA_REPORT_SLOTS
} = loadSource('src/lib/phone-input.ts')

// --- Test Suite 1: Phone Normalization for Add & Edit ---
test('WhatsApp Recipient: normalizeWaRecipientPhone accepts and normalizes valid Indian mobile numbers', () => {
  const validInputs = [
    { input: '9666618683', expected: '919666618683', national: '9666618683' },
    { input: '919666618683', expected: '919666618683', national: '9666618683' },
    { input: '+919666618683', expected: '919666618683', national: '9666618683' },
    { input: '+91 96666 18683', expected: '919666618683', national: '9666618683' },
    { input: '+91-96666-18683', expected: '919666618683', national: '9666618683' },
    { input: '09666618683', expected: '919666618683', national: '9666618683' },
    { input: '00919666618683', expected: '919666618683', national: '9666618683' },
    { input: '6305126335', expected: '916305126335', national: '6305126335' },
    { input: '7013456789', expected: '917013456789', national: '7013456789' },
    { input: '8123456789', expected: '918123456789', national: '8123456789' },
  ]

  for (const { input, expected, national } of validInputs) {
    const res = normalizeWaRecipientPhone(input)
    assert.equal(res.valid, true, `Expected valid for ${input}`)
    assert.equal(res.phone, expected, `Expected ${expected} for ${input}`)
    assert.equal(res.nationalNumber, national, `Expected national ${national} for ${input}`)
  }
})

test('WhatsApp Recipient: normalizeWaRecipientPhone rejects invalid phone numbers with clear messages', () => {
  const invalidInputs = [
    { input: '', errorContains: 'required' },
    { input: '   ', errorContains: 'valid' },
    { input: '12345', errorContains: '10 digits' },
    { input: '966661868', errorContains: '10 digits' }, // 9 digits
    { input: '966661868300', errorContains: '10 digits' }, // 12 digits without 91
    { input: '5966618683', errorContains: 'start with 6, 7, 8, or 9' }, // Landline / invalid mobile prefix
    { input: '1234567890', errorContains: 'start with 6, 7, 8, or 9' },
    { input: 'abcdefghij', errorContains: 'valid' },
  ]

  for (const { input, errorContains } of invalidInputs) {
    const res = normalizeWaRecipientPhone(input)
    assert.equal(res.valid, false, `Expected invalid for ${input}`)
    assert.ok(res.error && res.error.toLowerCase().includes(errorContains.toLowerCase()), `Error "${res.error}" should contain "${errorContains}"`)
  }
})

// --- Test Suite 2: Edit Input Phone Extraction ---
test('WhatsApp Recipient: extractTenDigitWaPhone extracts exact 10 digits for edit inputs', () => {
  assert.equal(extractTenDigitWaPhone('919666618683'), '9666618683')
  assert.equal(extractTenDigitWaPhone('+919666618683'), '9666618683')
  assert.equal(extractTenDigitWaPhone('+91 96666-18683'), '9666618683')
  assert.equal(extractTenDigitWaPhone('09666618683'), '9666618683')
  assert.equal(extractTenDigitWaPhone('9666618683'), '9666618683')
  assert.equal(extractTenDigitWaPhone(''), '')
  assert.equal(extractTenDigitWaPhone(null), '')
  assert.equal(extractTenDigitWaPhone(undefined), '')
})

// --- Test Suite 3: Timing Slots Normalization ---
test('WhatsApp Recipient: normalizeWaReportTimings purges legacy slots and defaults safely', () => {
  const allSlots = ['6', '9', '12', '15', '18', '21']
  assert.deepEqual(ALL_WA_REPORT_SLOTS, allSlots)

  // 1. Defaults when empty or null
  assert.deepEqual(normalizeWaReportTimings([]), allSlots)
  assert.deepEqual(normalizeWaReportTimings(null), allSlots)
  assert.deepEqual(normalizeWaReportTimings(undefined), allSlots)

  // 2. Cleans legacy migration default slots ['10:00', '13:00', '17:00', '20:00']
  assert.deepEqual(normalizeWaReportTimings(['10:00', '13:00', '17:00', '20:00']), allSlots)

  // 3. Filters mixed legacy and active slots (e.g. from previous edit)
  assert.deepEqual(
    normalizeWaReportTimings(['10:00', '13:00', '17:00', '20:00', '9', '18']),
    ['9', '18']
  )

  // 4. Preserves active slots
  assert.deepEqual(normalizeWaReportTimings(['6', '12', '18']), ['6', '12', '18'])
})

// --- Test Suite 4: Timing Slot Toggle Edge Cases ---
test('WhatsApp Recipient: toggleWaReportTiming toggles cleanly without freezing empty state', () => {
  const allSlots = ['6', '9', '12', '15', '18', '21']

  // Deselecting slot '6' when timings is empty (all-selected default)
  const afterDeselect6 = toggleWaReportTiming([], '6')
  assert.deepEqual(afterDeselect6, ['9', '12', '15', '18', '21'])

  // Deselecting slot '18' from the result above
  const afterDeselect18 = toggleWaReportTiming(afterDeselect6, '18')
  assert.deepEqual(afterDeselect18, ['9', '12', '15', '21'])

  // Re-selecting slot '6'
  const afterReselect6 = toggleWaReportTiming(afterDeselect18, '6')
  assert.deepEqual(afterReselect6, ['9', '12', '15', '21', '6'])

  // Toggling from legacy array
  const fromLegacy = toggleWaReportTiming(['10:00', '13:00', '17:00', '20:00', '9', '18'], '9')
  assert.deepEqual(fromLegacy, ['18'])
})

// --- Test Suite 5: Multi-Device Concurrency & Duplicate Protection Simulation ---
test('WhatsApp Recipient: Multi-device phone update validation detects collisions', () => {
  const existingRecipients = [
    { id: 'uuid-1', phone_number: '919550511549', name: 'S Trinadh' },
    { id: 'uuid-2', phone_number: '919000008479', name: 'S Shiva Kumar' },
    { id: 'uuid-3', phone_number: '916305126335', name: 'S Santosh' },
    { id: 'uuid-4', phone_number: '919666618683', name: 'Ramakrishna Reddy' },
  ]

  // Scenario A: Editing uuid-4 but keeping the same phone number (changing name or timings)
  const editSelf = normalizeWaRecipientPhone('9666618683')
  const collisionSelf = existingRecipients.find(r => r.phone_number === editSelf.phone && r.id !== 'uuid-4')
  assert.equal(collisionSelf, undefined, 'Editing own recipient must not trigger duplicate error')

  // Scenario B: Editing uuid-4 to a phone number owned by uuid-1
  const editConflict = normalizeWaRecipientPhone('9550511549')
  const collisionConflict = existingRecipients.find(r => r.phone_number === editConflict.phone && r.id !== 'uuid-4')
  assert.ok(collisionConflict, 'Must detect duplicate phone number from another recipient')
  assert.equal(collisionConflict.name, 'S Trinadh')

  // Scenario C: Editing uuid-4 to a brand new unique number
  const editNew = normalizeWaRecipientPhone('9888877777')
  const collisionNew = existingRecipients.find(r => r.phone_number === editNew.phone && r.id !== 'uuid-4')
  assert.equal(collisionNew, undefined, 'Unique number has no collision')
})
