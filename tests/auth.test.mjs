import test from 'node:test';
import assert from 'node:assert/strict';

// --- MOCK ENVIRONMENT --- //
// Simulating Supabase Auth functions
const mockDatabase = new Map();
let currentSession = null; // Simulating active user session

async function mockResetPasswordForEmail(email, options) {
  if (!email || !email.includes('@')) {
    return { error: { message: 'Invalid email' } };
  }
  
  // Simulate checking if email exists (in a real app, Supabase does this but doesn't expose it directly by default for security, but let's assume it sends the email)
  const resetToken = 'dummy-reset-token';
  const url = `${options.redirectTo}#access_token=${resetToken}`;
  
  // Store the valid reset token
  mockDatabase.set(resetToken, email);
  
  return { data: { url }, error: null };
}

// Simulates user clicking the link and `@supabase/ssr` browser client picking it up
async function mockProcessResetLink(hashToken) {
  const email = mockDatabase.get(hashToken);
  if (!email) return false;
  
  // Set session
  currentSession = { email, role: 'Admin' };
  mockDatabase.delete(hashToken); // Tokens are one-time use
  return true;
}

// Simulates the updatePassword server action
async function mockUpdatePassword(password, confirmPassword) {
  if (!password || !confirmPassword) {
    return { error: 'Both fields are required' };
  }

  if (password !== confirmPassword) {
    return { error: 'Passwords do not match' };
  }

  if (password.length < 6) {
    return { error: 'Password must be at least 6 characters' };
  }

  // Check session
  if (!currentSession) {
    return { error: 'You must be logged in via a reset link to change your password. The link may have expired.' };
  }

  // Update password logic (simulate success)
  currentSession = null; // Forces sign out after password change
  
  return { success: true };
}

// --- TEST SUITE --- //
test('Password Reset Workflow', async (t) => {
  
  await t.test('1. Submitting reset for valid email generates correct redirect URL format', async () => {
    const email = 'admin@bhuwanta.com';
    const res = await mockResetPasswordForEmail(email, { redirectTo: 'http://localhost:3000/crm/update-password' });
    
    assert.equal(res.error, null);
    assert.ok(res.data.url.includes('http://localhost:3000/crm/update-password#access_token='));
  });
  
  await t.test('2. Fails when invalid email is provided', async () => {
    const res = await mockResetPasswordForEmail('invalid-email', { redirectTo: 'http://localhost:3000/crm/update-password' });
    
    assert.ok(res.error);
    assert.equal(res.error.message, 'Invalid email');
  });

  await t.test('3. Successfully updates password when arriving via valid reset link', async () => {
    // 1. User requests reset
    const email = 'admin2@bhuwanta.com';
    const res = await mockResetPasswordForEmail(email, { redirectTo: 'http://localhost:3000/crm/update-password' });
    const token = res.data.url.split('#access_token=')[1];
    
    // 2. User clicks link and loads page (browser client establishes session)
    const processed = await mockProcessResetLink(token);
    assert.equal(processed, true);
    
    // 3. User submits form
    const updateRes = await mockUpdatePassword('newPassword123', 'newPassword123');
    assert.equal(updateRes.success, true);
    assert.equal(currentSession, null, 'User should be logged out after password update');
  });

  await t.test('4. Fails to update password if no valid session exists (expired link)', async () => {
    currentSession = null; // Ensure no session
    
    const updateRes = await mockUpdatePassword('newPassword123', 'newPassword123');
    assert.equal(updateRes.success, undefined);
    assert.equal(updateRes.error, 'You must be logged in via a reset link to change your password. The link may have expired.');
  });

  await t.test('5. Rejects mismatched passwords', async () => {
    currentSession = { email: 'test@bhuwanta.com' };
    
    const updateRes = await mockUpdatePassword('password123', 'differentPassword');
    assert.equal(updateRes.success, undefined);
    assert.equal(updateRes.error, 'Passwords do not match');
  });

  await t.test('6. Rejects short passwords', async () => {
    currentSession = { email: 'test@bhuwanta.com' };
    
    const updateRes = await mockUpdatePassword('12345', '12345');
    assert.equal(updateRes.success, undefined);
    assert.equal(updateRes.error, 'Password must be at least 6 characters');
  });
});
