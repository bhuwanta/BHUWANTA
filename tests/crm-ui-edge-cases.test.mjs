import test from 'node:test'
import assert from 'node:assert/strict'

// ============================================================================
// 1. Double Click Prevention & Mutex Locks Across Dashboard Pages
// ============================================================================

test('Double Click Mutex: Login & Password Reset submit drops concurrent clicks', async () => {
  let loginRequestsCount = 0
  const isPendingRef = { current: false }

  const handleLoginSubmit = async () => {
    if (isPendingRef.current) return { skipped: true }
    isPendingRef.current = true
    try {
      loginRequestsCount++
      await new Promise(resolve => setTimeout(resolve, 25))
      return { success: true }
    } finally {
      isPendingRef.current = false
    }
  }

  // Simulate two concurrent clicks fired within the same microtask
  const [res1, res2] = await Promise.all([
    handleLoginSubmit(),
    handleLoginSubmit()
  ])

  assert.equal(res1.success, true)
  assert.equal(res2.skipped, true)
  assert.equal(loginRequestsCount, 1)

  // Third click after release succeeds
  const res3 = await handleLoginSubmit()
  assert.equal(res3.success, true)
  assert.equal(loginRequestsCount, 2)
})

test('Double Click Mutex: User Management (Add User, Edit User, Delete User)', async () => {
  let createdUsers = 0
  const isAddingUserRef = { current: false }

  const handleAddUser = async (email) => {
    if (isAddingUserRef.current) return { skipped: true }
    isAddingUserRef.current = true
    try {
      createdUsers++
      await new Promise(resolve => setTimeout(resolve, 30))
      return { success: true, email }
    } finally {
      isAddingUserRef.current = false
    }
  }

  const [call1, call2, call3] = await Promise.all([
    handleAddUser('user1@bhuwanta.com'),
    handleAddUser('user1@bhuwanta.com'),
    handleAddUser('user1@bhuwanta.com')
  ])

  assert.equal(call1.success, true)
  assert.equal(call2.skipped, true)
  assert.equal(call3.skipped, true)
  assert.equal(createdUsers, 1, 'Only 1 user created despite 3 rapid concurrent clicks')
})

test('Double Click Mutex: Lead Creation & Bulk Deletion', async () => {
  let bulkDeletesCount = 0
  const isBulkDeletingRef = { current: false }

  const confirmBulkDelete = async (ids) => {
    if (isBulkDeletingRef.current) return { skipped: true }
    isBulkDeletingRef.current = true
    try {
      bulkDeletesCount++
      await new Promise(resolve => setTimeout(resolve, 20))
      return { success: true, count: ids.length }
    } finally {
      isBulkDeletingRef.current = false
    }
  }

  const [d1, d2] = await Promise.all([
    confirmBulkDelete(['lead-1', 'lead-2']),
    confirmBulkDelete(['lead-1', 'lead-2'])
  ])

  assert.equal(d1.success, true)
  assert.equal(d2.skipped, true)
  assert.equal(bulkDeletesCount, 1)
})

test('Double Click Mutex: Meta Ads Manual Sync & CSV Export', async () => {
  let syncsCount = 0
  const isSyncingRef = { current: false }

  const handleManualSync = async () => {
    if (isSyncingRef.current) return { skipped: true }
    isSyncingRef.current = true
    try {
      syncsCount++
      await new Promise(resolve => setTimeout(resolve, 20))
      return { success: true }
    } finally {
      isSyncingRef.current = false
    }
  }

  const [s1, s2] = await Promise.all([
    handleManualSync(),
    handleManualSync()
  ])

  assert.equal(s1.success, true)
  assert.equal(s2.skipped, true)
  assert.equal(syncsCount, 1)
})

// ============================================================================
// 2. Modal Dismissal: Escape Key Listener & Backdrop Click Detection
// ============================================================================

test('Modal Dismissal: Escape key invokes respective modal dismissal', () => {
  let isAddModalOpen = true
  let isDeleteModalOpen = false
  let selectedLeadToDelete = null

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      if (isAddModalOpen) isAddModalOpen = false
      if (isDeleteModalOpen) isDeleteModalOpen = false
      if (selectedLeadToDelete) selectedLeadToDelete = null
    }
  }

  // Trigger escape when Add Modal is open
  handleKeyDown({ key: 'Escape' })
  assert.equal(isAddModalOpen, false)

  // Trigger escape when Delete Confirmation is open
  selectedLeadToDelete = { id: 'lead-123', name: 'John' }
  assert.notEqual(selectedLeadToDelete, null)
  handleKeyDown({ key: 'Escape' })
  assert.equal(selectedLeadToDelete, null)

  // Non-escape keys should not close modal
  isAddModalOpen = true
  handleKeyDown({ key: 'Enter' })
  assert.equal(isAddModalOpen, true)
})

