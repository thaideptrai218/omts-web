import { describe, expect, it } from "vitest";
import { digitsOnly, phoneInputValue, validVietnamesePhone } from "./phone-input-rules";

describe("management phone and numeric identifier entry", () => {
  it("keeps leading zeroes, strips pasted punctuation and caps the phone at ten digits", () => {
    expect(phoneInputValue("090 123-45ab67 89")).toBe("0901234567");
    expect(phoneInputValue("")).toBe("");
  });
  it("requires exactly ten domestic digits starting with zero", () => {
    for (const value of ["0901234567", "0123456789"]) expect(validVietnamesePhone(value)).toBe(true);
    for (const value of ["", "9012345678", "090123456", "09012345678", "+84901234567", "090 1234567"]) expect(validVietnamesePhone(value)).toBe(false);
  });
  it("preserves textual citizen and bank identifiers within their own lengths", () => {
    expect(digitsOnly("001-234 5678901", 12)).toBe("001234567890");
    expect(digitsOnly("00ab123456", 20)).toBe("00123456");
  });
});
