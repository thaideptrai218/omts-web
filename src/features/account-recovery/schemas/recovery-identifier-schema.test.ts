import { describe, expect, it } from "vitest";

import { recoveryIdentifierSchema } from "@/features/account-recovery/schemas/recovery-identifier-schema";

describe("recoveryIdentifierSchema", () => {
  it("validates email syntax when email is selected", () => {
    expect(
      recoveryIdentifierSchema.safeParse({
        channel: "email",
        identifier: "khong-phai-email",
      }).success,
    ).toBe(false);
  });

  it("requires a phone value without inventing an unconfirmed phone format", () => {
    expect(
      recoveryIdentifierSchema.safeParse({ channel: "sms", identifier: "" })
        .success,
    ).toBe(false);
    expect(
      recoveryIdentifierSchema.safeParse({
        channel: "sms",
        identifier: "+84 912 345 678",
      }).success,
    ).toBe(true);
  });
});
