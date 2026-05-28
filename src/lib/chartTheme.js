/**
 * Shared Recharts styling — one place for axes, grids, tooltips, and category colors.
 * Import these in any view that renders charts so they stay consistent in light/dark mode.
 */
import { C } from "../theme.js";

/** Muted categorical palette for pies, bars, and multi-series charts (no pastels). */
export const CHART_SERIES = [
  "#4F46E5",
  "#0EA5E9",
  "#059669",
  "#D97706",
  "#64748B",
  "#7C3AED",
  "#0D9488",
  "#BE185D",
];

export function chartColor(index) {
  return CHART_SERIES[index % CHART_SERIES.length];
}

export function chartPositiveColor() {
  return C.positive;
}

export function chartNegativeColor() {
  return C.negative;
}

export function chartValueColor(value) {
  const n = parseFloat(value);
  if (Number.isNaN(n) || n === 0) return C.textMid;
  return n > 0 ? C.positive : C.negative;
}

/**
 * @param {boolean} [dark]
 */
export function getChartTheme(dark = false) {
  const axis = dark ? "rgba(148,163,184,.85)" : C.textLight;
  const grid = dark ? "rgba(148,163,184,.12)" : "rgba(15,23,42,.06)";
  const tooltipBg = dark ? C.navyMid : C.surface;
  const tooltipBorder = dark ? "rgba(148,163,184,.2)" : C.border;
  const tooltipText = dark ? "rgba(241,245,249,.95)" : C.text;

  return {
    axis,
    grid,
    series: CHART_SERIES,
    barRadius: [4, 4, 0, 0],
    areaStrokeWidth: 2,
    axisTick: { fontSize: 11, fill: axis, fontFamily: "'Inter',sans-serif" },
    axisTickSm: { fontSize: 10, fill: axis, fontFamily: "'Inter',sans-serif" },
    gridStroke: grid,
    tooltipStyle: {
      background: tooltipBg,
      border: `1px solid ${tooltipBorder}`,
      borderRadius: 8,
      fontSize: 12,
      fontFamily: "'Inter',sans-serif",
      color: tooltipText,
      boxShadow: dark ? "0 4px 24px rgba(0,0,0,.35)" : "0 4px 16px rgba(15,23,42,.08)",
      padding: "8px 12px",
    },
    margin: { left: 4, right: 8, top: 8, bottom: 4 },
    marginWide: { left: 8, right: 8, top: 8, bottom: 4 },
    formatYAxis: (v) => {
      const n = Number(v);
      if (Number.isNaN(n)) return "";
      if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
      if (Math.abs(n) >= 1000) return `$${(n / 1000).toFixed(0)}k`;
      return `$${n}`;
    },
    gradientId: (name) => `fv-${name}`,
    areaGradient: (id, color, opacityTop = 0.12) => ({
      id,
      stops: [
        { offset: "0%", color, opacity: opacityTop },
        { offset: "100%", color, opacity: 0 },
      ],
    }),
  };
}

/** Default light-theme shortcuts (most call sites). */
export const chartTheme = getChartTheme(false);
