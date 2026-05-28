import { describe, expect, it } from "vitest";
import {
  generateDemoData,
  DEMO_MODEL_VERSION,
  DEMO_IDCHECK_PRIMARY,
  DEMO_CC_DEBT_ID,
} from "./demoData.js";
import { demoGeneratedToSyncMap } from "./demoSyncFixture.js";
import { DEF_CATS } from "./defaults.js";
import { isCreditCardDebt } from "./creditCardTotals.js";

describe("generateDemoData", () => {
  const demo = generateDemoData();

  it("exports stable model version", () => {
    expect(demo.demoModelVersion).toBe(DEMO_MODEL_VERSION);
  });

  it("populates every major entity list", () => {
    expect(demo.expenses.length).toBeGreaterThan(120);
    expect(demo.bills.length).toBeGreaterThan(100);
    expect(demo.debts).toHaveLength(4);
    expect(demo.trades.length).toBeGreaterThan(50);
    expect(demo.shifts.length).toBeGreaterThan(40);
    expect(demo.savingsGoals).toHaveLength(5);
    expect(demo.budgetGoals).toHaveLength(8);
    expect(demo.balHist.length).toBeGreaterThan(30);
    expect(demo.recurrings).toHaveLength(5);
    expect(demo.settlements).toHaveLength(2);
    expect(demo.hhBudgets).toHaveLength(2);
    expect(demo.nwGoal).toEqual({ target: 150000 });
  });

  it("uses real DEF_CATS category names on expenses", () => {
    const names = new Set(DEF_CATS.map((c) => c.name));
    const bad = demo.expenses.filter((e) => !names.has(e.category));
    expect(bad).toEqual([]);
  });

  it("routes credit-card spends to demo card debt", () => {
    const cardSpends = demo.expenses.filter((e) => e.paidFrom === "credit");
    expect(cardSpends.length).toBeGreaterThan(0);
    expect(cardSpends.every((e) => String(e.creditDebtId) === String(DEMO_CC_DEBT_ID))).toBe(true);
  });

  it("assigns bankAccountId on checking spends", () => {
    const checking = demo.expenses.filter((e) => e.paidFrom === "checking" && e.bankAccountId);
    expect(checking.length).toBeGreaterThan(0);
    expect(
      checking.every((e) =>
        [String(DEMO_IDCHECK_PRIMARY), "9102"].includes(String(e.bankAccountId))
      )
    ).toBe(true);
  });

  it("includes credit_card debtKind for Capital One", () => {
    const cc = demo.debts.find((d) => d.name.includes("Capital One"));
    expect(cc).toBeDefined();
    expect(isCreditCardDebt(cc)).toBe(true);
  });

  it("maps to sync keys used by Supabase", () => {
    const sync = demoGeneratedToSyncMap(demo);
    expect(sync.sgoals).toBe(demo.savingsGoals);
    expect(sync.bgoals).toBe(demo.budgetGoals);
    expect(sync.expenses).toBe(demo.expenses);
    expect(Object.keys(sync.merchantCats).length).toBeGreaterThan(20);
  });

  it("includes household tags on shared expenses", () => {
    const shared = demo.expenses.filter((e) => e.owner === "shared");
    expect(shared.length).toBeGreaterThan(0);
  });

  it("bills include paidFrom and optional creditDebtId", () => {
    const hulu = demo.bills.find((b) => b.name === "Hulu");
    expect(hulu?.paidFrom).toBe("credit");
    expect(String(hulu?.creditDebtId)).toBe(String(DEMO_CC_DEBT_ID));
    const rent = demo.bills.find((b) => b.name === "Rent");
    expect(rent?.paidFrom).toBe("checking");
    expect(rent?.bankAccountId).toBeTruthy();
  });
});
