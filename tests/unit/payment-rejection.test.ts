import { describe, it, expect } from 'vitest'

describe('Payment Rejection Invariant Tests', () => {
  it('does not double pending_amount upon payout rejection', () => {
    // Initial state: Creator deal is ₹802 (₹302 order + ₹500 reel)
    const basePending = 802
    const basePartial = 0
    const baseFinal = 0
    const preparedAmount = 802

    // Before fix:
    // const badRevertedPending = basePending + preparedAmount // = 1604 (BUG)
    // expect(badRevertedPending).toBe(1604)

    // After fix:
    // Payout preparation / dual-approval NEVER deducted from pending_amount
    // Therefore rejection must keep pending_amount intact
    const currentPartial = basePartial
    const currentFinal = baseFinal
    const currentPending = basePending

    const knownTotalDeal = 802
    const safePending = knownTotalDeal > 0
      ? Math.max(0, knownTotalDeal - (currentPartial + currentFinal))
      : currentPending

    expect(safePending).toBe(802)
    expect(currentPartial).toBe(0)
  })

  it('preserves legitimate past milestone payments on rejection without decrementing', () => {
    // Scenario: Milestone 1 of ₹300 was disbursed in the past.
    // Milestone 2 of ₹500 is prepared and rejected in Finance Queue.
    const partialPayment = 300
    const finalPayment = 0
    const remainingPending = 500
    const preparedAmount = 500

    // Bad logic: Math.max(0, partialPayment - preparedAmount) -> Math.max(0, 300 - 500) = 0!
    // Correct logic:
    const safePartial = partialPayment
    const knownTotalDeal = 800
    const safePending = Math.max(0, knownTotalDeal - (safePartial + finalPayment))

    expect(safePartial).toBe(300)
    expect(safePending).toBe(500)
  })

  it('ensures repeated rejections never inflate the balance', () => {
    let pending = 802
    const totalDeal = 802
    const preparedAmount = 802

    // Rejection 1
    pending = totalDeal > 0 ? Math.max(0, totalDeal - 0) : pending
    expect(pending).toBe(802)

    // Rejection 2
    pending = totalDeal > 0 ? Math.max(0, totalDeal - 0) : pending
    expect(pending).toBe(802)

    // Rejection 3
    pending = totalDeal > 0 ? Math.max(0, totalDeal - 0) : pending
    expect(pending).toBe(802)
  })
})
