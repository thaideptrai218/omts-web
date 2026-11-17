import { describe, expect, it } from "vitest";
import { nurseryQuantityValue } from "./nursery-quantity-value";

describe("nursery quantity at submit", () => {
  it("accepts a decimal comma or point without interpreting digits as thousands", () => {
    expect(nurseryQuantityValue("95000")).toBe(95000);
    expect(nurseryQuantityValue("95,00")).toBe(95);
    expect(nurseryQuantityValue("95.50")).toBe(95.5);
    expect(nurseryQuantityValue("95,")).toBe(95);
  });
  it("leaves invalid text invalid for the form finite-number check", () => {
    expect(Number.isFinite(nurseryQuantityValue("abc"))).toBe(false);
    expect(Number.isFinite(nurseryQuantityValue("95,0.0"))).toBe(false);
    expect(Number.isFinite(nurseryQuantityValue("1.234"))).toBe(false);
    expect(Number.isFinite(nurseryQuantityValue("1e3"))).toBe(false);
    expect(Number.isFinite(nurseryQuantityValue(""))).toBe(false);
  });
});
