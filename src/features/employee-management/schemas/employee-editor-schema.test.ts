import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { employeeEditorSchema } from "@/features/employee-management/schemas/employee-editor-schema";

const validEmployee = {
  accountId: "",
  address: "",
  area: "",
  birthday: "",
  fullName: "Nguyễn Văn An",
  notes: "",
  otherInformation: "",
  phone: "0901234567",
  status: "employed",
  wardCommune: "",
  workingZoneIds: [],
  bankAccount: { bankName: "", accountNumber: "", accountHolderName: "" },
} as const;

describe("employeeEditorSchema", () => {
  it("accepts the two required identity fields and optional account", () => {
    expect(employeeEditorSchema.safeParse(validEmployee).success).toBe(true);
  });

  it.each(["fullName", "phone"] as const)(
    "rejects a missing %s",
    (field) => {
      const result = employeeEditorSchema.safeParse({
        ...validEmployee,
        [field]: "   ",
      });

      expect(result.success).toBe(false);
      if (!result.success) expect(result.error.issues[0]?.path).toEqual([field]);
    },
  );

  it("accepts both confirmed employee statuses", () => {
    expect(
      employeeEditorSchema.safeParse({ ...validEmployee, status: "left" }).success,
    ).toBe(true);
  });
});

describe("employee personal data follows LAB-01", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-28T10:00:00Z"));
  });
  afterEach(() => vi.useRealTimers());

  const textLimits = [
    ["fullName", 100], ["address", 500], ["area", 100],
    ["wardCommune", 100], ["otherInformation", 1000], ["notes", 1000],
  ] as const;
  it.each(textLimits)("accepts the trimmed limit for %s", (field, limit) => {
    const result = employeeEditorSchema.safeParse({ ...validEmployee, [field]: `  ${"á".repeat(limit)}  ` });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data[field]).toBe("á".repeat(limit));
  });
  it.each(textLimits)("rejects one character over the limit for %s", (field, limit) => {
    const result = employeeEditorSchema.safeParse({ ...validEmployee, [field]: "á".repeat(limit + 1) });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0].path).toEqual([field]);
  });
  it.each(["", "2026-10-28", "2024-02-29"])("accepts optional or past birthday %s", (birthday) => {
    expect(employeeEditorSchema.safeParse({ ...validEmployee, birthday }).success).toBe(true);
  });
  it.each(["2026-10-29", "2026-02-30", "0000-01-01", "28/10/2026", "2026-10-28T00:00:00Z"])("rejects invalid or future birthday %s", (birthday) => {
    const result = employeeEditorSchema.safeParse({ ...validEmployee, birthday });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0].path).toEqual(["birthday"]);
  });
  it("uses Vietnam's current date when the form stays open across midnight", () => {
    vi.setSystemTime(new Date("2026-10-28T16:59:59Z"));
    expect(employeeEditorSchema.safeParse({ ...validEmployee, birthday: "2026-10-29" }).success).toBe(false);
    vi.setSystemTime(new Date("2026-10-28T17:00:00Z"));
    expect(employeeEditorSchema.safeParse({ ...validEmployee, birthday: "2026-10-29" }).success).toBe(true);
  });
  it.each(["0901234567", "+84 901 234 567", "84.901.234.567", "(090)-123-4567"])("accepts supported phone input without rewriting its draft %s", (phone) => {
    const result = employeeEditorSchema.safeParse({ ...validEmployee, phone });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.phone).toBe(phone);
  });
  it.each(["abc", "090123456", "09012345678", "+1 901234567", "0901234567x", "１２３４５６７８９０"])("rejects unsupported phone %s", (phone) => {
    const result = employeeEditorSchema.safeParse({ ...validEmployee, phone });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0].path).toEqual(["phone"]);
  });
});
