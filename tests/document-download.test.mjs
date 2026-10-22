import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { after, afterEach, mock, test } from 'node:test'
import { JSDOM } from 'jsdom'
import ts from 'typescript'

const require = createRequire(import.meta.url)
const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'https://example.test/projects/arudra' })
globalThis.window = dom.window
globalThis.document = dom.window.document
globalThis.HTMLElement = dom.window.HTMLElement
globalThis.IS_REACT_ACT_ENVIRONMENT = true
const React = require('react')
const { act } = React
const { createRoot } = require('react-dom/client')
const originalFetch = globalThis.fetch
globalThis.fetch = async () => { throw new Error('Document tests must never call a live API or send SMS') }
let root
let container

function sourceLoader(mocks) {
  const loaded = new Map()
  function load(relativePath) {
    const filename = resolve(repositoryRoot, relativePath)
    if (loaded.has(filename)) return loaded.get(filename).exports
    const sourceModule = { exports: {} }
    loaded.set(filename, sourceModule)
    const code = ts.transpileModule(readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    }).outputText
    const localRequire = name => {
      if (Object.hasOwn(mocks, name)) return mocks[name]
      if (name.startsWith('@/')) {
        const source = ['.ts', '.tsx'].map(extension => `src/${name.slice(2)}${extension}`)
          .find(candidate => existsSync(resolve(repositoryRoot, candidate)))
        assert.ok(source, `Unmocked source ${name}`)
        return load(source)
      }
      return require(name)
    }
    new Function('require', 'module', 'exports', code)(localRequire, sourceModule, sourceModule.exports)
    return sourceModule.exports
  }
  return load
}

function fixture({ otpEnabled = true, loading = false, configError = false, otpReject = false, saveFailures = 0 } = {}) {
  const calls = { sms: [], verification: [], leads: [], downloads: [], retries: 0 }
  const config = { isOtpEnabled: otpEnabled, isLoading: loading, hasError: configError, retry: () => { calls.retries++ } }
  const mocks = {
    'next/image': { __esModule: true, default: props => React.createElement('img', props) },
    'next/link': { __esModule: true, default: props => React.createElement('a', props) },
    'next/navigation': { useSearchParams: () => new URLSearchParams() },
    '@/images/bhuwanta-logo-horizontal.png': { __esModule: true, default: '/offline-logo.png' },
    'framer-motion': { motion: { div: props => {
      const { initial, animate, exit, transition, ...domProps } = props
      void initial; void animate; void exit; void transition
      return React.createElement('div', domProps)
    } } },
    '@/components/ui/ProjectImageCarousel': { ProjectImageCarousel: () => null },
    '@/components/ui/OverviewDownloadButton': { OverviewDownloadButton: () => null },
    '@/lib/hooks/useOtpConfig': { useOtpConfig: () => config },
    '@/lib/lead-attribution': { getLeadAttribution: () => ({ utm_id: '123456', utm_source: 'google', utm_medium: 'cpc' }) },
    '@/lib/lead-submission': { submitContactLead: async lead => {
      calls.leads.push(lead)
      if (saveFailures-- > 0) throw new Error('Offline save failure')
      return { leadId: 'offline-document-lead' }
    } },
    '@/lib/gtag': { trackDocumentDownload: id => calls.downloads.push(id), trackWhatsAppClick() {} },
    '@/lib/firebase/phone-otp': { loadPhoneAuth: async () => ({
      auth: {},
      RecaptchaVerifier: class { clear() {} },
      signInWithPhoneNumber: async (_auth, phone) => {
        calls.sms.push(phone)
        return { confirm: async code => {
          calls.verification.push(code)
          if (otpReject) throw new Error('Offline OTP rejection')
          return {}
        } }
      },
    }) },
  }
  const load = sourceLoader(mocks)
  const { DownloadPopup } = load('src/components/ui/DownloadPopup.tsx')
  mocks['next/dynamic'] = { __esModule: true, default: () => DownloadPopup }
  const props = { isOpen: true, onClose() {}, urls: ['https://cdn.example.test/arudra.pdf'], projectName: 'ARUDRA EXOTICA EARTHSTAY VILLAS', documentType: 'Brochure', allowInternationalPhone: true }
  return { calls, config, load, DownloadPopup, props }
}

