/**
 * Multi-debt payoff projection (monthly, APR÷12 interest on each balance).
 * Loan rows in Trackfi use actual/365 for real payments; this module is for planning / comparison only.
 */
import { isCreditCardDebt } from './creditCardTotals.js'

const EPS = 1e-6

/** Principal + accrued carry for loans; credit cards = balance only. */
export function owedForSim(d) {
  const b = parseFloat(d?.balance) || 0
  if (isCreditCardDebt(d)) return b
  return b + (parseFloat(d?.loanAccruedInterest) || 0)
}

/**
 * @param {object[]} debts Trackfi debt rows
 * @returns {{ id: string, name: string, bal: number, mrate: number, min: number }[]}
 */
export function simRowsFromDebts(debts) {
  return (debts || []).map((d) => {
    const bal = owedForSim(d)
    const mrate = (parseFloat(d.rate) || 0) / 100 / 12
    const min =
      parseFloat(d.minPayment) > 0
        ? parseFloat(d.minPayment)
        : Math.max(25, bal * 0.02 + bal * mrate)
    return {
      id: String(d.id),
      name: d.name || 'Debt',
      bal,
      mrate,
      min,
    }
  })
}

/**
 * @param {object[]} rows from simRowsFromDebts
 * @param {{ strategy?: 'avalanche'|'snowball', extraMonthly?: number, maxMonths?: number, returnSeries?: boolean }} opts
 */
export function simulateMultiDebtPayoff(rows, opts = {}) {
  const strategy = opts.strategy === 'snowball' ? 'snowball' : 'avalanche'
  const extraMonthly = Math.max(0, Number(opts.extraMonthly) || 0)
  const maxMonths = Math.min(1200, Math.max(1, Number(opts.maxMonths) || 600))
  const returnSeries = opts.returnSeries === true

  let state = rows.map((r) => ({ ...r, bal: r.bal }))
  let month = 0
  let totalInterest = 0
  /** @type {{ month: number, type: string, id: string, name: string, totalOwed: number }[]} */
  const milestones = []
  /** @type {{ month: number, totalOwed: number }[]} */
  const series = returnSeries ? [{ month: 0, totalOwed: roundMoney(sumOwed(state)) }] : []

  while (state.some((r) => r.bal > EPS) && month < maxMonths) {
    month++
    const prevOwed = new Map(state.map((r) => [r.id, r.bal]))
    const active = state.filter((r) => r.bal > EPS)
    if (!active.length) break

    let budget = extraMonthly + active.reduce((s, r) => s + r.min, 0)

    state = state.map((r) => {
      if (r.bal <= EPS) return r
      const interest = r.bal * r.mrate
      totalInterest += interest
      const due = r.bal + interest
      const pay = Math.min(r.min, due)
      budget -= pay
      return { ...r, bal: Math.max(0, r.bal + interest - pay) }
    })

    const still = state.filter((r) => r.bal > EPS)
    if (still.length && budget > EPS) {
      const tgt =
        strategy === 'snowball'
          ? still.reduce((a, b) => (a.bal <= b.bal ? a : b))
          : still.reduce((a, b) => (b.mrate > a.mrate ? b : a))
      const idx = state.findIndex((r) => r.id === tgt.id)
      if (idx >= 0) {
        state[idx] = { ...state[idx], bal: Math.max(0, state[idx].bal - budget) }
        budget = 0
      }
    }

    const totalOwed = sumOwed(state)
    for (const r of state) {
      const was = prevOwed.get(r.id) || 0
      if (was > EPS && r.bal <= EPS) {
        milestones.push({
          month,
          type: 'paid_off',
          id: r.id,
          name: r.name,
          totalOwed,
        })
      }
    }

    if (returnSeries) {
      series.push({ month, totalOwed: roundMoney(totalOwed) })
    }
  }

  const capped = month >= maxMonths && state.some((r) => r.bal > EPS)
  return {
    months: capped ? maxMonths : month,
    totalInterest: roundMoney(totalInterest),
    debtFree: !state.some((r) => r.bal > EPS),
    capped,
    milestones,
    finalRows: state,
    series: returnSeries ? series : null,
  }
}

function sumOwed(state) {
  return state.reduce((s, r) => s + Math.max(0, r.bal), 0)
}

function roundMoney(n) {
  return Math.round(Number(n) * 100) / 100
}

/** Single-debt amortization (APR÷12), same heuristic as legacy DebtView calcPayoff. */
export function singleDebtPayoffMonths(owed, aprPercent, minPayment) {
  const rate = (parseFloat(aprPercent) || 0) / 100 / 12
  const minPay =
    parseFloat(minPayment) > 0
      ? parseFloat(minPayment)
      : Math.max(25, owed * 0.02 + owed * rate)
  if (owed <= EPS) return { months: 0, totalInterest: 0, feasible: true }
  if (minPay <= rate * owed + EPS) return { months: 999, totalInterest: 0, feasible: false }
  let b = owed
  let mo = 0
  let interest = 0
  const cap = 1200
  while (b > EPS && mo < cap) {
    mo++
    const i = b * rate
    interest += i
    b = b + i - minPay
  }
  if (b > EPS) {
    return { months: 999, totalInterest: roundMoney(interest), feasible: false }
  }
  return { months: mo, totalInterest: roundMoney(interest), feasible: true }
}
