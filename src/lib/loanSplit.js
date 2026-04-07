/** @param {number} n */
export function round2(n) {
  return Math.round(Number(n) * 100) / 100
}

/** Period interest (actual/365) since anchor and day count; balance may be 0 (no accrual). */
function computePeriodInterest({
  balance,
  aprPercent,
  loanInterestAsOfDate,
  paymentDateStr,
  fallbackPayDay,
}) {
  const bal = parseFloat(balance) || 0
  const apr = parseFloat(aprPercent) || 0
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

  const interest =
    apr > 0 && bal > 0 ? round2(bal * (apr / 100) * (days / 365)) : 0
  return { interest, days }
}

/**
 * Allocate payment: accrued carryover + period interest first, then principal (capped by balance).
 * @param {object} p
 * @param {number|string|undefined} p.accruedInterestCarryover  Unpaid interest from prior (short) payments
 */
export function allocateLoanPayment({
  balance,
  aprPercent,
  payment,
  loanInterestAsOfDate,
  accruedInterestCarryover = 0,
  paymentDateStr,
  fallbackPayDay,
}) {
  const pay = parseFloat(payment) || 0
  const bal = parseFloat(balance) || 0
  const carry = round2(parseFloat(accruedInterestCarryover) || 0)
  if (bal <= 0 && carry <= 0) {
    return {
      principal: 0,
      interest: 0,
      periodInterest: 0,
      days: 0,
      newAccruedCarryover: 0,
    }
  }
  if (pay <= 0) {
    return {
      principal: 0,
      interest: 0,
      periodInterest: 0,
      days: 0,
      newAccruedCarryover: carry,
    }
  }

  const { interest: I, days } = computePeriodInterest({
    balance: bal,
    aprPercent,
    loanInterestAsOfDate,
    paymentDateStr,
    fallbackPayDay,
  })
  const totalIntDue = round2(I + carry)
  const toInterest = round2(Math.min(pay, totalIntDue))
  const rem = round2(pay - toInterest)
  const toPrincipal = round2(
    Math.min(Math.max(0, bal), Math.max(0, rem)),
  )
  const newCarry = round2(totalIntDue - toInterest)

  return {
    principal: toPrincipal,
    interest: toInterest,
    periodInterest: I,
    days,
    newAccruedCarryover: newCarry,
  }
}

/**
 * @deprecated Use allocateLoanPayment; kept for tests — same as carryover = 0.
 */
export function splitLoanPaymentCalc({
  balance,
  aprPercent,
  payment,
  loanInterestAsOfDate,
  paymentDateStr,
  fallbackPayDay,
}) {
  const r = allocateLoanPayment({
    balance,
    aprPercent,
    payment,
    loanInterestAsOfDate,
    accruedInterestCarryover: 0,
    paymentDateStr,
    fallbackPayDay,
  })
  return { principal: r.principal, interest: r.interest, days: r.days }
}
