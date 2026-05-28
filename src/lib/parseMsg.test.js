import { describe, it, expect } from 'vitest'
import { parseMsg, chatMatchBill, chatPickExpenseDate, chatIsStatsQuery } from './parseMsg.js'

const cats = [{ name: 'Groceries' }, { name: 'Coffee' }, { name: 'Misc' }]
const debts = []
const bills = []
const cards = [{ id: 99, name: 'Chase Visa', debtKind: 'credit_card', balance: '0' }]

describe('parseMsg — expenses', () => {
  it('parses a basic expense with category from keyword map', () => {
    const out = parseMsg('lunch 12', cats, debts, bills)
    expect(out?.type).toBe('expense')
    expect(out.amount).toBe('12.00')
    expect(out.category).toBe('Restaurants')
    expect(out.paidFrom).toBe('checking')
  })

  it('applies tip percentage', () => {
    const out = parseMsg('dinner 100 plus 20%', cats, debts, bills)
    expect(out?.type).toBe('expense')
    expect(out.amount).toBe('120.00')
  })

  it('splits a check evenly', () => {
    // NB: avoid words containing the trade keyword "es " (e.g. "groceri**es **80")
    const out = parseMsg('walmart 80 split 4', cats, debts, bills)
    expect(out?.type).toBe('expense')
    expect(out.amount).toBe('20.00')
  })

  it('detects coffee category', () => {
    const out = parseMsg('starbucks 5.50', cats, debts, bills)
    expect(out.category).toBe('Coffee')
  })

  it('routes to credit when "on card" is present (no auto-card for expenses)', () => {
    // Unlike bills, expenses don't auto-assign a single card — user must name it
    const out = parseMsg('lunch 18 on card', cats, [...debts, ...cards], bills)
    expect(out.paidFrom).toBe('credit')
    expect(out.creditDebtId).toBeUndefined()
  })

  it('matches a specific named card by name fragment', () => {
    const out = parseMsg('coffee 4 chase visa', cats, [...debts, ...cards], bills)
    expect(out.paidFrom).toBe('credit')
    expect(out.creditDebtId).toBe('99')
  })
})

describe('parseMsg — bills', () => {
  it('parses a recurring bill with due date', () => {
    const out = parseMsg('rent 1500 due 1st', cats, debts, bills)
    expect(out?.type).toBe('bill')
    expect(out.amount).toBe('1500.00')
    expect(out.dueDate).toMatch(/^\d{4}-\d{2}-01$/)
    expect(out.recurring).toBe('Monthly')
  })

  it('parses weekly cadence', () => {
    const out = parseMsg('electric 90 weekly', cats, debts, bills)
    expect(out?.type).toBe('bill')
    expect(out.recurring).toBe('Weekly')
  })

  it('parses annual cadence', () => {
    const out = parseMsg('gym 50 annual', cats, debts, bills)
    expect(out?.type).toBe('bill')
    expect(out.recurring).toBe('Annual')
  })

  it('attaches single card by default when bill paid on credit', () => {
    const out = parseMsg('netflix 16 on card', cats, [...debts, ...cards], bills)
    expect(out?.type).toBe('bill')
    expect(out.paidFrom).toBe('credit')
    expect(out.creditDebtId).toBe('99')
  })
})

describe('parseMsg — billPaid', () => {
  const bs = [{ id: 1, name: 'Rent', paid: false }, { id: 2, name: 'Electric', paid: false }]

  it('marks a bill paid via "paid X"', () => {
    const out = parseMsg('paid rent', cats, debts, bs)
    expect(out).toEqual({ type: 'billPaid', billId: 1, name: 'Rent' })
  })

  it('marks via "mark X as paid"', () => {
    const out = parseMsg('mark electric as paid', cats, debts, bs)
    expect(out?.type).toBe('billPaid')
    expect(out.billId).toBe(2)
  })

  it('marks via "X paid"', () => {
    const out = parseMsg('rent paid', cats, debts, bs)
    expect(out?.type).toBe('billPaid')
    expect(out.billId).toBe(1)
  })

  it('does not match already-paid bills', () => {
    const out = parseMsg('paid rent', cats, debts, [{ ...bs[0], paid: true }])
    expect(out?.type).not.toBe('billPaid')
  })
})

