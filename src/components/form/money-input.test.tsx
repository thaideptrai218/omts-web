// @vitest-environment jsdom
import { useState } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MoneyInput, type MoneyInputProps } from "./money-input";
import { formatVndWithSymbol, parseMoneyText } from "./money-text";

afterEach(cleanup);

describe("parseMoneyText", () => {
  it.each([
    ["300k", 300000], ["300 k", 300000], ["300 nghìn", 300000], ["300 ngàn", 300000],
    ["2tr", 2000000], ["2 triệu", 2000000], ["1,5tr", 1500000], ["1.5tr", 1500000],
    ["1 tỷ", 1000000000], ["1.250.000", 1250000], ["1250000", 1250000], ["300", 300],
  ])("reads %s", (text, value) => {
    expect(parseMoneyText(text)).toMatchObject({ kind: "ok", value });
  });
  it("applies thousands only to 1..999 when asked", () => {
    expect(parseMoneyText("300", true)).toEqual({ kind: "ok", value: 300000, scaled: "auto" });
    expect(parseMoneyText("1000", true)).toMatchObject({ value: 1000, scaled: null });
    expect(parseMoneyText("0", true)).toMatchObject({ value: 0 });
  });
  it("rejects text that is not an amount", () => {
    expect(parseMoneyText("abc").kind).toBe("invalid");
    expect(parseMoneyText("12,5").kind).toBe("invalid");
    expect(parseMoneyText("  ").kind).toBe("empty");
  });
  it("formats with the symbol", () => expect(formatVndWithSymbol(1250000)).toBe("1.250.000 ₫"));
});

function Host(props: Partial<MoneyInputProps> & { onValue?(value: number | null): void }) {
  const [value, setValue] = useState<number | null>(props.value ?? null);
  return (
    <>
      <label htmlFor="amount">Số tiền</label>
      <MoneyInput {...props} id="amount" value={value} onChange={(next) => { setValue(next); props.onValue?.(next); }} />
    </>
  );
}

describe("MoneyInput", () => {
  it("groups digits while typing and always shows the ₫ suffix", async () => {
    const onValue = vi.fn();
    render(<Host onValue={onValue} />);
    const input = screen.getByLabelText("Số tiền") as HTMLInputElement;
    await userEvent.type(input, "1250000");
    expect(input.value).toBe("1.250.000");
    expect(onValue).toHaveBeenLastCalledWith(1250000);
    expect(screen.getByText("₫")).toBeTruthy();
    await userEvent.tab();
    expect(input.value).toBe("1.250.000");
  });

  it("expands 300k and 2tr on blur", async () => {
    render(<Host />);
    const input = screen.getByLabelText("Số tiền") as HTMLInputElement;
    await userEvent.type(input, "300k");
    expect(input.value).toBe("300k");
    await userEvent.tab();
    expect(input.value).toBe("300.000");
    await userEvent.clear(input);
    await userEvent.type(input, "1,5tr{Enter}");
    expect(input.value).toBe("1,5tr");
    await userEvent.tab();
    expect(input.value).toBe("1.500.000");
  });

  it("keeps plain digits literal unless autoThousands is on", async () => {
    const onValue = vi.fn();
    const { unmount } = render(<Host onValue={onValue} />);
    await userEvent.type(screen.getByLabelText("Số tiền"), "300");
    expect(onValue).toHaveBeenLastCalledWith(300);
    unmount();
    const auto = vi.fn();
    render(<Host autoThousands onValue={auto} />);
    const input = screen.getByLabelText("Số tiền") as HTMLInputElement;
    await userEvent.type(input, "300");
    expect(auto).toHaveBeenLastCalledWith(300000);
    expect(screen.getByText("Hiểu là 300.000 ₫ (nghìn đồng)")).toBeTruthy();
    await userEvent.tab();
    expect(input.value).toBe("300.000");
    expect(screen.queryByText(/Hiểu là/)).toBeNull();
  });

  it("shows min/max errors and the amount in words", async () => {
    render(<Host min={1000} max={5000000} showWords />);
    const input = screen.getByLabelText("Số tiền") as HTMLInputElement;
    await userEvent.type(input, "300000");
    expect(screen.getByText("ba trăm nghìn đồng")).toBeTruthy();
    await userEvent.clear(input);
    await userEvent.type(input, "9000000");
    expect(screen.getByRole("alert").textContent).toBe("Tối đa 5.000.000 ₫.");
    expect(input.getAttribute("aria-invalid")).toBe("true");
    await userEvent.clear(input);
    await userEvent.type(input, "500");
    await userEvent.tab();
    expect(screen.getByRole("alert").textContent).toBe("Tối thiểu 1.000 ₫.");
  });

  it("follows an external value change and emits null when cleared", async () => {
    const onValue = vi.fn();
    render(<Host value={42000} onValue={onValue} />);
    const input = screen.getByLabelText("Số tiền") as HTMLInputElement;
    expect(input.value).toBe("42.000");
    await userEvent.clear(input);
    expect(onValue).toHaveBeenLastCalledWith(null);
  });

  it("does not scale a saved amount simply on focus or blur", async () => {
    const onValue = vi.fn();
    render(<Host value={300} autoThousands onValue={onValue} />);
    const input = screen.getByLabelText("Số tiền") as HTMLInputElement;
    await userEvent.click(input);
    expect(input.value).toBe("300");
    await userEvent.tab();
    expect(input.value).toBe("300");
    expect(onValue).not.toHaveBeenCalled();
  });
});
