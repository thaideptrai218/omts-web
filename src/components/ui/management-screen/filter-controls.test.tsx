// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { NumberRangeFilter, formatNumberText } from "./number-range-filter";
import { TimeRangeFilter } from "./time-range-filter";
import { allTime, type TimeRangeValue } from "./time-range-model";

afterEach(cleanup);

function Range({ onFrom }: { onFrom(raw: string): void }) {
  const [from, setFrom] = useState(""), [to, setTo] = useState("");
  return <NumberRangeFilter label="Tổng mua" from={from} to={to} onFromChange={(raw) => { setFrom(raw); onFrom(raw); }} onToChange={setTo} />;
}
function Time({ onChange }: { onChange(value: TimeRangeValue): void }) {
  const [value, setValue] = useState(allTime);
  return <TimeRangeFilter legend="Thời gian mua" value={value} onChange={(next) => { setValue(next); onChange(next); }} />;
}

it("groups digits for display and keeps the raw value, with the prefix still visible", async () => {
  const onFrom = vi.fn();
  render(<Range onFrom={onFrom} />);
  const input = screen.getByLabelText("Tổng mua từ");
  await userEvent.type(input, "1250000");
  expect((input as HTMLInputElement).value).toBe("1.250.000");
  expect(onFrom).toHaveBeenLastCalledWith("1250000");
  expect(screen.getByText("Từ")).toBeTruthy();
  expect(formatNumberText("-1000")).toBe("-1.000");
});

it("applies a preset, and Escape closes the panel and returns focus", async () => {
  const onChange = vi.fn(), user = userEvent.setup();
  render(<Time onChange={onChange} />);
  const trigger = screen.getByRole("button", { name: /Mốc thời gian/ });
  await user.click(trigger);
  expect(screen.getByRole("dialog")).toBeTruthy();
  await user.keyboard("{Escape}");
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(document.activeElement).toBe(trigger);
  await user.click(trigger);
  await user.click(screen.getByRole("button", { name: "Hôm qua" }));
  expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ kind: "preset", preset: "yesterday" }));
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(trigger.textContent).toContain("Hôm qua");
});

it("opens the custom calendar in the portal and cancels without changing the filter", async () => {
  const onChange = vi.fn(), user = userEvent.setup();
  render(<Time onChange={onChange} />);
  await user.click(screen.getByRole("button", { name: /^Tùy chỉnh/ }));
  const dialog = screen.getByRole("dialog");
  expect(dialog.parentElement).toBe(document.body);
  expect(dialog.textContent).toContain("Từ ngày:");
  expect((screen.getByRole("button", { name: "Áp dụng" }) as HTMLButtonElement).disabled).toBe(true);
  await user.click(screen.getByRole("button", { name: "Bỏ qua" }));
  expect(onChange).not.toHaveBeenCalled();
});
