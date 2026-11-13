import { describe, expect, it } from "vitest";
import { deleteNumberGroup, formatNumberEdit, groupNumberText, groupedNumberCaret, ungroupNumberText } from "./grouped-number-text";
import { updateMoneyShortcutDraft } from "./money-shortcut-draft";

describe("nhóm nghìn và con trỏ", () => {
  it.each([
    ["95000", ["9", "95", "950", "9.500", "95.000"]],
    ["1250000", ["1", "12", "125", "1.250", "12.500", "125.000", "1.250.000"]],
    ["0,5", ["0", "0,", "0,5"]],
    ["1234,567", ["1", "12", "123", "1.234", "1.234,", "1.234,5", "1.234,56", "1.234,567"]],
  ])("gõ rồi xóa từng ký tự %s", (typed, expected) => {
    let text = "";
    for (const [index, char] of [...typed].entries()) {
      const edit = formatNumberEdit(text, text + char, text.length + 1, text.length + 1, 3);
      expect(edit).toEqual({ text: expected[index], start: expected[index].length, end: expected[index].length });
      text = edit.text;
    }
    for (const previous of [...expected].reverse().slice(1).concat("")) {
      const incoming = text.slice(0, -1);
      const edit = formatNumberEdit(text, incoming, incoming.length, incoming.length, 3);
      expect(edit).toEqual({ text: previous, start: previous.length, end: previous.length });
      text = edit.text;
    }
  });

  it.each([
    ["1234567,89", "1.234.567,89"], ["1234.567", "1.234,567"],
    ["1.234.567,8900", "1.234.567,8900"], ["95,", "95,"], ["0000,00", "0.000,00"], ["", ""],
  ])("dán %s mà không thêm/cắt chữ số", (incoming, text) => {
    expect(formatNumberEdit("", incoming, incoming.length, incoming.length, 3)).toEqual({ text, start: text.length, end: text.length });
  });

  it("nhóm/gỡ nhóm giữ nguyên phần lẻ và số 0", () => {
    expect(groupNumberText("1234567,8900", 2)).toBe("1.234.567,8900");
    expect(ungroupNumberText("1.234.567,8900")).toBe("1234567.8900");
    expect(ungroupNumberText("95,")).toBe("95.");
    expect(groupNumberText("95.000,50", 0)).toBe("9.500.050");
    expect(groupNumberText("abc", 2)).toBe("abc");
  });

  it("giữ con trỏ và vùng chọn theo chữ số hai bên dấu nhóm", () => {
    expect(groupedNumberCaret("951000", "951.000", 3)).toBe(3);
    expect(groupedNumberCaret("95000", "95.000", 3)).toBe(4);
    expect(formatNumberEdit("95.000", "951.000", 3, 6, 2)).toEqual({ text: "951.000", start: 3, end: 6 });
    expect(groupedNumberCaret("95,", "95,", 3)).toBe(3);
    expect(groupedNumberCaret("", "", 0)).toBe(0);
    expect(formatNumberEdit("95.000", "9512.000", 4, 4, 2)).toEqual({ text: "9.512.000", start: 5, end: 5 });
    expect(formatNumberEdit("95.000", "95..000", 3, 3, 2)).toEqual({ text: "95,000", start: 3, end: 3 });
    expect(formatNumberEdit("95.000", "95,.000", 3, 3, 2)).toEqual({ text: "95,000", start: 3, end: 3 });
  });

  it.each([["Backspace", 3, "9.000", 1], ["Delete", 2, "9.500", 3]])("%s qua dấu chấm xóa chữ số kề bên", (key, position, text, caret) => {
    const removed = deleteNumberGroup("95.000", position as number, position as number, key as string)!;
    expect(formatNumberEdit("95.000", removed.text, removed.start, removed.end, 2)).toEqual({ text, start: caret, end: caret });
    expect(deleteNumberGroup("95.000", 1, 3, key as string)).toBeNull();
  });

  it("giữ dấu thập phân riêng cho hậu tố tiền gõ sau đó", () => {
    expect(updateMoneyShortcutDraft("1", "1", "1,")).toBe("1,");
    expect(updateMoneyShortcutDraft("1", "1,", "15")).toBe("1,5");
    expect(updateMoneyShortcutDraft("15", "1,5", "15t")).toBe("1,5t");
    expect(updateMoneyShortcutDraft("1,5t", "1,5t", "1,5tr")).toBe("1,5tr");
  });
});
