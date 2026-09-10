// Commission payout calculation for REALESTATE_SOFTWARE.
//
// Implements ../Doubts/HIERARCHY.md §3b (tiered percentage-difference
// model — supersedes an earlier "waterfall / cascading remainder" draft
// that is NOT what's implemented here). Pure functions, no I/O — callers
// are responsible for loading the seller's actual upline chain (via
// s_realestate_users.parent_id) and the current commission rates before
// calling this.
//
// Rounding policy (explicit product decision, not a default): every
// payout line is rounded UP to the next whole rupee — never left
// fractional, never rounded down against the payee. The exact
// pre-rounding figure is always kept alongside it (CommissionLine.rawAmount)
// so nothing is silently lost — see amount's doc comment below.
//
// All intermediate math is done in *integer paise*, not floating-point
// rupees. Multiplying two already-fractional JS numbers (e.g.
// 146.23 sq.yd × ₹8,000.55) can produce binary floating-point noise like
// 1169910.4265000001 — indistinguishable from a real fraction of a
// paisa unless you're careful. Scaling everything to integers before
// multiplying/dividing and only converting back to rupees at the very
// end avoids that whole class of bug (this codebase already hit one
// version of it once — a raw `pool * (pct/100)` landing on
// 14000.000000000002 instead of 14000 — this is the more rigorous fix,
// not just a cleanup pass after the fact).

import type { RealEstateRole } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/platform/access/permissions';

export type CommissionRatesMap = Partial<Record<RealEstateRole, number>>;

export interface CommissionLine {
  role: RealEstateRole;
  /** The marginal percentage this line's amount is based on — the
   * seller's line uses their own full rate; every line above uses
   * (their rate − the rate of whoever's directly below them in the
   * chain). Not the role's raw commission-rate-table percentage except
   * for the seller. Never negative — see clampNonNegative below. */
  percentage: number;
  /** This role's own absolute tier rate at the moment of calculation
   * (e.g. 26.00 for Governing Council) — NOT the marginal `percentage`
   * above. Snapshotted so the UI can show the real "26% − 24% = 2%"
   * subtraction later by reading stored columns, never by recomputing
   * it from (possibly since-changed) live rates or doing the
   * subtraction in a client component. */
  tierPercentage: number;
  /** The rate of whoever was directly below this role in this specific
   * chain (0 for the seller's own line, matching how the formula
   * treats "nothing below the seller"). tierPercentage −
   * previousTierPercentage === percentage, always. */
  previousTierPercentage: number;
  /** Exact, paisa-precise amount before rounding. Kept for audit/
   * transparency: recomputing from plot size × Base Price × the rate
   * table should always reproduce this figure exactly. */
  rawAmount: number;
  /** What's actually paid — rawAmount rounded UP to the next whole
   * rupee. Equal to rawAmount whenever rawAmount was already a whole
   * rupee (the common case for round percentage tables). */
  amount: number;
}

/** Converts a decimal rupee amount (as it comes out of a DECIMAL(15,2)
 * DB column) to an integer number of paise, safely — Math.round guards
 * against the input itself already carrying float noise (e.g. a value
 * read back as 8000.549999999999 instead of 8000.55). */
function toPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

function fromPaise(paise: number): number {
  return paise / 100;
}

/** §5/§3b: pool = plot size (sq.yards) × the project's Base Price
 * (₹/sq.yard) — both DECIMAL(*, 2) values. Multiplying in integer paise
 * (well, integer "centi-units" for each factor, since both factors are
 * themselves 2-decimal values) avoids the float-multiplication drift a
 * plain `plotSize * basePrice` can introduce before any rounding even
 * runs. Result is rupees, rounded to the nearest paisa (exact — this is
 * not an approximation, ₹ has a real 2-decimal smallest unit). */
export function computePool(plotSizeSqyd: number, basePricePerSqyd: number): number {
  const plotSizeCenti = Math.round(plotSizeSqyd * 100); // sq.yd, ×100
  const basePriceCenti = Math.round(basePricePerSqyd * 100); // ₹, ×100 (paise)
  // (plotSize×100) × (basePrice×100) = pool × 10000 — divide back down.
  const poolPaise = Math.round((plotSizeCenti * basePriceCenti) / 100);
  return fromPaise(poolPaise);
}

