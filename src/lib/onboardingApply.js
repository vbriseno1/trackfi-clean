/**
 * Applies onboarding wizard output to app state shape (accounts, household, income).
 * Used by real onboarding completion and kept aligned with demo household narrative.
 */
export function buildCashAccountsFromOnboarding(accounts = {}) {
  const cashAccounts = [];
  const ts = Date.now();
  const checking = parseFloat(accounts.checking);
  const savings = parseFloat(accounts.savings);
  const cushion = parseFloat(accounts.cushion);
  if (checking > 0) {
    cashAccounts.push({ id: ts, name: "Checking", kind: "checking", balance: String(accounts.checking) });
  }
  if (savings > 0) {
    cashAccounts.push({ id: ts + 1, name: "Savings", kind: "savings", balance: String(accounts.savings) });
  }
  if (cushion > 0) {
    cashAccounts.push({ id: ts + 2, name: "Emergency fund", kind: "cushion", balance: String(accounts.cushion) });
  }
  return cashAccounts;
}

export function householdFromUseCase(useCase, name = "") {
  const first = (name || "").trim().split(/\s+/)[0] || "Me";
  if (useCase === "couple") {
    return {
      enabled: true,
      name: first ? `${first} & Partner` : "Our household",
      members: [
        { id: "me", name: first, emoji: "🧑", color: "#4F46E5" },
        { id: "partner", name: "Partner", emoji: "🧑", color: "#059669" },
      ],
    };
  }
  if (useCase === "roommates") {
    return {
      enabled: true,
      name: "Shared household",
      members: [
        { id: "me", name: first, emoji: "🧑", color: "#4F46E5" },
        { id: "roommate", name: "Roommate", emoji: "🧑", color: "#D97706" },
      ],
    };
  }
  if (useCase === "family") {
    return {
      enabled: true,
      name: first ? `${first}'s family` : "Our family",
      members: [
        { id: "me", name: first, emoji: "🧑", color: "#4F46E5" },
        { id: "partner", name: "Partner", emoji: "🧑", color: "#059669" },
      ],
    };
  }
  return {
    enabled: false,
    name: "My finances",
    members: [{ id: "me", name: first, emoji: "🧑", color: "#4F46E5" }],
  };
}

export function incomeFromOnboarding(income = {}) {
  const lpd = new Date();
  lpd.setDate(lpd.getDate() - 11);
  const lastPayDate =
    lpd.getFullYear() +
    "-" +
    String(lpd.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(lpd.getDate()).padStart(2, "0");
  return {
    primary: "",
    other: "",
    trading: "",
    rental: "",
    dividends: "",
    freelance: "",
    payFrequency: "Biweekly",
    lastPayDate: "",
    ...income,
    payFrequency: income.payFrequency || "Biweekly",
    lastPayDate,
  };
}

export function settingsPatchFromOnboarding(income, settings = {}) {
  const hasTrading = parseFloat(income?.trading || 0) > 0;
  return {
    ...settings,
    showTrading: hasTrading,
    showHealth: true,
    showSavings: true,
    showForecast: true,
    quickActions: settings.quickActions || [
      "expense",
      "bill",
      "paycheck",
      "debt",
      "health",
      "budget",
      "savings",
      "insights",
    ],
  };
}
