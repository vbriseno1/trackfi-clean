/**
 * Default state shapes for first-run boot, demo data, sign-out reset, and the
 * authoritative cloud-pull merge. Keep these stable — sync compares against them.
 */
import { C } from "../theme.js";

export const DEF_SETTINGS = {
  showTrading: true,
  showCrypto: false,
  showHealth: true,
  showSavings: true,
  showForecast: true,
  darkMode: false,
  quickActions: ["expense", "bill", "paycheck", "debt", "health", "budget", "savings", "insights"],
  notifBills: true,
  notifBudget: true,
  notifSavings: true,
  notifPayday: true,
  notifMilestones: true,
  defaultExpensePaidFrom: "checking",
  defaultBillPaidFrom: "checking",
  defaultCheckingAccountId: "",
  defaultSavingsAccountId: "",
  defaultCreditDebtId: "",
  paycheckNudgeLastHandledPeriod: "",
  billReshowLeadMultiplier: 1,
};

export const DEF_ACCOUNTS = {
  checking: "",
  savings: "",
  cushion: "",
  credit_card: "",
  investments: "",
  k401: "",
  roth_ira: "",
  brokerage: "",
  crypto: "",
  hsa: "",
  property: "",
  vehicles: "",
  cashAccounts: [],
};

export const DEF_INCOME = {
  primary: "",
  other: "",
  trading: "",
  rental: "",
  dividends: "",
  freelance: "",
  payFrequency: "Biweekly",
  lastPayDate: "",
};

export const DEF_HOUSEHOLD = {
  enabled: false,
  name: "My Finances",
  members: [{ id: "me", name: "Me", emoji: "😊", color: "#6366f1" }],
};

export const DEF_DASHCONFIG = {
  showIncomeChart: true,
  showMetrics: true,
  showAccounts: true,
  showForecast: true,
  showBills: true,
  showRecent: true,
  showTradeCard: true,
};

/**
 * Calendar dot colors. Factory so theme tokens stay the single source of truth.
 * Pass an alternate palette (e.g. dark mode) if needed; defaults to the light `C` tokens.
 */
export const DEF_CALCOLORS = () => ({
  expense: "#FDA4AF",
  bill: "#FDE68A",
  today: "#A5B4FC",
  dotStyle: "circle",
});

export const DEF_CATS = [
  // Food & Dining
  { id: "groceries", name: "Groceries", icon: "🛒" },
  { id: "fast_food", name: "Fast Food", icon: "🍔" },
  { id: "restaurants", name: "Restaurants", icon: "🍽️" },
  { id: "coffee", name: "Coffee", icon: "☕" },
  // Home & Transport
  { id: "rent_mort", name: "Rent / Mortgage", icon: "🏠" },
  { id: "utilities", name: "Utilities", icon: "⚡" },
  { id: "gas", name: "Gas", icon: "⛽" },
  { id: "rideshare", name: "Rideshare", icon: "🚕" },
  { id: "car_pay", name: "Car Payment", icon: "🚗" },
  // Personal Care
  { id: "grooming", name: "Grooming / Haircuts", icon: "💈" },
  { id: "clothing", name: "Clothing", icon: "👗" },
  { id: "health_med", name: "Health / Medical", icon: "🏥" },
  { id: "gym", name: "Gym / Fitness", icon: "💪" },
  // Bills & Subscriptions
  { id: "phone", name: "Phone", icon: "📱" },
  { id: "subscriptions", name: "Subscriptions", icon: "🔄" },
  // Lifestyle
  { id: "entertainment", name: "Entertainment", icon: "🎮" },
  { id: "dining_out", name: "Dining Out", icon: "🍷" },
  { id: "travel", name: "Travel", icon: "✈️" },
  { id: "pets", name: "Pets", icon: "🐾" },
  // Catch-all
  { id: "shopping", name: "Shopping", icon: "🛍️" },
  { id: "misc", name: "Misc", icon: "📦" },
];