/** Inverse of computePool: given the TOTAL a customer is to pay for a
 * plot, derives the equivalent ₹/sq.yd rate — for the New Registration
 * form's "Final MRP Customer Should Pay", which is filled in as a total
 * (what a seller actually negotiates with a customer), not a rate, but
 * is stored as mrp_at_submission for parity with base_price_at_submission
 * and because computePool(plotSize, mrp_at_submission) is how every
 * downstream reader (the customer portal's Total Amount) reconstructs
 * it. Same paisa-safe integer approach as computePool, run in reverse —
 * computePool(plotSizeSqyd, computeRatePerSqyd(total, plotSizeSqyd))
 * reproduces `total` exactly for any total/plotSize that are themselves
 * already whole-paisa/whole-centi-sqyd values (true for every real
 * input here — plot size is DECIMAL(10,2), totals are whole rupees). */
export function computeRatePerSqyd(totalAmount: number, plotSizeSqyd: number): number {
  const plotSizeCenti = Math.round(plotSizeSqyd * 100);
  if (plotSizeCenti <= 0) return 0;
  const totalPaise = Math.round(totalAmount * 100);
  // rate×100 (paise) = (total×100 paise) × 100 / (plotSize×100 centi-sqyd)
  const ratePaise = Math.round((totalPaise * 100) / plotSizeCenti);
  return fromPaise(ratePaise);
}

/** A marginal percentage should never be negative under a correctly
 * ascending rate table (§3a), but the rate table is editable and
 * nothing stops it from being edited into a non-ascending shape (e.g.
 * LIA set higher than LIO). Rather than pay someone a *negative*
 * commission in that scenario — which would silently claw back real
 * money — this clamps to 0. The rate table itself isn't validated as
 * ascending (out of scope here); this is the last line of defense at
 * the point money actually changes hands. */
function clampNonNegative(value: number): number {
  return value < 0 ? 0 : value;
}

/** The highest rate in the table strictly below `rate` — i.e. the tier
 * structurally beneath this one, independent of any particular chain.
 * Used only for a colleague sharing the seller's own tier, where the
 * chain itself contains nothing lower to measure against (see the call
 * site). Returns 0 when this is the lowest tier, which correctly leaves
 * such a peer earning their full rate. */
function nextLowerRate(rate: number, rates: CommissionRatesMap): number {
  let best = 0;
  for (const candidate of Object.values(rates)) {
    if (candidate == null) continue;
    if (candidate < rate && candidate > best) best = candidate;
  }
  return best;
}

/**
 * §3b: given a seller and their real upline chain (ordered from the
 * seller's immediate parent upward — e.g. an LIA's chain might be
 * [lio, rm, agm, gm, core, sr_core, director, governing_council, ceo],
 * or a shorter chain if some tiers were skipped when profiles were
 * created, per §2's "not just the next level down" rule), compute each
 * person's payout on a sale.
 *
 * - The seller gets their own full tier percentage of the pool.
 * - Everyone above gets the difference between their percentage and the
 *   percentage of whoever is immediately below them in this specific
 *   chain — applied to the SAME pool, not a shrinking remainder.
 * - With at most one person per tier this telescopes at the rawAmount
 *   level: raw amounts sum to exactly the highest participating tier's
 *   percentage of the pool. Once each line is independently rounded UP
 *   to the next rupee (product decision — see file header), the *paid*
 *   total can exceed that exact figure by up to ~₹1 per line (worst
 *   case ~₹8-9 across a full 9-tier chain) — an accepted, intentional
 *   cost of always rounding in the payee's favor, not a bug.
 * - It deliberately stops telescoping when a tier is held by SEVERAL
 *   active people (e.g. three active CEOs): each of them earns that
 *   tier's full marginal percentage, so the total exceeds the top
 *   tier's percentage by one extra tier-share per additional holder
 *   (three CEOs on a 28% chain pay out 32%, not 28%). That is the
 *   intended rule, not double-payment — see the same-tier handling in
 *   the loop below and the CEO/GC fan-out in downline.ts.
 * - `pool` is `plot_size_sqyd × base_price_at_submission` (§3b/§3d) —
 *   NOT the MRP/customer-facing amount. Use computePool() above to get
 *   this precisely rather than a plain `*`.
 *
 * A role missing from `rates` (e.g. `it` should never appear in a chain
 * at all — it's not commission-eligible, see isCommissionEligible in
 * permissions.ts) is skipped rather than throwing, so a caller that
 * accidentally includes a non-eligible role doesn't corrupt the rest of
 * the breakdown.
 */
