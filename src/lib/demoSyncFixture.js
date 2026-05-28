/**
 * Demo-shaped fixtures for integration tests: mirrors loadDemo() + generateDemoData()
 * mapped to Supabase bare keys (fv6:<key>).
 */
import {
  generateDemoData,
  DEMO_IDCHECK_PRIMARY,
  DEMO_IDCHECK_JOINT,
  DEMO_IDSAVINGS,
  DEMO_CC_DEBT_ID,
  DEMO_MODEL_VERSION,
} from "./demoData.js";
import {
  DEF_ACCOUNTS,
  DEF_INCOME,
  DEF_SETTINGS,
  DEF_HOUSEHOLD,
  DEF_DASHCONFIG,
  DEF_CALCOLORS,
  DEF_CATS,
} from "./defaults.js";

/** Accounts/income/household shell from App.jsx loadDemo() — not in generateDemoData(). */
export function buildDemoLoadShell() {
  const lpd = new Date();
  lpd.setDate(lpd.getDate() - 11);
  const lastPayDate =
    lpd.getFullYear() +
    "-" +
    String(lpd.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(lpd.getDate()).padStart(2, "0");
  return {
    accounts: {
      checking: "",
      savings: "",
      cushion: "1800",
      credit_card: "0",
      investments: "8400",
      k401: "28500",
      roth_ira: "12000",
      brokerage: "8400",
      crypto: "1800",
      hsa: "3200",
      property: "0",
      vehicles: "12000",
      cashAccounts: [
        { id: DEMO_IDCHECK_PRIMARY, name: "Primary Checking", kind: "checking", balance: "3100" },
        { id: DEMO_IDCHECK_JOINT, name: "Joint Bills", kind: "checking", balance: "1180" },
        { id: DEMO_IDSAVINGS, name: "High-Yield Savings", kind: "savings", balance: "11400" },
      ],
    },
    income: {
      primary: "4200",
      other: "300",
      trading: "",
      rental: "",
      dividends: "",
      freelance: "500",
      payFrequency: "Biweekly",
      lastPayDate,
    },
    household: {
      enabled: true,
      name: "Victor & Erin",
      members: [
        { id: "me", name: "Victor", emoji: "🧑‍💼", color: "#6366F1" },
        { id: "partner", name: "Erin", emoji: "👩", color: "#10B981" },
      ],
    },
    settings: {
      ...DEF_SETTINGS,
      showTrading: true,
      showCrypto: true,
      defaultCheckingAccountId: String(DEMO_IDCHECK_PRIMARY),
      defaultSavingsAccountId: String(DEMO_IDSAVINGS),
    },
    calColors: DEF_CALCOLORS(),
    dashConfig: { ...DEF_DASHCONFIG },
    taccount: { deposit: "5000", balance: "5600" },
    prof: "healthcare",
    profSub: "nurse_rn",
    appName: "Trackfi",
    greetName: "Victor",
    onboarded: true,
    subDismissed: [],
    notifs: [],
    cats: DEF_CATS.map((c) => ({ ...c })),
  };
}

/** Maps generateDemoData() return fields → sync bare keys. */
export function demoGeneratedToSyncMap(demo) {
  return {
    expenses: demo.expenses,
    bills: demo.bills,
    debts: demo.debts,
    bgoals: demo.budgetGoals,
    sgoals: demo.savingsGoals,
    trades: demo.trades,
    shifts: demo.shifts,
    balHist: demo.balHist,
    recurrings: demo.recurrings,
    settlements: demo.settlements,
    hhBudgets: demo.hhBudgets,
    nwGoal: demo.nwGoal,
    accountRates: demo.accountRates,
    merchantCats: demo.merchantCats,
  };
}

/** Full authoritative cloud map (all SCOPED_USER_DATA_KEYS except onboarded optional). */
export function buildFullDemoSyncMap() {
  const demo = generateDemoData();
  return { ...buildDemoLoadShell(), ...demoGeneratedToSyncMap(demo) };
}

/** Backup export shape (App.jsx backupExport) from sync bare map. */
export function syncMapToBackupExport(map) {
  return {
    app: "trackfi",
    version: "3.2",
    demoModelVersion: DEMO_MODEL_VERSION,
    appName: map.appName,
    greetName: map.greetName,
    onboarded: map.onboarded,
    accounts: map.accounts,
    income: map.income,
    expenses: map.expenses,
    bills: map.bills,
    debts: map.debts,
    trades: map.trades,
    shifts: map.shifts,
    savingsGoals: map.sgoals,
    budgetGoals: map.bgoals,
    categories: map.cats,
    settings: map.settings,
    calColors: map.calColors,
    dashConfig: map.dashConfig,
    household: map.household,
    recurrings: map.recurrings,
    settlements: map.settlements,
    hhBudgets: map.hhBudgets,
    nwGoal: map.nwGoal,
    subDismissed: map.subDismissed,
    profCategory: map.prof,
    profSub: map.profSub,
    tradingAccount: map.taccount,
    accountRates: map.accountRates,
    balHist: map.balHist,
    notifs: map.notifs,
    merchantCats: map.merchantCats,
  };
}

/** React-state-shaped handlers for applyUserDataSnapshot tests. */
export function makeSnapshotHandlers(initial = {}) {
  const state = {
    expenses: [],
    bills: [],
    debts: [],
    budgetGoals: [],
    savingsGoals: [],
    categories: [...DEF_CATS],
    trades: [],
    balHist: [],
    shifts: [],
    recurrings: [],
    notifs: [],
    settlements: [],
    hhBudgets: [],
    nwGoal: null,
    subDismissed: [],
    accounts: { ...DEF_ACCOUNTS, cashAccounts: [] },
    income: { ...DEF_INCOME },
    settings: { ...DEF_SETTINGS },
    calColors: DEF_CALCOLORS(),
    dashConfig: { ...DEF_DASHCONFIG },
    household: { ...DEF_HOUSEHOLD, members: DEF_HOUSEHOLD.members.map((m) => ({ ...m })) },
    accountRates: { checking: 0, savings: 0, cushion: 0, k401: 0, roth_ira: 0, brokerage: 0, hsa: 0, crypto: 0 },
    tradingAccount: { deposit: "", balance: "" },
    appName: "Trackfi",
    greetName: "",
    profCategory: "healthcare",
    profSub: "nurse_rn",
    onboarded: false,
    ...initial,
  };

  const mk =
    (key) =>
    (v) => {
      state[key] = typeof v === "function" ? v(state[key]) : v;
    };

  return {
    state,
    H: {
      setExpenses: mk("expenses"),
      setBills: mk("bills"),
      setDebts: mk("debts"),
      setBGoals: mk("budgetGoals"),
      setSGoals: mk("savingsGoals"),
      setCats: mk("categories"),
      setTrades: mk("trades"),
      setBalHist: mk("balHist"),
      setShifts: mk("shifts"),
      setRecurrings: mk("recurrings"),
      setNotifs: mk("notifs"),
      setSettlements: mk("settlements"),
      setHhBudgets: mk("hhBudgets"),
      setNwGoal: mk("nwGoal"),
      setSubDismissed: mk("subDismissed"),
      setAccounts: mk("accounts"),
      setIncome: mk("income"),
      setSettings: mk("settings"),
      setCalColors: mk("calColors"),
      setDashConfig: mk("dashConfig"),
      setHousehold: mk("household"),
      setAccountRates: mk("accountRates"),
      setTradingAccount: mk("tradingAccount"),
      setAppName: mk("appName"),
      setGreetName: mk("greetName"),
      setProfCategory: mk("profCategory"),
      setProfSub: mk("profSub"),
      setOnboarded: mk("onboarded"),
    },
  };
}

export { DEMO_IDCHECK_PRIMARY, DEMO_IDCHECK_JOINT, DEMO_IDSAVINGS, DEMO_CC_DEBT_ID, DEMO_MODEL_VERSION };
