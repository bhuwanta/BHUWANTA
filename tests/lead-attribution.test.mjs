import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { after, afterEach, test } from 'node:test'
import { JSDOM } from 'jsdom'
import ts from 'typescript'

const filename = resolve(dirname(fileURLToPath(import.meta.url)), '../src/lib/lead-attribution.ts')
const sourceModule = { exports: {} }
const code = ts.transpileModule(readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText
new Function('module', 'exports', code)(sourceModule, sourceModule.exports)
const { getLeadAttribution, cleanAttribution, campaignSource, attributedWhatsAppUrl } = sourceModule.exports
const dom = new JSDOM('', { url: 'https://example.test/projects/arudra' })
globalThis.window = dom.window
afterEach(() => window.sessionStorage.clear())
after(() => dom.window.close())

test('Google campaign ID survives navigation from ad landing page to a later enquiry', () => {
  const campaign = { utm_id: '123456789', utm_source: 'google', utm_medium: 'cpc', utm_campaign: 'arudra_nri', gclid: 'offline-click-id' }
  dom.reconfigure({ url: `https://example.test/projects/arudra?${new URLSearchParams(campaign)}` })
  assert.deepEqual(getLeadAttribution(), campaign)
  assert.equal(campaignSource(getLeadAttribution()), 'Google Ads')
  dom.reconfigure({ url: 'https://example.test/projects/arudra#book-visit' })
  assert.deepEqual(getLeadAttribution(), campaign)
  const whatsappUrl = attributedWhatsAppUrl('https://wa.me/919999999999?text=Project%20details')
  assert.match(new URL(whatsappUrl).searchParams.get('text'), /website source: Google Ads/)
  assert.doesNotMatch(whatsappUrl, /123456789|offline-click-id/)
})

test('a new campaign replaces previous click and campaign IDs instead of mixing them', () => {
  dom.reconfigure({ url: 'https://example.test/projects/arudra?utm_id=old-campaign&gclid=old-click' })
  getLeadAttribution()
  dom.reconfigure({ url: 'https://example.test/projects/arudra?utm_source=new-campaign' })
  assert.deepEqual(getLeadAttribution(), { utm_source: 'new-campaign' })
  dom.reconfigure({ url: 'https://example.test/contact' })
  assert.deepEqual(getLeadAttribution(), { utm_source: 'new-campaign' })
})

test('campaign IDs use the existing bounded metadata rules and never admit arbitrary contact data', () => {
  assert.deepEqual(cleanAttribution({ utm_id: '123456789', phone: '+971501234567', email: 'discard@example.test' }), { utm_id: '123456789' })
  for (const invalid of ['', '<script>', '1\n2', 'x'.repeat(201), 123456789, { id: '123' }]) {
    assert.deepEqual(cleanAttribution({ utm_id: invalid }), {})
  }
  dom.reconfigure({ url: 'https://example.test/projects/arudra?utm_id=%3Cscript%3E&phone=%2B971501234567' })
  assert.deepEqual(getLeadAttribution(), {})
})
