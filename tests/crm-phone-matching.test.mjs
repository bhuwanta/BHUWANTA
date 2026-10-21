import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { after, test } from 'node:test'
import ts from 'typescript'

const require = createRequire(import.meta.url)
const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const originalFetch = globalThis.fetch
globalThis.fetch = async () => {
  throw new Error('CRM phone regression tests must never call a live API')
}
after(() => { globalThis.fetch = originalFetch })

function loadSource(relativePath, mocks = {}) {
  const filename = resolve(repositoryRoot, relativePath)
  const loadedModule = { exports: {} }
  const code = ts.transpileModule(readFileSync(filename, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
  }).outputText
  function localRequire(name) {
    if (Object.hasOwn(mocks, name)) return mocks[name]
    if (name.startsWith('@/')) return loadSource(`src/${name.slice(2)}.ts`, mocks)
    return require(name)
  }
  new Function('require', 'module', 'exports', code)(localRequire, loadedModule, loadedModule.exports)
  return loadedModule.exports
}

const { canonicalPhoneNumber, phoneNumberStorageVariants } = loadSource('src/lib/phone-input.ts')

// Small in-memory Supabase boundary: the real action/helper chooses the rows,
// while all reads, inserts and updates stay inside these test fixtures.
function crmFixture(initialLeads, { candidateError = null } = {}) {
  const tables = { leads: structuredClone(initialLeads), lead_activities: [] }
  const client = {
    from(table) {
      let operation = 'read'
      let payload
      let isCandidateRead = false
      const filters = []
      const orders = []
      let rowLimit = Infinity
      const query = {
        select() { return query },
        eq(column, value) { filters.push(row => row[column] === value); return query },
        in(column, values) { filters.push(row => values.includes(row[column])); return query },
        ilike(column, pattern) {
          assert.match(pattern, /^[%\d]+$/, 'Candidate queries must contain only digits and wildcards')
          const expression = new RegExp(pattern.replace(/%/g, '.*'), 'i')
          filters.push(row => expression.test(row[column] || ''))
          isCandidateRead = true
          return query
        },
        order(column, { ascending }) { orders.push({ column, ascending }); return query },
        limit(value) { rowLimit = value; return query },
        update(value) { operation = 'update'; payload = value; return query },
        insert(value) { operation = 'insert'; payload = value; return query },
        async single() { return execute(true) },
        async maybeSingle() { return execute(true) },
        then(onFulfilled, onRejected) { return Promise.resolve(execute(false)).then(onFulfilled, onRejected) },
      }
      function execute(single) {
        if (operation === 'read' && isCandidateRead && candidateError) {
          return { data: null, error: { message: candidateError } }
        }
        let rows = tables[table].filter(row => filters.every(matches => matches(row)))
        rows.sort((a, b) => {
          for (const { column, ascending } of orders) {
            if (a[column] !== b[column]) {
              const result = a[column] < b[column] ? -1 : 1
              return ascending ? result : -result
            }
          }
          return 0
        })
        rows = rows.slice(0, rowLimit)
        if (operation === 'update') rows.forEach(row => Object.assign(row, payload))
        if (operation === 'insert') {
          rows = (Array.isArray(payload) ? payload : [payload]).map((row, index) => ({
            id: `offline-${table}-${tables[table].length + index}`,
            ...row,
          }))
          tables[table].push(...rows)
        }
        if (single && rows.length > 1) return { data: null, error: { message: 'Multiple rows' } }
        return { data: single ? (rows[0] || null) : rows, error: null }
      }
      return query
    },
  }
  const mocks = {
    '@/lib/supabase/server': { createClient: async () => client },
    '@supabase/supabase-js': { createClient: () => client },
    'next/cache': { revalidatePath() {} },
    '@/lib/lead-attribution': { whatsappSourceHint: () => false },
  }
  return {
    tables,
    actions: loadSource('src/app/(CRM_SOFTWARE)/crm/leads/actions.ts', mocks),
    whatsapp: loadSource('src/lib/whatsapp/crm.ts', mocks),
  }
}

const lead = (id, phone, created_at = '2026-10-20T00:00:00.000Z') => ({
  id, phone, created_at, name: 'Offline fixture', status: 'new', bot_interactions_count: 1,
})

test('phone aliases preserve the country and support E.164, WhatsApp and legacy Indian formats', () => {
  assert.equal(canonicalPhoneNumber('971501234567'), '+971501234567')
  const uae = phoneNumberStorageVariants('+971501234567')
  assert.ok(uae.includes('+971501234567'))
  assert.ok(uae.includes('971501234567'))
  assert.ok(!uae.includes('1501234567'))
  assert.ok(!uae.includes('+441501234567'))
  for (const input of ['9876543210', '+919876543210', '919876543210']) {
    const india = phoneNumberStorageVariants(input)
    for (const alias of ['9876543210', '+919876543210', '919876543210', '09876543210', '00919876543210']) {
      assert.ok(india.includes(alias), `${input} should match ${alias}`)
    }
  }
  assert.deepEqual(phoneNumberStorageVariants('not a phone'), [])
})

