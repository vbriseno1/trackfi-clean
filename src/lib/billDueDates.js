/**
 * Calendar-safe bill due-date shifts (month-end anchors: Jan 31 + 1 mo → Feb 28/29).
 */

export function parseBillYmdParts(s) {
  if (!s || typeof s !== "string") return null;
  const parts = s.trim().split("-").map(Number);
  if (parts.length !== 3 || parts.some((x) => !Number.isFinite(x))) return null;
  const [y, m, d] = parts;
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  return { y, m, d };
}

export function formatBillYmd(y, m, d) {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function addDaysToBillDueDate(ymdStr, deltaDays, fallbackYmd) {
  const p = parseBillYmdParts(ymdStr) || parseBillYmdParts(fallbackYmd);
  if (!p) return fallbackYmd;
  const t = new Date(p.y, p.m - 1, p.d + deltaDays);
  if (Number.isNaN(t.getTime())) return fallbackYmd;
  return formatBillYmd(t.getFullYear(), t.getMonth() + 1, t.getDate());
}

export function addMonthsToBillDueDate(ymdStr, deltaMonths, fallbackYmd) {
  const p = parseBillYmdParts(ymdStr) || parseBillYmdParts(fallbackYmd);
  if (!p) return fallbackYmd;
  const first = new Date(p.y, p.m - 1 + deltaMonths, 1);
  const y = first.getFullYear();
  const mo = first.getMonth() + 1;
  const lastDay = new Date(y, mo, 0).getDate();
  const day = Math.min(p.d, lastDay);
  return formatBillYmd(y, mo, day);
}

/**
 * @param {string} [ymdStr]
 * @param {string} recurring Weekly | Bi-weekly | Monthly | Quarterly | Annual
 * @param {string} fallbackYmd YYYY-MM-DD when ymdStr missing
 * @param {boolean} forward true = next period (mark paid), false = rewind (undo)
 */
export function shiftRecurringBillDueDate(ymdStr, recurring, fallbackYmd, forward) {
  const base = ymdStr || fallbackYmd;
  const dir = forward ? 1 : -1;
  if (recurring === "Weekly") return addDaysToBillDueDate(base, 7 * dir, fallbackYmd);
  if (recurring === "Bi-weekly") return addDaysToBillDueDate(base, 14 * dir, fallbackYmd);
  if (recurring === "Quarterly") return addMonthsToBillDueDate(base, 3 * dir, fallbackYmd);
  if (recurring === "Annual") return addMonthsToBillDueDate(base, 12 * dir, fallbackYmd);
  return addMonthsToBillDueDate(base, 1 * dir, fallbackYmd);
}
