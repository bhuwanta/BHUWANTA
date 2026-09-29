type PhoneConfirmation = {
  confirm: (code: string) => Promise<unknown>
}

/** Keep a verified OTP usable for a lead-save retry in the same form session. */
export function createOtpVerificationSession() {
  let verifiedConfirmation: PhoneConfirmation | null = null

  return {
    async verify(confirmation: PhoneConfirmation, code: string): Promise<boolean> {
      if (verifiedConfirmation === confirmation) return false
      await confirmation.confirm(code)
      verifiedConfirmation = confirmation
      return true
    },
    reset() {
      verifiedConfirmation = null
    },
  }
}
