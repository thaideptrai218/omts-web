// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { DatePickerField } from "./date-picker-field";

afterEach(() => { cleanup(); vi.restoreAllMocks(); });
describe("inline date field", () => {
  it("expands inside a modal without opening another dialog or submitting the form", () => {
    const submit = vi.fn();
    function Form() {
      const [value, setValue] = useState("2026-11-11");
      return <dialog open><form onSubmit={event => { event.preventDefault(); submit(); }}><DatePickerField inlineCalendar label="Ngày ghi" value={value} onChange={setValue} /></form></dialog>;
    }
    render(<Form />);
    const modal = document.querySelector("dialog")!;
    fireEvent.click(screen.getByRole("button", { name: /Ngày ghi:/ }));
    expect(within(modal).getByRole("group", { name: "Ngày ghi" })).toBeTruthy();
    expect(document.querySelectorAll("[role=dialog]")).toHaveLength(0);
    fireEvent.click(within(modal).getByRole("button", { name: "Hôm nay" }));
    expect(submit).not.toHaveBeenCalled();
    expect(screen.queryByRole("group", { name: "Ngày ghi" })).toBeNull();
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
    render(<DatePickerField inlineCalendar allowClear label="Ngày thu dự kiến" value="2026-11-11" onChange={change} />);
    fireEvent.click(screen.getByRole("button", { name: /Ngày thu dự kiến:/ }));
    fireEvent.click(screen.getByRole("button", { name: "Xóa ngày" }));
    expect(change).toHaveBeenCalledWith("");
  });
  it("uses the parent's latest time after a draft is replaced", () => {
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", { configurable: true, value: vi.fn() });
    const change = vi.fn();
    const view = render(<DatePickerField inlineCalendar withTime label="Thời điểm đo" value="2026-11-11T08:15" onChange={change} />);
    view.rerender(<DatePickerField inlineCalendar withTime label="Thời điểm đo" value="2026-11-11T12:30" onChange={change} />);
    fireEvent.click(screen.getByRole("button", { name: /Thời điểm đo:/ }));
    fireEvent.click(document.querySelector<HTMLButtonElement>('[data-day="2026-11-12"] button')!);
    expect(change).toHaveBeenCalledWith("2026-11-12T12:30");
  });
});
