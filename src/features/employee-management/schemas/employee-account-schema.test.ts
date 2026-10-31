import { describe, expect, it } from "vitest";
import { employeeAccountSchema } from "./employee-account-schema";

const valid = { fullName: "Lê Thị Lan", phone: "0914555666", email: "", deliveryChannel: "phone" };
describe("employee account contact input", () => {
  it("accepts phone-only or email-only without requiring both", () => {
    expect(employeeAccountSchema.safeParse(valid).success).toBe(true);
    expect(employeeAccountSchema.safeParse({ ...valid, phone: "", email: "lan@omts.test", deliveryChannel: "email" }).success).toBe(true);
  });
  it.each([
    { fullName: "" }, { fullName: "a".repeat(201) }, { phone: "abc" },
    { phone: "", email: "" }, { email: "not-email" }, { phone: "", email: "lan@omts.test", deliveryChannel: "phone" },
  ])("rejects invalid contacts %o", (overrides) => {
    expect(employeeAccountSchema.safeParse({ ...valid, ...overrides }).success).toBe(false);
  });
  it("drops unrequested identity/security properties", () => {
    expect(employeeAccountSchema.parse({ ...valid, username: "injected", password: crypto.randomUUID(), accountType: "system-administrator" })).toEqual(valid);
  });
});
