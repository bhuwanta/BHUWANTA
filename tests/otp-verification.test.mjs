import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import ts from 'typescript'

const source = await readFile(new URL('../src/lib/firebase/otp-verification.ts', import.meta.url), 'utf8')
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
})
const { createOtpVerificationSession } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`)

test('a failed lead save can retry after OTP success without consuming the OTP twice', async () => {
  const session = createOtpVerificationSession()
  let confirmationCalls = 0
  let saves = 0
  const confirmation = {
    async confirm() {
      confirmationCalls++
      if (confirmationCalls > 1) throw new Error('OTP already used')
      return { user: {} }
    },
  }
  const submit = async () => {
    await session.verify(confirmation, '123456')
    saves++
    if (saves === 1) throw new Error('temporary lead API failure')
    return { leadId: 'saved-test-lead' }
  }
  await assert.rejects(submit, /temporary lead API failure/)
  assert.deepEqual(await submit(), { leadId: 'saved-test-lead' })
  assert.equal(confirmationCalls, 1)
  assert.equal(saves, 2)
})

test('an invalid OTP is never cached as verified and a corrected OTP is checked', async () => {
  const session = createOtpVerificationSession()
  const checkedCodes = []
  const confirmation = {
    async confirm(code) {
      checkedCodes.push(code)
      if (code !== '654321') throw new Error('invalid OTP')
    },
  }
  await assert.rejects(() => session.verify(confirmation, '111111'), /invalid OTP/)
  assert.equal(await session.verify(confirmation, '654321'), true)
  assert.deepEqual(checkedCodes, ['111111', '654321'])
  assert.equal(await session.verify(confirmation, '654321'), false)
})

test('changing phone or requesting another code cannot reuse the previous verification', async () => {
  const session = createOtpVerificationSession()
  const verified = []
  const first = { async confirm() { verified.push('first') } }
  const second = { async confirm() { verified.push('second') } }
  await session.verify(first, '123456')
  assert.equal(await session.verify(second, '123456'), true)
  assert.deepEqual(verified, ['first', 'second'])
  session.reset()
  assert.equal(await session.verify(second, '123456'), true)
  assert.deepEqual(verified, ['first', 'second', 'second'])
})

test('separate mounted forms do not share a verification cache', async () => {
  const first = createOtpVerificationSession()
  const second = createOtpVerificationSession()
  let confirmations = 0
  const confirmation = { async confirm() { confirmations++ } }
  await first.verify(confirmation, '123456')
  await second.verify(confirmation, '123456')
  assert.equal(confirmations, 2)
})
