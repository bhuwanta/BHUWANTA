import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import ts from 'typescript'

async function importTypescript(path) {
  const source = await readFile(new URL(path, import.meta.url), 'utf8')
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } })
  return import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`)
}
const { enquiryHref, matchEnquiryProject, canonicalProjectSlug } = await importTypescript('../src/lib/project-links.ts')
const { fireLeadConversion, trackWhatsAppClick, trackDocumentDownload, trackEnquiryStep } = await importTypescript('../src/lib/gtag.ts')
const projects = [{ name: 'VIAN VALLEY ', location: 'Shabad' }, { name: 'S.V.KANAKA MAPLE HOMES', location: 'Warangal Highway' }]

test('enquiry links preserve an encoded project query before the real fragment', () => {
  const url = new URL(enquiryHref('Vian Valley & Phase 2'), 'https://bhuwanta.com')
  assert.equal(url.searchParams.get('project'), 'Vian Valley & Phase 2')
  assert.equal(url.hash, '#book-visit')
})
test('older spelling and CMS whitespace still select the correct project and location', () => {
  assert.deepEqual(matchEnquiryProject(projects, 'Vian Vally'), projects[0])
  assert.deepEqual(matchEnquiryProject(projects, 'S.V. Kanaka Maple Homes'), projects[1])
})
test('unknown and malformed project values do not silently select another project', () => {
  for (const value of [undefined, '', 'Vian Valley 3', ['Vian Valley']]) assert.equal(matchEnquiryProject(projects, value), undefined)
})
test('only known overview slugs are canonicalised; video paths remain separate', () => {
  assert.equal(canonicalProjectSlug('vian-valley'), 'vian-vally')
  assert.equal(canonicalProjectSlug('s-v-kanaka-maple-homes'), 'sv-kanaka-maple-homes')
  assert.equal(canonicalProjectSlug('vian-valley/videos'), 'vian-valley/videos')
  assert.equal(canonicalProjectSlug('new-project'), 'new-project')
})
test('a WhatsApp click does not fire the Google Ads lead conversion', () => {
  const events = []
  globalThis.window = { gtag: (...args) => events.push(args) }
  trackWhatsAppClick()
  assert.deepEqual(events, [['event', 'whatsapp_click', { contact_method: 'whatsapp' }]])
  fireLeadConversion('saved-lead-123')
  assert.equal(events[1][1], 'conversion')
  assert.equal(events[1][2].send_to, 'AW-18301435119/N10ICO3ygPscEO_55pZE')
  delete globalThis.window
})
test('tracking safely handles server rendering and unavailable tags', () => {
  assert.doesNotThrow(() => { trackWhatsAppClick(); fireLeadConversion() })
  globalThis.window = {}
  assert.doesNotThrow(() => { trackWhatsAppClick(); fireLeadConversion() })
  delete globalThis.window
})

test('document downloads never send the primary enquiry conversion', () => {
  const events = []
  globalThis.window = { gtag: (...args) => events.push(args) }
  trackDocumentDownload()
  assert.equal(events.length, 0)
  trackDocumentDownload('document-lead-123')
  assert.deepEqual(events, [['event', 'document_download', { transaction_id: 'document-lead-123' }]])
  delete globalThis.window
  assert.doesNotThrow(() => trackDocumentDownload('server-render'))
})

test('enquiry diagnostics go only to GA4, without contact details or URL queries', () => {
  const events = []
  globalThis.window = {
    location: { pathname: '/projects/arudra', search: '?phone=private&otp=private' },
    gtag: (...args) => events.push(args),
  }
  for (const step of ['start', 'otp_requested', 'otp_sent', 'otp_failed', 'otp_verified', 'verification_failed', 'submission_started', 'submission_failed', 'submission_succeeded']) {
    trackEnquiryStep(step, 'contact')
  }
  assert.equal(events.length, 9)
  for (const [command, name, params] of events) {
    assert.equal(command, 'event')
    assert.match(name, /^enquiry_/)
    assert.deepEqual(params, { send_to: 'G-98QJJZ5DCG', form_id: 'contact', project_group: 'arudra' })
    assert.notEqual(name, 'conversion')
  }
  assert.equal(JSON.stringify(events).includes('private'), false)
  delete globalThis.window
})

test('enquiry diagnostics queue before tag loading and classify only known pages', () => {
  globalThis.window = { location: { pathname: '/shabad-open-plots' } }
  trackEnquiryStep('start', 'contact')
  assert.equal(Array.from(window.dataLayer[0])[2].project_group, 'vian_valley')
  window.location.pathname = '/private-contact-value'
  trackEnquiryStep('start', 'popup')
  assert.deepEqual(Array.from(window.dataLayer[1])[2], { send_to: 'G-98QJJZ5DCG', form_id: 'popup', project_group: 'other' })
  delete globalThis.window
})

test('unavailable or failing analytics cannot block the enquiry flow', () => {
  assert.doesNotThrow(() => trackEnquiryStep('start', 'contact'))
  globalThis.window = { gtag: () => { throw Error('blocked analytics') } }
  assert.doesNotThrow(() => trackEnquiryStep('submission_started', 'contact'))
  delete globalThis.window
})

const { cleanAttribution, campaignSource, getLeadAttribution, whatsappSourceHint } = await importTypescript('../src/lib/lead-attribution.ts')
test('conversion queues before Google finishes loading, carries saved ID, and ignores missing ID', () => {
  globalThis.window = {}
  fireLeadConversion()
  assert.equal(window.dataLayer, undefined)
  fireLeadConversion('saved-lead-456')
  const event = Array.from(window.dataLayer[0])
  assert.equal(event[1], 'conversion')
  assert.equal(event[2].transaction_id, 'saved-lead-456')
  assert.equal(event[2].send_to, 'AW-18301435119/N10ICO3ygPscEO_55pZE')
  delete globalThis.window
})
test('campaign metadata survives internal navigation without mixing a later campaign', () => {
  const store = new Map()
  globalThis.window = { location: { search: '?gclid=sample-click&utm_source=google&email=private' }, sessionStorage: { getItem: k => store.get(k), setItem: (k,v) => store.set(k,v) } }
  assert.deepEqual(getLeadAttribution(), { gclid:'sample-click', utm_source:'google' })
  window.location.search = ''
  assert.equal(campaignSource(getLeadAttribution()), 'Google Ads')
  window.location.search = '?utm_source=facebook&utm_medium=paid'
  assert.equal(getLeadAttribution().gclid, undefined)
  assert.equal(campaignSource(getLeadAttribution()), undefined)
  delete globalThis.window
})
test('invalid metadata and unavailable storage do not block enquiries', () => {
  assert.deepEqual(cleanAttribution({ gclid: '<script>', utm_source:'x'.repeat(201), phone:'123' }), {})
  globalThis.window = { location:{ search:'?gclid=test' }, get sessionStorage() { throw Error('blocked') } }
  assert.deepEqual(getLeadAttribution(), {gclid:'test'})
  delete globalThis.window
  assert.equal(whatsappSourceHint('Hi'), undefined)
  assert.equal(whatsappSourceHint('Hi [Bhuwanta website source: Google Ads]'), 'Google Ads')
})
