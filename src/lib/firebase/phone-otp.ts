// Loads Firebase phone auth on demand. The enquiry forms appear on most public
// pages, but Firebase is only needed once a visitor asks for an OTP, so it is
// fetched then instead of being bundled into every page's initial JavaScript.
export async function loadPhoneAuth() {
  const [{ RecaptchaVerifier, signInWithPhoneNumber }, { auth }] = await Promise.all([
    import('firebase/auth'),
    import('@/lib/firebase/config'),
  ])
  return { auth, RecaptchaVerifier, signInWithPhoneNumber }
}
