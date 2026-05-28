import { describe, it, expect } from 'vitest'
import {
  cashAccountsByKind,
  totalCheckingBalance,
  totalSavingsBalance,
  displayCheckingBalance,
  displaySavingsBalance,
  applyLiquidBalanceEdit,
} from './cashAccounts.js'

describe('cashAccounts', () => {
  const legacy = { checking: '100', savings: '50', cashAccounts: [] }

  it('uses legacy totals when no sub-accounts', () => {
    expect(totalCheckingBalance(legacy)).toBe(100)
    expect(totalSavingsBalance(legacy)).toBe(50)
  })

  it('sums sub-accounts when present', () => {
    const multi = {
      checking: '999',
      savings: '888',
      cashAccounts: [
        { id: '1', kind: 'checking', balance: '200' },
        { id: '2', kind: 'checking', balance: '50' },
        { id: '3', kind: 'savings', balance: '300' },
      ],
    }
    expect(totalCheckingBalance(multi)).toBe(250)
    expect(totalSavingsBalance(multi)).toBe(300)
    expect(cashAccountsByKind(multi, 'checking')).toHaveLength(2)
  })

  it('display helpers mirror totals for sub-accounts', () => {
    const multi = {
      checking: '',
      savings: '',
      cashAccounts: [
        { id: '1', kind: 'checking', balance: '3100' },
        { id: '2', kind: 'savings', balance: '11400' },
      ],
    }
    expect(displayCheckingBalance(multi)).toBe('3100')
    expect(displaySavingsBalance(multi)).toBe('11400')
    expect(displayCheckingBalance(legacy)).toBe('100')
  })

  it('applyLiquidBalanceEdit updates single sub-account row', () => {
    const ac = {
      checking: '',
      cashAccounts: [{ id: '9', kind: 'checking', name: 'Main', balance: '100' }],
    }
    const next = applyLiquidBalanceEdit(ac, 'checking', '2500')
    expect(next.cashAccounts[0].balance).toBe('2500')
    expect(next.checking).toBe('')
  })
})
