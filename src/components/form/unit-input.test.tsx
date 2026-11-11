// @vitest-environment jsdom
import { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { formatDecimal, parseDecimalText } from "./decimal-text";
import { UnitInput, type UnitInputProps } from "./unit-input";

afterEach(cleanup);

describe("decimal text", () => {
  it.each([
    ["0,5", 3, 0.5], ["0.5", 3, 0.5], ["1.250,5", 3, 1250.5], ["1,250.5", 3, 1250.5],
    ["1.250", 0, 1250], ["1.250.000", 0, 1250000], ["12", 0, 12], ["2,125", 3, 2.125],
  ])("parses %s", (text, decimals, value) => {
    expect(parseDecimalText(text, decimals)).toEqual({ kind: "ok", value });
  });
  it("rejects fractions for whole numbers and garbage", () => {
    expect(parseDecimalText("0,5", 0).kind).toBe("invalid");
    expect(parseDecimalText("1,2,3", 2).kind).toBe("invalid");
    expect(parseDecimalText("abc", 2).kind).toBe("invalid");
  });
  it("formats with vi-VN marks", () => {
    expect(formatDecimal(1250.5, 3)).toBe("1.250,5");
    expect(formatDecimal(3, 2)).toBe("3");
  });
});

function Host(props: Partial<UnitInputProps> & { onValue?(value: number | null): void }) {
  const [value, setValue] = useState<number | null>(props.value ?? null);
  return (
    <>
      <label htmlFor="qty">Số lượng</label>
      <UnitInput unit="kg" {...props} id="qty" value={value} onChange={(next) => { setValue(next); props.onValue?.(next); }} />
    </>
  );
}

describe("UnitInput", () => {
  it("shows the unit chip and accepts 0,5 and 0.5", async () => {
    const onValue = vi.fn();
    render(<Host decimals={3} onValue={onValue} />);
    const input = screen.getByLabelText("Số lượng") as HTMLInputElement;
    expect(screen.getByText("kg")).toBeTruthy();
    await userEvent.type(input, "0,5");
    expect(onValue).toHaveBeenLastCalledWith(0.5);
    await userEvent.clear(input);
    await userEvent.type(input, "0.25");
    await userEvent.tab();
    expect(input.value).toBe("0,25");
    expect(onValue).toHaveBeenLastCalledWith(0.25);
  });

  it("groups thousands and caps the fraction digits", async () => {
    render(<Host decimals={2} />);
    const input = screen.getByLabelText("Số lượng") as HTMLInputElement;
    await userEvent.type(input, "12500,987");
    expect(input.value).toBe("12.500,98");
  });

  it("steps with arrow keys and clamps to min/max", async () => {
    const onValue = vi.fn();
    render(<Host unit="lồng" step={0.5} decimals={1} min={0} max={1} value={0.5} onValue={onValue} />);
    const input = screen.getByLabelText("Số lượng") as HTMLInputElement;
    input.focus();
    await userEvent.keyboard("{ArrowUp}");
    expect(onValue).toHaveBeenLastCalledWith(1);
    await userEvent.keyboard("{ArrowUp}");
    expect(onValue).toHaveBeenLastCalledWith(1);
    await userEvent.keyboard("{ArrowDown}{ArrowDown}{ArrowDown}");
    expect(onValue).toHaveBeenLastCalledWith(0);
    expect(input.value).toBe("0");
  });

  it("ignores the mouse wheel and reports out-of-range values", async () => {
    const onValue = vi.fn();
    render(<Host max={100} unit="%" value={50} onValue={onValue} hint="Tối đa theo hợp đồng" />);
    const input = screen.getByLabelText("Số lượng") as HTMLInputElement;
    fireEvent.wheel(input, { deltaY: -100 });
    expect(onValue).not.toHaveBeenCalled();
    expect(input.getAttribute("aria-describedby")).toContain("hint");
    await userEvent.clear(input);
    await userEvent.type(input, "150");
    expect(screen.getByRole("alert").textContent).toBe("Tối đa 100 %.");
    expect(input.getAttribute("aria-invalid")).toBe("true");
  });
});