async function mount(element) {
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  await act(async () => root.render(element))
}
async function input(selector, value) {
  await act(async () => {
    const element = container.querySelector(selector)
    assert.ok(element, selector)
    Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value').set.call(element, value)
    element.dispatchEvent(new dom.window.Event('input', { bubbles: true }))
  })
}
async function country(value) {
  await act(async () => {
    const select = container.querySelector('[name="phoneCountry"]')
    select.value = value
    select.dispatchEvent(new dom.window.Event('change', { bubbles: true }))
  })
}
async function submit() {
  await act(async () => container.querySelector('form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true })))
}
async function sendCode(phone, selectedCountry) {
  if (selectedCountry) await country(selectedCountry)
  await input('[placeholder="Full Name *"]', 'Offline regression test')
  await input('[type="tel"]', phone)
  await submit()
}
async function verifyCode() {
  await input('[placeholder="000000"]', '123456')
  await submit()
}

afterEach(async () => {
  if (root) await act(async () => root.unmount())
  root = undefined
  container?.remove()
  mock.restoreAll()
})
after(() => {
  globalThis.fetch = originalFetch
  dom.window.close()
})

test('Arudra UAE download verifies the full number before saving and opening the document', async () => {
  const { calls, DownloadPopup, props } = fixture()
  await mount(React.createElement(DownloadPopup, props))
  assert.deepEqual([...container.querySelectorAll('select option')].map(option => option.value), ['IN', 'AE', 'SA', 'QA', 'OM', 'KW'])
  assert.equal(container.querySelector('[type="tel"]').hasAttribute('pattern'), false)
  assert.equal(container.querySelectorAll('[required]').length, 2)
  await sendCode('050 123 4567', 'AE')
  assert.deepEqual(calls.sms, ['+971501234567'])
  assert.match(container.textContent, /code sent to \+971501234567/)
  assert.equal(container.querySelector('a'), null)
  assert.deepEqual(calls.leads, [])
  await verifyCode()
  assert.deepEqual(calls.verification, ['123456'])
  assert.equal(calls.leads.length, 1)
  assert.equal(calls.leads[0].phone, '+971501234567')
  assert.equal(calls.leads[0].project, props.projectName)
  assert.equal(calls.leads[0].enquiryType, 'Document Download: Brochure')
  assert.equal(calls.leads[0].attribution.utm_id, '123456')
  assert.deepEqual(calls.downloads, ['offline-document-lead'])
  const documentUrl = new URL(container.querySelector('a').href)
  assert.equal(documentUrl.origin, 'https://docs.google.com')
  assert.equal(documentUrl.searchParams.get('url'), props.urls[0])
})

test('international paste selects its country and malformed numbers never request OTP', async () => {
  const { calls, DownloadPopup, props } = fixture()
  await mount(React.createElement(DownloadPopup, props))
  for (const phone of ['+97150123456', '+9715012345678', 'call +971501234567']) {
    await sendCode(phone, 'AE')
    assert.equal(container.querySelector('[type="tel"]').value, phone)
    assert.match(container.querySelector('[role="alert"]').textContent, /valid mobile number/)
  }
  assert.deepEqual(calls.sms, [])
  await country('IN')
  await sendCode('00971 50 123 4567')
  assert.deepEqual(calls.sms, ['+971501234567'])
  assert.deepEqual(calls.leads, [])
})

test('OTP rejection does not save a lead or unlock documents', async () => {
  mock.method(console, 'error', () => {})
  const { calls, DownloadPopup, props } = fixture({ otpReject: true })
  await mount(React.createElement(DownloadPopup, props))
  await sendCode('+971501234567')
  await verifyCode()
  assert.deepEqual(calls.leads, [])
  assert.deepEqual(calls.downloads, [])
  assert.equal(container.querySelector('a'), null)
  assert.match(container.textContent, /could not verify that code/)
})

test('a verified lead-save retry retains the full number without consuming OTP twice', async () => {
  mock.method(console, 'error', () => {})
  const { calls, DownloadPopup, props } = fixture({ saveFailures: 1 })
  await mount(React.createElement(DownloadPopup, props))
  await sendCode('+971501234567')
  await verifyCode()
  assert.equal(container.querySelector('a'), null)
  assert.match(container.textContent, /phone is verified/)
  assert.deepEqual(calls.downloads, [])
  await submit()
  assert.deepEqual(calls.verification, ['123456'])
  assert.deepEqual(calls.leads.map(lead => lead.phone), ['+971501234567', '+971501234567'])
  assert.deepEqual(calls.downloads, ['offline-document-lead'])
  assert.ok(container.querySelector('a'))
})

test('other projects keep Indian normalization and reject overseas numbers', async () => {
  const { calls, DownloadPopup, props } = fixture()
  await mount(React.createElement(DownloadPopup, { ...props, allowInternationalPhone: false, projectName: 'RPL COUNTY' }))
  assert.equal(container.querySelector('select'), null)
  assert.equal(container.querySelector('[type="tel"]').pattern, '[0-9]{10}')
  await sendCode('+971501234567')
  assert.deepEqual(calls.sms, [])
  await sendCode('0091 98765 43210')
  assert.deepEqual(calls.sms, ['+919876543210'])
  await verifyCode()
  assert.equal(calls.leads[0].phone, '9876543210')
})

test('confirmed OTP-off mode still provides direct documents without collecting details', async () => {
  const { calls, DownloadPopup, props } = fixture({ otpEnabled: false })
  await mount(React.createElement(DownloadPopup, props))
  assert.equal(container.querySelector('form'), null)
  assert.ok(container.querySelector('a'))
  await act(async () => root.render(React.createElement(DownloadPopup, { ...props, allowInternationalPhone: false })))
  assert.ok(container.querySelector('a'))
  assert.deepEqual(calls.sms, [])
  assert.deepEqual(calls.leads, [])
  assert.deepEqual(calls.downloads, [])
})

test('cached OTP-off cannot expose documents until current configuration is confirmed', async () => {
  const { calls, config, DownloadPopup, props } = fixture({ otpEnabled: false, loading: true })
  await mount(React.createElement(DownloadPopup, props))
  assert.equal(container.querySelector('a, form'), null)
  assert.match(container.textContent, /Preparing your download/)
  config.isLoading = false
  config.hasError = true
  await act(async () => root.render(React.createElement(DownloadPopup, { ...props })))
  assert.equal(container.querySelector('a, form'), null)
  await act(async () => [...container.querySelectorAll('button')].find(button => button.textContent === 'Try again').click())
  assert.equal(calls.retries, 1)
  config.hasError = false
  config.isOtpEnabled = true
  await act(async () => root.render(React.createElement(DownloadPopup, { ...props })))
  assert.ok(container.querySelector('form'))
  assert.equal(container.querySelector('a'), null)
  assert.deepEqual(calls.sms, [])
})

for (const surface of ['detail', 'directory']) {
  test(`${surface} document buttons enable Gulf numbers only for Arudra`, async () => {
    const { load } = fixture()
    const { ProjectDetailActions } = load('src/components/ui/ProjectDetailActions.tsx')
    const { ProjectsDirectory } = load('src/components/ui/ProjectsFilterClient.tsx')
    for (const slug of ['arudra', 'rpl-county', 's-v-kanaka-maple-homes', 'vian-valley', 'tjr-township', 'vaibhav-county']) {
      const props = { name: `CMS ${slug}`, slug, brochureUrls: ['https://cdn.example.test/brochure.pdf'], layoutUrls: ['https://cdn.example.test/layout.pdf'], reraUrls: ['https://cdn.example.test/rera.pdf'], hmdaDtcpUrls: ['https://cdn.example.test/approval.pdf'] }
      const element = surface === 'detail'
        ? React.createElement(ProjectDetailActions, props)
        : React.createElement(ProjectsDirectory, { projects: [{ ...props, slug: { current: slug }, location: 'CMS location', description: 'CMS description', plotSizes: 'CMS sizes' }] })
      if (!root) await mount(element)
      else await act(async () => root.render(React.cloneElement(element, { key: slug })))
      for (const label of ['Brochure', 'Layout', 'RERA', 'HMDA/DTCP']) {
        const button = [...container.querySelectorAll('button')].find(candidate => candidate.textContent.includes(label))
        assert.ok(button, `${surface} ${label}`)
        await act(async () => button.click())
        assert.equal(Boolean(container.querySelector('[name="phoneCountry"]')), slug === 'arudra', `${surface} ${slug} ${label}`)
        await act(async () => container.querySelector('[aria-label="Close"]').click())
      }
    }
  })
}
