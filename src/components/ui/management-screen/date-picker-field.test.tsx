// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { DatePickerField } from "./date-picker-field";

afterEach(() => { cleanup(); vi.restoreAllMocks(); });
describe("floating date field", () => {
  it("opens a top-layer panel within its modal without submitting the form", () => {
    const submit = vi.fn();
    function Form() {
      const [value, setValue] = useState("2026-11-11");
      return <dialog open><form onSubmit={event => { event.preventDefault(); submit(); }}><DatePickerField label="Ngày ghi" value={value} onChange={setValue} /></form></dialog>;
    }
    render(<Form />);
    const modal = document.querySelector("dialog")!;
    fireEvent.click(screen.getByRole("button", { name: /Ngày ghi:/ }));
    expect(within(modal).getByRole("dialog", { name: "Ngày ghi" }).getAttribute("popover")).toBe("manual");
    fireEvent.click(within(modal).getByRole("button", { name: "Hôm nay" }));
    expect(submit).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog", { name: "Ngày ghi" })).toBeNull();
  });
  it("respects minimum and maximum dates without changing existing popover callers", () => {
    const change = vi.fn();
    render(<DatePickerField label="Ngày ghi" value="2026-11-11" min="2026-11-10" max="2026-11-12" onChange={change} />);
    fireEvent.click(screen.getByRole("button", { name: /Ngày ghi:/ }));
    expect(screen.getByRole("dialog", { name: "Ngày ghi" })).toBeTruthy();
    const blocked = document.querySelector<HTMLButtonElement>('[data-day="2026-11-09"] button');
    expect(blocked?.disabled).toBe(true);
    fireEvent.click(blocked!);
    expect(change).not.toHaveBeenCalled();
  });
  it("can clear an optional date without submitting", () => {
    const change = vi.fn();
    render(<DatePickerField allowClear label="Ngày thu dự kiến" value="2026-11-11" onChange={change} />);
    fireEvent.click(screen.getByRole("button", { name: /Ngày thu dự kiến:/ }));
    fireEvent.click(screen.getByRole("button", { name: "Xóa" }));
    expect(change).toHaveBeenCalledWith("");
  });
  it("uses the parent's latest time after a draft is replaced", () => {
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", { configurable: true, value: vi.fn() });
    const change = vi.fn();
    const view = render(<DatePickerField withTime label="Thời điểm đo" value="2026-11-11T08:15" onChange={change} />);
    view.rerender(<DatePickerField withTime label="Thời điểm đo" value="2026-11-11T12:30" onChange={change} />);
    fireEvent.click(screen.getByRole("button", { name: /Thời điểm đo:/ }));
    fireEvent.click(document.querySelector<HTMLButtonElement>('[data-day="2026-11-12"] button')!);
    expect(change).toHaveBeenCalledWith("2026-11-12T12:30");
  });
  it("lets an optional date remain empty and clears typed dates", () => {
    const change = vi.fn();
    function OptionalDate() {
      const [value, setValue] = useState("");
      return <DatePickerField allowClear label="Ngày sinh" value={value} onChange={next => { setValue(next); change(next); }} />;
    }
    render(<OptionalDate />);
    const input = screen.getByRole("textbox", { name: "Ngày sinh" }) as HTMLInputElement;
    fireEvent.blur(input);
    expect(input.validity.valid).toBe(true);
    expect(screen.queryByRole("alert")).toBeNull();
    fireEvent.change(input, { target: { value: "12112026" } });
    expect(change).toHaveBeenCalledWith("2026-11-12");
    fireEvent.change(input, { target: { value: "" } });
    expect(change).toHaveBeenCalledWith("");
  });
  it("opens with ArrowDown and returns focus on Escape", () => {
    render(<DatePickerField label="Ngày ghi" value="2026-11-11" onChange={vi.fn()} />);
    const input = screen.getByRole("textbox", { name: "Ngày ghi" });
    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(screen.getByRole("dialog", { name: "Ngày ghi" })).toBeTruthy();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: "Ngày ghi" })).toBeNull();
    expect(document.activeElement).toBe(input);
  });
});
