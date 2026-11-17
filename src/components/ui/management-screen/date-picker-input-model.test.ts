import { describe, expect, it } from "vitest";
import { maskDateInput, parseDateInput } from "./date-picker-input-model";

describe("typed date validation", () => {
  it("masks pasted digits and caps the date at eight digits", () => {
    expect(maskDateInput("12a112026999")).toBe("12/11/2026");
    expect(maskDateInput("121")).toBe("12/1");
    expect(maskDateInput("")).toBe("");
  });
  it("rejects overflow and accepts leap days only in leap years", () => {
    expect(parseDateInput("31/04/2026").error).toBeTruthy();
    expect(parseDateInput("29/02/2025").error).toBeTruthy();
    expect(parseDateInput("29/02/2024").value).toBe("2024-02-29");
    expect(parseDateInput("01/01/0000").error).toBeTruthy();
  });
  it("validates complete input and inclusive date limits", () => {
    expect(parseDateInput("1/1/2026").error).toBeTruthy();
    expect(parseDateInput("12/11/2026", "2026-11-12", "2026-11-12").value).toBe("2026-11-12");
    expect(parseDateInput("11/11/2026", "2026-11-12").error).toBeTruthy();
    expect(parseDateInput("13/11/2026", undefined, "2026-11-12").error).toBeTruthy();
  });
});
