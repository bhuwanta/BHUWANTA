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
globalThis.fetch = async () => { throw new Error('No network is permitted in phone regression tests') }
after(() => { globalThis.fetch = originalFetch })

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

const { parseContactPhone, normalizeIndianPhoneInput, enquiryPhoneCountries } = loadSource('src/lib/phone-input.ts')

test('Indian number formats retain their existing national storage value', () => {
  for (const input of ['9876543210', '09876543210', '+91 98765 43210', '0091 98765 43210']) {
    assert.equal(normalizeIndianPhoneInput(input), '9876543210')
    assert.deepEqual(parseContactPhone(input), { country: 'IN', e164: '+919876543210', storageValue: '9876543210' })
  }
})

test('the six selectable countries use metadata validation and retain calling codes', () => {
  const examples = require('libphonenumber-js/examples.mobile.json')
  const { getExampleNumber } = require('libphonenumber-js/max')
  for (const { country, callingCode } of enquiryPhoneCountries) {
    // Published library examples stay entirely inside this offline test.
    const example = getExampleNumber(country, examples)
    const parsed = parseContactPhone(example.formatNational(), country)
    assert.ok(parsed, country)
    assert.equal(parsed.country, country)
    assert.equal(parsed.e164, example.number)
    assert.ok(parsed.e164.startsWith(`+${callingCode}`))
    assert.equal(parsed.storageValue, country === 'IN' ? example.nationalNumber : example.number)
  }
  assert.equal(parseContactPhone('050 123 4567', 'AE').storageValue, '+971501234567')
  assert.equal(parseContactPhone('00971 50 123 4567').storageValue, '+971501234567')
})

test('malformed, truncated, overlong and non-mobile numbers are rejected without extraction', () => {
  for (const input of ['', '+97150123456', '+9715012345678', '++971501234567', '+999501234567', '+971501234567 ext 2', 'call +971501234567', '+971/501234567', '0501234567', '+971 4 123 4567', '1234567890']) {
    assert.equal(parseContactPhone(input), null, input)
  }
})

function contactApiFixture() {
  const calls = { sanity: [], supabase: [], notifications: [] }
  const { POST } = loadSource('src/app/api/contact/route.ts', {
    'next/server': { NextResponse: { json: (body, options) => ({ body, status: options?.status || 200 }) } },
    '@/lib/redis': { contactRateLimiter: null },
    '@/lib/resend': {
      resend: null,
      sendContactNotification: async lead => { calls.notifications.push(lead) },
    },
    '@/lib/sanity': {
      client: { fetch: async () => { throw new Error('No CMS read expected for the short form') } },
      writeClient: { create: async lead => {
        calls.sanity.push(lead)
        return { _id: 'offline-saved-lead' }
      } },
    },
    '@/lib/supabase/server': {
      createServiceClient: () => ({ from: () => ({ insert: async lead => {
        calls.supabase.push(lead)
        return { error: null }
      } }) }),
    },
  })
  const submit = (phone, attribution) => POST({ json: async () => ({
    name: 'Offline regression test',
    phone,
    project: 'ARUDRA EXOTICA EARTHSTAY VILLAS',
    location: 'Kothur',
    enquiryType: 'Pricing Details',
    sourcePage: 'Website - /projects/arudra - Book Your Visit',
    attribution,
  }) })
  return { calls, submit }
}

test('the contact API saves the full UAE country code in both stores and the team notification', async () => {
  const { calls, submit } = contactApiFixture()
  const response = await submit('+971 50 123 4567')
  assert.equal(response.status, 200)
  assert.equal(response.body.leadId, 'offline-saved-lead')
  for (const leads of Object.values(calls)) {
    assert.equal(leads.length, 1)
    assert.equal(leads[0].phone, '+971501234567')
  }
})

test('the contact API retains legacy Indian phone storage', async () => {
  const { calls, submit } = contactApiFixture()
  assert.equal((await submit('+91 98765 43210')).status, 200)
  assert.equal(calls.sanity[0].phone, '9876543210')
  assert.equal(calls.supabase[0].phone, '9876543210')
})

test('Google campaign ID reaches both CRM stores after server sanitization', async () => {
  const { calls, submit } = contactApiFixture()
  const attribution = { utm_id: '123456789', utm_source: 'google', utm_medium: 'cpc' }
  const response = await submit('+971501234567', { ...attribution, email: 'discard@example.test', utm_content: '<script>' })
  assert.equal(response.status, 200)
  assert.deepEqual(calls.sanity[0].attribution, attribution)
  assert.match(calls.sanity[0].sourcePage, /^Google Ads \| /)
  assert.match(calls.supabase[0].message, /"utm_id":"123456789"/)
  assert.doesNotMatch(calls.supabase[0].message, /discard|<script>/)
})

test('invalid API phone values fail before any CRM write or notification', async () => {
  const { calls, submit } = contactApiFixture()
  for (const phone of ['+97150123456', '+9715012345678', 'text +971501234567', { number: '+971501234567' }, 971501234567]) {
    assert.equal((await submit(phone)).status, 400)
  }
  assert.deepEqual(calls, { sanity: [], supabase: [], notifications: [] })
})
