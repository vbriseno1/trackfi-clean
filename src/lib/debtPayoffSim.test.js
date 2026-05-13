import { describe, it, expect } from 'vitest'
import {
  simRowsFromDebts,
  simulateMultiDebtPayoff,
  owedForSim,
} from './debtPayoffSim.js'

describe('debtPayoffSim', () => {
  it('owedForSim adds loan accrued interest, not for credit cards', () => {
    expect(
      owedForSim({
        debtKind: 'loan',
        balance: '1000',
        loanAccruedInterest: '12',
      }),
    ).toBe(1012)
    expect(
      owedForSim({
        debtKind: 'credit_card',
        balance: '500',
        loanAccruedInterest: '99',
      }),
    ).toBe(500)
  })

  it('drops paid-off debt from monthly minimum budget (no phantom min)', () => {
    const rows = simRowsFromDebts([
      {
        id: 'a',
        name: 'Small',
        balance: '200',
        rate: '0',
        minPayment: '50',
        debtKind: 'loan',
      },
      {
        id: 'b',
        name: 'Big',
        balance: '5000',
        rate: '12',
        minPayment: '100',
        debtKind: 'loan',
      },
    ])
    const r = simulateMultiDebtPayoff(rows, {
      strategy: 'avalanche',
      extraMonthly: 0,
      maxMonths: 120,
    })
    expect(r.debtFree).toBe(true)
    expect(r.months).toBeLessThan(120)
    const smallPaid = r.milestones.find((m) => m.id === 'a')
    expect(smallPaid).toBeDefined()
    expect(smallPaid.month).toBeGreaterThan(0)
  })

  it('avalanche applies extra to highest rate among active debts', () => {
    const rows = simRowsFromDebts([
      {
        id: 'low',
        name: 'Low rate',
        balance: '1000',
        rate: '6',
        minPayment: '30',
        debtKind: 'loan',
      },
      {
        id: 'high',
        name: 'High rate',
        balance: '1000',
        rate: '24',
        minPayment: '30',
        debtKind: 'loan',
      },
    ])
    const noEx = simulateMultiDebtPayoff(rows, {
      strategy: 'avalanche',
      extraMonthly: 0,
    })
    const withEx = simulateMultiDebtPayoff(rows, {
      strategy: 'avalanche',
      extraMonthly: 500,
    })
    expect(withEx.months).toBeLessThan(noEx.months)
    expect(withEx.totalInterest).toBeLessThan(noEx.totalInterest)
  })
})
