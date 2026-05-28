/**
 * Trackfi visual tokens — colors, fonts, calendar labels, chart palettes.
 * Pure constants only; nothing here touches React or app state.
 */

export const C = {
  bg: "#F4F6F9",
  surface: "#FFFFFF",
  card: "#FFFFFF",
  surfaceAlt: "#F8FAFC",
  border: "#E2E8F0",
  borderLight: "#EEF2F6",
  navy: "#0F172A",
  navyMid: "#1E293B",
  navyLight: "#334155",
  accent: "#4F46E5",
  accentBg: "#EEF2FF",
  accentMid: "#C7D2FE",
  positive: "#047857",
  positiveBg: "#ECFDF5",
  positiveMid: "#6EE7B7",
  negative: "#B91C1C",
  negativeBg: "#FEF2F2",
  negativeMid: "#FECACA",
  green: "#047857",
  greenBg: "#ECFDF5",
  greenMid: "#6EE7B7",
  red: "#B91C1C",
  redBg: "#FEF2F2",
  redMid: "#FECACA",
  amber: "#B45309",
  amberBg: "#FFFBEB",
  amberMid: "#FDE68A",
  purple: "#6D28D9",
  purpleBg: "#F5F3FF",
  purpleMid: "#DDD6FE",
  teal: "#0F766E",
  tealBg: "#F0FDFA",
  tealMid: "#99F6E4",
  text: "#0F172A",
  textMid: "#475569",
  textLight: "#64748B",
  textFaint: "#94A3B8",
  slate: "#64748B",
};

/** Categorical colors for spending / income breakdown charts. */
export const PIE_COLORS = [
  C.accent,
  "#0EA5E9",
  C.positive,
  C.amber,
  "#64748B",
  C.purple,
  C.teal,
  C.negative,
];

/** Distinct colors for debt charts — professional set, no pastel duplicates. */
export const DEBT_PALETTE = [
  "#4F46E5",
  "#0EA5E9",
  "#059669",
  "#D97706",
  "#64748B",
  "#7C3AED",
  "#0D9488",
  "#BE185D",
  "#0369A1",
  "#15803D",
  "#C2410C",
  "#475569",
];

export function isValidHexColor(s) {
  return typeof s === "string" && /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(s.trim());
}

/** Per-debt chart color: saved `debt.color` if a hex, otherwise stable slot from `debts` order. */
export function debtDisplayColor(debt, debts) {
  const raw = debt?.color;
  if (typeof raw === "string" && isValidHexColor(raw)) return raw.trim();
  const idx = (debts || []).findIndex((d) => String(d?.id) === String(debt?.id));
  return DEBT_PALETTE[(idx >= 0 ? idx : 0) % DEBT_PALETTE.length];
}

export const MF = "'Manrope',sans-serif";
export const IF = "'Inter',sans-serif";
export const MOS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const FULL_MOS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** Shared elevation + radius for cards and chart containers. */
export const UI = {
  radius: 12,
  radiusLg: 16,
  shadow: "0 1px 2px rgba(15,23,42,.04), 0 1px 8px rgba(15,23,42,.04)",
  shadowMd: "0 2px 8px rgba(15,23,42,.06), 0 8px 24px rgba(15,23,42,.04)",
};
