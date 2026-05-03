import { describe, it, expect } from "vitest";
import { isCreditCardDebt, cardDebtsList, legacyCreditCardOwed } from "./creditCardTotals.js";

describe("creditCardTotals", () => {
  it("isCreditCardDebt matches debtKind credit_card", () => {
    expect(isCreditCardDebt({ debtKind: "credit_card" })).toBe(true);
    expect(isCreditCardDebt({ debtKind: "loan" })).toBe(false);
    expect(isCreditCardDebt(null)).toBeFalsy();
  });

  it("legacyCreditCardOwed uses legacy field when there are no card debts", () => {
    expect(legacyCreditCardOwed({ credit_card: "120.5" }, [])).toBe(120.5);
    expect(legacyCreditCardOwed({ credit_card: "0" }, [{ debtKind: "loan" }])).toBe(0);
  });

  it("legacyCreditCardOwed is zero when at least one credit_card debt exists", () => {
    const accounts = { credit_card: "999" };
    const debts = [{ id: "1", debtKind: "credit_card", balance: "50" }];
    expect(legacyCreditCardOwed(accounts, debts)).toBe(0);
    expect(cardDebtsList(debts)).toHaveLength(1);
  });
});