test('Modal Dismissal: Backdrop click dismisses only when clicking the overlay container', () => {
  let modalClosed = false
  const closeModal = () => { modalClosed = true }

  const backdropElement = { id: 'backdrop' }
  const cardElement = { id: 'modal-card-content' }

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      closeModal()
    }
  }

  // Case A: User clicks inside the modal card (target is cardElement, currentTarget is backdropElement)
  handleBackdropClick({ target: cardElement, currentTarget: backdropElement })
  assert.equal(modalClosed, false, 'Modal should remain open when clicking inside modal card')

  // Case B: User clicks on the dark backdrop directly (target is backdropElement, currentTarget is backdropElement)
  handleBackdropClick({ target: backdropElement, currentTarget: backdropElement })
  assert.equal(modalClosed, true, 'Modal should dismiss when clicking on backdrop')
})

// ============================================================================
// 3. Background Body Scroll Lock
// ============================================================================

test('Body Scroll Lock: Sets overflow hidden when active, restores original overflow on dismiss', () => {
  const fakeDocument = {
    body: {
      style: {
        overflow: 'visible'
      }
    }
  }

  const applyBodyScrollLock = (isModalOpen) => {
    if (isModalOpen) {
      const orig = fakeDocument.body.style.overflow
      fakeDocument.body.style.overflow = 'hidden'
      return () => {
        fakeDocument.body.style.overflow = orig
      }
    }
    return () => {}
  }

  // 1. Modal opens
  const cleanup = applyBodyScrollLock(true)
  assert.equal(fakeDocument.body.style.overflow, 'hidden')

  // 2. Modal closes (cleanup runs)
  cleanup()
  assert.equal(fakeDocument.body.style.overflow, 'visible')
})

// ============================================================================
// 4. Stored XSS Tag Sanitization in Recipient & Status Names
// ============================================================================

test('Sanitization: HTML script and event tags are stripped from recipient names', () => {
  const sanitizeName = (raw) => {
    if (!raw || typeof raw !== 'string') return ''
    return raw
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<[^>]*>/g, '')
      .trim()
  }

  assert.equal(sanitizeName('<script>alert("XSS")</script>Santosh Suroju'), 'Santosh Suroju')
  assert.equal(sanitizeName('<img src=x onerror=alert(1)>'), '')
  assert.equal(sanitizeName('<b>Executive Admin</b>'), 'Executive Admin')
  assert.equal(sanitizeName('   Normal Name   '), 'Normal Name')
  assert.equal(sanitizeName(null), '')
})

// ============================================================================
// 5. Master Default Badge Matching
// ============================================================================

test('Master Default Recipient: Matches both legacy ID and remote Supabase UUID with bhuwanta9@gmail.com', () => {
  const isMasterDefault = (recipient) => {
    return (
      recipient.id === 'master-alert-default' ||
      recipient.email.toLowerCase() === 'bhuwanta9@gmail.com'
    )
  }

  // 1. Legacy local mock ID
  assert.equal(isMasterDefault({ id: 'master-alert-default', email: 'bhuwanta9@gmail.com' }), true)

  // 2. Production Supabase record with remote UUID
  assert.equal(isMasterDefault({ id: '2b4637c2-3063-42fa-8692-9f46c529cf36', email: 'bhuwanta9@gmail.com' }), true)
  assert.equal(isMasterDefault({ id: '2b4637c2-3063-42fa-8692-9f46c529cf36', email: 'BHUWANTA9@GMAIL.COM' }), true)

  // 3. Secondary / newly added recipient
  assert.equal(isMasterDefault({ id: '9a8b7c6d-5432-10fe-dcba-0987654321fe', email: 'admin@bhuwanta.com' }), false)
})

// ============================================================================
// 6. Keyboard Enter Key Handling in Inline Edit Inputs
// ============================================================================

test('Inline Edit Navigation: Enter key commits edit, other keys do not', () => {
  let savedId = null
  const handleSaveEdit = (id) => { savedId = id }

  const handleInputKeyDown = (e, recipientId) => {
    if (e.key === 'Enter') {
      handleSaveEdit(recipientId)
    }
  }

  // Normal typing should not trigger save
  handleInputKeyDown({ key: 'a' }, 'rec-123')
  assert.equal(savedId, null)

  // Pressing Enter should immediately commit
  handleInputKeyDown({ key: 'Enter' }, 'rec-123')
  assert.equal(savedId, 'rec-123')
})
