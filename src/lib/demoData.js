/**
 * Demo data factory used by "Try the demo" mode.
 *
 * Generates a realistic 12-month nurse/healthcare household so every screen
 * has something to show (expenses across every DEF_CATS bucket, bills with
 * mixed paidFrom + autoPay + paidBy, debts including a credit card so card
 * routing works, trades, shifts, savings goals, budget envelopes, balance
 * history, recurring templates, and household settlement history).
 *
 * Bump DEMO_MODEL_VERSION when the shape changes so existing demo users see
 * a fresh seed instead of stale stored data.
 */
export const DEMO_MODEL_VERSION = "2026-04-01";
export const DEMO_IDCHECK_PRIMARY = 9101;
export const DEMO_IDCHECK_JOINT = 9102;
export const DEMO_IDSAVINGS = 9103;
export const DEMO_CC_DEBT_ID = 2003;

export function generateDemoData() {
  const now = new Date(), yr = now.getFullYear();
  const expenses = [], bills = [], debts = [], trades = [], shifts = [], savingsGoals = [], budgetGoals = [], balHist = [], recurrings = [];

  // ── EXPENSES — uses all 21 real DEF_CATS category names ──────────────────
  const ET = [
    // Food & Dining
    ["Publix",            "Groceries",          [62, 175]],
    ["Kroger",            "Groceries",          [45, 130]],
    ["Whole Foods",       "Groceries",          [55, 120]],
    ["Chipotle",          "Fast Food",          [11, 16]],
    ["McDonald's",        "Fast Food",          [8, 14]],
    ["Chick-fil-A",       "Fast Food",          [9, 16]],
    ["Taco Bell",         "Fast Food",          [7, 13]],
    ["Cheesecake Factory","Restaurants",        [48, 85]],
    ["Sushi Den",         "Restaurants",        [35, 70]],
    ["Local Bistro",      "Restaurants",        [28, 65]],
    ["DoorDash",          "Restaurants",        [22, 55]],
    ["Starbucks",         "Coffee",             [5, 9]],
    ["Dunkin",            "Coffee",             [4, 7]],
    ["Dutch Bros",        "Coffee",             [5, 9]],
    // Home & Transport
    ["Shell",             "Gas",                [48, 88]],
    ["BP Gas",            "Gas",                [45, 82]],
    ["Uber",              "Rideshare",          [12, 28]],
    ["Lyft",              "Rideshare",          [10, 22]],
    // Personal Care
    ["Great Clips",       "Grooming / Haircuts",[28, 38]],
    ["Barber Shop",       "Grooming / Haircuts",[30, 40]],
    ["Target",            "Clothing",           [35, 120]],
    ["Nike",              "Clothing",           [55, 140]],
    ["Walgreens",         "Health / Medical",   [15, 60]],
    ["CVS Pharmacy",      "Health / Medical",   [18, 55]],
    ["Planet Fitness",    "Gym / Fitness",      [10, 10]],
    // Bills & Subs (logged as expenses too sometimes)
    ["Amazon",            "Shopping",           [25, 95]],
    ["Home Depot",        "Shopping",           [35, 180]],
    ["Best Buy",          "Shopping",           [40, 200]],
    ["Chewy",             "Pets",               [45, 85]],
    ["Banfield Vet",      "Pets",               [55, 150]],
    ["AMC Movies",        "Entertainment",      [14, 28]],
    ["Steam",             "Entertainment",      [8, 30]],
    ["Delta Airlines",    "Travel",             [180, 420]],
    ["Airbnb",            "Travel",             [120, 380]],
    ["Uber Eats",         "Dining Out",         [18, 45]],
    ["Grubhub",           "Dining Out",         [16, 40]],
    ["Car Wash",          "Misc",               [14, 24]],
    ["USPS",              "Misc",               [8, 18]],
  ];

  for (let mo = 0; mo < 12; mo++) {
    const isFuture = mo > now.getMonth(), isCur = mo === now.getMonth();
    const dim = new Date(yr, mo + 1, 0).getDate();
    const maxDay = isFuture ? 0 : isCur ? Math.max(1, now.getDate() - 1) : dim;
    if (!maxDay) continue;
    const count = 22 + Math.floor(Math.random() * 14);
    for (let i = 0; i < count; i++) {
      const [nm, cat, rng] = ET[Math.floor(Math.random() * ET.length)];
      const day = 1 + Math.floor(Math.random() * Math.max(1, maxDay - 1));
      const amt = (rng[0] + Math.random() * (rng[1] - rng[0])).toFixed(2);
      const ownerId = Math.random() > 0.6 ? "shared" : Math.random() > 0.5 ? "partner" : "me";
      const tagRoll = Math.random();
      const tags = tagRoll < 0.14 ? ["food"] : tagRoll < 0.22 ? ["fun"] : tagRoll < 0.28 ? ["transport"] : tagRoll < 0.34 ? ["personal"] : [];
      const rollPf = Math.random();
      const paidFrom = rollPf > 0.90 ? "credit" : rollPf > 0.97 ? "none" : "checking";
      const ex = {
        id: Date.now() + mo * 10000 + i + Math.floor(Math.random() * 100),
        name: nm, category: cat, amount: amt,
        date: yr + "-" + String(mo + 1).padStart(2, "0") + "-" + String(day).padStart(2, "0"),
        notes: "", owner: ownerId, paidFrom, tags,
      };
      if (paidFrom === "credit") ex.creditDebtId = String(DEMO_CC_DEBT_ID);
      if (paidFrom === "checking") ex.bankAccountId = String(Math.random() > 0.85 ? DEMO_IDCHECK_JOINT : DEMO_IDCHECK_PRIMARY);
      expenses.push(ex);
    }
    // Guaranteed subscriptions each month for SubsView detection
    [
      ["Netflix", "Subscriptions", "15.49"],
      ["Spotify", "Subscriptions", "10.99"],
      ["Apple iCloud", "Subscriptions", "2.99"],
      ["YouTube Premium", "Subscriptions", "13.99"],
      ["Disney+", "Subscriptions", "10.99"],
      ["Gym Membership", "Gym / Fitness", "25.00"],
    ].forEach(([nm, cat, amt], si) => {
      if (isFuture) return;
      expenses.push({
        id: Date.now() + mo * 5000 + si + 9000,
        name: nm, category: cat, amount: amt,
        date: yr + "-" + String(mo + 1).padStart(2, "0") + "-" + String(1 + si).padStart(2, "0"),
        notes: "recurring", owner: "shared", paidFrom: "credit",
        creditDebtId: String(DEMO_CC_DEBT_ID), tags: ["recurring"],
      });
    });
  }

  // ── BILLS — recurring types + household paidBy + card vs bank ──
  const BT = [
    ["Rent",              "1450", "01", "Monthly", false, "shared",  "checking", null],
    ["Electric (FPL)",    "94",   "15", "Monthly", true,  "me",      "checking", null],
    ["Internet (Xfinity)","65",   "22", "Monthly", true,  "shared",  "checking", null],
    ["Phone (T-Mobile)",  "95",   "08", "Monthly", true,  "partner", "checking", null],
    ["Renters Insurance", "22",   "01", "Monthly", false, "me",      "checking", null],
    ["Car Insurance",     "148",  "10", "Monthly", false, "partner", "checking", null],
    ["Car Payment",       "385",  "05", "Monthly", false, "me",      "checking", null],
    ["Student Loan",      "320",  "05", "Monthly", false, "me",      "checking", null],
    ["Hulu",              "17",   "18", "Monthly", true,  "shared",  "credit",   String(DEMO_CC_DEBT_ID)],
    ["Amazon Prime",      "15",   "23", "Annual",  true,  "partner", "credit",   String(DEMO_CC_DEBT_ID)],
    ["Life Insurance",    "38",   "01", "Monthly", false, "me",      "checking", null],
  ];
  const today2 = new Date();
  BT.forEach(([nm, amt, day, rec, auto, paidBy, pf, billCid], idx) => {
    for (let mo2 = 0; mo2 < 12; mo2++) {
      const due = yr + "-" + String(mo2 + 1).padStart(2, "0") + "-" + day;
      const row = {
        id: (idx + 1) * 100 + mo2,
        name: nm, amount: amt, dueDate: due,
        paid: new Date(due + "T00:00:00") < today2,
        recurring: rec, autoPay: auto, notes: "",
        paidFrom: pf, paidBy,
      };
      if (billCid) row.creditDebtId = billCid;
      if (pf === "checking") row.bankAccountId = String(nm === "Rent" || nm === "Internet (Xfinity)" ? DEMO_IDCHECK_JOINT : DEMO_IDCHECK_PRIMARY);
      bills.push(row);
    }
  });

  // ── DEBTS — debtKind required for card routing (isCreditCardDebt) ─────────
  debts.push(
    { id: 2001, name: "Student Loans",     balance: "18400", original: "24000", rate: "5.75",  minPayment: "320", type: "Student Loan", debtKind: "loan" },
    { id: 2002, name: "Car Loan (Honda)",  balance: "9200",  original: "15000", rate: "6.9",   minPayment: "285", type: "Car Loan",     debtKind: "loan" },
    { id: 2003, name: "Capital One Visa",  balance: "2340",  original: "3500",  rate: "22.99", minPayment: "58",  type: "Credit Card",  debtKind: "credit_card" },
    { id: 2004, name: "Medical Bill",      balance: "1200",  original: "1200",  rate: "0",     minPayment: "100", type: "Medical",      debtKind: "loan" }
  );

  // ── TRADES ────────────────────────────────────────────────────────────────
  const syms = ["ES", "NQ", "CL", "GC", "MES", "MNQ", "RTY"];
  for (let mo = 0; mo < 12; mo++) {
    const n = 5 + Math.floor(Math.random() * 9);
    for (let i = 0; i < n; i++) {
      const isWin = Math.random() > 0.40;
      const pnl = isWin ? (75 + Math.random() * 680).toFixed(0) : "-" + (55 + Math.random() * 360).toFixed(0);
      const day = 2 + Math.floor(Math.random() * 25);
      const sym = syms[Math.floor(Math.random() * syms.length)];
      const entry = (4500 + Math.random() * 200).toFixed(2);
      const exit = (parseFloat(entry) + (isWin ? 8 : -6) * (1 + Math.random() * 4)).toFixed(2);
      trades.push({
        id: Date.now() + 50000 + mo * 200 + i,
        date: yr + "-" + String(mo + 1).padStart(2, "0") + "-" + String(day).padStart(2, "0"),
        symbol: sym, side: Math.random() > 0.5 ? "Long" : "Short", contracts: "1",
        pnl, entry, exit,
        note: isWin
          ? ["Clean breakout", "Trend continuation", "Support bounce", "Gap fill"][Math.floor(Math.random() * 4)]
          : ["Stopped out", "Fakeout", "Bad entry", "News hit"][Math.floor(Math.random() * 4)],
      });
    }
  }

  // ── SHIFTS — ICU/RN schedule with all shift types ─────────────────────────
  const ST = ["Regular", "Regular", "Regular", "Regular", "Overtime", "Night", "Weekend", "Holiday"];
  const mults = { Regular: 1, Overtime: 1.5, Night: 1.15, Weekend: 1.25, Holiday: 2 };
  const notes = ["ICU Floor 3", "PACU", "Float pool", "Charge nurse", "ED overflow", "Step-down unit"];
  for (let mo = 0; mo < 12; mo++) {
    for (let wk = 0; wk < 4; wk++) {
      const day = Math.min(wk * 7 + 1 + Math.floor(Math.random() * 5), 28);
      const type = ST[Math.floor(Math.random() * ST.length)];
      const hours = (type === "Overtime" ? 12 : type === "Night" ? 12 : 8 + Math.random() * 4).toFixed(1);
      const rate = "42.50";
      shifts.push({
        id: Date.now() + 80000 + mo * 100 + wk,
        date: yr + "-" + String(mo + 1).padStart(2, "0") + "-" + String(day).padStart(2, "0"),
        type, hours, rate, gross: (parseFloat(hours) * parseFloat(rate) * (mults[type] || 1)).toFixed(2),
        note: notes[Math.floor(Math.random() * notes.length)],
      });
    }
  }

  // ── SAVINGS GOALS ─────────────────────────────────────────────────────────
  savingsGoals.push(
    { id: 3001, name: "Emergency Fund",   icon: "🛡️", color: "#6366F1", target: "18000", saved: "11400", monthly: "400" },
    { id: 3002, name: "New Car",          icon: "🚗", color: "#059669", target: "8000",  saved: "3200",  monthly: "300" },
    { id: 3003, name: "Vacation — Italy", icon: "✈️", color: "#D97706", target: "5500",  saved: "1850",  monthly: "250" },
    { id: 3004, name: "Trading Account",  icon: "📈", color: "#7C3AED", target: "10000", saved: "5800",  monthly: "200" },
    { id: 3005, name: "Wedding Fund",     icon: "💍", color: "#EC4899", target: "25000", saved: "8200",  monthly: "500" }
  );

  // ── BUDGET ENVELOPES — uses real DEF_CATS names ───────────────────────────
  budgetGoals.push(
    { id: 4001, category: "Groceries",            limit: "600", note: "Weekly runs" },
    { id: 4002, category: "Gas",                  limit: "200", note: "Commute + errands" },
    { id: 4003, category: "Dining Out",           limit: "180", note: "Date nights" },
    { id: 4004, category: "Entertainment",        limit: "120", note: "Movies, games" },
    { id: 4005, category: "Clothing",             limit: "150", note: "Seasonal refresh" },
    { id: 4006, category: "Grooming / Haircuts",  limit: "60",  note: "Every 3 weeks" },
    { id: 4007, category: "Pets",                 limit: "200", note: "Vet + food" },
    { id: 4008, category: "Subscriptions",        limit: "80",  note: "Monthly subs cap" }
  );

  // ── BALANCE HISTORY — includes all account types, growing trend ───────────
  let checking = 4280, savings = 11400, cushion = 1800, investments = 14200, k401 = 28500, roth = 12000, brokerage = 8400, crypto = 1800;
  for (let mo = 0; mo < 12; mo++) {
    for (let wk = 0; wk < 4; wk++) {
      const day = wk * 7 + 1;
      if (day > 28) continue;
      checking = Math.max(1800, checking + (Math.random() - 0.45) * 600);
      savings = Math.max(8000, savings + 280 + (Math.random() - 0.3) * 150);
      cushion = Math.max(1200, cushion + (Math.random() - 0.4) * 80);
      investments = Math.max(10000, investments + 180 + (Math.random() - 0.35) * 400);
      k401 = Math.max(20000, k401 + 350 + (Math.random() - 0.3) * 200);
      roth = Math.max(8000, roth + 150 + (Math.random() - 0.3) * 120);
      brokerage = Math.max(5000, brokerage + 120 + (Math.random() - 0.4) * 300);
      crypto = Math.max(500, crypto + (Math.random() - 0.5) * 200);
      balHist.push({
        date: yr + "-" + String(mo + 1).padStart(2, "0") + "-" + String(day).padStart(2, "0"),
        checking: Math.round(checking), savings: Math.round(savings),
        cushion: Math.round(cushion), investments: Math.round(investments),
        k401: Math.round(k401), roth_ira: Math.round(roth),
        brokerage: Math.round(brokerage), crypto: Math.round(crypto),
        total: Math.round(checking + savings + cushion + investments + k401 + roth + brokerage + crypto),
      });
    }
  }

  // ── MERCHANT CATEGORY MAP — for AI auto-suggest ───────────────────────────
  const merchantCats = {
    publix: "Groceries", kroger: "Groceries", "whole foods": "Groceries",
    chipotle: "Fast Food", "mcdonald's": "Fast Food", "chick-fil-a": "Fast Food", "taco bell": "Fast Food",
    "cheesecake factory": "Restaurants", doordash: "Restaurants", grubhub: "Dining Out", "uber eats": "Dining Out",
    starbucks: "Coffee", dunkin: "Coffee", "dutch bros": "Coffee",
    shell: "Gas", "bp gas": "Gas",
    uber: "Rideshare", lyft: "Rideshare",
    "great clips": "Grooming / Haircuts", "barber shop": "Grooming / Haircuts",
    target: "Clothing", nike: "Clothing",
    walgreens: "Health / Medical", "cvs pharmacy": "Health / Medical",
    "planet fitness": "Gym / Fitness",
    amazon: "Shopping", "home depot": "Shopping", "best buy": "Shopping",
    chewy: "Pets", "banfield vet": "Pets",
    "amc movies": "Entertainment", steam: "Entertainment",
    "delta airlines": "Travel", airbnb: "Travel",
    netflix: "Subscriptions", spotify: "Subscriptions", "apple icloud": "Subscriptions",
    "youtube premium": "Subscriptions", "disney+": "Subscriptions",
    "gym membership": "Gym / Fitness",
  };

  // ── RECURRING TEMPLATE ROWS (More → Recurring) ────────────────────────────
  const _nd = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
  recurrings.push(
    { id: 7201, name: "Dog walker",             amount: "40", category: "Pets",             frequency: "Weekly",    nextDate: _nd(3),  icon: "🐕", active: true },
    { id: 7202, name: "iPhone Upgrade Program", amount: "45", category: "Phone",            frequency: "Monthly",   nextDate: _nd(12), icon: "📱", active: true },
    { id: 7203, name: "Parking (work)",         amount: "28", category: "Misc",             frequency: "Monthly",   nextDate: _nd(5),  icon: "🅿️", active: true },
    { id: 7204, name: "Therapy co-pay",         amount: "35", category: "Health / Medical", frequency: "Bi-weekly", nextDate: _nd(7),  icon: "💬", active: true },
    { id: 7205, name: "Kids swim class",        amount: "60", category: "Entertainment",    frequency: "Monthly",   nextDate: _nd(18), icon: "🏊", active: true }
  );

  // ── HOUSEHOLD: settle-up history + shared category caps ───────────────────
  const settlements = [
    { date: yr + "-03-14", month: yr + "-03", from: "Erin",   to: "Victor", amount: "242.00" },
    { date: yr + "-07-22", month: yr + "-07", from: "Victor", to: "Erin",   amount: "198.50" },
  ];
  const hhBudgets = [
    { category: "Groceries",     limit: "520" },
    { category: "Entertainment", limit: "160" },
  ];

  const nwGoal = { target: 150000 };
  const accountRates = { checking: 0.5, savings: 4.15, cushion: 0, k401: 0, roth_ira: 0, brokerage: 0, hsa: 0, crypto: 0 };

  return {
    expenses, bills, debts, trades, shifts, savingsGoals, budgetGoals, balHist, merchantCats,
    recurrings, settlements, hhBudgets, nwGoal, accountRates,
    demoModelVersion: DEMO_MODEL_VERSION,
  };
}
