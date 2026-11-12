import { describe, expect, it } from "vitest";
import { allocationDrafts, allocationInputs, nurseryDraftNumber } from "./nursery-allocation-draft";
import { validateCompletion, validateCompletionResult } from "./nursery-completion-validation";
import { completionBatch as batch, completionRecipient as recipient } from "./nursery-completion-test-fixtures";

describe("kiểm tra kết quả ươm và số mảnh chuyển sang bè", () => {
  it("kiểm tra bước kết quả độc lập với việc chọn bè", () => {
    expect(validateCompletionResult(batch, "95", "2026-11-13", 1, "2026-11-13")).toBeUndefined();
    expect(validateCompletion(batch, "95", [])).toContain("Chọn ít nhất một bè");
  });
  it("bắt buộc ảnh 1–3 và ngày trong khoảng cho phép", () => {
    for (const count of [0, 4]) expect(validateCompletionResult(batch, "95", "2026-11-13", count, "2026-11-13")).toContain("Ảnh");
    for (const day of ["", "2025-12-31", "2026-11-14"]) expect(validateCompletionResult(batch, "95", day, 1, "2026-11-13")).toContain("Ngày hoàn tất");
  });
  it("phân biệt trống và 0, không biến 95000 thành 95 khi chuyển đổi", () => {
    expect(nurseryDraftNumber("95000")).toBe(95000);
    expect(nurseryDraftNumber("")).toBeNaN();
    expect(nurseryDraftNumber("0")).toBe(0);
    expect(validateCompletion(batch, "", [])).toContain("Sống sót");
    expect(validateCompletion(batch, "0", [])).toBeUndefined();
  });
  it("giữ chuỗi nháp và dấu thập phân, không suy diễn dấu ngăn nghìn", () => {
    const drafts = [{ raftId: "a", quantity: "12,50", targetYieldKg: "" }];
    expect(allocationInputs(drafts)).toEqual([{ raftId: "a", quantity: 12.5 }]);
    expect(drafts[0].quantity).toBe("12,50");
    expect(nurseryDraftNumber("1.250")).toBeNaN();
    expect(nurseryDraftNumber("1e2")).toBeNaN();
    expect(allocationDrafts([{ raftId: "a", quantity: 12.5 }])[0]).toEqual({ raftId: "a", quantity: "12.5", targetYieldKg: "" });
    expect(allocationDrafts([{ raftId: "a", quantity: 12.5, targetYieldKg: null }])[0].targetYieldKg).toBe("");
  });
  it("cho phép mỗi bè nhận một phần tùy chọn khi tổng khớp", () => {
    expect(validateCompletion(batch, "95", [{ raftId: "a", quantity: 20 }, { raftId: "b", quantity: 75, targetYieldKg: 10 }])).toBeUndefined();
    expect(validateCompletion(batch, "95", [{ raftId: "a", quantity: 94.99 }])).toContain("còn thiếu");
    expect(validateCompletion(batch, "95", [{ raftId: "a", quantity: 95.01 }])).toContain("đang thừa");
  });
  it("không nhận ô trống, số 0, sai độ chính xác hoặc bè trùng", () => {
    expect(validateCompletion(batch, "95", allocationInputs([{ raftId: "a", quantity: "", targetYieldKg: "" }]))).toContain("Số mảnh");
    for (const quantity of [0, -1, 95.001]) expect(validateCompletion(batch, "95", [{ raftId: "a", quantity }])).toContain("Số mảnh");
    expect(validateCompletion(batch, "95.001", [])).toContain("Sống sót");
    expect(validateCompletion(batch, "95", [{ raftId: "a", quantity: 45 }, { raftId: "a", quantity: 50 }])).toContain("một lần");
    expect(validateCompletion(batch, "95", [{ raftId: "a", quantity: 95, targetYieldKg: 0 }])).toContain("Sản lượng");
  });
  it("không giảm tổng hoặc từng bè dưới số đã thả", () => {
    const old = { ...batch, survivors: 80, allocations: [recipient] };
    expect(validateCompletion(old, "29", [{ raftId: recipient.raftId, quantity: 29 }])).toContain("không được nhỏ hơn");
    expect(validateCompletion(old, "80", [{ raftId: recipient.raftId, quantity: 29 }, { raftId: "b", quantity: 51 }])).toContain("không được giảm dưới");
    expect(validateCompletion(old, "80", [{ raftId: "b", quantity: 80 }])).toContain("không được giảm dưới");
    expect(validateCompletion(old, "80", [{ raftId: recipient.raftId, quantity: 30 }, { raftId: "b", quantity: 50 }])).toBeUndefined();
  });
  it("giữ nguyên số mảnh và sản lượng của bè đã kết thúc nuôi", () => {
    const old = { ...batch, survivors: 80, allocations: [{ ...recipient, canChange: false }] };
    expect(validateCompletion(old, "80", [{ raftId: recipient.raftId, quantity: 80, targetYieldKg: 20 }])).toBeUndefined();
    expect(validateCompletion(old, "80", [{ raftId: recipient.raftId, quantity: 80, targetYieldKg: 21 }])).toContain("giữ nguyên");
  });
});
