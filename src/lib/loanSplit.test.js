import { describe, it, expect } from 'vitest'
import { splitLoanPaymentCalc, round2 } from './loanSplit.js'

describe('loanSplit', () => {
  it('round2 matches Math.round(n*100)/100 (IEEE float)', () => {
    expect(round2(1.005)).toBe(Math.round(1.005 * 100) / 100)
    expect(round2(12.345)).toBe(12.35)
  })

  it('returns zeros when balance or payment is zero', () => {
    expect(
      splitLoanPaymentCalc({
        balance: 0,
        aprPercent: 6,
        payment: 100,
        paymentDateStr: '2026-03-31',
        fallbackPayDay: '2026-03-31',
      }),
    ).toEqual({ principal: 0, interest: 0, days: 0 })
    expect(
      splitLoanPaymentCalc({
        balance: 5000,
        aprPercent: 6,
        payment: 0,
        paymentDateStr: '2026-03-31',
        fallbackPayDay: '2026-03-31',
      }),
    ).toEqual({ principal: 0, interest: 0, days: 0 })
  })

  it('uses minimum 1 day when anchor equals pay date', () => {
    const r = splitLoanPaymentCalc({
      balance: 12000,
      aprPercent: 6,
      payment: 200,
      loanInterestAsOfDate: '2026-03-31',
      paymentDateStr: '2026-03-31',
      fallbackPayDay: '2026-03-31',
    })
    expect(r.days).toBe(1)
    // 12000 * 0.06 / 365 ≈ 1.97
    expect(r.interest).toBeCloseTo(1.97, 1)
    expect(r.principal).toBe(round2(200 - r.interest))
  })

  it('accrues over calendar days (30d gap)', () => {
    const r = splitLoanPaymentCalc({
      balance: 10000,
      aprPercent: 12,
      payment: 500,
      loanInterestAsOfDate: '2026-01-01',
      paymentDateStr: '2026-01-31',
      fallbackPayDay: '2026-01-31',
    })
    expect(r.days).toBe(30)
    const expectedInt = round2(10000 * 0.12 * (30 / 365))
    expect(r.interest).toBe(expectedInt)
    expect(r.principal).toBe(round2(500 - expectedInt))
  })

  it('caps accrual at 372 days', () => {
    const r = splitLoanPaymentCalc({
      balance: 1000,
      aprPercent: 24,
      payment: 2000,
      loanInterestAsOfDate: '2020-01-01',
      paymentDateStr: '2026-03-31',
      fallbackPayDay: '2026-03-31',
    })
    expect(r.days).toBe(372)
  })

  it('invalid anchor falls back to pay day → 1 day accrual', () => {
    const r = splitLoanPaymentCalc({
      balance: 6000,
      aprPercent: 6,
      payment: 100,
      loanInterestAsOfDate: 'not-a-date',
      paymentDateStr: '2026-06-15',
      fallbackPayDay: '2026-06-15',
    })
    expect(r.days).toBe(1)
  })

  it('interest can consume whole payment (principal 0) — cash still leaves account in app; balance unchanged', () => {
    const r = splitLoanPaymentCalc({
      balance: 100000,
      aprPercent: 24,
      payment: 50,
      loanInterestAsOfDate: '2026-01-01',
      paymentDateStr: '2026-03-31',
      fallbackPayDay: '2026-03-31',
    })
    expect(r.principal).toBe(0)
    expect(r.interest).toBeGreaterThan(50)
  })

  it('principal never exceeds balance', () => {
    const r = splitLoanPaymentCalc({
      balance: 100,
      aprPercent: 0,
      payment: 500,
      loanInterestAsOfDate: '2026-03-01',
      paymentDateStr: '2026-03-15',
      fallbackPayDay: '2026-03-15',
    })
    expect(r.principal).toBe(100)
    expect(r.interest).toBe(0)
  })
})
