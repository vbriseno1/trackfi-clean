import { describe, it, expect } from "vitest";
import {
  BANK_CSV_FORMATS,
  parseBankCsvText,
  autoCategoryBankCsv,
  BANK_CSV_CAT_RULES,
} from "./bankCsvImport.js";

describe("bankCsvImport", () => {
  it("parses generic three-column CSV", () => {
    const csv = `Date,Description,Amount
01/15/2026,STARBUCKS #1234,4.75
2026-01-14,PUBLIX SUPERMARKET,89.23`;
    const rows = parseBankCsvText(csv, { nowMs: 1000 });
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      id: "imp_1000_1",
      name: "STARBUCKS #1234",
      amount: "4.75",
      date: "2026-01-15",
      category: "Coffee",
      paidFrom: "none",
    });
    expect(rows[1].category).toBe("Groceries");
  });

  it("detects Chase header and maps columns", () => {
    const csv = `Transaction Date,Post Date,Description,Amount
01/10/2026,01/11/2026,AMAZON MARKETPLACE,-42.00`;
    const rows = parseBankCsvText(csv, { nowMs: 2 });
    expect(rows[0].name).toBe("AMAZON MARKETPLACE");
    expect(rows[0].amount).toBe("42.00");
    expect(rows[0].category).toBe("Shopping");
  });

  it("autoCategoryBankCsv respects merchantCats and rules", () => {
    expect(autoCategoryBankCsv("STARBUCKS", { starbucks: "Misc" })).toBe("Misc");
    expect(autoCategoryBankCsv("random xyz", {})).toBe("Misc");
    expect(autoCategoryBankCsv("", {})).toBe("Misc");
  });

  it("BANK_CSV_FORMATS ends with Generic catch-all", () => {
    expect(BANK_CSV_FORMATS[BANK_CSV_FORMATS.length - 1].name).toBe("Generic");
    expect(BANK_CSV_CAT_RULES.length).toBeGreaterThan(5);
  });
});
