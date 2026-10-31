// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AccountList } from "./account-list";
import {
  mockManagedAccounts,
  mockFarmingZones,
} from "../mocks/account-management-fixtures";
import { mockFixedRoles } from "@/features/role-management/mocks/role-management-fixtures";
afterEach(cleanup);
function page() {
  return render(
    <AccountList
      accounts={mockManagedAccounts}
      roles={mockFixedRoles}
      zones={mockFarmingZones}
      onSelect={vi.fn()}
    />,
  );
}

describe("account directory combined filters", () => {
  it("keeps an all-zone locked account when selecting a particular zone", () => {
    page();
    fireEvent.change(screen.getByLabelText("Trạng thái tài khoản"), {
      target: { value: "locked" },
    });
    fireEvent.change(screen.getByLabelText("Vùng phụ trách"), {
      target: { value: "zone-east" },
    });
    expect(screen.getByRole("button", { name: /Trần Thị Bình/ })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Nguyễn Văn An/ })).toBeNull();
    fireEvent.change(screen.getByLabelText("Vai trò đảm nhiệm"), {
      target: { value: "role-zone-manager" },
    });
    expect(
      screen.getByRole("heading", { name: "Không tìm thấy tài khoản" }),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Xóa bộ lọc" }));
    expect(screen.getByRole("button", { name: /Nguyễn Văn An/ })).toBeTruthy();
  });
  it("does not match a revoked role when combining role and zone", () => {
    page();
    fireEvent.change(screen.getByLabelText("Vai trò đảm nhiệm"), {
      target: { value: "role-accountant" },
    });
    fireEvent.change(screen.getByLabelText("Vùng phụ trách"), {
      target: { value: "zone-south" },
    });
    expect(screen.queryByRole("button", { name: /Nguyễn Văn An/ })).toBeNull();
    expect(screen.getByRole("button", { name: /Trần Thị Bình/ })).toBeTruthy();
  });
  it("offers the Staff role filter and shows an empty result until assigned", () => {
    page();
    fireEvent.change(screen.getByLabelText("Vai trò đảm nhiệm"), {
      target: { value: "role-staff" },
    });
    expect(
      screen.getByRole("heading", { name: "Không tìm thấy tài khoản" }),
    ).toBeTruthy();
  });
});
