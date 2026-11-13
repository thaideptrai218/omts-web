import { describe, expect, it } from "vitest";
import { nurseryDisplayText } from "./nursery-display-text";

describe("nursery legacy copy", () => {
  it.each([
    "Phân bổ của chu kỳ đã chốt không thể thay đổi.",
    "Bè đã có chu kỳ đang mở. Hãy chọn bè khác.",
    "Đợt chưa hoàn tất nên không thể điều chỉnh phân bổ.",
    "Ngày hoàn tất phải sau ngày chốt chu kỳ trước của bè.",
    "Tạo chu kỳ và chuyển phân bổ giữa các bè.",
  ])("does not suggest obsolete transfers from %s", text => {
    expect(nurseryDisplayText(text)).not.toMatch(/phân bổ|chuyển sang bè|chuyển lại số mảnh/i);
  });
  it("preserves ordinary content and empty error state", () => {
    expect(nurseryDisplayText(undefined)).toBeUndefined();
    expect(nurseryDisplayText("Vùng KV01 · Sống sót (ước tính): 900 mảnh")).toBe("Vùng KV01 · Sống sót (ước tính): 900 mảnh");
    expect(nurseryDisplayText("Bắt đầu chu kỳ nuôi")).toBe("Bắt đầu chu kỳ nuôi");
  });
});
