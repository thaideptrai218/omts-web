import { describe, expect, it } from "vitest";
import { sizeFigure, sizeText } from "./product-size";

describe("product size wording", () => {
  it("shows a range and a single average with the approximate wording", () => {
    expect(sizeFigure(8, 12)).toBe("8–12 cm");
    expect(sizeFigure(5, null)).toBe("~5 cm");
    expect(sizeFigure(2.5, 2.5)).toBe("~2,5 cm");
    expect(sizeText(8, 12)).toBe("Cỡ trung bình khoảng 8–12 cm");
    expect(sizeText(5, null)).toBe("Cỡ trung bình khoảng 5 cm");
    expect(sizeText(null, null)).toBeNull();
  });
});
