'use server'

/** Purely a display-time convenience for the "Reference Math Calculation"
 * shown on the New Registration form — computes plotSize × mrpRate
 * server-side so the browser never does the multiplication itself (this
 * app's zero-frontend-math rule applies even to a cosmetic, non-submitted
 * readout, not just to authoritative money math). Rounded to paisa
 * precision before ceiling to the nearest rupee, to strip binary
 * floating-point noise (e.g. 2290672.0000000002 from 143.167 * 16000)
 * rather than let it push the ceiling up by a spurious extra rupee. */
export async function calculateReferenceTotalAction(plotSize: number, mrpRate: number) {
  if (!Number.isFinite(plotSize) || !Number.isFinite(mrpRate) || plotSize <= 0 || mrpRate <= 0) {
    return { success: false as const, error: 'Invalid input.' }
  }

  const raw = Math.round(plotSize * mrpRate * 100) / 100
  const rounded = Math.ceil(raw)
  const roundingDiff = rounded - raw

  return { success: true as const, raw, rounded, roundingDiff }
}
