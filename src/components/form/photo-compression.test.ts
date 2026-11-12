import { describe, expect, it } from "vitest";
import { compressedPhotoDimensions, photoValidationMessage } from "./photo-compression";

describe("compressedPhotoDimensions", () => {
  it("keeps small photos unchanged", () => {
    expect(compressedPhotoDimensions(800, 600)).toEqual({ width: 800, height: 600 });
  });
  it("scales the long edge down to 1600 px and keeps the ratio", () => {
    expect(compressedPhotoDimensions(4000, 3000)).toEqual({ width: 1600, height: 1200 });
    expect(compressedPhotoDimensions(3000, 6000)).toEqual({ width: 800, height: 1600 });
  });
  it("never returns a zero edge for extreme ratios", () => {
    expect(compressedPhotoDimensions(100_000, 10)).toEqual({ width: 1600, height: 1 });
  });
  it("rejects unusable sizes", () => {
    expect(() => compressedPhotoDimensions(0, 100)).toThrow("Kích thước ảnh không hợp lệ.");
    expect(() => compressedPhotoDimensions(Number.NaN, 100)).toThrow();
  });
});

describe("photoValidationMessage", () => {
  it("accepts 1 to 3 photos when required", () => {
    for (const count of [1, 2, 3]) expect(photoValidationMessage(count)).toBeUndefined();
  });
  it("names the chosen count when required photos are missing or too many", () => {
    expect(photoValidationMessage(0)).toBe("Đã chọn 0 ảnh; cần từ 1 đến 3 ảnh.");
    expect(photoValidationMessage(4)).toBe("Đã chọn 4 ảnh; cần từ 1 đến 3 ảnh.");
  });
  it("allows zero optional photos but still caps at 3", () => {
    expect(photoValidationMessage(0, false)).toBeUndefined();
    expect(photoValidationMessage(4, false)).toBe("Đã chọn 4 ảnh; chỉ được tối đa 3 ảnh.");
  });
});
