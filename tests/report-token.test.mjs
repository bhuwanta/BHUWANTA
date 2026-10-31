import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import ts from 'typescript'

const require = createRequire(import.meta.url)
const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')

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
    if (name.startsWith('@/')) {
      const candidateTs = `src/${name.slice(2)}.ts`
      const candidateJs = `src/${name.slice(2)}.js`
      if (existsSync(resolve(repositoryRoot, candidateTs))) {
        return loadSource(candidateTs, mocks)
      }
      return loadSource(candidateJs, mocks)
    }
    return require(name)
  }
  new Function('require', 'module', 'exports', 'process', code)(localRequire, loadedModule, loadedModule.exports, process)
  return loadedModule.exports
}

const { generateReportToken, verifyReportToken, buildReportDownloadUrl } = loadSource('src/lib/reports/token.ts')

test('generateReportToken creates verifiable signature and recovers payload', () => {
  const sample = {
    slotCode: '9',
    period: '9 AM Report (6 AM – 9 AM)',
    sheetName: 'Slot (6 AM - 9 AM)',
    startUtc: '2026-10-31T00:30:00.000Z',
    endUtc: '2026-10-31T03:30:00.000Z',
    isMaster: false,
    todayStr: '2026-10-31',
  }

  const token = generateReportToken(sample, 24)
  assert.ok(token.includes('.'))

  const verified = verifyReportToken(token)
  assert.equal(verified.valid, true)
  if (verified.valid) {
    assert.equal(verified.payload.slotCode, '9')
    assert.equal(verified.payload.todayStr, '2026-10-31')
    assert.equal(verified.payload.isMaster, false)
  }
})

test('verifyReportToken rejects tampered or expired tokens', () => {
  const sample = {
    slotCode: '9',
    period: '9 AM Report',
    sheetName: 'Slot',
    startUtc: '2026-10-31T00:30:00.000Z',
    endUtc: '2026-10-31T03:30:00.000Z',
    isMaster: false,
    todayStr: '2026-10-31',
  }

  // 1. Tampered payload
  const token = generateReportToken(sample, 24)
  const parts = token.split('.')
  const tamperedToken = `${parts[0]}xyz.${parts[1]}`
  assert.equal(verifyReportToken(tamperedToken).valid, false)

  // 2. Expired token (0 hours TTL)
  const expiredToken = generateReportToken(sample, -1)
  const result = verifyReportToken(expiredToken)
  assert.equal(result.valid, false)
  assert.equal(result.reason, 'expired')
})

test('buildReportDownloadUrl returns complete valid endpoint URL', () => {
  const sample = {
    slotCode: '12',
    period: '12 PM Report',
    sheetName: 'Slot',
    startUtc: '2026-10-31T03:30:00.000Z',
    endUtc: '2026-10-31T06:30:00.000Z',
    isMaster: false,
    todayStr: '2026-10-31',
  }

  const url = buildReportDownloadUrl(sample)
  assert.ok(url.includes('/api/crm/reports/download?token='))
})
