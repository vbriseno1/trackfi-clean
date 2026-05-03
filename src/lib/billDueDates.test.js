import { describe, it, expect } from "vitest";
import {
  addMonthsToBillDueDate,
  addDaysToBillDueDate,
  shiftRecurringBillDueDate,
  parseBillYmdParts,
} from "./billDueDates.js";

describe("billDueDates", () => {
  it("addMonthsToBillDueDate clamps Jan 31 +1 month to last day of February", () => {
    expect(addMonthsToBillDueDate("2026-01-31", 1, "2026-01-01")).toBe("2026-02-28");
  });

  it("addMonthsToBillDueDate handles leap year February", () => {
    expect(addMonthsToBillDueDate("2024-01-31", 1, "2024-01-01")).toBe("2024-02-29");
  });

  it("addMonthsToBillDueDate Mar 31 -1 month lands on Feb last day", () => {
    expect(addMonthsToBillDueDate("2026-03-31", -1, "2026-01-01")).toBe("2026-02-28");
  });

  it("addDaysToBillDueDate crosses month boundary", () => {
    expect(addDaysToBillDueDate("2026-01-30", 5, "2026-01-01")).toBe("2026-02-04");
  });

  it("shiftRecurringBillDueDate monthly forward/back are inverse for typical dates", () => {
    const start = "2026-06-15";
    const fwd = shiftRecurringBillDueDate(start, "Monthly", "2026-01-01", true);
    const back = shiftRecurringBillDueDate(fwd, "Monthly", "2026-01-01", false);
    expect(back).toBe(start);
  });

  it("shiftRecurringBillDueDate monthly from Jan 31 clamps to February last day (recurring expense cadence)", () => {
    expect(shiftRecurringBillDueDate("2026-01-31", "Monthly", "2026-02-01", true)).toBe("2026-02-28");
    expect(shiftRecurringBillDueDate("2026-01-31", "Bi-weekly", "2026-01-01", true)).toBe("2026-02-14");
  });

  it("parseBillYmdParts rejects garbage", () => {
    expect(parseBillYmdParts("")).toBeNull();
    expect(parseBillYmdParts("2026-13-01")).toBeNull();
    expect(parseBillYmdParts("nope")).toBeNull();
  });
});
