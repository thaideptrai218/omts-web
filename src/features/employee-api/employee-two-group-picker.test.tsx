// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const facts = vi.hoisted(() => ({ kinds: new Map<string, string>(), zones: new Map<string, string[]>() }));
vi.mock("./use-employee-types", () => ({ useEmployeeFacts: () => ({ kindOf: (id?: string | null) => (id ? facts.kinds.get(id) : undefined), zonesOf: (id?: string | null) => (id ? facts.zones.get(id) : undefined) ?? [] }) }));
import { EmployeeTwoGroupPicker, type PickerPerson } from "./employee-two-group-picker";

afterEach(() => { cleanup(); facts.kinds.clear(); facts.zones.clear(); });

const people: PickerPerson[] = [
  { id: "a", name: "An Nội", kind: "Staff" }, { id: "b", name: "Bình Nội", kind: "Staff" },
  { id: "c", name: "Cường Vụ", kind: "SeasonalWorker" }, { id: "d", name: "Dũng Vụ", kind: "SeasonalWorker", disabled: true, note: <small>Đang ở bè khác</small> },
];
function Harness({ initial = [], locked = [] as string[], list = people }: { initial?: string[]; locked?: string[]; list?: PickerPerson[] }) {
  const [values, setValues] = useState(initial);
  return <><EmployeeTwoGroupPicker name="t" people={list} values={values} onChange={setValues} locked={locked} /><output data-testid="value">{values.join(",")}</output></>;
}
const group = (name: string) => screen.getByRole("region", { name });

describe("EmployeeTwoGroupPicker", () => {
  it("splits people into Nội bộ and Thời vụ with their own counts, Nội bộ first", () => {
    render(<Harness />);
    const sections = screen.getAllByRole("region").map((node) => node.getAttribute("aria-label"));
    expect(sections).toEqual(["Nội bộ, 2 người", "Thời vụ, 2 người"]);
    expect(within(group("Nội bộ, 2 người")).getByLabelText("An Nội")).toBeTruthy();
    expect(within(group("Thời vụ, 2 người")).queryByLabelText("An Nội")).toBeNull();
  });
  it("shows the fixed zone of a nội bộ person and none for a thời vụ one", () => {
    facts.zones.set("a", ["DEMO-01"]); facts.zones.set("c", ["DEMO-02"]);
    render(<Harness />);
    expect(within(group("Nội bộ, 2 người")).getByText("Vùng DEMO-01")).toBeTruthy();
    expect(screen.queryByText("Vùng DEMO-02")).toBeNull();
  });
  it("ticks only the people of its own group and skips those who cannot be chosen", () => {
    render(<Harness />);
    fireEvent.click(within(group("Thời vụ, 2 người")).getByRole("button", { name: "Chọn tất cả" }));
    expect(screen.getByTestId("value").textContent).toBe("c");
    expect(within(group("Thời vụ, 2 người")).getByRole("button", { name: "Bỏ chọn tất cả" })).toBeTruthy();
    fireEvent.click(within(group("Nội bộ, 2 người")).getByRole("button", { name: "Chọn tất cả" }));
    expect(screen.getByTestId("value").textContent).toBe("c,a,b");
    fireEvent.click(within(group("Thời vụ, 2 người")).getByRole("button", { name: "Bỏ chọn tất cả" }));
    expect(screen.getByTestId("value").textContent).toBe("a,b");
  });
  it("searches inside one group only, and Chọn tất cả takes only what the search shows", () => {
    render(<Harness />);
    fireEvent.change(within(group("Nội bộ, 2 người")).getByLabelText("Tìm trong nhóm Nội bộ"), { target: { value: "binh" } });
    expect(within(group("Nội bộ, 2 người")).queryByLabelText("An Nội")).toBeNull();
    expect(within(group("Thời vụ, 2 người")).getByLabelText("Cường Vụ")).toBeTruthy();
    fireEvent.click(within(group("Nội bộ, 2 người")).getByRole("button", { name: "Chọn tất cả" }));
    expect(screen.getByTestId("value").textContent).toBe("b");
  });
  it("keeps a locked person ticked and a disabled one unticked", () => {
    render(<Harness initial={["a"]} locked={["a"]} />);
    const locked = screen.getByLabelText("An Nội") as HTMLInputElement;
    expect(locked.checked).toBe(true); expect(locked.disabled).toBe(true);
    expect((screen.getByLabelText(/^Dũng Vụ/) as HTMLInputElement).disabled).toBe(true);
    expect(screen.getByText("Đang ở bè khác")).toBeTruthy();
  });
  it("reads the kind from the employee list when the caller does not give it, and an unknown kind goes with Nội bộ", () => {
    facts.kinds.set("x", "SeasonalWorker");
    render(<Harness list={[{ id: "x", name: "Xuân" }, { id: "y", name: "Yến" }]} />);
    expect(within(group("Thời vụ, 1 người")).getByLabelText("Xuân")).toBeTruthy();
    expect(within(group("Nội bộ, 1 người")).getByLabelText("Yến")).toBeTruthy();
  });
  it("says so when a group has nobody", () => {
    render(<Harness list={[{ id: "a", name: "An", kind: "Staff" }]} />);
    expect(within(group("Thời vụ, 0 người")).getByText("Chưa có nhân viên thời vụ.")).toBeTruthy();
    expect((within(group("Thời vụ, 0 người")).getByRole("button", { name: "Chọn tất cả" }) as HTMLButtonElement).disabled).toBe(true);
  });
});
