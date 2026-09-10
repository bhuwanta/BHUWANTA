// Shared phone-number policy. The phone is the login ID for every staff
// account (user-management) and doubles as the identity a returning
// customer is matched on (registrations/actions.ts's searchCustomersAction
// and the UNIQUE constraint on S_realestate_users.phone), so a stray
// space, "+91" prefix or an 11th digit doesn't just look untidy — it
// creates a second account for a person who already exists.
//
// Factored out the same way password-policy.ts is, so every entry point
// enforces one rule rather than each re-inventing it.

/** Strips everything that isn't a digit — use on input so pasting
 * "+91 98765 43210" or "(9876) 543210" lands as digits rather than being
 * rejected outright. */
export function normalizePhone(raw: string): string {
  return (raw || '').replace(/\D/g, '')
}

/** Returns an error message, or null when the number is acceptable.
 * Exactly 10 digits — Indian mobile numbers, with no country code, since
 * that's what the login form expects the user to type. */
export function validatePhone(phone: string): string | null {
  const digits = normalizePhone(phone)

  if (digits.length === 0) return 'Phone number is required.'
  if (digits.length !== 10) {
    return `Phone number must be exactly 10 digits — that one has ${digits.length}.`
  }
  return null
}