export function computeCommissionBreakdown(
  sellerRole: RealEstateRole,
  uplineChain: RealEstateRole[],
  pool: number,
  rates: CommissionRatesMap
): CommissionLine[] {
  const chain: RealEstateRole[] = [sellerRole, ...uplineChain];
  const lines: CommissionLine[] = [];

  if (pool <= 0) return lines; // nothing to pay out on a zero/invalid pool

  const poolPaise = toPaise(pool);
  // `previousRate` is the rate of the tier directly BELOW the one being
  // paid — which is not simply "the last role processed", because a
  // single tier can be held by several people at once (e.g. several
  // active CEOs, who each earn that tier). Advancing on every iteration
  // would give the second holder rate − rate = 0%, so it only advances
  // when the role actually changes.
  let previousRate = 0;
  let lastRole: RealEstateRole | null = null;
  let lastRate = 0;

  for (let i = 0; i < chain.length; i++) {
    const role = chain[i];
    const rate = rates[role];
    if (rate == null) continue;

    if (lastRole !== null && role !== lastRole) {
      previousRate = lastRate;
    } else if (i > 0 && role === lastRole && previousRate === 0) {
      // A colleague sharing the SELLER's own tier. The seller sits at
      // the bottom of the ladder, so their baseline is 0 and they earn
      // their full rate for making the sale — but a peer inheriting that
      // same zero baseline would be paid the full rate too (three CEOs
      // on a CEO's own sale => 84% of the pool, two GCs on a GC's sale
      // => 58%). A peer earns the tier's real margin instead, measured
      // against the tier structurally beneath theirs in the rate table
      // rather than against anything in this chain — nothing lower is
      // present in it to measure from.
      previousRate = nextLowerRate(rate, rates);
    }
    lastRole = role;
    lastRate = rate;

    const marginalPercentage = clampNonNegative(rate - previousRate);

    // percentage × 100 (so e.g. 2.00% -> 200 "basis-centi-points"), then
    // (poolPaise × percentageCenti) / 10000 gives the raw amount in
    // paise — all integer math until the final division.
    const percentageCenti = Math.round(marginalPercentage * 100);
    const rawAmountPaise = Math.round((poolPaise * percentageCenti) / 10000);
    const rawAmount = fromPaise(rawAmountPaise);

    // Ceiling to the next whole rupee: any leftover paise at all bumps
    // up to the next rupee. Working in paise here (rather than
    // Math.ceil(rawAmount) directly) sidesteps any residual float noise
    // in rawAmount itself.
    const amount = Math.ceil(rawAmountPaise / 100);

    lines.push({ role, percentage: marginalPercentage, tierPercentage: rate, previousTierPercentage: previousRate, rawAmount, amount });

    // NOTE: previousRate is deliberately NOT advanced here — that now
    // happens at the top of the loop, and only when the role changes
    // (see the comment there). A role missing from the rate table is
    // still skipped entirely via the `continue` above rather than being
    // treated as 0%, so the next present role's marginal % is measured
    // against the last real participant, not a phantom gap.
  }

  return lines;
}

function roundToPaise(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Sum of every line's *paid* amount (post-rounding) — what the company
 * actually pays out on this sale. `pool - totalPayout` is the company's
 * residual margin from the commission pool specifically (separate from
 * the MRP-minus-Base-Price spread, which is company revenue outside
 * this formula entirely). Use totalRawPayout() for the exact
 * pre-rounding figure. */
export function totalPayout(lines: CommissionLine[]): number {
  return roundToPaise(lines.reduce((sum, line) => sum + line.amount, 0));
}

/** Sum of every line's exact, pre-rounding amount — telescopes to
 * exactly the highest participating tier's percentage of the pool. */
export function totalRawPayout(lines: CommissionLine[]): number {
  return roundToPaise(lines.reduce((sum, line) => sum + line.rawAmount, 0));
}
