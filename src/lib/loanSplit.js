/** @param {number} n */
export function round2(n) {
  return Math.round(Number(n) * 100) / 100
}

/**
 * Actual/365 simple interest: interest = balance × (APR/100) × (days/365).
 * Matches billing logic in App.jsx for loan-linked bills and extra pay.
 *
 * @param {object} p
 * @param {number|string} p.balance
 * @param {number|string} p.aprPercent  Annual rate as percent (e.g. 6 for 6%)
 * @param {number|string} p.payment
 * @param {string|undefined|null} p.loanInterestAsOfDate  YYYY-MM-DD anchor (balance good through this date)
 * @param {string|undefined} p.paymentDateStr  YYYY-MM-DD pay date
 * @param {string} p.fallbackPayDay  YYYY-MM-DD when paymentDateStr invalid
 */
export function splitLoanPaymentCalc({
  balance,
  aprPercent,
  payment,
  loanInterestAsOfDate,
  paymentDateStr,
  fallbackPayDay,
}) {
  const bal = parseFloat(balance) || 0
  const pay = parseFloat(payment) || 0
  const apr = parseFloat(aprPercent) || 0
  if (bal <= 0 || pay <= 0) return { principal: 0, interest: 0, days: 0 }

  const payDay =
    paymentDateStr && /^\d{4}-\d{2}-\d{2}$/.test(paymentDateStr)
      ? paymentDateStr
      : fallbackPayDay
  const raw = loanInterestAsOfDate
  const anchor =
    typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : payDay

  const t0 = new Date(anchor + 'T12:00:00').getTime()
  const t1 = new Date(payDay + 'T12:00:00').getTime()
  let days = Math.round((t1 - t0) / 86400000)
  if (!Number.isFinite(days) || days < 1) days = 1
  if (days > 372) days = 372

  const interest = apr > 0 ? round2(bal * (apr / 100) * (days / 365)) : 0
  const principal = round2(Math.min(bal, Math.max(0, pay - interest)))
  return { principal, interest, days }
}
