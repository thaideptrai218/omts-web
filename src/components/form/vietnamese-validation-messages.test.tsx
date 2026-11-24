// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { VietnameseValidationMessages, fieldName } from "./vietnamese-validation-messages";

afterEach(cleanup);

/** Submits the form the way a click on Save does and returns the message the browser would show for the first invalid field. */
function messageAfterInvalid(field: HTMLElement) {
  let shown = "";
  field.addEventListener("invalid", () => { shown = (field as HTMLInputElement).validationMessage; });
  field.dispatchEvent(new Event("invalid", { cancelable: true }));
  return shown;
}

describe("Vietnamese validation messages", () => {
  it("words an empty required select and input in Vietnamese using their labels", () => {
    const { getByLabelText } = render(<form noValidate>
      <VietnameseValidationMessages />
      <label>Loại chi<select required><option value="">Chọn loại</option><option value="a">A</option></select></label>
      <label>Họ và tên *<input required defaultValue="" /></label>
    </form>);
    const select = getByLabelText("Loại chi") as HTMLSelectElement, input = getByLabelText(/Họ và tên/) as HTMLInputElement;
    expect(messageAfterInvalid(select)).toBe("Vui lòng chọn loại chi.");
    expect(messageAfterInvalid(input)).toBe("Vui lòng nhập họ và tên.");
  });

  it("prefers aria-label and clears the message again so it cannot go stale", () => {
    vi.useFakeTimers();
    const { getByLabelText } = render(<form><VietnameseValidationMessages /><select aria-label="Hàng xuất" required><option value="">-</option></select></form>);
    const select = getByLabelText("Hàng xuất") as HTMLSelectElement;
    expect(fieldName(select)).toBe("Hàng xuất");
    expect(messageAfterInvalid(select)).toBe("Vui lòng chọn hàng xuất.");
    vi.runAllTimers();
    expect(select.validationMessage).not.toBe("Vui lòng chọn hàng xuất.");
    vi.useRealTimers();
  });

  it("leaves a message the field already set itself alone", () => {
    const { getByLabelText } = render(<form><VietnameseValidationMessages /><input aria-label="Ngày" required /></form>);
    const input = getByLabelText("Ngày") as HTMLInputElement;
    input.setCustomValidity("Ngày không hợp lệ.");
    expect(messageAfterInvalid(input)).toBe("Ngày không hợp lệ.");
  });
});
