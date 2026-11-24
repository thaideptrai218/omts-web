"use client";
import { useEffect } from "react";

type Field = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

/** The visible name of a field: its aria-label, else its <label> text without nested controls and the required asterisk. */
export function fieldName(field: Field): string {
  const own = field.getAttribute("aria-label")?.trim();
  if (own) return own;
  const label = field.labels?.[0];
  if (label) {
    const copy = label.cloneNode(true) as HTMLElement;
    copy.querySelectorAll("select, input, textarea, button, ul, [aria-hidden='true']").forEach(node => node.remove());
    const text = copy.textContent?.replace(/[*:]/g, "").replace(/\s+/g, " ").trim();
    if (text) return text;
  }
  return "";
}

/** Vietnamese text for the first failed constraint, or "" when the browser's own message should stay (a custom one is already set, or it is valid). */
export function vietnameseValidationMessage(field: Field): string {
  const { validity } = field;
  if (validity.customError || validity.valid) return "";
  const name = fieldName(field), subject = name ? ` ${name.charAt(0).toLowerCase()}${name.slice(1)}` : "";
  if (validity.valueMissing) {
    if (field instanceof HTMLSelectElement) return `Vui lòng chọn${subject || " một mục trong danh sách"}.`;
    if (field instanceof HTMLInputElement && (field.type === "checkbox" || field.type === "radio")) return `Vui lòng đánh dấu${subject || " lựa chọn này"}.`;
    return `Vui lòng nhập${subject || " thông tin này"}.`;
  }
  if (validity.typeMismatch) return field instanceof HTMLInputElement && field.type === "email" ? "Email chưa đúng định dạng." : "Giá trị chưa đúng định dạng.";
  if (validity.patternMismatch) return "Giá trị chưa đúng định dạng yêu cầu.";
  if (validity.tooShort) return `Cần nhập ít nhất ${field.getAttribute("minlength")} ký tự.`;
  if (validity.tooLong) return `Chỉ được nhập tối đa ${field.getAttribute("maxlength")} ký tự.`;
  if (validity.rangeUnderflow) return `Giá trị phải từ ${field.getAttribute("min")} trở lên.`;
  if (validity.rangeOverflow) return `Giá trị chỉ được đến ${field.getAttribute("max")}.`;
  if (validity.stepMismatch || validity.badInput) return "Giá trị không hợp lệ.";
  return "";
}

/**
 * Browsers word their "required field" bubbles in the browser's own language ("Please select an item in the list."). The `invalid` event does not
 * bubble but can be captured, so one document listener gives every form, shared or not, a Vietnamese message. The message is cleared right after
 * the bubble is built, so it can never go stale when the value is later changed from code.
 */
export function useVietnameseValidationMessages() {
  useEffect(() => {
    const onInvalid = (event: Event) => {
      const field = event.target as Field;
      if (typeof field.setCustomValidity !== "function") return;
      const message = vietnameseValidationMessage(field);
      if (!message) return;
      field.setCustomValidity(message);
      setTimeout(() => field.setCustomValidity(""), 0);
    };
    document.addEventListener("invalid", onInvalid, true);
    return () => document.removeEventListener("invalid", onInvalid, true);
  }, []);
}

/** Mounted once under the root layout. */
export function VietnameseValidationMessages() {
  useVietnameseValidationMessages();
  return null;
}
