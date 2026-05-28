import { describe, expect, it } from "vitest";
import {
  advancePaydayIso,
  getLatestScheduledPaydayOnOrBefore,
  paycheckPeriodNeedsHandling,
  computeSafeToSpend,
} from "./safeToSpend.js";
import { buildDemoLoadShell, buildFullDemoSyncMap } from "./demoSyncFixture.js";

describe("safeToSpend with demo income and accounts", () => {
  const shell = buildDemoLoadShell();
  const full = buildFullDemoSyncMap();

  it("advancePaydayIso advances biweekly from anchor", () => {
    expect(advancePaydayIso("2026-05-01", "Biweekly")).toBe("2026-05-15");
  });

  it("getLatestScheduledPaydayOnOrBefore finds anchor within period", () => {
    const due = getLatestScheduledPaydayOnOrBefore("2026-05-01", "Biweekly", "2026-05-20");
    expect(due).toBe("2026-05-15");
  });

  it("paycheckPeriodNeedsHandling nudges when new period not handled", () => {
    const income = { ...shell.income, lastPayDate: "2026-04-15" };
    const settings = { paycheckNudgeLastHandledPeriod: "" };
    const r = paycheckPeriodNeedsHandling(income, settings, "2026-05-20");
    expect(r.show).toBe(true);
    expect(r.due).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("computeSafeToSpend returns positive sts with demo checking and income", () => {
    const now = new Date("2026-05-15T12:00:00");
    const r = computeSafeToSpend(
      shell.accounts,
      shell.income,
      full.bills.filter((b) => !b.paid).slice(0, 20),
      full.expenses.slice(0, 80),
      full.bgoals,
      now
    );
    expect(r.sts).toBeGreaterThan(0);
    expect(r.checkingBalance).toBeGreaterThan(4000);
    expect(r.nextPayStr).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(r.billsBeforeNextPayAmt).toBeGreaterThanOrEqual(0);
  });

  it("computeSafeToSpend respects envelope reserve from demo bgoals", () => {
    const now = new Date("2026-05-15T12:00:00");
    const withGoals = computeSafeToSpend(shell.accounts, shell.income, [], [], full.bgoals, now);
    const bare = computeSafeToSpend(shell.accounts, shell.income, [], [], [], now);
    expect(withGoals.envelopeReserve).toBeGreaterThanOrEqual(bare.envelopeReserve);
  });
});
