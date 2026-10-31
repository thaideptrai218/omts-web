import { describe, expect, it } from "vitest";
import {
  getRegistrationVerificationChannel,
  registrationMethods,
} from "@/features/registration/domain/registration-method";

describe("registration method", () => {
  it("keeps the two SRS registration methods explicit", () => {
    expect(registrationMethods).toEqual(["email", "phone"]);
  });

  it.each([
    ["email", "email"],
    ["phone", "sms"],
  ] as const)("maps %s registration to the %s verification channel", (method, channel) => {
    expect(getRegistrationVerificationChannel(method)).toBe(channel);
  });
});
