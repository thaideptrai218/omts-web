// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EmployeeList } from "./employee-list";
import { mockEmployeeProfiles } from "../mocks/employee-management-fixtures";
afterEach(cleanup);

describe("employee directory filters", () => {
  it("combines employment and account-link filters, then resets both", () => {
    render(
      <EmployeeList employees={mockEmployeeProfiles} onSelect={vi.fn()} />,
    );
    fireEvent.change(screen.getByLabelText("Tình trạng làm việc"), {
      target: { value: "employed" },
    });
    fireEvent.change(screen.getByLabelText("Liên kết tài khoản"), {
      target: { value: "unlinked" },
    });
    expect(screen.getByRole("button", { name: /Lê Thị Lan/ })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Nguyễn Văn An/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /Trần Thị Bình/ })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Xóa bộ lọc" }));
    expect(screen.getByRole("button", { name: /Nguyễn Văn An/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Trần Thị Bình/ })).toBeTruthy();
  });
  it("handles a phone search with no matching linked-state combination", () => {
    render(
      <EmployeeList employees={mockEmployeeProfiles} onSelect={vi.fn()} />,
    );
    fireEvent.change(screen.getByLabelText("Tìm nhân viên"), {
      target: { value: "090222" },
    });
    fireEvent.change(screen.getByLabelText("Liên kết tài khoản"), {
      target: { value: "unlinked" },
    });
    expect(
      screen.getByRole("heading", { name: "Không tìm thấy nhân viên" }),
    ).toBeTruthy();
  });
  it("opens the persisted employee ID from a filtered row", () => {
    const select = vi.fn();
    render(<EmployeeList employees={mockEmployeeProfiles} onSelect={select} />);
    fireEvent.change(screen.getByLabelText("Tìm nhân viên"), {
      target: { value: "0901234567" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Nguyễn Văn An/ }));
    expect(select).toHaveBeenCalledWith("employee-nguyen-an");
  });
});
