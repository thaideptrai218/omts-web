import { describe, expect, it } from "vitest";
import { estimatedLoss, nurseryDraftNumber } from "./nursery-inventory";
import { validateCompletionResult, validateSurvivors } from "./nursery-completion-validation";
import { completionBatch as batch } from "./nursery-completion-test-fixtures";

describe("kiểm tra kết quả hoàn tất ươm", () => {
  it("nhận số sống sót, ngày và ảnh hợp lệ", () => {
    expect(validateCompletionResult(batch, "95", "2026-11-13", 1, "2026-11-13")).toBeUndefined();
  });
  it("bắt buộc ảnh 1–3 và ngày trong khoảng cho phép", () => {
    for (const count of [0, 4]) expect(validateCompletionResult(batch, "95", "2026-11-13", count, "2026-11-13")).toContain("Ảnh");
    for (const day of ["", "2025-12-31", "2026-11-14"]) expect(validateCompletionResult(batch, "95", day, 1, "2026-11-13")).toContain("Ngày hoàn tất");
  });
  it("phân biệt trống và 0, không biến 95000 thành 95", () => {
    expect(nurseryDraftNumber("95000")).toBe(95000);
    expect(nurseryDraftNumber("")).toBeNaN();
    expect(nurseryDraftNumber("0")).toBe(0);
    expect(nurseryDraftNumber("1.250")).toBeNaN();
    expect(validateSurvivors(batch, "")).toContain("Sống sót");
    expect(validateSurvivors(batch, "0")).toBeUndefined();
  });
  it("không nhận số sống sót vượt số vào hoặc sai độ chính xác", () => {
    expect(validateSurvivors(batch, "101")).toContain("Sống sót");
    expect(validateSurvivors(batch, "95.001")).toContain("Sống sót");
  });
  it("khi sửa không cho thấp hơn số đã thả", () => {
    const done = { ...batch, statusId: 4002, survivors: 80, seeded: 30, remaining: 50 };
    expect(validateSurvivors(done, "29")).toContain("không được thấp hơn");
    expect(validateSurvivors(done, "30")).toBeUndefined();
  });
  it("tính hao hụt ước tính và hao hụt khi đóng", () => {
    expect(estimatedLoss(100, 95)).toEqual({ lossPieces: 5, lossPercent: 5, estimated: true });
    expect(estimatedLoss(100, 80, 10).lossPieces).toBe(30);
  });
});
