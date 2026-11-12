// @vitest-environment jsdom
import { useState } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { MoneyField, UnitField } from "./number-fields";

afterEach(cleanup);

function Host({ money = false }: { money?: boolean }) {
  const [value, setValue] = useState("");
  const props = { label: "Số nhập", value, onChange: setValue, max: 10000 };
  return <>{money ? <MoneyField {...props} /> : <UnitField {...props} decimals={3} unit="kg" />}
    <output aria-label="Giá trị chuẩn">{value}</output></>;
}

const input = () => screen.getByLabelText("Số nhập") as HTMLInputElement;
const machine = () => screen.getByLabelText("Giá trị chuẩn").textContent;

describe("sửa ô số đã nhóm nghìn", () => {
  it.each([false, true])("không kẹt Backspace/Delete sát dấu nhóm, tiền: %s", async (money) => {
    render(<Host money={money} />);
    await userEvent.type(input(), "95000");
    input().setSelectionRange(3, 3);
    await userEvent.keyboard("{Backspace}");
    expect(input().value).toBe("9.000");
    expect(input().selectionStart).toBe(1);
    expect(machine()).toBe("9000");
    await userEvent.clear(input());
    await userEvent.type(input(), "95000");
    input().setSelectionRange(2, 2);
    await userEvent.keyboard("{Delete}");
    expect(input().value).toBe("9.500");
    expect(input().selectionStart).toBe(3);
    expect(machine()).toBe("9500");
  });

  it.each([false, true])("thay vùng chọn ở giữa giữ con trỏ và gửi số chuẩn, tiền: %s", async (money) => {
    render(<Host money={money} />);
    await userEvent.type(input(), "1234567");
    expect(input().value).toBe("1.234.567");
    input().setSelectionRange(2, 5);
    await userEvent.keyboard("9");
    expect(input().value).toBe("19.567");
    expect(input().selectionStart).toBe(2);
    expect(machine()).toBe("19567");
  });

  it.each([false, true])("dán số dài, vượt max chỉ báo lỗi, tiền: %s", async (money) => {
    const user = userEvent.setup();
    render(<Host money={money} />);
    await user.click(input());
    await user.paste(money ? "1,234,567.89" : "1234567,89");
    const expected = money ? "123.456.789" : "1.234.567,89";
    expect(input().value).toBe(expected);
    expect(input().selectionStart).toBe(expected.length);
    expect(machine()).toBe(money ? "123456789" : "1234567.89");
    expect(screen.getByRole("alert").textContent).toContain("Tối đa");
    await user.tab();
    expect(input().value).toBe(expected);
    await user.clear(input());
    expect(input().value).toBe("");
    expect(machine()).toBe("");
  });

  it("dán chữ số giữa số đã nhóm không biến dấu nhóm cũ thành phần lẻ", async () => {
    const user = userEvent.setup();
    render(<Host />);
    await user.type(input(), "95000");
    input().setSelectionRange(2, 2);
    await user.paste("12");
    expect(input().value).toBe("9.512.000");
    expect(input().selectionStart).toBe(5);
    expect(machine()).toBe("9512000");
  });

  it.each([",", "."])("thêm dấu %s sau số đã nhóm mở phần lẻ", async (mark) => {
    render(<Host />);
    await userEvent.type(input(), "95000" + mark);
    expect(input().value).toBe("95.000,");
    expect(input().selectionStart).toBe(7);
    await userEvent.keyboard("500");
    expect(input().value).toBe("95.000,500");
    expect(machine()).toBe("95000.5");
    await userEvent.tab();
    expect(input().value).toBe("95.000,500");
  });

  it("blur chỉ bỏ dấu phẩy cuối, không thêm phần lẻ", async () => {
    render(<Host />);
    await userEvent.type(input(), "95000,");
    expect(machine()).toBe("95000");
    await userEvent.tab();
    expect(input().value).toBe("95.000");
    await userEvent.click(input());
    expect(input().value).toBe("95.000");
  });

  it("tiền bỏ dấu chấm/phẩy mà không mất chữ số", async () => {
    render(<Host money />);
    await userEvent.type(input(), "12,5.0");
    expect(input().value).toBe("1.250");
    expect(machine()).toBe("1250");
    expect(input().selectionStart).toBe(5);
  });

  it.each([",", "."])("chèn dấu %s trước dấu nhóm vẫn giữ phần lẻ và con trỏ", async (mark) => {
    render(<Host />);
    await userEvent.type(input(), "95000");
    input().setSelectionRange(2, 2);
    await userEvent.keyboard(mark);
    expect(input().value).toBe("95,000");
    expect(input().selectionStart).toBe(3);
    expect(machine()).toBe("95");
    await userEvent.keyboard("{Backspace}");
    expect(input().value).toBe("95.000");
    expect(input().selectionStart).toBe(2);
    expect(machine()).toBe("95000");
  });

  it("tiền không tự bỏ số 0 ở đầu khi blur", async () => {
    render(<Host money />);
    await userEvent.type(input(), "0000");
    expect(input().value).toBe("0.000");
    await userEvent.tab();
    expect(input().value).toBe("0.000");
    expect(machine()).toBe("0");
  });
});
