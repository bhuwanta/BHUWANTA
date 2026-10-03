import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import ts from 'typescript'

const rawSource = await readFile(new URL('../src/lib/otp-config.ts', import.meta.url), 'utf8')
// Stub redis import with an in-memory key-value mock
const source = rawSource.replace(
  "import { redis } from './redis'",
  "const _storage = new Map(); export const redis = { get: async (k) => _storage.get(k) ?? null, set: async (k, v) => _storage.set(k, v) };"
)

const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
})
const { parseOtpConfig, getOtpDownloadEnabled, setOtpDownloadEnabled } = await import(
  `data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`
)

const downloadPopupContent = await readFile(
  new URL('../src/components/ui/DownloadPopup.tsx', import.meta.url),
  'utf8'
)
const gatedResourceContent = await readFile(
  new URL('../src/components/ui/GatedResource.tsx', import.meta.url),
  'utf8'
)
const sidebarContent = await readFile(
  new URL('../src/components/dashboard/Sidebar.tsx', import.meta.url),
  'utf8'
)
const actionsContent = await readFile(
  new URL('../src/app/(dashboard)/crm/modules/actions.ts', import.meta.url),
  'utf8'
)
const apiRouteContent = await readFile(
  new URL('../src/app/api/otp-config/route.ts', import.meta.url),
  'utf8'
)

test('parseOtpConfig handles boolean and string representations correctly', () => {
  // Defaults & nullish
  assert.equal(parseOtpConfig(null, true), true)
  assert.equal(parseOtpConfig(undefined, false), false)

  // Direct booleans
  assert.equal(parseOtpConfig(true), true)
  assert.equal(parseOtpConfig(false), false)

  // Strings (case-insensitive)
  assert.equal(parseOtpConfig('true'), true)
  assert.equal(parseOtpConfig('True'), true)
  assert.equal(parseOtpConfig('1'), true)
  assert.equal(parseOtpConfig('on'), true)
  assert.equal(parseOtpConfig('enabled'), true)

  assert.equal(parseOtpConfig('false'), false)
  assert.equal(parseOtpConfig('FALSE'), false)
  assert.equal(parseOtpConfig('0'), false)
  assert.equal(parseOtpConfig('off'), false)
  assert.equal(parseOtpConfig('disabled'), false)

  // JSON Objects
  assert.equal(parseOtpConfig({ downloadOtpEnabled: true }), true)
  assert.equal(parseOtpConfig({ downloadOtpEnabled: false }), false)
  assert.equal(parseOtpConfig(JSON.stringify({ downloadOtpEnabled: false })), false)
  assert.equal(parseOtpConfig(JSON.stringify({ downloadOtpEnabled: true })), true)
})

test('OTP toggle defaults to enabled (true)', async () => {
  const current = await getOtpDownloadEnabled()
  assert.equal(current, true)
})

test('OTP toggle can be disabled and reflects false', async () => {
  const updated = await setOtpDownloadEnabled(false, 'test-admin@bhuwanta.com')
  assert.equal(updated, false)
  const current = await getOtpDownloadEnabled()
  assert.equal(current, false)
})

test('OTP toggle can be re-enabled and reflects true', async () => {
  const updated = await setOtpDownloadEnabled(true, 'test-admin@bhuwanta.com')
  assert.equal(updated, true)
  const current = await getOtpDownloadEnabled()
  assert.equal(current, true)
})

test('CRM sidebar includes navigation to /crm/modules with SlidersHorizontal icon', () => {
  assert.match(
    sidebarContent,
    /name:\s*'Modules',\s*href:\s*'\/crm\/modules'/,
    'Sidebar navigation must contain Modules route'
  )
  assert.match(
    sidebarContent,
    /SlidersHorizontal/,
    'Sidebar must import and use SlidersHorizontal icon'
  )
})

test('DownloadPopup imports useOtpConfig and checks OTP requirement', () => {
  assert.match(
    downloadPopupContent,
    /import\s*\{\s*useOtpConfig\s*\}\s*from\s*['"]@\/lib\/hooks\/useOtpConfig['"]/,
    'DownloadPopup must import useOtpConfig'
  )
  assert.match(
    downloadPopupContent,
    /const\s*\{\s*isOtpEnabled\s*\}\s*=\s*useOtpConfig\(\)/,
    'DownloadPopup must call useOtpConfig()'
  )
})

test('DownloadPopup has handleInstantDownload that bypasses phone OTP when disabled', () => {
  assert.match(
    downloadPopupContent,
    /handleInstantDownload/,
    'DownloadPopup must define handleInstantDownload function'
  )
  assert.match(
    downloadPopupContent,
    /submitContactLead\(\{[\s\S]*?attribution:[\s\S]*?project:[\s\S]*?enquiryType:[\s\S]*?\}\)/,
    'Instant download must capture lead directly into CRM'
  )
  assert.match(
    downloadPopupContent,
    /setDownloadReady\(true\)/,
    'Instant download must unlock file download immediately'
  )
  assert.match(
    downloadPopupContent,
    /onSubmit=\{isOtpEnabled\s*\?\s*handleSendOTP\s*:\s*handleInstantDownload\}/,
    'Form submit handler must switch dynamically between OTP and instant download'
  )
})

test('DownloadPopup button label reflects OTP state', () => {
  assert.match(
    downloadPopupContent,
    /isOtpEnabled\s*\?\s*['"]Verify to Download['"]\s*:\s*['"]Download Now['"]/,
    'Download button label must display "Verify to Download" when enabled and "Download Now" when disabled'
  )
  assert.match(
    downloadPopupContent,
    /isOtpEnabled\s*\?\s*['"]Sending OTP\.\.\.['"]\s*:\s*['"]Preparing Download\.\.\.['"]/,
    'Submitting label must display "Sending OTP..." when enabled and "Preparing Download..." when disabled'
  )
})

test('GatedResource supports instant unlock when OTP is disabled', () => {
  assert.match(
    gatedResourceContent,
    /import\s*\{\s*useOtpConfig\s*\}\s*from\s*['"]@\/lib\/hooks\/useOtpConfig['"]/,
    'GatedResource must import useOtpConfig'
  )
  assert.match(
    gatedResourceContent,
    /handleInstantUnlock/,
    'GatedResource must define handleInstantUnlock function'
  )
  assert.match(
    gatedResourceContent,
    /onSubmit=\{isOtpEnabled\s*\?\s*handleSendOTP\s*:\s*handleInstantUnlock\}/,
    'GatedResource form must conditionally use instant unlock when OTP is disabled'
  )
})

test('CRM server actions provide getOtpModuleStatus and toggleOtpModuleStatus with revalidation', () => {
  assert.match(
    actionsContent,
    /export async function getOtpModuleStatus/,
    'Must export getOtpModuleStatus action'
  )
  assert.match(
    actionsContent,
    /export async function toggleOtpModuleStatus/,
    'Must export toggleOtpModuleStatus action'
  )
  assert.match(
    actionsContent,
    /revalidatePath\(['"]\/crm\/modules['"]\)/,
    'Must revalidate CRM modules page'
  )
})

test('Public API route /api/otp-config is dynamic and non-cached', () => {
  assert.match(
    apiRouteContent,
    /export const dynamic = 'force-dynamic'/,
    'Route must be force-dynamic'
  )
  assert.match(
    apiRouteContent,
    /export const revalidate = 0/,
    'Route must have revalidate = 0'
  )
  assert.match(
    apiRouteContent,
    /Cache-Control/,
    'Route must specify no-store Cache-Control header'
  )
})
