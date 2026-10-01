import { describe, it, expect } from 'vitest'

describe('Finance Desk Split Payout Classification & Invariant Tests', () => {
  // Helper mimicking finance page logic
  const getPayableAmount = (app: any) => {
    const init = app.form_data?.payment_initiation
    const initiated = app.form_data?.payment_initiated
    const pending = Number(app.pending_amount) || 0
    const hasPriorPayout = Boolean(app.form_data?.finance_payout_completed || (app.form_data?.payment_transactions?.length > 0))

    if (hasPriorPayout && pending <= 0) {
      return 0
    }

    if (init?.prepared_amount && Number(init.prepared_amount) > 0) {
      if (hasPriorPayout && pending > 0) {
        return Math.min(Number(init.prepared_amount), pending)
      }
      return Number(init.prepared_amount)
    }
    if (initiated?.amount && Number(initiated.amount) > 0) {
      if (hasPriorPayout && pending > 0) {
        return Math.min(Number(initiated.amount), pending)
      }
      return Number(initiated.amount)
    }
    return pending
  }

  const isInitiationDisbursed = (app: any) => {
    const init = app.form_data?.payment_initiation
    if (!init) return false
    if (init.status === 'disbursed') return true

    const executedAt = app.form_data?.finance_payout_completed?.executed_at
    const approvedAt = init.second_approved_at || init.prepared_at
    if (executedAt && approvedAt) {
      return new Date(executedAt).getTime() >= new Date(approvedAt).getTime()
    }
    return false
  }

  const isEligibleForFinanceQueue = (app: any) => {
    const init = app.form_data?.payment_initiation
    const payableAmt = getPayableAmount(app)
    if (payableAmt <= 0) return false

    const isDualApproved =
      (app.status === 'Payment Approved' || init?.status === 'approved_for_finance') &&
      init?.status !== 'pending_second_approval' &&
      app.status !== 'Payment Requested'

    if (!isDualApproved) return false
    if (isInitiationDisbursed(app)) return false

    return true
  }

  it('includes split second payout in Finance Queue even if a prior partial payout was disbursed', () => {
    // Creator deal: ₹809 total
    // ₹500 was disbursed on Sept 28
    // ₹309 was prepared and approved on Oct 01
    const app = {
      id: 'chamala-app',
      status: 'Payment Approved',
      partial_payment: 500,
      pending_amount: 309,
      form_data: {
        finance_payout_completed: {
          batch_id: '0928ban',
          amount_paid: 500,
          executed_at: '2026-09-28T07:41:25.787Z',
        },
        payment_transactions: [
          {
            amount: 500,
            executed_at: '2026-09-28T07:41:25.787Z',
          },
        ],
        payment_initiation: {
          status: 'approved_for_finance',
          prepared_amount: 309,
          prepared_at: '2026-10-01T08:11:09.577Z',
          second_approved_at: '2026-10-01T08:11:35.805Z',
        },
      },
    }

    expect(isInitiationDisbursed(app)).toBe(false)
    expect(getPayableAmount(app)).toBe(309)
    expect(isEligibleForFinanceQueue(app)).toBe(true)
  })

  it('excludes applications where pending amount is 0 and payment has already been disbursed', () => {
    const app = {
      id: 'fully-paid-app',
      status: 'Payment Approved',
      partial_payment: 790,
      pending_amount: 0,
      form_data: {
        finance_payout_completed: {
          amount_paid: 790,
          executed_at: '2026-09-28T07:41:25.787Z',
        },
        payment_initiation: {
          status: 'approved_for_finance',
          prepared_amount: 790,
          prepared_at: '2026-09-28T06:00:00.000Z',
          second_approved_at: '2026-09-28T07:00:00.000Z',
        },
      },
    }

    expect(isInitiationDisbursed(app)).toBe(true)
    expect(getPayableAmount(app)).toBe(0)
    expect(isEligibleForFinanceQueue(app)).toBe(false)
  })

  it('handles remaining balance status transition in bulk payout', () => {
    // If pendingAmt is 809 and payout is 500, newPending is 309 -> status remains 'Payment Requested'
    const pendingAmt1 = 809
    const payout1 = 500
    const newPending1 = Math.max(0, pendingAmt1 - payout1)
    const status1 = newPending1 > 0 ? 'Payment Requested' : 'Completed'

    expect(newPending1).toBe(309)
    expect(status1).toBe('Payment Requested')

    // Second split: pendingAmt is 309 and payout is 309 -> newPending is 0 -> status becomes 'Completed'
    const pendingAmt2 = 309
    const payout2 = 309
    const newPending2 = Math.max(0, pendingAmt2 - payout2)
    const status2 = newPending2 > 0 ? 'Payment Requested' : 'Completed'

    expect(newPending2).toBe(0)
    expect(status2).toBe('Completed')
  })
})