test('CRM status sync matches formatted UAE records without touching another country with the same last ten digits', async () => {
  const uae = '+971501234567'
  const uk = '+441501234567'
  assert.equal(uae.slice(-10), uk.slice(-10), 'Fixture must reproduce the former suffix collision')
  assert.equal(canonicalPhoneNumber(uk), uk)
  const fixture = crmFixture([
    lead('uae-web', uae), lead('uae-bot', uae.slice(1)), lead('uae-formatted', ' +971 (50) 123-4567 '),
    lead('uk', uk), lead('uk-formatted', '+44 1501 234567'),
  ])
  const result = await fixture.actions.updateLeadStatus('uae-web', 'qualified')
  assert.equal(result.success, true)
  assert.equal(result.syncedCount, 3)
  assert.deepEqual(fixture.tables.leads.map(row => row.status), ['qualified', 'qualified', 'qualified', 'new', 'new'])
})

test('selecting a clean Indian phone also updates historically formatted records without rewriting them', async () => {
  const raw = ' +919876543210 '
  const fixture = crmFixture([
    lead('selected', '9876543210'), lead('surrounding-space', raw), lead('bot', '919876543210'),
    lead('trunk', '09876543210'), lead('international-prefix', '00919876543210'),
    lead('country-space', '+91 9876543210'), lead('formatted', '+91 (98765) 43210'),
  ])
  const result = await fixture.actions.updateLeadStatus('selected', 'contacted')
  assert.equal(result.syncedCount, 7)
  assert.ok(fixture.tables.leads.every(row => row.status === 'contacted'))
  assert.equal(fixture.tables.leads[1].phone, raw)
})

test('unrecognized phones only update the selected CRM lead', async () => {
  const fixture = crmFixture([lead('selected', 'invalid'), lead('other', 'invalid')])
  const result = await fixture.actions.updateLeadStatus('selected', 'contacted')
  assert.equal(result.success, true)
  assert.equal(result.syncedCount, 1)
  assert.deepEqual(fixture.tables.leads.map(row => row.status), ['contacted', 'new'])
})

test('WhatsApp reuses the latest formatted enquiry and attaches activity without a duplicate or country collision', async () => {
  const fixture = crmFixture([
    lead('older', '+971501234567'),
    lead('newer', ' +971 (50) 123-4567 ', '2026-10-21T00:00:00.000Z'),
    lead('uk', '+441501234567', '2026-10-22T00:00:00.000Z'),
  ])
  const result = await fixture.whatsapp.upsertWhatsAppLead('971501234567', 'Offline WhatsApp fixture', 'Offline message')
  assert.equal(result.id, 'newer')
  assert.equal(fixture.tables.leads.length, 3)
  assert.equal(fixture.tables.leads[1].bot_interactions_count, 2)
  assert.equal(fixture.tables.leads[1].phone, ' +971 (50) 123-4567 ')
  assert.equal(fixture.tables.leads[0].bot_interactions_count, 1)
  assert.equal(fixture.tables.leads[2].bot_interactions_count, 1)
  await fixture.whatsapp.logLeadActivity('971501234567', 'Offline activity', 'Offline details')
  assert.equal(fixture.tables.lead_activities.length, 1)
  assert.equal(fixture.tables.lead_activities[0].lead_id, 'newer')
})

test('new WhatsApp leads store their full canonical international number', async () => {
  const fixture = crmFixture([])
  await fixture.whatsapp.upsertWhatsAppLead('971501234567', 'Offline fixture')
  assert.equal(fixture.tables.leads.length, 1)
  assert.equal(fixture.tables.leads[0].phone, '+971501234567')
})

test('CRM candidate overflow fails before any status is updated', async () => {
  const fixture = crmFixture(Array.from({ length: 501 }, (_, index) => lead(`lead-${index}`, '+971501234567')))
  const result = await fixture.actions.updateLeadStatus('lead-0', 'qualified')
  assert.equal(result.success, false)
  assert.match(result.error, /Too many phone matches/)
  assert.ok(fixture.tables.leads.every(row => row.status === 'new'))
})

test('WhatsApp candidate overflow never updates, creates a duplicate or attaches activity', async t => {
  t.mock.method(console, 'error', () => {})
  const fixture = crmFixture(Array.from({ length: 501 }, (_, index) => lead(`lead-${index}`, '+971501234567')))
  const result = await fixture.whatsapp.upsertWhatsAppLead('971501234567', 'Offline fixture')
  await fixture.whatsapp.logLeadActivity('971501234567', 'Offline activity', 'Offline details')
  assert.equal(result, null)
  assert.equal(fixture.tables.leads.length, 501)
  assert.ok(fixture.tables.leads.every(row => row.bot_interactions_count === 1))
  assert.equal(fixture.tables.lead_activities.length, 0)
})

test('candidate lookup errors fail before CRM and WhatsApp writes', async t => {
  t.mock.method(console, 'error', () => {})
  const fixture = crmFixture([lead('selected', '+971501234567')], { candidateError: 'Offline lookup failure' })
  const statusResult = await fixture.actions.updateLeadStatus('selected', 'qualified')
  const whatsappResult = await fixture.whatsapp.upsertWhatsAppLead('971501234567', 'Offline fixture')
  await fixture.whatsapp.logLeadActivity('971501234567', 'Offline activity', 'Offline details')
  assert.equal(statusResult.success, false)
  assert.equal(statusResult.error, 'Offline lookup failure')
  assert.equal(whatsappResult, null)
  assert.equal(fixture.tables.leads.length, 1)
  assert.equal(fixture.tables.leads[0].status, 'new')
  assert.equal(fixture.tables.leads[0].bot_interactions_count, 1)
  assert.equal(fixture.tables.lead_activities.length, 0)
})
