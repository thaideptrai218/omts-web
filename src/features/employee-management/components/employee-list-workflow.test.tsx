// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EmployeeList } from "./employee-list";
import { mockEmployeeProfiles, mockEmployeeZones } from "../mocks/employee-management-fixtures";

beforeEach(() => vi.useFakeTimers());
afterEach(() => { cleanup(); vi.useRealTimers(); });
const employees = Array.from({ length: 45 }, (_, index) => ({
  ...mockEmployeeProfiles[0], id: `person-${index}`, fullName: `Nhân viên ${index}`,
}));
function change(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}
function settle() { act(() => vi.advanceTimersByTime(300)); }
function allStatuses() { change("Tình trạng làm việc", "all"); }

describe("employee directory zones, paging and search", () => {
  it("keeps paging disabled while a new query is settling, then starts its results at page one", () => {
    const manyEmployees = Array.from({ length: 65 }, (_, index) => ({
      ...mockEmployeeProfiles[0], id: `person-${index}`, fullName: `Nhân viên ${index}`,
    }));
    render(<EmployeeList employees={manyEmployees} zones={mockEmployeeZones} onSelect={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Trang sau" }));
    change("Tìm nhân viên", "Nhân viên");
    const next = screen.getByRole<HTMLButtonElement>("button", { name: "Trang sau" });
    expect(next.disabled).toBe(true);
    expect(screen.getByRole<HTMLButtonElement>("button", { name: "Trang trước" }).disabled).toBe(true);
    fireEvent.click(next);
    settle();
    expect(screen.getByText("Trang 1 / 4")).toBeTruthy();
    expect(screen.getByRole<HTMLButtonElement>("button", { name: "Trang sau" }).disabled).toBe(false);
  });

  it("separates multiple working-zone names in the accessible employee row name", () => {
    const record = { ...mockEmployeeProfiles[0], workingZoneIds: ["zone-east", "zone-south"] };
    render(<EmployeeList employees={[record]} zones={mockEmployeeZones} onSelect={vi.fn()} />);
    expect(screen.getByRole("button", { name: /Khu Đông Khu Nam/ })).toBeTruthy();
  });
  it("starts with employed staff as approved and still lets the Owner view departed employees", () => {
    render(<EmployeeList employees={mockEmployeeProfiles} zones={mockEmployeeZones} onSelect={vi.fn()} />);
    expect(screen.getByLabelText<HTMLSelectElement>("Tình trạng làm việc").value).toBe("employed");
    expect(screen.queryByRole("button", { name: /Trần Thị Bình/ })).toBeNull();
    expect(screen.getByRole("button", { name: /Nguyễn Văn An/ })).toBeTruthy();
    const reset = screen.getByRole("button", { name: "Xóa bộ lọc" });
    reset.focus();
    fireEvent.click(reset);
    expect(document.activeElement === screen.getByLabelText("Tìm nhân viên")).toBe(true);
    expect(screen.getByLabelText<HTMLSelectElement>("Tình trạng làm việc").value).toBe("all");
    expect(screen.getByRole("button", { name: /Trần Thị Bình/ })).toBeTruthy();
  });
  it("combines zone and link filters, opens the right employee, then resets", () => {
    const onSelect = vi.fn();
    render(<EmployeeList employees={mockEmployeeProfiles} zones={mockEmployeeZones} onSelect={onSelect} />);
    allStatuses();
    change("Vùng làm việc", "zone-south");
    change("Liên kết tài khoản", "unlinked");
    fireEvent.click(screen.getByRole("button", { name: /Lê Thị Lan/ }));
    expect(onSelect).toHaveBeenCalledWith("employee-le-lan");
    expect(screen.queryByRole("button", { name: /Nguyễn Văn An/ })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Xóa bộ lọc" }));
    allStatuses();
    expect(screen.getByRole("button", { name: /Nguyễn Văn An/ })).toBeTruthy();
    expect(screen.getByLabelText<HTMLSelectElement>("Vùng làm việc").value).toBe("");
  });

  it("shows historical zones and a truthful unknown-catalog label without inventing a name", () => {
    const record = { ...mockEmployeeProfiles[0], workingZoneIds: ["zone-west", "private-unknown-id"] };
    render(<EmployeeList employees={[record]} zones={mockEmployeeZones} onSelect={vi.fn()} />);
    change("Vùng làm việc", "zone-west");
    const row = screen.getByRole("button", { name: /Nguyễn Văn An/ });
    expect(within(row).getByText("Khu Tây (đã ngừng)")).toBeTruthy();
    expect(within(row).getByText("1 vùng chưa có trong danh mục")).toBeTruthy();
    expect(row.textContent).not.toContain("private-unknown-id");
  });

  it("distinguishes employment, account status and employees without an account", () => {
    render(<EmployeeList employees={mockEmployeeProfiles} zones={mockEmployeeZones} onSelect={vi.fn()} />);
    allStatuses();
    expect(within(screen.getByRole("button", { name: /Nguyễn Văn An/ })).getByText("Tài khoản hoạt động")).toBeTruthy();
    const left = screen.getByRole("button", { name: /Trần Thị Bình/ });
    expect(within(left).getByText("Đã nghỉ")).toBeTruthy();
    expect(within(left).getByText("Tài khoản bị khóa")).toBeTruthy();
    expect(within(screen.getByRole("button", { name: /Lê Thị Lan/ })).getByText("Chưa liên kết tài khoản")).toBeTruthy();
  });

  it("pages twenty rows at a time and opens an ID from the second page", () => {
    const onSelect = vi.fn();
    render(<EmployeeList employees={employees} zones={mockEmployeeZones} onSelect={onSelect} />);
    expect(screen.getByRole<HTMLButtonElement>("button", { name: "Trang trước" }).disabled).toBe(true);
    expect(screen.getAllByRole("listitem")).toHaveLength(20);
    fireEvent.click(screen.getByRole("button", { name: "Trang sau" }));
    fireEvent.click(screen.getByRole("button", { name: /^Nhân viên 20 / }));
    expect(onSelect).toHaveBeenCalledWith("person-20");
    expect(screen.getByText("Hiển thị 21 đến 40 / 45 nhân viên")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Trang sau" }));
    expect(screen.getAllByRole("listitem")).toHaveLength(5);
    expect(screen.getByRole<HTMLButtonElement>("button", { name: "Trang sau" }).disabled).toBe(true);
  });

  it("searches the full dataset after 300ms, resets the page and cancels an older query", () => {
    render(<EmployeeList employees={employees} zones={mockEmployeeZones} onSelect={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Trang sau" }));
    change("Tìm nhân viên", "not-found");
    act(() => vi.advanceTimersByTime(200));
    change("Tìm nhân viên", "44");
    act(() => vi.advanceTimersByTime(299));
    expect(screen.queryByRole("button", { name: /^Nhân viên 44 / })).toBeNull();
    expect(screen.getByText("Đang tìm…")).toBeTruthy();
    act(() => vi.advanceTimersByTime(1));
    expect(screen.getByRole("button", { name: /^Nhân viên 44 / })).toBeTruthy();
    expect(screen.queryByRole("navigation", { name: "Phân trang nhân viên" })).toBeNull();
  });

  it("clears a settled search immediately and prevents a pending query from returning after reset", () => {
    render(<EmployeeList employees={employees} zones={mockEmployeeZones} onSelect={vi.fn()} />);
    change("Tìm nhân viên", "44"); settle();
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    change("Tìm nhân viên", "");
    expect(screen.getAllByRole("listitem")).toHaveLength(20);
    change("Tìm nhân viên", "not-found");
    fireEvent.click(screen.getByRole("button", { name: "Xóa bộ lọc" }));
    settle();
    expect(screen.getAllByRole("listitem")).toHaveLength(20);
    expect(screen.getByLabelText<HTMLInputElement>("Tìm nhân viên").value).toBe("");
    expect(screen.queryByText("Đang tìm…")).toBeNull();
  });

  it("returns to page one on each filter change", () => {
    render(<EmployeeList employees={employees} zones={mockEmployeeZones} onSelect={vi.fn()} />);
    for (const [label, value] of [["Vùng làm việc", "zone-east"], ["Liên kết tài khoản", "linked"], ["Tình trạng làm việc", "employed"]]) {
      fireEvent.click(screen.getByRole("button", { name: "Trang sau" }));
      change(label, value);
      expect(screen.getByText("Trang 1 / 3")).toBeTruthy();
    }
  });

  it("clamps an existing page when employees are removed from the workspace", () => {
    const view = render(<EmployeeList employees={employees} zones={mockEmployeeZones} onSelect={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Trang sau" }));
    fireEvent.click(screen.getByRole("button", { name: "Trang sau" }));
    view.rerender(<EmployeeList employees={employees.slice(0, 3)} zones={mockEmployeeZones} onSelect={vi.fn()} />);
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    expect(screen.queryByRole("navigation", { name: "Phân trang nhân viên" })).toBeNull();
  });

  it("retains the selected zone filter truthfully when the catalog no longer includes it", () => {
    const props = { employees: mockEmployeeProfiles, onSelect: vi.fn() };
    const view = render(<EmployeeList {...props} zones={mockEmployeeZones} />);
    change("Vùng làm việc", "zone-east");
    view.rerender(<EmployeeList {...props} zones={[]} />);
    expect(screen.getByLabelText<HTMLSelectElement>("Vùng làm việc").value).toBe("zone-east");
    expect(screen.getByRole("option", { name: "Vùng không còn trong danh mục" })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Nguyễn Văn An/ }).textContent).toContain("1 vùng chưa có trong danh mục");
  });

  it("shows an empty state without pagination for an empty workspace", () => {
    render(<EmployeeList employees={[]} zones={mockEmployeeZones} onSelect={vi.fn()} />);
    expect(screen.getByRole("heading", { name: "Không tìm thấy nhân viên" })).toBeTruthy();
    expect(screen.queryByRole("navigation", { name: "Phân trang nhân viên" })).toBeNull();
  });

  it("cleans up its search timer when the list unmounts", () => {
    const view = render(<EmployeeList employees={employees} zones={mockEmployeeZones} onSelect={vi.fn()} />);
    change("Tìm nhân viên", "44");
    expect(vi.getTimerCount()).toBe(1);
    view.unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