describe('parseMsg — income, accounts, transfers', () => {
  it('parses primary salary', () => {
    const out = parseMsg('salary 4000', cats, debts, bills)
    expect(out).toEqual({ type: 'income', key: 'primary', amount: '4000.00' })
  })

  it('parses freelance income', () => {
    const out = parseMsg('freelance 800', cats, debts, bills)
    expect(out).toEqual({ type: 'income', key: 'freelance', amount: '800.00' })
  })

  it('parses account balance updates', () => {
    const out = parseMsg('checking 3200', cats, debts, bills)
    expect(out).toEqual({ type: 'account', key: 'checking', amount: '3200.00' })
  })

  it('parses transfers to savings', () => {
    const out = parseMsg('moved 200 to savings', cats, debts, bills)
    expect(out?.type).toBe('account')
    expect(out.key).toBe('savings')
    expect(out.text).toBe('Moved to savings')
  })
})

describe('parseMsg — debts and trades', () => {
  const existingDebts = [{ id: 1, name: 'Student Loans', balance: '20000' }]

  it('updates an existing debt by name match', () => {
    const out = parseMsg('student loans balance update 18000 at 5.75%', cats, existingDebts, bills)
    expect(out?.type).toBe('debt')
    expect(out.isUpdate).toBe(true)
    expect(out.matchId).toBe(1)
    expect(out.rate).toBe('5.75')
  })

  it('parses a trade with explicit symbol and PnL', () => {
    const out = parseMsg('long ES 250', cats, debts, bills)
    expect(out?.type).toBe('trade')
    expect(out.symbol).toBe('ES')
    expect(out.side).toBe('Long')
    expect(out.pnl).toBe('250.00')
  })
})

describe('parseMsg — undo and date helpers', () => {
  it('detects undo intent', () => {
    expect(parseMsg('undo', cats, debts, bills)).toEqual({ type: 'undo' })
    expect(parseMsg('undo last', cats, debts, bills)).toEqual({ type: 'undo' })
  })

  it('returns null for empty/unparseable input', () => {
    expect(parseMsg('', cats, debts, bills)).toBeNull()
    expect(parseMsg('hello world', cats, debts, bills)).toBeNull()
  })
})

describe('chatPickExpenseDate', () => {
  it('handles today/tomorrow/yesterday', () => {
    expect(chatPickExpenseDate('coffee tomorrow')).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(chatPickExpenseDate('lunch yesterday')).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('parses N days ago', () => {
    const out = chatPickExpenseDate('grocery 3 days ago')
    expect(out).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('parses explicit ISO date', () => {
    const out = chatPickExpenseDate('expense 2024-03-15')
    expect(out).toBe('2024-03-15')
  })
})

describe('chatMatchBill', () => {
  const bs = [{ id: 1, name: 'Electric Bill' }, { id: 2, name: 'Rent' }]

  it('matches exact name', () => {
    expect(chatMatchBill(bs, 'rent')?.id).toBe(2)
  })

  it('matches partial substring', () => {
    expect(chatMatchBill(bs, 'electric')?.id).toBe(1)
  })

  it('strips leading articles', () => {
    expect(chatMatchBill(bs, 'the rent')?.id).toBe(2)
  })

  it('returns null when nothing matches', () => {
    expect(chatMatchBill(bs, 'water')).toBeNull()
  })
})

describe('chatIsStatsQuery', () => {
  it('routes question marks to stats', () => {
    expect(chatIsStatsQuery('how much rent?')).toBe(true)
  })

  it('routes how/what/when prefixes', () => {
    expect(chatIsStatsQuery('what is my net worth')).toBe(true)
  })

  it('routes "show me" queries', () => {
    expect(chatIsStatsQuery('show me my bills')).toBe(true)
  })

  it('does not route undo as stats', () => {
    expect(chatIsStatsQuery('undo')).toBe(false)
    expect(chatIsStatsQuery('undo last')).toBe(false)
  })

  it('does not route plain expense logs', () => {
    expect(chatIsStatsQuery('lunch 12')).toBe(false)
  })
})
