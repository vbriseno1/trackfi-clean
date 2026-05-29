/**
 * Pastel + soft tones for user-selectable colors (debts, goals, household, calendar).
 * Kept separate from semantic UI tokens in theme.js so charts stay readable.
 */
export const PASTEL_COLORS = [
  "#A5B4FC", // indigo
  "#93C5FD", // sky
  "#7DD3FC", // cyan
  "#6EE7B7", // mint
  "#86EFAC", // green
  "#BEF264", // lime
  "#FDE68A", // amber
  "#FCD34D", // gold
  "#FDBA74", // peach
  "#FDA4AF", // rose
  "#F9A8D4", // pink
  "#F0ABFC", // fuchsia
  "#D8B4FE", // purple
  "#C4B5FD", // violet
  "#A7F3D0", // emerald
  "#99F6E4", // teal
  "#BAE6FD", // light blue
  "#E9D5FF", // lavender
  "#FECACA", // blush
  "#E0E7FF", // periwinkle
  "#FFEDD5", // apricot
  "#CCFBF1", // aqua
  "#DCFCE7", // sage
  "#FEF9C3", // butter
];

/** All places users pick a custom hex swatch use this list. */
export const CHOOSEABLE_COLORS = PASTEL_COLORS;

/** Debt charts & auto-assign rotation — same pastels for consistency. */
export const DEBT_COLOR_PALETTE = PASTEL_COLORS;

/** Softer categorical colors for spending breakdowns (optional charts). */
export const CHART_PASTEL_SERIES = [
  "#818CF8",
  "#38BDF8",
  "#34D399",
  "#FBBF24",
  "#A78BFA",
  "#2DD4BF",
  "#FB7185",
  "#94A3B8",
];
