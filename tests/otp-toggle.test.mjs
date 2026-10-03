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

test('parseOtpConfig handles boolean and string representations correctly', () => {
  // Defaults
  assert.equal(parseOtpConfig(null, true), true)
  assert.equal(parseOtpConfig(undefined, false), false)

  // Direct booleans
  assert.equal(parseOtpConfig(true), true)
  assert.equal(parseOtpConfig(false), false)

  // Strings
  assert.equal(parseOtpConfig('true'), true)
  assert.equal(parseOtpConfig('1'), true)
  assert.equal(parseOtpConfig('on'), true)
  assert.equal(parseOtpConfig('enabled'), true)

  assert.equal(parseOtpConfig('false'), false)
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
