import { describe, expect, it } from "vitest";
import { employeeBusinessDate } from "./employee-date-only";
import { createEmployeeEndDateSchema } from "./employee-employment-schema";

describe("employee employment date", () => {
  it.each([
    ["2026-10-28T16:59:59Z", "2026-10-28"],
    ["2026-10-28T17:00:00Z", "2026-10-29"],
    ["2026-12-31T17:00:00Z", "2027-01-01"],
  ])("uses the business date at %s", (instant, expected) => {
    expect(employeeBusinessDate(new Date(instant))).toBe(expected);
  });
  it.each(["", "2026-02-30", "0000-01-01", "28/10/2026", "2026-10-28T00:00:00Z", "2026-10-29"])("rejects missing, invalid or future date %s", (endDate) => {
    const schema = createEmployeeEndDateSchema(() => new Date("2026-10-28T10:00:00Z"));
    expect(schema.safeParse({ endDate }).success).toBe(false);
  });
  it.each(["2026-10-28", "2026-10-27", "2024-02-29"])("accepts today or an earlier valid date %s", (endDate) => {
    expect(createEmployeeEndDateSchema(() => new Date("2026-10-28T10:00:00Z")).safeParse({ endDate }).success).toBe(true);
  });
  it("reads the clock at validation time when a form stays open across midnight", () => {
    let instant = new Date("2026-10-28T16:59:59Z");
    const schema = createEmployeeEndDateSchema(() => instant);
    expect(schema.safeParse({ endDate: "2026-10-29" }).success).toBe(false);
    instant = new Date("2026-10-28T17:00:00Z");
    expect(schema.safeParse({ endDate: "2026-10-29" }).success).toBe(true);
  });
});
