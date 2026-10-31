import test from 'node:test';
import assert from 'node:assert/strict';

// --- MOCK ENVIRONMENT --- //
// Simulating the Redis store we use in production
const mockRedis = new Map();

// Pure logic for sending OTP
async function mockSendEmailOtp(email) {
  if (!email || !email.includes('@')) {
    return { success: false, error: 'Invalid email format' };
  }
  
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const key = `email-otp:${email}`;
  
  // Store OTP (simulating 10 min expiry by attaching a timestamp)
  mockRedis.set(key, { otp, expiresAt: Date.now() + 600 * 1000 });
  
  return { success: true, generatedOtp: otp };
}

// Pure logic for verifying OTP
async function mockVerifyAndAddEmail(email, enteredOtp) {
  const key = `email-otp:${email}`;
  const record = mockRedis.get(key);
  
  if (!record) {
    return { success: false, error: 'Invalid or expired OTP code' };
  }
  
  if (Date.now() > record.expiresAt) {
    mockRedis.delete(key);
    return { success: false, error: 'Invalid or expired OTP code' };
  }
  
  // CRITICAL FIX: Cast to string to prevent number vs string strict inequality
  if (String(record.otp) !== String(enteredOtp)) {
    return { success: false, error: 'Invalid or expired OTP code' };
  }
  
  // Clean up on success
  mockRedis.delete(key);
  return { success: true };
}

// --- TEST SUITE --- //
test('OTP Verification System', async (t) => {
  
  await t.test('1. Successfully sends and verifies a valid OTP', async () => {
    const email = 'test1@example.com';
    const sendRes = await mockSendEmailOtp(email);
    assert.equal(sendRes.success, true);
    
    const verifyRes = await mockVerifyAndAddEmail(email, sendRes.generatedOtp);
    assert.equal(verifyRes.success, true);
  });
  
  await t.test('2. Fails when incorrect OTP is provided', async () => {
    const email = 'test2@example.com';
    await mockSendEmailOtp(email);
    
    const verifyRes = await mockVerifyAndAddEmail(email, '000000');
    assert.equal(verifyRes.success, false);
    assert.equal(verifyRes.error, 'Invalid or expired OTP code');
  });

  await t.test('3. Safely handles numeric vs string typing from cache (The Bug Fix)', async () => {
    const email = 'test3@example.com';
    
    // Simulate cache returning a pure number (which Upstash Redis sometimes does)
    mockRedis.set(`email-otp:${email}`, { otp: 123456, expiresAt: Date.now() + 600000 });
    
    // The user inputs a string from the text field
    const verifyRes = await mockVerifyAndAddEmail(email, "123456");
    assert.equal(verifyRes.success, true, "Should verify successfully despite type mismatch");
  });

  await t.test('4. Fails when OTP has expired', async () => {
    const email = 'test4@example.com';
    
    // Simulate expired OTP (expiresAt is in the past)
    mockRedis.set(`email-otp:${email}`, { otp: '654321', expiresAt: Date.now() - 1000 });
    
    const verifyRes = await mockVerifyAndAddEmail(email, '654321');
    assert.equal(verifyRes.success, false);
    assert.equal(verifyRes.error, 'Invalid or expired OTP code');
  });

  await t.test('5. Rejects missing or malformed email', async () => {
    const sendRes = await mockSendEmailOtp('not-an-email');
    assert.equal(sendRes.success, false);
  });

  await t.test('6. OTP is deleted after successful verification (One-time use)', async () => {
    const email = 'test6@example.com';
    const sendRes = await mockSendEmailOtp(email);
    
    // First attempt succeeds
    await mockVerifyAndAddEmail(email, sendRes.generatedOtp);
    
    // Second attempt with same OTP fails
    const verifyRes2 = await mockVerifyAndAddEmail(email, sendRes.generatedOtp);
    assert.equal(verifyRes2.success, false);
  });
});
