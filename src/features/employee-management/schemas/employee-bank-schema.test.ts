import { describe, expect, it } from "vitest";
import { employeeBankFields, employeeBankSchema, toEmployeeBankAccount } from "./employee-bank-schema";

const blank = employeeBankFields(null);
const complete = { bankName: "Ngân hàng kiểm thử", accountNumber: "00123456", accountHolderName: "nguyễn văn an" };

describe("employee bank group", () => {
  it("accepts no bank details and normalizes an empty group to null", () => {
    const parsed = employeeBankSchema.parse({ bankName: " ", accountNumber: "", accountHolderName: " " });
    expect(toEmployeeBankAccount(parsed)).toBeNull();
  });

  it.each(["bankName", "accountNumber", "accountHolderName"] as const)("marks missing %s in a partially filled group", (field) => {
    const result = employeeBankSchema.safeParse({ ...complete, [field]: " " });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues.map((issue) => issue.path)).toContainEqual([field]);
  });

  it("reports every missing field when only a bank name is entered", () => {
    const result = employeeBankSchema.safeParse({ ...blank, bankName: complete.bankName });
    if (result.success) throw new Error("Expected incomplete bank");
    expect(result.error.issues.map((issue) => issue.path)).toEqual([["accountNumber"], ["accountHolderName"]]);
  });

  it.each(["12345", "1".repeat(21), "12 3456", "12.3456", "1e1234", "-123456", "１２３４５６"])("rejects non-contract account number %s", (accountNumber) => {
    const result = employeeBankSchema.safeParse({ ...complete, accountNumber });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0]?.path).toEqual(["accountNumber"]);
  });

  it.each(["000001", "0".repeat(20)])("accepts boundary length without dropping leading zeros: %s", (accountNumber) => {
    expect(toEmployeeBankAccount(employeeBankSchema.parse({ ...complete, accountNumber }))?.accountNumber).toBe(accountNumber);
  });

  it.each(["bankName", "accountHolderName"] as const)("rejects %s longer than the backend limit", (field) => {
    expect(employeeBankSchema.safeParse({ ...complete, [field]: "a".repeat(101) }).success).toBe(false);
  });

  it("trims and uppercases the holder without changing the draft or original bank", () => {
    const draft = { ...complete, bankName: ` ${complete.bankName} ` };
    const before = structuredClone(draft);
    const normalized = toEmployeeBankAccount(employeeBankSchema.parse(draft));
    expect(normalized).toEqual({ ...complete, accountHolderName: "NGUYỄN VĂN AN" });
    expect(draft).toEqual(before);
    const values = employeeBankFields(normalized);
    values.accountNumber = "999999";
    expect(normalized?.accountNumber).toBe("00123456");
  });
});
