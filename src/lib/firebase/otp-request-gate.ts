/** Per-form SMS cooldown and shared send/submit lock, preserved across steps. */
export function createOtpRequestGate(cooldownMs = 30_000) {
  let inFlight = false
  let nextRequestAt = 0

  return {
    tryStart(now: number): boolean {
      if (inFlight || now < nextRequestAt) return false
      inFlight = true
      nextRequestAt = now + cooldownMs
      return true
    },
    finish(now: number, sent: boolean) {
      inFlight = false
      // Start a full wait after Firebase accepts a request, even if it was slow.
      if (sent) nextRequestAt = Math.max(nextRequestAt, now + cooldownMs)
    },
    tryStartVerification(): boolean {
      if (inFlight) return false
      inFlight = true
      return true
    },
    finishVerification() {
      inFlight = false
    },
    isPending() {
      return inFlight
    },
    remainingSeconds(now: number) {
      return Math.max(0, Math.ceil((nextRequestAt - now) / 1000))
    },
  }
}
