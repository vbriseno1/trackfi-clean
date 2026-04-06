import { describe, it, expect } from 'vitest'
import { cashAccountsByKind, totalCheckingBalance, totalSavingsBalance } from './cashAccounts.js'

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
})
