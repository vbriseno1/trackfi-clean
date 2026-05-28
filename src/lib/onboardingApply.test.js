import { describe, expect, it } from "vitest";
import {
  buildCashAccountsFromOnboarding,
  householdFromUseCase,
  incomeFromOnboarding,
  settingsPatchFromOnboarding,
} from "./onboardingApply.js";

describe("buildCashAccountsFromOnboarding", () => {
  it("creates checking and savings cash accounts from balances", () => {
    const rows = buildCashAccountsFromOnboarding({ checking: "2500", savings: "5000", cushion: "" });
    expect(rows).toHaveLength(2);
    expect(rows[0].kind).toBe("checking");
    expect(rows[0].balance).toBe("2500");
    expect(rows[1].kind).toBe("savings");
  });

  it("returns empty when no positive balances", () => {
    expect(buildCashAccountsFromOnboarding({ checking: "", savings: "0" })).toEqual([]);
  });
});

describe("householdFromUseCase", () => {
  it("enables couple household with two members", () => {
    const h = householdFromUseCase("couple", "Victor Lee");
    expect(h.enabled).toBe(true);
    expect(h.members).toHaveLength(2);
    expect(h.members[0].name).toBe("Victor");
  });

  it("disables household for personal", () => {
    const h = householdFromUseCase("personal", "Alex");
    expect(h.enabled).toBe(false);
    expect(h.members).toHaveLength(1);
  });
});

describe("incomeFromOnboarding", () => {
  it("sets lastPayDate and preserves pay frequency", () => {
    const inc = incomeFromOnboarding({ primary: "3000", payFrequency: "Weekly" });
    expect(inc.primary).toBe("3000");
    expect(inc.payFrequency).toBe("Weekly");
    expect(inc.lastPayDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("settingsPatchFromOnboarding", () => {
  it("enables trading when trading income is set", () => {
    const s = settingsPatchFromOnboarding({ trading: "500" }, { showTrading: false });
    expect(s.showTrading).toBe(true);
  });
});
