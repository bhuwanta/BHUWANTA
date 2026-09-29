import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import ts from 'typescript'

async function loadTypescript(path) {
  const source = await readFile(new URL(path, import.meta.url), 'utf8')
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  })
  return import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`)
}
const { normalizeIndianPhoneInput } = await loadTypescript('../src/lib/phone-input.ts')
const { submitContactLead } = await loadTypescript('../src/lib/lead-submission.ts')
const { documentDownloadHref } = await loadTypescript('../src/lib/document-links.ts')

test('saved documents use explicit HTTPS links, keeping PDFs in the viewer', () => {
  const pdf = 'https://cdn.sanity.io/files/project/production/layout.PDF?download=1'
  assert.equal(documentDownloadHref(pdf), `https://docs.google.com/viewer?url=${encodeURIComponent(pdf)}`)
  assert.equal(documentDownloadHref('https://bhuwanta.com/layout.jpg'), 'https://bhuwanta.com/layout.jpg')
  for (const unsafe of ['javascript:alert(1)', 'data:text/html,test', 'http://example.com/a.pdf', 'https://user:password@example.com/a.pdf', '/relative.pdf', 'broken']) {
    assert.equal(documentDownloadHref(unsafe), null)
  }
})

test('common pasted Indian country-code formats reach the same 10-digit phone', () => {
  for (const input of ['9876543210', '+91 98765 43210', '0091-9876543210', '919876543210', '09876543210']) {
    assert.equal(normalizeIndianPhoneInput(input), '9876543210', input)
  }
})

test('an invalid long number remains invalid instead of becoming a different 10-digit phone', () => {
  for (const input of ['123456789012', '+44 2079460958', '98765432101', '009198765432101']) {
    const result = normalizeIndianPhoneInput(input)
    assert.notEqual(result.length, 10, input)
    assert.equal(result, input.replace(/\D/g, ''), input)
  }
  assert.equal(normalizeIndianPhoneInput('98765'), '98765')
})

test('failed or incomplete CRM responses cannot report document or enquiry success', async () => {
  const originalFetch = globalThis.fetch
  try {
    for (const response of [
      new Response(JSON.stringify({ error: 'failed save' }), { status: 500 }),
      new Response(JSON.stringify({ error: 'try later' }), { status: 429 }),
      new Response(JSON.stringify({ success: true }), { status: 200 }),
      new Response(JSON.stringify({ leadId: '' }), { status: 200 }),
      new Response('not JSON', { status: 502 }),
    ]) {
      globalThis.fetch = async () => response
      let successReached = false
      await assert.rejects(async () => {
        await submitContactLead({ name: 'TEST', phone: '9876543210' })
        successReached = true
      })
      assert.equal(successReached, false)
    }
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('a confirmed save preserves document campaign attribution and returns its lead ID', async () => {
  const originalFetch = globalThis.fetch
  let sent
  try {
    globalThis.fetch = async (url, options) => {
      sent = { url, options }
      return new Response(JSON.stringify({ success: true, leadId: 'mock-saved-document' }), { status: 200 })
    }
    const payload = {
      name: 'TEST', phone: '9876543210',
      attribution: { gclid: 'mock-click', utm_campaign: 'arudra' },
      enquiryType: 'Document Download: Brochure',
    }
    assert.deepEqual(await submitContactLead(payload), { leadId: 'mock-saved-document' })
    assert.equal(sent.url, '/api/contact')
    assert.equal(sent.options.method, 'POST')
    assert.deepEqual(JSON.parse(sent.options.body), payload)
  } finally {
    globalThis.fetch = originalFetch
  }
})
