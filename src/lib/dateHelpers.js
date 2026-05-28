/**
 * Calendar / due-date helpers. All operate on local time and accept ISO `YYYY-MM-DD` strings.
 * `dueIn` returns 999 as a sentinel for missing or malformed dates so sorting still works.
 */
import { FULL_MOS } from "../theme.js";
import { todayStr } from "./moneyFormat.js";

export { todayStr };

/** Days from today to `d` (positive = future). Returns 999 when `d` is missing/invalid. */
export function dueIn(d) {
  if (!d || typeof d !== "string") return 999;
  const parts = d.split("-").map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return 999;
  const [ty, tm, tdy] = todayStr().split("-").map(Number);
  const [dy, dm, ddd] = parts;
  const today2 = new Date(ty, tm - 1, tdy);
  const due = new Date(dy, dm - 1, ddd);
  const diff = Math.ceil((due - today2) / 86400000);
  return isNaN(diff) ? 999 : diff;
}

/** Total days in the current local month. */
export const daysInMonth = () => {
  const t = new Date();
  return new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate();
};

/** 1-based local day of the month (today). */
export const dayOfMonth = () => new Date().getDate();

/** "September 14" style label for a YYYY-MM-DD (or ISO) string. Empty string for falsy input. */
export const fmtDate = (s) => {
  if (!s) return "";
  const clean = s.includes("T") ? s.split("T")[0] : s;
  const d = new Date(clean + "T00:00:00");
  return FULL_MOS[d.getMonth()] + " " + d.getDate();
};

/** Advance a YYYY-MM-DD by `months` calendar months (preserves day-of-month when possible). */
export function advanceDueDate(dateStr, months = 1) {
  if (!dateStr) return dateStr;
  const d = new Date(dateStr + "T00:00:00");
  d.setMonth(d.getMonth() + months);
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}
