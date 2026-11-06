// @vitest-environment jsdom
import { useState, type ReactNode } from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { VietnameseDateInput } from "./vietnamese-date-input";
vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children }: { children: ReactNode }) => (
    <div role="dialog">{children}</div>
  ),
}));
afterEach(cleanup);
function setup() {
  const change = vi.fn();
  function Host() {
    const [value, setValue] = useState("2026-01-02");
    return (
      <>
        <label htmlFor="date-test">Ngày thử</label>
        <VietnameseDateInput
          id="date-test"
          value={value}
          max="2026-10-28"
          onValueChange={(date) => {
            change(date);
            setValue(date);
          }}
        />
      </>
    );
  }
  render(<Host />);
  return change;
}
it("displays Vietnamese dates but emits the unchanged ISO service value", () => {
  const change = setup();
  const input = screen.getByRole("textbox", {
    name: "Ngày thử",
  }) as HTMLInputElement;
  expect(input.value).toBe("02/01/2026");
  expect(input.placeholder).toBe("ngày/tháng/năm");
  fireEvent.change(input, { target: { value: "28/02/2026" } });
  expect(change).toHaveBeenLastCalledWith("2026-02-28");
});
it("keeps invalid input for the parent form to validate", () => {
  const change = setup();
  const input = screen.getByRole("textbox", {
    name: "Ngày thử",
  }) as HTMLInputElement;
  fireEvent.change(input, { target: { value: "31/02/2026" } });
  expect(change).toHaveBeenLastCalledWith("31/02/2026");
  expect(input.value).toBe("31/02/2026");
});
it("uses Vietnamese picker controls and refuses impossible or out-of-range dates", () => {
  const change = setup();
  fireEvent.click(screen.getByRole("button", { name: "Chọn ngày" }));
  fireEvent.change(screen.getByRole("combobox", { name: "Ngày" }), {
    target: { value: "31" },
  });
  fireEvent.change(screen.getByRole("combobox", { name: "Tháng" }), {
    target: { value: "02" },
  });
  const dialog = within(screen.getByRole("dialog"));
  fireEvent.click(dialog.getByRole("button", { name: "Chọn ngày" }));
  expect(screen.getByRole("alert").textContent).toContain("Ngày không hợp lệ");
  fireEvent.change(screen.getByRole("combobox", { name: "Ngày" }), {
    target: { value: "01" },
  });
  fireEvent.change(screen.getByRole("combobox", { name: "Tháng" }), {
    target: { value: "11" },
  });
  fireEvent.click(dialog.getByRole("button", { name: "Chọn ngày" }));
  expect(screen.getByRole("alert").textContent).toContain(
    "không sau 28/10/2026",
  );
  expect(change).not.toHaveBeenCalled();
});
