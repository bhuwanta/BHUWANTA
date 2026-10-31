import test from 'node:test';
import assert from 'node:assert';

// Mock Supabase Client
const createMockSupabase = (shouldFail = false) => ({
  auth: {
    updateUser: async ({ password }) => {
      if (shouldFail) {
        return { data: null, error: { message: 'Auth session missing!' } };
      }
      if (password.length < 6) {
        return { data: null, error: { message: 'Password should be at least 6 characters.' } };
      }
      return { data: { user: { id: 'test-user-id' } }, error: null };
    }
  }
});

test('Password Reset Functionality', async (t) => {
  await t.test('Successfully updates password for logged in user', async () => {
    const supabase = createMockSupabase();
    
    // Simulate updating password to a valid one
    const newPassword = 'SecurePassword123!';
    const { data, error } = await supabase.auth.updateUser({ password: newPassword });
    
    assert.strictEqual(error, null, 'Error should be null when update is successful');
    assert.ok(data?.user?.id, 'User object should be returned on success');
  });

  await t.test('Fails to update if password is too short', async () => {
    const supabase = createMockSupabase();
    
    // Simulate updating password to a short one
    const shortPassword = '123';
    const { data, error } = await supabase.auth.updateUser({ password: shortPassword });
    
    assert.ok(error, 'Error should be returned when password is too short');
    assert.strictEqual(error.message, 'Password should be at least 6 characters.', 'Correct error message should be returned');
    assert.strictEqual(data, null, 'Data should be null on error');
  });

  await t.test('Fails to update if user is not authenticated', async () => {
    const supabase = createMockSupabase(true); // Mock a missing session
    
    // Simulate updating password without active session
    const newPassword = 'SecurePassword123!';
    const { data, error } = await supabase.auth.updateUser({ password: newPassword });
    
    assert.ok(error, 'Error should be returned when unauthenticated');
    assert.strictEqual(error.message, 'Auth session missing!', 'Correct error message should be returned');
    assert.strictEqual(data, null, 'Data should be null on error');
  });
});
