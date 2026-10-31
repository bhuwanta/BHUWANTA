import test from 'node:test';
import assert from 'node:assert/strict';

// Helper function that matches the slug generation logic in actions.ts
function generateSlug(name) {
  return (name || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

// Logic simulating safe status deletion guardrails
function canDeleteStatus(status, leadsCount, reassignToKey) {
  if (status.is_system) {
    return { canDelete: false, error: 'SYSTEM_PROTECTED' };
  }
  if (leadsCount > 0 && !reassignToKey) {
    return { canDelete: false, error: 'IN_USE_REQUIRES_REASSIGN' };
  }
  if (leadsCount > 0 && reassignToKey === status.key) {
    return { canDelete: false, error: 'CANNOT_REASSIGN_TO_SELF' };
  }
  return { canDelete: true };
}

// Logic simulating phone synchronization across inquiries
function syncLeadsByPhone(leads, targetLeadId, newStatus) {
  const target = leads.find(l => l.id === targetLeadId);
  if (!target) return { updatedLeads: leads, syncedCount: 0 };

  const rawPhone = (target.phone || '').trim();
  const cleanPhone = rawPhone.replace(/\D/g, '');

  if (cleanPhone.length < 7) {
    return {
      updatedLeads: leads.map(l => l.id === targetLeadId ? { ...l, status: newStatus } : l),
      syncedCount: 1
    };
  }

  let count = 0;
  const updatedLeads = leads.map(l => {
    const lClean = (l.phone || '').replace(/\D/g, '');
    if (l.id === targetLeadId || (lClean.length >= 7 && lClean.slice(-10) === cleanPhone.slice(-10))) {
      count++;
      return { ...l, status: newStatus };
    }
    return l;
  });

  return { updatedLeads, syncedCount: count };
}

test('Lead Status Module - Slug Normalization', () => {
  assert.equal(generateSlug('Site Visit Done'), 'site_visit_done');
  assert.equal(generateSlug('  Follow-Up Scheduled!  '), 'follow_up_scheduled');
  assert.equal(generateSlug('Negotiation & Pricing'), 'negotiation_pricing');
});

test('Lead Status Module - Deletion Guardrails', () => {
  const systemStatus = { id: '1', key: 'new', name: 'New', is_system: true };
  const customStatus = { id: '2', key: 'site_visit', name: 'Site Visit', is_system: false };

  // 1. System default cannot be deleted
  const res1 = canDeleteStatus(systemStatus, 0, null);
  assert.equal(res1.canDelete, false);
  assert.equal(res1.error, 'SYSTEM_PROTECTED');

  // 2. Active status with 25 leads cannot be deleted without fallback
  const res2 = canDeleteStatus(customStatus, 25, null);
  assert.equal(res2.canDelete, false);
  assert.equal(res2.error, 'IN_USE_REQUIRES_REASSIGN');

  // 3. Active status cannot be reassigned to itself
  const res3 = canDeleteStatus(customStatus, 25, 'site_visit');
  assert.equal(res3.canDelete, false);
  assert.equal(res3.error, 'CANNOT_REASSIGN_TO_SELF');

  // 4. Active status can be deleted with a valid fallback
  const res4 = canDeleteStatus(customStatus, 25, 'contacted');
  assert.equal(res4.canDelete, true);

  // 5. Unused custom status (0 leads) can be deleted directly
  const res5 = canDeleteStatus(customStatus, 0, null);
  assert.equal(res5.canDelete, true);
});

test('Lead Status Module - Phone Deduplication Sync', () => {
  const leads = [
    { id: 'lead_1', name: 'Rani', phone: '9916994444', status: 'new' },
    { id: 'lead_2', name: 'Rani', phone: '+91 9916994444', status: 'new' },
    { id: 'lead_3', name: 'Rani', phone: '99169 94444', status: 'new' },
    { id: 'lead_4', name: 'John', phone: '9888877777', status: 'new' }
  ];

  // When marking Rani lead_1 as 'contacted', all 3 Rani inquiries should update to 'contacted'
  const { updatedLeads, syncedCount } = syncLeadsByPhone(leads, 'lead_1', 'contacted');

  assert.equal(syncedCount, 3);
  assert.equal(updatedLeads.find(l => l.id === 'lead_1').status, 'contacted');
  assert.equal(updatedLeads.find(l => l.id === 'lead_2').status, 'contacted');
  assert.equal(updatedLeads.find(l => l.id === 'lead_3').status, 'contacted');
  // John should remain unaffected
  assert.equal(updatedLeads.find(l => l.id === 'lead_4').status, 'new');
});
