// Shared password policy — same rule enforced in user-management's
// createExecutiveAction/updateExecutiveAction, factored out so the
// self-service "change my own password" actions (sales tiers, Customer)
// don't duplicate it.

export function validatePassword(password: string): string | null {
  const hasUpperCase = /[A-Z]/.test(password)
  const hasNumber = /[0-9]/.test(password)
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password)
  const isLengthValid = password.length >= 8 && password.length <= 20

  if (!isLengthValid || !hasUpperCase || !hasNumber || !hasSpecialChar) {
    return 'Password must be 8-20 characters long and include an uppercase letter, a number, and a special character.'
  }
  return null
}
