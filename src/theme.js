/**
 * Trackfi visual tokens — colors, fonts, calendar labels, chart palettes.
 * Pure constants only; nothing here touches React or app state.
 */

export const C = {
  bg:"#F0F2F8",       surface:"#FFFFFF",    card:"#FFFFFF",    surfaceAlt:"#F7F8FC",
  border:"#E2E5EE",   borderLight:"#ECEEF5",
  navy:"#0A1628",     navyMid:"#1A2E50",    navyLight:"#243B6B",
  accent:"#6366F1",   accentBg:"#EEF2FF",   accentMid:"#C7D2FE",
  green:"#059669",    greenBg:"#ECFDF5",    greenMid:"#6EE7B7",
  red:"#DC2626",      redBg:"#FEF2F2",      redMid:"#FCA5A5",
  amber:"#D97706",    amberBg:"#FFFBEB",    amberMid:"#FDE68A",
  purple:"#7C3AED",   purpleBg:"#F5F3FF",   purpleMid:"#DDD6FE",
  teal:"#0D9488",     tealBg:"#F0FDFA",     tealMid:"#5EEAD4",
  text:"#0A1628",     textMid:"#374151",    textLight:"#6B7280",  textFaint:"#9CA3AF",
  slate:"#6B7280",
};

export const PIE_COLORS = [C.accent,C.green,C.amber,C.red,C.purple,C.teal,C.purple,C.amber,C.green,C.red];

/** Distinct colors for debt charts (no duplicates — each loan/card can differ). */
export const DEBT_PALETTE = [
  "#6366F1","#10B981","#F59E0B","#EF4444","#8B5CF6","#06B6D4","#EC4899","#84CC16",
  "#F97316","#14B8A6","#A855F7","#E11D48","#0EA5E9","#22C55E","#CA8A04","#7C3AED",
  "#0891B2","#DB2777","#4ADE80","#FB7185","#38BDF8","#FBBF24","#C084FC","#2DD4BF",
  // Pastels (softer fills for pie + swatches)
  "#A5B4FC","#6EE7B7","#FDE68A","#FCA5A5","#C4B5FD","#67E8F9","#F9A8D4","#BEF264",
  "#FDBA74","#7DD3FC","#86EFAC","#FBCFE8","#DDD6FE","#A7F3D0","#FEF3C7","#FECACA",
  "#BFDBFE","#C7D2FE","#99F6E4","#FED7AA","#E9D5FF","#D1FAE5","#FCE7F3","#D9F99D",
];

export function isValidHexColor(s){
  return typeof s==="string"&&/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(s.trim());
}

/** Per-debt chart color: saved `debt.color` if a hex, otherwise stable slot from `debts` order. */
export function debtDisplayColor(debt,debts){
  const raw=debt?.color;
  if(typeof raw==="string"&&isValidHexColor(raw))return raw.trim();
  const idx=(debts||[]).findIndex(d=>String(d?.id)===String(debt?.id));
  return DEBT_PALETTE[(idx>=0?idx:0)%DEBT_PALETTE.length];
}

export const MF="'Manrope',sans-serif";
export const IF="'Inter',sans-serif";
export const MOS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
export const FULL_MOS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
