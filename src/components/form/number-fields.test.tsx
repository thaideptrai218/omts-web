// @vitest-environment jsdom
import { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { MoneyField, UnitField } from "./number-fields";

afterEach(cleanup);

function Host({ money = false, numericEcho = false }: { money?: boolean; numericEcho?: boolean }) {
  const [value, setValue] = useState("");
  const props = { label: "Số lượng", value, onChange: (next: string) => setValue(numericEcho ? String(Number(next)) : next) };
  return <>{money ? <MoneyField {...props} max={10000} /> : <UnitField {...props} unit="mảnh" decimals={2} max={10000} />}
    <output aria-label="Giá trị chuẩn">{value}</output></>;
}

describe("Bản nháp ô nhập số dùng chung", () => {
  it.each([false, true])("giữ 95000 khi gõ và xóa từng chữ số, cha chuyển số: %s", async (numericEcho) => {
    render(<Host numericEcho={numericEcho} />);
    const input = screen.getByLabelText("Số lượng") as HTMLInputElement;
    await userEvent.type(input, "95000");
    expect(input.value).toBe("95.000");
    expect(screen.getByRole("alert").textContent).toContain("Tối đa");
    for (const expected of ["9.500", "950", "95", "9", ""]) {
      await userEvent.keyboard("{Backspace}");
      expect(input.value).toBe(expected);
    }
    await userEvent.type(input, "95,50");
    expect(input.value).toBe("95,50");
    expect(screen.getByLabelText("Giá trị chuẩn").textContent).toBe("95.5");
    await userEvent.clear(input);
    await userEvent.tab();
    expect(input.value).toBe("");
  });

  it.each([["95,50", "95,50"], ["95.50", "95,50"], ["1.25", "1,25"], ["0012,00", "0.012,00"]])("giữ phần lẻ của %s khi blur", async (raw, expected) => {
    render(<Host />);
    const input = screen.getByLabelText("Số lượng") as HTMLInputElement;
    await userEvent.type(input, raw);
    expect(input.value).toBe(expected);
    await userEvent.tab();
    expect(input.value).toBe(expected);
  });

  it("không nhảy con trỏ khi chèn hoặc xóa ở giữa", async () => {
    render(<Host />);
    const input = screen.getByLabelText("Số lượng") as HTMLInputElement;
    await userEvent.type(input, "95000");
    input.setSelectionRange(2, 2);
    await userEvent.keyboard("1");
    expect(input.value).toBe("951.000");
    expect(input.selectionStart).toBe(3);
    await userEvent.keyboard("{Backspace}");
    expect(input.value).toBe("95.000");
    expect(input.selectionStart).toBe(2);
  });

  it("nhóm nghìn tiền khi gõ/xóa và giữ nhóm khi focus/blur", async () => {
    render(<Host money numericEcho />);
    const input = screen.getByLabelText("Số lượng") as HTMLInputElement;
    await userEvent.type(input, "95000");
    expect(input.value).toBe("95.000");
    await userEvent.tab();
    expect(input.value).toBe("95.000");
    await userEvent.click(input);
    expect(input.value).toBe("95.000");
    fireEvent.change(input, { target: { value: "9500" } });
    expect(input.value).toBe("9.500");
    await userEvent.clear(input);
    await userEvent.tab();
    expect(input.value).toBe("");
  });

  it("sửa lại số đã nhóm nghìn mà không đổi nghĩa khi xóa", async () => {
    render(<Host />);
    const input = screen.getByLabelText("Số lượng") as HTMLInputElement;
    await userEvent.type(input, "95000");
    await userEvent.tab();
    expect(input.value).toBe("95.000");
    await userEvent.click(input);
    expect(input.value).toBe("95.000");
    await userEvent.keyboard("{End}{Backspace}");
    expect(input.value).toBe("9.500");
    expect(screen.getByLabelText("Giá trị chuẩn").textContent).toBe("9500");
  });

  it("một dấu chấm luôn là thập phân khi gõ", async () => {
    render(<Host />);
    const input = screen.getByLabelText("Số lượng") as HTMLInputElement;
    await userEvent.type(input, "1.250");
    expect(input.value).toBe("1,250");
    expect(screen.getByLabelText("Giá trị chuẩn").textContent).toBe("1.25");
    await userEvent.tab();
    expect(input.value).toBe("1,250");
  });

  it.each([false, true])("giữ bản nháp sai và xử lý dấu cuối theo loại ô, tiền: %s", async (money) => {
    render(<Host money={money} numericEcho />);
    const input = screen.getByLabelText("Số lượng") as HTMLInputElement;
    await userEvent.type(input, "95,");
    expect(input.value).toBe(money ? "95" : "95,");
    await userEvent.keyboard("50");
    expect(input.value).toBe(money ? "9.550" : "95,50");
    await userEvent.clear(input);
    await userEvent.type(input, "abc");
    expect(input.value).toBe("abc");
    await userEvent.tab();
    expect(input.value).toBe("abc");
    expect(input.checkValidity()).toBe(false);
  });
});
