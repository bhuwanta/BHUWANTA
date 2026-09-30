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
const { createOtpRequestGate } = await loadTypescript('../src/lib/firebase/otp-request-gate.ts')
const { createOtpVerificationSession } = await loadTypescript('../src/lib/firebase/otp-verification.ts')

test('rapid and delayed repeat clicks cannot start another SMS while one is pending', () => {
  const gate = createOtpRequestGate()
  assert.equal(gate.tryStart(1000), true)
  assert.equal(gate.tryStart(1000), false)
  assert.equal(gate.tryStart(1001), false)
  assert.equal(gate.tryStart(61_000), false)
  assert.equal(gate.isPending(), true)
})

test('a successful slow request starts a full 30-second resend wait on completion', () => {
  const gate = createOtpRequestGate()
  gate.tryStart(1000)
  gate.finish(11_000, true)
  assert.equal(gate.remainingSeconds(11_000), 30)
  assert.equal(gate.tryStart(31_000), false)
  assert.equal(gate.remainingSeconds(40_999), 1)
  assert.equal(gate.tryStart(40_999), false)
  assert.equal(gate.remainingSeconds(41_000), 0)
  assert.equal(gate.tryStart(41_000), true)
})

test('failed sends release the pending lock and can recover after the attempt cooldown', () => {
  const gate = createOtpRequestGate()
  gate.tryStart(1000)
  gate.finish(2000, false)
  assert.equal(gate.isPending(), false)
  assert.equal(gate.remainingSeconds(2000), 29)
  assert.equal(gate.tryStart(2000), false)
  assert.equal(gate.tryStart(31_000), true)
  gate.finish(33_000, true)
  assert.equal(gate.remainingSeconds(33_000), 30)
})

test('changing number clears prior verification without bypassing the mounted form cooldown', async () => {
  const gate = createOtpRequestGate()
  const verification = createOtpVerificationSession()
  let confirmationCalls = 0
  const confirmation = { async confirm() { confirmationCalls++ } }
  gate.tryStart(1000)
  gate.finish(2000, true)
  await verification.verify(confirmation, '123456')
  // ContactForm's Change number action resets this session, but retains its gate.
  verification.reset()
  assert.equal(gate.tryStart(3000), false)
  assert.equal(gate.remainingSeconds(3000), 29)
  assert.equal(await verification.verify(confirmation, '123456'), true)
  assert.equal(confirmationCalls, 2)
  assert.equal(gate.tryStart(32_000), true)
})

test('verification can run during resend cooldown but excludes simultaneous SMS requests', () => {
  const gate = createOtpRequestGate()
  gate.tryStart(1000)
  assert.equal(gate.tryStartVerification(), false)
  gate.finish(2000, true)
  assert.equal(gate.tryStartVerification(), true)
  assert.equal(gate.tryStart(40_000), false)
  gate.finishVerification()
  assert.equal(gate.remainingSeconds(3000), 29)
  assert.equal(gate.tryStart(3000), false)
})

test('rapid verification submits start only one save until the first operation finishes', async () => {
  const gate = createOtpRequestGate()
  let resolveSave
  let saves = 0
  const pendingSave = new Promise(resolve => { resolveSave = resolve })
  const submit = async () => {
    if (!gate.tryStartVerification()) return 'busy'
    try {
      saves++
      await pendingSave
      return 'saved'
    } finally {
      gate.finishVerification()
    }
  }
  const first = submit()
  assert.equal(await submit(), 'busy')
  assert.equal(saves, 1)
  resolveSave()
  assert.equal(await first, 'saved')
  assert.equal(gate.isPending(), false)
  assert.equal(gate.tryStartVerification(), true)
})
