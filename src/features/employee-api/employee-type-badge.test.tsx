// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { EmployeeNameWithType, EmployeeTypeBadge, employeeKindOf } from "./employee-type-badge";
import { EmployeeTypeFilter, filterByEmployeeType, matchesEmployeeType } from "./employee-type-filter";

afterEach(cleanup);

describe("EmployeeTypeBadge", () => {
  it("marks an official employee with a blue tick that screen readers read as Nội bộ", () => {
    const { container } = render(<EmployeeTypeBadge type="Staff" />);
    expect(screen.getByText("Nội bộ").className).toContain("sr-only");
    expect(container.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
    expect(container.querySelector("[data-employee-type=Staff]")?.getAttribute("title")).toBe("Nội bộ");
  });
  it("prints Nội bộ beside the tick when asked", () => {
    render(<EmployeeTypeBadge type="Staff" showLabel />);
    expect(screen.getByText("Nội bộ").className).not.toContain("sr-only");
  });
  it("shows a clear Thời vụ chip for a seasonal worker, with no tick", () => {
    const { container } = render(<EmployeeTypeBadge type="SeasonalWorker" />);
    expect(screen.getByText("Thời vụ")).toBeTruthy();
    expect(container.querySelector("svg")).toBeNull();
  });
  it.each([null, undefined, "", "Other"])("shows nothing for an unknown kind (%s)", (value) => {
    const { container } = render(<EmployeeTypeBadge type={value} />);
    expect(container.textContent).toBe("");
    expect(employeeKindOf(value)).toBeUndefined();
  });
  it("keeps the name and the marker together", () => {
    render(<EmployeeNameWithType name="Nguyễn An" type="SeasonalWorker" />);
    expect(screen.getByText("Nguyễn An")).toBeTruthy();
    expect(screen.getByText("Thời vụ")).toBeTruthy();
  });
});

describe("EmployeeTypeFilter", () => {
  const people = [{ id: "a", kind: "Staff" }, { id: "b", kind: "SeasonalWorker" }, { id: "c", kind: undefined }];
  it("offers Tất cả, Nội bộ and Thời vụ with Tất cả chosen first", () => {
    render(<EmployeeTypeFilter value="" onChange={() => {}} />);
    const radios = screen.getAllByRole("radio") as HTMLInputElement[];
    expect(radios.map((radio) => radio.closest("label")?.textContent)).toEqual(["Tất cả", "Nội bộ", "Thời vụ"]);
    expect(radios[0].checked).toBe(true);
  });
  it("reports the choice", () => {
    function Harness() { const [value, setValue] = useState(""); return <><EmployeeTypeFilter value={value} onChange={setValue} /><output>{value || "all"}</output></>; }
    render(<Harness />);
    expect(screen.getByText("all")).toBeTruthy();
    fireEvent.click(screen.getByLabelText("Thời vụ"));
    expect(screen.getByText("SeasonalWorker")).toBeTruthy();
  });
  it("filters a list by kind and leaves everyone in with Tất cả", () => {
    expect(filterByEmployeeType(people, "", (p) => p.kind).map((p) => p.id)).toEqual(["a", "b", "c"]);
    // A person whose kind is not known yet stays visible: missing data never hides people.
    expect(filterByEmployeeType(people, "Staff", (p) => p.kind).map((p) => p.id)).toEqual(["a", "c"]);
    expect(filterByEmployeeType(people, "SeasonalWorker", (p) => p.kind).map((p) => p.id)).toEqual(["b", "c"]);
    expect(matchesEmployeeType("Staff", "SeasonalWorker")).toBe(false);
  });
});
